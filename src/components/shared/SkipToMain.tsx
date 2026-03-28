/**
 * Skip-to-main-content link for keyboard navigation.
 * Visually hidden until focused, then appears at the top of the viewport.
 */
const SkipToMain = () => (
  <a
    href="#main-content"
    className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:rounded-md focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
  >
    Skip to main content
  </a>
);

export default SkipToMain;
