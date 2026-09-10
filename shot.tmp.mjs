import { chromium } from 'playwright';
const b = await chromium.launch();
for (const [name, vp] of [['d', { width: 1280, height: 900 }], ['m', { width: 390, height: 844 }]]) {
  const p = await b.newPage({ viewport: vp, deviceScaleFactor: 2 });
  await p.goto('http://localhost:3000/ar', { waitUntil: 'networkidle' });
  await p.locator('#options').scrollIntoViewIfNeeded();
  await p.locator('[role="radio"]').first().click();
  await p.waitForTimeout(1000);
  await p.locator('#pricing').screenshot({ path: `/tmp/pc-${name}.png` });
  await p.close();
}
await b.close();
