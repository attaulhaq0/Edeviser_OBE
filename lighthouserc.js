/** @type {import('@lhci/cli').LighthouseConfig} */
module.exports = {
  ci: {
    collect: {
      staticDistDir: './dist',
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        // Simulate 4G connection for NFR-PERF-01 dashboard load target
        throttling: {
          rttMs: 150,
          throughputKbps: 1638.4,
          cpuSlowdownMultiplier: 4,
        },
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.85 }],
        'categories:seo': ['warn', { minScore: 0.9 }],

        // NFR-PERF-01: Dashboard load ≤ 1.5s (FCP + LCP targets)
        // FCP ≤ 1500ms ensures first meaningful paint within budget
        'first-contentful-paint': ['error', { maxNumericValue: 1500 }],
        // LCP ≤ 1500ms ensures largest element renders within budget
        'largest-contentful-paint': ['error', { maxNumericValue: 1500 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
