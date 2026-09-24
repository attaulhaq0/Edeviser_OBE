// Preserve the public import path while keeping component refresh boundaries separate.
export { AccentDot, IconBox, Logo } from "@/design-system/hawdex/primitive-components";

export const cx = (...c: (string | undefined | false | null)[]) => c.filter(Boolean).join(" ");
