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

/* Rasterise the word onto a COARSE grid and take one cube per lit cell.
   Sampling arbitrary lit pixels by stride (the first attempt) scattered the
   cubes and the letters read as noise; snapping to a grid gives a chunky
   pixel-font that is unmistakably type. Cell pitch also sets the cube size,
   so the glyphs nearly close up. */
async function sampleWord(text, maxCubes) {
  try { await document.fonts.ready; } catch (e) { /* system font is fine */ }

  const COLS = 74, ROWS = 15;          // the pixel grid the word is drawn on
  const SS = 6;                        // supersample, then average per cell
  const W = COLS * SS, H = ROWS * SS;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.fillStyle = "#fff";
  g.font = `800 ${Math.round(H * 0.82)}px Inter, "Helvetica Neue", Arial, sans-serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, W / 2, H / 2 + H * 0.02);

  const d = g.getImageData(0, 0, W, H).data;
  const cells = [];
  for (let r = 0; r < ROWS; r++) {
    for (let col = 0; col < COLS; col++) {
      let ink = 0;
      for (let y = 0; y < SS; y++) {
        for (let x = 0; x < SS; x++) {
          if (d[(((r * SS + y) * W) + (col * SS + x)) * 4 + 3] > 120) ink++;
        }
      }
      // half the cell covered counts as on — keeps stems solid, drops fringes
      if (ink / (SS * SS) >= 0.42) cells.push([col, r]);
    }
  }
  if (!cells.length) return null;

  const WORLD_W = 12.6;
  const pitch = WORLD_W / COLS;
  const pts = cells.map(([col, r]) => new THREE.Vector3(
    (col - (COLS - 1) / 2) * pitch,
    -(r - (ROWS - 1) / 2) * pitch,
    0));

  // more cells than cubes would clip the word; thin evenly if it happens
  if (pts.length > maxCubes) {
    const keep = [];
    const stride = pts.length / maxCubes;
    for (let i = 0; i < maxCubes; i++) keep.push(pts[Math.floor(i * stride)]);
    return { pts: keep, pitch };
  }
  return { pts, pitch };
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
  renderer.toneMappingExposure = 1.12;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.1, 120);
  camera.position.set(0, 0, 16);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const key = new THREE.DirectionalLight(0xFFFFFF, 1.5);
  key.position.set(5, 7, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x7C5CFF, 2.2);   // violet edge
  rim.position.set(-7, -3, -4);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0x4568FF, 1.1);  // blue fill
  fill.position.set(3, -5, 2);
  scene.add(fill);
  scene.add(new THREE.AmbientLight(0xE8EBF5, 1.5));

  /* ---------------------------------------------------------- geometry --- */
  const GRID = mobile ? 16 : 22;
  const COUNT = GRID * GRID;
  const half = (GRID - 1) / 2;

  const geo = new THREE.BoxGeometry(1, 1, 1);
  // Transparent and dark: it must sit UNDER the type at all times. The rim
  // light describes the silhouette; the traces do the talking.
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xC9CEE6, metalness: 0.18, roughness: 0.52,
    clearcoat: 1, clearcoatRoughness: 0.30,
    transparent: true, opacity: 0.72,
  });
  const rig = new THREE.Group();          // lets the object be staged
  scene.add(rig);
  const mesh = new THREE.InstancedMesh(geo, mat, COUNT);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  rig.add(mesh);

  const traceMat = new THREE.MeshBasicMaterial({
    color: 0x4568FF, transparent: true, opacity: 0.9 });
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

  const word = await sampleWord("VEEBROS", COUNT);
  const wordPitch = word ? word.pitch : 0.2;
  if (word) {
    for (let i = 0; i < COUNT; i++) {
      // spare cubes park at the last lit cell and shrink away, so the word
      // is exactly the glyphs and nothing else
      P[i].word = word.pts[i] || null;
    }
  }

  const dummy = new THREE.Object3D();
  const pos = new THREE.Vector3();
  const world = new THREE.Vector3();
  const ndc = new THREE.Vector3();
  const focusW = new THREE.Vector3();
  const panelW = new THREE.Vector3();
  const edgeW = new THREE.Vector3();

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
  let pulse = 0;                        // decays after every keystroke
  const panelN = new THREE.Vector2(0, 0);      // the modal panel, in NDC
  const panelHalf = new THREE.Vector2(0.3, 0.4);
  const focusN = new THREE.Vector2(0, 0);
  const focusTargetN = new THREE.Vector2(0, 0);

  window.__scene = {
    modal(on) { modalT = on ? 1 : 0; },
    // the panel the cubes must ring — they orbit OUTSIDE this box
    panelRect(r) {
      if (!r) return;
      panelN.set((r.left + r.width / 2) / innerWidth * 2 - 1,
                 -((r.top + r.height / 2) / innerHeight * 2 - 1));
      panelHalf.set(Math.max(r.width / innerWidth, 0.12),
                    Math.max(r.height / innerHeight, 0.12));
    },
    focusRect(r) {
      if (!r) return;
      focusTargetN.set((r.left + r.width / 2) / innerWidth * 2 - 1,
                       -((r.top + r.height / 2) / innerHeight * 2 - 1));
    },
    // every keystroke kicks the ring
    type() { pulse = Math.min(1, pulse + 0.55); },
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
    pulse *= 0.90;   // each keystroke tops this back up
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

    let panelWX = 3.2, panelWY = 2.4;
    if (modal > 0.01) {
      ndcToWorld(focusN.x, focusN.y, focusW);
      ndcToWorld(panelN.x, panelN.y, panelW);
      // half-extents of the panel in world units, so the ring clears it
      ndcToWorld(panelN.x + panelHalf.x, panelN.y + panelHalf.y, edgeW);
      panelWX = Math.abs(edgeW.x - panelW.x);
      panelWY = Math.abs(edgeW.y - panelW.y);
    }

    for (let i = 0; i < COUNT; i++) {
      const s = P[i];

      const ang = s.ringA + t * (0.40 - s.ringI * 0.045);
      pos.set(Math.cos(ang) * s.ringRX, Math.sin(ang) * s.ringRY, s.ringZ);
      pos.lerp(s.lattice, toLattice).lerp(s.die, toDie);
      if (toFree > 0) pos.lerp(s.free, toFree);
      if (toWord > 0) {
        if (s.word) pos.lerp(s.word, toWord);
        else pos.lerp(new THREE.Vector3(pos.x * 3.2, pos.y * 3.2, -14), toWord);
      }

      /* Modal: the cubes ring the panel. The orbit starts outside the panel
         box so nothing ever sits on top of the form, it leans toward whichever
         field has focus, and every keystroke kicks it outward for a beat. */
      if (modal > 0.01) {
        const band = i % 3;                       // three concentric rings
        const a2 = s.ringA * 2 + t * (0.55 - band * 0.11) + s.phase * TAU;
        const rx = panelWX + 1.1 + band * 0.95 + pulse * (0.9 + band * 0.35)
                   + burst * (6 + (i % 9) * 0.9);
        const ry = panelWY + 0.9 + band * 0.80 + pulse * (0.7 + band * 0.3)
                   + burst * (4 + (i % 7) * 0.7);
        // lean toward the active field
        const lean = 0.34;
        pos.lerp(new THREE.Vector3(
          panelW.x + (focusW.x - panelW.x) * lean + Math.cos(a2) * rx,
          panelW.y + (focusW.y - panelW.y) * lean + Math.sin(a2) * ry,
          Math.sin(a2 * 2 + t) * (0.8 + pulse * 1.4)), modal);
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
      let side = (0.19 + 0.15 * toDie) * (1 - modal * 0.2);
      let depth = (0.19 * (1 - toDie) + s.h * toDie) * (1 - flat) + 0.20 * flat;
      if (toWord > 0) {
        // fill the cell, minus a hairline, so glyphs read as solid strokes
        const lit = s.word ? wordPitch * 0.92 : 0;
        side = side * (1 - toWord) + lit * toWord;
        depth = depth * (1 - toWord) + wordPitch * 0.55 * toWord;
      }
      dummy.scale.set(side, side, depth);
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
      traceMat.opacity = 0.9 * traceOn;
      // blue settling toward violet as the die comes alive
      traceMat.color.setRGB(0.27 + alive * 0.22, 0.41 - alive * 0.05, 1);
    }

    // the wordmark is the content, so it takes the brand colour
    mat.color.setHex(toWord > 0.5 ? 0x5B6BF0
                   : (modal > 0.5 ? 0x4F5FE8 : 0xC9CEE6));

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
    // the modal is the one place they should be unmistakable
    mat.opacity = (0.72 * (1 - toWord) + 1.0 * toWord)
                * (1 - 0.40 * reading) * (1 - modal) + 0.98 * modal;

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
