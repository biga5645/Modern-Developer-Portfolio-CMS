/**
/**
 * BigaTech Solutions - Main JavaScript
 * Handles: Language switching, Animations, Slider, Contact form, Navigation
 */

// ============================================================
// LANGUAGE SYSTEM
// ============================================================
const Lang = {
  current: (localStorage.getItem('portfolio_lang') || localStorage.getItem('bigatech_lang')) || 'ar',
  supported: ['ar', 'fr', 'en'],
  isSwitching: false,
  pendingLang: null,

  translations: {},

  async load(lang) {
    if (!this.supported.includes(lang)) return;
    if (this.translations[lang]) return;

    try {
      const res = await fetch(`assets/i18n/${lang}.json`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Language file not found');
      this.translations[lang] = await res.json();
    } catch (e) {
      if (lang !== 'en') {
        await this.load('en');
        this.translations[lang] = this.translations.en || {};
      } else {
        this.translations.en = {};
      }
    }
  },

  t(key) {
    return this.translations[this.current]?.[key] || this.translations['en']?.[key] || key;
  },

  async set(lang) {
    if (!this.supported.includes(lang)) return;
    if (this.isSwitching) {
      this.pendingLang = lang;
      return;
    }
    if (lang === this.current) return;

    this.isSwitching = true;
    this.toggleButtons(false);

    await this.load(lang);
    try {
      this.current = lang;
      localStorage.setItem('portfolio_lang', lang);
      document.cookie = `portfolio_lang=${lang};path=/;max-age=2592000`;
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
      document.body.dir = lang === 'ar' ? 'rtl' : 'ltr';

      // Update active lang button
      document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
      });

      // Update static UI texts
      this.updateUI();

      // Reload dynamic content
      await App.loadAll();
    } finally {
      this.isSwitching = false;
      this.toggleButtons(true);

      if (this.pendingLang && this.pendingLang !== this.current) {
        const nextLang = this.pendingLang;
        this.pendingLang = null;
        await this.set(nextLang);
      } else {
        this.pendingLang = null;
      }
    }
  },

  toggleButtons(enabled) {
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.disabled = !enabled;
      btn.style.opacity = enabled ? '1' : '0.6';
      btn.style.pointerEvents = enabled ? 'auto' : 'none';
    });
  },

  updateUI() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      const attr = el.dataset.i18nAttr;
      if (attr) el.setAttribute(attr, this.t(key));
      else el.textContent = this.t(key);
    });
  }
};

// ============================================================
// APP - Content Loader
// ============================================================
const App = {
  settings: {},

  async init() {
    await this.loadAll();
  },

  async loadSettings() {
    try {
      const res = await fetch(`assets/data/settings_${Lang.current}.json`);
      const data = await res.json();
      if (data.success) this.settings = data.data;
    } catch (e) { console.warn('Settings load failed'); }
  },

  updateSettingsUI() {
    const s = this.settings;
    const clean = (value) => {
      const text = (value ?? '').toString().trim();
      if (!text) return '';
      if (/^[??\s]+$/.test(text) || text.includes('?')) return '';
      return text;
    };

    // Site name
    document.querySelectorAll('[data-setting="site_name"]').forEach(el => {
      el.textContent = clean(s.site_name) || 'DevPortfolio';
    });
    // Hero
    const heroTitle = document.getElementById('hero-title');
    const heroSub = document.getElementById('hero-subtitle');
    const heroCta = document.getElementById('hero-cta');
    if (heroTitle && clean(s.hero_title)) heroTitle.innerHTML = clean(s.hero_title);
    if (heroSub && clean(s.hero_subtitle)) heroSub.textContent = clean(s.hero_subtitle);
    if (heroCta && clean(s.hero_cta)) heroCta.textContent = clean(s.hero_cta);

    // About
    const aboutTitle = document.getElementById('about-title');
    const aboutDesc = document.getElementById('about-description');
    if (aboutTitle && clean(s.about_title)) aboutTitle.innerHTML = clean(s.about_title);
    if (aboutDesc && clean(s.about_description)) aboutDesc.textContent = clean(s.about_description);

    // Section titles
    ['services','projects','skills','testimonials','contact'].forEach(sec => {
      const el = document.getElementById(`${sec}-title`);
      const value = clean(s[`${sec}_title`]);
      if (el && value) el.textContent = value;
    });

    // Stats
    document.querySelectorAll('[data-stat]').forEach(el => {
      const value = clean(s[el.dataset.stat]);
      if (value) el.textContent = value;
    });

    // Contact info
    ['contact_email','contact_phone','contact_whatsapp','contact_address'].forEach(k => {
      document.querySelectorAll(`[data-setting="${k}"]`).forEach(el => {
        const value = clean(s[k]);
        if (!value) return;
        if (el.tagName === 'A') el.href = k === 'contact_whatsapp' ? `https://wa.me/${value}` : (k === 'contact_email' ? `mailto:${value}` : (k === 'contact_phone' ? `tel:${value}` : '#'));
        el.textContent = value;
      });
    });

    // Social links
    ['github','linkedin','twitter','instagram'].forEach(net => {
      const el = document.querySelector(`[data-social="${net}"]`);
      if (el && s[`social_${net}`]) el.href = s[`social_${net}`];
    });

    // Footer text
    const footer = document.getElementById('footer-text');
    if (footer && clean(s.footer_text)) footer.textContent = clean(s.footer_text);

    // Whatsapp button
    const wa = document.getElementById('whatsapp-link');
    if (wa && clean(s.contact_whatsapp)) wa.href = `https://wa.me/${clean(s.contact_whatsapp)}`;
  },

  async loadAll() {
    await this.loadSettings();
    this.updateSettingsUI();
    await Promise.all([
      this.loadServices(),
      this.loadProjects(),
      this.loadSkills(),
      this.loadTestimonials(),
    ]);
  },

  async loadServices() {
    const container = document.getElementById('services-grid');
    if (!container) return;
    container.innerHTML = `<div class="loading-text" style="grid-column:1/-1;text-align:center;color:var(--text-muted)">${Lang.t('loading_services')}</div>`;
    try {
      const res = await fetch(`assets/data/services_${Lang.current}.json`);
      const data = await res.json();
      if (!data.success || !data.data.length) { container.innerHTML = ''; return; }
      container.innerHTML = data.data.map((s, i) => `
        <div class="glass-card service-card animate-on-scroll animate-delay-${(i%5)+1}">
          <div class="service-icon-wrap" style="background:${s.color}22;color:${s.color};box-shadow:0 0 20px ${s.color}33">
            <i class="${s.icon}"></i>
          </div>
          <h3>${this.escape(s.title)}</h3>
          <p>${this.escape(s.description)}</p>
        </div>
      `).join('');
      Animations.observeAll();
    } catch(e) { container.innerHTML = ''; }
  },

  projectsData: [],
  async loadProjects() {
    const container = document.getElementById('projects-grid');
    if (!container) return;
    container.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:var(--text-muted)">${Lang.t('loading_projects')}</div>`;
    try {
      const res = await fetch(`assets/data/projects_${Lang.current}.json`);
      const data = await res.json();
      if (!data.success) { container.innerHTML = ''; return; }
      this.projectsData = data.data;
      this.renderProjects('all');
      this.buildFilters(data.data);
    } catch(e) { container.innerHTML = ''; }
  },

  renderProjects(filter) {
    const container = document.getElementById('projects-grid');
    if (!container) return;
    const list = filter === 'all' ? this.projectsData : this.projectsData.filter(p => p.category === filter);
    container.innerHTML = list.map((p, i) => {
      const tags = (p.technologies || '').split(',').map(t => `<span class="project-tag">${this.escape(t.trim())}</span>`).join('');
      const img = p.image
        ? `<img src="assets/img/uploads/${this.escape(p.image)}" alt="${this.escape(p.title)}" loading="lazy">`
        : `<div class="project-image-placeholder"><i class="fas fa-image" aria-hidden="true"></i></div>`;
      return `
        <div class="glass-card project-card animate-on-scroll animate-delay-${(i%4)+1}">
          <div class="project-image">
            ${img}
            <div class="project-overlay">
              ${p.demo_url ? `<a href="${this.escape(p.demo_url)}" target="_blank" class="btn btn-sm btn-primary"><i class="fas fa-eye"></i> ${Lang.t('view_demo')}</a>` : ''}
              ${p.github_url ? `<a href="${this.escape(p.github_url)}" target="_blank" class="btn btn-sm btn-ghost"><i class="fab fa-github"></i></a>` : ''}
            </div>
          </div>
          <div class="project-body">
            ${p.category ? `<span class="project-category">${this.escape(p.category)}</span>` : ''}
            <h3>${this.escape(p.title)}</h3>
            <p>${this.escape(p.description)}</p>
            <div class="project-tags">${tags}</div>
          </div>
        </div>
      `;
    }).join('') || `<div style="grid-column:1/-1;text-align:center;color:var(--text-muted)">No projects found</div>`;
    Animations.observeAll();
  },

  buildFilters(projects) {
    const container = document.getElementById('projects-filter');
    if (!container) return;
    const cats = [...new Set(projects.map(p => p.category).filter(Boolean))];
    const allLabel = Lang.t('filter_all');
    container.innerHTML = `
      <button class="filter-btn active" data-filter="all">${allLabel}</button>
      ${cats.map(c => `<button class="filter-btn" data-filter="${this.escape(c)}">${this.escape(c)}</button>`).join('')}
    `;
    container.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.renderProjects(btn.dataset.filter);
      });
    });
  },

  skillBarsObserver: null,

  async loadSkills() {
    const container = document.getElementById('skills-container');
    if (!container) return;

    // Stop previous skill bars observer to avoid leaks
    if (this.skillBarsObserver) {
      this.skillBarsObserver.disconnect();
      this.skillBarsObserver = null;
    }

    try {
      const res = await fetch(`assets/data/skills_${Lang.current}.json`);
      const data = await res.json();
      if (!data.success || !data.data.length) { container.innerHTML = ''; return; }

      // Group by category
      const grouped = {};
      data.data.forEach(s => {
        if (!grouped[s.category]) grouped[s.category] = [];
        grouped[s.category].push(s);
      });

      container.innerHTML = Object.entries(grouped).map(([cat, skills]) => `
        <div class="skills-category animate-on-scroll">
          <h4 class="skills-category-title">${this.escape(cat)}</h4>
          <div class="skills-grid">
            ${skills.map(s => `
              <div class="skill-badge">
                ${s.icon_type === 'devicon' ? `<i class="${this.escape(s.icon)} colored" style="font-size:1.8rem;color:${this.escape(s.color)}"></i>` : `<i class="${this.escape(s.icon)}" style="color:${this.escape(s.color)}"></i>`}
                <span class="skill-badge-name">${this.escape(s.name)}</span>
                <div class="skill-level-bar"><div class="skill-level-fill" data-level="${s.level}"></div></div>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('');

      // Trigger animate-on-scroll for new elements (handles viewport-already-visible case)
      Animations.observeAll();

      // Animate skill bars after a short paint delay
      setTimeout(() => this.animateSkillBars(), 80);
    } catch(e) { console.warn('Skills load error', e); }
  },

  animateSkillBars() {
    // Disconnect any previous observer
    if (this.skillBarsObserver) this.skillBarsObserver.disconnect();

    this.skillBarsObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.querySelectorAll('.skill-level-fill').forEach(bar => {
            bar.style.width = bar.dataset.level + '%';
          });
          this.skillBarsObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });

    document.querySelectorAll('.skills-category').forEach(el => {
      // Reset bar widths first (needed on language switch)
      el.querySelectorAll('.skill-level-fill').forEach(bar => { bar.style.width = '0'; });

      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        // Already visible � animate immediately
        el.querySelectorAll('.skill-level-fill').forEach(bar => {
          bar.style.width = bar.dataset.level + '%';
        });
      } else {
        this.skillBarsObserver.observe(el);
      }
    });
  },

  testimonialSlider: null,
  async loadTestimonials() {
    const container = document.getElementById('testimonials-track');
    const dotsContainer = document.getElementById('slider-dots');
    if (!container) return;
    try {
      const res = await fetch(`assets/data/testimonials_${Lang.current}.json`);
      const data = await res.json();
      if (!data.success || !data.data.length) return;

      container.innerHTML = data.data.map(t => {
        const stars = '<i class="fas fa-star"></i>'.repeat(t.rating)
          + '<i class="far fa-star"></i>'.repeat(5 - t.rating);
        const avatar = t.client_avatar
          ? `<img src="assets/img/uploads/${this.escape(t.client_avatar)}" alt="${this.escape(t.client_name)}">`
          : `<span>${this.escape(t.client_name.charAt(0))}</span>`;
        return `
          <div class="testimonial-slide">
            <div class="glass-card testimonial-card">
              <div class="testimonial-quote">"</div>
              <p class="testimonial-text">${this.escape(t.text)}</p>
              <div class="testimonial-author">
                <div class="testimonial-avatar">${avatar}</div>
                <div class="testimonial-info">
                  <div class="testimonial-name">${this.escape(t.client_name)}</div>
                  <div class="testimonial-position">${this.escape(t.client_position || '')}${t.client_company ? ' � ' + this.escape(t.client_company) : ''}</div>
                  <div class="testimonial-stars">${stars}</div>
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('');

      if (dotsContainer) {
        dotsContainer.innerHTML = data.data.map((_, i) =>
          `<button class="slider-dot${i === 0 ? ' active' : ''}" data-index="${i}"></button>`
        ).join('');
        dotsContainer.querySelectorAll('.slider-dot').forEach(dot => {
          dot.addEventListener('click', () => Slider.goTo(parseInt(dot.dataset.index)));
        });
      }

      Slider.init(data.data.length);
    } catch(e) {}
  },

  escape(str) {
    if (!str) return '';
    const text = str.toString().trim();
    if (!text || /^[??\s]+$/.test(text) || text.includes('?')) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

// ============================================================
// SLIDER
// ============================================================
const Slider = {
  current: 0,
  total: 0,
  autoTimer: null,

  init(total) {
    this.total = total;
    this.goTo(0);
    this.startAuto();
  },

  goTo(index) {
    this.current = (index + this.total) % this.total;
    const track = document.getElementById('testimonials-track');
    if (track) track.style.transform = `translateX(${Lang.current === 'ar' ? '' : '-'}${this.current * 100}%)`;

    document.querySelectorAll('.slider-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === this.current);
    });
    this.resetAuto();
  },

  prev() { this.goTo(this.current - 1); },
  next() { this.goTo(this.current + 1); },

  startAuto() {
    this.autoTimer = setInterval(() => this.next(), 5000);
  },
  resetAuto() {
    clearInterval(this.autoTimer);
    this.startAuto();
  }
};

// ============================================================
// ANIMATIONS (Intersection Observer)
// ============================================================
const Animations = {
  observer: null,

  init() {
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animated');
          this.observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px 0px 0px' });

    this.observeAll();
  },

  observeAll() {
    document.querySelectorAll('.animate-on-scroll:not(.animated)').forEach(el => {
      // If already inside viewport, animate immediately without waiting for observer
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        el.classList.add('animated');
      } else {
        this.observer?.observe(el);
      }
    });
  }
};

// ============================================================
// NAVBAR
// ============================================================
const Nav = {
  init() {
    const navbar = document.getElementById('navbar');
    const toggle = document.getElementById('nav-toggle');
    const navLinks = document.getElementById('nav-links');

    // Scroll effect
    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) navbar?.classList.add('scrolled');
      else navbar?.classList.remove('scrolled');

      // Update active nav link
      this.updateActiveLink();

      // Show/hide scroll top
      const scrollTopBtn = document.getElementById('scrollTop');
      if (scrollTopBtn) {
        scrollTopBtn.classList.toggle('show', window.scrollY > 400);
      }
    }, { passive: true });

    // Mobile toggle
    toggle?.addEventListener('click', () => {
      navLinks?.classList.toggle('open');
    });

    // Close mobile menu on link click
    navLinks?.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', () => navLinks.classList.remove('open'));
    });
  },

  updateActiveLink() {
    const sections = document.querySelectorAll('section[id]');
    const scrollPos = window.scrollY + 100;
    let current = '';

    sections.forEach(sec => {
      if (scrollPos >= sec.offsetTop) current = sec.id;
    });

    document.querySelectorAll('.nav-links a').forEach(a => {
      const href = a.getAttribute('href');
      a.classList.toggle('active', href === '#' + current);
    });
  }
};

// ============================================================
// CONTACT FORM
// ============================================================
const ContactForm = {
  init() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.submit(form);
    });
  },

  async submit(form) {
    const btn = form.querySelector('[type="submit"]');
    const feedback = document.getElementById('form-feedback');
    const origText = btn.innerHTML;

    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${Lang.t('form_sending')}`;
    if (feedback) { feedback.className = 'form-feedback'; feedback.textContent = ''; }

    try {
      const formData = new FormData(form);
      const res = await fetch('api/send_message.php', { method: 'POST', body: formData });
      const data = await res.json();

      if (data.success) {
        feedback.className = 'form-feedback success';
        feedback.textContent = Lang.t('form_success');
        form.reset();
      } else {
        const errors = {
          required_fields: Lang.t('form_error_required'),
          invalid_email: Lang.t('form_error_email'),
          rate_limit: Lang.t('form_error_rate'),
        };
        feedback.className = 'form-feedback error';
        feedback.textContent = errors[data.error] || Lang.t('form_error_server');
      }
    } catch(e) {
      if (feedback) {
        feedback.className = 'form-feedback error';
        feedback.textContent = Lang.t('form_error_server');
      }
    } finally {
      btn.disabled = false;
      btn.innerHTML = origText;
    }
  }
};

// ============================================================
// PARTICLES
// ============================================================
const Particles = {
  init() {
    const container = document.querySelector('.particles');
    if (!container) return;
    for (let i = 0; i < 30; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.cssText = `
        left: ${Math.random() * 100}%;
        width: ${Math.random() * 3 + 1}px;
        height: ${Math.random() * 3 + 1}px;
        animation-duration: ${Math.random() * 10 + 8}s;
        animation-delay: ${Math.random() * 10}s;
        background: ${Math.random() > 0.5 ? '#6c63ff' : '#00d4ff'};
        opacity: ${Math.random() * 0.6 + 0.1};
      `;
      container.appendChild(p);
    }
  }
};

// ============================================================
// COUNTER ANIMATION
// ============================================================
function animateCounter(el, target, duration = 2000) {
  const start = 0;
  const numericTarget = parseFloat(target.replace(/[^0-9.]/g, ''));
  const suffix = target.replace(/[0-9.]/g, '');
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = Math.round(start + (numericTarget - start) * eased);
    el.textContent = value + suffix;
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

// Observe stats section
const statsObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.querySelectorAll('[data-stat]').forEach(el => {
        animateCounter(el, el.textContent);
      });
      statsObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 });

// ============================================================
// VISUAL EFFECTS - Custom Cursor, Parallax, Tilt, Magnetic, etc.
// ============================================================
const VisualFX = {

  // ?? Cursor ??????????????????????????????????????????????
  dot: null,
  ring: null,
  mouseX: 0, mouseY: 0,
  ringX: 0,  ringY: 0,
  trailColors: ['#6c63ff','#00d4ff','#ff6b9d','#ffd700'],
  trailIdx: 0,
  lastTrail: 0,

  initCursor() {
    this.dot  = document.createElement('div'); this.dot.className  = 'cursor-dot';
    this.ring = document.createElement('div'); this.ring.className = 'cursor-ring';
    document.body.appendChild(this.dot);
    document.body.appendChild(this.ring);

    document.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      this.dot.style.left = e.clientX + 'px';
      this.dot.style.top  = e.clientY + 'px';

      // Neon trail
      const now = Date.now();
      if (now - this.lastTrail > 40) {
        this.spawnTrail(e.clientX, e.clientY);
        this.lastTrail = now;
      }
    }, { passive: true });

    document.addEventListener('mousedown', () => {
      this.dot.classList.add('click');
      this.ring.classList.add('click');
    });
    document.addEventListener('mouseup', () => {
      this.dot.classList.remove('click');
      this.ring.classList.remove('click');
    });

    // Hover detection
    document.addEventListener('mouseover', (e) => {
      const el = e.target.closest('a,button,.btn,.glass-card,.skill-badge,.social-link,.filter-btn');
      if (el) { this.dot.classList.add('hover'); this.ring.classList.add('hover'); }
      else     { this.dot.classList.remove('hover'); this.ring.classList.remove('hover'); }
    });

    this.animateCursor();
  },

  animateCursor() {
    // Smooth ring follows dot with lerp
    this.ringX += (this.mouseX - this.ringX) * 0.12;
    this.ringY += (this.mouseY - this.ringY) * 0.12;
    this.ring.style.left = this.ringX + 'px';
    this.ring.style.top  = this.ringY + 'px';
    requestAnimationFrame(() => this.animateCursor());
  },

  spawnTrail(x, y) {
    const t = document.createElement('div');
    t.className = 'trail-particle';
    t.style.left = x + 'px';
    t.style.top  = y + 'px';
    t.style.background = this.trailColors[this.trailIdx % this.trailColors.length];
    t.style.width  = (Math.random() * 5 + 3) + 'px';
    t.style.height = t.style.width;
    document.body.appendChild(t);
    this.trailIdx++;
    setTimeout(() => t.remove(), 600);
  },

  // ?? Scroll Progress Bar ??????????????????????????????????
  initScrollProgress() {
    const bar = document.createElement('div');
    bar.id = 'scroll-progress';
    document.body.appendChild(bar);
    window.addEventListener('scroll', () => {
      const pct = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
      bar.style.width = Math.min(pct, 100) + '%';
    }, { passive: true });
  },

  // ?? Hero Mouse Parallax ??????????????????????????????????
  initParallax() {
    const section = document.getElementById('hero');
    if (!section) return;
    const orbs = section.querySelectorAll('.hero-orb');
    document.addEventListener('mousemove', (e) => {
      const cx = window.innerWidth  / 2;
      const cy = window.innerHeight / 2;
      const dx = (e.clientX - cx) / cx;
      const dy = (e.clientY - cy) / cy;
      orbs.forEach((orb, i) => {
        const factor = (i + 1) * 18;
        orb.style.transform = `translate(${dx * factor}px, ${dy * factor}px)`;
      });
    }, { passive: true });
  },

  // ?? 3D Card Tilt ?????????????????????????????????????????
  initTilt() {
    const applyTilt = (card) => {
      card.classList.add('tilt-card');
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width  - 0.5) * 2;
        const y = ((e.clientY - rect.top)  / rect.height - 0.5) * 2;
        card.style.transform = `perspective(800px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) translateZ(4px)`;
        // Spotlight
        card.style.setProperty('--mouse-x', ((e.clientX - rect.left) / rect.width  * 100) + '%');
        card.style.setProperty('--mouse-y', ((e.clientY - rect.top)  / rect.height * 100) + '%');
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    };

    // Apply to service & project cards (delegated for dynamically loaded content)
    const observer = new MutationObserver(() => {
      document.querySelectorAll('.service-card:not(.tilt-card), .project-card:not(.tilt-card), .testimonial-card:not(.tilt-card)').forEach(applyTilt);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    // Initial static cards
    document.querySelectorAll('.glass-card').forEach(applyTilt);
  },

  // ?? Magnetic Buttons ?????????????????????????????????????
  initMagnetic() {
    const apply = (btn) => {
      if (btn.dataset.magnetic) return;
      btn.dataset.magnetic = '1';
      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const dx = (e.clientX - (rect.left + rect.width  / 2)) * 0.35;
        const dy = (e.clientY - (rect.top  + rect.height / 2)) * 0.35;
        btn.style.transform = `translate(${dx}px, ${dy}px)`;
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transform = '';
      });
    };

    const scanBtns = () => document.querySelectorAll('.btn-primary, .btn-outline, .btn-lg').forEach(apply);
    scanBtns();
    // Re-scan after dynamic content loads
    const obs = new MutationObserver(scanBtns);
    obs.observe(document.body, { childList: true, subtree: true });
  },

  // ?? Ripple on Click ??????????????????????????????????????
  initRipple() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn');
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const r = document.createElement('span');
      r.className = 'btn-ripple';
      const size = Math.max(rect.width, rect.height);
      r.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - rect.left - size/2}px;top:${e.clientY - rect.top - size/2}px`;
      btn.appendChild(r);
      r.addEventListener('animationend', () => r.remove());
    });
  },

  // ?? Glitch on Hero Title Hover ???????????????????????????
  initGlitch() {
    const title = document.getElementById('hero-title');
    if (!title) return;
    title.setAttribute('data-text', title.textContent);
    title.addEventListener('mouseenter', () => {
      title.classList.add('glitch');
      setTimeout(() => title.classList.remove('glitch'), 400);
    });
  },

  // ?? Stagger entrance for grid children ???????????????????
  triggerStagger(container) {
    const children = container.querySelectorAll('.stagger-child:not(.visible)');
    if (!children.length) return;
    children.forEach((el, i) => {
      setTimeout(() => el.classList.add('visible'), i * 70);
    });
  },

  initStagger() {
    const grids = ['#services-grid', '#projects-grid', '#skills-container'];

    const viewportObs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        this.triggerStagger(entry.target);
        viewportObs.unobserve(entry.target);
      });
    }, { threshold: 0.05 });

    // Watch for dynamic content injection into grid containers
    const mutObs = new MutationObserver(() => {
      grids.forEach(sel => {
        const container = document.querySelector(sel);
        if (!container) return;

        // Mark new cards with stagger-child, reset visible state
        container.querySelectorAll('.service-card, .project-card, .skill-badge').forEach(c => {
          c.classList.remove('visible');
          c.classList.add('stagger-child');
        });

        // Re-register with viewport observer (disconnect old first)
        viewportObs.unobserve(container);
        viewportObs.observe(container);

        // If already in viewport, trigger immediately
        const rect = container.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          setTimeout(() => this.triggerStagger(container), 60);
        }
      });
    });

    mutObs.observe(document.body, { childList: true, subtree: true });

    // Observe existing containers on init
    grids.forEach(sel => {
      const el = document.querySelector(sel);
      if (el) viewportObs.observe(el);
    });
  },

  init() {
    // Only on non-touch devices for cursor
    if (window.matchMedia('(pointer: fine)').matches) {
      this.initCursor();
      this.initParallax();
      this.initMagnetic();
    }
    this.initScrollProgress();
    this.initTilt();
    this.initRipple();
    this.initGlitch();
    this.initStagger();
  }
};

// ============================================================
// SMOOTH SCROLL
// ============================================================
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.querySelector(a.getAttribute('href'));
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

// ============================================================
// LOADING SCREEN
// ============================================================
function hideLoader() {
  const loader = document.getElementById('loading-screen');
  if (loader) {
    setTimeout(() => loader.classList.add('hidden'), 1500);
  }
}

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  // Set initial language from storage
  const savedLang = (localStorage.getItem('portfolio_lang') || localStorage.getItem('bigatech_lang')) || 'ar';
  await Lang.load('en');
  await Lang.load(savedLang);
  document.documentElement.lang = savedLang;
  document.body.dir = savedLang === 'ar' ? 'rtl' : 'ltr';
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === savedLang);
  });
  Lang.current = savedLang;
  Lang.updateUI();

  // Language button listeners
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => Lang.set(btn.dataset.lang));
  });

  // Slider controls
  document.getElementById('slider-prev')?.addEventListener('click', () => Slider.prev());
  document.getElementById('slider-next')?.addEventListener('click', () => Slider.next());

  // Scroll top button
  document.getElementById('scrollTop')?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Init modules
  Nav.init();
  Particles.init();
  Animations.init();
  ContactForm.init();
  VisualFX.init();

  // Load dynamic content
  await App.init();

  // Observe stats
  const statsSection = document.querySelector('.hero-stats');
  if (statsSection) statsObserver.observe(statsSection);

  // Hide loader
  hideLoader();
});
