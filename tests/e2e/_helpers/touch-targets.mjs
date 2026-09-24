// Shared student touch-target gate. Measures real browser CSS pixels; no rounding.
// This enforces the project's stricter 44px box policy, not WCAG's 24px AA target
// spacing exception. No blanket exemptions for links, icons, or component types.
export const MINIMUM_TOUCH_TARGET = 44;

export async function scanTouchTargets(page) {
  return page.evaluate((minimum) => {
    const roles = ["button", "link", "checkbox", "radio", "switch", "tab", "menuitem", "menuitemcheckbox", "menuitemradio", "option", "combobox", "slider", "spinbutton", "textbox"];
    const selector = [
      "button", "a[href]", "input", "select", "textarea", "summary",
      '[contenteditable]:not([contenteditable="false"])', '[tabindex]:not([tabindex="-1"])',
      ...roles.map((role) => `[role~="${role}"]`),
    ].join(",");
    const targets = [];
    const excluded = [];
    for (const element of document.querySelectorAll(selector)) {
      const rect = element.getBoundingClientRect();
      const target = {
        element: `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ""}`,
        name: (element.getAttribute("aria-label") ?? element.textContent ?? "").trim().slice(0, 80),
        width: rect.width,
        height: rect.height,
      };
      let reason;
      // These are not currently operable pointer targets, not design waivers.
      if (element.closest("[inert]")) reason = "inert subtree";
      else if (element.matches(":disabled") || element.closest('[aria-disabled="true"]')) reason = "disabled control";
      else if (element.getClientRects().length === 0) reason = "not rendered (including hidden inputs/display:none)";
      else {
        const style = getComputedStyle(element);
        if (style.visibility === "hidden" || style.visibility === "collapse") reason = "not visibly rendered";
        // A fully clipped sr-only control is keyboard-only until focused. It has
        // no visible pointer target; a tiny but visible control is NOT exempt.
        for (let ancestor = element; !reason && ancestor; ancestor = ancestor.parentElement) {
          const ancestorStyle = getComputedStyle(ancestor);
          if (ancestorStyle.clipPath === "inset(50%)" ||
              (["absolute", "fixed"].includes(ancestorStyle.position) &&
               ancestorStyle.clip === "rect(0px, 0px, 0px, 0px)")) {
            reason = "fully clipped non-pointer-visible control";
          }
        }
      }
      if (reason) excluded.push({ ...target, reason });
      else targets.push(target);
    }
    return {
      minimum,
      checked: targets.length,
      targets,
      excluded,
      violations: targets.filter((target) => target.width < minimum || target.height < minimum),
    };
  }, MINIMUM_TOUCH_TARGET);
}

export function assertTouchTargets(report) {
  if (report.checked === 0) throw new Error("Touch-target scan checked no rendered, enabled controls; refusing empty coverage");
  if (report.violations.length > 0) {
    throw new Error(`Touch targets below ${MINIMUM_TOUCH_TARGET}x${MINIMUM_TOUCH_TARGET} CSS px (${report.violations.length}):\n` +
      report.violations.map((target) => `${target.element} ${JSON.stringify(target.name)}: ${target.width}x${target.height}`).join("\n"));
  }
}
