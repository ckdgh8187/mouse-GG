$soundDir = "asset/sound"
$outputFile = "js/SoundAssets.js"

# Create/Overwrite file
$content = "const SoundAssets = {`n"

Get-ChildItem $soundDir | ForEach-Object {
    $name = $_.BaseName
    if ($name -eq "desktop") { return } # Skip hidden files if any
    
    $ext = $_.Extension.TrimStart('.')
    $mime = if ($ext -eq "ogg") { "audio/ogg" } else { "audio/wav" }
    
    $bytes = [System.IO.File]::ReadAllBytes($_.FullName)
    $base64 = [System.Convert]::ToBase64String($bytes)
    
    $content += "    `"$name`": `"data:$mime;base64,$base64`",`n"
}

$content += "};"
[System.IO.File]::WriteAllText($outputFile, $content, [System.Text.Encoding]::UTF8)

Write-Host "SoundAssets.js generated successfully."
