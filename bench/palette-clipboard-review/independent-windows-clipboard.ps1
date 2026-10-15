param([Parameter(Mandatory=$true)][ValidateSet('seed','read')][string]$Action,[Parameter(Mandatory=$true)][string]$Path)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Windows.Forms
if($Action -eq 'seed') {
  # Deliberately overwrite with owned PNG before any clipboard read. Never save
  # or inspect the clipboard that existed before this test.
  $bytes=[System.IO.File]::ReadAllBytes($Path)
  $stream=[System.IO.MemoryStream]::new($bytes)
  $owned=[System.Windows.Forms.DataObject]::new()
  $owned.SetData('PNG',$false,$stream)
  [System.Windows.Forms.Clipboard]::SetDataObject($owned,$true)
  $stream.Dispose()
  Write-Output '{"seededOwnedPng":true,"previousClipboardRead":false}'
} else {
  # The Node caller requires successful owned seeding and Copy first. Read only
  # PNG/bitmap image types; do not enumerate formats or inspect text/other data.
  $data=[System.Windows.Forms.Clipboard]::GetData('PNG')
  if($data -is [System.IO.MemoryStream]) {
    [System.IO.File]::WriteAllBytes($Path,$data.ToArray())
    Write-Output '{"format":"Windows PNG","allFormatDump":false}'
  } elseif($data -is [byte[]]) {
    [System.IO.File]::WriteAllBytes($Path,$data)
    Write-Output '{"format":"Windows PNG bytes","allFormatDump":false}'
  } else {
    Add-Type -AssemblyName System.Drawing
    $bitmap=[System.Windows.Forms.Clipboard]::GetImage()
    if($null -eq $bitmap){throw 'Known image clipboard has no PNG/bitmap image.'}
    try{$bitmap.Save($Path,[System.Drawing.Imaging.ImageFormat]::Png)}finally{$bitmap.Dispose()}
    Write-Output '{"format":"Windows bitmap re-encoded as PNG","allFormatDump":false}'
  }
}
