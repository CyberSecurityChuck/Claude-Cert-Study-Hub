Add-Type -TypeDefinition @"
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;

public class BadgeProcessor {
    public static void ProcessBadge(string srcPath, string destPath, float cx, float cy, float radius) {
        using (Bitmap src = new Bitmap(srcPath)) {
            int dim = (int)(radius * 2);
            using (Bitmap dest = new Bitmap(dim, dim, PixelFormat.Format32bppArgb)) {
                using (Graphics g = Graphics.FromImage(dest)) {
                    g.SmoothingMode = SmoothingMode.AntiAlias;
                    g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                    g.PixelOffsetMode = PixelOffsetMode.HighQuality;
                    g.Clear(Color.Transparent);

                    using (GraphicsPath path = new GraphicsPath()) {
                        path.AddEllipse(0, 0, dim, dim);
                        g.SetClip(path);

                        float srcX = cx - radius;
                        float srcY = cy - radius;
                        
                        RectangleF srcRect = new RectangleF(srcX, srcY, dim, dim);
                        RectangleF destRect = new RectangleF(0, 0, dim, dim);

                        g.DrawImage(src, destRect, srcRect, GraphicsUnit.Pixel);
                    }
                }
                // Save to destination
                dest.Save(destPath, ImageFormat.Png);
            }
        }
    }
}
"@ -ReferencedAssemblies "System.Drawing.dll"

$badges = @(
  @{
    src = "assets\certifications\cca_foundations_master_badge.png"
    cx = 626.5
    cy = 606.5
    r = 564.0
    copies = @(
      "app\portals\study-hub\assets\certifications\cca_foundations_master_badge.png",
      "app\portals\exam-center\assets\certifications\cca_foundations_master_badge.png"
    )
  },
  @{
    src = "assets\domains\cca_domain1_agentic_architecture.png"
    cx = 626.0
    cy = 618.5
    r = 569.0
    copies = @(
      "app\portals\study-hub\assets\domains\cca_domain1_agentic_architecture.png",
      "app\portals\exam-center\assets\domains\cca_domain1_agentic_architecture.png"
    )
  },
  @{
    src = "assets\domains\cca_domain2_mcp_integration.png"
    cx = 623.5
    cy = 620.0
    r = 580.0
    copies = @(
      "app\portals\study-hub\assets\domains\cca_domain2_mcp_integration.png",
      "app\portals\exam-center\assets\domains\cca_domain2_mcp_integration.png"
    )
  },
  @{
    src = "assets\domains\cca_domain3_code_workflows.png"
    cx = 626.0
    cy = 618.0
    r = 574.0
    copies = @(
      "app\portals\study-hub\assets\domains\cca_domain3_code_workflows.png",
      "app\portals\exam-center\assets\domains\cca_domain3_code_workflows.png"
    )
  },
  @{
    src = "assets\domains\cca_domain4_prompt_engineering.png"
    cx = 626.5
    cy = 618.0
    r = 569.5
    copies = @(
      "app\portals\study-hub\assets\domains\cca_domain4_prompt_engineering.png",
      "app\portals\exam-center\assets\domains\cca_domain4_prompt_engineering.png"
    )
  },
  @{
    src = "assets\domains\cca_domain5_context_reliability.png"
    cx = 625.0
    cy = 621.5
    r = 576.0
    copies = @(
      "app\portals\study-hub\assets\domains\cca_domain5_context_reliability.png",
      "app\portals\exam-center\assets\domains\cca_domain5_context_reliability.png"
    )
  }
)

foreach ($b in $badges) {
    Write-Output "Processing $($b.src)..."
    $tempOut = "$($b.src).tmp.png"
    [BadgeProcessor]::ProcessBadge($b.src, $tempOut, [float]$b.cx, [float]$b.cy, [float]$b.r)
    
    # Overwrite original
    Move-Item -Force $tempOut $b.src
    Write-Output "  -> Updated $($b.src)"
    
    # Copy to portal assets
    foreach ($cp in $b.copies) {
        $cpDir = Split-Path -Parent $cp
        if (-not (Test-Path $cpDir)) { New-Item -ItemType Directory -Force -Path $cpDir | Out-Null }
        Copy-Item -Force $b.src $cp
        Write-Output "  -> Copied to $cp"
    }
}

Write-Output "All circular badges processed and deployed successfully!"
