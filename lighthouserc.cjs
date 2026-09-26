/** Lighthouse CI: mobiel, drempel 0.95 op alle vier de categorieën. */
module.exports = {
  ci: {
    collect: {
      staticDistDir: './dist',
      url: [
        'http://localhost/index.html',
        'http://localhost/nfc-kaartenset.html',
        'http://localhost/live-reviewteller.html',
        'http://localhost/aanvragen.html',
        'http://localhost/voor/horeca.html',
      ],
      numberOfRuns: 1,
      settings: { formFactor: 'mobile', chromeFlags: '--headless=new --no-sandbox' }, // mobiel is standaard
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.95 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.95 }],
        'categories:seo': ['error', { minScore: 0.95 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.05 }],
      },
    },
    // Rapporten lokaal/als CI-artifact bewaren, niet publiek uploaden.
    upload: { target: 'filesystem', outputDir: './.lighthouseci/reports' },
  },
};
