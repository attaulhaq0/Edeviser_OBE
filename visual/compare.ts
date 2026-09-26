/**
 * Pixel-diff helper for the visual-regression harness.
 * Uses pngjs + pixelmatch (both already in devDependencies).
 */
import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

export interface DiffResult {
  /** Mismatched pixels / total pixels (0..1). */
  diffRatio: number;
  mismatchedPixels: number;
  totalPixels: number;
  width: number;
  height: number;
  /** True when reference and actual differ in size (parity is invalid then). */
  dimensionMismatch: boolean;
  /** Path to the written diff image (only when there is a diff). */
  diffPath?: string;
}

const ensureDir = (file: string) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
};

/** Never promote a prototype capture into the committed historical reference. */
export const prototypeCandidatePath = (
  id: string,
  viewport: string,
  runId: string,
  root = process.cwd()
): string => {
  if (![id, viewport, runId].every((value) => /^[a-z0-9-]+$/.test(value))) {
    throw new Error("Invalid prototype candidate path segment");
  }
  return path.join(
    root,
    "test-results",
    "visual-candidates",
    runId,
    `${id}__${viewport}.png`
  );
};
/** Exclusive create: a repeat capture cannot replace even another candidate. */
export const writePrototypeCandidate = (
  image: Buffer,
  id: string,
  viewport: string,
  runId: string,
  root = process.cwd()
): string => {
  const target = prototypeCandidatePath(id, viewport, runId, root);
  ensureDir(target);
  fs.writeFileSync(target, image, { flag: "wx" });
  return target;
};
export const referencePath = (id: string, viewport: string): string =>
  path.join(process.cwd(), "visual", "references", `${id}__${viewport}.png`);

export const diffOutputPath = (id: string, viewport: string): string =>
  path.join(
    process.cwd(),
    "test-results",
    "visual-diffs",
    `${id}__${viewport}.diff.png`
  );

export const hasReference = (id: string, viewport: string): boolean =>
  fs.existsSync(referencePath(id, viewport));

/**
 * Compare an actual PNG buffer against a committed reference image.
 * Writes an annotated diff PNG when pixels mismatch.
 */
export function comparePng(
  actualBuffer: Buffer,
  refPath: string,
  diffPath: string,
  pixelmatchThreshold: number
): DiffResult {
  const reference = PNG.sync.read(fs.readFileSync(refPath));
  const actual = PNG.sync.read(actualBuffer);

  if (reference.width !== actual.width || reference.height !== actual.height) {
    return {
      diffRatio: 1,
      mismatchedPixels: reference.width * reference.height,
      totalPixels: reference.width * reference.height,
      width: reference.width,
      height: reference.height,
      dimensionMismatch: true,
    };
  }

  const { width, height } = reference;
  const diff = new PNG({ width, height });
  const mismatchedPixels = pixelmatch(
    reference.data,
    actual.data,
    diff.data,
    width,
    height,
    { threshold: pixelmatchThreshold }
  );

  const totalPixels = width * height;
  const diffRatio = totalPixels === 0 ? 1 : mismatchedPixels / totalPixels;

  if (mismatchedPixels > 0) {
    ensureDir(diffPath);
    fs.writeFileSync(diffPath, PNG.sync.write(diff));
  }

  return {
    diffRatio,
    mismatchedPixels,
    totalPixels,
    width,
    height,
    dimensionMismatch: false,
    diffPath: mismatchedPixels > 0 ? diffPath : undefined,
  };
}
