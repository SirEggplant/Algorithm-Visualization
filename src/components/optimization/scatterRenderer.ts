// src/components/optimization/scatterRenderer.ts
import * as THREE from 'three';
import type { VisualizationState, Point } from '../../core/types';

// ─── Constants ───
const TERRAIN_SCALE_Y = 1.8;
const DOT_RADIUS = 0.12;
const STAR_RADIUS = 0.22;
const CAMERA_RADIUS = 17;

// This is the ONLY fitness function used by the renderer. 
// Algorithms will use the SAME function to ensure consistency.
const fitnessFunction = (x: number, y: number): number => {
  return Math.sin(x) * Math.cos(y) * Math.exp(-Math.sqrt(x * x + y * y) / 4);
};

// ─── Renderer State ───
interface RendererState {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  dots: THREE.InstancedMesh;
  star: THREE.Mesh;
  dummy: THREE.Object3D;
  animFrameId: number;
  terrainMesh: THREE.Mesh | null;
  wireframeMesh: THREE.Mesh | null;
  peakMeshes: THREE.Mesh[];
  theta: number;
  phi: number;
  radius: number;
  isDragging: boolean;
  prevMouse: { x: number; y: number };
  boundMouseDown: (e: MouseEvent) => void;
  boundMouseUp: (e: MouseEvent) => void;
  boundMouseMove: (e: MouseEvent) => void;
  boundWheel: (e: WheelEvent) => void;
}

const stateMap = new WeakMap<HTMLCanvasElement, RendererState>();
let currentRange = 6;
let currentResolution = 60;

// ─── Terrain Builders ───
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
      return [ar + (br - ar) * lt, ag + (bg - ag) * lt, ab + (bb - ab) * lt];
    }
  }
  return [stops[stops.length - 1][1], stops[stops.length - 1][2], stops[stops.length - 1][3]];
}

function buildTerrain(range: number, resolution: number): THREE.Mesh {
  const size = range * 2;
  const geo = new THREE.PlaneGeometry(size, size, resolution - 1, resolution - 1);
  geo.rotateX(-Math.PI / 2);

  const positions = geo.attributes.position.array as Float32Array;
  const colors = new Float32Array(positions.length);
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  for (let i = 0; i < positions.length / 3; i++) {
    const wx = positions[i * 3];
    const wz = positions[i * 3 + 2];
    const v = fitnessFunction(wx, wz);
    positions[i * 3 + 1] = v * TERRAIN_SCALE_Y;
    const [r, g, b] = fitnessToColor(v);
    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
  }

  geo.attributes.position.needsUpdate = true;
  geo.attributes.color.needsUpdate = true;
  geo.computeVertexNormals();

  const mat = new THREE.MeshLambertMaterial({
    vertexColors: true,
    side: THREE.FrontSide,
  });

  return new THREE.Mesh(geo, mat);
}

function buildWireframe(range: number, resolution: number): THREE.Mesh {
  const size = range * 2;
  const wireRes = Math.min(resolution, 24);
  const geo = new THREE.PlaneGeometry(size, size, wireRes - 1, wireRes - 1);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position.array as Float32Array;
  for (let i = 0; i < pos.length / 3; i++) {
    pos[i * 3 + 1] = fitnessFunction(pos[i * 3], pos[i * 3 + 2]) * TERRAIN_SCALE_Y + 0.005;
  }
  geo.attributes.position.needsUpdate = true;

  const mat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    wireframe: true,
    transparent: true,
    opacity: 0.04,
  });

  return new THREE.Mesh(geo, mat);
}

// ─── Camera ───
function updateCamera(state: RendererState): void {
  const { theta, phi, radius, camera } = state;
  camera.position.set(
    radius * Math.sin(phi) * Math.sin(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.cos(theta)
  );
  camera.lookAt(0, 0.5, 0);
}

// ─── Point to World ───
function pointToWorld(x: number, y: number): THREE.Vector3 {
  const sceneY = fitnessFunction(x, y) * TERRAIN_SCALE_Y + 0.18;
  return new THREE.Vector3(x, sceneY, y);
}

// ─── Init Renderer ───
function initRenderer(canvas: HTMLCanvasElement): RendererState {
  const w = canvas.clientWidth || canvas.width;
  const h = canvas.clientHeight || canvas.height;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(w, h, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x0a0e1a, 1);

  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0x334466, 1.2));
  const dir = new THREE.DirectionalLight(0xffeedd, 1.8);
  dir.position.set(5, 10, 8);
  scene.add(dir);

  const camera = new THREE.PerspectiveCamera(50, w / h, 0.01, 100);

  const dotGeo = new THREE.SphereGeometry(DOT_RADIUS, 8, 8);
  const dotMat = new THREE.MeshLambertMaterial({ color: 0x4a7cf7 });
  const dots = new THREE.InstancedMesh(dotGeo, dotMat, 500);
  dots.count = 0;
  scene.add(dots);

  const starGeo = new THREE.SphereGeometry(STAR_RADIUS, 12, 12);
  const starMat = new THREE.MeshLambertMaterial({
    color: 0xffd700,
    emissive: new THREE.Color(0xffd700),
    emissiveIntensity: 0.6,
  });
  const star = new THREE.Mesh(starGeo, starMat);
  star.visible = false;
  scene.add(star);

  const dummy = new THREE.Object3D();
  const theta = 0.3;
  const phi = 0.72;
  const radius = CAMERA_RADIUS;

  const terrainMesh = buildTerrain(currentRange, currentResolution);
  const wireframeMesh = buildWireframe(currentRange, currentResolution);
  scene.add(terrainMesh);
  scene.add(wireframeMesh);

  const s: RendererState = {
    renderer,
    scene,
    camera,
    dots,
    star,
    dummy,
    animFrameId: 0,
    terrainMesh,
    wireframeMesh,
    peakMeshes: [],
    theta,
    phi,
    radius,
    isDragging: false,
    prevMouse: { x: 0, y: 0 },
    boundMouseDown: null!,
    boundMouseUp: null!,
    boundMouseMove: null!,
    boundWheel: null!,
  };

  updateCamera(s);

  const el = canvas.parentElement ?? canvas;

  s.boundMouseDown = (e: MouseEvent) => {
    s.isDragging = true;
    s.prevMouse = { x: e.clientX, y: e.clientY };
  };
  s.boundMouseUp = () => { s.isDragging = false; };
  s.boundMouseMove = (e: MouseEvent) => {
    if (!s.isDragging) return;
    const dx = e.clientX - s.prevMouse.x;
    const dy = e.clientY - s.prevMouse.y;
    s.theta -= dx * 0.01;
    s.phi = Math.max(0.2, Math.min(1.4, s.phi - dy * 0.01));
    s.prevMouse = { x: e.clientX, y: e.clientY };
    updateCamera(s);
  };
  s.boundWheel = (e: WheelEvent) => {
    e.preventDefault();
    s.radius = Math.max(8, Math.min(30, s.radius + e.deltaY * 0.03));
    updateCamera(s);
  };

  el.addEventListener('mousedown', s.boundMouseDown);
  window.addEventListener('mouseup', s.boundMouseUp);
  window.addEventListener('mousemove', s.boundMouseMove);
  el.addEventListener('wheel', s.boundWheel, { passive: false });

  const loop = () => {
    s.animFrameId = requestAnimationFrame(loop);
    s.star.rotation.y += 0.03;
    s.renderer.render(s.scene, s.camera);
  };
  loop();

  stateMap.set(canvas, s);
  return s;
}

// ─── Public API ───

export function drawScatter(canvas: HTMLCanvasElement, state: VisualizationState): void {
  if (!canvas) return;

  let s = stateMap.get(canvas);
  if (!s) {
    s = initRenderer(canvas);
  }

  // Clear previous peak meshes
  s.peakMeshes.forEach(mesh => {
    s.scene.remove(mesh);
    mesh.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
  });
  s.peakMeshes = [];

  const points = state.data as Point[];
  if (!points || points.length === 0) return;

  // Update population dots
  const popSize = points.length;
  s.dots.count = popSize;

  for (let i = 0; i < popSize; i++) {
    const pos = pointToWorld(points[i].x, points[i].y);
    s.dummy.position.copy(pos);
    s.dummy.updateMatrix();
    s.dots.setMatrixAt(i, s.dummy.matrix);
  }
  s.dots.instanceMatrix.needsUpdate = true;

  // Update star + peak dots
  const bestCoords = state.highlights.coordinates;
  if (bestCoords && bestCoords.length > 0) {
    // Best = first one (gold star)
    const best = bestCoords[0];
    const posBest = pointToWorld(best.x, best.y);
    posBest.y += 0.08;
    s.star.position.copy(posBest);
    s.star.visible = true;

    // Additional peaks = red dots
    for (let i = 1; i < bestCoords.length; i++) {
      const peak = bestCoords[i];
      const posPeak = pointToWorld(peak.x, peak.y);
      const peakGeo = new THREE.SphereGeometry(0.12, 8, 8);
      const peakMat = new THREE.MeshLambertMaterial({ color: 0xff4444 });
      const peakMesh = new THREE.Mesh(peakGeo, peakMat);
      peakMesh.position.copy(posPeak);
      s.scene.add(peakMesh);
      s.peakMeshes.push(peakMesh);
    }
  } else {
    s.star.visible = false;
  }
}

export function clearScene(canvas: HTMLCanvasElement): void {
  if (!canvas) return;
  const s = stateMap.get(canvas);
  if (!s) return;

  s.dots.count = 0;
  s.dots.instanceMatrix.needsUpdate = true;
  s.star.visible = false;

  s.peakMeshes.forEach(mesh => {
    s.scene.remove(mesh);
    mesh.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
  });
  s.peakMeshes = [];
}

export function resetCamera(canvas: HTMLCanvasElement): void {
  if (!canvas) return;
  const s = stateMap.get(canvas);
  if (!s) return;
  s.theta = 0.3;
  s.phi = 0.72;
  s.radius = CAMERA_RADIUS;
  updateCamera(s);
}

export function rebuildTerrain(canvas: HTMLCanvasElement, range: number, resolution: number): void {
  if (!canvas) return;
  const s = stateMap.get(canvas);
  if (!s) return;

  if (s.terrainMesh) {
    s.scene.remove(s.terrainMesh);
    s.terrainMesh.geometry.dispose();
    (s.terrainMesh.material as THREE.Material).dispose();
  }
  if (s.wireframeMesh) {
    s.scene.remove(s.wireframeMesh);
    s.wireframeMesh.geometry.dispose();
    (s.wireframeMesh.material as THREE.Material).dispose();
  }

  s.terrainMesh = buildTerrain(range, resolution);
  s.wireframeMesh = buildWireframe(range, resolution);
  s.scene.add(s.terrainMesh);
  s.scene.add(s.wireframeMesh);

  currentRange = range;
  currentResolution = resolution;
}

export function disposeScatterRenderer(canvas: HTMLCanvasElement): void {
  if (!canvas) return;
  const s = stateMap.get(canvas);
  if (!s) return;

  cancelAnimationFrame(s.animFrameId);

  const el = canvas.parentElement ?? canvas;
  el.removeEventListener('mousedown', s.boundMouseDown);
  window.removeEventListener('mouseup', s.boundMouseUp);
  window.removeEventListener('mousemove', s.boundMouseMove);
  el.removeEventListener('wheel', s.boundWheel);

  if (s.terrainMesh) {
    s.terrainMesh.geometry.dispose();
    (s.terrainMesh.material as THREE.Material).dispose();
  }
  if (s.wireframeMesh) {
    s.wireframeMesh.geometry.dispose();
    (s.wireframeMesh.material as THREE.Material).dispose();
  }

  s.renderer.dispose();
  stateMap.delete(canvas);
}