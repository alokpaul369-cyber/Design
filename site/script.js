// AlphaX site behaviour.
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
$('#year').textContent = new Date().getFullYear();

// Logo intro: build the mark when each logo scrolls into view; drop .play after so hover can animate.
// Top-level so the observer stays referenced (a block-scoped one can be collected before the footer logo is reached).
const logoIO = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  const m = e.target;
  logoIO.unobserve(m);
  m.classList.add('play');
  // A timer (intro is 1.25s), not animationend: that event can be skipped while the tab is in the background.
  setTimeout(() => m.classList.remove('play'), 1400);
}), { threshold: 0.6 });
if (!reduced) $$('.logo-mark').forEach(m => logoIO.observe(m));

// Header: solid on scroll, mobile menu.
const header = $('#header'), menuBtn = $('#menu-btn');
const onScroll = () => header.classList.toggle('is-scrolled', scrollY > 20);
addEventListener('scroll', onScroll, { passive: true }); onScroll();
const setMenu = open => { header.classList.toggle('is-open', open); menuBtn.setAttribute('aria-expanded', open); menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu'); };
menuBtn.addEventListener('click', () => setMenu(!header.classList.contains('is-open')));
$$('#nav a').forEach(a => a.addEventListener('click', () => setMenu(false)));
addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

// Active nav link for the section in view.
const links = $$('#nav a');
const spy = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) links.forEach(l => l.toggleAttribute('aria-current', l.hash === '#' + e.target.id));
}), { rootMargin: '-45% 0px -50% 0px' });
links.forEach(l => { const s = $(l.hash); if (s) spy.observe(s); });

// Marquees: duplicate content once so translateX(-50%) loops seamlessly.
$$('[data-dup]').forEach(t => t.append(...[...t.children].map(c => { const n = c.cloneNode(true); n.setAttribute('aria-hidden', 'true'); return n; })));

// Reveal on scroll + stat count-up.
const countUp = el => {
  const end = +el.dataset.count;
  if (reduced) { el.textContent = end; return; }
  const t0 = performance.now();
  const tick = t => { const p = Math.min((t - t0) / 1400, 1); el.textContent = Math.round(end * (1 - (1 - p) ** 3)); if (p < 1) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
};
// Stagger: cards in the same row reveal one after another; the delay is cleared after so hovers stay snappy.
$$('.stats, .projects, .plans, .why, .stack, .process, .duo').forEach(g => [...g.children].forEach((c, i) => { c.style.transitionDelay = i * 160 + 'ms'; }));

// Split headings into words (.wd) and letters (.ch) so they can rise letter by letter.
// Child elements (highlights, chips) are kept; only their text is split. Screen readers get the plain heading via aria-label.
if (!reduced) $$('.h2, .statement').forEach(h => {
  const plain = h.cloneNode(true);
  plain.querySelectorAll('br').forEach(b => b.replaceWith(' ')); // a <br> separates words visually but adds no space to textContent
  h.setAttribute('aria-label', plain.textContent.replace(/\s+/g, ' ').trim());
  let ci = 0, wi = 0;
  const walk = node => [...node.childNodes].forEach(n => {
    if (n.nodeType === 1) { if (n.tagName !== 'BR') walk(n); return; }
    if (n.nodeType !== 3 || !n.textContent.trim()) return;
    const frag = document.createDocumentFragment();
    n.textContent.split(/(\s+)/).forEach(part => {
      if (!part) return;
      if (/^\s+$/.test(part)) { frag.append(' '); return; }
      const wd = document.createElement('span');
      wd.className = 'wd'; wd.setAttribute('aria-hidden', 'true'); wd.style.setProperty('--w', wi++);
      [...part].forEach(c => { const ch = document.createElement('span'); ch.className = 'ch'; ch.textContent = c; ch.style.setProperty('--i', Math.min(ci++, 40)); wd.append(ch); });
      frag.append(wd);
    });
    n.replaceWith(frag);
  });
  walk(h);
  h.classList.add('split');
});
// Two-way: reveal at 15% visible, reset once fully off-screen, so it replays from the scroll direction.
// Count-up runs only the first time.
const io = new IntersectionObserver(es => es.forEach(e => {
  const el = e.target;
  if (!e.isIntersecting) { if (!reduced) el.classList.remove('is-in'); return; }
  if (e.intersectionRatio < 0.15) return;
  el.classList.add('is-in');
  if (el.style.transitionDelay) setTimeout(() => { el.style.transitionDelay = ''; }, 1300);
  $$('[data-count]:not([data-counted])', el).forEach(c => { c.dataset.counted = ''; countUp(c); });
}), { threshold: [0, 0.15] });
$$('.reveal').forEach(el => io.observe(el));

// Scroll progress (bar at the top + back-to-top ring both read --p from <html>).
const root = document.documentElement;
const onProgress = () => { const max = root.scrollHeight - innerHeight; root.style.setProperty('--p', max > 0 ? Math.min(scrollY / max, 1) : 0); };
addEventListener('scroll', onProgress, { passive: true }); onProgress();

// Back to top.
const toTop = $('#to-top');
toTop.addEventListener('click', () => scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }));

// Scroll-direction loop: one rAF per frame at most, transforms and CSS variables only.
const hero = $('#hero'), band = $('.big-marquee'), bandTrack = $('.big-marquee .marquee-track'), mega = $('.mega'), megaBase = $('.footer-base');
const svcs = $$('.svc');
const clamp01 = v => Math.max(0, Math.min(1, v));
let lastY = scrollY, ticking = false, idleTimer, dir = 'down';
const frame = () => {
  ticking = false;
  const y = scrollY, v = y - lastY;
  if (Math.abs(v) > 2) dir = v > 0 ? 'down' : 'up';
  lastY = y;
  root.dataset.dir = dir;
  // Smart header: hide while reading down, return on any scroll up (never while the menu is open).
  header.classList.toggle('is-hidden', dir === 'down' && y > 240 && !header.classList.contains('is-open'));
  // Back-to-top shows when heading back up from far down.
  toTop.classList.toggle('is-on', dir === 'up' && y > 900);
  if (reduced) return;
  // Hero drift + fade.
  hero.style.setProperty('--hero-p', clamp01(y / hero.offsetHeight).toFixed(3));
  // Marquee band: speed up with scroll speed, run backwards when scrolling up, skew with velocity.
  const anim = bandTrack.getAnimations()[0];
  if (anim) anim.playbackRate = (dir === 'down' ? 1 : -1) * (1 + Math.min(Math.abs(v) / 8, 8));
  band.style.setProperty('--skew', Math.max(-20, Math.min(20, -v * .55)).toFixed(2) + 'deg');
  // Service stack: each card shrinks/dims as the next one slides over it.
  svcs.forEach((s, i) => {
    const next = svcs[i + 1];
    if (!next) return;
    const r = s.getBoundingClientRect(), n = next.getBoundingClientRect();
    s.style.setProperty('--cover', clamp01((r.bottom - n.top) / r.height).toFixed(3));
  });
  // Footer wordmark rises as the footer arrives. Measured from the row below it (which never moves):
  // measuring the wordmark itself would include its own offset and keep pushing it out of view.
  const baseTop = megaBase.getBoundingClientRect().top;
  mega.style.setProperty('--rise', clamp01(1 - (baseTop - innerHeight + 40) / (mega.offsetHeight + innerHeight * .4)).toFixed(3));
  // Settle: after scrolling stops, the band returns to normal speed and no skew.
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (anim) anim.playbackRate = dir === 'down' ? 1 : -1;
    band.style.setProperty('--skew', '0deg');
  }, 140);
};
addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, { passive: true });
frame();

// Pointer effects: only with a real mouse, never under reduced motion.
if (!reduced && matchMedia('(hover: hover) and (pointer: fine)').matches) {
  // Cursor spotlight on dark bands + mouse parallax for the hero tags.
  $$('#hero, #technology, #contact').forEach(sec => {
    sec.addEventListener('pointermove', e => {
      const r = sec.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      sec.style.setProperty('--sx', x * 100 + '%'); sec.style.setProperty('--sy', y * 100 + '%');
      sec.style.setProperty('--px', ((x - .5) * 80).toFixed(1)); sec.style.setProperty('--py', ((y - .5) * 80).toFixed(1));
      sec.classList.add('spot-on');
    });
    sec.addEventListener('pointerleave', () => { sec.classList.remove('spot-on'); sec.style.setProperty('--px', 0); sec.style.setProperty('--py', 0); });
  });
  // Magnetic primary buttons.
  $$('.btn-volt').forEach(b => {
    b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect(); b.style.translate = `${(e.clientX - r.left - r.width / 2) * .45}px ${(e.clientY - r.top - r.height / 2) * .6}px`; });
    b.addEventListener('pointerleave', () => { b.style.translate = ''; });
  });
  // 3D tilt toward the cursor.
  $$('.project, .why-card').forEach(c => {
    c.addEventListener('pointermove', e => {
      const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      c.style.transform = `perspective(900px) rotateX(${(-y * 14).toFixed(2)}deg) rotateY(${(x * 18).toFixed(2)}deg)`;
      c.style.setProperty('--gx', (x + .5) * 100 + '%'); c.style.setProperty('--gy', (y + .5) * 100 + '%');
      c.classList.add('is-tilting');
    });
    c.addEventListener('pointerleave', () => { c.style.transform = ''; c.classList.remove('is-tilting'); });
  });
}

// FAQ: one open at a time.
$$('.faq details').forEach(d => d.addEventListener('toggle', () => {
  if (d.open) $$('.faq details').forEach(o => { if (o !== d) o.open = false; });
}));

// Where form submissions go. Paste your form-service URL here (e.g. 'https://formspree.io/f/abcdwxyz').
// Until it is set, forms open the visitor's email app with the message filled in, so no lead is lost.
const FORM_ENDPOINT = '';
const CONTACT_EMAIL = 'hello@alphax.dev';
// Returns 'sent' | 'mailto' | 'failed'. Never throws.
const deliver = async (subject, data) => {
  if (!FORM_ENDPOINT) {
    const body = Object.entries(data).map(([k, v]) => `${k}: ${v}`).join('\n');
    location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    return 'mailto';
  }
  try {
    const r = await fetch(FORM_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ _subject: subject, ...data }) });
    return r.ok ? 'sent' : 'failed';
  } catch { return 'failed'; }
};

// Contact form.
const form = $('#contact-form');
const f = form.elements; // form.name is the form's own name, so read fields via elements
const chips = $$('.chip-btn', form);
chips.forEach(c => c.addEventListener('click', () => c.setAttribute('aria-pressed', c.getAttribute('aria-pressed') !== 'true')));
// Pricing buttons pre-select the matching service and start the brief.
$$('[data-plan]').forEach(b => b.addEventListener('click', () => {
  chips.forEach(c => { if (c.textContent === b.dataset.plan) c.setAttribute('aria-pressed', 'true'); });
  if (!f.message.value.trim()) f.message.value = `I'm interested in ${b.dataset.plan}. `;
}));
const emailOk = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const check = (el, ok) => { el.setAttribute('aria-invalid', String(!ok)); $('#' + el.getAttribute('aria-describedby')).hidden = ok; return ok; };
const serviceGroup = $('[aria-labelledby="need-label"]', form);
form.addEventListener('submit', async e => {
  e.preventDefault();
  const picked = chips.filter(c => c.getAttribute('aria-pressed') === 'true').map(c => c.textContent);
  // Required fields in visual order; focus the first one that fails.
  const checks = [
    [f.name, check(f.name, f.name.value.trim() !== '')],
    [f.email, check(f.email, emailOk(f.email.value))],
    [chips[0], check(serviceGroup, picked.length > 0)],
    [f.message, check(f.message, f.message.value.trim() !== '')],
    [f.consent, check(f.consent, f.consent.checked)],
  ];
  const firstBad = checks.find(([, ok]) => !ok);
  if (firstBad) { firstBad[0].focus(); return; }
  const btn = $('[type=submit]', form), err = $('#form-err');
  btn.disabled = true; err.hidden = true;
  const val = el => el.value.trim() || '—';
  const result = await deliver('New project inquiry — ' + f.name.value.trim(), {
    name: val(f.name), email: val(f.email), company: val(f.company), website: val(f.website),
    services: picked.join(', '), project: val(f.message), budget: val(f.budget), timeline: val(f.timeline),
    heardFrom: val(f.source), consent: 'yes',
  });
  btn.disabled = false;
  if (result === 'failed') { err.textContent = `We couldn't submit your inquiry. Please check the required fields and try again. If the issue continues, contact us directly at ${CONTACT_EMAIL}.`; err.hidden = false; return; }
  if (result === 'mailto') { $('#sent-title').textContent = 'Almost there!'; $('#sent-text').textContent = 'Your email app has opened with your brief — just hit send.'; }
  form.classList.add('is-sent');
  $('#sent').focus();
});

// Newsletter.
$('#news').addEventListener('submit', async e => {
  e.preventDefault();
  const input = $('#news-email'), msg = $('#news-msg');
  if (!emailOk(input.value)) { msg.textContent = 'Please enter a valid email.'; return; }
  const result = await deliver('Newsletter sign-up', { email: input.value.trim() });
  msg.textContent = { sent: "You're on the list. Welcome aboard!", mailto: 'Your email app has opened — hit send to subscribe.', failed: "Sorry, that didn't work. Please try again." }[result];
  if (result !== 'failed') input.value = '';
});
