export const SOURCE: string;
export const OUTPUT: string;
export const FORMAT: string;
export const NAMES: readonly [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "primary",
  "primary-foreground",
  "action-primary-hover",
  "action-primary-active"
];
export type ColorToken = {
  $type: "color";
  $value: {
    colorSpace: "srgb";
    components: [number, number, number];
    hex: string;
  };
};
export interface PortableDocument {
  $description: string;
  $extensions: {
    "org.edeviser.portablePilot": {
      formatVersion: string;
      source: string;
      sourceScope: string;
      selectedDeclarationsSha256: string;
      writer: string;
    };
  };
  semantic: Record<
    "light" | "dark",
    Record<(typeof NAMES)[number], ColorToken>
  >;
}
export function extractSelectedColors(
  css: string
): Record<"light" | "dark", Record<string, string>>;
export function buildPortableColors(css: string): PortableDocument;
export function runPortableColors(
  mode: "check" | "write",
  root?: string
): {
  count: number;
  source: string;
  output: string;
  mode: string;
};
