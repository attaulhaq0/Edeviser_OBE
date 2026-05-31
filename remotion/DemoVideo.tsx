import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  staticFile,
} from "remotion";

export const FPS = 30;

// Scene timings (seconds) — tuned to the voiceover lengths.
const T = {
  intro: 7,
  teacher: 27,
  tutor: 18,
  admin: 19,
  outro: 17,
};
export const FRAMES = {
  intro: T.intro * FPS,
  teacher: T.teacher * FPS,
  tutor: T.tutor * FPS,
  admin: T.admin * FPS,
  outro: T.outro * FPS,
};
export const TOTAL =
  FRAMES.intro + FRAMES.teacher + FRAMES.tutor + FRAMES.admin + FRAMES.outro;

const FONT = "'Noto Sans', system-ui, sans-serif";
const GRAD = "linear-gradient(93deg,#13BFA6,#1F6FEB)";
const STAGE_BG =
  "radial-gradient(ellipse at 25% 15%, rgba(19,191,166,.12), transparent 55%)," +
  "radial-gradient(ellipse at 80% 90%, rgba(31,111,235,.12), transparent 55%)," +
  "linear-gradient(135deg,#0B1220 0%,#0f2238 55%,#10283f 100%)";

// ── Branded card (intro / outro) ──
const Card: React.FC<{
  kind: "intro" | "outro";
  eyebrow: string;
  title: string;
  caption: string;
}> = ({ kind, eyebrow, title, caption }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const e = spring({
    frame,
    fps,
    durationInFrames: 22,
    config: { damping: 200 },
  });
  const up = interpolate(e, [0, 1], [40, 0]);
  const op = interpolate(frame, [0, 16], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill
      style={{
        background: STAGE_BG,
        fontFamily: FONT,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          textAlign: "center",
          padding: "0 140px",
          opacity: op,
          transform: `translateY(${up}px)`,
        }}
      >
        {kind === "outro" && (
          <Img
            src={staticFile("edeviser-logo-final.png")}
            style={{ width: 330, marginBottom: 38 }}
          />
        )}
        <div
          style={{
            display: "inline-block",
            background: GRAD,
            color: "#fff",
            fontSize: 24,
            fontWeight: 800,
            letterSpacing: 4,
            textTransform: "uppercase",
            padding: "9px 24px",
            borderRadius: 30,
            marginBottom: 22,
          }}
        >
          {eyebrow}
        </div>
        <div
          style={{
            fontSize: kind === "intro" ? 78 : 92,
            fontWeight: 900,
            background: "linear-gradient(93deg,#5eead4,#60a5fa)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            lineHeight: 1.05,
          }}
        >
          {title}
        </div>
        <div
          style={{
            color: "rgba(255,255,255,.85)",
            fontSize: 32,
            marginTop: 24,
            maxWidth: 1200,
            marginInline: "auto",
          }}
        >
          {caption}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 10,
          background: GRAD,
        }}
      />
    </AbsoluteFill>
  );
};

// ── Live clip scene with lower-third caption + browser frame ──
const ClipScene: React.FC<{
  src: string;
  eyebrow: string;
  title: string;
  caption: string;
  durF: number;
}> = ({ src, eyebrow, title, caption, durF }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const e = spring({
    frame,
    fps,
    durationInFrames: 20,
    config: { damping: 200 },
  });
  const up = interpolate(e, [0, 1], [50, 0]);
  const fadeIn = interpolate(frame, [0, 12], [0, 1], {
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(frame, [durF - 12, durF], [1, 0], {
    extrapolateLeft: "clamp",
  });
  const op = Math.min(fadeIn, fadeOut);

  return (
    <AbsoluteFill style={{ background: STAGE_BG, fontFamily: FONT }}>
      {/* device frame holding the live recording */}
      <div
        style={{
          position: "absolute",
          top: 70,
          left: 110,
          width: 1700,
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 40px 110px rgba(0,0,0,.55)",
          border: "1px solid rgba(255,255,255,.10)",
          background: "#0b1220",
          opacity: fadeIn,
        }}
      >
        <div
          style={{
            height: 42,
            background: "#0d1626",
            display: "flex",
            alignItems: "center",
            gap: 9,
            padding: "0 18px",
          }}
        >
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
            <span
              key={c}
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: c,
              }}
            />
          ))}
          <Img
            src={staticFile("edeviser-logo-final.png")}
            style={{ height: 18, marginLeft: 14 }}
          />
        </div>
        <OffthreadVideo
          src={staticFile(src)}
          style={{ width: "100%", display: "block" }}
          muted
        />
      </div>
      {/* lower-third caption */}
      <div
        style={{
          position: "absolute",
          left: 110,
          right: 110,
          bottom: 54,
          opacity: op,
          transform: `translateY(${up}px)`,
        }}
      >
        <div
          style={{
            display: "inline-block",
            background: GRAD,
            color: "#fff",
            fontSize: 20,
            fontWeight: 800,
            letterSpacing: 3,
            textTransform: "uppercase",
            padding: "7px 18px",
            borderRadius: 24,
            marginBottom: 12,
          }}
        >
          {eyebrow}
        </div>
        <div
          style={{
            color: "#fff",
            fontSize: 44,
            fontWeight: 900,
            lineHeight: 1.05,
            textShadow: "0 2px 18px rgba(0,0,0,.6)",
          }}
        >
          {title}
        </div>
        <div
          style={{
            color: "rgba(255,255,255,.85)",
            fontSize: 26,
            fontWeight: 500,
            marginTop: 8,
            maxWidth: 1500,
          }}
        >
          {caption}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 10,
          background: GRAD,
        }}
      />
    </AbsoluteFill>
  );
};

// Precomputed scene start offsets (frames). Derived once at module load so the
// render function stays pure — no mutable accumulator reassigned during render.
const OFFSET = {
  intro: 0,
  teacher: FRAMES.intro,
  tutor: FRAMES.intro + FRAMES.teacher,
  admin: FRAMES.intro + FRAMES.teacher + FRAMES.tutor,
  outro: FRAMES.intro + FRAMES.teacher + FRAMES.tutor + FRAMES.admin,
} as const;

export const DemoVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#0B1220" }}>
      {/* Voiceover track per scene (offset to scene starts) */}
      <Sequence from={OFFSET.intro}>
        <Audio src={staticFile("00-intro.wav")} />
      </Sequence>
      <Sequence from={OFFSET.teacher}>
        <Audio src={staticFile("01-teacher.wav")} />
      </Sequence>
      <Sequence from={OFFSET.tutor}>
        <Audio src={staticFile("02-tutor.wav")} />
      </Sequence>
      <Sequence from={OFFSET.admin}>
        <Audio src={staticFile("03-admin.wav")} />
      </Sequence>
      <Sequence from={OFFSET.outro}>
        <Audio src={staticFile("04-outro.wav")} />
      </Sequence>

      <Sequence from={OFFSET.intro} durationInFrames={FRAMES.intro}>
        <Card
          kind="intro"
          eyebrow="Live Product Demo"
          title="A Real Day Inside E Deviser"
          caption="Learning infrastructure for students, teachers, and schools"
        />
      </Sequence>
      <Sequence from={OFFSET.teacher} durationInFrames={FRAMES.teacher}>
        <ClipScene
          src="teacher.mp4"
          durF={FRAMES.teacher}
          eyebrow="For Teachers"
          title="The whole class, in real time"
          caption="Learning outcomes and student performance, live — no spreadsheets, no waiting for finals"
        />
      </Sequence>
      <Sequence from={OFFSET.tutor} durationInFrames={FRAMES.tutor}>
        <ClipScene
          src="tutor.mp4"
          durF={FRAMES.tutor}
          eyebrow="For Students"
          title="An AI Professor, always on hand"
          caption="Coaching students through problems, step by step — support the moment they're stuck"
        />
      </Sequence>
      <Sequence from={OFFSET.admin} durationInFrames={FRAMES.admin}>
        <ClipScene
          src="admin.mp4"
          durF={FRAMES.admin}
          eyebrow="For Schools"
          title="A live picture of the whole school"
          caption="Every daily action rolls up automatically into real, school-wide outcomes"
        />
      </Sequence>
      <Sequence from={OFFSET.outro} durationInFrames={FRAMES.outro}>
        <Card
          kind="outro"
          eyebrow="One Connected System"
          title="E Deviser"
          caption="Consistent students. Empowered teachers. Schools that can prove their outcomes."
        />
      </Sequence>
    </AbsoluteFill>
  );
};
