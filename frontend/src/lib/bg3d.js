/* ── Scroll-driven 3D wireframe background ─────────────────────────────────
   Each landing section reveals a different wireframe shape.
   Shapes cross-fade as the user scrolls between sections.
   ─────────────────────────────────────────────────────────────────────────── */

// ── 3D math helpers ──────────────────────────────────────────────────────────

function rotY([x, y, z], a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [x * c + z * s, y, -x * s + z * c];
}

function rotX([x, y, z], a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [x, y * c - z * s, y * s + z * c];
}

function project([x, y, z], cx, cy, scale) {
  const fov = 4.5;
  const d = z + fov;
  if (d <= 0) return [cx, cy];
  return [cx + (x / d) * scale * fov, cy + (y / d) * scale * fov];
}

// ── Shape edge builders ───────────────────────────────────────────────────────

function cylinderEdges(r, h, N) {
  const e = [];
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * Math.PI * 2;
    const a1 = ((i + 1) / N) * Math.PI * 2;
    const [c0, s0] = [Math.cos(a0), Math.sin(a0)];
    const [c1, s1] = [Math.cos(a1), Math.sin(a1)];
    e.push([[r * c0, -h / 2, r * s0], [r * c1, -h / 2, r * s1]]); // top ring
    e.push([[r * c0,  h / 2, r * s0], [r * c1,  h / 2, r * s1]]); // bottom ring
    if (i % 2 === 0) {
      e.push([[r * c0, -h / 2, r * s0], [r * c0, h / 2, r * s0]]); // struts
    }
  }
  // Mid ring
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * Math.PI * 2;
    const a1 = ((i + 1) / N) * Math.PI * 2;
    e.push([[r * Math.cos(a0), 0, r * Math.sin(a0)], [r * Math.cos(a1), 0, r * Math.sin(a1)]]);
  }
  return e;
}

function torusEdges(R, r, Nr, Np) {
  const e = [];
  const pt = (theta, phi) => [
    (R + r * Math.cos(phi)) * Math.cos(theta),
    r * Math.sin(phi),
    (R + r * Math.cos(phi)) * Math.sin(theta),
  ];
  for (let i = 0; i < Nr; i++) {
    const t0 = (i / Nr) * Math.PI * 2;
    const t1 = ((i + 1) / Nr) * Math.PI * 2;
    for (let j = 0; j < Np; j++) {
      const p0 = (j / Np) * Math.PI * 2;
      const p1 = ((j + 1) / Np) * Math.PI * 2;
      e.push([pt(t0, p0), pt(t0, p1)]); // tube circles
      e.push([pt(t0, p0), pt(t1, p0)]); // outer rings
    }
  }
  return e;
}

function cubeEdges(s) {
  const h = s / 2;
  const v = [
    [-h, -h, -h], [h, -h, -h], [h,  h, -h], [-h,  h, -h],
    [-h, -h,  h], [h, -h,  h], [h,  h,  h], [-h,  h,  h],
  ];
  return [
    [v[0], v[1]], [v[1], v[2]], [v[2], v[3]], [v[3], v[0]],
    [v[4], v[5]], [v[5], v[6]], [v[6], v[7]], [v[7], v[4]],
    [v[0], v[4]], [v[1], v[5]], [v[2], v[6]], [v[3], v[7]],
  ];
}

function icosahedronEdges(r) {
  const phi = (1 + Math.sqrt(5)) / 2;
  const n = 1 / Math.sqrt(1 + phi * phi);
  const a = n * r, b = phi * n * r;
  const vs = [
    [ 0,  a,  b], [ 0, -a,  b], [ 0,  a, -b], [ 0, -a, -b],
    [ a,  b,  0], [-a,  b,  0], [ a, -b,  0], [-a, -b,  0],
    [ b,  0,  a], [-b,  0,  a], [ b,  0, -a], [-b,  0, -a],
  ];
  const d = (i, j) => Math.hypot(vs[i][0]-vs[j][0], vs[i][1]-vs[j][1], vs[i][2]-vs[j][2]);
  let minD = Infinity;
  for (let i = 0; i < 12; i++) for (let j = i + 1; j < 12; j++) minD = Math.min(minD, d(i, j));
  const eps = minD * 0.12;
  const edges = [];
  for (let i = 0; i < 12; i++) for (let j = i + 1; j < 12; j++) {
    if (d(i, j) < minD + eps) edges.push([vs[i], vs[j]]);
  }
  return edges;
}

function octahedronEdges(r) {
  const v = [[r,0,0],[-r,0,0],[0,r,0],[0,-r,0],[0,0,r],[0,0,-r]];
  const edges = [];
  for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) {
    if (!((i===0&&j===1)||(i===2&&j===3)||(i===4&&j===5))) {
      edges.push([v[i], v[j]]);
    }
  }
  return edges;
}

// ── Precomputed shapes ────────────────────────────────────────────────────────

const SHAPES = {
  cylinder:    cylinderEdges(0.7, 1.6, 14),
  torus:       torusEdges(0.82, 0.26, 12, 8),
  cube:        cubeEdges(1.3),
  icosahedron: icosahedronEdges(0.95),
  octahedron:  octahedronEdges(0.9),
};

// ── Section config: which shape + color to show at each scroll fraction ───────
// Fractions match approximate positions of landing sections

const SECTIONS = [
  { at: 0.00, shape: 'cylinder',    color: '#c9a85c' }, // Hero
  { at: 0.14, shape: 'cube',        color: '#b87a8e' }, // Stats + Why
  { at: 0.30, shape: 'torus',       color: '#7aaa8c' }, // How it works
  { at: 0.48, shape: 'icosahedron', color: '#7e9ab8' }, // Privacy
  { at: 0.64, shape: 'octahedron',  color: '#c9a85c' }, // Data
  { at: 0.80, shape: 'torus',       color: '#b87a8e' }, // Tech stack
  { at: 0.93, shape: 'cylinder',    color: '#7aaa8c' }, // CTA
];

// ── Draw helpers ──────────────────────────────────────────────────────────────

function drawShape(ctx, edges, cx, cy, ryA, rxA, scale, color, alpha) {
  if (alpha < 0.005) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  for (const [a, b] of edges) {
    const ra = rotX(rotY(a, ryA), rxA);
    const rb = rotX(rotY(b, ryA), rxA);
    const pa = project(ra, cx, cy, scale);
    const pb = project(rb, cx, cy, scale);
    ctx.moveTo(pa[0], pa[1]);
    ctx.lineTo(pb[0], pb[1]);
  }
  ctx.stroke();
  ctx.restore();
}

// Smoothstep
function smoothstep(t) { return t * t * (3 - 2 * t); }

// ── App background: floating geometric shapes (no scroll) ─────────────────────

export function initAppBg3D(canvasEl, { mode = 'form' } = {}) {
  let W, H, raf, t = 0;
  const ctx = canvasEl.getContext('2d');

  function resize() {
    W = canvasEl.width  = window.innerWidth;
    H = canvasEl.height = window.innerHeight;
  }
  resize();

  const onResize = () => resize();
  window.addEventListener('resize', onResize);

  // px/py = viewport fraction, rs = Y rotation speed, rx = X oscillation speed
  // off = phase offset, sf = scale factor relative to min(W,H)
  const formConfig = [
    { shape: 'cylinder',   px: 0.86, py: 0.18, rs: 1.1, rx: 0.9, off: 0.0, color: '#c9a85c', alpha: 0.20, sf: 0.13 },
    { shape: 'octahedron', px: 0.10, py: 0.75, rs: 0.8, rx: 0.7, off: 2.0, color: '#7aaa8c', alpha: 0.16, sf: 0.10 },
    { shape: 'cube',       px: 0.90, py: 0.80, rs: 0.6, rx: 0.5, off: 4.3, color: '#7e9ab8', alpha: 0.12, sf: 0.08 },
  ];

  const successConfig = [
    { shape: 'icosahedron', px: 0.10, py: 0.16, rs: 1.0, rx: 0.8, off: 0.0, color: '#7aaa8c', alpha: 0.24, sf: 0.14 },
    { shape: 'torus',       px: 0.90, py: 0.18, rs: 0.7, rx: 1.1, off: 1.5, color: '#c9a85c', alpha: 0.22, sf: 0.13 },
    { shape: 'cylinder',    px: 0.84, py: 0.82, rs: 0.9, rx: 0.6, off: 3.1, color: '#7e9ab8', alpha: 0.18, sf: 0.11 },
    { shape: 'octahedron',  px: 0.12, py: 0.84, rs: 1.2, rx: 0.9, off: 5.0, color: '#b87a8e', alpha: 0.15, sf: 0.09 },
  ];

  const configs = mode === 'success' ? successConfig : formConfig;

  function render() {
    ctx.clearRect(0, 0, W, H);
    t += 0.007;

    for (const cfg of configs) {
      const cx    = W * cfg.px;
      const cy    = H * cfg.py;
      const scale = Math.min(W, H) * cfg.sf;
      const ryA   = t * cfg.rs + cfg.off;
      const rxA   = Math.sin(t * cfg.rx * 0.38 + cfg.off) * 0.32;
      drawShape(ctx, SHAPES[cfg.shape], cx, cy, ryA, rxA, scale, cfg.color, cfg.alpha);
    }

    raf = requestAnimationFrame(render);
  }
  render();

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', onResize);
  };
}

// ── Landing page init function ────────────────────────────────────────────────

export function initBg3D(canvasEl) {
  let W, H, raf, t = 0, scrollPct = 0;
  const ctx = canvasEl.getContext('2d');

  function resize() {
    W = canvasEl.width  = window.innerWidth;
    H = canvasEl.height = window.innerHeight;
  }
  resize();

  const onResize = () => resize();
  const onScroll = () => {
    const maxS = document.documentElement.scrollHeight - window.innerHeight;
    scrollPct = maxS > 0 ? Math.min(1, window.scrollY / maxS) : 0;
  };

  window.addEventListener('resize', onResize);
  window.addEventListener('scroll', onScroll, { passive: true });

  function render() {
    ctx.clearRect(0, 0, W, H);
    t += 0.007;

    // Determine active section + next
    let cur = SECTIONS[0], nxt = SECTIONS[1] || SECTIONS[0], blend = 0;
    for (let i = 0; i < SECTIONS.length; i++) {
      if (scrollPct >= SECTIONS[i].at) {
        cur = SECTIONS[i];
        nxt = SECTIONS[i + 1] || SECTIONS[i];
        const span = (nxt.at - cur.at) || 0.07;
        blend = Math.min(1, (scrollPct - cur.at) / span);
      }
    }
    blend = smoothstep(blend);

    // Shape position: right side, vertically centered
    const cx = W * 0.76;
    const cy = H * 0.50;
    const scale = Math.min(W, H) * 0.195;

    // Gentle rocking on X axis
    const rxA = Math.sin(t * 0.38) * 0.28;

    const MAX_ALPHA = 0.20;

    if (cur.shape !== nxt.shape) {
      drawShape(ctx, SHAPES[cur.shape], cx, cy, t,          rxA, scale, cur.color, MAX_ALPHA * (1 - blend));
      drawShape(ctx, SHAPES[nxt.shape], cx, cy, t * 1.08,   rxA, scale, nxt.color, MAX_ALPHA * blend);
    } else {
      drawShape(ctx, SHAPES[cur.shape], cx, cy, t, rxA, scale, cur.color, MAX_ALPHA);
    }

    raf = requestAnimationFrame(render);
  }
  render();

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('scroll', onScroll);
  };
}
