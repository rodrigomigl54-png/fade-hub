/* ==========================================================
   Fade Hub 021 — skripte
   ========================================================== */

// ---- PODEŠAVANJA (menjaj ovde) ----
const WHATSAPP_NUMBER = '381638584999';      // broj salona za WhatsApp (bez + i razmaka)
const GOOGLE_PLACE_ID = '[UNESI GOOGLE PLACE ID]'; // Google Business Place ID za link "Napiši recenziju"
const SERVICE_NAMES = {
  'fade': 'Fade (1200 RSD)',
  'klasicno': 'Klasično šišanje (800 RSD)',
  'brada-brkovi': 'Brada i brkovi (600 RSD)',
  'pranje': 'Pranje kose (250 RSD)',
  'vosak': 'Skidanje dlaka sa lica i ušiju voskom (500 RSD)'
};

(function () {
  'use strict';

  const root = document.documentElement;
  const body = document.body;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  const storage = {
    get(store, key) { try { return window[store].getItem(key); } catch (e) { return null; } },
    set(store, key, val) { try { window[store].setItem(key, val); } catch (e) { /* privatni režim */ } }
  };

  const escapeHTML = (str) => String(str).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  // ---------- Slike koje još nisu dodate: bez slomljene ikonice ----------
  $$('img').forEach((img) => {
    const onError = () => {
      const fallback = img.getAttribute('data-fallback');
      if (fallback && img.getAttribute('src') !== fallback) { img.src = fallback; return; }
      img.classList.add('is-missing');
      const slide = img.closest('.slide');
      if (slide) { slide.classList.add('is-empty'); slide.setAttribute('data-label', 'Slika uskoro'); }
    };
    if (img.complete && img.naturalWidth === 0 && img.getAttribute('src') && !img.src.startsWith('data:')) onError();
    img.addEventListener('error', onError);
  });

  $('#year').textContent = new Date().getFullYear();

  // ==========================================================
  // INTRO
  // ==========================================================
  const intro = $('#intro');
  let introDone = false;

  function finishIntro() {
    if (introDone) return;
    introDone = true;
    storage.set('sessionStorage', 'fh_intro_seen', '1');
    if (intro) intro.classList.add('is-gone');
    body.classList.remove('is-locked');
    body.classList.add('is-ready');
  }

  function runIntro() {
    if (!intro || root.classList.contains('intro-seen')) { finishIntro(); return; }
    body.classList.add('is-locked');

    const countEl = $('#introCount');
    const timers = [];
    const later = (fn, ms) => timers.push(setTimeout(fn, ms));
    const skip = () => { timers.forEach(clearTimeout); finishIntro(); };
    $('#introSkip').addEventListener('click', skip);
    document.addEventListener('keydown', function onKey(e) {
      if (e.key === 'Escape' && !introDone) { skip(); document.removeEventListener('keydown', onKey); }
    });

    if (reducedMotion) {
      intro.classList.add('is-logo');
      countEl.textContent = '100';
      later(skip, 900);
      return;
    }

    // 1) brojač 000 → 100 (~1.2s)
    const start = performance.now();
    const COUNT_MS = 1200;
    (function tick(now) {
      const p = Math.min(1, (now - start) / COUNT_MS);
      countEl.textContent = String(Math.round(p * 100)).padStart(3, '0');
      if (p < 1 && !introDone) requestAnimationFrame(tick);
    })(start);

    // 2) linija-sečivo → 3) logo iskoči i ostaje ≥1s → 4) rez i razmicanje → 5) logo se seli u nav
    later(() => intro.classList.add('is-blade'), 1100);
    later(() => intro.classList.add('is-logo'), 1700);
    later(() => {
      intro.classList.add('is-splitting');
      body.classList.add('is-ready');
      // Logo "leti" u navigaciju tek kad su polovine razmaknute ~30%+
      later(() => {
        const logo = $('.intro-logo');
        const target = $('.nav-logo img');
        if (logo && target) {
          const a = logo.getBoundingClientRect();
          const b = target.getBoundingClientRect();
          const scale = b.width / a.width;
          const dx = (b.left + b.width / 2) - (a.left + a.width / 2);
          const dy = (b.top + b.height / 2) - (a.top + a.height / 2);
          intro.classList.add('is-flying');
          logo.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
          logo.style.opacity = '0';
        }
      }, 380);
    }, 3300); // logo vidljiv punim intenzitetom od ~2.6s do 3.3s+0.38s
    later(finishIntro, 4600);
  }
  runIntro();

  // ==========================================================
  // NAV + MOBILNI MENI
  // ==========================================================
  const nav = $('#nav');
  const stickyCta = $('.sticky-cta');
  const heroBg = $('.hero-bg');
  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle('is-scrolled', y > 40);
    if (stickyCta) stickyCta.classList.toggle('is-visible', y > window.innerHeight * 0.6 && !isNearForm());
    if (heroBg && !reducedMotion && y < window.innerHeight * 1.2) heroBg.style.transform = `translate3d(0, ${y * 0.25}px, 0)`;
  };
  const contactSection = $('#kontakt');
  function isNearForm() {
    const r = contactSection.getBoundingClientRect();
    return r.top < window.innerHeight && r.bottom > 0;
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const burger = $('#burger');
  const menu = $('#mobileMenu');
  const setMenu = (open) => {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Zatvori meni' : 'Otvori meni');
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    body.classList.toggle('is-locked', open);
  };
  burger.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));
  $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.classList.contains('is-open')) setMenu(false); });

  // Svako "Zakaži termin" dugme vodi do forme i fokusira prvo polje
  $$('.js-book').forEach((btn) => btn.addEventListener('click', (e) => {
    e.preventDefault();
    if (menu.classList.contains('is-open')) setMenu(false);
    const form = $('#bookingForm');
    form.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    setTimeout(() => $('#name').focus({ preventScroll: true }), reducedMotion ? 0 : 600);
    history.replaceState(null, '', '#kontakt');
  }));

  // ==========================================================
  // REVEAL PRI SKROLU
  // ==========================================================
  if ('IntersectionObserver' in window && !reducedMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    $$('.reveal').forEach((el) => io.observe(el));
  } else {
    $$('.reveal').forEach((el) => el.classList.add('is-in'));
  }

  // ==========================================================
  // KURSOR + MAGNETIC + HERO TILT
  // ==========================================================
  if (finePointer && !reducedMotion) {
    const cursor = $('#cursor');
    let cx = 0, cy = 0, tx = 0, ty = 0;
    document.addEventListener('mousemove', (e) => { tx = e.clientX; ty = e.clientY; root.classList.add('has-cursor'); }, { passive: true });
    document.addEventListener('mouseleave', () => root.classList.remove('has-cursor'));
    (function loop() {
      cx += (tx - cx) * 0.22; cy += (ty - cy) * 0.22;
      cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      requestAnimationFrame(loop);
    })();
    $$('a, button, input, select, textarea, .slide').forEach((el) => {
      el.addEventListener('mouseenter', () => cursor.classList.add('is-hover'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('is-hover'));
    });
    $$('.magnetic').forEach((el) => {
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - (r.left + r.width / 2);
        const y = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
    const title = $('#heroTitle');
    $('.hero').addEventListener('mousemove', (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      title.style.transform = `rotateY(${x * 6}deg) rotateX(${-y * 5}deg) skewX(${x * -1.5}deg)`;
    });
    $('.hero').addEventListener('mouseleave', () => { title.style.transform = ''; });
  }

  // ==========================================================
  // GALERIJA — CAROUSEL + LIGHTBOX
  // ==========================================================
  const track = $('#carouselTrack');
  const slides = $$('.slide', track);
  const dotsWrap = $('#carouselDots');
  const counter = $('#carouselCounter');
  const pad = (n) => String(n).padStart(2, '0');
  let current = 0;

  slides.forEach((s, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.setAttribute('role', 'tab');
    dot.setAttribute('aria-label', `Fotografija ${i + 1}`);
    dot.addEventListener('click', () => goTo(i));
    dotsWrap.appendChild(dot);
  });
  const dots = $$('button', dotsWrap);

  function setActive(i) {
    current = i;
    slides.forEach((s, j) => s.classList.toggle('is-active', j === i));
    dots.forEach((d, j) => d.setAttribute('aria-selected', String(j === i)));
    counter.textContent = `${pad(i + 1)} / ${pad(slides.length)}`;
  }
  function goTo(i) {
    const n = (i + slides.length) % slides.length;
    const s = slides[n];
    track.scrollTo({ left: s.offsetLeft - (track.clientWidth - s.clientWidth) / 2, behavior: reducedMotion ? 'auto' : 'smooth' });
    setActive(n);
  }
  function nearest() {
    const mid = track.scrollLeft + track.clientWidth / 2;
    let best = 0, dist = Infinity;
    slides.forEach((s, i) => {
      const d = Math.abs(s.offsetLeft + s.clientWidth / 2 - mid);
      if (d < dist) { dist = d; best = i; }
    });
    return best;
  }
  let scrollRaf;
  track.addEventListener('scroll', () => {
    cancelAnimationFrame(scrollRaf);
    scrollRaf = requestAnimationFrame(() => { const n = nearest(); if (n !== current) setActive(n); });
  }, { passive: true });
  $('#prevBtn').addEventListener('click', () => goTo(current - 1));
  $('#nextBtn').addEventListener('click', () => goTo(current + 1));
  $('#carousel').addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(current - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(current + 1); }
  });
  setActive(0);

  // Povlačenje mišem (prst radi preko nativnog skrola)
  let dragging = false, dragMoved = false, startX = 0, startLeft = 0;
  track.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') return;
    dragging = true; dragMoved = false; startX = e.clientX; startLeft = track.scrollLeft;
    track.classList.add('is-dragging');
  });
  window.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 5) dragMoved = true;
    track.scrollLeft = startLeft - dx;
  });
  window.addEventListener('pointerup', () => {
    if (!dragging) return;
    dragging = false;
    track.classList.remove('is-dragging');
    goTo(nearest());
  });

  // Blago automatsko listanje — staje na hover/dodir/fokus
  let autoTimer = null, paused = false;
  const startAuto = () => {
    if (reducedMotion || autoTimer) return;
    autoTimer = setInterval(() => { if (!paused && !document.hidden && !lightboxOpen()) goTo(current + 1); }, 5000);
  };
  ['mouseenter', 'touchstart', 'pointerdown', 'focusin'].forEach((ev) => $('#galerija').addEventListener(ev, () => { paused = true; }, { passive: true }));
  ['mouseleave', 'focusout'].forEach((ev) => $('#galerija').addEventListener(ev, () => { paused = false; }));
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((en) => { if (en[0].isIntersecting) startAuto(); }, { threshold: 0.3 }).observe(track);
  }

  // Lightbox
  const lb = $('#lightbox');
  const lbImg = $('#lbImg');
  let lbIndex = 0, lastFocus = null;
  const lightboxOpen = () => !lb.hidden;
  function showLb(i) {
    lbIndex = (i + slides.length) % slides.length;
    const img = $('img', slides[lbIndex]);
    lbImg.src = img.classList.contains('is-missing') ? 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==' : img.currentSrc || img.src;
    lbImg.alt = img.alt;
  }
  function openLb(i) {
    lastFocus = document.activeElement;
    showLb(i);
    lb.hidden = false;
    body.classList.add('is-locked');
    $('#lbClose').focus();
  }
  function closeLb() {
    lb.hidden = true;
    body.classList.remove('is-locked');
    if (lastFocus) lastFocus.focus();
  }
  slides.forEach((s, i) => s.addEventListener('click', () => {
    if (dragMoved) return;
    if (i !== current) { goTo(i); return; }
    openLb(i);
  }));
  $('#lbClose').addEventListener('click', closeLb);
  $('#lbPrev').addEventListener('click', () => showLb(lbIndex - 1));
  $('#lbNext').addEventListener('click', () => showLb(lbIndex + 1));
  lb.addEventListener('click', (e) => { if (e.target === lb) closeLb(); });
  document.addEventListener('keydown', (e) => {
    if (!lightboxOpen()) return;
    if (e.key === 'Escape') closeLb();
    if (e.key === 'ArrowLeft') showLb(lbIndex - 1);
    if (e.key === 'ArrowRight') showLb(lbIndex + 1);
  });
  let lbTouchX = null;
  lb.addEventListener('touchstart', (e) => { lbTouchX = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', (e) => {
    if (lbTouchX === null) return;
    const dx = e.changedTouches[0].clientX - lbTouchX;
    if (Math.abs(dx) > 50) showLb(lbIndex + (dx < 0 ? 1 : -1));
    lbTouchX = null;
  });

  // ==========================================================
  // O NAMA — MAKAZE + LINIJA KOJA SE PRESECA
  // ==========================================================
  const scissors = $('#scissors');
  const cutLine = $('#cutLine');
  if (!reducedMotion && 'IntersectionObserver' in window) {
    new IntersectionObserver((en, obs) => {
      if (!en[0].isIntersecting) return;
      obs.disconnect();
      scissors.classList.add('is-cutting');
      setTimeout(() => { scissors.classList.remove('is-cutting'); scissors.classList.add('is-idle'); }, 1600);
    }, { threshold: 0.4 }).observe(scissors);

    const about = $('#o-nama');
    const updateCut = () => {
      const r = about.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (window.innerHeight - r.top) / (window.innerHeight * 0.8)));
      cutLine.style.setProperty('--cut', p.toFixed(3));
    };
    window.addEventListener('scroll', updateCut, { passive: true });
    updateCut();
  }

  // ==========================================================
  // UTISCI — OCENA + PORUKA (+ Google recenzija)
  // ==========================================================
  const REVIEWS_KEY = 'fh_reviews';
  const reviewTrack = $('#testimonialTrack');
  const emptyMsg = $('#testimonialsEmpty');
  const starBtns = $$('#stars button');
  let rating = 0;

  function paintStars(n, cls) { starBtns.forEach((b, i) => b.classList.toggle(cls, i < n)); }
  function setRating(n) {
    rating = n;
    paintStars(n, 'is-on');
    starBtns.forEach((b, i) => {
      b.setAttribute('aria-checked', String(i + 1 === n));
      b.tabIndex = (i + 1 === (n || 1)) ? 0 : -1;
    });
    $('#ratingError').textContent = '';
  }
  starBtns.forEach((b, i) => {
    b.addEventListener('click', () => setRating(i + 1));
    b.addEventListener('mouseenter', () => paintStars(i + 1, 'is-hover'));
    b.addEventListener('mouseleave', () => paintStars(0, 'is-hover'));
    b.addEventListener('keydown', (e) => {
      let n = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') n = Math.min(5, (rating || 0) + 1);
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') n = Math.max(1, (rating || 2) - 1);
      if (e.key === 'Home') n = 1;
      if (e.key === 'End') n = 5;
      if (n) { e.preventDefault(); setRating(n); starBtns[n - 1].focus(); }
    });
  });
  setRating(0);

  function renderReview(r) {
    const card = document.createElement('article');
    card.className = 'testimonial';
    card.innerHTML =
      `<div class="rating" aria-label="Ocena ${r.rating} od 5">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>` +
      `<p>${escapeHTML(r.message)}</p>` +
      `<footer>${escapeHTML(r.name || 'Klijent')} · ${escapeHTML(r.date)}</footer>`;
    reviewTrack.insertBefore(card, reviewTrack.firstChild);
    emptyMsg.hidden = true;
  }
  function loadReviews() {
    let list = [];
    try { list = JSON.parse(storage.get('localStorage', REVIEWS_KEY) || '[]'); } catch (e) { list = []; }
    if (!Array.isArray(list)) list = [];
    list.filter((r) => r && typeof r.message === 'string' && r.rating >= 1 && r.rating <= 5).forEach(renderReview);
    return list;
  }
  const savedReviews = loadReviews();

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
      ta.remove();
      return ok;
    }
  }

  $('#reviewForm').addEventListener('submit', (e) => {
    e.preventDefault();
    if ($('#reviewWebsite').value) return; // honeypot
    const msgEl = $('#reviewMsg');
    const msg = msgEl.value.trim();
    const name = $('#reviewName').value.trim().slice(0, 60);
    let ok = true;
    if (!rating) { $('#ratingError').textContent = 'Izaberi ocenu od 1 do 5 zvezdica.'; ok = false; }
    if (msg.length < 10) {
      $('#reviewMsgError').textContent = 'Poruka mora imati najmanje 10 znakova.';
      msgEl.closest('.field').classList.add('has-error'); ok = false;
    } else { $('#reviewMsgError').textContent = ''; msgEl.closest('.field').classList.remove('has-error'); }
    if (!ok) { (rating ? msgEl : starBtns[0]).focus(); return; }

    const hasPlaceId = GOOGLE_PLACE_ID && !GOOGLE_PLACE_ID.startsWith('[');
    const googleUrl = hasPlaceId
      ? 'https://search.google.com/local/writereview?placeid=' + encodeURIComponent(GOOGLE_PLACE_ID)
      : 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('Fade Hub 021 Bulevar Jovana Dučića 1 Novi Sad');
    // window.open mora biti sinhrono u kliku, inače ga blokira popup blokator
    const win = window.open(googleUrl, '_blank', 'noopener');
    const stars = rating;
    copyText(msg).then((copied) => {
      const notice = $('#reviewNotice');
      notice.hidden = false;
      notice.innerHTML =
        `<strong>Hvala!</strong> ${copied ? 'Tvoj tekst je kopiran.' : 'Kopiraj svoj tekst iz polja iznad.'}` +
        `<ol><li>Na Google stranici koja se otvorila nalepi tekst.</li><li>Potvrdi ocenu od ${stars} ${stars === 1 ? 'zvezdice' : 'zvezdica'}.</li><li>Klikni „Objavi”.</li></ol>` +
        (win ? '' : `<p>Ako se Google nije otvorio: <a href="${escapeHTML(googleUrl)}" target="_blank" rel="noopener">klikni ovde za Google recenziju</a>.</p>`);
    });

    const review = { name, rating: stars, message: msg.slice(0, 500), date: new Date().toLocaleDateString('sr-Latn-RS') };
    savedReviews.push(review);
    storage.set('localStorage', REVIEWS_KEY, JSON.stringify(savedReviews.slice(-20)));
    renderReview(review);
    e.target.reset();
    setRating(0);
  });

  // ==========================================================
  // KONTAKT — ZAKAZIVANJE PREKO WHATSAPP-A
  // ==========================================================
  const form = $('#bookingForm');
  const dateInput = $('#date');
  const note = $('#note');
  const noteCounter = $('#noteCounter');
  const submitBtn = $('#bookingSubmit');
  const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = new Date();
  dateInput.min = toISO(today);

  note.addEventListener('input', () => {
    if (note.value.length > 300) note.value = note.value.slice(0, 300);
    noteCounter.textContent = `${note.value.length} / 300`;
  });

  const setError = (input, msg) => {
    const field = input.closest('.field');
    field.classList.toggle('has-error', !!msg);
    $('.error', field).textContent = msg || '';
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  };

  function validate() {
    const errors = [];
    const name = $('#name');
    const phone = $('#phone');
    const service = $('#service');
    const nameVal = name.value.trim();
    const phoneDigits = phone.value.replace(/[\s\-/().]/g, '');

    const e1 = nameVal.length < 2 ? 'Unesi ime (najmanje 2 slova).' : '';
    const e2 = !phone.value.trim() ? 'Unesi broj telefona.'
      : !/^\+?\d{8,15}$/.test(phoneDigits) ? 'Broj telefona nije ispravan (samo cifre, 8–15).' : '';
    const e3 = !service.value || !SERVICE_NAMES[service.value] ? 'Izaberi uslugu.' : '';
    let e4 = '';
    if (!dateInput.value) e4 = 'Izaberi datum.';
    else {
      const [y, m, d] = dateInput.value.split('-').map(Number);
      const picked = new Date(y, m - 1, d);
      const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      if (isNaN(picked)) e4 = 'Datum nije ispravan.';
      else if (picked < t0) e4 = 'Datum ne može biti u prošlosti.';
      else if (picked.getDay() === 0) e4 = 'Salon je zatvoren nedeljom. Izaberi radni dan (pon–sub).';
    }
    [[name, e1], [phone, e2], [service, e3], [dateInput, e4]].forEach(([el, msg]) => {
      setError(el, msg);
      if (msg) errors.push(el);
    });
    return errors;
  }

  ['input', 'change'].forEach((ev) => form.addEventListener(ev, (e) => {
    if (e.target.closest('.field.has-error')) validate();
  }));

  let isSubmitting = false;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    const errors = validate();
    const notice = $('#bookingNotice');
    if (errors.length) {
      errors[0].focus();
      notice.hidden = true;
      return;
    }

    isSubmitting = true;
    submitBtn.disabled = true;
    submitBtn.setAttribute('aria-disabled', 'true');
    setTimeout(() => { isSubmitting = false; submitBtn.disabled = false; submitBtn.removeAttribute('aria-disabled'); }, 2000);

    const [y, m, d] = dateInput.value.split('-');
    const lines = [
      'Zdravo, želim da zakažem termin u Fade Hub 021.',
      '',
      `Ime: ${$('#name').value.trim()}`,
      `Telefon: ${$('#phone').value.trim()}`,
      `Usluga: ${SERVICE_NAMES[$('#service').value]}`,
      `Datum: ${d}.${m}.${y}.`
    ];
    const noteVal = note.value.trim().slice(0, 300);
    if (noteVal) lines.push(`Napomena: ${noteVal}`);
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join('\n'))}`;

    // Sinhrono u submit handleru — ne blokira se kao popup
    const win = window.open(url, '_blank', 'noopener');
    notice.hidden = false;
    notice.innerHTML =
      '<strong>Skoro gotovo!</strong> Otvorio se WhatsApp sa tvojom porukom — pritisni „Pošalji” u WhatsApp-u da zahtev stigne salonu. ' +
      'Salon će ti potvrditi termin.' +
      `<p><a href="${escapeHTML(url)}" target="_blank" rel="noopener">${win ? 'Otvori WhatsApp ponovo' : 'Klikni ovde za WhatsApp'}</a></p>`;
    form.reset();
    noteCounter.textContent = '0 / 300';
    notice.setAttribute('tabindex', '-1');
    notice.focus();
  });
})();
