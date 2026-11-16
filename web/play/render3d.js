// 街頭格鬥 Street Fight 3D — WebGL2 renderer (mirrors Renderer3D.kt on Android, same shaders & geometry)
'use strict';

const K = 1 / 30;                       // world metres per game pixel
const WX = x => (x - 192) * K;
const WY = y => (G.FLOOR - y) * K;

// ------------------------------------------------------------------ math (column-major mat4)
const M4 = {
  ident(o) { o.fill(0); o[0] = o[5] = o[10] = o[15] = 1; return o; },
  mul(o, a, b) {
    for (let c = 0; c < 4; c++) {
      const b0 = b[c * 4], b1 = b[c * 4 + 1], b2 = b[c * 4 + 2], b3 = b[c * 4 + 3];
      for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b0 + a[4 + r] * b1 + a[8 + r] * b2 + a[12 + r] * b3;
    }
    return o;
  },
  persp(o, fovy, asp, n, f) {
    const t = 1 / Math.tan(fovy / 2); o.fill(0);
    o[0] = t / asp; o[5] = t; o[10] = (f + n) / (n - f); o[11] = -1; o[14] = 2 * f * n / (n - f); return o;
  },
  ortho(o, l, r, b, t, n, f) {
    o.fill(0);
    o[0] = 2 / (r - l); o[5] = 2 / (t - b); o[10] = -2 / (f - n);
    o[12] = -(r + l) / (r - l); o[13] = -(t + b) / (t - b); o[14] = -(f + n) / (f - n); o[15] = 1; return o;
  },
  lookAt(o, ex, ey, ez, cx, cy, cz, ux, uy, uz) {
    let zx = ex - cx, zy = ey - cy, zz = ez - cz; let l = Math.hypot(zx, zy, zz); zx /= l; zy /= l; zz /= l;
    let xx = uy * zz - uz * zy, xy = uz * zx - ux * zz, xz = ux * zy - uy * zx; l = Math.hypot(xx, xy, xz); xx /= l; xy /= l; xz /= l;
    const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    o[0] = xx; o[1] = yx; o[2] = zx; o[3] = 0;
    o[4] = xy; o[5] = yy; o[6] = zy; o[7] = 0;
    o[8] = xz; o[9] = yz; o[10] = zz; o[11] = 0;
    o[12] = -(xx * ex + xy * ey + xz * ez); o[13] = -(yx * ex + yy * ey + yz * ez); o[14] = -(zx * ex + zy * ey + zz * ez); o[15] = 1;
    return o;
  },
  basis(o, ax, ay, az, bx, by, bz, cx, cy, cz, tx, ty, tz) {
    o[0] = ax; o[1] = ay; o[2] = az; o[3] = 0; o[4] = bx; o[5] = by; o[6] = bz; o[7] = 0;
    o[8] = cx; o[9] = cy; o[10] = cz; o[11] = 0; o[12] = tx; o[13] = ty; o[14] = tz; o[15] = 1; return o;
  }
};
/** Normal matrix = inverse-transpose of the upper 3x3 = [c1×c2, c2×c0, c0×c1] / det. */
function normalMat(o, m) {
  const ax = m[0], ay = m[1], az = m[2], bx = m[4], by = m[5], bz = m[6], cx = m[8], cy = m[9], cz = m[10];
  const x0 = by * cz - bz * cy, y0 = bz * cx - bx * cz, z0 = bx * cy - by * cx;
  const x1 = cy * az - cz * ay, y1 = cz * ax - cx * az, z1 = cx * ay - cy * ax;
  const x2 = ay * bz - az * by, y2 = az * bx - ax * bz, z2 = ax * by - ay * bx;
  let det = ax * x0 + ay * y0 + az * z0; det = det === 0 ? 1 : 1 / det;
  o[0] = x0 * det; o[1] = y0 * det; o[2] = z0 * det; o[3] = x1 * det; o[4] = y1 * det; o[5] = z1 * det; o[6] = x2 * det; o[7] = y2 * det; o[8] = z2 * det;
  return o;
}
function lin(hex, mul = 1) { return [Math.pow(((hex >> 16) & 255) / 255, 2.2) * mul, Math.pow(((hex >> 8) & 255) / 255, 2.2) * mul, Math.pow((hex & 255) / 255, 2.2) * mul]; }
function seededRandom(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

// ------------------------------------------------------------------ geometry
function geoLathe(prof, seg, closed) {
  const n = prof.length, pos = [], nor = [], uv = [], idx = [];
  for (let i = 0; i < n; i++) {
    const ip = closed ? (i - 1 + n) % n : Math.max(i - 1, 0), inx = closed ? (i + 1) % n : Math.min(i + 1, n - 1);
    let tr = prof[inx][0] - prof[ip][0], ty = prof[inx][1] - prof[ip][1];
    let nr = ty, ny = -tr; const l = Math.hypot(nr, ny) || 1; nr /= l; ny /= l;
    for (let j = 0; j <= seg; j++) {
      const a = j / seg * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      pos.push(prof[i][0] * c, prof[i][1], prof[i][0] * s);
      nor.push(nr * c, ny, nr * s);
      uv.push(j / seg, i / (n - 1));
    }
  }
  const rows = closed ? n : n - 1;
  for (let i = 0; i < rows; i++) {
    const i2 = (i + 1) % n;
    for (let j = 0; j < seg; j++) {
      const a = i * (seg + 1) + j, b = a + 1, c = i2 * (seg + 1) + j, d = c + 1;
      idx.push(a, c, d, a, d, b);
    }
  }
  return { pos, nor, uv, idx };
}
function profSphere(n) { const p = []; for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + Math.PI * i / n; p.push([Math.cos(a), Math.sin(a)]); } return p; }
/** Tapered capsule from y=0 (radius r1) to y=L (radius r2) with an optional mid bulge. */
function profCapsule(L, r1, r2, bulge) {
  const p = [];
  for (let i = 0; i <= 6; i++) { const a = -Math.PI / 2 + Math.PI / 2 * i / 6; p.push([r1 * Math.cos(a), r1 * Math.sin(a)]); }
  for (let i = 1; i < 8; i++) { const t = i / 8; p.push([r1 + (r2 - r1) * t + bulge * Math.sin(Math.PI * t), L * t]); }
  for (let i = 0; i <= 6; i++) { const a = Math.PI / 2 * i / 6; p.push([r2 * Math.cos(a), L + r2 * Math.sin(a)]); }
  return p;
}
function profTorus(r, n) { const p = []; for (let i = 0; i < n; i++) { const a = -Math.PI + 2 * Math.PI * i / n; p.push([1 + r * Math.cos(a), r * Math.sin(a)]); } return p; }
function geoBox() {
  const g = { pos: [], nor: [], uv: [], idx: [] };
  const face = (nx, ny, nz, ux, uy, uz, vx, vy, vz) => {
    const b = g.pos.length / 3;
    const cs = [[-1, -1, 0, 0], [1, -1, 1, 0], [1, 1, 1, 1], [-1, 1, 0, 1]];
    for (const [su, sv, tu, tv] of cs) {
      g.pos.push(0.5 * (nx + su * ux + sv * vx), 0.5 * (ny + su * uy + sv * vy), 0.5 * (nz + su * uz + sv * vz));
      g.nor.push(nx, ny, nz); g.uv.push(tu, tv);
    }
    g.idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  };
  face(0, 0, 1, 1, 0, 0, 0, 1, 0); face(0, 0, -1, -1, 0, 0, 0, 1, 0);
  face(1, 0, 0, 0, 0, -1, 0, 1, 0); face(-1, 0, 0, 0, 0, 1, 0, 1, 0);
  face(0, 1, 0, 1, 0, 0, 0, 0, -1); face(0, -1, 0, 1, 0, 0, 0, 0, 1);
  return g;
}
function geoQuad() { return { pos: [-.5, -.5, 0, .5, -.5, 0, .5, .5, 0, -.5, .5, 0], nor: [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1], uv: [0, 0, 1, 0, 1, 1, 0, 1], idx: [0, 1, 2, 0, 2, 3] }; }
function geoGround() { return { pos: [-.5, 0, .5, .5, 0, .5, .5, 0, -.5, -.5, 0, -.5], nor: [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], uv: [0, 0, 1, 0, 1, 1, 0, 1], idx: [0, 1, 2, 0, 2, 3] }; }

// ------------------------------------------------------------------ shaders (identical GLSL ES 3.00 source is used on Android)
const VS_LIT = `#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNor;
layout(location=2) in vec2 aUv;
uniform mat4 uVP;
uniform mat4 uModel;
uniform mat3 uNrm;
uniform mat4 uLVP;
out vec3 vPos;
out vec3 vNor;
out vec2 vUv;
out vec4 vLs;
void main() {
  vec4 w = uModel * vec4(aPos, 1.0);
  vPos = w.xyz; vNor = uNrm * aNor; vUv = aUv; vLs = uLVP * w;
  gl_Position = uVP * w;
}`;
const FS_LIT = `#version 300 es
precision highp float;
precision highp sampler2DShadow;
in vec3 vPos;
in vec3 vNor;
in vec2 vUv;
in vec4 vLs;
uniform vec3 uCol;
uniform float uRough;
uniform float uMetal;
uniform vec3 uEmis;
uniform sampler2D uTex;
uniform sampler2D uTex2;
uniform int uTexMode;
uniform vec4 uUvXf;
uniform float uFlash;
uniform vec3 uCam;
uniform vec3 uKeyDir;
uniform vec3 uKeyCol;
uniform vec3 uRimDir;
uniform vec3 uRimCol;
uniform vec3 uSky;
uniform vec3 uGnd;
uniform vec4 uPL[5];
uniform vec3 uPC[5];
uniform sampler2DShadow uShadow;
uniform float uTexel;
uniform vec3 uFog;
uniform float uFogD;
uniform float uExpo;
out vec4 oCol;
float shadowAt() {
  vec3 p = vLs.xyz / vLs.w * 0.5 + 0.5;
  if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0 || p.z > 1.0) return 1.0;
  float s = 0.0;
  for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++)
    s += texture(uShadow, vec3(p.xy + vec2(float(i), float(j)) * uTexel, p.z - 0.0012));
  return s / 9.0;
}
vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
void main() {
  vec2 uv = vUv * uUvXf.xy + uUvXf.zw;
  if (uTexMode == 3) { oCol = vec4(texture(uTex, uv).rgb * uCol, 1.0); return; }
  vec3 N = normalize(vNor);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(uCam - vPos);
  vec3 alb = uCol;
  vec3 emis = uEmis;
  if (uTexMode == 1 || uTexMode == 2) alb *= pow(texture(uTex, uv).rgb, vec3(2.2));
  if (uTexMode == 2) emis += pow(texture(uTex2, uv).rgb, vec3(2.2)) * 2.6;
  if (uTexMode == 4) emis += pow(texture(uTex, uv).rgb, vec3(2.2)) * 3.2;
  float shin = mix(96.0, 6.0, uRough);
  float norm = (shin + 8.0) / 25.0;
  vec3 spec0 = mix(vec3(0.04), alb, uMetal);
  vec3 dif = alb * (1.0 - uMetal);
  float nl = max(dot(N, uKeyDir), 0.0);
  vec3 H = normalize(uKeyDir + V);
  vec3 col = (dif + spec0 * pow(max(dot(N, H), 0.0), shin) * norm) * nl * uKeyCol * shadowAt();
  float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  float rimW = max(dot(N, uRimDir) * 0.6 + 0.4, 0.0);
  col += uRimCol * (dif * max(dot(N, uRimDir), 0.0) + fres * rimW * (0.25 + (1.0 - uRough) * 0.7));
  col += dif * mix(uGnd, uSky, N.y * 0.5 + 0.5);
  for (int i = 0; i < 5; i++) {
    vec3 d = uPL[i].xyz - vPos;
    float dist = length(d);
    float a = clamp(1.0 - dist / max(uPL[i].w, 0.001), 0.0, 1.0);
    if (a > 0.0) {
      a *= a;
      vec3 l = d / dist;
      float n2 = max(dot(N, l), 0.0);
      vec3 h2 = normalize(l + V);
      col += uPC[i] * a * n2 * (dif + spec0 * pow(max(dot(N, h2), 0.0), shin) * norm);
    }
  }
  col += emis;
  col = mix(col, vec3(4.0, 4.0, 3.6), uFlash);
  float fd = length(vPos - uCam);
  float f = 1.0 - exp(-uFogD * uFogD * fd * fd);
  col = mix(col, uFog, clamp(f, 0.0, 1.0));
  col = aces(col * uExpo);
  oCol = vec4(pow(col, vec3(1.0 / 2.2)), 1.0);
}`;
const VS_DEPTH = `#version 300 es
layout(location=0) in vec3 aPos;
uniform mat4 uLVP;
uniform mat4 uModel;
void main() { gl_Position = uLVP * uModel * vec4(aPos, 1.0); }`;
const FS_DEPTH = `#version 300 es
precision mediump float;
out vec4 oCol;
void main() { oCol = vec4(1.0); }`;
const VS_SPR = `#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec2 aUv;
layout(location=2) in vec4 aCol;
uniform mat4 uVP;
out vec2 vUv;
out vec4 vCol;
void main() { vUv = aUv; vCol = aCol; gl_Position = uVP * vec4(aPos, 1.0); }`;
const FS_SPR = `#version 300 es
precision mediump float;
in vec2 vUv;
in vec4 vCol;
uniform sampler2D uTex;
out vec4 oCol;
void main() { oCol = vec4(vCol.rgb, vCol.a * texture(uTex, vUv).a); }`;

// ------------------------------------------------------------------ procedural textures (same recipes as StageTex.kt)
function canvasOf(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
const TexPaint = {
  asphalt() {
    const [c, g] = canvasOf(512, 512); const r = seededRandom(11);
    g.fillStyle = '#2e2634'; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 40; i++) { g.fillStyle = r() < 0.5 ? 'rgba(20,14,26,0.18)' : 'rgba(90,76,96,0.12)'; const s = 30 + r() * 90; g.beginPath(); g.ellipse(r() * 512, r() * 512, s, s * (0.4 + r() * 0.6), r() * 3, 0, 7); g.fill(); }
    for (let i = 0; i < 9000; i++) { const v = r(); g.fillStyle = v < 0.5 ? '#2a2230' : (v < 0.9 ? '#4d4252' : '#6e6272'); g.fillRect(Math.floor(r() * 512), Math.floor(r() * 512), 1 + (r() < 0.2 ? 1 : 0), 1); }
    g.strokeStyle = 'rgba(16,10,20,0.75)'; g.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) { let x = r() * 512, y = r() * 512; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 7; k++) { x += (r() - 0.5) * 60; y += (r() - 0.5) * 60; g.lineTo(x, y); } g.stroke(); }
    return c;
  },
  sidewalk() {
    const [c, g] = canvasOf(256, 256); const r = seededRandom(5);
    for (let ty = 0; ty < 2; ty++) for (let tx = 0; tx < 2; tx++) {
      const v = 84 + Math.floor(r() * 14); g.fillStyle = `rgb(${v + 8},${v - 8},${v + 6})`; g.fillRect(tx * 128, ty * 128, 128, 128);
    }
    for (let i = 0; i < 3000; i++) { g.fillStyle = r() < 0.5 ? 'rgba(40,30,44,0.35)' : 'rgba(150,130,150,0.25)'; g.fillRect(r() * 256, r() * 256, 1, 1); }
    g.fillStyle = '#3a2c3c'; for (let k = 0; k <= 2; k++) { g.fillRect(k * 128 - 2, 0, 4, 256); g.fillRect(0, k * 128 - 2, 256, 4); }
    return c;
  },
  facade(emissive) {
    const [c, g] = canvasOf(512, 1024); const r = seededRandom(2026);
    g.fillStyle = emissive ? '#000000' : '#5a4870'; g.fillRect(0, 0, 512, 1024);
    if (!emissive) for (let i = 0; i < 4000; i++) { g.fillStyle = r() < 0.5 ? 'rgba(30,20,40,0.25)' : 'rgba(120,100,140,0.15)'; g.fillRect(r() * 512, r() * 1024, 3, 1); }
    for (let row = 0; row < 16; row++) {
      if (!emissive) { g.fillStyle = '#3c2e50'; g.fillRect(0, row * 64 + 58, 512, 6); }
      for (let col = 0; col < 8; col++) {
        const x = col * 64 + 14, y = row * 64 + 12, lit = r() < 0.4, warm = r() < 0.6, blind = r();
        if (emissive) {
          if (lit) {
            const grd = g.createLinearGradient(0, y, 0, y + 36);
            grd.addColorStop(0, warm ? '#ffd27a' : '#ff9a4a'); grd.addColorStop(1, warm ? '#c87a30' : '#a04a2a');
            g.fillStyle = grd; g.fillRect(x, y, 36, 36);
            if (blind < 0.35) { g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(x, y, 36, 10 + blind * 40); }
          } else { g.fillStyle = '#000000'; g.fillRect(x, y, 36, 36); }
        } else {
          g.fillStyle = '#1c1428'; g.fillRect(x - 3, y - 3, 42, 44);
          g.fillStyle = lit ? '#ffffff' : '#283048'; g.fillRect(x, y, 36, 36);
          g.fillStyle = '#1c1428'; g.fillRect(x + 17, y, 2, 36);
        }
      }
    }
    return c;
  },
  sky() {
    const [c, g] = canvasOf(1024, 512); const r = seededRandom(7);
    const grd = g.createLinearGradient(0, 0, 0, 512);
    const stops = ['#140c2a', '#24124a', '#4a1c5c', '#7e2a60', '#bc4458', '#e4764c', '#f6b062'];
    stops.forEach((s, i) => grd.addColorStop(i / (stops.length - 1), s));
    g.fillStyle = grd; g.fillRect(0, 0, 1024, 512);
    for (let i = 0; i < 160; i++) { const a = 0.3 + r() * 0.7; g.fillStyle = `rgba(255,240,255,${a * (1 - i / 200)})`; const s = r() < 0.1 ? 2 : 1; g.fillRect(r() * 1024, r() * 200, s, s); }
    // retro striped sun
    const sx = 660, sy = 300, sr = 84;
    const sg = g.createRadialGradient(sx, sy, sr * 0.6, sx, sy, sr * 2.6); sg.addColorStop(0, 'rgba(255,190,110,0.55)'); sg.addColorStop(1, 'rgba(255,120,90,0)');
    g.fillStyle = sg; g.fillRect(0, 0, 1024, 512);
    const sd = g.createLinearGradient(0, sy - sr, 0, sy + sr); sd.addColorStop(0, '#fff2a8'); sd.addColorStop(1, '#ff8a4a');
    g.save(); g.beginPath(); g.arc(sx, sy, sr, 0, 7); g.clip(); g.fillStyle = sd; g.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
    for (let i = 0; i < 6; i++) { g.clearRect(0, 0, 0, 0); g.fillStyle = '#e88a58'; g.fillRect(sx - sr, sy + 10 + i * 15, sr * 2, 2 + i * 1.4); }
    g.restore();
    // far skyline silhouettes
    let x = 0;
    while (x < 1024) {
      const bw = 26 + r() * 50, bh = 50 + r() * 110;
      g.fillStyle = '#3a1e4e'; g.fillRect(x, 512 - bh, bw, bh);
      if (r() < 0.3) { g.fillRect(x + bw * 0.45, 512 - bh - 22, 3, 22); }
      g.fillStyle = 'rgba(255,190,110,0.55)';
      for (let wy = 512 - bh + 8; wy < 506; wy += 10) for (let wx = x + 4; wx < x + bw - 4; wx += 8) if (r() < 0.14) g.fillRect(wx, wy, 3, 4);
      x += bw + r() * 6;
    }
    return c;
  },
  shop() {
    const [c, g] = canvasOf(256, 128); const r = seededRandom(3);
    const grd = g.createLinearGradient(0, 0, 0, 128); grd.addColorStop(0, '#7a4a24'); grd.addColorStop(1, '#3a2014');
    g.fillStyle = grd; g.fillRect(0, 0, 256, 128);
    for (let k = 0; k < 3; k++) { g.fillStyle = 'rgba(255,200,120,0.55)'; g.fillRect(0, 26 + k * 34, 256, 3); }
    for (let i = 0; i < 40; i++) { g.fillStyle = ['#a05a30', '#c08040', '#5a7a5a', '#8a3a3a'][Math.floor(r() * 4)]; g.fillRect(r() * 250, 10 + Math.floor(r() * 3) * 34, 4 + r() * 8, 14); }
    g.fillStyle = 'rgba(20,10,8,0.85)'; g.fillRect(150, 50, 26, 78); g.beginPath(); g.arc(163, 44, 10, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,230,180,0.35)'; g.fillRect(0, 0, 256, 6);
    g.fillStyle = '#0c0808'; g.fillRect(0, 0, 4, 128); g.fillRect(126, 0, 4, 128); g.fillRect(252, 0, 4, 128);
    return c;
  },
  sign(text, color, vertical) {
    const w = vertical ? 256 : 1024, h = vertical ? 1024 : 256;
    const [c, g] = canvasOf(w, h);
    g.fillStyle = '#06040a'; g.fillRect(0, 0, w, h);
    g.strokeStyle = color; g.lineWidth = 10; g.shadowColor = color; g.shadowBlur = 30; g.strokeRect(18, 18, w - 36, h - 36);
    g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `900 ${vertical ? 190 : 150}px "Noto Sans TC","Noto Sans CJK TC","Microsoft JhengHei",sans-serif`;
    if (vertical) { const n = text.length; for (let i = 0; i < n; i++) { g.shadowBlur = 40; g.fillText(text[i], w / 2, h * (i + 0.5) / n); g.shadowBlur = 0; g.fillStyle = '#ffffff'; g.globalAlpha = 0.55; g.fillText(text[i], w / 2, h * (i + 0.5) / n); g.globalAlpha = 1; g.fillStyle = color; } }
    else { g.shadowBlur = 40; g.fillText(text, w / 2, h / 2 + 6); g.shadowBlur = 0; g.fillStyle = '#ffffff'; g.globalAlpha = 0.55; g.fillText(text, w / 2, h / 2 + 6); g.globalAlpha = 1; }
    return c;
  },
  // sprite masks: the alpha channel carries the shape
  glow() { const [c, g] = canvasOf(128, 128); const d = g.createImageData(128, 128); for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) { const r = Math.hypot(x - 63.5, y - 63.5) / 64; const a = Math.max(0, Math.exp(-r * r * 4.5) - 0.012) * 255; const i = (y * 128 + x) * 4; d.data[i] = d.data[i + 1] = d.data[i + 2] = 255; d.data[i + 3] = a; } g.putImageData(d, 0, 0); return c; },
  star() { const [c, g] = canvasOf(128, 128); const d = g.createImageData(128, 128); for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) { const dx = x - 63.5, dy = y - 63.5, r = Math.hypot(dx, dy) / 64, an = Math.atan2(dy, dx); const ray = Math.pow(Math.abs(Math.cos(an * 4)), 24) * Math.max(0, 1 - r); const core = Math.exp(-r * r * 30); const a = Math.min(1, ray * 1.4 + core) * 255; const i = (y * 128 + x) * 4; d.data[i] = d.data[i + 1] = d.data[i + 2] = 255; d.data[i + 3] = a; } g.putImageData(d, 0, 0); return c; },
  disc() { const [c, g] = canvasOf(64, 64); const d = g.createImageData(64, 64); for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { const r = Math.hypot(x - 31.5, y - 31.5) / 32; const a = clamp((1 - r) * 3, 0, 1) * 255; const i = (y * 64 + x) * 4; d.data[i] = d.data[i + 1] = d.data[i + 2] = 255; d.data[i + 3] = a; } g.putImageData(d, 0, 0); return c; },
  vignette() { const [c, g] = canvasOf(256, 256); const d = g.createImageData(256, 256); for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) { const dx = (x - 127.5) / 128, dy = (y - 127.5) / 128; const r = Math.hypot(dx * 0.9, dy); const a = clamp((r - 0.55) / 0.75, 0, 1); const i = (y * 256 + x) * 4; d.data[i] = d.data[i + 1] = d.data[i + 2] = 255; d.data[i + 3] = a * a * 200; } g.putImageData(d, 0, 0); return c; }
};

// ------------------------------------------------------------------ camera (updated at the fixed 60 Hz game step)
class CamRig {
  constructor() { this.x = 0; this.y = 3.1; this.z = 13.4; this.tx = 0; this.ty = 2.93; this.d = 13.4; }
  update(v) {
    if (v.title) {
      const a = Math.sin(v.frame * 0.006) * 0.05, d = 13.4;
      this.x = Math.sin(a) * d; this.z = Math.cos(a) * d; this.y = 3.1; this.tx = 0; this.ty = 2.93; this.d = 9;
      return;
    }
    const f1 = v.fighters[0], f2 = v.fighters[1];
    const mid = (WX(f1.x) + WX(f2.x)) / 2, sep = Math.abs(WX(f1.x) - WX(f2.x));
    let d = clamp(5.2 + sep * 0.62, 7.0, 11.0);
    if (v.ko) d *= 0.92;
    const tx = clamp(mid, -3.4, 3.4);
    this.tx += (tx - this.tx) * 0.12; this.d += (d - this.d) * 0.08; this.ty += (1.05 - this.ty) * 0.1;
    this.x = this.tx; this.y = 1.55 + (this.ty - 1.05) * 0.9; this.z = this.d;
  }
}

// ------------------------------------------------------------------ renderer
class Renderer3D {
  constructor(canvas) {
    const gl = canvas.getContext('webgl2', { antialias: true, alpha: false, powerPreference: 'high-performance' });
    if (!gl) throw new Error('WebGL2 not supported');
    this.gl = gl; this.canvas = canvas;
    this.pLit = this.program(VS_LIT, FS_LIT); this.pDepth = this.program(VS_DEPTH, FS_DEPTH); this.pSpr = this.program(VS_SPR, FS_SPR);
    this.u = this.uniforms(this.pLit, ['uVP', 'uModel', 'uNrm', 'uLVP', 'uCol', 'uRough', 'uMetal', 'uEmis', 'uTex', 'uTex2', 'uTexMode', 'uUvXf', 'uFlash', 'uCam', 'uKeyDir', 'uKeyCol', 'uRimDir', 'uRimCol', 'uSky', 'uGnd', 'uPL', 'uPC', 'uShadow', 'uTexel', 'uFog', 'uFogD', 'uExpo']);
    this.ud = this.uniforms(this.pDepth, ['uLVP', 'uModel']);
    this.us = this.uniforms(this.pSpr, ['uVP', 'uTex']);
    this.SHADOW = 2048;
    this.initShadow();
    this.vp = new Float32Array(16); this.view = new Float32Array(16); this.proj = new Float32Array(16); this.lvp = new Float32Array(16);
    this.tmp = new Float32Array(16); this.tmp2 = new Float32Array(16); this.root = new Float32Array(16); this.nrm = new Float32Array(9);
    this.items = []; this.nItems = 0; this.staticItems = [];
    this.spr = []; this.nSpr = 0;
    this.sprBuf = new Float32Array(6 * 9 * 1200);
    this.sprVao = gl.createVertexArray(); this.sprVbo = gl.createBuffer();
    gl.bindVertexArray(this.sprVao); gl.bindBuffer(gl.ARRAY_BUFFER, this.sprVbo);
    gl.bufferData(gl.ARRAY_BUFFER, this.sprBuf.byteLength, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 36, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 36, 12);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 36, 20);
    gl.bindVertexArray(null);
    this.buildMeshes(); this.buildTextures(); this.buildMaterials(); this.buildStage();
    this.plPos = new Float32Array(20); this.plCol = new Float32Array(15);
  }
  program(vs, fs) {
    const gl = this.gl;
    const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }
  uniforms(p, names) { const o = {}; for (const n of names) o[n] = this.gl.getUniformLocation(p, n); return o; }
  initShadow() {
    const gl = this.gl, S = this.SHADOW;
    this.shTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, this.shTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, S, S, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
    this.shFbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, this.shFbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.shTex, 0);
    gl.drawBuffers([gl.NONE]); gl.readBuffer(gl.NONE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  mesh(g) {
    const gl = this.gl, n = g.pos.length / 3, data = new Float32Array(n * 8);
    for (let i = 0; i < n; i++) { data.set([g.pos[i * 3], g.pos[i * 3 + 1], g.pos[i * 3 + 2], g.nor[i * 3], g.nor[i * 3 + 1], g.nor[i * 3 + 2], g.uv[i * 2], g.uv[i * 2 + 1]], i * 8); }
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 12);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 32, 24);
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(g.idx), gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    return { vao, count: g.idx.length, len: g.len || 1 };
  }
  cap(L, r1, r2, b) { const g = geoLathe(profCapsule(L * K, r1 * K, r2 * K, b * K), 24, false); g.len = L * K; return this.mesh(g); }
  buildMeshes() {
    const m = this.M = {};
    m.sphere = this.mesh(geoLathe(profSphere(18), 32, false));
    m.box = this.mesh(geoBox()); m.quad = this.mesh(geoQuad()); m.ground = this.mesh(geoGround());
    m.cyl = this.mesh(geoLathe([[0, 0], [1, 0], [1, 0.001], [1, 0.999], [1, 1], [0, 1]], 24, false));
    m.cone = this.mesh(geoLathe([[0, -0.04], [0.9, 0], [1, 0.08], [0.78, 0.35], [0.42, 0.72], [0, 1]], 16, false));
    m.frustum = this.mesh(geoLathe([[1.0, 0], [1.04, 0.3], [1.16, 0.7], [1.3, 1.0]], 32, false));
    m.torus = this.mesh(geoLathe(profTorus(0.16, 12), 32, true));
    m.barrel = this.mesh(geoLathe([[0, 0], [0.86, 0], [0.92, 0.05], [1.0, 0.3], [1.02, 0.5], [1.0, 0.7], [0.92, 0.95], [0.86, 1], [0, 1]], 24, false));
    const torso = (p) => { const g = geoLathe(p.map(([r, y]) => [r * K, y * K]), 28, false); g.len = Dim.TORSO * K; return this.mesh(g); };
    m.torsoR = torso([[0, -4], [4.6, -3.2], [6.3, -1], [6.6, 1], [6.1, 5], [5.9, 8], [6.9, 12], [7.5, 15], [7.3, 17.5], [6.2, 19.6], [4, 21], [0, 21.6]]);
    m.torsoM = torso([[0, -3.5], [4.4, -2.6], [5.9, -0.5], [5.6, 2.5], [4.6, 6.5], [4.5, 9], [5.6, 12.5], [6.0, 15.5], [5.6, 18], [4.2, 20], [0, 20.8]]);
    m.thighR = this.cap(Dim.T, 4.4, 3.6, 0.3); m.shinR = this.cap(Dim.S, 3.7, 3.0, 0.2);
    m.uaR = this.cap(Dim.UA, 3.6, 3.2, 0.2); m.faR = this.cap(Dim.FA, 2.5, 2.0, 0.45);
    m.neckR = this.cap(Dim.HR + 2.5, 2.5, 2.3, 0); m.neckM = this.cap(Dim.HR + 2.5, 2.0, 1.8, 0);
    m.thighM = this.cap(Dim.T, 3.2, 2.4, 0.25); m.shortsM = this.cap(Dim.T * 0.5, 3.7, 3.3, 0);
    m.shinM = this.cap(Dim.S, 2.3, 1.8, 0.35); m.bootM = this.cap(Dim.S * 0.62, 2.6, 2.35, 0);
    m.uaM = this.cap(Dim.UA, 2.1, 1.8, 0.15); m.faM = this.cap(Dim.FA, 1.85, 1.5, 0.2);
  }
  tex(src, repeat, mip = true) {
    const gl = this.gl, t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    const w = repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, w); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, w);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    if (mip) { gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); }
    else gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    const ext = gl.getExtension('EXT_texture_filter_anisotropic');
    if (ext && repeat) gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, 8);
    return t;
  }
  buildTextures() {
    const T = this.T = {};
    T.asphalt = this.tex(TexPaint.asphalt(), true); T.sidewalk = this.tex(TexPaint.sidewalk(), true);
    T.facade = this.tex(TexPaint.facade(false), true); T.facadeE = this.tex(TexPaint.facade(true), true);
    T.sky = this.tex(TexPaint.sky(), false); T.shop = this.tex(TexPaint.shop(), true);
    T.signA = this.tex(TexPaint.sign('拉麵', '#ff3fa4', true), false);
    T.signB = this.tex(TexPaint.sign('STREET FIGHT', '#3fe8ff', false), false);
    T.signC = this.tex(TexPaint.sign('酒場', '#ffe04a', true), false);
    T.signD = this.tex(TexPaint.sign('格鬥館', '#ff6a3a', false), false);
    T.glow = this.tex(TexPaint.glow(), false); T.star = this.tex(TexPaint.star(), false);
    T.disc = this.tex(TexPaint.disc(), false); T.vig = this.tex(TexPaint.vignette(), false);
  }
  mat(hex, rough, metal, o) {
    const m = { col: hex === null ? [1, 1, 1] : lin(hex), rough, metal, emis: [0, 0, 0], texMode: 0, tex: null, tex2: null, uv: [1, 1, 0, 0] };
    if (o) Object.assign(m, o);
    return m;
  }
  styleMats(st) {
    const dim = (hex, k) => { const c = lin(hex); return c.map(v => v * k); };
    return {
      skin: this.mat(st.skin, 0.62, 0), top: this.mat(st.mei ? st.top : 0xE6E4EC, st.mei ? 0.38 : 0.85, 0), topDark: this.mat(st.top, 0.45, 0, { col: dim(st.top, 0.62) }),
      pants: this.mat(st.mei ? st.pants : 0xDCDAE4, st.mei ? 0.5 : 0.85, 0), glove: this.mat(st.glove, 0.3, 0), hair: this.mat(st.hair, 0.35, 0),
      foot: this.mat(st.foot, st.mei ? 0.28 : 0.62, 0), trim: this.mat(st.trim, st.mei ? 0.25 : 0.7, st.mei ? 0.9 : 0),
      eye: this.mat(0x16101a, 0.15, 0), lips: this.mat(st.mei ? 0xC8404A : 0x8A3A34, 0.4, 0), jade: this.mat(0x3CC08A, 0.15, 0.2),
      gold: this.mat(0xF0C040, 0.25, 0.9)
    };
  }
  buildMaterials() {
    this.mats = [this.styleMats(Styles.RYO), this.styleMats(Styles.MEI)];
    this.projMat = this.mat(0x2A5BE0, 0.2, 0, { emis: [0.9, 1.7, 4.2] });
  }

  // ---------------------------------------------------------------- draw list
  add(mesh, mat, flash, cast) {
    let it = this.items[this.nItems];
    if (!it) { it = { m: new Float32Array(16) }; this.items[this.nItems] = it; }
    this.nItems++;
    it.mesh = mesh; it.mat = mat; it.flash = flash || 0; it.cast = cast !== false;
    return it.m;
  }
  addStatic(mesh, mat, m, cast) { this.staticItems.push({ mesh, mat, m: new Float32Array(m), flash: 0, cast: !!cast }); }
  sprite(x, y, z, size, r, g, b, a, tex, additive, ground, rot) {
    let s = this.spr[this.nSpr];
    if (!s) { s = {}; this.spr[this.nSpr] = s; }
    this.nSpr++;
    s.x = x; s.y = y; s.z = z; s.size = size; s.r = r; s.g = g; s.b = b; s.a = a; s.tex = tex; s.add = additive; s.ground = !!ground; s.rot = rot || 0;
  }

  // ---------------------------------------------------------------- stage
  buildStage() {
    const M = this.M, m = new Float32Array(16), r = seededRandom(2026);
    const box = (cx, cy, cz, sx, sy, sz, mat, cast) => this.addStatic(M.box, mat, M4.basis(m, sx, 0, 0, 0, sy, 0, 0, 0, sz, cx, cy, cz), cast);
    const S = this.stageSprites = []; const L = this.stageLights = [];
    const glow = (x, y, z, size, hex, a) => { const c = lin(hex); S.push([x, y, z, size, Math.pow(c[0], 0.45), Math.pow(c[1], 0.45), Math.pow(c[2], 0.45), a]); };
    // sky backdrop
    this.addStatic(M.quad, this.mat(null, 1, 0, { texMode: 3, tex: this.T.sky, col: [1, 1, 1] }), M4.basis(m, 190, 0, 0, 0, 72, 0, 0, 0, 1, 0, 26, -70));
    // road + sidewalk + curb
    this.addStatic(M.ground, this.mat(null, 0.8, 0, { texMode: 1, tex: this.T.asphalt, uv: [30, 9, 0, 0] }), M4.basis(m, 120, 0, 0, 0, 1, 0, 0, 0, 36, 0, 0, 13.6));
    box(0, 0.08, -4.55, 120, 0.16, 0.3, this.mat(0x6a5a6c, 0.7, 0));
    this.addStatic(M.box, this.mat(null, 0.75, 0, { texMode: 1, tex: this.T.sidewalk, uv: [50, 2, 0, 0] }), M4.basis(m, 120, 0, 0, 0, 0.15, 0, 0, 0, 5, 0, 0.075, -7.2));
    const paint = this.mat(0xC8A850, 0.55, 0), white = this.mat(0xC8C0C8, 0.55, 0);
    for (let x = -42; x < 42; x += 3.4) box(x, 0.004, 2.6, 1.7, 0.008, 0.14, paint);
    box(0, 0.004, -3.9, 120, 0.008, 0.1, white);
    // buildings
    const wallA = this.mat(0x6a5482, 0.85, 0, { texMode: 2, tex: this.T.facade, tex2: this.T.facadeE });
    let x = -46;
    const neon = [[-7.6, 4.4, 1.3, 2.8, 'signA', 0xFF3FA4], [-0.9, 4.1, 5.0, 1.15, 'signB', 0x3FE8FF], [5.2, 4.3, 1.15, 2.6, 'signC', 0xFFE04A], [11.4, 6.2, 3.6, 1.2, 'signD', 0xFF6A3A]];
    while (x < 46) {
      const w = 3.6 + r() * 3.6, centre = Math.abs(x + w / 2) < 11, h = centre ? 4.2 + r() * 3.2 : 8 + r() * 11, d = 8;
      const mt = Object.assign({}, wallA, { uv: [w / 8, h / 16, r(), r()], col: lin(r() < 0.5 ? 0x6a5482 : 0x5a4a78) });
      this.addStatic(M.box, mt, M4.basis(m, w, 0, 0, 0, h, 0, 0, 0, d, x + w / 2, h / 2, -9.6 - d / 2), true);
      box(x + w / 2, h + 0.15, -9.6 - d / 2, w + 0.2, 0.3, d + 0.2, this.mat(0x241a30, 0.9, 0));
      // ground-floor shop: lit window + awning
      if (r() < 0.7) {
        const sw = w * 0.62;
        box(x + w / 2, 1.3, -9.62, sw + 0.24, 1.75, 0.12, this.mat(0x18101e, 0.6, 0.2));
        this.addStatic(M.quad, this.mat(0x080608, 0.15, 0, { texMode: 4, tex: this.T.shop, uv: [Math.max(1, Math.round(sw / 1.6)), 1, 0, 0] }), M4.basis(m, sw, 0, 0, 0, 1.5, 0, 0, 0, 1, x + w / 2, 1.3, -9.54));
        const aw = [0xC81E28, 0x2A5BB0, 0x2A8A5A, 0xD08A20][Math.floor(r() * 4)];
        const c = Math.cos(0.45), s = Math.sin(0.45);
        this.addStatic(M.box, this.mat(aw, 0.6, 0), M4.basis(m, sw + 0.4, 0, 0, 0, 0.06 * c, 0.06 * s, 0, -1.1 * s, 1.1 * c, x + w / 2, 2.9, -9.1), true);
      }
      x += w + 0.15;
    }
    for (const [sx, sy, sw, sh, t, hex] of neon) {
      box(sx, sy, -9.45, sw + 0.25, sh + 0.25, 0.18, this.mat(0x0c0814, 0.5, 0.3));
      this.addStatic(M.quad, this.mat(0x050308, 0.3, 0, { texMode: 4, tex: this.T[t] }), M4.basis(m, sw, 0, 0, 0, sh, 0, 0, 0, 1, sx, sy, -9.35));
      glow(sx, sy, -9.2, Math.max(sw, sh) * 1.25, hex, 0.33);
    }
    // lantern strings
    const gold = this.mat(0xF0C040, 0.3, 0.9), rope = this.mat(0x120a1e, 0.8, 0), lant = this.mat(0x8a1010, 0.5, 0, { emis: [2.4, 0.42, 0.16] });
    const ropeY = xx => 4.55 - 0.85 * Math.pow(Math.sin((xx + 16) / 16 * Math.PI), 2);
    let px = -16, py = ropeY(px);
    for (let xx = -15.5; xx <= 16; xx += 0.5) {
      const ny = ropeY(xx), dx = xx - px, dy = ny - py, l = Math.hypot(dx, dy);
      this.addStatic(M.cyl, rope, M4.basis(m, dy / l * 0.014, -dx / l * 0.014, 0, dx, dy, 0, 0, 0, 0.014, px, py, -3.0));
      px = xx; py = ny;
    }
    for (let lx = -15; lx <= 15; lx += 1.6) {
      const ly = ropeY(lx) - 0.33;
      this.addStatic(M.sphere, lant, M4.basis(m, 0.17, 0, 0, 0, 0.22, 0, 0, 0, 0.17, lx, ly, -3.0), true);
      this.addStatic(M.cyl, gold, M4.basis(m, 0.1, 0, 0, 0, 0.05, 0, 0, 0, 0.1, lx, ly + 0.19, -3.0));
      this.addStatic(M.cyl, gold, M4.basis(m, 0.1, 0, 0, 0, 0.05, 0, 0, 0, 0.1, lx, ly - 0.24, -3.0));
      glow(lx, ly, -2.95, 0.75, 0xFF6A3A, 0.42);
    }
    // street lamps
    const metal = this.mat(0x2a2430, 0.4, 0.6), lampE = this.mat(0xffffff, 0.2, 0, { emis: [6, 5.2, 3.6] });
    for (const lxp of [-9.2, 9.2]) {
      this.addStatic(M.cyl, metal, M4.basis(m, 0.08, 0, 0, 0, 5.3, 0, 0, 0, 0.08, lxp, 0, -4.2), true);
      this.addStatic(M.cyl, metal, M4.basis(m, 0.14, 0, 0, 0, 0.5, 0, 0, 0, 0.14, lxp, 0, -4.2), true);
      box(lxp, 5.25, -3.65, 0.08, 0.08, 1.2, metal, true);
      box(lxp, 5.18, -3.1, 0.55, 0.16, 0.36, metal, true);
      box(lxp, 5.09, -3.1, 0.45, 0.02, 0.28, lampE);
      glow(lxp, 5.0, -3.05, 1.3, 0xFFD8A0, 0.55);
      L.push([lxp, 4.6, -2.8, 11, 2.6, 2.1, 1.5]);
    }
    // neon fill lights (pink left, cyan centre)
    L.push([-7.6, 4.2, -7.6, 9, 1.6, 0.25, 0.8]);
    L.push([-0.9, 4.0, -7.6, 9, 0.2, 1.2, 1.7]);
    this.stageLights = L.filter(Boolean);
    // props
    const rust = this.mat(0x8a3a2a, 0.55, 0.35), wood = this.mat(0x7a5a3a, 0.8, 0), bag = this.mat(0x1e2a24, 0.3, 0);
    for (const [bx, bz] of [[-10.4, -3.4], [-9.6, -2.8], [-11.0, -2.7]]) {
      this.addStatic(M.barrel, rust, M4.basis(m, 0.32, 0, 0, 0, 0.92, 0, 0, 0, 0.32, bx, 0, bz), true);
      this.addStatic(M.torus, metal, M4.basis(m, 0.33, 0, 0, 0, 0.12, 0, 0, 0, 0.33, bx, 0.3, bz), true);
      this.addStatic(M.torus, metal, M4.basis(m, 0.33, 0, 0, 0, 0.12, 0, 0, 0, 0.33, bx, 0.62, bz), true);
    }
    box(10.2, 0.4, -3.3, 0.8, 0.8, 0.8, wood, true); box(10.15, 1.1, -3.35, 0.6, 0.6, 0.6, wood, true); box(11.1, 0.35, -3.0, 0.7, 0.7, 0.7, wood, true);
    this.addStatic(M.sphere, bag, M4.basis(m, 0.42, 0, 0, 0, 0.3, 0, 0, 0, 0.36, 8.9, 0.25, -3.6), true);
    this.addStatic(M.sphere, bag, M4.basis(m, 0.36, 0, 0, 0, 0.28, 0, 0, 0, 0.3, 8.4, 0.22, -3.2), true);
  }

  // ---------------------------------------------------------------- fighter rig
  /** Ellipsoid aligned to a local frame F = {o, a, b, c} (axes pre-scaled to px units). */
  fEll(F, lx, ly, lz, rx, ry, rz, mat, fl) {
    const m = this.add(this.M.sphere, mat, fl);
    M4.basis(m, F.a[0] * rx, F.a[1] * rx, F.a[2] * rx, F.b[0] * ry, F.b[1] * ry, F.b[2] * ry, F.c[0] * rz, F.c[1] * rz, F.c[2] * rz,
      F.o[0] + F.a[0] * lx + F.b[0] * ly + F.c[0] * lz, F.o[1] + F.a[1] * lx + F.b[1] * ly + F.c[1] * lz, F.o[2] + F.a[2] * lx + F.b[2] * ly + F.c[2] * lz);
  }
  /** Unit mesh (radius 1, y 0..1) stretched from local p0 to p1 with radius r. */
  fSeg(F, mesh, x0, y0, z0, x1, y1, z1, r, mat, fl) {
    const ox = F.o[0] + F.a[0] * x0 + F.b[0] * y0 + F.c[0] * z0, oy = F.o[1] + F.a[1] * x0 + F.b[1] * y0 + F.c[1] * z0, oz = F.o[2] + F.a[2] * x0 + F.b[2] * y0 + F.c[2] * z0;
    const ex = F.o[0] + F.a[0] * x1 + F.b[0] * y1 + F.c[0] * z1, ey = F.o[1] + F.a[1] * x1 + F.b[1] * y1 + F.c[1] * z1, ez = F.o[2] + F.a[2] * x1 + F.b[2] * y1 + F.c[2] * z1;
    this.segW(mesh, ox, oy, oz, ex, ey, ez, r * K, mat, fl);
  }
  segW(mesh, ox, oy, oz, ex, ey, ez, r, mat, fl) {
    const dx = ex - ox, dy = ey - oy, dz = ez - oz, l = Math.hypot(dx, dy, dz) || 1e-5;
    const ux = dx / l, uy = dy / l, uz = dz / l;
    let px = uy * 1 - uz * 0, py = uz * 0 - ux * 1, pz = 0;           // u × (0,0,1)
    let pl = Math.hypot(px, py, pz);
    if (pl < 1e-3) { px = 0; py = uz; pz = -uy; pl = Math.hypot(px, py, pz); }  // u × (1,0,0)
    px /= pl; py /= pl; pz /= pl;
    const qx = py * uz - pz * uy, qy = pz * ux - px * uz, qz = px * uy - py * ux;  // p × u
    const m = this.add(mesh, mat, fl);
    M4.basis(m, px * r, py * r, pz * r, dx, dy, dz, qx * r, qy * r, qz * r, ox, oy, oz);
  }
  /** Exact-length capsule mesh between two game-space joints at depth z (px). */
  bone(mesh, ax, ay, bx, by, z, mat, fl) {
    const x0 = WX(ax), y0 = WY(ay), x1 = WX(bx), y1 = WY(by);
    let dx = x1 - x0, dy = y1 - y0; const l = Math.hypot(dx, dy) || 1e-5; dx /= l; dy /= l;
    const s = l / mesh.len;
    const m = this.add(mesh, mat, fl);
    M4.basis(m, dy, -dx, 0, dx * s, dy * s, 0, 0, 0, 1, x0, y0, z * K);
  }

  rigFighter(f, mats) {
    const s = f.skel, p = f.pose, st = f.style, fc = f.facing, mei = st.mei, M = this.M, A = mats;
    const fl = (f.flash > 0 && f.flash % 2 === 1) ? 1 : 0;
    const start = this.nItems;
    // torso frame
    const hx = WX(s.hipX), hy = WY(s.hipY), sx = WX(s.shX), sy = WY(s.shY);
    let ux = sx - hx, uy = sy - hy; const tl = Math.hypot(ux, uy) || 1e-5; ux /= tl; uy /= tl;
    const a0x = fc * uy, a0y = -fc * ux;
    const Ft = { o: [hx, hy, 0], a: [a0x * K, a0y * K, 0], b: [ux * K, uy * K, 0], c: [0, 0, fc * K] };
    const depth = 0.62;
    const tm = this.add(mei ? M.torsoM : M.torsoR, A.top, fl);
    M4.basis(tm, a0x * depth, a0y * depth, 0, ux * tl / (Dim.TORSO * K), uy * tl / (Dim.TORSO * K), 0, 0, 0, fc, hx, hy, 0);
    const SZ = mei ? 5.0 : 6.0, HZ = mei ? 2.6 : 3.0;

    // legs (back, then front)
    for (let side = 0; side < 2; side++) {
      const front = side === 1, z = front ? HZ : -HZ;
      const kx = front ? s.fKX : s.bKX, ky = front ? s.fKY : s.bKY, ftx = front ? s.fFX : s.bFX, fty = front ? s.fFY : s.bFY;
      if (!mei) {
        this.bone(M.thighR, s.hipX, s.hipY, kx, ky, z, A.pants, fl);
        this.bone(M.shinR, kx, ky, ftx, fty, z, A.pants, fl);
      } else {
        this.bone(M.thighM, s.hipX, s.hipY, kx, ky, z, A.skin, fl);
        this.bone(M.shortsM, s.hipX, s.hipY, s.hipX + (kx - s.hipX) * 0.5, s.hipY + (ky - s.hipY) * 0.5, z, A.pants, fl);
        this.bone(M.shinM, kx, ky, ftx, fty, z, A.skin, fl);
        this.bone(M.bootM, ftx, fty, ftx + (kx - ftx) * 0.62, fty + (ky - fty) * 0.62, z, A.foot, fl);
      }
      // foot
      const gdx = ftx - kx, gdy = fty - ky, gl = Math.hypot(gdx, gdy) || 1e-5;
      const fwx = fc * gdy / gl, fwy = fc * gdx / gl;      // forward along the sole (world)
      const upx = -gdx / gl, upy = gdy / gl;               // from ankle toward knee (world)
      const Ff = { o: [WX(ftx), WY(fty), z * K], a: [fwx * K, fwy * K, 0], b: [upx * K, upy * K, 0], c: [0, 0, (fwx * upy - fwy * upx) * K] };
      if (!mei) { this.fEll(Ff, 0, 0.6, 0, 1.9, 1.9, 1.9, A.skin, fl); this.fEll(Ff, 2.2, -0.5, 0, 3.3, 1.4, 1.9, A.skin, fl); }
      else this.fEll(Ff, 2.0, -0.4, 0, 3.4, 1.6, 2.1, A.foot, fl);
    }
    // pelvis / skirt / belt
    if (!mei) {
      this.fEll(Ft, 0, 0.5, 0, 6.2 * depth, 4.6, 6.4, A.pants, fl);
      // black belt with knot and tails
      const bm = this.add(M.torus, A.trim, fl);
      const rb = 6.35;
      M4.basis(bm, Ft.a[0] * rb * depth, Ft.a[1] * rb * depth, 0, Ft.b[0] * 1.15 / 0.16, Ft.b[1] * 1.15 / 0.16, 0, 0, 0, Ft.c[2] * rb,
        hx + Ft.b[0] * 3.2, hy + Ft.b[1] * 3.2, 0);
      this.fEll(Ft, rb * depth + 0.5, 3.2, 1.4, 1.1, 1.0, 1.4, A.trim, fl);
      this.fSeg(Ft, M.cyl, rb * depth + 0.6, 2.8, 1.0, rb * depth + 1.6, -4.0, 2.2, 0.55, A.trim, fl);
      this.fSeg(Ft, M.cyl, rb * depth + 0.6, 2.8, 1.8, rb * depth + 1.0, -3.4, 0.2, 0.55, A.trim, fl);
      // V-neck of the gi showing the chest
      this.fEll(Ft, 7.25 * depth - 0.2, 15.2, 0, 0.9, 4.0, 2.2, A.skin, fl);
    } else {
      this.fEll(Ft, 0, 0.6, 0, 5.6 * depth, 4.2, 5.8, A.top, fl);
      // skirt panel toward the knees
      const kmx = (s.fKX + s.bKX) / 2, kmy = (s.fKY + s.bKY) / 2;
      let dx = WX(kmx) - hx, dy = WY(kmy) - hy; const dl = Math.hypot(dx, dy) || 1e-5; dx /= dl; dy /= dl;
      const len = dl * 0.82, rt = 5.6 * K;
      const pxw = fc * dy, pyw = -fc * dx;
      const sk = this.add(M.frustum, A.topDark, fl);
      M4.basis(sk, pxw * rt * 0.72, pyw * rt * 0.72, 0, dx * len, dy * len, 0, 0, 0, fc * rt * 1.02, hx, hy, 0);
      const hm = this.add(M.torus, A.gold, fl);
      const rh = rt * 1.3;
      M4.basis(hm, pxw * rh * 0.72, pyw * rh * 0.72, 0, dx * 0.6 * K / 0.16, dy * 0.6 * K / 0.16, 0, 0, 0, fc * rh * 1.02, hx + dx * len, hy + dy * len, 0);
      // mandarin collar, frog buttons and gold trim
      this.fSeg(Ft, M.cyl, 0, 18.6, 0, 0, 22.4, 0, 2.7, A.top, fl);
      const cm = this.add(M.torus, A.gold, fl);
      M4.basis(cm, Ft.a[0] * 2.75, Ft.a[1] * 2.75, 0, Ft.b[0] * 0.35 / 0.16, Ft.b[1] * 0.35 / 0.16, 0, 0, 0, Ft.c[2] * 2.75, hx + Ft.b[0] * 22.4, hy + Ft.b[1] * 22.4, 0);
      for (let i = 0; i < 3; i++) this.fEll(Ft, 6.0 * depth - i * 0.25 + 0.15, 17 - i * 2.6, 1.2 + i * 1.3, 0.65, 0.65, 0.65, A.gold, fl);
      this.fSeg(Ft, M.cyl, 3.3, 18.8, -0.3, 3.0, 13.2, 4.2, 0.32, A.gold, fl);
    }

    // arms (back, then front)
    for (let side = 0; side < 2; side++) {
      const front = side === 1, z = front ? SZ : -SZ;
      const ax = front ? s.fsX : s.bsX, ay = front ? s.fsY : s.bsY;
      const ex = front ? s.fElX : s.bElX, ey = front ? s.fElY : s.bElY;
      const hnx = front ? s.fHX : s.bHX, hny = front ? s.fHY : s.bHY;
      const Fs = { o: [WX(ax), WY(ay), z * K], a: [K, 0, 0], b: [0, K, 0], c: [0, 0, K] };
      let dx = WX(hnx) - WX(ex), dy = WY(hny) - WY(ey); const dl = Math.hypot(dx, dy) || 1e-5; dx /= dl; dy /= dl;
      const Fh = { o: [WX(hnx), WY(hny), z * K], a: [dx * K, dy * K, 0], b: [-dy * K * fc, dx * K * fc, 0], c: [0, 0, fc * K] };
      if (!mei) {
        this.fEll(Fs, 0, 0, 0, 4.1, 4.1, 4.1, A.top, fl);
        this.bone(M.uaR, ax, ay, ex, ey, z, A.top, fl);
        this.bone(M.faR, ex, ey, hnx, hny, z, A.skin, fl);
        this.fSeg(Fh, M.cyl, -2.6, 0, 0, -0.9, 0, 0, 2.55, A.glove, fl);
        this.fEll(Fh, 0.4, 0, 0, 3.5, 3.1, 3.0, A.glove, fl);
      } else {
        this.fEll(Fs, 0, -0.2, 0, 2.9, 2.9, 2.9, A.top, fl);
        this.bone(M.uaM, ax, ay, ex, ey, z, A.skin, fl);
        this.bone(M.faM, ex, ey, hnx, hny, z, A.skin, fl);
        this.fSeg(Fh, M.cyl, -3.4, 0, 0, -0.8, 0, 0, 2.05, A.glove, fl);
        this.fSeg(Fh, M.cyl, -3.5, 0, 0, -3.1, 0, 0, 2.15, A.gold, fl);
        this.fEll(Fh, 0.6, 0, 0, 2.1, 1.8, 1.6, A.skin, fl);
      }
    }

    // neck + head
    this.bone(mei ? M.neckM : M.neckR, s.shX, s.shY, s.headX, s.headY, 0, A.skin, fl);
    const cx = WX(s.headX), cy = WY(s.headY);
    let hux = cx - sx, huy = cy - sy; const hl = Math.hypot(hux, huy) || 1e-5; hux /= hl; huy /= hl;
    let fx = fc * huy * 0.86, fy = -fc * hux * 0.86, fz = 0.46; const fln = Math.hypot(fx, fy, fz); fx /= fln; fy /= fln; fz /= fln;
    const scx = fy * 0 - fz * huy, scy = fz * hux - fx * 0, scz = fx * huy - fy * hux;   // fwd × up
    const Fh = { o: [cx, cy, 0], a: [fx * K, fy * K, fz * K], b: [hux * K, huy * K, 0], c: [scx * K, scy * K, scz * K] };
    this.fEll(Fh, 0, 0, 0, 5.3, 5.7, 5.1, A.skin, fl);
    this.fEll(Fh, 1.8, -3.0, 0, 3.3, 2.7, 3.7, A.skin, fl);
    this.fEll(Fh, 5.35, -0.5, 0, 0.95, 1.15, 0.8, A.skin, fl);
    this.fEll(Fh, 0.2, 0.2, 5.0, 1.0, 1.5, 0.7, A.skin, fl);
    this.fEll(Fh, 0.2, 0.2, -5.0, 1.0, 1.5, 0.7, A.skin, fl);
    for (const ez of [2.05, -2.05]) {
      this.fEll(Fh, 4.75, 0.7, ez, 0.55, 0.8, 0.6, A.eye, fl);
      this.fEll(Fh, 4.9, 2.05, ez, 0.5, mei ? 0.3 : 0.45, mei ? 1.2 : 1.45, A.hair, fl);
    }
    this.fEll(Fh, 4.75, -2.75, 0, 0.35, mei ? 0.38 : 0.28, 1.15, A.lips, fl);
    if (!mei) {
      this.fEll(Fh, -1.3, 1.9, 0, 5.5, 4.8, 5.6, A.hair, fl);
      const spikes = [[-1, 5.2, 0, -0.3, 1, 0, 5, 2.3], [-3.6, 4.2, 1.6, -0.8, 0.6, 0.3, 5.5, 2.1], [-3.6, 4.2, -1.6, -0.8, 0.6, -0.3, 5.5, 2.1],
        [-5.2, 1.6, 0, -1, 0.15, 0, 5.2, 2.3], [1.4, 5.3, 1.9, 0.3, 1, 0.45, 4.2, 1.9], [1.4, 5.3, -1.9, 0.3, 1, -0.45, 4.2, 1.9],
        [3.4, 4.1, 0.4, 0.9, 0.55, 0.1, 3.6, 1.7], [-4.6, -0.4, 2.6, -0.9, -0.25, 0.5, 4.2, 1.8], [-4.6, -0.4, -2.6, -0.9, -0.25, -0.5, 4.2, 1.8],
        [-2.5, 3.6, 3.6, -0.5, 0.5, 0.8, 4, 1.7], [-2.5, 3.6, -3.6, -0.5, 0.5, -0.8, 4, 1.7]];
      for (const [ox, oy, oz, dx, dy, dz, len, rr] of spikes) {
        const l = Math.hypot(dx, dy, dz);
        this.fConeLocal(Fh, ox, oy, oz, dx / l, dy / l, dz / l, len, rr, A.hair, fl);
      }
    } else {
      this.fEll(Fh, -1.0, 1.6, 0, 5.7, 5.1, 5.8, A.hair, fl);
      this.fEll(Fh, -3.3, 5.9, 0, 3.4, 3.2, 3.4, A.hair, fl);
      this.fEll(Fh, 3.9, 3.4, 1.8, 1.7, 1.9, 2.4, A.hair, fl);
      this.fEll(Fh, 3.9, 3.4, -1.8, 1.7, 1.9, 2.4, A.hair, fl);
      this.fEll(Fh, 4.3, 3.6, 0, 1.3, 1.7, 1.8, A.hair, fl);
      this.fEll(Fh, 1.6, -1.6, 4.9, 1.2, 3.6, 0.9, A.hair, fl);
      this.fEll(Fh, 1.6, -1.6, -4.9, 1.2, 3.6, 0.9, A.hair, fl);
      this.fSeg(Fh, M.cyl, -6.8, 4.4, 1.2, 0.4, 8.0, 1.2, 0.42, A.jade, fl);
      this.fEll(Fh, 0.6, 8.1, 1.2, 0.95, 0.95, 0.95, A.jade, fl);
      this.fEll(Fh, -0.8, -3.8, 4.7, 0.6, 0.6, 0.6, A.gold, fl);
    }

    // whole-body fall rotation around the feet (knockdown / KO)
    if (p.rot !== 0) {
      const th = rad(p.rot) * fc, c = Math.cos(th), sn = Math.sin(th), pvx = WX(f.x), pvy = WY(f.y), lift = 3 * Math.sin(rad(p.rot)) * K;
      const R = this.root;
      M4.basis(R, c, sn, 0, -sn, c, 0, 0, 0, 1, pvx - c * pvx + sn * pvy, pvy - sn * pvx - c * pvy + lift, 0);
      for (let i = start; i < this.nItems; i++) { const it = this.items[i]; this.tmp.set(it.m); M4.mul(it.m, R, this.tmp); }
    }
  }
  fConeLocal(F, ox, oy, oz, dx, dy, dz, len, r, mat, fl) {
    const x0 = ox, y0 = oy, z0 = oz;
    const wx0 = F.o[0] + F.a[0] * x0 + F.b[0] * y0 + F.c[0] * z0, wy0 = F.o[1] + F.a[1] * x0 + F.b[1] * y0 + F.c[1] * z0, wz0 = F.o[2] + F.a[2] * x0 + F.b[2] * y0 + F.c[2] * z0;
    const x1 = ox + dx * len, y1 = oy + dy * len, z1 = oz + dz * len;
    const wx1 = F.o[0] + F.a[0] * x1 + F.b[0] * y1 + F.c[0] * z1, wy1 = F.o[1] + F.a[1] * x1 + F.b[1] * y1 + F.c[1] * z1, wz1 = F.o[2] + F.a[2] * x1 + F.b[2] * y1 + F.c[2] * z1;
    this.segW(this.M.cone, wx0, wy0, wz0, wx1, wy1, wz1, r * K, mat, fl);
  }

  // ---------------------------------------------------------------- frame
  render(v, w, h) {
    const gl = this.gl;
    this.nItems = 0; this.nSpr = 0;
    const t = v.frame;
    const cam = v.cam;
    let shx = 0, shy = 0;
    if (v.shake > 0) { shx = (Math.random() - 0.5) * 2 * v.shake * K * 0.7; shy = (Math.random() - 0.5) * 2 * v.shake * K * 0.7; }
    const asp = w / h;
    M4.persp(this.proj, rad(30), asp, 0.1, 200);
    M4.lookAt(this.view, cam.x + shx, cam.y + shy, cam.z, cam.tx + shx, cam.ty + shy, 0, 0, 1, 0);
    M4.mul(this.vp, this.proj, this.view);
    // ---- key light (shadow caster)
    const kd = [-0.36, 0.84, 0.42], kl = Math.hypot(...kd); kd[0] /= kl; kd[1] /= kl; kd[2] /= kl;
    const lc = [cam.tx, 1, 0];
    M4.lookAt(this.tmp, lc[0] + kd[0] * 25, lc[1] + kd[1] * 25, lc[2] + kd[2] * 25, lc[0], lc[1], lc[2], 0, 1, 0);
    M4.ortho(this.tmp2, -11, 11, -8, 8, 1, 60);
    M4.mul(this.lvp, this.tmp2, this.tmp);

    // ---- dynamic items
    for (let i = 0; i < 2; i++) { const f = v.fighters[i]; this.rigFighter(f, this.mats[f.style.mei ? 1 : 0]); }
    const lights = this.stageLights.slice(0, 4);
    let projLight = null;
    for (const pr of v.projs) {
      const wob = Math.sin(pr.anim * 0.6);
      const px = WX(pr.x), py = WY(pr.y), r = (6 + wob) * K;
      const m = this.add(this.M.sphere, this.projMat, 0, false);
      M4.basis(m, r, 0, 0, 0, r, 0, 0, 0, r, px, py, 0.1);
      this.sprite(px, py, 0.15, 0.95 + wob * 0.06, 0.35, 0.6, 1.0, 0.75, 'glow', true);
      this.sprite(px, py, 0.2, 0.42, 0.85, 0.95, 1.0, 0.9, 'glow', true);
      for (let k = 1; k <= 4; k++) this.sprite(px - pr.vx * K * 2.4 * k, py + Math.sin((pr.anim + k * 3) * 0.7) * 1.5 * K, 0.1, (0.5 - k * 0.08), 0.25, 0.45, 1.0, 0.5 - k * 0.09, 'glow', true);
      this.sprite(px, py, 0.25, 0.7, 0.8, 0.9, 1.0, 0.55, 'star', true, false, pr.anim * 0.15);
      projLight = [px, py, 0.6, 4.5, 0.6, 1.2, 3.2];
    }
    lights.push(projLight || [0, -50, 0, 0.001, 0, 0, 0]);
    for (let i = 0; i < 5; i++) {
      const L = lights[i] || [0, -50, 0, 0.001, 0, 0, 0];
      const flick = (i === 2 || i === 3) ? (0.85 + 0.15 * Math.sin(t * 0.21 + i * 2)) : 1;
      this.plPos.set([L[0], L[1], L[2], L[3]], i * 4); this.plCol.set([L[4] * flick, L[5] * flick, L[6] * flick], i * 3);
    }
    // contact shadows + effects
    for (let i = 0; i < 2; i++) {
      const f = v.fighters[i];
      const air = clamp(G.FLOOR - f.y, 0, 80), lying = f.pose.rot > 45;
      const cxs = lying ? f.x - f.facing * 22 : f.x;
      this.sprite(WX(cxs), 0.012, 0, (lying ? 1.0 : 0.62) * (1 - air / 160), 0, 0, 0, 0.5, 'disc', false, true);
    }
    for (const b of v.bursts) {
      const sz = (4 + b.t * 2.2) * K * 2.4, x = WX(b.x), y = WY(b.y);
      if (b.block) { this.sprite(x, y, 0.4, sz, 0.55, 0.88, 1, 0.95, 'star', true, false, 0.4); this.sprite(x, y, 0.38, sz * 1.4, 0.3, 0.6, 1, 0.5, 'glow', true); }
      else { const wht = b.t < 3; this.sprite(x, y, 0.4, sz, 1, wht ? 1 : 0.88, wht ? 1 : 0.3, 1, 'star', true, false, 0.39); this.sprite(x, y, 0.38, sz * 1.6, 1, 0.6, 0.2, 0.6, 'glow', true); }
    }
    for (const pa of v.parts) {
      const c = pa.color, a = clamp(pa.life / 12, 0, 1);
      const r = ((c >> 16) & 255) / 255, g = ((c >> 8) & 255) / 255, bb = (c & 255) / 255;
      const dust = pa.grav < 0.05;
      this.sprite(WX(pa.x), WY(pa.y), pa.z || 0, pa.size * K * (dust ? 3.2 : 1.6), r, g, bb, dust ? a * 0.5 : a, dust ? 'disc' : 'glow', !dust);
    }
    for (const s of this.stageSprites) this.sprite(s[0], s[1], s[2], s[3], s[4], s[5], s[6], s[7] * (0.9 + 0.1 * Math.sin(t * 0.05 + s[0])), 'glow', true);

    // ---- shadow pass
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.shFbo);
    gl.viewport(0, 0, this.SHADOW, this.SHADOW);
    gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(1.5, 3);
    gl.useProgram(this.pDepth); gl.uniformMatrix4fv(this.ud.uLVP, false, this.lvp);
    const drawDepth = (it) => { if (!it.cast) return; gl.uniformMatrix4fv(this.ud.uModel, false, it.m); gl.bindVertexArray(it.mesh.vao); gl.drawElements(gl.TRIANGLES, it.mesh.count, gl.UNSIGNED_SHORT, 0); };
    for (const it of this.staticItems) drawDepth(it);
    for (let i = 0; i < this.nItems; i++) drawDepth(this.items[i]);
    gl.disable(gl.POLYGON_OFFSET_FILL);

    // ---- main pass
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, w, h);
    gl.clearColor(0.10, 0.05, 0.12, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.CULL_FACE);
    gl.useProgram(this.pLit);
    const u = this.u;
    gl.uniformMatrix4fv(u.uVP, false, this.vp); gl.uniformMatrix4fv(u.uLVP, false, this.lvp);
    gl.uniform3f(u.uCam, cam.x + shx, cam.y + shy, cam.z);
    gl.uniform3f(u.uKeyDir, kd[0], kd[1], kd[2]); gl.uniform3f(u.uKeyCol, 1.35, 1.16, 1.02);
    const rd = [0.55, 0.32, -0.77], rl = Math.hypot(...rd);
    gl.uniform3f(u.uRimDir, rd[0] / rl, rd[1] / rl, rd[2] / rl); gl.uniform3f(u.uRimCol, 1.25, 0.52, 0.3);
    gl.uniform3f(u.uSky, 0.2, 0.13, 0.32); gl.uniform3f(u.uGnd, 0.08, 0.05, 0.05);
    gl.uniform4fv(u.uPL, this.plPos); gl.uniform3fv(u.uPC, this.plCol);
    gl.uniform3f(u.uFog, 0.17, 0.065, 0.14); gl.uniform1f(u.uFogD, 0.02); gl.uniform1f(u.uExpo, 0.95);
    gl.uniform1f(u.uTexel, 1 / this.SHADOW);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, this.shTex); gl.uniform1i(u.uShadow, 2);
    gl.uniform1i(u.uTex, 0); gl.uniform1i(u.uTex2, 1);
    let lastMat = null;
    const draw = (it) => {
      const mt = it.mat;
      if (mt !== lastMat) {
        lastMat = mt;
        gl.uniform3fv(u.uCol, mt.col); gl.uniform1f(u.uRough, mt.rough); gl.uniform1f(u.uMetal, mt.metal); gl.uniform3fv(u.uEmis, mt.emis);
        gl.uniform1i(u.uTexMode, mt.texMode); gl.uniform4fv(u.uUvXf, mt.uv);
        if (mt.tex) { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, mt.tex); }
        if (mt.tex2) { gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, mt.tex2); }
      }
      gl.uniform1f(u.uFlash, it.flash * 0.75);
      gl.uniformMatrix4fv(u.uModel, false, it.m); gl.uniformMatrix3fv(u.uNrm, false, normalMat(this.nrm, it.m));
      gl.bindVertexArray(it.mesh.vao); gl.drawElements(gl.TRIANGLES, it.mesh.count, gl.UNSIGNED_SHORT, 0);
    };
    gl.depthMask(false); draw(this.staticItems[0]); gl.depthMask(true);   // sky backdrop
    for (let i = 1; i < this.staticItems.length; i++) draw(this.staticItems[i]);
    for (let i = 0; i < this.nItems; i++) draw(this.items[i]);

    // ---- sprites
    this.drawSprites(cam, shx, shy);
    gl.bindVertexArray(null);
  }
  drawSprites(cam, shx, shy) {
    const gl = this.gl, v = this.view;
    const rx = v[0], ry = v[4], rz = v[8], ux = v[1], uy = v[5], uz = v[9];
    gl.useProgram(this.pSpr); gl.uniformMatrix4fv(this.us.uVP, false, this.vp); gl.uniform1i(this.us.uTex, 0);
    gl.enable(gl.BLEND); gl.depthMask(false);
    const groups = [['disc', false], ['glow', true], ['star', true], ['disc', true]];
    const B = this.sprBuf;
    for (const [tex, add] of groups) {
      let n = 0;
      for (let i = 0; i < this.nSpr && n < 1200; i++) {
        const s = this.spr[i]; if (s.tex !== tex || s.add !== add) continue;
        let ax, ay, az, bx, by, bz;
        if (s.ground) { ax = s.size; ay = 0; az = 0; bx = 0; by = 0; bz = -s.size * 0.35; }
        else {
          const c = Math.cos(s.rot) * s.size, sn = Math.sin(s.rot) * s.size;
          ax = rx * c + ux * sn; ay = ry * c + uy * sn; az = rz * c + uz * sn;
          bx = -rx * sn + ux * c; by = -ry * sn + uy * c; bz = -rz * sn + uz * c;
        }
        const corners = [[-1, -1, 0, 0], [1, -1, 1, 0], [1, 1, 1, 1], [-1, -1, 0, 0], [1, 1, 1, 1], [-1, 1, 0, 1]];
        for (const [cu, cv, tu, tv] of corners) {
          const o = n * 9; n++;
          B[o] = s.x + ax * cu + bx * cv; B[o + 1] = s.y + ay * cu + by * cv; B[o + 2] = s.z + az * cu + bz * cv;
          B[o + 3] = tu; B[o + 4] = tv; B[o + 5] = s.r; B[o + 6] = s.g; B[o + 7] = s.b; B[o + 8] = s.a;
        }
      }
      if (!n) continue;
      gl.blendFunc(gl.SRC_ALPHA, add ? gl.ONE : gl.ONE_MINUS_SRC_ALPHA);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.T[tex]);
      gl.bindVertexArray(this.sprVao); gl.bindBuffer(gl.ARRAY_BUFFER, this.sprVbo);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, B, 0, n * 9);
      gl.drawArrays(gl.TRIANGLES, 0, n);
    }
    // vignette (screen space)
    gl.disable(gl.DEPTH_TEST);
    gl.bindVertexArray(this.sprVao); gl.bindBuffer(gl.ARRAY_BUFFER, this.sprVbo);
    const I = this.tmp; M4.ident(I); gl.uniformMatrix4fv(this.us.uVP, false, I);
    const q = [[-1, -1, 0, 0], [1, -1, 1, 0], [1, 1, 1, 1], [-1, -1, 0, 0], [1, 1, 1, 1], [-1, 1, 0, 1]];
    let o = 0; for (const [x, y, tu, tv] of q) { B.set([x, y, 0, tu, tv, 0.03, 0.0, 0.05, 1], o); o += 9; }
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, B, 0, 54);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.bindTexture(gl.TEXTURE_2D, this.T.vig); gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.disable(gl.BLEND);
  }
}
