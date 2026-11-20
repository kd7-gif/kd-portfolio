/* KD Daramola Portfolio — interactions & motion */
(function () {
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Split headings into letters (word-safe wrapping) ---------- */
  document.querySelectorAll('[data-split]').forEach((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', el.textContent.trim());
    el.textContent = '';
    let i = 0;
    words.forEach((word, wi) => {
      const w = document.createElement('span');
      w.className = 'w';
      w.setAttribute('aria-hidden', 'true');
      [...word].forEach((c) => {
        const ch = document.createElement('span');
        ch.className = 'ch';
        ch.textContent = c;
        ch.style.setProperty('--i', i++);
        w.appendChild(ch);
      });
      el.appendChild(w);
      if (wi < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
  });

  /* ---------- Loader → hero intro ---------- */
  const heroBits = document.querySelectorAll('.hero .reveal, .hero [data-split]');
  function intro() {
    root.classList.add('loaded');
    document.querySelector('.hero-title')?.style.setProperty('--sd', '.45s');
    heroBits.forEach((el, n) => {
      el.style.setProperty('--rd', 0.55 + n * 0.12 + 's');
      requestAnimationFrame(() => el.classList.add('in'));
    });
    setTimeout(() => root.classList.add('done'), reduce ? 0 : 1300);
  }
  if (reduce) intro();
  else {
    let started = false;
    const go = () => { if (!started) { started = true; setTimeout(intro, 500); } };
    if (document.readyState === 'complete') go();
    else window.addEventListener('load', go);
    setTimeout(go, 2200); // never hold the page hostage to slow assets
  }

  /* ---------- Scroll reveals ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });

  document.querySelectorAll('.reveal, [data-split], .pcard').forEach((el) => {
    if (el.closest('.hero')) return;
    io.observe(el);
  });

  // Stagger siblings that reveal together (info column, timeline, skills, contact rows)
  document.querySelectorAll('.info, .timeline, .skills, .rows').forEach((group) => {
    group.querySelectorAll(':scope > .reveal').forEach((el, n) => el.style.setProperty('--rd', n * 0.07 + 's'));
  });

  /* ---------- Count-up for facts ---------- */
  const countIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      countIO.unobserve(e.target);
      const el = e.target;
      const m = el.textContent.match(/^(\d+)(.*)$/);
      if (!m || reduce) return;
      const end = +m[1], suffix = m[2];
      const dur = 1400, t0 = performance.now();
      const step = (t) => {
        const p = Math.min(1, (t - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 4);
        el.textContent = Math.round(end * eased) + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }, { threshold: 0.6 });
  document.querySelectorAll('[data-count]').forEach((el) => countIO.observe(el));

  /* ---------- Header state, active section, side rail ---------- */
  const nav = document.querySelector('.nav');
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const sections = [...document.querySelectorAll('main > section[id]')];
  const navLinks = document.querySelectorAll('.nav-side a');
  const secIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      navLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach((s) => secIO.observe(s));

  /* ---------- Local time in Nigeria (WAT) ---------- */
  const clock = document.getElementById('clock');
  if (clock) {
    const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos' });
    const tickClock = () => { clock.textContent = fmt.format(new Date()); };
    tickClock();
    setInterval(tickClock, 30000);
  }

  /* ---------- Mobile menu ---------- */
  const burger = document.querySelector('.burger');
  const menu = document.getElementById('menu');
  const setMenu = (open) => {
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.hidden = !open;
    document.body.classList.toggle('locked', open);
  };
  burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
  menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) setMenu(false); });

  /* ---------- Screenshot galleries (crossfade) ---------- */
  document.querySelectorAll('.gallery').forEach((g) => {
    const img = g.querySelector('.stage-img');
    const cap = g.querySelector('.stage-cap');
    const thumbs = g.querySelectorAll('.thumb');
    thumbs.forEach((t) => t.addEventListener('click', () => {
      if (t.classList.contains('on')) return;
      thumbs.forEach((x) => x.classList.remove('on'));
      t.classList.add('on');
      img.classList.add('swapping');
      const next = new Image();
      next.src = t.dataset.src;
      const swap = () => {
        setTimeout(() => {
          img.src = t.dataset.src;
          img.alt = t.dataset.cap;
          cap.textContent = t.dataset.cap;
          img.classList.remove('swapping');
        }, reduce ? 0 : 220);
      };
      next.decode ? next.decode().then(swap, swap) : (next.onload = swap);
    }));
  });

  /* ---------- Copy email ---------- */
  document.querySelectorAll('.copy').forEach((b) => b.addEventListener('click', () => {
    const el = document.getElementById(b.dataset.target);
    const done = (label) => { b.textContent = label; setTimeout(() => (b.textContent = 'Copy'), 1600); };
    const fallback = () => {
      const r = document.createRange(); r.selectNodeContents(el);
      const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
      done('Selected');
    };
    try { navigator.clipboard.writeText(el.textContent).then(() => done('Copied'), fallback); }
    catch (e) { fallback(); }
  }));

})();
