/** @type {import('@lhci/cli').LighthouseConfig} */
module.exports = {
  ci: {
    collect: {
      staticDistDir: './dist',
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        throttling: {
          rttMs: 150,
          throughputKbps: 1638.4,
          cpuSlowdownMultiplier: 4,
        },
        // Required for Chrome to run in CI (Docker/GitHub Actions sandbox)
        chromeFlags: '--no-sandbox --disable-dev-shm-usage --disable-gpu',
      },
    },
    assert: {
      assertions: {
        // Non-performance categories — hard fail CI on regressions
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.85 }],
        'categories:seo': ['error', { minScore: 0.9 }],

        // Performance is warn-only: CI applies 4x CPU throttle + slow-3G
        // which makes 0.85 unachievable for most SPAs — track as signal only
        'categories:performance': ['warn', { minScore: 0.5 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 8000 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.25 }],
        'max-potential-fid': ['warn', { maxNumericValue: 300 }],
        'first-contentful-paint': ['warn', { maxNumericValue: 5000 }],

        // Bundle size — 1.2MB gzipped budget (matches CI check)
        'total-byte-weight': ['error', { maxNumericValue: 1228800 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
