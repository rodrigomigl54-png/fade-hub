// Automatski test sajta (Playwright + Chromium).
// Pokretanje:  npx playwright@1.56.1 install chromium   (samo prvi put)
//              node tests/run-tests.mjs
// Skript sam pokreće lokalni server nad folderom projekta.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const BASE = `http://127.0.0.1:${server.address().port}/`;

const results = [];
const check = (id, device, name, pass, info = '') => {
  results.push({ id, device, name, result: pass ? 'PASS' : 'FAIL', info });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${id.padEnd(4)} ${device.padEnd(8)} ${name}${info ? '  — ' + info : ''}`);
};

const devices = [
  { name: 'desktop', viewport: { width: 1440, height: 900 } },
  { name: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  { name: 'small', viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true }
];

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

// Sledeći radni dan (ne nedelja) i sledeća nedelja, kao YYYY-MM-DD
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const nextDay = (pred) => { const d = new Date(); d.setDate(d.getDate() + 1); while (!pred(d)) d.setDate(d.getDate() + 1); return d; };
const workday = nextDay((d) => d.getDay() !== 0);
const sunday = nextDay((d) => d.getDay() === 0);
const yesterday = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d; })();

for (const dev of devices) {
  const ctx = await browser.newContext({ viewport: dev.viewport, isMobile: dev.isMobile, hasTouch: dev.hasTouch });
  const page = await ctx.newPage();
  const consoleErrors = [];
  const failedLocal = [];
  page.on('pageerror', (e) => consoleErrors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) consoleErrors.push(m.text()); });
  page.on('response', (r) => { if (r.url().startsWith(BASE) && r.status() >= 400 && !/assets\/(gallery\/rad-\d|logo)/.test(r.url())) failedLocal.push(r.url()); });
  await page.addInitScript(() => {
    window.__opened = [];
    window.open = (url) => { window.__opened.push(url); return window.__blockPopup ? null : {}; };
  });

  // A1: intro se sam završi
  await page.goto(BASE);
  await page.waitForSelector('#intro.is-logo', { timeout: 4000 });
  await page.waitForTimeout(1000); // logo je u fazi zadržavanja (punog intenziteta)
  const logoBox = await page.locator('.intro-logo').boundingBox();
  const vw = dev.viewport.width, vh = dev.viewport.height;
  const minW = vw >= 1440 ? 400 : 240;
  const offX = Math.abs(logoBox.x + logoBox.width / 2 - vw / 2);
  const offY = Math.abs(logoBox.y + logoBox.height / 2 - vh / 2);
  check('A1b', dev.name, 'Intro logo dovoljno velik i centriran', logoBox.width >= minW && offX <= 2 && offY <= 2,
    `širina ${Math.round(logoBox.width)}px, odstupanje x=${offX.toFixed(1)} y=${offY.toFixed(1)}`);
  await page.waitForFunction(() => document.body.classList.contains('is-ready') && document.getElementById('intro').classList.contains('is-gone'), null, { timeout: 6000 });
  check('A1', dev.name, 'Intro se sam završava', true);

  // Skip dugme (nova sesija)
  const p2 = await ctx.browser().newPage({ viewport: dev.viewport });
  await p2.goto(BASE); await p2.click('#introSkip');
  check('A1s', dev.name, '"Preskoči" odmah gasi intro', await p2.evaluate(() => document.getElementById('intro').classList.contains('is-gone')));
  await p2.close();

  // A2: Zakaži dugmad vode do forme
  const bookSel = dev.name === 'desktop' ? ['.nav .js-book', '.hero .js-book', '.footer .js-book'] : ['.hero .js-book', '.footer .js-book', '.sticky-cta'];
  for (const sel of bookSel) {
    await page.evaluate(() => window.scrollTo(0, 0));
    if (sel === '.sticky-cta') { await page.evaluate(() => window.scrollTo(0, innerHeight * 1.2)); await page.waitForTimeout(600); }
    if (sel === '.footer .js-book') await page.locator(sel).scrollIntoViewIfNeeded();
    await page.click(sel);
    await page.waitForTimeout(1300);
    const ok = await page.evaluate(() => {
      const f = document.getElementById('name');
      const r = f.getBoundingClientRect();
      const nav = document.getElementById('nav').getBoundingClientRect();
      return document.activeElement === f && r.top >= nav.bottom - 1 && r.bottom <= innerHeight;
    });
    check('A2', dev.name, `Zakaži (${sel}) → forma vidljiva, fokus na imenu`, ok);
  }
  if (dev.name !== 'desktop') {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.click('#burger'); await page.waitForTimeout(800);
    await page.click('#mobileMenu .js-book'); await page.waitForTimeout(1300);
    check('A2', dev.name, 'Zakaži iz mobilnog menija → forma', await page.evaluate(() => document.activeElement.id === 'name' && !document.getElementById('mobileMenu').classList.contains('is-open')));
  }

  // A3: tel linkovi
  const tels = await page.$$eval('a[href^="tel:"]', (as) => as.map((a) => a.getAttribute('href')));
  check('A3', dev.name, 'Svi tel: linkovi = +381638584999', tels.length > 0 && tels.every((t) => t === 'tel:+381638584999'), `${tels.length} linkova`);

  // A4: select opcije
  const opts = await page.$$eval('#service option', (o) => o.filter((x) => x.value).map((x) => x.textContent));
  check('A4', dev.name, 'Select ima 5 usluga', opts.length === 5 && opts.some((t) => t.includes('voskom (500 RSD)')), opts.join(' | '));

  // A7: sticky CTA ne prekriva submit
  if (dev.name !== 'desktop') {
    await page.locator('#bookingSubmit').scrollIntoViewIfNeeded(); await page.waitForTimeout(700);
    const covered = await page.evaluate(() => {
      const cta = document.querySelector('.sticky-cta');
      if (!cta.classList.contains('is-visible')) return false;
      const a = cta.getBoundingClientRect(), b = document.getElementById('bookingSubmit').getBoundingClientRect();
      return !(a.bottom < b.top || a.top > b.bottom);
    });
    check('A7', dev.name, 'Sticky dugme ne prekriva "Pošalji zahtev"', !covered);

    // A8: meni linkovi
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.click('#burger'); await page.waitForTimeout(800);
    const hrefs = await page.$$eval('#mobileMenu li a', (as) => as.map((a) => a.getAttribute('href')));
    await page.click('#mobileMenu li a[href="#galerija"]'); await page.waitForTimeout(1200);
    const closed = await page.evaluate(() => !document.getElementById('mobileMenu').classList.contains('is-open'));
    check('A8', dev.name, 'Mobilni meni: 5 linkova, zatvara se', hrefs.join() === '#usluge,#galerija,#o-nama,#utisci,#kontakt' && closed);
  }

  // B1: prazna forma
  const reset = () => page.evaluate(() => { document.getElementById('bookingForm').reset(); window.__opened = []; document.querySelectorAll('.field.has-error').forEach((f) => f.classList.remove('has-error')); });
  await reset();
  await page.locator('#bookingSubmit').scrollIntoViewIfNeeded();
  await page.click('#bookingSubmit');
  const b1 = await page.evaluate(() => ({ opened: window.__opened.length, errs: document.querySelectorAll('#bookingForm .field.has-error').length, focus: document.activeElement.id }));
  check('B1', dev.name, 'Prazna forma blokirana, 4 greške, fokus na ime', b1.opened === 0 && b1.errs === 4 && b1.focus === 'name', JSON.stringify(b1));

  const fill = async (o) => {
    await reset();
    await page.fill('#name', o.name ?? 'Marko Marković');
    await page.fill('#phone', o.phone ?? '063 123 4567');
    await page.selectOption('#service', o.service ?? 'fade');
    await page.fill('#date', o.date ?? iso(workday));
    await page.fill('#note', o.note ?? '');
    await page.evaluate(() => { document.getElementById('bookingSubmit').disabled = false; });
    await page.waitForTimeout(2100); // čeka da prođe zaključavanje od 2s
    await page.click('#bookingSubmit');
    return page.evaluate(() => window.__opened.slice());
  };

  // B2 + A5
  check('B2', dev.name, 'Telefon sa slovima odbijen', (await fill({ phone: '06abc' })).length === 0);
  check('B2', dev.name, 'Prekratak telefon odbijen', (await fill({ phone: '0631' })).length === 0);
  check('A5', dev.name, 'Prošli datum odbijen', (await fill({ date: iso(yesterday) })).length === 0);
  const sun = await fill({ date: iso(sunday) });
  const sunMsg = await page.locator('#date').locator('xpath=..').locator('.error').textContent();
  check('A5', dev.name, 'Nedelja odbijena sa porukom', sun.length === 0 && /nedeljom/.test(sunMsg), sunMsg);

  // B3: svih 5 usluga
  const names = { fade: 'Fade (1200 RSD)', klasicno: 'Klasično šišanje (800 RSD)', 'brada-brkovi': 'Brada i brkovi (600 RSD)', pranje: 'Pranje kose (250 RSD)', vosak: 'Skidanje dlaka sa lica i ušiju voskom (500 RSD)' };
  const [Y, M, D] = iso(workday).split('-');
  for (const [val, label] of Object.entries(names)) {
    const urls = await fill({ service: val, note: 'Posle 17h' });
    const u = urls[0] || '';
    const text = decodeURIComponent(u.split('?text=')[1] || '');
    check('B3', dev.name, `WhatsApp poruka za "${val}"`,
      u.startsWith('https://wa.me/381638584999?text=') && text.includes('Marko Marković') && text.includes('063 123 4567') && text.includes(`Usluga: ${label}`) && text.includes(`Datum: ${D}.${M}.${Y}.`) && text.includes('Napomena: Posle 17h'));
  }

  // B4: specijalni znakovi
  const special = `A&B #1 +2 50% ?x=y "q" 'z' čćšžđ ČĆŠŽĐ 😀\nnovi red <script>alert(1)</script>`;
  const urls4 = await fill({ name: 'Đorđe & Šćepan #1', note: special });
  const text4 = decodeURIComponent((urls4[0] || '').split('?text=')[1] || '');
  check('B4', dev.name, 'Specijalni znakovi očuvani', text4.includes('Ime: Đorđe & Šćepan #1') && text4.includes(`Napomena: ${special}`));

  // B5: duga napomena
  await reset();
  await page.fill('#note', 'x'.repeat(650));
  const b5 = await page.evaluate(() => [document.getElementById('note').value.length, document.getElementById('noteCounter').textContent]);
  check('B5', dev.name, 'Napomena ograničena na 300', b5[0] === 300 && b5[1] === '300 / 300', b5.join(' '));

  // B6: blokiran popup → fallback link
  await page.evaluate(() => { window.__blockPopup = true; });
  await fill({});
  const fb = await page.locator('#bookingNotice a').getAttribute('href');
  check('B6', dev.name, 'Blokiran popup → link "Klikni ovde za WhatsApp"', !!fb && fb.startsWith('https://wa.me/381638584999'));
  await page.evaluate(() => { window.__blockPopup = false; });

  // B7: dupli klik
  await reset();
  await page.fill('#name', 'Ana'); await page.fill('#phone', '0631234567'); await page.selectOption('#service', 'pranje'); await page.fill('#date', iso(workday));
  await page.evaluate(() => { const b = document.getElementById('bookingSubmit'); b.disabled = false; });
  await page.waitForTimeout(2100);
  await page.evaluate(() => { const f = document.getElementById('bookingForm'); f.requestSubmit(); f.requestSubmit(); });
  const b7 = await page.evaluate(() => [window.__opened.length, document.getElementById('bookingSubmit').disabled, !document.getElementById('bookingNotice').hidden]);
  check('B7', dev.name, 'Dupli klik: 1 otvaranje, dugme zaključano, potvrda vidljiva', b7[0] === 1 && b7[1] === true && b7[2] === true, JSON.stringify(b7));

  // C1: horizontalni scroll
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check('C1', dev.name, 'Bez horizontalnog scrolla', overflow <= 0, `${overflow}px`);

  // C2: unutrašnji linkovi
  const dead = await page.$$eval('a[href^="#"]', (as) => as.map((a) => a.getAttribute('href')).filter((h) => h.length > 1 && !document.querySelector(h)));
  check('C2', dev.name, 'Nema mrtvih # linkova', dead.length === 0, dead.join(','));

  // C3: alt tekstovi
  const noAlt = await page.$$eval('img', (i) => i.filter((x) => !x.hasAttribute('alt')).length);
  check('C3', dev.name, 'Sve slike imaju alt', noAlt === 0);

  // C4: galerija
  await page.locator('#galerija').scrollIntoViewIfNeeded();
  await page.click('#carouselDots button:nth-child(1)'); await page.waitForTimeout(900);
  await page.click('#nextBtn'); await page.waitForTimeout(800);
  const c1 = await page.textContent('#carouselCounter');
  await page.focus('#carousel'); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(800);
  const c2 = await page.textContent('#carouselCounter');
  await page.click('#carouselDots button:nth-child(8)'); await page.waitForTimeout(900);
  const c3 = await page.textContent('#carouselCounter');
  await page.click('.slide.is-active'); await page.waitForTimeout(300);
  const lbOpen = await page.evaluate(() => !document.getElementById('lightbox').hidden);
  await page.keyboard.press('Escape');
  const lbClosed = await page.evaluate(() => document.getElementById('lightbox').hidden);
  check('C4', dev.name, 'Galerija: strelica, tastatura, tačkice, lightbox, Esc', c1 === '02 / 08' && c2 === '03 / 08' && c3 === '08 / 08' && lbOpen && lbClosed, `${c1} ${c2} ${c3}`);

  // C5: utisci
  await page.locator('#reviewForm').scrollIntoViewIfNeeded();
  await page.evaluate(() => { window.__opened = []; });
  await page.fill('#reviewMsg', 'kratko');
  await page.click('#reviewForm button[type=submit]');
  const v1 = await page.evaluate(() => [document.getElementById('ratingError').textContent, document.getElementById('reviewMsgError').textContent, window.__opened.length]);
  await page.focus('#stars button:first-child'); for (let k = 0; k < 5; k++) await page.keyboard.press('ArrowRight');
  await page.fill('#reviewMsg', 'Odlično šišanje <b>top</b>, preporuka!');
  await page.click('#reviewForm button[type=submit]');
  await page.waitForTimeout(300);
  const v2 = await page.evaluate(() => ({ opened: window.__opened[0] || '', card: document.querySelector('#testimonialTrack .testimonial p')?.innerHTML || '', stars: document.querySelector('#testimonialTrack .rating')?.textContent }));
  check('C5', dev.name, 'Utisci: validacija, zvezdice tastaturom, escape HTML, Google link',
    v1[0] && v1[1] && v1[2] === 0 && v2.opened.includes('google.com') && v2.card.includes('&lt;b&gt;') && v2.stars === '★★★★★', JSON.stringify({ v1, ...v2 }));

  // C7: placeholderi
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8') + fs.readFileSync(path.join(ROOT, 'assets/js/main.js'), 'utf8');
  const ph = html.match(/\[UNESI[^\]]*\]/g) || [];
  check('C7', dev.name, 'Jedini [UNESI] je Google Place ID', ph.every((p) => p === '[UNESI GOOGLE PLACE ID]'), ph.join(', '));

  // B10
  check('B10', dev.name, 'Bez JS grešaka i lokalnih 404 (osim slika koje se tek dodaju)', consoleErrors.length === 0 && failedLocal.length === 0, [...consoleErrors, ...failedLocal].join(' | '));

  await ctx.close();
}

// C6: reduced motion
const rm = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
const rp = await rm.newPage();
await rp.goto(BASE);
await rp.waitForFunction(() => document.body.classList.contains('is-ready'), null, { timeout: 3000 });
const anim = await rp.evaluate(() => getComputedStyle(document.querySelector('.pole-stripes')).animationName);
check('C6', 'desktop', 'prefers-reduced-motion: stubovi stoje, intro kratak', anim === 'none', `animation=${anim}`);
await rm.close();

await browser.close();
server.close();
const failed = results.filter((r) => r.result === 'FAIL');
fs.writeFileSync(path.join(ROOT, 'tests/results.json'), JSON.stringify(results, null, 2));
console.log(`\n${results.length - failed.length}/${results.length} PASS`);
process.exit(failed.length ? 1 : 0);
