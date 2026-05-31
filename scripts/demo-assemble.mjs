// Assemble the final MP4: for each scene, hold its frame for the duration of
// its voiceover (+padding) with a gentle Ken Burns zoom, mux the audio, then
// concatenate all scenes. Uses bundled ffmpeg (ffmpeg-static).
import ffmpegPath from "ffmpeg-static";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync, existsSync, readdirSync } from "node:fs";

const FRAMES = "docs/demo-capture/frames";
const AUDIO = "docs/demo-capture/audio";
const TMP = "docs/demo-capture/_segments";
const OUT = "docs/demo-capture/EDEVISER-DEMO.mp4";

if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });

const ff = (args) =>
  execFileSync(ffmpegPath, args, { stdio: ["ignore", "ignore", "pipe"] });
const ffprobeDur = (file) => {
  // ffmpeg-static has no ffprobe; parse duration from ffmpeg stderr instead.
  try {
    execFileSync(ffmpegPath, ["-i", file], { stdio: ["ignore", "ignore", "pipe"] });
  } catch (e) {
    const m = String(e.stderr).match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
    if (m) return (+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3]);
  }
  return 4;
};

const scenes = [
  "00-title", "01-student", "02-student", "03-tutor",
  "04-teacher", "05-teacher", "06-admin", "07-end",
];

const PAD_HEAD = 0.5;
const PAD_TAIL = 1.1;
const segList = [];

scenes.forEach((id, i) => {
  const frame = `${FRAMES}/${id}.png`;
  const audio = `${AUDIO}/${id}.wav`;
  const hasAudio = existsSync(audio);
  const dur = (hasAudio ? ffprobeDur(audio) : 3) + PAD_HEAD + PAD_TAIL;
  const seg = `${TMP}/seg-${id}.mp4`;

  // Gentle zoom (Ken Burns). zoompan needs fps; 30fps.
  const frames = Math.round(dur * 30);
  const zoom = `zoompan=z='min(zoom+0.0009,1.10)':d=${frames}:s=1920x1080:fps=30,format=yuv420p`;

  const base = [
    "-y",
    "-loop", "1", "-t", dur.toFixed(2), "-i", frame,
  ];
  if (hasAudio) {
    base.push("-i", audio);
  }
  const args = [
    ...base,
    "-filter_complex",
    hasAudio
      ? `[0:v]${zoom}[v];[1:a]adelay=${Math.round(PAD_HEAD * 1000)}|${Math.round(PAD_HEAD * 1000)},apad[a]`
      : `[0:v]${zoom}[v]`,
    "-map", "[v]",
    ...(hasAudio ? ["-map", "[a]"] : []),
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", "30",
    "-t", dur.toFixed(2),
    "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
    "-shortest",
    seg,
  ];
  // Ensure silent segments still get an audio track for clean concat.
  if (!hasAudio) {
    args.splice(args.indexOf("-c:v"), 0,
      "-f", "lavfi", "-t", dur.toFixed(2), "-i", "anullsrc=channel_layout=stereo:sample_rate=48000");
    const mapIdx = args.indexOf("-map", args.indexOf("[v]"));
    args.splice(args.indexOf("-c:v"), 0, "-map", "2:a");
  }
  ff(args);
  segList.push(`file '${process.cwd().replace(/\\/g, "/")}/${seg}'`);
  console.log(`  segment ${i + 1}/${scenes.length}: ${id} (${dur.toFixed(1)}s)`);
});

const listFile = `${TMP}/list.txt`;
writeFileSync(listFile, segList.join("\n"));

ff([
  "-y", "-f", "concat", "-safe", "0", "-i", listFile,
  "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", "30",
  "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart",
  OUT,
]);

console.log("\nFinal video:", OUT);
