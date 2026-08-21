[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('validate', 'init', 'propose', 'observe', 'evaluate', 'decide', 'promote', 'snapshot', 'replay')]
    [string]$Action,

    [Parameter(Mandatory = $true)]
    [string]$Trace,

    [string]$Store,
    [string]$Candidate,
    [string]$CandidateId,
    [string]$ArtifactBase,
    [string]$Observation,
    [string]$Approval,
    [string]$EvaluationId,
    [string]$PromotionId,
    [string]$At
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Resolve-ExistingFile {
    param([string]$Path, [string]$Label)
    if ([string]::IsNullOrWhiteSpace($Path)) {
        throw "$Label is required."
    }
    $resolved = Resolve-Path -LiteralPath $Path -ErrorAction Stop
    if (-not (Test-Path -LiteralPath $resolved.Path -PathType Leaf)) {
        throw "$Label must be an existing file."
    }
    return $resolved.Path
}

function Invoke-ElderJson {
    param([string[]]$Arguments)
    $output = & .\elder.ps1 @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Elder command failed: elder $($Arguments -join ' ')"
    }
    try {
        return $output | ConvertFrom-Json
    }
    catch {
        throw "Elder returned invalid JSON for: elder $($Arguments -join ' ')"
    }
}

function Resolve-StorePath {
    if ([string]::IsNullOrWhiteSpace($Store)) {
        throw 'Store is required for this action.'
    }
    $allowedRoot = [System.IO.Path]::GetFullPath((Join-Path $PWD '.elder/runtime/sd008-learning'))
    $candidatePath = [System.IO.Path]::GetFullPath((Join-Path $PWD $Store))
    $prefix = $allowedRoot.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
    if (-not $candidatePath.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Learning store must remain below .elder/runtime/sd008-learning."
    }
    return $candidatePath
}

function Assert-SingleCandidateBoundary {
    param([string]$StorePath, [bool]$RequireExisting)
    $status = Invoke-ElderJson -Arguments @(
        'learning', 'status', '--store', $StorePath,
        '--profile', '.elder/project-profile.json',
        '--policy', '.elder/learning-policy.json'
    )
    $count = [int]$status.counts.candidates
    if ($RequireExisting -and $count -ne 1) {
        throw "SD-008 learning requires exactly one candidate; found $count."
    }
    if (-not $RequireExisting -and $count -ne 0) {
        throw "SD-008 permits at most one candidate and this trace already has $count."
    }
    return $status
}

$tracePath = Resolve-ExistingFile -Path $Trace -Label 'Trace'
$traceBytes = [System.IO.File]::ReadAllBytes($tracePath)
$sha256 = [System.Security.Cryptography.SHA256]::Create()
try {
    $traceDigestBytes = $sha256.ComputeHash($traceBytes)
}
finally {
    $sha256.Dispose()
}
$traceDigest = ([System.BitConverter]::ToString($traceDigestBytes)).Replace('-', '').ToLowerInvariant()
$traceResult = & node scripts/validate-sd008-learning-trace.mjs $tracePath
if ($LASTEXITCODE -ne 0) {
    throw 'The SD-008 hosted trace is not eligible for quarantined learning.'
}

if ($Action -eq 'validate') {
    [pscustomobject]@{
        status = 'eligible-for-quarantined-learning'
        trace_sha256 = $traceDigest
        validation = ($traceResult | ConvertFrom-Json)
        target_mutation = $false
    } | ConvertTo-Json -Depth 100
    exit 0
}

$storePath = Resolve-StorePath

if ($Action -eq 'init') {
    $storeDirectory = Split-Path -Parent $storePath
    [System.IO.Directory]::CreateDirectory($storeDirectory) | Out-Null
    $initialized = Invoke-ElderJson -Arguments @(
        'learning', 'init', '--store', $storePath,
        '--profile', '.elder/project-profile.json',
        '--policy', '.elder/learning-policy.json'
    )
    Assert-SingleCandidateBoundary -StorePath $storePath -RequireExisting $false | Out-Null
    $initialized | ConvertTo-Json -Depth 100
    exit 0
}

if (-not (Test-Path -LiteralPath $storePath -PathType Leaf)) {
    throw 'Initialize the SD-008 learning store before this action.'
}

switch ($Action) {
    'propose' {
        Assert-SingleCandidateBoundary -StorePath $storePath -RequireExisting $false | Out-Null
        $candidatePath = Resolve-ExistingFile -Path $Candidate -Label 'Candidate'
        if ([string]::IsNullOrWhiteSpace($ArtifactBase)) {
            throw 'ArtifactBase is required for propose.'
        }
        $candidateRecord = Get-Content -LiteralPath $candidatePath -Raw | ConvertFrom-Json
        if ($candidateRecord.project_id -ne 'signaldesk') {
            throw 'Candidate project_id must be signaldesk.'
        }
        if ($candidateRecord.created_by -ne 'signaldesk-learning-agent' -or $candidateRecord.created_role -ne 'learning-agent') {
            throw 'Candidate must be owned by signaldesk-learning-agent in the learning-agent role.'
        }
        if ($candidateRecord.source_evidence -notcontains "trace:sha256:$traceDigest") {
            throw 'Candidate source_evidence must bind the exact SD-008 trace SHA-256.'
        }
        if ($candidateRecord.source_evidence | Where-Object { $_ -match 'SD-007' }) {
            throw 'SD-007 evidence or decisions cannot seed the SD-008 candidate.'
        }
        $result = Invoke-ElderJson -Arguments @(
            'learning', 'propose', '--store', $storePath,
            '--profile', '.elder/project-profile.json',
            '--policy', '.elder/learning-policy.json',
            '--candidate', $candidatePath,
            '--artifact-base', ([System.IO.Path]::GetFullPath((Join-Path $PWD $ArtifactBase)))
        )
        Assert-SingleCandidateBoundary -StorePath $storePath -RequireExisting $true | Out-Null
        $result | ConvertTo-Json -Depth 100
    }
    'observe' {
        Assert-SingleCandidateBoundary -StorePath $storePath -RequireExisting $true | Out-Null
        $observationPath = Resolve-ExistingFile -Path $Observation -Label 'Observation'
        $record = Get-Content -LiteralPath $observationPath -Raw | ConvertFrom-Json
        if ($record.side_effects -ne $false) {
            throw 'SD-008 learning observations must declare side_effects false.'
        }
        if ($record.executor_id -ne 'signaldesk-learning-agent') {
            throw 'SD-008 observations must be executed by signaldesk-learning-agent.'
        }
        $result = Invoke-ElderJson -Arguments @(
            'learning', 'observe', '--store', $storePath,
            '--profile', '.elder/project-profile.json',
            '--policy', '.elder/learning-policy.json',
            '--record', $observationPath
        )
        $result | ConvertTo-Json -Depth 100
    }
    'evaluate' {
        Assert-SingleCandidateBoundary -StorePath $storePath -RequireExisting $true | Out-Null
        if ([string]::IsNullOrWhiteSpace($CandidateId) -or [string]::IsNullOrWhiteSpace($EvaluationId) -or [string]::IsNullOrWhiteSpace($At)) {
            throw 'CandidateId, EvaluationId, and At are required for evaluate.'
        }
        $result = Invoke-ElderJson -Arguments @(
            'learning', 'evaluate', '--store', $storePath,
            '--profile', '.elder/project-profile.json',
            '--policy', '.elder/learning-policy.json',
            '--candidate-id', $CandidateId,
            '--evaluator-id', 'signaldesk-evaluator',
            '--evaluation-id', $EvaluationId,
            '--at', $At
        )
        $result | ConvertTo-Json -Depth 100
    }
    'decide' {
        Assert-SingleCandidateBoundary -StorePath $storePath -RequireExisting $true | Out-Null
        $approvalPath = Resolve-ExistingFile -Path $Approval -Label 'Approval'
        $record = Get-Content -LiteralPath $approvalPath -Raw | ConvertFrom-Json
        if ($record.approved_by -ne 'Neel' -or $record.approver_role -ne 'human-owner') {
            throw 'SD-008 learning decisions require Neel in the human-owner role.'
        }
        if ($record.decision -notin @('approve', 'reject')) {
            throw 'SD-008 learning decision must be exactly approve or reject.'
        }
        if ($record.evidence | Where-Object { $_ -match 'SD-007' }) {
            throw 'SD-007 approval evidence cannot decide the SD-008 candidate.'
        }
        $result = Invoke-ElderJson -Arguments @(
            'learning', 'decide', '--store', $storePath,
            '--profile', '.elder/project-profile.json',
            '--policy', '.elder/learning-policy.json',
            '--approval', $approvalPath
        )
        $result | ConvertTo-Json -Depth 100
    }
    'promote' {
        Assert-SingleCandidateBoundary -StorePath $storePath -RequireExisting $true | Out-Null
        if ([string]::IsNullOrWhiteSpace($CandidateId) -or [string]::IsNullOrWhiteSpace($PromotionId) -or [string]::IsNullOrWhiteSpace($At)) {
            throw 'CandidateId, PromotionId, and At are required for promote.'
        }
        $result = Invoke-ElderJson -Arguments @(
            'learning', 'promote', '--store', $storePath,
            '--profile', '.elder/project-profile.json',
            '--policy', '.elder/learning-policy.json',
            '--candidate-id', $CandidateId,
            '--promoted-by', 'Neel',
            '--promotion-id', $PromotionId,
            '--at', $At
        )
        if ($result.applies_target_mutation -ne $false) {
            throw 'Elder returned an unsafe promotion packet that claims target mutation.'
        }
        $result | ConvertTo-Json -Depth 100
    }
    'snapshot' {
        if ([string]::IsNullOrWhiteSpace($CandidateId)) {
            throw 'CandidateId is required for snapshot.'
        }
        $result = Invoke-ElderJson -Arguments @(
            'learning', 'snapshot', '--store', $storePath,
            '--profile', '.elder/project-profile.json',
            '--policy', '.elder/learning-policy.json',
            '--candidate-id', $CandidateId
        )
        $result | ConvertTo-Json -Depth 100
    }
    'replay' {
        if ([string]::IsNullOrWhiteSpace($CandidateId)) {
            throw 'CandidateId is required for replay.'
        }
        $result = Invoke-ElderJson -Arguments @(
            'learning', 'replay', '--store', $storePath,
            '--profile', '.elder/project-profile.json',
            '--policy', '.elder/learning-policy.json',
            '--candidate-id', $CandidateId
        )
        if ($result.status -ne 'passed') {
            throw 'SD-008 learning journal replay did not pass.'
        }
        $result | ConvertTo-Json -Depth 100
    }
}
