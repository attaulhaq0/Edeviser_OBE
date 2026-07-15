// =============================================================================
// MascotCharacter — renders a living mascot pose (L2 pattern)
// =============================================================================
//
// Faithful React port of the prototype `EdvCharacter.img()` / `.chr` system.
// Resolves a character + emotion to a bundled PNG, sizes it (46–200px), and
// applies an optional motion preset. Non-draggable, reduced-motion safe, and
// accessible (meaningful alt by default; `decorative` for purely ornamental use).
// =============================================================================

import "./mascot.css";
import { cn } from "@/lib/utils";
import {
  characterAssetUrl,
  characterName,
  SIZE_PX,
  type CharacterAnimation,
  type CharacterEmotion,
  type CharacterId,
  type CharacterSize,
} from "./characters";

const ANIMATION_CLASS: Record<CharacterAnimation, string> = {
  none: "",
  float: "edv-mascot-float",
  in: "edv-mascot-in",
  wave: "edv-mascot-wave",
  pop: "edv-mascot-pop",
  nudge: "edv-mascot-nudge",
};

export interface MascotCharacterProps {
  character: CharacterId;
  /** Emotion / pose. Falls back to the character's default when unavailable. */
  emotion?: CharacterEmotion;
  /** Render size (prototype `.chr-*` scale). Default `md`. */
  size?: CharacterSize;
  /** Motion preset. Default `in` (a subtle spring entrance). */
  animation?: CharacterAnimation;
  /** Override the accessible alt text. */
  alt?: string;
  /** Purely ornamental: renders empty alt + aria-hidden. */
  decorative?: boolean;
  /** Image loading strategy. Default `lazy`. */
  loading?: "eager" | "lazy";
  className?: string;
}

const MascotCharacter = ({
  character,
  emotion = "default",
  size = "md",
  animation = "in",
  alt,
  decorative = false,
  loading = "lazy",
  className,
}: MascotCharacterProps) => {
  const src = characterAssetUrl(character, emotion);
  const px = SIZE_PX[size];
  const computedAlt = decorative
    ? ""
    : alt ?? `${characterName(character)} looking ${emotion}`;

  return (
    <img
      src={src}
      alt={computedAlt}
      aria-hidden={decorative || undefined}
      width={px}
      height={px}
      draggable={false}
      loading={loading}
      className={cn("edv-mascot", ANIMATION_CLASS[animation], className)}
      style={{ width: px, height: px }}
    />
  );
};

export default MascotCharacter;
