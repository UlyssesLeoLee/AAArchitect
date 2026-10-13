# Install this complete reusable skill into selected agent channels on Windows.
#
# Channel notes:
#   claude  - ~/.claude/skills          (skill fallback; the plugin channel is the
#                                        `claude plugin marketplace add` path in README)
#   codex   - ~/.agents/skills          (also read by ~/.agents/plugins/marketplace.json)
#   hermes  - %LOCALAPPDATA%\hermes\skills\<category>
#   minimax - ~/.minimax/skills         (local Skill fallback; the MiniMax plugin channel
#                                        is ~/.minimax/plugins/<plugin>/.minimax-plugin)
[CmdletBinding()]
param(
    [ValidateSet('claude','codex','hermes','minimax')][string[]]$Agents = @('claude','codex','hermes','minimax'),
    [ValidateSet('software-development','creative','productivity','research','devops')][string]$HermesCategory = 'software-development',
    [switch]$Force
)
$ErrorActionPreference = 'Stop'
$skillRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$skillName = 'ipa-architecture-3d'
$userHome = [Environment]::GetFolderPath('UserProfile')
$hermesHome = if ($env:LOCALAPPDATA) { Join-Path $env:LOCALAPPDATA 'hermes' } else { Join-Path $userHome '.hermes' }
$paths = [ordered]@{
    claude  = Join-Path $userHome '.claude\skills'
    codex   = Join-Path $userHome '.agents\skills'
    hermes  = Join-Path $hermesHome "skills\$HermesCategory"
    minimax = Join-Path $userHome '.minimax\skills'
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
