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
      },
    },
    assert: {
      assertions: {
        // Performance budgets — fail CI on regressions
        'categories:performance': ['error', { minScore: 0.85 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.85 }],
        'categories:seo': ['error', { minScore: 0.9 }],

        // Core Web Vitals
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'max-potential-fid': ['error', { maxNumericValue: 100 }],
        'first-contentful-paint': ['error', { maxNumericValue: 2500 }],

        // Bundle size — 1.2MB gzipped budget (matches CI check)
        'total-byte-weight': ['error', { maxNumericValue: 1228800 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
