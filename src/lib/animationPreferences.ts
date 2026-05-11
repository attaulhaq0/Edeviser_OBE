/**
 * Determines whether animations should be reduced.
 * Returns true if either the OS-level prefers-reduced-motion is set
 * OR the user's reduced_animations preference is enabled.
 */
export const shouldReduceAnimations = (userPref: boolean): boolean => {
  const osPref =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;
  return osPref || userPref;
};

/**
 * Toggles the `reduce-animations` CSS class on the document root.
 */
export const applyAnimationReduction = (reduce: boolean): void => {
  document.documentElement.classList.toggle("reduce-animations", reduce);
};
