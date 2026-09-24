export interface SourceLocation { path: string; line: number }
export interface CatalogProperty {
  name: string; type: string; optional: boolean; documentation: string | null; declarations: SourceLocation[];
}
export interface CatalogEntry {
  id: string; exportName: string; canonicalImport: string; purpose: string;
  status: "recommended-scoped" | "adopted-primitive" | "compatibility-review";
  constraints: string[]; requiredStates: string[];
  replacement: { kind: "review-candidate"; targetIds: string[]; note: string } | null;
  example: { path: string; exportName: string };
  evidence: { kind: "test-source" | "review-document"; path: string; scope: string }[];
  implementation: SourceLocation; documentation: string | null; jsDocTags: { name: string; text: string }[];
  api: {
    signature: string; propsType: string; properties: CatalogProperty[];
    inheritedNative: { omittedCount: number; sources: string[]; note: string };
  }[];
}
export interface CatalogSnapshot {
  schemaVersion: 1; scope: "pilot"; typescriptVersion: string; limitations: string[];
  inputs: { path: string; sha256: string }[]; entries: CatalogEntry[];
}
export const INPUT: string;
export const JSON_OUTPUT: string;
export const MARKDOWN_OUTPUT: string;
/** Rejects absolute, cross-drive, parent-traversing and non-POSIX relative paths. */
export function isRepositoryRelativePath(path: string): boolean;
/** Canonicalize physical CRLF text line endings without decoding literal escapes. */
export function normalizeCatalogText(value: string): string;
export function buildCatalog(root?: string): CatalogSnapshot;
export function renderMarkdown(catalog: CatalogSnapshot): string;
export function runCatalog(mode?: "check" | "write", root?: string): number;
