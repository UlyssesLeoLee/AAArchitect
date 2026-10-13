# Install ipa-architecture-3d into every supported agent channel from a fresh clone.
#
#   git clone https://github.com/UlyssesLeoLee/AAArchitect.git
#   cd AAArchitect
#   powershell -ExecutionPolicy Bypass -File .\install.ps1
#
# Channels are independent: a missing CLI downgrades that channel to a plain
# directory copy instead of failing the whole run.
[CmdletBinding()]
param(
    [string[]]$Agents = @('claude','codex','hermes','minimax'),
    [string]$UserHome = [Environment]::GetFolderPath('UserProfile'),
    [string]$HermesHome = $(if ($env:LOCALAPPDATA) { Join-Path $env:LOCALAPPDATA 'hermes' } else { Join-Path ([Environment]::GetFolderPath('UserProfile')) '.hermes' }),
    [string]$PluginsRoot = $(if ($env:MINIMAX_PLUGINS_DIR) { $env:MINIMAX_PLUGINS_DIR } else { Join-Path ([Environment]::GetFolderPath('UserProfile')) '.minimax\plugins' }),
    [ValidateSet('software-development','creative','productivity','research','devops')][string]$HermesCategory = 'software-development',
    [switch]$NoCli,
    [switch]$Force
)
$ErrorActionPreference = 'Stop'

# `powershell -File script.ps1 -Agents codex,hermes` delivers ONE comma-joined string,
# while an in-session call delivers a real array. Accept both.
$knownAgents = @('claude','codex','hermes','minimax')
$requested = @()
foreach ($a in $Agents) { $requested += ($a -split ',') }
$requested = @($requested | ForEach-Object { $_.Trim().ToLowerInvariant() } | Where-Object { $_ })
$unknown = @($requested | Where-Object { $knownAgents -notcontains $_ })
if ($unknown.Count -gt 0) {
    throw "Unknown channel(s): $($unknown -join ', '). Valid values: $($knownAgents -join ', ')"
}
$Agents = $requested
$repoRoot  = (Resolve-Path $PSScriptRoot).Path
$skillDir  = Join-Path $repoRoot 'skills\ipa-architecture-3d'
$skillName = 'ipa-architecture-3d'
$results = [System.Collections.Generic.List[object]]::new()
function Add-Result([string]$channel, [string]$status, [string]$detail) {
    $results.Add([pscustomobject]@{ Channel = $channel; Status = $status; Detail = $detail })
    $color = switch ($status) { 'ok' { 'Green' } 'warn' { 'Yellow' } default { 'Red' } }
    Write-Host ("[{0}] {1}: {2}" -f $status.ToUpper(), $channel, $detail) -ForegroundColor $color
}
function Get-CommandPath([string]$name) {
    $c = Get-Command $name -ErrorAction SilentlyContinue
    if ($c) { return $c.Source }
    foreach ($ext in '.cmd', '.exe', '.bat') {
        $p = Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) "minimax\bin\$name$ext"
        if (Test-Path -LiteralPath $p) { return $p }
    }
    return $null
}
function Copy-Dir([string]$src, [string]$dst) {
    $parent = Split-Path -Parent $dst
    New-Item -Path $parent -ItemType Directory -Force | Out-Null
    if (Test-Path -LiteralPath $dst) { Remove-Item -LiteralPath $dst -Recurse -Force }
    Copy-Item -LiteralPath $src -Destination $dst -Recurse
}
# Agent CLIs write warnings to stderr on every run. Under ErrorActionPreference=Stop
# PowerShell 5.1 turns those into terminating errors, so every call goes through here.
function Invoke-Native([string]$exe, [string[]]$NativeArgs) {
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try { return (& $exe @NativeArgs 2>&1 | Out-String) } finally { $ErrorActionPreference = $prev }
}

Write-Host "ipa-architecture-3d installer`n  repo: $repoRoot`n" -ForegroundColor Cyan

foreach ($channel in $Agents) {
    try {
        switch ($channel) {
            'claude' {
                $claude = Get-CommandPath 'claude'
                if ($NoCli -or -not $claude) {
                    Copy-Dir $skillDir (Join-Path $UserHome ".claude\skills\$skillName")
                    Add-Result 'claude' 'ok' "skill copied (plugin channel skipped: $(if ($NoCli) { '-NoCli' } else { 'claude CLI not found' }))"
                    break
                }
                Invoke-Native $claude @('plugin','marketplace','add', $repoRoot) | Out-Null
                Invoke-Native $claude @('plugin','install', "$skillName@aaarchitect") | Out-Null
                $listed = Invoke-Native $claude @('plugin','list')
                if ($listed -match [regex]::Escape("$skillName@aaarchitect")) {
                    Add-Result 'claude' 'ok' 'plugin installed and enabled from this folder marketplace'
                } else {
                    Add-Result 'claude' 'warn' 'marketplace added but plugin is not listed; run: claude plugin install ipa-architecture-3d@aaarchitect'
                }
            }
            'codex' {
                $pluginsDir = Join-Path $UserHome '.agents\plugins'
                New-Item -Path $pluginsDir -ItemType Directory -Force | Out-Null
                $market = [ordered]@{
                    name      = 'local-architecture'
                    interface = [ordered]@{ displayName = 'AAArchitect Local Plugin Channel' }
                    plugins   = @([ordered]@{
                        name   = $skillName
                        source = [ordered]@{ source = 'local'; path = ($repoRoot -replace '\\', '/') }
                        policy = [ordered]@{ installation = 'AVAILABLE'; authentication = 'ON_INSTALL' }
                        category = 'Productivity'
                    })
                }
                $marketPath = Join-Path $pluginsDir 'marketplace.json'
                [System.IO.File]::WriteAllText($marketPath, (($market | ConvertTo-Json -Depth 6) -replace "`r`n", "`n") + "`n", (New-Object System.Text.UTF8Encoding($false)))
                Copy-Dir $skillDir (Join-Path $UserHome ".agents\skills\$skillName")
                Add-Result 'codex' 'ok' "skill + .agents\plugins\marketplace.json (source.path = $repoRoot)"
            }
            'hermes' {
                Copy-Dir $skillDir (Join-Path $HermesHome "skills\$HermesCategory\$skillName")
                $note = 'skill installed'
                if ($Force) {
                    # Portable Agent Plugins v1 package: the repo root carries plugin.json.
                    # .git is dropped so provenance stays "user" and no fetch is attempted.
                    $plugDir = Join-Path $HermesHome "plugins\$skillName"
                    $staging = Join-Path ([System.IO.Path]::GetTempPath()) ("ipa-stage-" + [guid]::NewGuid().ToString('N'))
                    New-Item -Path $staging -ItemType Directory -Force | Out-Null
                    try {
                        foreach ($item in Get-ChildItem -LiteralPath $repoRoot -Force | Where-Object { $_.Name -ne '.git' }) {
                            Copy-Item -LiteralPath $item.FullName -Destination (Join-Path $staging $item.Name) -Recurse
                        }
                        Copy-Dir $staging $plugDir
                    } finally {
                        Remove-Item -LiteralPath $staging -Recurse -Force -ErrorAction SilentlyContinue
                    }
                    $note += "; portable plugin package at $plugDir"
                    $hermes = Get-CommandPath 'hermes'
                    if ($hermes -and -not $NoCli) {
                        $doctor = Invoke-Native $hermes @('plugins','doctor', $plugDir)
                        $note += if ($doctor -match 'passed') { ' (doctor passed)' } else { ' (doctor output unclear)' }
                        Invoke-Native $hermes @('plugins','enable', $skillName) | Out-Null
                        $show = Invoke-Native $hermes @('plugins','show', $skillName)
                        $note += if ($show -match 'Status:\s*enabled') { ', enabled' } else { ', left disabled (enable runs a PM venv sync; see README)' }
                    }
                } else {
                    $note += ' (plugin channel needs -Force)'
                }
                Add-Result 'hermes' 'ok' $note
            }
            'minimax' {
                $builder = Join-Path $skillDir 'scripts\build_minimax_plugin.ps1'
                $out = Invoke-Native 'powershell' (@('-NoProfile','-File', $builder, '-PluginsRoot', $PluginsRoot) + $(if ($Force) { @('-Force') } else { @() }))
                if ($LASTEXITCODE -eq 0 -or $out -match 'MiniMax plugin package built') {
                    Add-Result 'minimax' 'ok' "local plugin package at $(Join-Path $PluginsRoot $skillName)"
                } else {
                    Add-Result 'minimax' 'warn' "package build output unexpected: $($out.Trim())"
                }
            }
        }
    } catch {
        Add-Result $channel 'error' $_.Exception.Message
    }
}

Write-Host ''
$results | Format-Table -AutoSize | Out-String -Width 200 | Write-Host
$failed = @($results | Where-Object { $_.Status -eq 'error' })
if ($failed.Count -gt 0) { Write-Host "Channel(s) failed: $($failed.Channel -join ', ')" -ForegroundColor Red }
Write-Host 'Restart each agent CLI / desktop app so it rescans its plugin and skill directories.'