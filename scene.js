/* The Fab — one object, four states, driven by scroll.
 *
 * Not decoration. The states ARE the 48 hours: an ordered intake ring
 * collapses into a lattice, resolves into a chip floorplan, then lights up
 * and ships. Same object throughout, because it is the same idea throughout.
 *
 * Nothing here is random. Every position is a function of index — concentric
 * rings, a square lattice, a symmetric die floorplan with an IO ring, a cache
 * band, four cores and a bus cross. Noise would read as a screensaver.
 *
 * ES module, loaded after first paint. Every failure path leaves the CSS
 * gradient poster in place.
 */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const host = document.querySelector("[data-scene]");
if (host && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
  boot().catch(() => { /* poster stays */ });
}

const TAU = Math.PI * 2;

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
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.1, 120);
  camera.position.set(0, 0, 16);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  // Key stays low: the copy is the brightest thing on the page, always.
  const key = new THREE.DirectionalLight(0xBFD0FF, 1.15);
  key.position.set(5, 7, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x4C6BFF, 3.1);   // blue silhouette edge
  rim.position.set(-7, -3, -4);
  scene.add(rim);
  scene.add(new THREE.AmbientLight(0x141B2E, 1.0));

  /* ---------------------------------------------------------- geometry --- */
  const GRID = mobile ? 16 : 22;
  const COUNT = GRID * GRID;
  const half = (GRID - 1) / 2;

  const geo = new THREE.BoxGeometry(1, 1, 1);
  // Dark slate, not bright metal. It must sit UNDER the type, never compete
  // with it — the rim light does the describing, the blue traces do the
  // talking.
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0x232C42, metalness: 0.94, roughness: 0.34,
    clearcoat: 1, clearcoatRoughness: 0.22,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, COUNT);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(mesh);

  const traceMat = new THREE.MeshBasicMaterial({ color: 0x4C6BFF });
  const traceCount = mobile ? 24 : 40;
  const traces = new THREE.InstancedMesh(geo, traceMat, traceCount);
  traces.frustumCulled = false;
  scene.add(traces);

  /* Die floorplan — symmetric by construction, and it means something:
     an IO ring at the edge, a cache band inside it, four cores in the
     middle, and a bus cross cut through the centre. */
  function floorplan(cx, cy) {
    const ax = Math.abs(cx) / half, ay = Math.abs(cy) / half;
    const m = Math.max(ax, ay);
    const onBus = Math.abs(cx) < 0.75 || Math.abs(cy) < 0.75;
    if (m > 0.86) return 0.20;                    // IO pads
    if (onBus) return 0.34;                       // bus channels
    if (m > 0.60) return 0.52;                    // cache band
    // four cores: a repeating module inside each quadrant
    const mod = ((Math.abs(cx) | 0) % 3 === 0 || (Math.abs(cy) | 0) % 3 === 0);
    return mod ? 0.78 : 1.15;
  }

  const P = [];
  // Sized against the frustum, not picked by feel: at fov 38 / z 16 the
  // visible half-width is ~8.2 world units, so the outer ring sits just
  // past it and the inner one clears the copy column.
  const RINGS = 6;
  const perRing = Math.ceil(COUNT / RINGS);
  for (let i = 0; i < COUNT; i++) {
    const gx = i % GRID, gy = (i / GRID) | 0;
    const cx = gx - half, cy = gy - half;

    // 0 — intake: concentric rings, ordered and symmetric from frame one
    const ring = Math.floor(i / perRing);
    const slot = i % perRing;
    const a = (slot / perRing) * TAU + ring * 0.18;

    P.push({
      ringA: a, ringI: ring,
      // wide and flat: the formation frames the column instead of crossing it
      ringRX: 5.2 + ring * 1.0,
      ringRY: 2.0 + ring * 0.5,
      ringZ: Math.sin(ring * 1.1) * 1.2,
      lattice: new THREE.Vector3(cx * 0.66, cy * 0.66, 0),
      die: new THREE.Vector3(cx * 0.40, cy * 0.40, 0),
      h: floorplan(cx, cy),
      phase: (i % 7) / 7,
    });
  }

  const dummy = new THREE.Object3D();
  const pos = new THREE.Vector3();
  const world = new THREE.Vector3();
  const ndc = new THREE.Vector3();

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

  const ease = (t) => t * t * (3 - 2 * t);
  const seg = (p, a, b) => Math.min(1, Math.max(0, (p - a) / (b - a)));

  // The copy column, in normalised device coordinates. Anything roaming
  // inside this gets pushed out — the object gives the words room rather
  // than crawling over them.
  const ZX = 0.62, ZY = 0.44, PUSH = 1.7;

  let t = 0;
  function frame() {
    requestAnimationFrame(frame);
    if (!live) return;

    cur += (target - cur) * 0.055;
    t += 0.0055;

    const p = cur;
    const toLattice = ease(seg(p, 0.03, 0.32));
    const toDie     = ease(seg(p, 0.32, 0.64));
    const alive     = ease(seg(p, 0.58, 0.86));
    const launch    = ease(seg(p, 0.88, 1.0));
    const roam      = 1 - toDie;          // repulsion only while it roams

    for (let i = 0; i < COUNT; i++) {
      const s = P[i];

      // rings turn at their own rate — outer slower, like an intake queue
      const ang = s.ringA + t * (0.40 - s.ringI * 0.045);
      pos.set(Math.cos(ang) * s.ringRX, Math.sin(ang) * s.ringRY, s.ringZ);
      pos.lerp(s.lattice, toLattice).lerp(s.die, toDie);

      if (roam > 0.02) {
        world.copy(pos).applyMatrix4(mesh.matrixWorld);
        ndc.copy(world).project(camera);
        const d = Math.max(Math.abs(ndc.x) / ZX, Math.abs(ndc.y) / ZY);
        if (d < 1) {
          const len = Math.hypot(ndc.x, ndc.y) || 0.0001;
          const f = (1 - d) * PUSH * roam;
          pos.x += (ndc.x / len) * f;
          pos.y += (ndc.y / len) * f * 0.7;
        }
      }

      pos.y += launch * (4.5 + s.phase * 2);
      dummy.position.copy(pos);

      // aligned from the start; only a slow shared drift, never tumbling
      const r = roam;
      dummy.rotation.set(0.22 * r, ang * 0.25 * r, 0.16 * r);

      const side = 0.19 + 0.15 * toDie;
      dummy.scale.set(side, side, 0.19 * (1 - toDie) + s.h * toDie);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;

    // traces route across the die once there is a die to route across
    const span = half * 0.40;
    for (let i = 0; i < traceCount; i++) {
      const f = (i + 0.5) / traceCount;
      const vertical = i % 2 === 0;
      const lane = (f * 2 - 1) * span;
      const slide = Math.sin(t * 0.9 + i * 0.9) * span * 0.55;
      if (vertical) dummy.position.set(lane, slide, 0.62);
      else dummy.position.set(slide, lane, 0.62);
      dummy.position.y += launch * 5.2;
      dummy.rotation.set(0, 0, 0);
      const on = alive * (0.55 + 0.45 * Math.sin(t * 2.6 + i * 1.7));
      const long = 1.5 * toDie;
      if (vertical) dummy.scale.set(0.05, long, 0.03 + 0.06 * on);
      else dummy.scale.set(long, 0.05, 0.03 + 0.06 * on);
      dummy.updateMatrix();
      traces.setMatrixAt(i, dummy.matrix);
    }
    traces.instanceMatrix.needsUpdate = true;
    traceMat.color.setRGB(0.22 + alive * 0.36, 0.36 + alive * 0.34, 1);
    traces.visible = toDie > 0.05;

    // camera: slow and small. Pulled back in the die state so the chip sits
    // under the copy rather than filling the frame.
    camera.position.set(Math.sin(t * 0.22) * 0.7 * roam,
                        0.9 - toDie * 0.4 - launch * 1.2,
                        16 + toLattice * 1.2 - toDie * 1.0 + launch * 3.2);
    mesh.rotation.x = -0.88 * toDie;
    mesh.rotation.z = 0.20 * toDie;
    traces.rotation.copy(mesh.rotation);
    camera.lookAt(0, -1.1 * toDie + launch * 2.2, 0);

    renderer.render(scene, camera);
  }

  host.classList.add("is-live");
  frame();
}
