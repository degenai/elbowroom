/*
 * ELBOW ROOM — interaction layer (anime.js v4.3.6, self-hosted).
 * Pure progressive enhancement. Every effect self-gates on prefers-reduced-motion and
 * seeds its own hidden state in JS, so a failed module load or reduced motion leaves the
 * static, fully-rendered page intact. Nothing here is load-bearing for content.
 *
 * Acts: (1) hero wordmark slam  (2) scroll-reveals  (3) count-up stats
 *       (4) magnetic buttons    (5) card tilt        (6) the gold scroll-spine
 */
import { animate, createTimeline, createSpring, stagger, splitText, utils } from './vendor/anime.esm.min.js';

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* fire cb once when el first scrolls comfortably into view */
function onceInView(el, cb, margin = '0px 0px -18% 0px') {
  if (!('IntersectionObserver' in window)) { cb(); return; }
  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach((e) => { if (e.isIntersecting) { obs.unobserve(e.target); cb(); } });
  }, { rootMargin: margin, threshold: 0 });
  io.observe(el);
}

/* ---------- Act 1: hero wordmark slam ---------- */
function heroSlam() {
  const wm = document.querySelector('[data-slam]');
  if (!wm || reduce) return;
  wm.setAttribute('aria-label', wm.textContent.trim());
  const split = splitText(wm, { chars: true, includeSpaces: true });
  const glyphs = (split.chars || []).filter((c) => c.textContent.trim().length);
  if (!glyphs.length) return;
  glyphs.forEach((c) => c.setAttribute('aria-hidden', 'true'));

  const stack = Array.from(document.querySelectorAll('[data-hero-follow]'));
  utils.set(glyphs, { display: 'inline-block', opacity: 0, translateY: '-90%', scale: 1.4, rotate: -6 });
  stack.forEach((el) => utils.set(el, { opacity: 0 }));

  const tl = createTimeline({ defaults: { ease: createSpring({ stiffness: 620, damping: 18, mass: 1.05 }) } });
  tl.add(glyphs, { opacity: [0, 1], translateY: 0, scale: 1, rotate: 0, delay: stagger(34, { from: 'center' }) });
  if (stack.length) {
    tl.add(stack, { opacity: [0, 1], translateY: ['14px', 0], duration: 460, ease: 'outExpo', delay: stagger(90) }, '-=260');
  }
}

/* ---------- Act 2: scroll reveals ---------- */
function reveals() {
  const items = Array.from(document.querySelectorAll('[data-reveal]'));
  if (!items.length) return;
  if (reduce) return; // visible by default
  items.forEach((el) => {
    const dist = el.dataset.reveal === 'left' ? { translateX: ['-36px', 0] }
              : el.dataset.reveal === 'right' ? { translateX: ['36px', 0] }
              : { translateY: ['26px', 0] };
    utils.set(el, { opacity: 0, ...Object.fromEntries(Object.entries(dist).map(([k, v]) => [k, v[0]])) });
    onceInView(el, () => {
      // stagger children if marked
      const kids = el.dataset.revealChildren ? Array.from(el.children) : null;
      if (kids && kids.length) {
        utils.set(el, { opacity: 1, translateX: 0, translateY: 0 });
        utils.set(kids, { opacity: 0, translateY: '22px' });
        animate(kids, { opacity: [0, 1], translateY: ['22px', 0], duration: 620, ease: 'outExpo', delay: stagger(90) });
      } else {
        animate(el, { opacity: [0, 1], ...dist, duration: 720, ease: 'outExpo' });
      }
    });
  });
}

/* ---------- Act 3: count-up stats ---------- */
function counters() {
  document.querySelectorAll('[data-count]').forEach((el) => {
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const prefix = el.dataset.prefix || '';
    const decimals = (el.dataset.decimals | 0);
    const render = (v) => { el.textContent = prefix + v.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + suffix; };
    if (reduce || isNaN(target)) { render(target || 0); return; }
    render(0);
    onceInView(el, () => {
      const o = { v: 0 };
      animate(o, { v: target, duration: 1600, ease: 'out(3)', onUpdate: () => render(o.v) });
    }, '0px 0px -10% 0px');
  });
}

/* ---------- Act 4: magnetic buttons ---------- */
function magnetic() {
  if (reduce || window.matchMedia('(pointer: coarse)').matches) return;
  document.querySelectorAll('[data-magnetic]').forEach((btn) => {
    const strength = parseFloat(btn.dataset.magnetic) || 0.35;
    btn.addEventListener('pointermove', (e) => {
      const r = btn.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) * strength;
      const y = (e.clientY - r.top - r.height / 2) * strength;
      btn.style.transform = `translate(${x}px, ${y}px)`;
    });
    btn.addEventListener('pointerleave', () => {
      animate(btn, { translateX: 0, translateY: 0, ease: createSpring({ stiffness: 260, damping: 12 }) });
    });
  });
}

/* ---------- Act 5: card tilt ---------- */
function tilt() {
  if (reduce || window.matchMedia('(pointer: coarse)').matches) return;
  document.querySelectorAll('[data-tilt]').forEach((card) => {
    const max = 6;
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(800px) rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(2)}deg) translateY(-4px)`;
    });
    card.addEventListener('pointerleave', () => {
      animate(card, { rotateX: 0, rotateY: 0, translateY: 0, duration: 500, ease: 'outElastic(1, .6)' });
    });
  });
}

/* ---------- Act 6: the gold scroll-spine ---------- */
function spine() {
  const host = document.querySelector('.er-spine');
  const bar = document.querySelector('.er-progress');
  const NS = 'http://www.w3.org/2000/svg';

  if (host && !reduce) {
    const svgEl = document.createElementNS(NS, 'svg');
    svgEl.setAttribute('viewBox', '0 0 60 1000');
    svgEl.setAttribute('preserveAspectRatio', 'none');
    svgEl.setAttribute('aria-hidden', 'true');
    // gold gradient def
    const defs = document.createElementNS(NS, 'defs');
    const grad = document.createElementNS(NS, 'linearGradient');
    grad.setAttribute('id', 'erGold'); grad.setAttribute('x1', '0'); grad.setAttribute('y1', '0');
    grad.setAttribute('x2', '0'); grad.setAttribute('y2', '1');
    [['0%', '#9f7a34'], ['50%', '#dcc06a'], ['100%', '#9f7a34']].forEach(([o, c]) => {
      const s = document.createElementNS(NS, 'stop'); s.setAttribute('offset', o); s.setAttribute('stop-color', c); grad.appendChild(s);
    });
    defs.appendChild(grad); svgEl.appendChild(defs);

    const d = 'M30 0 C 18 140, 42 250, 30 380 C 18 510, 42 620, 30 760 C 22 860, 34 940, 30 1000';
    const base = document.createElementNS(NS, 'path'); base.setAttribute('class', 'spine-base'); base.setAttribute('d', d);
    const draw = document.createElementNS(NS, 'path'); draw.setAttribute('class', 'spine-draw'); draw.setAttribute('d', d);
    svgEl.appendChild(base); svgEl.appendChild(draw);

    // vertebra cross-ticks down the line
    const verts = [];
    for (let i = 1; i <= 11; i++) {
      const y = (1000 / 12) * i;
      const t = document.createElementNS(NS, 'line');
      const half = 9 - Math.abs(6 - i) * 0.5;
      t.setAttribute('class', 'vert'); t.setAttribute('x1', 30 - half); t.setAttribute('y1', y); t.setAttribute('x2', 30 + half); t.setAttribute('y2', y);
      svgEl.appendChild(t); verts.push({ el: t, at: i / 12 });
    }
    host.appendChild(svgEl);

    const len = draw.getTotalLength();
    draw.style.strokeDasharray = len;
    draw.style.strokeDashoffset = len;

    let ticking = false;
    const update = () => {
      ticking = false;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      draw.style.strokeDashoffset = len * (1 - p);
      verts.forEach((v) => { v.el.style.opacity = p >= v.at ? '1' : '0'; });
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
  }

  if (bar) {
    let ticking = false;
    const update = () => {
      ticking = false;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + '%';
    };
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }
}

function init() {
  // wait for brand fonts so split metrics are final
  const go = () => { heroSlam(); reveals(); counters(); magnetic(); tilt(); spine(); };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => requestAnimationFrame(go));
  else requestAnimationFrame(go);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
