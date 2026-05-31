// Trim the login portion off each live WebM clip and export clean 1080p MP4
// segments sized for the voiceover. Output into docs/demo-capture (Remotion public dir).
import ffmpegPath from "ffmpeg-static";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";

const LIVE = "docs/demo-capture/live";
const OUT = "docs/demo-capture/clips-mp4";
mkdirSync(OUT, { recursive: true });

// scene: source, start (skip login), length
const segs = [
  { id: "teacher", src: "1-teacher.webm", start: 8, len: 27 },
  { id: "tutor", src: "2-tutor.webm", start: 8, len: 18 },
  { id: "admin", src: "3-admin.webm", start: 8, len: 19 },
];

const ff = (args) => execFileSync(ffmpegPath, args, { stdio: ["ignore", "ignore", "inherit"] });

for (const s of segs) {
  const out = `${OUT}/${s.id}.mp4`;
  ff([
    "-y",
    "-ss", String(s.start),
    "-i", `${LIVE}/${s.src}`,
    "-t", String(s.len),
    "-vf", "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,format=yuv420p",
    "-r", "30",
    "-an",
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20",
    out,
  ]);
  console.log("  ✔", s.id, `(${s.len}s)`);
}
console.log("Clean MP4 segments in", OUT);
