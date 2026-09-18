import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './test/e2e',
  // the CSS is the unit under test; parallel pages are independent
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://localhost:4173' },
  // one baseline per project, so a desktop diff never masks a mobile one
  snapshotPathTemplate: '{testDir}/__screenshots__/{projectName}/{arg}{ext}',
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    // Desktop Chrome with a 375px viewport on purpose: leicht's breakpoints are width-based, and
    // the point is the width, not touch emulation.
    { name: 'mobile', use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 812 } } },
  ],
  webServer: {
    command: 'node test/server.mjs',
    url: 'http://localhost:4173/dist/leicht.css',
    reuseExistingServer: !process.env.CI,
  },
});
