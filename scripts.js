import * as THREE from "three";

const canvas = document.querySelector("#triangle-poly");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505);
scene.fog = new THREE.FogExp2(0x050505, 0.06);

const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 80);
camera.position.set(0, -10.5, 5.8);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;

const root = new THREE.Group();
root.rotation.z = -0.18;
scene.add(root);

const seededRandom = createSeededRandom(42);
const baseGeometry = new THREE.PlaneGeometry(15.5, 10, 18, 12);
const position = baseGeometry.attributes.position;

for (let i = 0; i < position.count; i += 1) {
  const x = position.getX(i);
  const y = position.getY(i);
  const ridge = Math.max(0, 1 - Math.abs(y + 0.25) / 5);
  const centerLift = Math.max(0, 1 - Math.abs(x) / 7.8);
  const foregroundLift = Math.max(0, 1 - Math.abs(y + 3.25) / 3.5);
  const peakBias = Math.pow(ridge * 0.55 + centerLift * 0.32 + foregroundLift * 0.45, 1.35);
  const height = 0.08 + seededRandom() * 0.95 + peakBias * (2.2 + seededRandom() * 3.9);

  position.setZ(i, height);
}

baseGeometry.rotateZ(0.12);
baseGeometry.computeVertexNormals();

const geometry = baseGeometry.toNonIndexed();
baseGeometry.dispose();

const animatedPosition = geometry.attributes.position;
const vertexBaseZ = new Float32Array(animatedPosition.count);
const vertexPhase = new Float32Array(animatedPosition.count);

for (let i = 0; i < animatedPosition.count; i += 1) {
  vertexBaseZ[i] = animatedPosition.getZ(i);
  vertexPhase[i] = pointPhase(animatedPosition.getX(i), animatedPosition.getY(i));
}

const material = new THREE.MeshStandardMaterial({
  color: 0x111111,
  roughness: 0.68,
  metalness: 0.18,
  flatShading: true,
  side: THREE.DoubleSide,
});

const terrain = new THREE.Mesh(geometry, material);
terrain.position.set(0, 0.65, -0.75);
root.add(terrain);

const ambient = new THREE.AmbientLight(0xffffff, 0.015);
scene.add(ambient);

const keyLight = new THREE.DirectionalLight(0xffffff, 5.8);
keyLight.position.set(-3.8, -5.5, 6.2);
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0x9f9f9f, 1.15);
rimLight.position.set(6.5, 4.2, 3.2);
scene.add(rimLight);

const clock = new THREE.Clock();

function animate() {
  const elapsed = clock.getElapsedTime();

  terrain.rotation.z = Math.sin(elapsed * 0.14) * 0.07;
  root.rotation.z = -0.18 + Math.sin(elapsed * 0.1) * 0.055;

  const cameraOrbit = elapsed * 0.09;
  camera.position.x = Math.sin(cameraOrbit) * 1.45;
  camera.position.y = -10.8 + Math.cos(cameraOrbit * 0.8) * 0.75;
  camera.position.z = 3.65 + Math.sin(cameraOrbit * 0.65) * 0.38;
  camera.lookAt(0.05, -0.05, 1.65);

  const lightOrbit = elapsed * 0.32;
  keyLight.position.x = Math.cos(lightOrbit) * 5.8;
  keyLight.position.y = -4.8 + Math.sin(lightOrbit * 0.85) * 2.2;
  keyLight.position.z = 5.3 + Math.sin(lightOrbit) * 1.7;

  for (let i = 0; i < animatedPosition.count; i += 1) {
    const pulse = Math.sin(elapsed * 0.72 + vertexPhase[i]);
    const slowLift = Math.sin(elapsed * 0.22 + vertexPhase[i] * 0.4);
    animatedPosition.setZ(i, vertexBaseZ[i] + pulse * 0.08 + slowLift * 0.045);
  }

  animatedPosition.needsUpdate = true;
  geometry.computeVertexNormals();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.fov = width < 700 ? 46 : 38;
  camera.updateProjectionMatrix();

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
}

function createSeededRandom(seed) {
  let value = seed;

  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function pointPhase(x, y) {
  const value = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return (value - Math.floor(value)) * Math.PI * 2;
}

window.addEventListener("resize", resize);
resize();
animate();
