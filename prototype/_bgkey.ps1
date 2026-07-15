Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class BgKey {
  public static string Key(string inPath, string outPath, int tol) {
    using (Bitmap src = new Bitmap(inPath)) {
      int w = src.Width, h = src.Height;
      using (Bitmap bmp = src.Clone(new Rectangle(0,0,w,h), PixelFormat.Format32bppArgb)) {
        BitmapData data = bmp.LockBits(new Rectangle(0,0,w,h), ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
        int stride = data.Stride;
        int bytes = stride * h;
        byte[] buf = new byte[bytes];
        Marshal.Copy(data.Scan0, buf, 0, bytes);

        // Reference bg colour = average of the 4 corners (B,G,R,A order in memory)
        int[][] corners = new int[][] {
          new int[]{2,2}, new int[]{w-3,2}, new int[]{2,h-3}, new int[]{w-3,h-3}
        };
        long sr=0, sg=0, sb=0;
        foreach (var c in corners) {
          int off = c[1]*stride + c[0]*4;
          sb += buf[off]; sg += buf[off+1]; sr += buf[off+2];
        }
        int bgB=(int)(sb/4), bgG=(int)(sg/4), bgR=(int)(sr/4);
        long tol2 = (long)tol*tol;

        bool[] visited = new bool[w*h];
        int[] stack = new int[w*h];
        int sp = 0;
        foreach (var c in corners) {
          int idx = c[1]*w + c[0];
          if (!visited[idx]) { visited[idx]=true; stack[sp++]=idx; }
        }

        int removed = 0;
        while (sp > 0) {
          int idx = stack[--sp];
          int x = idx % w, y = idx / w;
          int off = y*stride + x*4;
          int db = buf[off]-bgB, dg = buf[off+1]-bgG, dr = buf[off+2]-bgR;
          long dist2 = (long)db*db + (long)dg*dg + (long)dr*dr;
          if (dist2 > tol2) continue;   // this pixel is character, not bg
          buf[off+3] = 0;               // make transparent
          removed++;
          // enqueue 4-neighbours
          if (x > 0)   { int n=idx-1; if(!visited[n]){visited[n]=true; stack[sp++]=n;} }
          if (x < w-1) { int n=idx+1; if(!visited[n]){visited[n]=true; stack[sp++]=n;} }
          if (y > 0)   { int n=idx-w; if(!visited[n]){visited[n]=true; stack[sp++]=n;} }
          if (y < h-1) { int n=idx+w; if(!visited[n]){visited[n]=true; stack[sp++]=n;} }
        }

        // Light edge feather: opaque pixels touching a transparent pixel and
        // still close-ish to bg get partial alpha -> kills the 1px colour halo.
        long tolFeather2 = (long)(tol*1.8)*(long)(tol*1.8);
        for (int y=0; y<h; y++) {
          for (int x=0; x<w; x++) {
            int off = y*stride + x*4;
            if (buf[off+3] == 0) continue;
            bool edge = (x>0 && buf[off-4+3]==0) || (x<w-1 && buf[off+4+3]==0)
                     || (y>0 && buf[off-stride+3]==0) || (y<h-1 && buf[off+stride+3]==0);
            if (!edge) continue;
            int db = buf[off]-bgB, dg = buf[off+1]-bgG, dr = buf[off+2]-bgR;
            long dist2 = (long)db*db + (long)dg*dg + (long)dr*dr;
            if (dist2 < tolFeather2) {
              double t = Math.Sqrt((double)dist2 / (double)tolFeather2); // 0..1
              buf[off+3] = (byte)Math.Max(0, Math.Min(255, (int)(t*255)));
            }
          }
        }

        Marshal.Copy(buf, 0, data.Scan0, bytes);
        bmp.UnlockBits(data);
        bmp.Save(outPath, ImageFormat.Png);
        return removed + " px removed (bg " + bgR + "," + bgG + "," + bgB + ")";
      }
    }
  }
}
'@ -ReferencedAssemblies System.Drawing

$root = Join-Path $PSScriptRoot 'characters'
$tolMap = @{ foxi = 58; penguin = 40; owl = 58 }

Get-ChildItem -Recurse -File -Path $root -Filter *.png | ForEach-Object {
  $b = [System.IO.File]::ReadAllBytes($_.FullName)[0..33]
  $isAlpha = ($b[25] -eq 6)
  if ($isAlpha) {
    Write-Output ("SKIP (already RGBA)  {0}" -f $_.Name)
    return
  }
  $folder = Split-Path (Split-Path $_.FullName -Parent) -Leaf
  $tol = $tolMap[$folder]; if (-not $tol) { $tol = 50 }
  $tmp = $_.FullName + '.tmp.png'
  $res = [BgKey]::Key($_.FullName, $tmp, $tol)
  Move-Item -Force $tmp $_.FullName
  Write-Output ("KEYED tol={0,-3} {1,-32} {2}" -f $tol, $_.Name, $res)
}
