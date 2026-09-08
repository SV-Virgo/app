Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$assets = Join-Path $root "assets"
$brand = Join-Path $assets "brand"

$brandBlue = [System.Drawing.Color]::FromArgb(255, 0x25, 0x63, 0xa8)

function New-Canvas([int]$size, [System.Drawing.Color]$fill) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    if ($fill) {
        $brush = New-Object System.Drawing.SolidBrush($fill)
        $g.FillRectangle($brush, 0, 0, $size, $size)
        $brush.Dispose()
    }
    return @{ Bitmap = $bmp; Graphics = $g }
}

function Add-CenteredLogo($g, [string]$logoPath, [int]$canvasSize, [double]$widthFraction) {
    $logo = [System.Drawing.Image]::FromFile($logoPath)
    $targetW = [int]($canvasSize * $widthFraction)
    $targetH = [int]($targetW * $logo.Height / $logo.Width)
    $x = [int](($canvasSize - $targetW) / 2)
    $y = [int](($canvasSize - $targetH) / 2)
    $g.DrawImage($logo, $x, $y, $targetW, $targetH)
    $logo.Dispose()
}

function Save-Png($bmp, [string]$path) {
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
}

# 1. icon.png — 1024x1024, brand blue background + white logo (iOS + generic/web)
$c = New-Canvas 1024 $brandBlue
Add-CenteredLogo $c.Graphics (Join-Path $brand "logo-white.png") 1024 0.72
Save-Png $c.Bitmap (Join-Path $assets "icon.png")
$c.Graphics.Dispose(); $c.Bitmap.Dispose()

# 2. android-icon-background.png — 1024x1024 solid brand blue, no logo
$c = New-Canvas 1024 $brandBlue
Save-Png $c.Bitmap (Join-Path $assets "android-icon-background.png")
$c.Graphics.Dispose(); $c.Bitmap.Dispose()

# 3. android-icon-foreground.png — 1024x1024 transparent, logo kept inside the ~66% safe zone
$c = New-Canvas 1024 ([System.Drawing.Color]::Transparent)
Add-CenteredLogo $c.Graphics (Join-Path $brand "logo-white.png") 1024 0.55
Save-Png $c.Bitmap (Join-Path $assets "android-icon-foreground.png")
$c.Graphics.Dispose(); $c.Bitmap.Dispose()

# 4. android-icon-monochrome.png — 1024x1024 transparent silhouette (Android only uses alpha)
$c = New-Canvas 1024 ([System.Drawing.Color]::Transparent)
Add-CenteredLogo $c.Graphics (Join-Path $brand "logo-white.png") 1024 0.55
Save-Png $c.Bitmap (Join-Path $assets "android-icon-monochrome.png")
$c.Graphics.Dispose(); $c.Bitmap.Dispose()

# 5. favicon.png — 256x256, same style as icon.png, for Expo web
$c = New-Canvas 256 $brandBlue
Add-CenteredLogo $c.Graphics (Join-Path $brand "logo-white.png") 256 0.72
Save-Png $c.Bitmap (Join-Path $assets "favicon.png")
$c.Graphics.Dispose(); $c.Bitmap.Dispose()

Write-Output "Done. Regenerated: icon.png, android-icon-background.png, android-icon-foreground.png, android-icon-monochrome.png, favicon.png"
