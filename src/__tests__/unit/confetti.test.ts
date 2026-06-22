// Feature: dashboard-and-ux-performance, Task 15.2 — lazy-load off-critical-path
// deps (canvas-confetti) via one shared helper.

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the dynamically-imported library. vi.mock intercepts dynamic import()
// too, so launchConfetti's `await import("canvas-confetti")` resolves here.
const confettiSpy = vi.fn();
vi.mock("canvas-confetti", () => ({ default: confettiSpy }));

import { launchConfetti } from "@/lib/confetti";

describe("launchConfetti (lazy canvas-confetti wrapper)", () => {
  beforeEach(() => {
    confettiSpy.mockReset();
  });

  it("lazy-loads canvas-confetti and forwards the options on first use", async () => {
    await launchConfetti({ particleCount: 30, spread: 60 });
    expect(confettiSpy).toHaveBeenCalledTimes(1);
    expect(confettiSpy).toHaveBeenCalledWith({ particleCount: 30, spread: 60 });
  });

  it("forwards an undefined options argument", async () => {
    await launchConfetti();
    expect(confettiSpy).toHaveBeenCalledWith(undefined);
  });

  it("swallows errors so a failed confetti never breaks the calling UI", async () => {
    confettiSpy.mockImplementationOnce(() => {
      throw new Error("chunk load failed");
    });
    await expect(
      launchConfetti({ particleCount: 10 })
    ).resolves.toBeUndefined();
  });
});
