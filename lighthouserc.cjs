/**
 * Lighthouse CI: mobiel, drempel 0.95. Toegankelijkheid, best practices en SEO blokkeren;
 * snelheid (performance, LCP) is een waarschuwing, want die wisselt op GitHub-runners te veel (0,81–0,94 bij dezelfde code).
 * Snelheid lokaal meten: npm run lighthouse:local.
 */
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
        'categories:performance': ['warn', { minScore: 0.95 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.95 }],
        'categories:seo': ['error', { minScore: 0.95 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.05 }],
      },
    },
    // Rapporten lokaal/als CI-artifact bewaren, niet publiek uploaden.
    upload: { target: 'filesystem', outputDir: './.lighthouseci/reports' },
  },
};
