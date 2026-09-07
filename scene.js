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

/* A hand-authored 9x12 pixel font.
 *
 * Rasterising a real typeface and thresholding it will never give clean
 * letterforms at this size — the font's optical corrections and the cutoff
 * leave B with two different bowls and O lopsided. At nine cells wide there
 * is no room for optical correction anyway, so the glyphs are drawn by hand.
 *
 * Every letter is deliberately symmetric:
 *   V  mirrors left-right
 *   E  mirrors top-bottom
 *   B  mirrors top-bottom, so both bowls are identical (rows 2-4 and 7-9)
 *   O  mirrors both ways
 *   S  has 180-degree rotational symmetry
 * The 12-row grid is 2 (bar) + 3 (counter) + 2 (bar) + 3 (counter) + 2 (bar),
 * which is what makes the B and E halves come out exactly equal.
 */
const GLYPHS = {
  V: ["##.....##",
      "##.....##",
      "##.....##",
      "##.....##",
      ".##...##.",
      ".##...##.",
      ".##...##.",
      "..##.##..",
      "..##.##..",
      "..##.##..",
      "...###...",
      "...###..."],
  E: ["#########",
      "#########",
      "##.......",
      "##.......",
      "##.......",
      "#######..",
      "#######..",
      "##.......",
      "##.......",
      "##.......",
      "#########",
      "#########"],
  B: ["#######..",
      "########.",
      "##....##.",
      "##....##.",
      "##....##.",
      "########.",
      "########.",
      "##....##.",
      "##....##.",
      "##....##.",
      "########.",
      "#######.."],
  R: ["#######..",
      "########.",
      "##....##.",
      "##....##.",
      "##....##.",
      "########.",
      "#######..",
      "##..##...",
      "##...##..",
      "##...##..",
      "##....##.",
      "##....##."],
  O: ["..#####..",
      ".#######.",
      "##.....##",
      "##.....##",
      "##.....##",
      "##.....##",
      "##.....##",
      "##.....##",
      "##.....##",
      "##.....##",
      ".#######.",
      "..#####.."],
  S: [".#######.",
      "########.",
      "##.......",
      "##.......",
      "##.......",
      "########.",
      ".########",
      ".......##",
      ".......##",
      ".......##",
      ".########",
      ".#######."],
};

function buildWord(text, maxCubes) {
  const GW = 9, GH = 12, GAP = 2;
  const letters = text.split("");
  const cols = letters.length * GW + (letters.length - 1) * GAP;

  const cells = [];
  letters.forEach((ch, n) => {
    const g = GLYPHS[ch];
    if (!g) return;
    const x0 = n * (GW + GAP);
    for (let r = 0; r < GH; r++) {
      for (let c = 0; c < GW; c++) {
        if (g[r][c] === "#") cells.push([x0 + c, r]);
      }
    }
  });
  if (!cells.length) return null;

  const WORLD_W = 13.2;
  const pitch = WORLD_W / cols;
  let pts = cells.map(([c, r]) => new THREE.Vector3(
    (c - (cols - 1) / 2) * pitch,
    -(r - (GH - 1) / 2) * pitch,
    0));

  // never clip a glyph: if the word needs more cubes than we have, thin it
  if (pts.length > maxCubes) {
    const keep = [];
    const stride = pts.length / maxCubes;
    for (let i = 0; i < maxCubes; i++) keep.push(pts[Math.floor(i * stride)]);
    pts = keep;
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
  let mobile = innerWidth < 760;
  const narrow = () => innerWidth < 760;
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
      u: i / COUNT,          // its place on the modal loop, 0..1
      word: null,
    });
  }

  const word = buildWord("VEEBROS", COUNT);
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
    mobile = narrow();
    renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.75 : 2));
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    readScroll();
  }, { passive: true });
  readScroll();

  let live = true;
  addEventListener("visibilitychange", () => { live = !document.hidden; });

  /* Pointer. Cubes shove out of the way of the cursor — most obvious on the
     wordmark, where they are the content and you can push the letters
     around. Hover only: a coarse pointer has no hover state and a finger
     already has the scroll. */
  const hover = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const ptr = new THREE.Vector2(-9, -9);
  const ptrTo = new THREE.Vector2(-9, -9);
  let ptrOn = 0, ptrOnT = 0;
  if (hover) {
    addEventListener("pointermove", (e) => {
      ptrTo.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight * 2 - 1));
      ptrOnT = 1;
    }, { passive: true });
    addEventListener("pointerleave", () => { ptrOnT = 0; }, { passive: true });
    addEventListener("blur", () => { ptrOnT = 0; });
  }

  /* ------------------------------------------------ the page's handle --- */
  // The modal drives these. Cubes gather around whichever field has focus.
  let modal = 0, modalT = 0;            // 0..1 blend into modal behaviour
  let burst = 0, burstT = 0;            // the submit payoff
  let loopT = 0;                        // the loop's own rotation
  // A keystroke drops a beep at a random point on the loop; it travels round
  // and fades. Up to four at once, so fast typing reads as a run of them.
  const beeps = [];
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
    // every keystroke drops a beep on the loop
    type() {
      if (beeps.length > 3) beeps.shift();
      beeps.push({ u: Math.random(), life: 1 });
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
    loopT += 0.0016;                       // the loop never stops turning
    ptrOn += (ptrOnT - ptrOn) * 0.08;
    ptr.x += (ptrTo.x - ptr.x) * 0.16;
    ptr.y += (ptrTo.y - ptr.y) * 0.16;
    for (let b = beeps.length - 1; b >= 0; b--) {
      beeps[b].u += 0.016;                 // the beep runs around the loop
      beeps[b].life -= 0.012;
      if (beeps[b].life <= 0) beeps.splice(b, 1);
    }
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

    let panelWX = 3.2, panelWY = 2.4, modalBeep = 0;
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
      let sBeep = 0;

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

      const wantsCopyPush = roam > 0.02 && modal < 0.4;
      const wantsPointer = ptrOn > 0.02 && modal < 0.4;
      if (wantsCopyPush || wantsPointer) {
        world.copy(pos).applyMatrix4(rig.matrixWorld).applyMatrix4(mesh.matrix);
        ndc.copy(world).project(camera);

        if (wantsCopyPush) {
          const d = Math.max(Math.abs(ndc.x) / ZX, Math.abs(ndc.y) / ZY);
          if (d < 1) {
            const len = Math.hypot(ndc.x, ndc.y) || 0.0001;
            const f = (1 - d) * PUSH * roam * (1 - modal);
            pos.x += (ndc.x / len) * f;
            pos.y += (ndc.y / len) * f * 0.7;
          }
        }

        if (wantsPointer) {
          // aspect-corrected so the shove is round, not an ellipse
          const dx = (ndc.x - ptr.x) * (innerWidth / innerHeight);
          const dy = ndc.y - ptr.y;
          const dist = Math.hypot(dx, dy);
          const R = 0.42;
          if (dist < R) {
            const k = (1 - dist / R);
            const f = k * k * 2.6 * ptrOn / Math.max(rig.scale.x, 0.2);
            const len = dist || 0.0001;
            pos.x += (dx / len) * f;
            pos.y += (dy / len) * f;
            pos.z += k * 0.9;
            sBeep = Math.max(sBeep, k * 0.55);   // and they swell a little
          }
        }
      }

      dummy.position.copy(pos);
      const r = roam * (1 - modal);
      dummy.rotation.set(0.22 * r, ang * 0.25 * r + modal * ang * 0.4, 0.16 * r);

      const flat = Math.max(toWord, modal);
      let side = (0.19 + 0.15 * toDie) * (1 - modal * 0.2) * (1 + sBeep * 1.5);
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
