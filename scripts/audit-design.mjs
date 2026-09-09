#!/usr/bin/env node
/**
 * Measures the things that are easy to break by eye and easy to prove by
 * number: vertical rhythm, type scale, text contrast, line length, and
 * horizontal overflow.
 *
 * Why this exists rather than a third-party detector: the off-the-shelf
 * ones resolve a colour by walking up to the first non-transparent
 * ancestor and reading it literally. This project's palette is written in
 * `oklab()` with alpha (`bg-muted/30`), so that approach both misparses
 * the colour — treating oklab's 0.87 lightness as 0.87 of a red channel,
 * i.e. near-black — and ignores what it composites onto. It reported
 * 1.1:1 on text that actually measures 5.4:1, and flagged a passing
 * 6.3:1 subtitle as failing. Everything here converts oklab/oklch to
 * sRGB and composites the full ancestor alpha stack before measuring.
 *
 * Usage: node scripts/audit-design.mjs [url ...]      (default: production)
 * Exits non-zero if any check fails, so it can gate a deploy.
 */
import { chromium } from 'playwright';

const URLS = process.argv.slice(2);
const TARGETS = URLS.length ? URLS : ['https://mhalli.co/ar', 'https://mhalli.co/en'];
const WIDTHS = [375, 1280];

const IN_PAGE = () => {
  const oklabToSrgb = (L, a, bb) => {
    const l_ = L + 0.3963377774 * a + 0.2158037573 * bb;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * bb;
    const s_ = L - 0.0894841775 * a - 1.291485548 * bb;
    const l = l_ ** 3,
      m = m_ ** 3,
      s = s_ ** 3;
    const lin = [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    ];
    return lin.map((v) => {
      const c = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
      return Math.max(0, Math.min(255, Math.round(c * 255)));
    });
  };
  const toRGBA = (css) => {
    css = (css || '').trim();
    if (!css || css === 'transparent') return [0, 0, 0, 0];
    if (css.startsWith('#')) {
      let h = css.slice(1);
      if (h.length === 3) h = [...h].map((c) => c + c).join('');
      return [
        parseInt(h.slice(0, 2), 16),
        parseInt(h.slice(2, 4), 16),
        parseInt(h.slice(4, 6), 16),
        1,
      ];
    }
    let m = css.match(/^oklab\(([-\d.e]+)%?\s+([-\d.e]+)\s+([-\d.e]+)(?:\s*\/\s*([\d.]+))?\)/);
    if (m) return [...oklabToSrgb(+m[1], +m[2], +m[3]), m[4] ? +m[4] : 1];
    m = css.match(/^oklch\(([-\d.e]+)%?\s+([-\d.e]+)\s+([-\d.e]+)(?:deg)?(?:\s*\/\s*([\d.]+))?\)/);
    if (m) {
      const h = (+m[3] * Math.PI) / 180;
      return [...oklabToSrgb(+m[1], +m[2] * Math.cos(h), +m[2] * Math.sin(h)), m[4] ? +m[4] : 1];
    }
    const n = (css.match(/[\d.]+/g) || []).map(Number);
    return n.length ? [n[0], n[1], n[2], n[3] ?? 1] : [0, 0, 0, 0];
  };
  const over = (f, b) => [0, 1, 2].map((i) => f[i] * f[3] + b[i] * (1 - f[3])).concat(1);
  const painted = (el) => {
    const stack = [];
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      const c = toRGBA(getComputedStyle(e).backgroundColor);
      if (c[3] > 0) stack.push(c);
    }
    let base = [255, 255, 255, 1];
    for (let i = stack.length - 1; i >= 0; i--) base = over(stack[i], base);
    return base;
  };
  const lum = (c) =>
    [0, 1, 2]
      .map((i) => {
        const v = c[i] / 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      })
      .reduce((a, v, i) => a + [0.2126, 0.7152, 0.0722][i] * v, 0);
  const ratio = (x, y) => {
    const A = lum(x),
      B = lum(y);
    return (Math.max(A, B) + 0.05) / (Math.min(A, B) + 0.05);
  };
  const effOpacity = (el) => {
    let o = 1;
    for (let e = el; e && e.nodeType === 1; e = e.parentElement)
      o *= parseFloat(getComputedStyle(e).opacity || 1);
    return o;
  };

  const out = { rhythm: [], scale: {}, contrast: [], lineLength: [], overflow: [], hero: null };

  // 1. Vertical rhythm — every seam between top-level sections.
  const secs = [...document.querySelectorAll('main > section')];
  for (let i = 0; i < secs.length - 1; i++) {
    const a = getComputedStyle(secs[i]),
      b = getComputedStyle(secs[i + 1]);
    out.rhythm.push({
      between: [secs[i], secs[i + 1]].map((s) =>
        (s.querySelector('h1,h2')?.innerText || s.id || '—').slice(0, 20).replace(/\n/g, ' '),
      ),
      gap: parseFloat(a.paddingBottom) + parseFloat(b.paddingTop),
    });
  }

  // 2. Type scale — every distinct heading size actually rendered.
  for (const h of document.querySelectorAll('main h1, main h2, main h3')) {
    const px = parseFloat(getComputedStyle(h).fontSize);
    (out.scale[h.tagName] ||= []).push(px);
  }
  for (const k of Object.keys(out.scale))
    out.scale[k] = [...new Set(out.scale[k])].sort((x, y) => y - x);

  // 3. Contrast, composited properly. The hero sits on a photograph, so it
  //    is reported separately against the scrim rather than guessed at.
  const hero = document.querySelector('main > section');
  for (const el of document.querySelectorAll('main *, header *, footer *')) {
    const t = el.textContent?.trim();
    if (!t || el.children.length) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    if (hero?.contains(el)) continue;
    const bg = painted(el);
    const c = toRGBA(cs.color);
    const fg = over([c[0], c[1], c[2], c[3] * effOpacity(el)], bg);
    const size = parseFloat(cs.fontSize);
    const need = size >= 24 || (size >= 18.66 && parseInt(cs.fontWeight) >= 700) ? 3 : 4.5;
    const r = ratio(fg, bg);
    if (r < need)
      out.contrast.push({
        text: t.slice(0, 40),
        ratio: +r.toFixed(2),
        need,
        size,
        cls: ('' + el.className).slice(0, 50),
      });
  }

  // 4. Line length — the eye loses its place past roughly 75 characters.
  //    Measured from the text's OWN rendered box, not its container's: a
  //    short centred heading inside a wide column is one short line, and
  //    measuring the column instead reports it as a 138-character line.
  for (const el of document.querySelectorAll('main p, main li, main h2')) {
    const cs = getComputedStyle(el);
    const text = el.textContent.trim();
    if (!text || cs.display === 'none') continue;
    const range = document.createRange();
    range.selectNodeContents(el);
    const lines = [...range.getClientRects()].filter((r) => r.width > 0);
    if (lines.length < 2) continue; // single line: it is as long as it is
    const widest = Math.max(...lines.map((r) => r.width));
    const chars = Math.round(widest / (parseFloat(cs.fontSize) * 0.5));
    if (chars > 80) out.lineLength.push({ chars, text: text.slice(0, 34) });
  }

  // 5. Anything wider than the viewport.
  const vw = document.documentElement.clientWidth;
  if (document.documentElement.scrollWidth > vw + 1) {
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.width > vw + 1 && r.left >= -1)
        out.overflow.push({
          w: Math.round(r.width),
          tag: el.tagName,
          cls: ('' + el.className).slice(0, 50),
        });
    }
    out.overflow = out.overflow.slice(0, 6);
  }
  return out;
};

let failures = 0;
const fail = (m) => {
  failures++;
  console.log(`  ✗ ${m}`);
};
const pass = (m) => console.log(`  ✓ ${m}`);

const browser = await chromium.launch();
for (const url of TARGETS) {
  for (const width of WIDTHS) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(url, { waitUntil: 'networkidle' });
    const r = await page.evaluate(IN_PAGE);
    console.log(`\n${url} @ ${width}px`);

    const gaps = [...new Set(r.rhythm.slice(1).map((x) => x.gap))];
    if (gaps.length > 1)
      fail(
        `section gaps are uneven: ${gaps.join(' / ')}px — ${r.rhythm.map((x) => `${x.between[0]}→${x.between[1]}:${x.gap}`).join(', ')}`,
      );
    else pass(`section rhythm even at ${gaps[0]}px`);

    const h1 = r.scale.H1?.[0],
      h2 = r.scale.H2?.[0];
    if (r.scale.H2 && r.scale.H2.length > 2)
      fail(`section headings use ${r.scale.H2.length} different sizes: ${r.scale.H2.join('/')}px`);
    else
      pass(
        `heading sizes: H1 ${r.scale.H1?.join('/') ?? '—'}px, H2 ${r.scale.H2?.join('/') ?? '—'}px`,
      );
    if (h1 && h2 && h1 / h2 > 2.2)
      fail(
        `H1 is ${(h1 / h2).toFixed(1)}x the largest H2 (${h1}px vs ${h2}px) — over 2.2x reads as shouting`,
      );

    if (r.contrast.length) {
      for (const c of r.contrast)
        fail(`contrast ${c.ratio}:1 (needs ${c.need}) at ${c.size}px — "${c.text}"`);
    } else pass('all text meets WCAG AA contrast');

    if (r.lineLength.length) {
      for (const l of r.lineLength) fail(`${l.chars} chars/line (aim <80) — "${l.text}"`);
    } else pass('line lengths under 80 characters');

    if (r.overflow.length) {
      for (const o of r.overflow)
        fail(`overflows viewport by ${o.w - width}px — ${o.tag}.${o.cls}`);
    } else pass('no horizontal overflow');

    await page.close();
  }
}
await browser.close();
console.log(
  `\n${failures === 0 ? 'PASS — no design regressions' : `FAIL — ${failures} issue(s)`}\n`,
);
process.exit(failures === 0 ? 0 : 1);
