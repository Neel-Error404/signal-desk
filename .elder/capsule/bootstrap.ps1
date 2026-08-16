param([switch]$Force)

$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$RuntimeRoot = Join-Path $ProjectRoot ".elder\runtime\tooling"
$Python = Join-Path $RuntimeRoot "Scripts\python.exe"
$Marker = Join-Path $RuntimeRoot ".elder-wheel.sha256"
$Wheel = Join-Path $PSScriptRoot "elder_protocol-0.5.1-py3-none-any.whl"
$WheelDigest = (Get-FileHash -Algorithm SHA256 -LiteralPath $Wheel).Hash.ToLowerInvariant()
$InstalledDigest = if (Test-Path -LiteralPath $Marker) {
    (Get-Content -LiteralPath $Marker -Raw).Trim()
} else {
    ""
}

if ($Force -or -not (Test-Path -LiteralPath $Python) -or $InstalledDigest -ne $WheelDigest) {
    $CandidateSpecs = [System.Collections.Generic.List[object]]::new()
    $ExplicitPythonRequested = -not [string]::IsNullOrWhiteSpace(
        $env:ELDER_BOOTSTRAP_PYTHON
    )
    if ($ExplicitPythonRequested) {
        $CandidateSpecs.Add([pscustomobject]@{
            Executable = $env:ELDER_BOOTSTRAP_PYTHON
            Arguments = @()
        })
    } else {
        $PyLauncher = Get-Command py -ErrorAction SilentlyContinue
        if ($PyLauncher) {
            $CandidateSpecs.Add([pscustomobject]@{
                Executable = $PyLauncher.Source
                Arguments = @("-3")
            })
        }

        foreach ($Command in @(Get-Command python -All -ErrorAction SilentlyContinue)) {
            $CandidateSpecs.Add([pscustomobject]@{
                Executable = $Command.Source
                Arguments = @()
            })
        }
        foreach ($Command in @(Get-Command python3 -All -ErrorAction SilentlyContinue)) {
            $CandidateSpecs.Add([pscustomobject]@{
                Executable = $Command.Source
                Arguments = @()
            })
        }

        $KnownPythonRoots = @()
        if ($env:LOCALAPPDATA) {
            $KnownPythonRoots += Join-Path $env:LOCALAPPDATA "Programs\Python"
        }
        if ($env:ProgramFiles) {
            $KnownPythonRoots += $env:ProgramFiles
        }
        if (${env:ProgramFiles(x86)}) {
            $KnownPythonRoots += ${env:ProgramFiles(x86)}
        }
        foreach ($Root in $KnownPythonRoots) {
            foreach ($Candidate in @(
                Get-ChildItem -Path (Join-Path $Root "Python*\python.exe") `
                    -File -ErrorAction SilentlyContinue
            )) {
                $CandidateSpecs.Add([pscustomobject]@{
                    Executable = $Candidate.FullName
                    Arguments = @()
                })
            }
        }
    }

    $BasePython = $null
    $BasePythonArgs = @()
    $SeenCandidates = [System.Collections.Generic.HashSet[string]]::new(
        [System.StringComparer]::OrdinalIgnoreCase
    )
    foreach ($Candidate in $CandidateSpecs) {
        $CandidateKey = "$($Candidate.Executable)|$($Candidate.Arguments -join ' ')"
        if (-not $SeenCandidates.Add($CandidateKey)) {
            continue
        }
        if (-not (Test-Path -LiteralPath $Candidate.Executable -PathType Leaf)) {
            continue
        }
        try {
            $ProbeOutput = & $Candidate.Executable @($Candidate.Arguments) `
                -c "import sys, venv; sys.exit(0 if sys.version_info >= (3, 11) else 3)" `
                2>$null
            $ProbeExitCode = $LASTEXITCODE
        } catch {
            continue
        }
        if ($ProbeExitCode -eq 0) {
            $BasePython = $Candidate.Executable
            $BasePythonArgs = @($Candidate.Arguments)
            break
        }
    }
    if (-not $BasePython) {
        if ($ExplicitPythonRequested) {
            throw (
                "ELDER_BOOTSTRAP_PYTHON does not identify a usable Python 3.11+ " +
                "interpreter with the venv module: $env:ELDER_BOOTSTRAP_PYTHON"
            )
        }
        throw (
            "No usable Python with the venv module was found. Install Python 3.11+ " +
            "or set ELDER_BOOTSTRAP_PYTHON to the exact python.exe path."
        )
    }

    & $BasePython @BasePythonArgs -m venv --clear $RuntimeRoot
    if ($LASTEXITCODE -ne 0) { throw "Failed to create the Elder tooling environment." }
    & $Python -m pip install --upgrade pip
    if ($LASTEXITCODE -ne 0) { throw "Failed to update pip in the Elder tooling environment." }
    & $Python -m pip install `
        $Wheel `
        "azure-identity>=1.24,<2" `
        "mem0ai==2.0.17" `
        "python-dotenv>=1.1,<2" `
        "qdrant-client==1.19.0"
    if ($LASTEXITCODE -ne 0) { throw "Failed to install the portable Elder runtime." }
    Set-Content -LiteralPath $Marker -Value $WheelDigest -Encoding ascii
}
