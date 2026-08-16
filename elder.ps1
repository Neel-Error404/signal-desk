param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$ElderArgs
)

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot
$Bootstrap = Join-Path $ProjectRoot ".elder\capsule\bootstrap.ps1"
& $Bootstrap
$Python = Join-Path $ProjectRoot ".elder\runtime\tooling\Scripts\python.exe"
& $Python -m elder_protocol.cli @ElderArgs
exit $LASTEXITCODE
