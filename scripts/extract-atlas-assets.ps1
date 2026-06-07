#Requires -Version 5.1
param(
    [Parameter(Position = 0)]
    [string]$Src,

    [Parameter(Position = 1)]
    [string]$Out,

    [switch]$Help
)

$TargetFiles = @(
    "gui/flash/atlases/battleAtlas.dds"
    "gui/flash/atlases/battleAtlas.xml"
    "gui/flash/atlases/vehicleMarkerAtlas.dds"
    "gui/flash/atlases/vehicleMarkerAtlas.xml"
)

function Show-Usage {
    Write-Host @"
Usage: extract-atlas-assets.ps1 [-Src] <src-dir> [-Out] <out-dir>

Extract battle and vehicle marker atlas files from a World of Tanks installation.

Arguments:
  <src-dir>   Path to the WoT game directory. The script searches it recursively
              for gui-partN.pkg files (zip archives) and scans their index for
              the target atlas files.

  <out-dir>   Directory where extracted files are dropped (flat, no subdirs).
              Created automatically if it does not exist.

Extracted files:
  battleAtlas.dds
  battleAtlas.xml
  vehicleMarkerAtlas.dds
  vehicleMarkerAtlas.xml

Options:
  -Src <dir>   Explicit form for <src-dir>
  -Out <dir>   Explicit form for <out-dir>
  -Help        Show this message and exit

Both positional and named forms may be mixed freely.
"@
}

if ($Help) {
    Show-Usage
    exit 0
}

if (-not $Src -or -not $Out) {
    Show-Usage
    exit 1
}

if (-not (Test-Path -LiteralPath $Src -PathType Container)) {
    Write-Error "Source directory does not exist: $Src"
    exit 1
}

if (-not (Test-Path -LiteralPath $Out)) {
    New-Item -ItemType Directory -Path $Out | Out-Null
}

Add-Type -AssemblyName System.IO.Compression.FileSystem

$pkgFiles = Get-ChildItem -Path $Src -Recurse -File |
    Where-Object { $_.Name -match '^gui-part\d+\.pkg$' }

if (-not $pkgFiles) {
    Write-Error "No gui-partN.pkg files found in: $Src"
    exit 1
}

foreach ($pkgFile in $pkgFiles) {
    Write-Host "Checking: $($pkgFile.FullName)"

    try {
        $zip = [System.IO.Compression.ZipFile]::OpenRead($pkgFile.FullName)
    } catch {
        Write-Warning "  Failed to read archive, skipping: $_"
        continue
    }

    try {
        $entryNames = $zip.Entries | ForEach-Object { $_.FullName }
        $toExtract = @($TargetFiles | Where-Object { $entryNames -contains $_ })

        if ($toExtract.Count -eq 0) {
            Write-Host "  No target files."
            continue
        }

        Write-Host "  Extracting $($toExtract.Count) file(s): $($toExtract -join ', ')"

        foreach ($target in $toExtract) {
            $entry = $zip.GetEntry($target)
            $leafName = $target.Split('/')[-1]
            $destPath = Join-Path $Out $leafName

            $srcStream = $entry.Open()
            try {
                $destStream = [System.IO.File]::Create($destPath)
                try {
                    $srcStream.CopyTo($destStream)
                } finally {
                    $destStream.Dispose()
                }
            } finally {
                $srcStream.Dispose()
            }

            Write-Host "    -> $leafName"
        }
    } finally {
        $zip.Dispose()
    }
}
