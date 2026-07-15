// Render behavior for the mascot components (L2). Feature: prototype-frontend-rebuild (P0.5).
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import MascotCharacter from "@/design-system/mascot/MascotCharacter";
import MascotCompanion from "@/design-system/mascot/MascotCompanion";

describe("MascotCharacter", () => {
  it("renders a non-draggable, sized img with a resolved src and meaningful alt", () => {
    const { container } = render(
      <MascotCharacter character="foxi" emotion="celebrating" size="lg" />
    );
    const img = container.querySelector("img") as HTMLImageElement;
    expect(img).toBeTruthy();
    expect(img.getAttribute("draggable")).toBe("false");
    expect(img.getAttribute("alt")).toContain("Foxi");
    expect(img.getAttribute("src")).toBeTruthy();
    expect(img.style.width).toBe("150px");
    expect(img.className).toContain("edv-mascot");
  });

  it("supports decorative mode (empty alt + aria-hidden)", () => {
    const { container } = render(
      <MascotCharacter character="owl" emotion="wise" decorative />
    );
    const img = container.querySelector("img") as HTMLImageElement;
    expect(img.getAttribute("alt")).toBe("");
    expect(img.getAttribute("aria-hidden")).toBe("true");
  });

  it("applies the requested motion preset class", () => {
    const { container } = render(
      <MascotCharacter character="penguin" emotion="happy" animation="float" />
    );
    const img = container.querySelector("img") as HTMLImageElement;
    expect(img.className).toContain("edv-mascot-float");
  });
});

describe("MascotCompanion", () => {
  it("renders the character image plus a titled speech bubble", () => {
    const { container, getByText } = render(
      <MascotCompanion
        character="foxi"
        emotion="happy"
        title="Nice work!"
        message="You kept your streak alive."
      />
    );
    expect(container.querySelector("img")).toBeTruthy();
    expect(getByText("Nice work!")).toBeTruthy();
    expect(getByText("You kept your streak alive.")).toBeTruthy();
    expect(container.querySelector(".edv-mascot-bubble")).toBeTruthy();
  });
});
