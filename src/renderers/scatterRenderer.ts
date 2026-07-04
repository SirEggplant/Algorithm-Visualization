// scatterRenderer.ts — 3D Mountain Range Renderer (Three.js)
//
// Drop-in replacement for the 2D canvas heatmap version.
// Renders the fitness landscape as a 3D terrain and plots
// the genetic algorithm population as instanced spheres on
// the surface. The gold star tracks the best individual.
//
// Usage (same call site as before):
//   drawScatter(canvasElement, state);
//
// Three.js must be available. Install with:
//   npm install three @types/three

import * as THREE from 'three';
import type { VisualizationState, Point } from '../../core/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TERRAIN_RESOLUTION = 80;   // grid segments per axis (higher = smoother)
const TERRAIN_RANGE      = 6;    // world-space half-extent (-6 to +6)
const TERRAIN_SCALE_Y    = 1.8;  // vertical exaggeration of the fitness height
const DOT_RADIUS         = 0.12; // radius of each population sphere
const STAR_RADIUS        = 0.22; // radius of the best-individual marker
const CAMERA_RADIUS      = 17;   // initial distance from origin

// The exact same fitness function used by peakFinderGenerator.
// f(x,y) = sin(x) * cos(y) * e^( -sqrt(x²+y²)/4 )
const fitnessFunction = (x: number, y: number): number =>
  Math.sin(x) * Math.cos(y) * Math.exp(-Math.sqrt(x * x + y * y) / 4);

// ---------------------------------------------------------------------------
// Module-level Three.js state
// Initialised once on the first call, reused on every subsequent frame.
// ---------------------------------------------------------------------------

interface RendererState {
  renderer:      THREE.WebGLRenderer;
  scene:         THREE.Scene;
  camera:        THREE.PerspectiveCamera;
  dots:          THREE.InstancedMesh;
  star:          THREE.Mesh;
  dummy:         THREE.Object3D;
  animFrameId:   number;
  // Orbital drag state
  theta:         number;
  phi:           number;
  radius:        number;
  isDragging:    boolean;
  prevMouse:     { x: number; y: number };
  // Cleanup helpers
  boundMouseDown: (e: MouseEvent) => void;
  boundMouseUp:   (e: MouseEvent) => void;
  boundMouseMove: (e: MouseEvent) => void;
  boundWheel:     (e: WheelEvent) => void;
}

// WeakMap so the state is released when the canvas element is GC'd.
const stateMap = new WeakMap<HTMLCanvasElement, RendererState>();

// ---------------------------------------------------------------------------
// Terrain geometry helpers
// ---------------------------------------------------------------------------

/** Maps a fitness value (roughly -0.6 → 1.0) to an RGB triple [0..1]. */
function fitnessToColor(value: number): [number, number, number] {
  let t = (value + 0.6) / 1.6;
  t = Math.min(1, Math.max(0, t));

  const stops: Array<[number, number, number, number]> = [
    [0.00, 0.04, 0.04, 0.18],
    [0.25, 0.10, 0.22, 0.55],
    [0.50, 0.06, 0.65, 0.65],
    [0.75, 0.85, 0.75, 0.10],
    [1.00, 0.82, 0.18, 0.10],
  ];

  for (let i = 0; i < stops.length - 1; i++) {
    const [ap, ar, ag, ab] = stops[i];
    const [bp, br, bg, bb] = stops[i + 1];
    if (t >= ap && t <= bp) {
      const lt = (t - ap) / (bp - ap);
      return [
        ar + (br - ar) * lt,
        ag + (bg - ag) * lt,
        ab + (bb - ab) * lt,
      ];
    }
  }
  return [stops[stops.length - 1][1], stops[stops.length - 1][2], stops[stops.length - 1][3]];
}

/** Builds and returns the terrain mesh with vertex colours. */
function buildTerrain(): THREE.Mesh {
  const size = TERRAIN_RANGE * 2; // 12 world units
  const geo  = new THREE.PlaneGeometry(size, size, TERRAIN_RESOLUTION - 1, TERRAIN_RESOLUTION - 1);
  geo.rotateX(-Math.PI / 2);

  const positions = geo.attributes.position.array as Float32Array;
  const colors    = new Float32Array(positions.length);
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  for (let i = 0; i < positions.length / 3; i++) {
    const wx = positions[i * 3];      // x in world space
    const wz = positions[i * 3 + 2]; // z in world space (PlaneGeometry y → rotated z)
    const v  = fitnessFunction(wx, wz);

    positions[i * 3 + 1] = v * TERRAIN_SCALE_Y; // elevate vertex

    const [r, g, b] = fitnessToColor(v);
    colors[i * 3]     = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
  }

  geo.attributes.position.needsUpdate = true;
  geo.attributes.color.needsUpdate    = true;
  geo.computeVertexNormals();

  const mat = new THREE.MeshLambertMaterial({
    vertexColors: true,
    side: THREE.FrontSide,
  });

  return new THREE.Mesh(geo, mat);
}

/** Overlay wireframe so elevation contours are visible. */
function buildWireframe(): THREE.Mesh {
  const size = TERRAIN_RANGE * 2;
  const geo  = new THREE.PlaneGeometry(size, size, 24, 24);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position.array as Float32Array;
  for (let i = 0; i < pos.length / 3; i++) {
    pos[i * 3 + 1] = fitnessFunction(pos[i * 3], pos[i * 3 + 2]) * TERRAIN_SCALE_Y + 0.005;
  }
  geo.attributes.position.needsUpdate = true;

  const mat = new THREE.MeshBasicMaterial({
    color:       0xffffff,
    wireframe:   true,
    transparent: true,
    opacity:     0.04,
  });

  return new THREE.Mesh(geo, mat);
}

// ---------------------------------------------------------------------------
// Camera orbit helpers
// ---------------------------------------------------------------------------

function updateCamera(state: RendererState): void {
  const { theta, phi, radius, camera } = state;
  camera.position.set(
    radius * Math.sin(phi) * Math.sin(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.cos(theta),
  );
  camera.lookAt(0, 0.5, 0);
}

// ---------------------------------------------------------------------------
// Initialiser — runs once per canvas element
// ---------------------------------------------------------------------------

function initRenderer(canvas: HTMLCanvasElement): RendererState {
  const w = canvas.clientWidth  || canvas.width;
  const h = canvas.clientHeight || canvas.height;

  // --- Renderer ---
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(w, h, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x0a0e1a, 1);

  // --- Scene ---
  const scene = new THREE.Scene();

  // Lighting
  scene.add(new THREE.AmbientLight(0x334466, 1.2));
  const dir = new THREE.DirectionalLight(0xffeedd, 1.8);
  dir.position.set(5, 10, 8);
  scene.add(dir);

  // Terrain
  scene.add(buildTerrain());
  scene.add(buildWireframe());

  // --- Camera ---
  const camera = new THREE.PerspectiveCamera(50, w / h, 0.01, 100);

  // --- Population dots (instanced for performance) ---
  const dotGeo = new THREE.SphereGeometry(DOT_RADIUS, 8, 8);
  const dotMat = new THREE.MeshLambertMaterial({ color: 0x4a7cf7 });
  // Allocate for max expected population; actual count set per frame.
  const dots = new THREE.InstancedMesh(dotGeo, dotMat, 500);
  dots.count = 0;
  scene.add(dots);

  // --- Best-individual star ---
  const starGeo = new THREE.SphereGeometry(STAR_RADIUS, 12, 12);
  const starMat = new THREE.MeshLambertMaterial({
    color:            0xffd700,
    emissive:         new THREE.Color(0xffd700),
    emissiveIntensity: 0.6,
  });
  const star = new THREE.Mesh(starGeo, starMat);
  star.visible = false;
  scene.add(star);

  // --- Orbital drag ---
  const dummy = new THREE.Object3D();
  const theta  = 0.3;
  const phi    = 0.72;
  const radius = CAMERA_RADIUS;

  const s: RendererState = {
    renderer, scene, camera, dots, star, dummy,
    animFrameId: 0,
    theta, phi, radius,
    isDragging: false,
    prevMouse:  { x: 0, y: 0 },
    boundMouseDown: null!,
    boundMouseUp:   null!,
    boundMouseMove: null!,
    boundWheel:     null!,
  };

  updateCamera(s);

  // Bind drag listeners to the canvas wrapper (or canvas itself)
  const el = canvas.parentElement ?? canvas;

  s.boundMouseDown = (e: MouseEvent) => {
    s.isDragging = true;
    s.prevMouse  = { x: e.clientX, y: e.clientY };
  };
  s.boundMouseUp   = () => { s.isDragging = false; };
  s.boundMouseMove = (e: MouseEvent) => {
    if (!s.isDragging) return;
    const dx = e.clientX - s.prevMouse.x;
    const dy = e.clientY - s.prevMouse.y;
    s.theta    -= dx * 0.01;
    s.phi       = Math.max(0.2, Math.min(1.4, s.phi - dy * 0.01));
    s.prevMouse = { x: e.clientX, y: e.clientY };
    updateCamera(s);
  };
  s.boundWheel = (e: WheelEvent) => {
    e.preventDefault();
    s.radius = Math.max(8, Math.min(30, s.radius + e.deltaY * 0.03));
    updateCamera(s);
  };

  el.addEventListener('mousedown', s.boundMouseDown);
  window.addEventListener('mouseup',   s.boundMouseUp);
  window.addEventListener('mousemove', s.boundMouseMove);
  el.addEventListener('wheel', s.boundWheel, { passive: false });

  // Render loop
  const loop = () => {
    s.animFrameId = requestAnimationFrame(loop);
    s.star.rotation.y += 0.03;
    s.renderer.render(s.scene, s.camera);
  };
  loop();

  stateMap.set(canvas, s);
  return s;
}

// ---------------------------------------------------------------------------
// Point → scene-space conversion
// Maps (x, y) in fitness-function space to a Three.js Vector3
// sitting on the terrain surface.
// ---------------------------------------------------------------------------

function pointToWorld(x: number, y: number): THREE.Vector3 {
  // fitness-function coords: x → scene X, y → scene Z
  const sceneY = fitnessFunction(x, y) * TERRAIN_SCALE_Y + 0.18; // slight offset above surface
  return new THREE.Vector3(x, sceneY, y);
}

// ---------------------------------------------------------------------------
// Public API — same signature as the original drawScatter
// ---------------------------------------------------------------------------

/**
 * Renders the current genetic algorithm state onto `canvas` using Three.js.
 *
 * Call this from your VisualizerEngine's onUpdate callback exactly as before:
 *
 *   if (state.type === 'scatter') {
 *     drawScatter(canvasRef.current!, state);
 *   }
 *
 * The Three.js renderer is initialised lazily on the first call and reused
 * on every subsequent frame — no setup required in App.tsx.
 */
export function drawScatter(canvas: HTMLCanvasElement, state: VisualizationState): void {
  if (!canvas) return;

  // Lazy init
  let s = stateMap.get(canvas);
  if (!s) {
    s = initRenderer(canvas);
  }

  const points = state.data as Point[];
  if (!points || points.length === 0) return;

  // --- Update population dot positions ---
  const popSize = points.length;
  s.dots.count  = popSize;

  for (let i = 0; i < popSize; i++) {
    const pos = pointToWorld(points[i].x, points[i].y);
    s.dummy.position.copy(pos);
    s.dummy.updateMatrix();
    s.dots.setMatrixAt(i, s.dummy.matrix);
  }
  s.dots.instanceMatrix.needsUpdate = true;

  // --- Update best-individual star ---
  const bestCoords = state.highlights.coordinates;
  if (bestCoords && bestCoords.length > 0) {
    const best = bestCoords[0];
    const pos  = pointToWorld(best.x, best.y);
    pos.y     += 0.08; // float slightly above its dot
    s.star.position.copy(pos);
    s.star.visible = true;
  } else {
    s.star.visible = false;
  }
}

// ---------------------------------------------------------------------------
// Cleanup — call this when the component unmounts to avoid memory leaks
// ---------------------------------------------------------------------------

/**
 * Disposes of the Three.js renderer and removes event listeners.
 * Call from your React useEffect cleanup:
 *
 *   useEffect(() => {
 *     return () => disposeScatterRenderer(canvasRef.current!);
 *   }, []);
 */
export function disposeScatterRenderer(canvas: HTMLCanvasElement): void {
  if (!canvas) return;
  const s = stateMap.get(canvas);
  if (!s) return;

  cancelAnimationFrame(s.animFrameId);

  const el = canvas.parentElement ?? canvas;
  el.removeEventListener('mousedown', s.boundMouseDown);
  window.removeEventListener('mouseup',   s.boundMouseUp);
  window.removeEventListener('mousemove', s.boundMouseMove);
  el.removeEventListener('wheel', s.boundWheel);

  s.renderer.dispose();
  stateMap.delete(canvas);
}