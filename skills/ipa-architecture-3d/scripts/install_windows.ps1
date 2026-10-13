# Install this complete reusable skill into selected agents on Windows.
[CmdletBinding()]
param(
    [ValidateSet('claude','codex','hermes')][string[]]$Agents = @('claude','codex','hermes'),
    [switch]$Force
)
$ErrorActionPreference = 'Stop'
$skillRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$skillName = 'ipa-architecture-3d'
$paths = @{
    claude = Join-Path $HOME '.claude\skills'
    codex = Join-Path $HOME '.agents\skills'
    hermes = Join-Path $HOME '.hermes\skills'
}
foreach ($agent in $Agents) {
    $base = $paths[$agent]
    $target = Join-Path $base $skillName
    New-Item -Path $base -ItemType Directory -Force | Out-Null
    if (Test-Path -LiteralPath $target) {
        if (-not $Force) {
            Write-Warning "$agent : $target already exists; use -Force to preserve a backup and replace it."
            continue
        }
        $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
        $backup = Join-Path $base "$skillName.backup-$timestamp"
        Move-Item -LiteralPath $target -Destination $backup
        Write-Host "Backup: $backup"
    }
    Copy-Item -LiteralPath $skillRoot -Destination $target -Recurse
    if (-not (Test-Path -LiteralPath (Join-Path $target 'SKILL.md'))) {
        throw "SKILL.md not found after installation: $target"
    }
    Write-Host "Installed $agent : $target" -ForegroundColor Green
}
Write-Host "Restart your agent CLI / desktop app for skill discovery."
