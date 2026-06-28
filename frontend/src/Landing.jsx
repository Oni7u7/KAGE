import { useEffect, useRef, useState } from 'react'
import anime from 'animejs/lib/anime.es.js'
import { initBg3D } from './lib/bg3d'

/* ── SVG icon components ──────────────────────────────────────────────────── */

const IconKeyboard = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="6" width="20" height="13" rx="2" />
    <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h12" />
  </svg>
)

const IconCpu = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <rect x="9" y="9" width="6" height="6" />
    <line x1="9" y1="2" x2="9" y2="4" /><line x1="15" y1="2" x2="15" y2="4" />
    <line x1="9" y1="20" x2="9" y2="22" /><line x1="15" y1="20" x2="15" y2="22" />
    <line x1="2" y1="9" x2="4" y2="9" /><line x1="2" y1="15" x2="4" y2="15" />
    <line x1="20" y1="9" x2="22" y2="9" /><line x1="20" y1="15" x2="22" y2="15" />
  </svg>
)

const IconShieldCheck = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
)

const IconSend = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
)

const IconLock = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)

const IconLink = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
)

const IconCheck = ({ size = "0.8em" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const IconCircleDot = ({ size = "0.8em" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
  </svg>
)

const IconHexagon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polygon points="12 2 22 8 22 16 12 22 2 16 2 8" />
  </svg>
)

const IconLayers = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
)

const IconZap = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
)

const IconAtom = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    <path d="M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9-4.54-4.52-9.87-6.54-11.9-4.5-2.04 2.03-.02 7.36 4.5 11.9 4.54 4.52 9.87 6.54 11.9 4.5z" />
    <path d="M15.7 15.7c4.52-4.54 6.54-9.87 4.5-11.9-2.03-2.04-7.36-.02-11.9 4.5-4.52 4.54-6.54 9.87-4.5 11.9 2.03 2.04 7.36.02 11.9-4.5z" />
  </svg>
)

const IconWallet = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
    <path d="M4 6v12c0 1.1.9 2 2 2h14v-4" />
    <path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z" />
  </svg>
)

/* ── Landing page ─────────────────────────────────────────────────────────── */

export default function Landing({ onLaunch }) {
  const canvasRef = useRef(null)
  const [scrollPct, setScrollPct] = useState(0)

  /* ── 3D background canvas ──────────────────────────────────────────────── */
  useEffect(() => {
    if (!canvasRef.current) return
    const cleanup = initBg3D(canvasRef.current)
    return cleanup
  }, [])

  /* ── Scroll progress bar ───────────────────────────────────────────────── */
  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      setScrollPct(max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* ── Hero entrance ─────────────────────────────────────────────────────── */
  useEffect(() => {
    anime.timeline({ easing: 'easeOutExpo' })
      .add({ targets: '.hero-logo-big',    opacity: [0, 1], scale: [0.8, 1],    duration: 900 })
      .add({ targets: '.hero-eyebrow',     opacity: [0, 1], translateY: [24, 0], duration: 600 }, '-=500')
      .add({ targets: '.hero-headline',    opacity: [0, 1], translateY: [36, 0], duration: 750 }, '-=350')
      .add({ targets: '.hero-sub',         opacity: [0, 1], translateY: [24, 0], duration: 650 }, '-=350')
      .add({ targets: '.hero-actions',     opacity: [0, 1], translateY: [20, 0], duration: 550 }, '-=250')
      .add({
        targets: '.hero-chips .chip',
        opacity: [0, 1],
        translateY: [16, 0],
        delay: anime.stagger(90),
        duration: 500,
      }, '-=250')
  }, [])

  /* ── Aurora floating ───────────────────────────────────────────────────── */
  useEffect(() => {
    anime({
      targets: '.hero-aurora-a',
      translateX: ['-6%', '6%'],
      translateY: ['-5%', '7%'],
      scale: [1, 1.14],
      duration: 9000,
      loop: true,
      direction: 'alternate',
      easing: 'easeInOutSine',
    })
    anime({
      targets: '.hero-aurora-b',
      translateX: ['5%', '-7%'],
      translateY: ['4%', '-5%'],
      scale: [1.1, 0.9],
      duration: 11500,
      loop: true,
      direction: 'alternate',
      easing: 'easeInOutSine',
    })
    anime({
      targets: '.hero-aurora-c',
      translateX: ['-4%', '6%'],
      translateY: ['7%', '-6%'],
      scale: [0.88, 1.1],
      duration: 14000,
      loop: true,
      direction: 'alternate',
      easing: 'easeInOutSine',
    })
    anime({
      targets: '.cta-aurora-a',
      translateX: ['-5%', '5%'],
      translateY: ['-4%', '5%'],
      scale: [1, 1.1],
      duration: 10000,
      loop: true,
      direction: 'alternate',
      easing: 'easeInOutSine',
    })
    anime({
      targets: '.cta-aurora-b',
      translateX: ['4%', '-6%'],
      translateY: ['5%', '-4%'],
      scale: [1.08, 0.92],
      duration: 12000,
      loop: true,
      direction: 'alternate',
      easing: 'easeInOutSine',
    })
  }, [])

  /* ── Stats count-up ────────────────────────────────────────────────────── */
  useEffect(() => {
    const band = document.querySelector('.stats-band')
    if (!band) return

    const configs = [
      { selector: '.stat-num.cyan',   from: 0, to: 150, prefix: '$', suffix: 'B+' },
      { selector: '.stat-num.blue',   from: 0, to: 3,   prefix: '~', suffix: 's'  },
      { selector: '.stat-num.purple', from: 0, to: 100, prefix: '',  suffix: '%'  },
    ]

    configs.forEach(({ selector }) => {
      const el = band.querySelector(selector)
      if (el) el.style.opacity = '0'
    })

    // "CERO" stat is text-only, just fade it in
    const ceroEl = band.querySelector('.stat-num.green')
    if (ceroEl) ceroEl.style.opacity = '0'

    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      if (ceroEl) anime({ targets: ceroEl, opacity: [0,1], duration: 900, easing: 'easeOutExpo' })
      configs.forEach(({ selector, from, to, prefix, suffix }) => {
        const el = band.querySelector(selector)
        if (!el) return
        const counter = { val: from }
        anime({
          targets: counter,
          val: to,
          round: 1,
          duration: 1800,
          easing: 'easeOutExpo',
          update() {
            el.textContent = prefix + counter.val + suffix
            el.style.opacity = '1'
          },
        })
      })
      obs.disconnect()
    }, { threshold: 0.4 })

    obs.observe(band)
    return () => obs.disconnect()
  }, [])

  /* ── Scroll-reveal helper ──────────────────────────────────────────────── */
  useEffect(() => {
    /* Stagger a group of children when their container enters the viewport */
    const staggerGroup = (containerSel, childSel, staggerMs = 90) => {
      const container = document.querySelector(containerSel)
      if (!container) return
      const children = [...container.querySelectorAll(childSel)]
      children.forEach(el => { el.style.opacity = '0' })

      const obs = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) return
        anime({
          targets: children,
          opacity: [0, 1],
          translateY: [44, 0],
          delay: anime.stagger(staggerMs),
          duration: 750,
          easing: 'easeOutExpo',
        })
        obs.disconnect()
      }, { threshold: 0.1 })

      obs.observe(container)
      return () => obs.disconnect()
    }

    /* Fade-up individual elements independently */
    const fadeUp = (selector, delayMs = 0) => {
      const cleanups = [...document.querySelectorAll(selector)].map(el => {
        el.style.opacity = '0'
        const obs = new IntersectionObserver(([entry]) => {
          if (!entry.isIntersecting) return
          anime({ targets: el, opacity: [0, 1], translateY: [28, 0], delay: delayMs, duration: 700, easing: 'easeOutExpo' })
          obs.disconnect()
        }, { threshold: 0.2 })
        obs.observe(el)
        return () => obs.disconnect()
      })
      return () => cleanups.forEach(fn => fn?.())
    }

    const cleanups = [
      staggerGroup('.why-grid',  '.why-card',  130),
      staggerGroup('.how-grid',  '.how-card',  110),
      staggerGroup('.tech-grid', '.tech-card',  90),
      fadeUp('.section-eyebrow'),
      fadeUp('.section-title',  80),
      fadeUp('.section-sub',   160),
      fadeUp('.privacy-layout', 120),
      fadeUp('.data-layout',    120),
      fadeUp('.compare-wrap',   150),
    ]
    return () => cleanups.forEach(fn => fn?.())
  }, [])

  /* ── Bar fill animations ───────────────────────────────────────────────── */
  useEffect(() => {
    const bars = [...document.querySelectorAll('.bar-fill')]
    const targets = bars.map(bar => {
      const targetW = bar.style.width || '0%'
      bar.style.width = '0%'
      bar.dataset.target = targetW
      return bar
    })

    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return
        const bar = entry.target
        anime({
          targets: bar,
          width: bar.dataset.target,
          duration: 1100,
          easing: 'easeOutExpo',
          delay: 120,
        })
        obs.unobserve(bar)
      })
    }, { threshold: 0.6 })

    targets.forEach(bar => obs.observe(bar))
    return () => obs.disconnect()
  }, [])

  /* ── Compare table rows stagger ────────────────────────────────────────── */
  useEffect(() => {
    const rows = [...document.querySelectorAll('.compare-table tbody tr')]
    rows.forEach(r => { r.style.opacity = '0'; r.style.transform = 'translateX(-14px)' })

    const table = document.querySelector('.compare-table')
    if (!table) return

    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      anime({
        targets: rows,
        opacity: [0, 1],
        translateX: [-14, 0],
        delay: anime.stagger(60),
        duration: 480,
        easing: 'easeOutExpo',
      })
      obs.disconnect()
    }, { threshold: 0.15 })

    obs.observe(table)
    return () => obs.disconnect()
  }, [])

  /* ── Hero logo parallax ─────────────────────────────────────────────────── */
  useEffect(() => {
    const logo = document.querySelector('.hero-logo-big')
    if (!logo) return
    const onScroll = () => {
      const y = window.scrollY
      logo.style.transform = `translateY(${y * 0.12}px)`
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* ── Section title slide from left ─────────────────────────────────────── */
  useEffect(() => {
    const titles = [...document.querySelectorAll('.section-title')]
    titles.forEach(el => { el.style.opacity = '0'; el.style.transform = 'translateX(-24px)' })

    titles.forEach(el => {
      const obs = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) return
        anime({ targets: el, opacity: [0, 1], translateX: [-24, 0], duration: 700, delay: 80, easing: 'easeOutExpo' })
        obs.disconnect()
      }, { threshold: 0.3 })
      obs.observe(el)
    })
  }, [])

  /* ── Stats band cell pop ────────────────────────────────────────────────── */
  useEffect(() => {
    const cells = [...document.querySelectorAll('.stat-cell')]
    cells.forEach(c => { c.style.opacity = '0'; c.style.transform = 'translateY(16px)' })
    const band = document.querySelector('.stats-band')
    if (!band) return
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      anime({
        targets: cells,
        opacity: [0, 1],
        translateY: [16, 0],
        delay: anime.stagger(100),
        duration: 600,
        easing: 'easeOutExpo',
      })
      obs.disconnect()
    }, { threshold: 0.4 })
    obs.observe(band)
    return () => obs.disconnect()
  }, [])

  /* ── ZK circle pulse ───────────────────────────────────────────────────── */
  useEffect(() => {
    anime({
      targets: '.zk-circle',
      scale: [1, 1.07],
      duration: 2600,
      loop: true,
      direction: 'alternate',
      easing: 'easeInOutSine',
    })
  }, [])

  return (
    <div className="landing">
      <canvas ref={canvasRef} className="bg-3d-canvas" aria-hidden="true" />
      <div className="scroll-progress-bar" style={{ width: `${scrollPct}%` }} />
      <div className="bg-grid" />

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="land-nav">
        <div className="land-nav-inner">
          <img src="/kage-icon.png" alt="Kage" className="nav-logo" />
          <div className="nav-links">
            <a href="#como-funciona">Flujo</a>
            <a href="#privacidad">Privacidad</a>
            <a href="#datos">Datos</a>
            <a href="#tecnologia">Stack</a>
          </div>
          <button className="btn-nav-cta" onClick={onLaunch}>
            Lanzar App →
          </button>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
     
        <div className="hero-aurora hero-aurora-a" />
        <div className="hero-aurora hero-aurora-b" />
        <div className="hero-aurora hero-aurora-c" />
        <div className="land-hero-inner">
          <img src="/kage-logo.png" alt="Kage" className="hero-logo-big" />
          <p className="hero-eyebrow">KAGE · ZK REMITTANCES · STELLAR SOROBAN</p>
          <h1 className="hero-headline">
            Manda dinero<br />
            <span className="hero-accent">sin mostrar tu ID</span>
          </h1>
          <p className="hero-sub">
            Western Union sabe quién eres, cuánto mandas y a quién.
            Kage no. Y aun así puede probarle al banco que eres elegible.
          </p>
          <div className="hero-actions">
            <button className="btn-hero-primary" onClick={onLaunch}>
              Enviar remesa ahora
            </button>
            <a href="#como-funciona" className="btn-hero-ghost">
              Cómo funciona ↓
            </a>
          </div>
          <div className="hero-chips">
            <span className="chip chip-cyan">Circom + Groth16</span>
            <span className="chip chip-blue">Stellar Soroban</span>
            <span className="chip chip-green">snarkjs</span>
            <span className="chip chip-purple">Freighter Wallet</span>
          </div>
        </div>
      

      {/* ── Stats band ──────────────────────────────────────────────────── */}
      <div className="stats-band">
        <div className="stats-band-inner">
          <div className="stat-cell">
            <span className="stat-num cyan">$150B+</span>
            <span className="stat-desc">remesas a LATAM al año</span>
          </div>
          <div className="stat-sep" />
          <div className="stat-cell">
            <span className="stat-num green">CERO</span>
            <span className="stat-desc">datos personales expuestos</span>
          </div>
          <div className="stat-sep" />
          <div className="stat-cell">
            <span className="stat-num blue">~3s</span>
            <span className="stat-desc">para generar tu proof privado</span>
          </div>
          <div className="stat-sep" />
          <div className="stat-cell">
            <span className="stat-num purple">100%</span>
            <span className="stat-desc">verificable por cualquiera</span>
          </div>
        </div>
      </div>

      {/* ── Why Kage ────────────────────────────────────────────────────── */}
      <section className="land-section land-why">
        <div className="section-inner">
          <p className="section-eyebrow eyebrow-cyan">El problema</p>
          <h2 className="section-title">¿Por qué existe Kage?</h2>
          <p className="section-sub">
            Mandar dinero al extranjero siempre implica exponer datos.
            Hasta ahora.
          </p>
          <div className="why-grid">
            <div className="why-card why-bad">
              <div className="why-icon-row">
                <span className="why-x">✕</span>
                <h4>Con Western Union</h4>
              </div>
              <p>Te piden pasaporte. Guardan tus datos. Saben exactamente cuánto mandas y a quién.</p>
            </div>
            <div className="why-card why-bad">
              <div className="why-icon-row">
                <span className="why-x">✕</span>
                <h4>Con una transferencia normal en blockchain</h4>
              </div>
              <p>Tu wallet, el monto y el destinatario son públicos para siempre. Cualquiera puede verlos.</p>
            </div>
            <div className="why-card why-good">
              <div className="why-icon-row">
                <span className="why-check-big">✓</span>
                <h4>Con Kage</h4>
              </div>
              <p>Pruebas que tienes permiso de enviar. Sin mostrar quién eres. Todo verificable. Nada expuesto.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────── */}
      <section className="land-section land-how" id="como-funciona">
        <div className="section-inner">
          <p className="section-eyebrow eyebrow-blue">Flujo del protocolo</p>
          <h2 className="section-title">Cómo funciona Kage</h2>
          <p className="section-sub">
            4 pasos. Sin servidores que vean tus datos. Sin bancos que guarden tu historial.
          </p>
          <div className="how-grid">
            <div className="how-card">
              <div className="how-num blue-border">1</div>
              <div className="how-icon how-icon-blue"><IconKeyboard /></div>
              <h3>Tú decides qué compartir</h3>
              <p>
                Ingresas el monto y a quién enviarle.
                Eso es todo lo que necesitas hacer.
              </p>
              <div className="how-tag blue-tag">Local · Privado</div>
            </div>
            <div className="how-card">
              <div className="how-num cyan-border">2</div>
              <div className="how-icon how-icon-cyan"><IconCpu /></div>
              <h3>Tu teléfono hace la magia</h3>
              <p>
                Genera una prueba matemática que dice "esta persona cumple los requisitos"
                sin revelar quién es esa persona.
              </p>
              <div className="how-tag cyan-tag">Browser · Sin servidores</div>
            </div>
            <div className="how-card">
              <div className="how-num green-border">3</div>
              <div className="how-icon how-icon-green"><IconShieldCheck /></div>
              <h3>Stellar lo verifica</h3>
              <p>
                La blockchain confirma la prueba.
                Nadie tuvo que ver tu ID para hacerlo.
              </p>
              <div className="how-tag green-tag">Stellar · Soroban</div>
            </div>
            <div className="how-card">
              <div className="how-num purple-border">4</div>
              <div className="how-icon how-icon-purple"><IconSend /></div>
              <h3>El dinero llega</h3>
              <p>
                El USDC se transfiere. La transacción queda
                registrada públicamente. Tu identidad no.
              </p>
              <div className="how-tag purple-tag">USDC · Freighter</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Privacy breakdown ───────────────────────────────────────────── */}
      <section className="land-section land-privacy" id="privacidad">
        <div className="section-inner">
          <p className="section-eyebrow eyebrow-green">Privacidad real</p>
          <h2 className="section-title">Qué queda privado. Qué va on-chain.</h2>
          <p className="section-sub">
            La magia de los ZK-SNARKs: demostrar un hecho sin revelar
            el dato que lo prueba. Compliance sin sacrificar privacidad.
          </p>
          <div className="privacy-layout">
            <div className="privacy-col priv-col">
              <div className="privacy-col-head green-head">
                <span className="priv-icon"><IconLock /></span>
                <div>
                  <h3>Permanece privado</h3>
                  <p>Solo en tu dispositivo</p>
                </div>
              </div>
              <ul className="priv-list">
                <li><span className="priv-check green-check"><IconCheck /></span>Tu identidad real</li>
                <li><span className="priv-check green-check"><IconCheck /></span>Tu documento KYC</li>
                <li><span className="priv-check green-check"><IconCheck /></span>El monto exacto enviado</li>
                <li><span className="priv-check green-check"><IconCheck /></span>Mapeo wallet ↔ identidad</li>
                <li><span className="priv-check green-check"><IconCheck /></span>El hash KYC completo</li>
              </ul>
            </div>

            <div className="privacy-center">
              <div className="zk-circle">
                <span className="zk-label">ZK</span>
                <span className="zk-sub">SNARK</span>
              </div>
              <div className="zk-arrows">
                <span>← prueba →</span>
                <span className="zk-arrows-sub">sin revelar</span>
              </div>
            </div>

            <div className="privacy-col pub-col">
              <div className="privacy-col-head cyan-head">
                <span className="priv-icon"><IconLink /></span>
                <div>
                  <h3>Va on-chain</h3>
                  <p>Visible en Stellar Explorer</p>
                </div>
              </div>
              <ul className="priv-list">
                <li><span className="priv-check cyan-check"><IconCircleDot /></span>Commitment del proof</li>
                <li><span className="priv-check cyan-check"><IconCircleDot /></span>KYC verificado</li>
                <li><span className="priv-check cyan-check"><IconCircleDot /></span>Monto ≤ 10 000 USDC</li>
                <li><span className="priv-check cyan-check"><IconCircleDot /></span>Wallet no bloqueada</li>
                <li><span className="priv-check cyan-check"><IconCircleDot /></span>Hash de la transacción</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Data & Charts ───────────────────────────────────────────────── */}
      <section className="land-section land-data" id="datos">
        <div className="section-inner">
          <p className="section-eyebrow eyebrow-purple">Métricas</p>
          <h2 className="section-title">Datos del protocolo</h2>
          <p className="section-sub">
            Comparativa de privacidad y performance frente a las remesas tradicionales.
          </p>

          <div className="data-layout">

            {/* Donut chart */}
            <div className="data-donut-wrap">
              <div className="donut-chart">
                <div className="donut-ring" style={{ "--pct": "95" }} />
                <div className="donut-inner">
                  <span className="donut-pct">95%</span>
                  <span className="donut-label">privado</span>
                </div>
              </div>
              <p className="donut-caption">Datos protegidos por ZK proof</p>
              <div className="donut-legend">
                <span className="legend-dot green-dot" /> Datos privados (95%)
                <br />
                <span className="legend-dot muted-dot" /> On-chain (5%)
              </div>
            </div>

            {/* Bar charts */}
            <div className="data-bars-wrap">
              <h4 className="bars-title">Privacidad de datos</h4>
              <div className="bar-group">
                <div className="bar-row">
                  <span className="bar-label">Kage</span>
                  <div className="bar-track">
                    <div className="bar-fill bar-green" style={{ width: "95%" }} />
                  </div>
                  <span className="bar-val green">95%</span>
                </div>
                <div className="bar-row">
                  <span className="bar-label">Tradicional</span>
                  <div className="bar-track">
                    <div className="bar-fill bar-red" style={{ width: "15%" }} />
                  </div>
                  <span className="bar-val red">15%</span>
                </div>
              </div>

              <h4 className="bars-title" style={{ marginTop: "1.5rem" }}>Datos expuestos on-chain</h4>
              <div className="bar-group">
                <div className="bar-row">
                  <span className="bar-label">Kage</span>
                  <div className="bar-track">
                    <div className="bar-fill bar-cyan" style={{ width: "5%" }} />
                  </div>
                  <span className="bar-val cyan">5%</span>
                </div>
                <div className="bar-row">
                  <span className="bar-label">Tradicional</span>
                  <div className="bar-track">
                    <div className="bar-fill bar-muted" style={{ width: "85%" }} />
                  </div>
                  <span className="bar-val muted-text">85%</span>
                </div>
              </div>

              <h4 className="bars-title" style={{ marginTop: "1.5rem" }}>Checks de compliance en 1 proof</h4>
              <div className="bar-group">
                <div className="bar-row">
                  <span className="bar-label">KYC</span>
                  <div className="bar-track">
                    <div className="bar-fill bar-purple" style={{ width: "100%" }} />
                  </div>
                  <span className="bar-val purple"><IconCheck size="0.75em" /></span>
                </div>
                <div className="bar-row">
                  <span className="bar-label">AML</span>
                  <div className="bar-track">
                    <div className="bar-fill bar-purple" style={{ width: "100%" }} />
                  </div>
                  <span className="bar-val purple"><IconCheck size="0.75em" /></span>
                </div>
                <div className="bar-row">
                  <span className="bar-label">Blacklist</span>
                  <div className="bar-track">
                    <div className="bar-fill bar-purple" style={{ width: "100%" }} />
                  </div>
                  <span className="bar-val purple"><IconCheck size="0.75em" /></span>
                </div>
              </div>
            </div>
          </div>

          {/* Comparison table */}
          <div className="compare-wrap">
            <h3 className="compare-title">Kage vs Remesa tradicional</h3>
            <div className="compare-table-scroll">
              <table className="compare-table">
                <thead>
                  <tr>
                    <th>Característica</th>
                    <th className="th-trad">Tradicional</th>
                    <th className="th-kage">Kage</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>¿Saben quién eres?</strong></td>
                    <td className="td-bad">Sí (siempre)</td>
                    <td className="td-good">No (nunca)</td>
                  </tr>
                  <tr>
                    <td>Identidad on-chain</td>
                    <td className="td-bad">Expuesta</td>
                    <td className="td-good">Privada</td>
                  </tr>
                  <tr>
                    <td>Monto exacto público</td>
                    <td className="td-bad">Sí</td>
                    <td className="td-good">No (solo límite)</td>
                  </tr>
                  <tr>
                    <td>KYC verificado</td>
                    <td className="td-neutral">Centralizado</td>
                    <td className="td-good">On-chain, sin datos</td>
                  </tr>
                  <tr>
                    <td>AML cumplido</td>
                    <td className="td-neutral">Por el banco</td>
                    <td className="td-good">ZK proof verificable</td>
                  </tr>
                  <tr>
                    <td>Custodia de fondos</td>
                    <td className="td-bad">Banco (tercero)</td>
                    <td className="td-good">Self-custody</td>
                  </tr>
                  <tr>
                    <td>Resistencia a censura</td>
                    <td className="td-bad">Baja</td>
                    <td className="td-good">Alta</td>
                  </tr>
                  <tr>
                    <td>Comisión por envío</td>
                    <td className="td-bad">2 – 10 % del monto</td>
                    <td className="td-good">~0.001 XLM (fee de red)</td>
                  </tr>
                  <tr>
                    <td>Disponibilidad</td>
                    <td className="td-neutral">Horario bancario</td>
                    <td className="td-good">24 / 7 sin intermediarios</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ── Tech stack ──────────────────────────────────────────────────── */}
      <section className="land-section land-tech" id="tecnologia">
        <div className="section-inner">
          <p className="section-eyebrow eyebrow-cyan">Stack técnico</p>
          <h2 className="section-title">Tecnología detrás de Kage</h2>
          <p className="section-sub">
            Construido con las herramientas más robustas de ZK-proofs y blockchain modernas.
          </p>
          <div className="tech-grid">
            <div className="tech-card cyan-card">
              <span className="tech-card-sym"><IconHexagon /></span>
              <h4>Circom 2.0</h4>
              <p>Lenguaje para circuitos aritméticos ZK. Define las reglas del protocolo de privacidad.</p>
              <span className="tech-tag">Circuito · R1CS</span>
            </div>
            <div className="tech-card purple-card">
              <span className="tech-card-sym"><IconLayers /></span>
              <h4>Groth16</h4>
              <p>ZK-SNARK con proofs de 128 bytes y verificación en O(1). Setup de confianza: BLS12-381.</p>
              <span className="tech-tag">zk-SNARK · Pairing</span>
            </div>
            <div className="tech-card green-card">
              <span className="tech-card-sym"><IconShieldCheck /></span>
              <h4>Stellar Soroban</h4>
              <p>Smart contracts en Rust para verificación on-chain del proof y ejecución de USDC.</p>
              <span className="tech-tag">Rust · WASM</span>
            </div>
            <div className="tech-card blue-card">
              <span className="tech-card-sym"><IconZap /></span>
              <h4>snarkjs</h4>
              <p>Biblioteca JS para generar proofs Groth16 directamente en el browser. Sin servidores.</p>
              <span className="tech-tag">Browser · WASM</span>
            </div>
            <div className="tech-card orange-card">
              <span className="tech-card-sym"><IconAtom /></span>
              <h4>BLS12-381</h4>
              <p>Curva elíptica optimizada para pairing-based cryptography y ZK-proofs eficientes.</p>
              <span className="tech-tag">Elliptic Curve</span>
            </div>
            <div className="tech-card pink-card">
              <span className="tech-card-sym"><IconWallet /></span>
              <h4>Freighter</h4>
              <p>Wallet de Stellar para signing de transacciones USDC. Compatible con dApps Soroban.</p>
              <span className="tech-tag">Wallet · Stellar</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="land-section land-cta">
        <div className="cta-aurora cta-aurora-a" />
        <div className="cta-aurora cta-aurora-b" />
        <div className="section-inner cta-inner">
          <img src="/kage-logo.png" alt="Kage" className="cta-logo" />
          <h2 className="cta-title">Pruébalo ahora en Stellar Testnet</h2>
          <p className="cta-sub">
            No se requiere cuenta real. Usa Freighter en testnet y experimenta
            remesas privadas con ZK-proofs en acción.
          </p>
          <ul className="cta-checklist">
            <li><span className="cta-check">✓</span> Instala la extensión <strong>Freighter</strong> en tu navegador</li>
            <li><span className="cta-check">✓</span> Cambia a <strong>Stellar Testnet</strong> en los ajustes de Freighter</li>
            <li><span className="cta-check">✓</span> Fondea tu cuenta con XLM testnet en <strong>friendbot.stellar.org</strong></li>
            <li><span className="cta-check">✓</span> Abre Kage y sigue los 4 pasos — listo</li>
          </ul>
          <button className="btn-hero-primary cta-launch-btn" onClick={onLaunch}>
            Lanzar la App →
          </button>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="land-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <img src="/kage-logo.png" alt="Kage" className="footer-logo" />
            <p>Remesas privadas con ZK-proofs on-chain en Stellar Soroban.</p>
            <div className="footer-badges">
              <span className="fbadge"><IconHexagon /> Stellar Testnet</span>
              <span className="fbadge"><IconLayers /> Groth16</span>
              <span className="fbadge"><IconLock /> ZK-SNARK</span>
            </div>
          </div>
          <div className="footer-links">
            <div className="footer-col">
              <h5>Protocolo</h5>
              <a href="#como-funciona">Cómo funciona</a>
              <a href="#privacidad">Privacidad</a>
              <a href="#datos">Métricas</a>
              <a href="#tecnologia">Stack técnico</a>
            </div>
            <div className="footer-col">
              <h5>Stack</h5>
              <span>Circom + Groth16</span>
              <span>Stellar Soroban</span>
              <span>snarkjs · Freighter</span>
              <span>BLS12-381</span>
            </div>
            <div className="footer-col">
              <h5>Red</h5>
              <span>Stellar Testnet</span>
              <span>USDC (testnet)</span>
              <span>Soroban RPC</span>
            </div>
            <div className="footer-col">
              <h5>Recursos</h5>
              <a href="https://freighter.app" target="_blank" rel="noopener noreferrer">Freighter Wallet</a>
              <a href="https://friendbot.stellar.org" target="_blank" rel="noopener noreferrer">Stellar Friendbot</a>
              <a href="https://stellar.expert/explorer/testnet" target="_blank" rel="noopener noreferrer">Stellar Explorer</a>
              <a href="https://docs.circom.io" target="_blank" rel="noopener noreferrer">Circom Docs</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2025 Kage · Remesas privadas con ZK-proofs</span>
          <button className="footer-cta-btn" onClick={onLaunch}>
            Abrir App →
          </button>
        </div>
      </footer>

    </div>
  );
}
