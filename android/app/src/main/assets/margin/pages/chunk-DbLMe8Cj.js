import{C as e,E as t,S as n,T as r,Z as i}from"./chunk-Si6j2P--.js";var a={tileSize:256,logoScale:.7,finalScale:.69,logoOffset:[0,0],iconPlate:!1,keepPlate:!1,originalColors:!1,opticalDepth:1.1,dispersion:1.7,colorBleed:1.25,doubleBevel:1,bevelWidth:.14,corner:4.8,cornerPull:2.1,cornerWidth:2.2,cornerFocus:.58,edgeSmear:2.85,stretch:0,tilt:.35,bulge:1,specular:1,halo:0,shadow:1,ripple:1,bounce:0,response:.42,startSize:.2,startZoom:2.6,glide:2.3,present:2.4,drift:.12,swell:.5,focus:1,sheen:1,lightTurn:.9,hold:1,background:`#e9e9eb`,plateColor:`#ffffff`,logoColor:`#0e1428`},o={light:a,dark:{...a,logoScale:.72,finalScale:1,iconPlate:!0,halo:1,shadow:0,ripple:.5,startZoom:1.6,drift:.05,opticalDepth:.75,bevelWidth:.22,dispersion:.9,colorBleed:.45,corner:5,cornerPull:1.4,edgeSmear:1.2,tilt:0,cornerWidth:1.2,cornerFocus:.4,background:`#000000`,plateColor:`#05070b`,logoColor:`#ffffff`}},s=512,c=.75;function l(e){return new Promise((t,n)=>{let r=new Image;e.startsWith(`data:`)||(r.crossOrigin=`anonymous`),r.onload=()=>t(r),r.onerror=()=>n(/* @__PURE__ */ Error(`[MARGIN] intro: the logo could not be loaded`)),r.src=e})}function u(e){return e.trimStart().startsWith(`<`)}function d(e){let t=new DOMParser().parseFromString(e,`image/svg+xml`).documentElement;if(!t||t.nodeName.toLowerCase()!==`svg`)throw Error(`[MARGIN] intro: the SVG could not be read`);let n=parseFloat(t.getAttribute(`width`)||``),r=parseFloat(t.getAttribute(`height`)||``),i=(t.getAttribute(`viewBox`)||``).split(/[\s,]+/).map(Number);i.length===4&&i[2]>0&&i[3]>0&&([n,r]=[i[2],i[3]]),n>0&&r>0||(n=r=100);let a=s/Math.max(n,r);t.setAttribute(`width`,String(Math.round(n*a))),t.setAttribute(`height`,String(Math.round(r*a)));let o=new XMLSerializer().serializeToString(t).replace(/currentColor/g,`#ffffff`);return`data:image/svg+xml;charset=utf-8,`+encodeURIComponent(o)}var f=e=>u(e)?d(e):e;function p(e,t,n){let r=document.createElement(`canvas`);r.width=r.height=s;let i=r.getContext(`2d`,{willReadFrequently:!0}),a=Math.min(s/t,s/n),o=(s-t*a)/2,l=(s-n*a)/2;i.drawImage(e,o,l,t*a,n*a);let u=i.getImageData(0,0,s,s).data,d=!0;for(let e=3;e<u.length;e+=388)if(u[e]<250){d=!1;break}let f=[u[0],u[1],u[2]],p=(e,t,n)=>Math.min(1,Math.max(0,(Math.hypot(e-f[0],t-f[1],n-f[2])/441-.08)/.2)),m=s,h=s,g=-1,_=-1;for(let e=0;e<s;e++)for(let t=0;t<s;t++){let n=(e*s+t)*4;(d?p(u[n],u[n+1],u[n+2])*255:u[n+3])>8&&(t<m&&(m=t),t>g&&(g=t),e<h&&(h=e),e>_&&(_=e))}if(g<0)throw Error(`[MARGIN] intro: the logo is empty`);let v=g-m+1,y=_-h+1,b=s*c/Math.max(v,y),x=document.createElement(`canvas`);x.width=x.height=s;let S=x.getContext(`2d`,{willReadFrequently:!0});if(S.imageSmoothingQuality=`high`,S.drawImage(e,s/2-(m+v/2-o)*b,s/2-(h+y/2-l)*b,t*a*b,n*a*b),d){let e=S.getImageData(0,0,s,s),t=e.data;for(let e=0;e<t.length;e+=4)t[e+3]=Math.round(t[e+3]*p(t[e],t[e+1],t[e+2]));S.putImageData(e,0,0)}return x}function m(e){let t=s*s,n=e.getContext(`2d`,{willReadFrequently:!0}).getImageData(0,0,s,s).data,r=0x56bc75e2d63100000,i=new Float64Array(t),a=new Float64Array(t);for(let e=0;e<t;e++){let t=n[e*4+3]/255;if(t>=1)i[e]=0,a[e]=r;else if(t<=0)i[e]=r,a[e]=0;else{let n=.5-t;i[e]=n>0?n*n:0,a[e]=n<0?n*n:0}}let o=new Float64Array(s),c=/* @__PURE__ */ new Float64Array(513),l=new Uint16Array(s);h(i,o,l,c,r),h(a,o,l,c,r);let u=new Float32Array(t);for(let e=0;e<t;e++)u[e]=(Math.sqrt(i[e])-Math.sqrt(a[e]))/s;return u}function h(e,t,n,r,i){for(let a=0;a<s;a++)g(e,a,s,t,n,r,i);for(let a=0;a<s;a++)g(e,a*s,1,t,n,r,i)}function g(e,t,n,r,i,a,o){i[0]=0,a[0]=-o,a[1]=o,r[0]=e[t];for(let c=1,l=0,u=0;c<s;c++){r[c]=e[t+c*n];let s=c*c;do{let e=i[l];u=(r[c]-r[e]+s-e*e)/(c-e)/2}while(u<=a[l]&&--l>-1);l++,i[l]=c,a[l]=u,a[l+1]=o}for(let o=0,c=0;o<s;o++){for(;a[c+1]<o;)c++;let s=i[c],l=o-s;e[t+o*n]=r[s]+l*l}}var _=/* @__PURE__ */ new Map;function v(e){let t=_.get(e);return t||(t=l(f(e)).then(e=>{let t=p(e,e.naturalWidth||s,e.naturalHeight||s);return{canvas:t,sdf:m(t)}}),_.set(e,t),t.catch(()=>_.delete(e))),t}var y=`#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`,b=`#version 300 es
precision highp float;
out vec4 outColor;

uniform vec2 uCenter;      // device px, GL coords
uniform float uTile;       // tile size, device px
uniform sampler2D uSdf;    // signed distance, texture units, + outside
uniform sampler2D uCol;    // premultiplied colour, mipmapped
uniform float uTexSize;
uniform float uBoxFrac;

uniform float uPlateScale; // plate size relative to the tile
uniform float uShapeN;     // superellipse exponent: 2 = circle
uniform float uCornerN;    // final exponent, used by the ghost
uniform float uOptics;     // 1 = full refraction, 0 = flat
uniform float uPlateAlpha; // 1 = glass shown, 0 = bare logo
uniform float uLogoHalf;   // logo half size in plate units (zoom included)
uniform vec2 uLogoOff;     // logo centre, plate units
uniform float uBold;       // stroke swell, in logo half-size units
uniform float uBlur;       // edge softness, plate units
uniform float uFrost;      // milky lift inside a young bubble
uniform float uDome;       // lens bulge height
uniform float uDrop;       // 1 while the glass is a round droplet, 0 once it has spread into the tile
uniform float uPinch;      // the face's stretch toward its corners, at the rim
uniform float uTilt;       // extra stretch of the rising diagonal's corners (0–1)
uniform float uRim;
uniform float uHalo;
uniform float uShadow;
uniform float uGhost;
uniform float uRipR;       // ripple radius, plate sizes
uniform float uRipA;
uniform float uBare;       // 1 once the logo may show without glass (the ending)
uniform float uReach;      // the rim band's full width, plate units
uniform float uCornerPull; // how much harder the corners pull than the sides
uniform float uStreak;     // how far a corner smears content along the rim, in band widths
uniform float uWiden;      // how much wider the folding band grows toward the corners
uniform float uSlab;       // how far the slab stands above the logo, plate units
uniform float uEtaSpread;  // index spread across the spectrum (red highest)
uniform float uFocus;      // how far in along the diagonal a corner focuses, plate units
uniform float uFocusK;     // how quickly the view slides back from the focus across the band
uniform float uFocusSplit; // how much further in red meets than violet, plate units
uniform float uRimLine;    // how far across the band the sight line takes to turn in to the focus
uniform float uCornerOn;   // 0 while the glass is round, 1 once it has spread into the tile
uniform float uDissolve;   // 0 → 1 as the glass lets go of the logo
uniform float uGlow;       // colour bleed in the rim, plate units on screen
uniform float uFaceDisp;   // lateral colour across the face
uniform float uVivid;      // chroma lift of the dispersed light

uniform float uDisp;
uniform float uDouble;
uniform float uBevelW;
uniform float uSpec;
uniform float uIconPlate;
uniform float uUseColor;
uniform float uLightScene; // 1 = light backdrop, 0 = dark
uniform float uLightGlass; // the same for what the glass sits on (the plate, when there is one)
uniform float uKeep;       // 1 = the glass settles into a flat plate instead of letting go of it
uniform float uSheen;      // strength of the light band crossing the face
uniform float uSweep;      // where that band is, plate sizes along its diagonal
uniform float uLightAng;   // how far the rim light has turned, radians

uniform vec3 uBg;
uniform float uTime;       // seconds since the intro began
uniform float uWash;       // strength of the flowing backdrop (0 = flat uBg)
uniform vec3 uPlateCol;
uniform vec3 uLogoCol;

float px; // one device pixel in plate units

vec2 rot(vec2 v, float a) { float c = cos(a), s = sin(a); return vec2(c * v.x - s * v.y, s * v.x + c * v.y); }

// aa: footprint of one screen pixel at q, plate units.
vec4 logoAt(vec2 q, float blur, float aa) {
  float L = uLogoHalf;
  float k = 0.5 * uBoxFrac / L;
  vec2 uv = vec2(0.5 + (q.x - uLogoOff.x) * k, 0.5 - (q.y - uLogoOff.y) * k);
  float d = texture(uSdf, uv).r / k;
  float w = 0.75 * aa + blur;
  float a = 1.0 - smoothstep(-w, w, d - uBold * L);
  vec3 c = uLogoCol;
  if (uUseColor > 0.5) {
    float lod = log2(max(1.0, w * k * uTexSize));
    vec4 c0 = textureLod(uCol, uv, lod);
    vec4 c1 = textureLod(uCol, uv, lod + 3.0);
    vec4 c2 = textureLod(uCol, uv, 7.0);
    c = c2.rgb / max(c2.a, 1e-4);
    c = mix(c, c1.rgb / max(c1.a, 1e-4), smoothstep(0.0, 0.06, c1.a));
    c = mix(c, c0.rgb / max(c0.a, 1e-4), smoothstep(0.02, 0.3, c0.a));
  }
  return vec4(c, a);
}

// Superellipse field. Returns signed distance (plate units, − inside); g = 1 on the rim.
float shape(vec2 p, float scale, float n, out vec2 nOut, out float g, out vec2 dg) {
  vec2 pp = p / scale;
  vec2 a = max(abs(pp), vec2(1e-6));
  g = pow(pow(a.x, n) + pow(a.y, n), 1.0 / n);
  dg = sign(pp) * pow(a, vec2(n - 1.0)) * pow(max(g, 1e-6), 1.0 - n);
  float dgl = max(length(dg), 1e-6);
  nOut = dg / dgl;
  return (g - 1.0) / dgl * scale;
}

// Curvature radius (plate units) of the shape's contour through p.
float contourRadius(vec2 p, float scale, float n) {
  vec2 a = max(abs(p / scale), vec2(1e-4));
  vec2 a1 = pow(a, vec2(n - 1.0));
  vec2 a2 = pow(a, vec2(n - 2.0));
  float k = (n - 1.0) * (a2.x * a1.y * a1.y + a2.y * a1.x * a1.x) / pow(max(dot(a1, a1), 1e-30), 1.5);
  return scale / max(k, 1e-3);
}

// Where the glass at x = s / bwF across its rounded edge looks: a slab uSlab above the logo with a
// quarter-round edge of radius bwF. A straight-down sight line bends inward by Snell's law, so the
// outer rim looks deepest and the view eases back to the face across the edge.
vec2 refractSample(float x, float bwF, float eta, float R, vec2 dirOut, vec2 p, float dome, float offMul) {
  float u = clamp(1.0 - x, 0.0, 0.995);
  float th = asin(u), thr = asin(u / eta);
  float z = uSlab + bwF * sqrt(1.0 - u * u);
  float off = offMul * z * tan(th - thr);
  off = off / (1.0 + off / (6.0 * R));
  return p - (dirOut * off + p * dome) * uOptics;
}

float gauss(float x, float c, float w) { float d = (x - c) / w; return exp(-0.5 * d * d); }
float band(float x, float a, float b, float w) { return smoothstep(a - w, a, x) * (1.0 - smoothstep(b, b + w, x)); }

// Visible spectrum, red (0) to violet (1).
float bump(float x, float c, float w) { float d = (x - c) / w; return exp(-0.5 * d * d); }
vec3 spectrum(float x) {
  return vec3(bump(x, 0.34, 0.2) + 0.08 * bump(x, 0.93, 0.05), bump(x, 0.58, 0.1), bump(x, 0.8, 0.11));
}

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

// Flowing backdrop (Live Orb technique: fbm domain warp). Site colours drift as a slow aurora
// around the glass; light scene = soft tinted paper, dark scene = a dim glow on near-black.
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 3; i++) { v += a * vnoise(p); p = m * p; a *= 0.5; }
  return v;
}
vec3 BG(vec2 q) {
  if (uWash < 0.001) return uBg;
  float t = uTime;
  vec2 w = q * 0.42;
  vec2 o = vec2(fbm(w + vec2(0.0, t * 0.1)), fbm(w + vec2(5.2, 1.3) - vec2(t * 0.08, 0.0)));
  w += 1.25 * (o - 0.5);
  float f = fbm(w + vec2(t * 0.04, -t * 0.06));
  float h = fbm(w * 0.7 + vec2(7.7, -t * 0.05));
  vec3 blue = vec3(0.0, 0.682, 0.925), pink = vec3(0.984, 0.447, 0.6), orange = vec3(1.0, 0.624, 0.353);
  // Blue holds the centre like the orb's core; pink and a little orange swirl around it.
  vec3 tint = mix(blue, pink, smoothstep(0.34, 0.56, h));
  tint = mix(tint, orange, smoothstep(0.56, 0.76, f) * 0.7);
  float r = length(q * vec2(0.8, 1.0));
  float breathe = 0.5 + 0.5 * sin(t * 1.4);
  float orb = exp(-r * r / mix(3.2, 4.2, breathe));
  float body = orb * (0.4 + 0.6 * smoothstep(0.3, 0.72, f)) + 0.3 * smoothstep(0.42, 0.78, f);
  float amt = mix(0.95, 0.6, uLightScene) * body * uWash;
  vec3 lightC = mix(uBg, mix(tint, vec3(1.0), 0.3), amt);
  vec3 darkC = uBg + tint * amt * 0.7;
  return mix(darkC, lightC, uLightScene);
}

void main() {
  px = 2.0 / uTile;
  vec2 p = (gl_FragCoord.xy - uCenter) * px;

  vec4 lg = logoAt(p, uBlur, px);
  vec3 bgP = BG(p);
  vec3 plain = mix(bgP, lg.rgb, lg.a * uBare);

  vec2 nOut, dg; float g;
  float sd = shape(p, uPlateScale, uShapeN, nOut, g, dg);
  float s = -sd;
  float bw = max(uBevelW, 0.004) * uPlateScale;
  float x = clamp(s / bw, 0.0, 1.0);
  float R = contourRadius(p, uPlateScale, uShapeN);
  vec2 pq = p * p;
  float diag = 4.0 * pq.x * pq.y / max((pq.x + pq.y) * (pq.x + pq.y), 1e-6);
  float tilt = mix(1.0 - uTilt, 1.0, smoothstep(-0.02, 0.02, p.x * p.y));
  float pinchPart = uPinch * min(g * g, 1.0) * diag * diag * tilt;
  float dome = uDome * (1.0 - min(g * g, 1.0)) + pinchPart;
  vec2 dirOut = normalize(mix(nOut, p / max(length(p), 1e-4), 0.2));
  // Rounded corners curve both ways, so they draw content in from deeper than the sides.
  float cornerness = max(smoothstep(0.1, 0.9, 4.0 * nOut.x * nOut.x * nOut.y * nOut.y), smoothstep(0.15, 0.75, diag));
  float offMul = 1.0 + 0.4 * max(uCornerPull - 1.0, 0.0) * tilt * cornerness * uCornerOn;
  // Around a corner every sight line meets at one focus a little way in along the diagonal.
  vec2 focus = sign(p) * (pow(0.5, 1.0 / uShapeN) - uFocus * 0.70710678) * uPlateScale;
  float focusW = tilt * cornerness * uOptics * uCornerOn;
  float bwF = max(uReach, 0.004) * (1.0 + uWiden * tilt * cornerness * uCornerOn);
  float xf = clamp(s / bwF, 0.0, 1.0);
  // Footprint of one pixel after refraction, measured in uniform control flow.
  vec2 qc = refractSample(xf, bwF, 1.5, R, dirOut, p, dome, offMul);
  float foot = max(max(length(dFdx(qc)), length(dFdy(qc))), 0.25 * px);

  // Backdrop: anticipation ghost, ripple, soft lift shadow and glow.
  vec3 bg = bgP;
  vec3 lift = mix(uBg + vec3(0.06), mix(uBg, vec3(1.0), 0.55), uLightScene);
  if (uGhost > 0.001) {
    vec2 gn, gdg; float gg;
    float gsd = shape(p, 1.0, uCornerN, gn, gg, gdg);
    bg = mix(bg, lift, uGhost * 0.12 * (1.0 - smoothstep(-0.16, 0.14, gsd)));
    bg *= 1.0 - uGhost * 0.03 * uLightScene * exp(-max(gsd, 0.0) / 0.12) * step(0.0, gsd);
  }
  float outside = max(sd, 0.0);
  if (uRipA > 0.001) {
    float d0 = (uRipR - 1.0) * uPlateScale;
    float rx = (sd - d0) / 0.022;
    float ring = exp(-rx * rx);
    bg += uRipA * ring * (0.04 * (0.55 + 0.45 * dot(nOut, normalize(vec2(-0.5, 0.8))))) * mix(0.5, 1.0, uLightScene);
    bg -= uRipA * 0.016 * uLightScene * exp(-(rx - 1.6) * (rx - 1.6));
  }
  float shadowFall = max(sd, 0.0) / (0.9 * uPlateScale);
  bg *= 1.0 - uShadow * 0.03 * exp(-shadowFall * shadowFall) * step(0.0, sd);
  vec3 haloCol = mix(vec3(0.62, 0.69, 0.80), vec3(1.0), uLightScene);
  bg = mix(bg, haloCol, clamp(uHalo * (0.30 * exp(-outside / (0.025 * uPlateScale)) + 0.07 * exp(-outside / (0.12 * uPlateScale))), 0.0, 1.0) * step(0.0, sd));

  vec3 col = bg;
  float soft = px + uBlur * 0.8 + 0.06 * uDissolve * (1.0 - uKeep) * uPlateScale;
  if (sd < soft) {
    // Lighting surface: a superellipse quarter, flat toward the face and steep at the rim.
    float y1 = 1.0 - x;
    const float K = 2.6;
    float base1 = max(1.0 - pow(y1, K), 1e-4);
    float db = min(pow(y1, K - 1.0) * pow(base1, 1.0 / K - 1.0), 25.0);
    // A second, lower step just inside the first draws the faint inner line.
    float s1 = bw * 0.62;
    float w2 = bw * 0.22;
    float t2 = clamp((s - s1) / w2, -1.0, 1.0);
    float dh2 = uDouble * bw * 0.16;
    float dd = dh2 * 0.5 * cos(t2 * 1.5707963) * 1.5707963 / w2 * step(abs(t2), 0.999);
    vec2 gDome = -uDome * 2.0 * g * dg * step(g, 1.0);
    vec2 grad = -(db + dd) * nOut + gDome;

    vec3 back = mix(uBg, uPlateCol, uIconPlate);
    // The backdrop seen through the glass, sampled once at the refracted centre (not per wavelength).
    vec3 backR = mix(BG(qc), uPlateCol, uIconPlate);
    vec3 liftG = mix(back + vec3(0.06), mix(back, vec3(1.0), 0.55), uLightGlass);
    float rblur = uBlur + 0.05 * length(qc - p) + min(uGlow * uOptics * (1.0 - xf) * foot / px, 0.04);

    // Each wavelength refracts by its own index, so everything the edge draws in fans into colour
    // while the face stays crisp. Around a corner the samples also smear along the rim.
    float cornerW = smoothstep(0.1, 0.9, 4.0 * nOut.x * nOut.x * nOut.y * nOut.y);
    float streak = 0.35 * uStreak * bw * mix(0.15, 1.0, cornerW) * pow(1.0 - xf, 1.5) * uOptics;
    vec2 tangent = vec2(-nOut.y, nOut.x);
    vec3 acc = vec3(0.0), wsum = vec3(0.0);
    for (int i = 0; i < 20; i++) {
      float lam = (float(i) + 0.5) / 20.0;
      float c = uDisp * (1.0 - 2.0 * lam);
      vec2 along = tangent * (streak * 2.0 * (fract(float(i) * 0.618034 + 0.31) - 0.5));
      float cf = uDisp * (1.0 - 2.0 * lam) * (lam > 0.5 ? 1.0 : 0.5);
      vec2 sp = refractSample(xf, bwF, 1.5 + uEtaSpread * c, R, dirOut, p + along,
                              dome + pinchPart * 0.3 * c, offMul);
      vec2 focusL = focus - sign(p) * (0.70710678 * uFocusSplit * c * uPlateScale);
      float wFocus = pow(1.0 - xf, uFocusK) * smoothstep(0.0, uRimLine * (1.0 + 0.6 * c), xf);
      sp = mix(sp, mix(p + along, focusL, wFocus), focusW);
      float faceOnly = smoothstep(0.7, 1.0, xf) * uOptics;
      sp *= 1.0 + uFaceDisp * cf * faceOnly;
      vec4 l = logoAt(sp, rblur + 0.12 * streak + uFaceDisp * 0.5 * max(c, 0.0) * faceOnly, foot);
      vec3 w = spectrum(lam);
      acc += mix(backR, l.rgb, l.a) * w;
      wsum += w;
    }
    vec3 trans = acc / wsum;
    float tl = dot(trans, vec3(0.2126, 0.7152, 0.0722));
    trans = clamp(tl + (trans - tl) * (1.0 + uVivid * uOptics), 0.0, 1.0);
    // A young droplet is milky; the haze only ever lightens.
    float hazeLum = dot(trans, vec3(0.2126, 0.7152, 0.0722));
    float hazeGate = mix(1.0 - smoothstep(0.25, 0.75, hazeLum), smoothstep(0.25, 0.75, hazeLum), uLightGlass);
    trans = mix(trans, liftG, uFrost * 0.45 * hazeGate);

    float glassAmt = pow(1.0 - uDissolve, 1.5);
    float lit = uSpec * glassAmt;
    vec3 rimCol = mix(vec3(0.80, 0.87, 0.97), vec3(1.0), uLightGlass);

    // Light backdrop: the thick edge glows softly white over a clear face, with a hairline that is
    // bright along the top and right and a thin dark silhouette down the left and bottom.
    float sc = uPlateScale;
    float tLum = dot(trans, vec3(0.2126, 0.7152, 0.0722));
    float lightOnly = smoothstep(0.35, 0.85, tLum);
    float hw = smoothstep(-0.85, 0.5, dot(nOut, rot(vec2(0.5, 0.866), uLightAng)));
    float tileBand = band(s, 0.016 * sc, 0.075 * sc, 0.022 * sc);
    float dropBand = (1.0 - smoothstep(0.06 * sc, 0.13 * sc, s)) * smoothstep(0.0, 0.004 * sc, s);
    float glow = mix(0.32 * tileBand, 0.75 * dropBand, uDrop) * lightOnly;
    float edgeLine = gauss(s, 0.005 * sc, 0.0045 * sc);
    float lip = gauss(s, 0.15 * sc, 0.007 * sc) * uDouble * (1.0 - uDrop);
    vec3 lightGlass = mix(trans, vec3(1.0), glow * glassAmt);
    lightGlass += (0.075 * hw * edgeLine + 0.06 * (0.4 + 0.6 * hw) * lip) * lit;
    lightGlass *= 1.0 - 0.05 * (1.0 - hw) * edgeLine * glassAmt * (1.0 - uDrop);
    lightGlass = mix(lightGlass, vec3(1.0), 0.55 * uDrop * glassAmt * edgeLine);

    // Dark backdrop: a cool rim light that grows toward the steep edge, and a small key highlight.
    vec3 Nl = normalize(vec3(-grad, 1.0));
    float edge = 1.0 - Nl.z;
    vec2 ldir = rot(normalize(vec2(-0.62, 0.78)), uLightAng);
    float side = dot(nOut, ldir);
    float fres = pow(edge, 1.5);
    vec3 rim = rimCol * fres * (0.35 + 0.65 * max(side, -side * 0.8)) * uRim * 0.65;
    vec3 Hv = normalize(normalize(vec3(-0.45, 0.6, 0.66)) + vec3(0.0, 0.0, 1.0));
    float spc = pow(max(dot(Nl, Hv), 0.0), 140.0) * 0.8 * smoothstep(0.0, 0.25, y1);
    vec3 darkGlass = trans * (1.0 - 0.25 * fres) + (rim + vec3(spc)) * lit;
    darkGlass = mix(darkGlass, rimCol, uDrop * 0.4 * uSpec * (1.0 - smoothstep(0.0, 0.1 * uPlateScale, s)));
    vec3 glass = mix(darkGlass, lightGlass, uLightGlass);

    // While the glass holds the logo a soft band of light crosses the face, brightest near the rim.
    float sweepD = dot(p / uPlateScale, normalize(vec2(0.8, 0.6))) - uSweep;
    float sheen = uSheen * glassAmt * exp(-sweepD * sweepD / 0.03) * (0.55 + 0.45 * (1.0 - x));
    glass = mix(glass, vec3(1.0), sheen * mix(0.22, 0.42, uLightGlass));

    float cov = clamp(0.5 - sd / soft, 0.0, 1.0);
    col = mix(bg, glass, cov);
  }

  vec3 outc = mix(plain, col, uPlateAlpha);
  outc += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
  outColor = vec4(outc, 1.0);
}`;function x(e){let t=e.getContext(`webgl2`,{antialias:!1,premultipliedAlpha:!1});if(!t)return null;let n=(e,n)=>{let r=t.createShader(e);if(t.shaderSource(r,n),t.compileShader(r),!t.getShaderParameter(r,t.COMPILE_STATUS))throw Error(t.getShaderInfoLog(r)||`shader`);return r},r=t.createProgram();if(t.attachShader(r,n(t.VERTEX_SHADER,y)),t.attachShader(r,n(t.FRAGMENT_SHADER,b)),t.linkProgram(r),!t.getProgramParameter(r,t.LINK_STATUS))throw Error(t.getProgramInfoLog(r)||`program`);t.useProgram(r),t.bindBuffer(t.ARRAY_BUFFER,t.createBuffer()),t.bufferData(t.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),t.STATIC_DRAW);let i=t.getAttribLocation(r,`aPos`);t.enableVertexAttribArray(i),t.vertexAttribPointer(i,2,t.FLOAT,!1,0,0);let a={},o=t.getProgramParameter(r,t.ACTIVE_UNIFORMS);for(let e=0;e<o;e++){let n=t.getActiveUniform(r,e);a[n.name]=t.getUniformLocation(r,n.name)}let l=t.createTexture(),u=t.createTexture();t.uniform1i(a.uSdf,0),t.uniform1i(a.uCol,1);let d=!1,f=e=>{t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,e),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE)};function p(e){t.activeTexture(t.TEXTURE0),t.bindTexture(t.TEXTURE_2D,l),t.pixelStorei(t.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),t.texImage2D(t.TEXTURE_2D,0,t.R16F,s,s,0,t.RED,t.FLOAT,e.sdf),f(t.LINEAR),t.activeTexture(t.TEXTURE1),t.bindTexture(t.TEXTURE_2D,u),t.pixelStorei(t.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!0),t.texImage2D(t.TEXTURE_2D,0,t.RGBA8,t.RGBA,t.UNSIGNED_BYTE,e.canvas),t.pixelStorei(t.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),t.generateMipmap(t.TEXTURE_2D),f(t.LINEAR_MIPMAP_LINEAR),d=!0}function m(e,n,r,i){if(d){t.viewport(0,0,n,r),t.uniform2f(a.uCenter,n/2,r/2),t.uniform1f(a.uTile,i),t.uniform1f(a.uTexSize,s),t.uniform1f(a.uBoxFrac,c);for(let n in e){let r=e[n];typeof r==`number`&&a[n]&&t.uniform1f(a[n],r)}t.uniform3fv(a.uBg,e.uBg),t.uniform3fv(a.uPlateCol,e.uPlateCol),t.uniform3fv(a.uLogoCol,e.uLogoCol),t.uniform2fv(a.uLogoOff,e.uLogoOff),t.drawArrays(t.TRIANGLES,0,3)}}function h(){t.getExtension(`WEBGL_lose_context`)?.loseContext()}return{setLogo:p,render:m,dispose:h}}var S=1.1,C=e=>e.present+S,w=e=>e<0?0:e>1?1:e,T=(e,t,n)=>e+(t-e)*n,E=(e,t,n)=>{let r=w((n-e)/(t-e));return r*r*(3-2*r)},D=(e,t,n)=>{let r=w((n-e)/(t-e));return r*r*r*(r*(r*6-15)+10)};function O(e){let t=e.replace(`#`,``);t.length===3&&(t=t.replace(/./g,`$&$&`));let n=parseInt(t.slice(0,6),16)||0;return[(n>>16&255)/255,(n>>8&255)/255,(n&255)/255]}var k=([e,t,n])=>.2126*e+.7152*t+.0722*n;function A(e,t,n){if(e<=0)return 0;let r=2*Math.PI/t;if(n>=1)return 1-Math.exp(-r*e)*(1+r*e);let i=r*Math.sqrt(1-n*n);return 1-Math.exp(-n*r*e)*(Math.cos(i*e)+n*r/i*Math.sin(i*e))}var j=/* @__PURE__ */ new Map;function M(e,t,n){let r=`${e}/${t}/${n}`,i=j.get(r);if(i===void 0){let a=0,o=3;for(let r=0;r<40;r++){let r=(a+o)/2;A(r,t,n)<e?a=r:o=r}j.set(r,i=o)}return i}function N(e,t,n=0){let r=t.present,i=+!!t.keepPlate,a=1-t.bounce,o=A(e+.01,t.response,a),s=M(.85,t.response,a)-.01,c=A(e-(M(.92,t.response,a)-.01),.4,1),l=1-E(.05,1,c),u=E(0,.08,e),d=t.drift*A(e-.3,2.2,1),f=.25*A(e,.7,1)+.75*D(0,t.glide,e),p=A(e-.5,2.4,1),m=A(e-r,.95,1),h=A(e-r-.05,.65,1),g=.15*t.bulge*(1-E(.4,.95,o)),_=(1+(t.startZoom-1)*(1-f))*(1-.045*p)*T(1,t.finalScale,m)*(1-.06*n),v=T(t.bevelWidth,Math.max(t.bevelWidth,.4),l),y=T(t.startSize,1,o)*(1+d)*(1+.14*h*(1-i))*(1-i*(.03*h+.06*n)),b=O(t.background);return{uPlateScale:y,uShapeN:T(2,t.corner,c),uCornerN:t.corner,uOptics:1-E(.55,1,h),uPlateAlpha:i?u*(1-n):u*(1-E(.45,1,h)),uLogoHalf:t.logoScale*_,uLogoOff:[t.logoOffset[0]*_,t.logoOffset[1]*_],uKeep:i,uSheen:t.sheen,uSweep:T(-1.6,1.6,D(.9,r-.1,e)),uLightAng:t.lightTurn*D(.4,r+.4,e),uBold:t.swell*.03*(1-f),uBlur:t.focus*.05*(1-E(.3,.95,o))+.03*n,uFrost:t.focus*(1-E(.5,.95,o)),uPinch:.38*t.stretch*E(.1,.9,c)*E(.75,.97,f),uTilt:t.tilt,uDome:g,uDrop:l,uRim:1+.8*l,uHalo:t.halo*(.5+.5*l)*(1-i*h),uShadow:Math.max(t.shadow*E(.45,.8,o)*(1-E(0,.6,c)),.8*t.shadow*i*h),uGhost:E(0,.03,e)*(1-E(.04,.08,e)),uRipR:1+.9*Math.max(0,e-s),uRipA:t.ripple*E(s,s+.06,e)*Math.exp(-Math.max(0,e-s)/.6),uBare:(1-i)*E(r-.25,r,e)*(1-n),uReach:v*y,uCornerPull:t.cornerPull,uStreak:t.edgeSmear,uWiden:t.cornerWidth,uSlab:.3*t.opticalDepth,uEtaSpread:.06,uFocus:t.cornerFocus,uFocusK:1,uFocusSplit:.056*t.colorBleed,uRimLine:.09,uCornerOn:E(.35,1,c),uGlow:.012*t.colorBleed,uFaceDisp:.012*t.dispersion,uVivid:.85,uDissolve:h,uDisp:t.dispersion,uDouble:t.doubleBevel,uBevelW:v*(1-h),uSpec:t.specular,uIconPlate:+!!t.iconPlate,uUseColor:+!!t.originalColors,uLightScene:+(k(b)>.5),uLightGlass:+(k(t.iconPlate?O(t.plateColor):b)>.5),uBg:b,uTime:e,uWash:E(0,.6,e),uPlateCol:O(t.plateColor),uLogoCol:O(t.logoColor)}}var P=.961;function F(e){try{if(localStorage.getItem(`margin:force-gl`))return!1}catch{}let t=e.getContext(`webgl2`);if(!t)return!0;let n=t.getExtension(`WEBGL_debug_renderer_info`),r=String(n?t.getParameter(n.UNMASKED_RENDERER_WEBGL):t.getParameter(t.RENDERER));return/swiftshader|llvmpipe|softpipe|software|basic render/i.test(r)}function I(a,s){try{sessionStorage.setItem(n,`1`)}catch{}e(!0);let c=s===`dark`,l=c?`#111112`:`#f5f4f1`,u={...o[c?`dark`:`light`],background:l,plateColor:c?`#1a1a1c`:`#ffffff`,logoColor:c?`#ffffff`:`#00aeec`,logoScale:.62,finalScale:c?.9:.8,startZoom:2.3},d=document.createElement(`div`);d.className=`intro`,d.style.background=l,d.setAttribute(`role`,`presentation`);let f=document.createElement(`canvas`);return d.append(f),a.append(d),new Promise(n=>{let o=0,s=!1,c=0,l=(t=!1)=>{s||(s=!0,cancelAnimationFrame(o),e(!1),removeEventListener(`keydown`,m,!0),!(!t&&c&&p())&&(d.style.transition=`opacity ${t?.25:.6}s cubic-bezier(.4, 0, .2, 1)`,d.style.opacity=`0`,d.style.pointerEvents=`none`,setTimeout(()=>{h?.dispose(),d.remove()},t?300:650),n()))},p=()=>{let e=a.querySelector(`.top .brand .tv`);if(!e)return!1;let r=e.getBoundingClientRect();if(!r.width||r.bottom<0||r.top>innerHeight)return!1;let o=f.getBoundingClientRect(),s=c*u.logoScale*u.finalScale*P,l=s*21/24,p=document.createElement(`div`);p.className=`intro-fly`,i(p,t),Object.assign(p.style,{left:`${o.left+o.width/2-s/2}px`,top:`${o.top+o.height/2-l/2}px`,width:`${s}px`,height:`${l}px`,color:u.logoColor}),a.append(p),f.style.visibility=`hidden`,e.style.visibility=`hidden`;let m=p.getBoundingClientRect(),g=r.left-m.left,_=r.top-m.top,v=r.width/m.width,y=`cubic-bezier(.65, 0, .35, 1)`;d.style.transition=`opacity .5s ${y}`,d.style.opacity=`0`,d.style.pointerEvents=`none`;let b=getComputedStyle(e).color,x=p.animate([{transform:`translate(0, 0) scale(1)`,color:u.logoColor},{transform:`translate(${g}px, ${_}px) scale(${v})`,color:b}],{duration:750,easing:y,fill:`forwards`}),S=!1,C=()=>{S||(S=!0,e.style.visibility=``,p.remove(),h?.dispose(),d.remove())};return x.finished.then(C,C),setTimeout(C,1500),n(),!0},m=()=>l(!0);if(d.addEventListener(`pointerdown`,m),d.addEventListener(`wheel`,m,{passive:!0}),addEventListener(`keydown`,m,!0),F(f)){l(!0);return}let h=null;try{h=x(f)}catch(e){console.info(`[MARGIN] 开场动画不可用`,e)}h?(setTimeout(()=>{try{if(localStorage.getItem(`margin:intro-freeze`))return}catch{}l()},6e3),v(r).then(e=>{if(s)return;h.setLogo(e);let t=C(u),n=performance.now(),r=NaN;try{r=parseFloat(localStorage.getItem(`margin:intro-freeze`)??``)}catch{}let i=Math.min(devicePixelRatio||1,1.5),a=0,d=0,p=e=>{let s=Number.isFinite(r)?r:(e-n)/1e3;a&&s>.15&&(d=e-a>22?d+1:Math.max(0,d-1),d>=4&&i>.6&&(i=Math.max(.6,i*.75),d=0)),a=e;let m=i,g=f.clientWidth,_=f.clientHeight,v=Math.max(1,Math.round(g*m)),y=Math.max(1,Math.round(_*m));(f.width!==v||f.height!==y)&&(f.width=v,f.height=y);let b=Math.min(u.tileSize,Math.min(g,_)/1.75);c=b,h.render(N(Math.min(s,t),u),v,y,b*m),!Number.isFinite(r)&&(s>=t+.25?l():o=requestAnimationFrame(p))};o=requestAnimationFrame(p)}).catch(e=>{console.info(`[MARGIN] 开场图标加载失败`,e),l(!0)})):l(!0)})}export{I as playIntro};