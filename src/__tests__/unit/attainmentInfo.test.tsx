// =============================================================================
// AttainmentInfo — Unit tests
// Covers Requirement 8: accessible mastery explanation, four threshold bands,
// band colors derived from the classifier, active-band highlight, and bilingual
// (en + ar) copy.
// =============================================================================

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import i18n from "@/lib/i18n";
import AttainmentInfo from "@/components/shared/AttainmentInfo";
import { getAttainmentColor } from "@/lib/attainmentClassifier";

const renderInfo = (
  props?: Partial<React.ComponentProps<typeof AttainmentInfo>>
) =>
  render(
    <I18nextProvider i18n={i18n}>
      <AttainmentInfo {...props} />
    </I18nextProvider>
  );

const openPopover = async () => {
  const user = userEvent.setup();
  await user.click(screen.getByTestId("attainment-info-trigger"));
  return user;
};

describe("AttainmentInfo", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("renders an accessible trigger with a descriptive label", () => {
    renderInfo();
    const trigger = screen.getByTestId("attainment-info-trigger");
    expect(trigger).toHaveAccessibleName(
      "What does this attainment percentage mean?"
    );
  });

  it("explains that attainment reflects mastery of learning outcomes (R8.1)", async () => {
    renderInfo();
    await openPopover();
    const content = await screen.findByTestId("attainment-info-content");
    expect(
      within(content).getByText(/master(ed|y) your course learning outcomes/i)
    ).toBeInTheDocument();
  });

  it("describes all four threshold bands (R8.2)", async () => {
    renderInfo();
    await openPopover();
    const content = await screen.findByTestId("attainment-info-content");

    expect(within(content).getByText("Excellent")).toBeInTheDocument();
    expect(within(content).getByText("Satisfactory")).toBeInTheDocument();
    expect(within(content).getByText("Developing")).toBeInTheDocument();
    expect(within(content).getByText("Not Yet")).toBeInTheDocument();

    // Ranges with the default thresholds (85 / 70 / 50).
    expect(within(content).getByText("85% and above")).toBeInTheDocument();
    expect(within(content).getByText("70–84%")).toBeInTheDocument();
    expect(within(content).getByText("50–69%")).toBeInTheDocument();
    expect(within(content).getByText("Below 50%")).toBeInTheDocument();
  });

  it("colors each band swatch from the classifier so color matches the band (R8.3)", async () => {
    renderInfo();
    await openPopover();
    const content = await screen.findByTestId("attainment-info-content");

    const swatchColor = (level: string): string | undefined => {
      const row = within(content).getByTestId(`attainment-band-${level}`);
      const swatch = row.querySelector<HTMLElement>("span[aria-hidden='true']");
      return swatch?.style.backgroundColor;
    };

    // happy-dom preserves the inline hex value as-is.
    expect(swatchColor("Excellent")).toBe(getAttainmentColor(85));
    expect(swatchColor("Satisfactory")).toBe(getAttainmentColor(70));
    expect(swatchColor("Developing")).toBe(getAttainmentColor(50));
    expect(swatchColor("Not_Yet")).toBe(getAttainmentColor(49));
  });

  it("highlights the band matching a provided percentage (50% → Developing)", async () => {
    renderInfo({ percent: 50 });
    await openPopover();
    const content = await screen.findByTestId("attainment-info-content");

    expect(
      within(content).getByTestId("attainment-band-Developing")
    ).toHaveAttribute("data-active", "true");
    expect(
      within(content).getByTestId("attainment-band-Not_Yet")
    ).not.toHaveAttribute("data-active");
  });

  it("classifies a value strictly below 50% as Not Yet", async () => {
    renderInfo({ percent: 49 });
    await openPopover();
    const content = await screen.findByTestId("attainment-info-content");

    expect(
      within(content).getByTestId("attainment-band-Not_Yet")
    ).toHaveAttribute("data-active", "true");
  });

  it("highlights no band when given no-data (negative) percentage", async () => {
    renderInfo({ percent: -1 });
    await openPopover();
    const content = await screen.findByTestId("attainment-info-content");

    for (const level of [
      "Excellent",
      "Satisfactory",
      "Developing",
      "Not_Yet",
    ]) {
      expect(
        within(content).getByTestId(`attainment-band-${level}`)
      ).not.toHaveAttribute("data-active");
    }
  });

  it("renders the explanation in Arabic (R8.4)", async () => {
    await i18n.changeLanguage("ar");
    renderInfo();
    await openPopover();
    const content = await screen.findByTestId("attainment-info-content");

    expect(within(content).getByText("فهم التحصيل")).toBeInTheDocument();
    expect(within(content).getByText("ممتاز")).toBeInTheDocument();
    expect(within(content).getByText("لم يتحقق بعد")).toBeInTheDocument();
  });
});
