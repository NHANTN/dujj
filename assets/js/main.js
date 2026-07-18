/* ============================================
   Resume Website — Main Script
   i18n + Render + Interactions
   ============================================ */

(function () {
  'use strict';

  // ============================================
  // State
  // ============================================
  const state = {
    lang: localStorage.getItem('resume-lang') || 'zh',
    theme: localStorage.getItem('resume-theme') || null, // null = follow system
    mode: localStorage.getItem('resume-mode') || 'arch', // 'arch' | 'pm'
    data: { zh: null, en: null }
  };

  // ============================================
  // Theme Management
  // ============================================
  function getSystemTheme() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches
      ? 'light'
      : 'dark';
  }

  function effectiveTheme() {
    return state.theme || getSystemTheme();
  }

  function applyTheme(theme) {
    const root = document.documentElement;
    if (theme === 'light') {
      root.setAttribute('data-theme', 'light');
    } else {
      root.setAttribute('data-theme', 'dark');
    }
  }

  function setupThemeToggle() {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
      // Toggle between light/dark, and persist the choice
      const current = effectiveTheme();
      const next = current === 'light' ? 'dark' : 'light';
      state.theme = next;
      localStorage.setItem('resume-theme', next);
      applyTheme(next);
    });
  }

  // React to system theme changes if user hasn't picked one
  function setupSystemThemeListener() {
    if (!window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const handler = () => {
      if (state.theme == null) applyTheme(getSystemTheme());
    };
    if (mq.addEventListener) mq.addEventListener('change', handler);
    else if (mq.addListener) mq.addListener(handler);
  }

  // ============================================
  // i18n Core
  // ============================================
  function resolvePath(obj, path) {
    return path.split('.').reduce((acc, key) => (acc != null ? acc[key] : null), obj);
  }

  // ============================================
  // Data Loading
  // ============================================
  async function loadData(mode) {
    const [zh, en] = await Promise.all([
      fetch(`assets/data/${mode}-zh.json`).then((r) => r.json()),
      fetch(`assets/data/${mode}-en.json`).then((r) => r.json())
    ]);
    state.data.zh = zh;
    state.data.en = en;
  }

  function applyI18n(lang) {
    const data = state.data[lang];
    if (!data) return;

    // Update state.lang FIRST so downstream callers (updateDownloadLink, etc.)
    // read the new value, not the old one.
    state.lang = lang;

    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    document.body.classList.toggle('lang-en', lang === 'en');

    // 1) Update data-i18n elements (text content)
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const value = resolvePath(data, key);
      if (value != null) el.textContent = value;
    });

    // 2) Update placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      const value = resolvePath(data, key);
      if (value != null) el.setAttribute('placeholder', value);
    });

    // 3) Update document title
    const name = data.meta.name;
    const titleSuffix = lang === 'zh' ? '· 简历' : '· Resume';
    document.title = `${name} ${titleSuffix}`;

    // 4) Update lang toggle button
    const langToggle = document.getElementById('langToggle');
    if (langToggle) {
      langToggle.querySelector('.lang-active').textContent = lang === 'zh' ? '中' : 'EN';
      langToggle.querySelector('.lang-inactive').textContent = lang === 'zh' ? 'EN' : '中';
    }

    // 5) Update download link based on current mode + lang
    updateDownloadLink();

    // 6) Re-render dynamic sections
    renderDynamic(data);

    // 7) Save preference
    localStorage.setItem('resume-lang', lang);
  }

  // ============================================
  // Renderers
  // ============================================
  function renderDynamic(data) {
    renderSkills(data.skills);
    renderExperience(data.experience);
    renderProjects(data.projects);
    renderCerts(data.certs);
    // Re-trigger reveal animations
    observeRevealElements();
  }

  function renderSkills(skills) {
    const grid = document.getElementById('skillsGrid');
    if (!grid || !skills) return;
    grid.innerHTML = skills.categories
      .map(
        (cat) => `
      <div class="skill-card reveal">
        <div class="skill-name">${escapeHTML(cat.name)}</div>
        <ul class="skill-items">
          ${cat.items.map((item) => `<li>${escapeHTML(item)}</li>`).join('')}
        </ul>
      </div>
    `
      )
      .join('');
  }

  function renderExperience(experience) {
    const timeline = document.getElementById('experienceTimeline');
    if (!timeline || !experience) return;
    timeline.innerHTML = experience.items
      .map(
        (item) => `
      <div class="timeline-item reveal">
        <div class="timeline-meta">
          <span class="timeline-period">${escapeHTML(item.period)}</span>
          <span>·</span>
          <span>${escapeHTML(item.location || '')}</span>
        </div>
        <h3 class="timeline-company">${escapeHTML(item.company)}</h3>
        <div class="timeline-role">${escapeHTML(item.role)}</div>
        <ul class="timeline-highlights">
          ${item.highlights.map((h) => `<li>${formatHighlight(h)}</li>`).join('')}
        </ul>
      </div>
    `
      )
      .join('');
  }

  function renderProjects(projects) {
    const grid = document.getElementById('projectsGrid');
    if (!grid || !projects) return;
    // Sort by start date, newest first
    const sorted = [...projects.items].sort(
      (a, b) => parsePeriodStart(b.period) - parsePeriodStart(a.period)
    );
    grid.innerHTML = sorted
      .map(
        (p) => `
      <article class="project-card reveal">
        <div class="project-header">
          <h3 class="project-name">${escapeHTML(p.name)}</h3>
          <div>
            <span class="project-role">${escapeHTML(p.role)}</span>
            <span class="project-period">${escapeHTML(p.period)}</span>
          </div>
        </div>
        <p class="project-background">${escapeHTML(p.background)}</p>
        <ul class="project-highlights">
          ${p.highlights.map((h) => `<li>${escapeHTML(h)}</li>`).join('')}
        </ul>
        <div class="project-tech">
          ${(p.tech || []).map((t) => `<span>${escapeHTML(t)}</span>`).join('')}
        </div>
        <div class="project-result">${escapeHTML(p.result)}</div>
      </article>
    `
      )
      .join('');
  }

  function renderCerts(certs) {
    const grid = document.getElementById('certsGrid');
    if (!grid || !certs) return;
    grid.innerHTML = certs.items
      .map(
        (c) => `
      <div class="cert-card reveal">
        <span class="cert-badge">CERTIFIED</span>
        <div class="cert-name">${escapeHTML(c.name)}</div>
        <div class="cert-desc">${escapeHTML(c.desc)}</div>
        <div class="cert-issuer">${escapeHTML(c.issuer)}</div>
      </div>
    `
      )
      .join('');
  }

  // Light highlight parser: wrap numbers/percentages in <strong>.
  // Splits on the number pattern first, then escapes non-number pieces,
  // so we never accidentally break HTML entities like &#39; (where the
  // regex would otherwise have wrapped the "39").
  function formatHighlight(text) {
    if (!text) return '';
    const numberRe = /(\d[\d,.]*\+?%?|\d+h|\d+min)/g;
    const parts = text.split(numberRe);
    return parts
      .map((part, i) => {
        if (i % 2 === 1) {
          return `<strong>${escapeHTML(part)}</strong>`;
        }
        return escapeHTML(part);
      })
      .join('');
  }

  // Parse project period start into a comparable number (YYYYMM).
  // Supports: "2025.08 - 2025.12", "Aug 2025 - Dec 2025", "Jan 2024 - Aug 2024"
  const MONTH_MAP = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
  };
  function parsePeriodStart(period) {
    if (!period) return 0;
    const startStr = period.split(/[-—]/)[0].trim();
    // YYYY.MM
    let m = startStr.match(/^(\d{4})[.\-/](\d{1,2})/);
    if (m) return parseInt(m[1], 10) * 100 + parseInt(m[2], 10);
    // MMM YYYY (English)
    m = startStr.match(/^([A-Za-z]+)\s+(\d{4})$/);
    if (m) {
      const month = MONTH_MAP[m[1].toLowerCase().slice(0, 3)] || 0;
      return parseInt(m[2], 10) * 100 + month;
    }
    // YYYY only
    m = startStr.match(/^(\d{4})$/);
    if (m) return parseInt(m[1], 10) * 100;
    return 0;
  }

  function escapeHTML(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ============================================
  // Language Toggle
  // ============================================
  function setupLangToggle() {
    const btn = document.getElementById('langToggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const next = state.lang === 'zh' ? 'en' : 'zh';
      applyI18n(next);
    });
  }

  // ============================================
  // Mode Toggle (Arch / PM)
  // ============================================
  function updateModeToggle() {
    const toggle = document.getElementById('modeToggle');
    if (!toggle) return;
    toggle.querySelectorAll('.mode-option').forEach((opt) => {
      const selected = opt.dataset.mode === state.mode;
      opt.setAttribute('aria-selected', selected ? 'true' : 'false');
    });
  }

  async function switchMode(mode) {
    if (mode === state.mode) return;
    state.mode = mode;
    localStorage.setItem('resume-mode', mode);
    updateModeToggle();
    updateDownloadLink();
    // Re-fetch data for the new mode, then re-render
    await loadData(mode);
    applyI18n(state.lang);
    // Re-trigger reveal animations for newly rendered cards
    observeRevealElements();
  }

  function setupModeToggle() {
    const toggle = document.getElementById('modeToggle');
    if (!toggle) return;
    toggle.querySelectorAll('.mode-option').forEach((opt) => {
      opt.addEventListener('click', () => switchMode(opt.dataset.mode));
    });
  }

  // ============================================
  // Resume PDF Download
  // ============================================
  // Map (mode, lang) → PDF file
  const PDF_FILES = {
    arch: {
      zh: 'Jingjing-Du-Infrastructure-Engineer-CN.pdf',
      en: 'Jingjing-Du-Infrastructure-Engineer-EN.pdf',
    },
    pm: {
      zh: 'Jingjing-Du-Project-Manager-CN.pdf',
      en: 'Jingjing-Du-Project-Manager-EN.pdf',
    },
  };

  function updateDownloadLink() {
    const btn = document.getElementById('downloadBtn');
    if (!btn) return;
    const file = PDF_FILES[state.mode]?.[state.lang] || PDF_FILES.arch.en;
    btn.setAttribute('href', `assets/pdf/${file}`);
    btn.setAttribute('download', file);
  }

  function setupDownloadBtn() {
    const btn = document.getElementById('downloadBtn');
    if (!btn) return;
    btn.addEventListener('click', (e) => {
      // If href is missing (e.g. before PDF is generated), prevent download
      if (!btn.getAttribute('href') || btn.getAttribute('href') === '#') {
        e.preventDefault();
        return;
      }
      // Brief visual feedback
      const original = btn.textContent;
      btn.classList.add('downloading');
      // localStorage to record a download event (analytics-ish, lightweight)
      try {
        const count = parseInt(localStorage.getItem('resume-dl-count') || '0', 10) + 1;
        localStorage.setItem('resume-dl-count', String(count));
        localStorage.setItem('resume-dl-last', new Date().toISOString());
      } catch (_) { /* ignore */ }
      setTimeout(() => btn.classList.remove('downloading'), 1200);
    });
  }

  // ============================================
  // Mobile Menu
  // ============================================
  function setupMobileMenu() {
    const burger = document.getElementById('navBurger');
    const menu = document.querySelector('.nav-menu');
    if (!burger || !menu) return;

    burger.addEventListener('click', () => {
      menu.classList.toggle('open');
    });

    menu.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => menu.classList.remove('open'));
    });
  }

  // ============================================
  // Scroll Reveal (IntersectionObserver)
  // ============================================
  let revealObserver = null;

  function setupRevealObserver() {
    if (revealObserver) return revealObserver;
    revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.05, rootMargin: '0px 0px -10% 0px' }
    );
    return revealObserver;
  }

  function observeRevealElements() {
    const observer = setupRevealObserver();
    const vh = window.innerHeight || 800;
    document.querySelectorAll('.reveal').forEach((el, i) => {
      // 1) Initial visibility check — anything already on screen shows immediately
      const rect = el.getBoundingClientRect();
      const isInViewport = rect.top < vh + 200 && rect.bottom > -200;
      if (isInViewport) {
        el.style.transitionDelay = `${Math.min(i * 30, 200)}ms`;
        el.classList.add('visible');
      } else {
        el.style.transitionDelay = `${Math.min(i * 30, 200)}ms`;
        observer.observe(el);
      }
    });
  }

  // ============================================
  // Hero Stats Count-up Animation
  // ============================================
  function animateStats() {
    const stats = document.querySelectorAll('.stat-num');
    stats.forEach((stat) => {
      const text = stat.textContent;
      const match = text.match(/(\d+)/);
      if (!match) return;
      const target = parseInt(match[1], 10);
      const suffix = text.replace(match[1], '');
      let current = 0;
      const duration = 1200;
      const start = performance.now();

      const step = (now) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        current = Math.floor(eased * target);
        stat.firstChild.textContent = current;
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  // ============================================
  // Nav scroll effect
  // ============================================
  function setupNavScroll() {
    const nav = document.getElementById('nav');
    if (!nav) return;
    const onScroll = () => {
      nav.classList.toggle('scrolled', window.scrollY > 10);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ============================================
  // Boot
  // ============================================
  async function boot() {
    // Apply theme early (before paint) to avoid flash
    applyTheme(effectiveTheme());

    try {
      await loadData(state.mode);
    } catch (err) {
      console.error('Failed to load data:', err);
      return;
    }

    updateModeToggle();
    applyI18n(state.lang);
    setupLangToggle();
    setupModeToggle();
    setupThemeToggle();
    setupSystemThemeListener();
    setupMobileMenu();
    setupDownloadBtn();
    setupNavScroll();
    observeRevealElements();

    // Trigger count-up once
    setTimeout(animateStats, 400);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
