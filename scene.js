/* The Fab — one object, five acts, driven by scroll.
 *
 * The acts ARE the 48 hours, and the last one is the sign-off:
 *   rings -> lattice -> chip die (traces alive) -> release -> VEEBROS
 *
 * Nothing is random. Every position is a function of index: concentric
 * ellipses, a square lattice, a die floorplan with an IO ring / bus / cache /
 * four cores, and finally letterforms sampled from real type.
 *
 * It also answers to the page: instances are pushed out of the copy column
 * while roaming, and when the idea modal is open they gather around whichever
 * field has focus.
 */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const TAU = Math.PI * 2;

const host = document.querySelector("[data-scene]");
if (host && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
  // Never swallow this. A silent catch turns a one-line ReferenceError into an
  // invisible failure: the canvas mounts, `is-live` never lands, the poster
  // stays up, and the page looks merely empty rather than broken.
  boot().catch((err) => { console.warn("[scene] disabled:", err); });
}

/* Sample real type into points so the wordmark is the actual typeface, not a
   hand-plotted approximation. */
async function sampleText(text, want) {
  try { await document.fonts.ready; } catch (e) { /* system font is fine */ }
  const W = 340, H = 74;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.fillStyle = "#fff";
  g.font = '800 54px Inter, "Helvetica Neue", Arial, sans-serif';
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.letterSpacing = "2px";
  g.fillText(text, W / 2, H / 2 + 1);

  const d = g.getImageData(0, 0, W, H).data;
  const hits = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (d[(y * W + x) * 4 + 3] > 130) hits.push([x, y]);
    }
  }
  if (!hits.length) return null;

  // even stride rather than random picks, so the letters stay legible
  const out = [];
  const stride = hits.length / want;
  for (let i = 0; i < want; i++) out.push(hits[Math.floor(i * stride) % hits.length]);

  const S = 13.5 / W;                       // world units across
  return out.map(([x, y]) => new THREE.Vector3(
    (x - W / 2) * S, -(y - H / 2) * S, 0));
}

async function boot() {
  const canvas = document.createElement("canvas");
  canvas.className = "scene__canvas";
  host.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: false, alpha: true, powerPreference: "high-performance",
  });
  const mobile = innerWidth < 760;
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.75 : 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.1, 120);
  camera.position.set(0, 0, 16);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const key = new THREE.DirectionalLight(0xBFD0FF, 0.85);
  key.position.set(5, 7, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x4C6BFF, 2.4);
  rim.position.set(-7, -3, -4);
  scene.add(rim);
  scene.add(new THREE.AmbientLight(0x121828, 0.9));

  /* ---------------------------------------------------------- geometry --- */
  const GRID = mobile ? 16 : 22;
  const COUNT = GRID * GRID;
  const half = (GRID - 1) / 2;

  const geo = new THREE.BoxGeometry(1, 1, 1);
  // Transparent and dark: it must sit UNDER the type at all times. The rim
  // light describes the silhouette; the traces do the talking.
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0x1E2739, metalness: 0.9, roughness: 0.38,
    clearcoat: 1, clearcoatRoughness: 0.25,
    transparent: true, opacity: 0.62,
  });
  const rig = new THREE.Group();          // lets the object be staged
  scene.add(rig);
  const mesh = new THREE.InstancedMesh(geo, mat, COUNT);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  rig.add(mesh);

  const traceMat = new THREE.MeshBasicMaterial({
    color: 0x4C6BFF, transparent: true, opacity: 0.8 });
  const traceCount = mobile ? 24 : 40;
  const traces = new THREE.InstancedMesh(geo, traceMat, traceCount);
  traces.frustumCulled = false;
  rig.add(traces);

  function floorplan(cx, cy) {
    const ax = Math.abs(cx) / half, ay = Math.abs(cy) / half;
    const m = Math.max(ax, ay);
    const onBus = Math.abs(cx) < 0.75 || Math.abs(cy) < 0.75;
    if (m > 0.86) return 0.20;                      // IO pads
    if (onBus) return 0.34;                         // bus channels
    if (m > 0.60) return 0.52;                      // cache band
    const mod = ((Math.abs(cx) | 0) % 3 === 0 || (Math.abs(cy) | 0) % 3 === 0);
    return mod ? 0.78 : 1.15;                       // four cores
  }

  // Sized against the frustum: at fov 38 / z 16 the visible half-width is
  // ~8.2 world units, so the outer ring sits just past it and the inner one
  // clears the copy column.
  const RINGS = 6;
  const perRing = Math.ceil(COUNT / RINGS);

  const P = [];
  for (let i = 0; i < COUNT; i++) {
    const gx = i % GRID, gy = (i / GRID) | 0;
    const cx = gx - half, cy = gy - half;
    const ring = Math.floor(i / perRing);
    const slot = i % perRing;

    P.push({
      ringA: (slot / perRing) * TAU + ring * 0.18,
      ringI: ring,
      ringRX: 5.2 + ring * 1.0,
      ringRY: 2.0 + ring * 0.5,
      ringZ: Math.sin(ring * 1.1) * 1.2,
      lattice: new THREE.Vector3(cx * 0.66, cy * 0.66, 0),
      die: new THREE.Vector3(cx * 0.40, cy * 0.40, 0),
      // release: a wide symmetric spray, still ordered
      free: new THREE.Vector3(
        Math.cos((i / COUNT) * TAU * 3) * (7 + (i % 5) * 1.1),
        Math.sin((i / COUNT) * TAU * 3) * (4.4 + (i % 4) * 0.8),
        Math.sin(i * 0.7) * 3),
      h: floorplan(cx, cy),
      phase: (i % 7) / 7,
      word: null,
    });
  }

  const wordPts = await sampleText("VEEBROS", COUNT);
  if (wordPts) for (let i = 0; i < COUNT; i++) P[i].word = wordPts[i];

  const dummy = new THREE.Object3D();
  const pos = new THREE.Vector3();
  const world = new THREE.Vector3();
  const ndc = new THREE.Vector3();
  const focusW = new THREE.Vector3();

  /* ------------------------------------------------------------ scroll --- */
  let target = 0, cur = 0;
  const readScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    target = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
  };
  addEventListener("scroll", readScroll, { passive: true });
  addEventListener("resize", () => {
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    readScroll();
  }, { passive: true });
  readScroll();

  let live = true;
  addEventListener("visibilitychange", () => { live = !document.hidden; });

  /* ------------------------------------------------ the page's handle --- */
  // The modal drives these. Cubes gather around whichever field has focus.
  let modal = 0, modalT = 0;            // 0..1 blend into modal behaviour
  let burst = 0, burstT = 0;            // the submit payoff
  const focusN = new THREE.Vector2(0, 0);
  const focusTargetN = new THREE.Vector2(0, 0);

  window.__scene = {
    modal(on) { modalT = on ? 1 : 0; },
    focusRect(r) {                       // a DOMRect in CSS pixels
      if (!r) return;
      focusTargetN.set((r.left + r.width / 2) / innerWidth * 2 - 1,
                       -((r.top + r.height / 2) / innerHeight * 2 - 1));
    },
    burst() { burstT = 1; setTimeout(() => { burstT = 0; }, 2600); },
  };

  // NDC -> the world point on the z=0 plane, so a screen position becomes a
  // place the cubes can actually gather around.
  function ndcToWorld(nx, ny, out) {
    out.set(nx, ny, 0.5).unproject(camera);
    out.sub(camera.position);
    const t = -camera.position.z / out.z;
    return out.multiplyScalar(t).add(camera.position);
  }

  const ease = (t) => t * t * (3 - 2 * t);
  const seg = (p, a, b) => Math.min(1, Math.max(0, (p - a) / (b - a)));

  const ZX = 0.62, ZY = 0.44, PUSH = 1.7;

  let t = 0;
  function frame() {
    requestAnimationFrame(frame);
    if (!live) return;

    cur += (target - cur) * 0.055;
    modal += (modalT - modal) * 0.07;
    burst += (burstT - burst) * 0.09;
    focusN.x += (focusTargetN.x - focusN.x) * 0.08;
    focusN.y += (focusTargetN.y - focusN.y) * 0.08;
    t += 0.0055;

    const p = cur;
    const toLattice = ease(seg(p, 0.03, 0.32));
    const toDie     = ease(seg(p, 0.32, 0.62));
    const alive     = ease(seg(p, 0.56, 0.78));
    const toFree    = ease(seg(p, 0.78, 0.88));   // release
    const toWord    = ease(seg(p, 0.88, 1.0));    // the sign-off
    const roam      = Math.max(1 - toDie, toFree * (1 - toWord));

    if (modal > 0.01) ndcToWorld(focusN.x, focusN.y, focusW);

    for (let i = 0; i < COUNT; i++) {
      const s = P[i];

      const ang = s.ringA + t * (0.40 - s.ringI * 0.045);
      pos.set(Math.cos(ang) * s.ringRX, Math.sin(ang) * s.ringRY, s.ringZ);
      pos.lerp(s.lattice, toLattice).lerp(s.die, toDie);
      if (toFree > 0) pos.lerp(s.free, toFree);
      if (toWord > 0 && s.word) pos.lerp(s.word, toWord);

      // While the modal is open the field is the subject: cubes orbit it.
      if (modal > 0.01) {
        const a2 = s.ringA * 3 + t * 0.9 + s.phase * TAU;
        const rr = 2.4 + (i % 6) * 0.62 + burst * (5 + (i % 9) * 0.9);
        pos.lerp(new THREE.Vector3(
          focusW.x + Math.cos(a2) * rr * 1.35,
          focusW.y + Math.sin(a2) * rr * 0.78,
          Math.sin(a2 * 2) * 1.1), modal);
      }

      if (roam > 0.02 && modal < 0.4) {
        world.copy(pos).applyMatrix4(mesh.matrixWorld);
        ndc.copy(world).project(camera);
        const d = Math.max(Math.abs(ndc.x) / ZX, Math.abs(ndc.y) / ZY);
        if (d < 1) {
          const len = Math.hypot(ndc.x, ndc.y) || 0.0001;
          const f = (1 - d) * PUSH * roam * (1 - modal);
          pos.x += (ndc.x / len) * f;
          pos.y += (ndc.y / len) * f * 0.7;
        }
      }

      dummy.position.copy(pos);
      const r = roam * (1 - modal);
      dummy.rotation.set(0.22 * r, ang * 0.25 * r + modal * ang * 0.4, 0.16 * r);

      const flat = Math.max(toWord, modal);
      const side = (0.19 + 0.15 * toDie) * (1 - toWord * 0.28);
      dummy.scale.set(side, side,
        (0.19 * (1 - toDie) + s.h * toDie) * (1 - flat) + 0.20 * flat);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;

    const traceOn = toDie * (1 - toFree) * (1 - modal);
    traces.visible = traceOn > 0.04;
    if (traces.visible) {
      const span = half * 0.40;
      for (let i = 0; i < traceCount; i++) {
        const f = (i + 0.5) / traceCount;
        const vertical = i % 2 === 0;
        const lane = (f * 2 - 1) * span;
        const slide = Math.sin(t * 0.9 + i * 0.9) * span * 0.55;
        if (vertical) dummy.position.set(lane, slide, 0.62);
        else dummy.position.set(slide, lane, 0.62);
        dummy.rotation.set(0, 0, 0);
        const on = alive * (0.55 + 0.45 * Math.sin(t * 2.6 + i * 1.7));
        const long = 1.5 * traceOn;
        if (vertical) dummy.scale.set(0.05, long, 0.03 + 0.06 * on);
        else dummy.scale.set(long, 0.05, 0.03 + 0.06 * on);
        dummy.updateMatrix();
        traces.setMatrixAt(i, dummy.matrix);
      }
      traces.instanceMatrix.needsUpdate = true;
      traceMat.opacity = 0.8 * traceOn;
      traceMat.color.setRGB(0.22 + alive * 0.36, 0.36 + alive * 0.34, 1);
    }

    mat.color.setHex(toWord > 0.5 ? 0x2C3654 : 0x1E2739);

    /* Staging. The die is ~9 world units across and the copy column is dead
       centre, so a centred chip simply sits on top of the words. While there
       is anything to read the object moves to the right edge and shrinks —
       a machine glimpsed beside the text. It only takes the stage where
       there is nothing to read: the hero and the sign-off. */
    const reading = toDie * (1 - toWord);             // 1 while the die is up
    const offX = 6.4 * reading * (1 - modal);
    const sc = (1 - 0.46 * reading) * (1 - modal * 0.25);
    rig.position.x += (offX - rig.position.x) * 0.06;
    rig.scale.setScalar(rig.scale.x + (sc - rig.scale.x) * 0.06);
    // and it recedes further while the eye is on the copy
    mat.opacity = (0.62 * (1 - toWord) + 0.95 * toWord) * (1 - 0.42 * reading);

    const flatten = Math.max(toWord, modal);
    camera.position.set(Math.sin(t * 0.22) * 0.7 * roam * (1 - flatten),
                        (0.9 - toDie * 0.4) * (1 - flatten),
                        16 + toLattice * 1.2 - toDie * 1.0 + toFree * 1.6
                          - toWord * 1.2 + modal * 1.0);
    mesh.rotation.x = -0.88 * toDie * (1 - flatten);
    mesh.rotation.z = 0.20 * toDie * (1 - flatten);
    traces.rotation.copy(mesh.rotation);
    camera.lookAt(0, (-1.1 * toDie) * (1 - flatten), 0);

    renderer.render(scene, camera);
  }

  host.classList.add("is-live");
  frame();
}
