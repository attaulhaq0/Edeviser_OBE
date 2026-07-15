// =============================================================================
// MascotCompanion — character + speech bubble (L2 pattern)
// =============================================================================
//
// Faithful React port of the prototype `EdvCharacter.companion()` — a mascot
// pose beside a speech bubble. The signature gamified coaching surface used on
// dashboards, the learning path, journal, and the tutor.
//
// Copy is passed in already-localized by the caller (keeps this presentational
// and bilingual-ready). For moment-driven copy, pair `mascotForMoment()` with
// the i18n text from the existing guidance layer.
// =============================================================================

import "./mascot.css";
import { cn } from "@/lib/utils";
import MascotCharacter from "./MascotCharacter";
import type { CharacterEmotion, CharacterId, CharacterSize } from "./characters";

export interface MascotCompanionProps {
  character: CharacterId;
  emotion?: CharacterEmotion;
  /** Optional bold headline inside the bubble. */
  title?: string;
  /** Bubble body copy (already localized). */
  message: string;
  size?: CharacterSize;
  /** Bubble tint. Omit for the default white bubble. */
  tint?: "teal" | "amber" | "blue";
  /** Which way the bubble tail points: inline-start (`l`) or down (`b`). */
  tail?: "l" | "b";
  /** Center-align the character with the bubble. */
  center?: boolean;
  /** Idle float on the character (otherwise a spring entrance). */
  float?: boolean;
  /** Style the bubble for a dark hero surface (translucent light). */
  onHero?: boolean;
  className?: string;
}

const MascotCompanion = ({
  character,
  emotion = "happy",
  title,
  message,
  size = "md",
  tint,
  tail = "l",
  center = false,
  float = false,
  onHero = false,
  className,
}: MascotCompanionProps) => (
  <div
    className={cn(
      "edv-mascot-row",
      center && "edv-mascot-row--center",
      onHero && "edv-mascot-onhero",
      className
    )}
  >
    <MascotCharacter
      character={character}
      emotion={emotion}
      size={size}
      animation={float ? "float" : "in"}
    />
    <div
      className={cn(
        "edv-mascot-bubble",
        `edv-mascot-bubble--tail-${tail}`,
        tint && `edv-mascot-bubble--${tint}`
      )}
    >
      {title && <p className="edv-mascot-bubble__ttl">{title}</p>}
      <p className="edv-mascot-bubble__msg">{message}</p>
    </div>
  </div>
);

export default MascotCompanion;
