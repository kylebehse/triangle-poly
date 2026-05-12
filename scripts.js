import * as THREE from "three";

const canvas = document.querySelector("#triangle-poly");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505);
scene.fog = new THREE.FogExp2(0x050505, 0.035);

const camera = new THREE.PerspectiveCamera(36, window.innerWidth / window.innerHeight, 0.1, 90);
camera.position.set(0, -12, 3.2);

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
renderer.toneMappingExposure = 1.55;

const root = new THREE.Group();
root.rotation.set(-0.16, 0.04, -0.18);
scene.add(root);

const geometry = createTwistedTriangularForm();
geometry.computeVertexNormals();
const formPosition = geometry.attributes.position;
const basePosition = formPosition.array.slice();

const material = new THREE.MeshStandardMaterial({
  color: 0x141414,
  roughness: 0.6,
  metalness: 0.24,
  flatShading: true,
});

const form = new THREE.Mesh(geometry, material);
form.rotation.set(Math.PI * 0.5, -0.18, -0.08);
root.add(form);

const ambient = new THREE.AmbientLight(0xffffff, 0.01);
scene.add(ambient);

const keyLight = new THREE.DirectionalLight(0xffffff, 7.5);
keyLight.position.set(-5.2, -5.8, 4.8);
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0xffffff, 1.8);
rimLight.position.set(5.8, 2.4, 2.2);
scene.add(rimLight);

const clock = new THREE.Clock();

function animate() {
  const elapsed = clock.getElapsedTime();
  const scrollProgress = getScrollProgress();

  form.rotation.x = Math.PI * 0.5 + scrollProgress * Math.PI * 8;
  form.rotation.z = -0.08 + Math.sin(elapsed * 0.18) * 0.025;
  root.rotation.z = -0.18 + Math.sin(elapsed * 0.09) * 0.035;
  animateFormVertices(elapsed);

  const narrowViewport = window.innerWidth < 700;
  const cameraOrbit = elapsed * 0.06;
  root.scale.setScalar(narrowViewport ? 1.05 : 1.28);
  camera.position.x = Math.sin(cameraOrbit) * 0.65;
  camera.position.y = narrowViewport ? -14.2 : -12.6;
  camera.position.z = (narrowViewport ? 4.15 : 3.35) + Math.sin(cameraOrbit * 1.4) * 0.25;
  camera.lookAt(0.05, 0, 0.1);

  const lightOrbit = elapsed * 0.24;
  keyLight.position.x = Math.cos(lightOrbit) * 6.2;
  keyLight.position.y = -5.5 + Math.sin(lightOrbit * 0.85) * 1.6;
  keyLight.position.z = 4.7 + Math.sin(lightOrbit) * 1.3;

  formPosition.needsUpdate = true;
  geometry.computeVertexNormals();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.fov = width < 700 ? 48 : 36;
  camera.updateProjectionMatrix();

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
}

function getScrollProgress() {
  const topSpacer = document.querySelector(".scroll-spacer");
  const scrollStart = topSpacer ? topSpacer.offsetHeight : 0;
  const scrollEnd = document.documentElement.scrollHeight - window.innerHeight;
  const scrollableDistance = scrollEnd - scrollStart;

  if (scrollableDistance <= 0) {
    return 0;
  }

  return THREE.MathUtils.clamp((window.scrollY - scrollStart) / scrollableDistance, 0, 1);
}

function createTwistedTriangularForm() {
  const radialSegments = 3;
  const lengthSegments = 34;
  const length = 30;
  const twistTurns = 4.8;
  const vertices = [];
  const indices = [];

  for (let i = 0; i <= lengthSegments; i += 1) {
    const t = i / lengthSegments;
    const x = (t - 0.5) * length;
    const taper = 1 - Math.pow(Math.abs(t - 0.5) * 1.35, 2);
    const radius = 2.15 + Math.max(0, taper) * 0.72 + Math.sin(t * Math.PI * 9) * 0.08;
    const twist = t * Math.PI * 2 * twistTurns;

    for (let j = 0; j < radialSegments; j += 1) {
      const angle = twist + j * (Math.PI * 2 / radialSegments);
      const ridge = j === 0 ? 1.16 : 0.94;
      vertices.push(
        x,
        Math.cos(angle) * radius * ridge,
        Math.sin(angle) * radius * ridge
      );
    }
  }

  for (let i = 0; i < lengthSegments; i += 1) {
    const ring = i * radialSegments;
    const nextRing = (i + 1) * radialSegments;

    for (let j = 0; j < radialSegments; j += 1) {
      const next = (j + 1) % radialSegments;
      const a = ring + j;
      const b = ring + next;
      const c = nextRing + j;
      const d = nextRing + next;

      pushOutwardFace(indices, vertices, a, b, c);
      pushOutwardFace(indices, vertices, b, d, c);
    }
  }

  const startCenter = vertices.length / 3;
  vertices.push(-length / 2, 0, 0);
  const endCenter = vertices.length / 3;
  vertices.push(length / 2, 0, 0);

  for (let j = 0; j < radialSegments; j += 1) {
    const next = (j + 1) % radialSegments;

    pushOutwardFace(indices, vertices, startCenter, next, j);
    pushOutwardFace(
      indices,
      vertices,
      endCenter,
      lengthSegments * radialSegments + j,
      lengthSegments * radialSegments + next
    );
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  return geometry.toNonIndexed();
}

function pushOutwardFace(indices, vertices, a, b, c) {
  const ax = vertices[a * 3];
  const ay = vertices[a * 3 + 1];
  const az = vertices[a * 3 + 2];
  const bx = vertices[b * 3];
  const by = vertices[b * 3 + 1];
  const bz = vertices[b * 3 + 2];
  const cx = vertices[c * 3];
  const cy = vertices[c * 3 + 1];
  const cz = vertices[c * 3 + 2];

  const abx = bx - ax;
  const aby = by - ay;
  const abz = bz - az;
  const acx = cx - ax;
  const acy = cy - ay;
  const acz = cz - az;
  const normalY = abz * acx - abx * acz;
  const normalZ = abx * acy - aby * acx;
  const centerY = (ay + by + cy) / 3;
  const centerZ = (az + bz + cz) / 3;

  if (normalY * centerY + normalZ * centerZ < 0) {
    indices.push(a, c, b);
    return;
  }

  indices.push(a, b, c);
}

function animateFormVertices(elapsed) {
  const current = formPosition.array;

  for (let i = 0; i < current.length; i += 3) {
    const x = basePosition[i];
    const y = basePosition[i + 1];
    const z = basePosition[i + 2];
    const wave = Math.sin(elapsed * 0.52 + x * 0.72) * 0.045;
    const counterWave = Math.sin(elapsed * 0.27 - x * 0.34) * 0.025;
    const scale = 1 + wave + counterWave;

    current[i] = x;
    current[i + 1] = y * scale;
    current[i + 2] = z * scale;
  }
}

window.addEventListener("resize", resize);
resize();
animate();
