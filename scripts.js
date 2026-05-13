import * as THREE from "three";

const canvas = document.querySelector("#triangle-poly");
const screwScene = document.querySelector(".screw-scene") || canvas.parentElement;
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
renderer.toneMappingExposure = 1.8;

const root = new THREE.Group();
root.rotation.set(-0.18, 0.02, -0.38);
scene.add(root);

const geometry = createTwistedTriangularForm();
geometry.computeVertexNormals();
const formPosition = geometry.attributes.position;
const basePosition = formPosition.array.slice();

const material = new THREE.MeshStandardMaterial({
  color: 0x0f0f0f,
  roughness: 0.5,
  metalness: 0.32,
  flatShading: true,
});

const form = new THREE.Mesh(geometry, material);
form.rotation.set(Math.PI * 0.5, -0.22, 0.02);
root.add(form);

const ambient = new THREE.AmbientLight(0xffffff, 0.006);
scene.add(ambient);

const keyLight = new THREE.DirectionalLight(0xffffff, 9.5);
keyLight.position.set(-6.6, -5.8, 5.4);
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0xffffff, 3.2);
rimLight.position.set(6.4, -1.4, 2.2);
scene.add(rimLight);

const clock = new THREE.Clock();

function animate() {
  const elapsed = clock.getElapsedTime();
  const scrollProgress = getScrollProgress();

  form.rotation.x = Math.PI * 0.5 + scrollProgress * Math.PI * 7.25;
  form.rotation.z = 0.02 + Math.sin(elapsed * 0.14) * 0.012;
  root.rotation.z = -0.38 + Math.sin(elapsed * 0.08) * 0.018;
  animateFormVertices(elapsed);

  const narrowViewport = window.innerWidth < 700;
  const cameraOrbit = elapsed * 0.06;
  root.scale.setScalar(narrowViewport ? 0.62 : 0.82);
  camera.position.x = Math.sin(cameraOrbit) * 0.4;
  camera.position.y = narrowViewport ? -17.2 : -15.8;
  camera.position.z = (narrowViewport ? 4.45 : 3.9) + Math.sin(cameraOrbit * 1.4) * 0.18;
  camera.lookAt(0.05, 0, 0.1);

  updateScrollLighting(scrollProgress, elapsed);

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
  const sceneTop = screwScene ? screwScene.offsetTop : canvas.offsetTop;
  const scrollStart = sceneTop - window.innerHeight;
  const scrollEnd = sceneTop + (screwScene ? screwScene.offsetHeight : canvas.offsetHeight);
  const scrollableDistance = scrollEnd - scrollStart;

  if (scrollableDistance <= 0) {
    return 0;
  }

  return THREE.MathUtils.clamp((window.scrollY - scrollStart) / scrollableDistance, 0, 1);
}

function createTwistedTriangularForm() {
  const radialSegments = 3;
  const lengthSegments = 14;
  const length = 34;
  const twistTurns = 3.35;
  const vertices = [];
  const indices = [];

  for (let i = 0; i <= lengthSegments; i += 1) {
    const t = i / lengthSegments;
    const x = (t - 0.5) * length;
    const taper = 1 - Math.pow(Math.abs(t - 0.5) * 1.18, 2);
    const radius = 2.45 + Math.max(0, taper) * 0.95 + Math.sin(t * Math.PI * 5) * 0.14;
    const twist = t * Math.PI * 2 * twistTurns;

    for (let j = 0; j < radialSegments; j += 1) {
      const angle = twist + j * (Math.PI * 2 / radialSegments);
      const ridge = j === 0 ? 1.34 : 0.9;
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
    const wave = Math.sin(elapsed * 0.35 + x * 0.42) * 0.018;
    const counterWave = Math.sin(elapsed * 0.19 - x * 0.22) * 0.012;
    const scale = 1 + wave + counterWave;

    current[i] = x;
    current[i + 1] = y * scale;
    current[i + 2] = z * scale;
  }
}

function updateScrollLighting(scrollProgress, elapsed) {
  const sweep = scrollProgress * Math.PI * 1.6 - Math.PI * 0.35;
  const shimmer = Math.sin(elapsed * 0.32) * 0.18;

  keyLight.position.set(
    Math.cos(sweep) * 7.8,
    -6.2 + Math.sin(sweep * 0.75) * 1.1,
    4.9 + Math.sin(sweep + shimmer) * 2.0
  );

  rimLight.position.set(
    Math.cos(sweep + Math.PI * 0.78) * 6.8,
    -0.9 + Math.sin(sweep) * 1.4,
    2.0 + Math.cos(sweep * 0.8) * 1.15
  );
}

window.addEventListener("resize", resize);
resize();
animate();
