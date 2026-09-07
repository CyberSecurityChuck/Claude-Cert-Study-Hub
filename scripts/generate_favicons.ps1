Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @"
using System;
using System.IO;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Collections.Generic;

public class FaviconGenerator {
    public static byte[] CreatePng(Bitmap src, int outSize) {
        // Tight bounding box
        int minX = src.Width, maxX = 0;
        int minY = src.Height, maxY = 0;

        for (int y = 0; y < src.Height; y++) {
            for (int x = 0; x < src.Width; x++) {
                Color c = src.GetPixel(x, y);
                if (c.R < 235 || c.G < 235 || c.B < 235) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }

        int bw = maxX - minX + 1;
        int bh = maxY - minY + 1;
        int maxDim = Math.Max(bw, bh);

        using (Bitmap cropped = new Bitmap(bw, bh, PixelFormat.Format32bppArgb)) {
            for (int y = 0; y < bh; y++) {
                for (int x = 0; x < bw; x++) {
                    Color c = src.GetPixel(minX + x, minY + y);
                    int r = c.R, g = c.G, b = c.B;
                    if (r >= 242 && g >= 242 && b >= 242) {
                        cropped.SetPixel(x, y, Color.FromArgb(0, 0, 0, 0));
                    } else if (r > 218 && g > 218 && b > 218) {
                        float factor = 1.0f - ((Math.Min(r, Math.Min(g, b)) - 218f) / 24f);
                        int alpha = Math.Max(0, Math.Min(255, (int)(factor * 255)));
                        cropped.SetPixel(x, y, Color.FromArgb(alpha, r, g, b));
                    } else {
                        cropped.SetPixel(x, y, Color.FromArgb(255, r, g, b));
                    }
                }
            }

            using (Bitmap result = new Bitmap(outSize, outSize, PixelFormat.Format32bppArgb)) {
                using (Graphics g = Graphics.FromImage(result)) {
                    g.SmoothingMode = SmoothingMode.AntiAlias;
                    g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                    g.PixelOffsetMode = PixelOffsetMode.HighQuality;
                    g.Clear(Color.Transparent);

                    // Tight scale: fill 96% of canvas for maximum size & visibility on tabs
                    float scale = (outSize * 0.96f) / (float)maxDim;
                    float targetW = bw * scale;
                    float targetH = bh * scale;
                    float targetX = (outSize - targetW) / 2f;
                    float targetY = (outSize - targetH) / 2f;

                    g.DrawImage(cropped, new RectangleF(targetX, targetY, targetW, targetH));
                }

                using (MemoryStream ms = new MemoryStream()) {
                    result.Save(ms, ImageFormat.Png);
                    return ms.ToArray();
                }
            }
        }
    }

    public static void CreateIco(List<byte[]> pngImages, List<int> sizes, string outIcoPath) {
        using (FileStream fs = new FileStream(outIcoPath, FileMode.Create))
        using (BinaryWriter bw = new BinaryWriter(fs)) {
            // Header
            bw.Write((short)0); // Reserved
            bw.Write((short)1); // Type = 1 (ICO)
            bw.Write((short)pngImages.Count); // Count

            int offset = 6 + (16 * pngImages.Count);

            for (int i = 0; i < pngImages.Count; i++) {
                int size = sizes[i];
                byte[] data = pngImages[i];

                bw.Write((byte)(size >= 256 ? 0 : size)); // Width
                bw.Write((byte)(size >= 256 ? 0 : size)); // Height
                bw.Write((byte)0); // Color count
                bw.Write((byte)0); // Reserved
                bw.Write((short)1); // Planes
                bw.Write((short)32); // Bit count
                bw.Write((int)data.Length); // Bytes in resource
                bw.Write((int)offset); // Offset

                offset += data.Length;
            }

            // Write PNG payloads
            for (int i = 0; i < pngImages.Count; i++) {
                bw.Write(pngImages[i]);
            }
        }
    }
}
"@ -ReferencedAssemblies "System.Drawing.dll"

$srcImage = "assets\brand\cca_favicon_logomark.png"
$bmp = [System.Drawing.Bitmap]::FromFile($srcImage)

# Generate multi-res transparent PNGs
$png16 = [FaviconGenerator]::CreatePng($bmp, 16)
$png32 = [FaviconGenerator]::CreatePng($bmp, 32)
$png48 = [FaviconGenerator]::CreatePng($bmp, 48)
$png64 = [FaviconGenerator]::CreatePng($bmp, 64)
$png192 = [FaviconGenerator]::CreatePng($bmp, 192)
$png512 = [FaviconGenerator]::CreatePng($bmp, 512)
$bmp.Dispose()

# Save PNG assets
[System.IO.File]::WriteAllBytes("assets\brand\favicon-16x16.png", $png16)
[System.IO.File]::WriteAllBytes("assets\brand\favicon-32x32.png", $png32)
[System.IO.File]::WriteAllBytes("assets\brand\cca_favicon_logomark.png", $png512)

# Build multi-resolution ICO
$pngList = New-Object 'System.Collections.Generic.List[byte[]]'
$sizeList = New-Object 'System.Collections.Generic.List[int]'

$pngList.Add($png16);  $sizeList.Add(16)
$pngList.Add($png32);  $sizeList.Add(32)
$pngList.Add($png48);  $sizeList.Add(48)
$pngList.Add($png64);  $sizeList.Add(64)

[FaviconGenerator]::CreateIco($pngList, $sizeList, "assets\brand\favicon.ico")
[FaviconGenerator]::CreateIco($pngList, $sizeList, "favicon.ico")

# Distribute to portals
$destinations = @(
  "app\portals\study-hub\assets\brand",
  "app\portals\exam-center\assets\brand"
)

foreach ($dest in $destinations) {
    if (-not (Test-Path $dest)) { New-Item -ItemType Directory -Force -Path $dest | Out-Null }
    Copy-Item -Force "assets\brand\favicon-16x16.png" "$dest\favicon-16x16.png"
    Copy-Item -Force "assets\brand\favicon-32x32.png" "$dest\favicon-32x32.png"
    Copy-Item -Force "assets\brand\cca_favicon_logomark.png" "$dest\cca_favicon_logomark.png"
    Copy-Item -Force "assets\brand\favicon.ico" "$dest\favicon.ico"
    Write-Output "Deployed to $dest"
}

Write-Output "All transparent favicons generated and deployed successfully!"
