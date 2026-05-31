// Pipeline A — ffmpeg-static
// Turns the pre-composed branded slides (docs/demo-capture/slides) into an MP4
// with gentle crossfades. No zoompan, no drawtext — just reliable still->video.
//
// Usage: node scripts/demo-compose-slides.mjs && node scripts/demo-video-ffmpeg.mjs
// Output: docs/demo-capture/output/edeviser-demo-ffmpeg.mp4

import ffmpegPath from "ffmpeg-static";
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync } from "node:fs";

const SLIDES = "docs/demo-capture/slides";
const OUT = "docs/demo-capture/output";
mkdirSync(OUT, { recursive: true });

const W = 1920, H = 1080, FPS = 30;
const PER = 4.0;   // seconds each slide is held
const XF = 0.7;    // crossfade seconds

const files = readdirSync(SLIDES).filter((f) => f.endsWith(".png")).sort();
if (files.length === 0) throw new Error("No slides found — run demo-compose-slides.mjs first.");

const ff = (args) => execFileSync(ffmpegPath, args, { stdio: ["ignore", "ignore", "inherit"] });

// 1) Each slide -> a fixed-length clip (simple, fast, deterministic).
const clips = [];
files.forEach((f, i) => {
  const out = `${OUT}/_c${String(i).padStart(2, "0")}.mp4`;
  ff([
    "-y", "-loop", "1", "-t", String(PER), "-i", `${SLIDES}/${f}`,
    "-vf", `scale=${W}:${H},format=yuv420p`,
    "-r", String(FPS), "-c:v", "libx264", "-pix_fmt", "yuv420p", out,
  ]);
  clips.push(out);
  console.log("  ✔ clip", f);
});

// 2) Chain crossfades. Each xfade offset = cumulative visible time so far.
let prev = clips[0];
let visible = PER; // duration of `prev` so far
for (let i = 1; i < clips.length; i++) {
  const merged = `${OUT}/_m${String(i).padStart(2, "0")}.mp4`;
  const offset = (visible - XF).toFixed(2);
  ff([
    "-y", "-i", prev, "-i", clips[i],
    "-filter_complex",
    `[0:v][1:v]xfade=transition=fade:duration=${XF}:offset=${offset},format=yuv420p[v]`,
    "-map", "[v]", "-r", String(FPS), "-c:v", "libx264", "-pix_fmt", "yuv420p", merged,
  ]);
  prev = merged;
  visible = visible + PER - XF; // new total visible duration
  console.log("  ✔ merged slide", i);
}

// 3) Final encode with faststart for web playback.
const final = `${OUT}/edeviser-demo-ffmpeg.mp4`;
ff(["-y", "-i", prev, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-movflags", "+faststart", final]);
console.log("\n✅ ffmpeg pipeline done:", final);
