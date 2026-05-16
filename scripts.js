import * as THREE from "three";

let topBackground = "#14a762";
let bottomBackground = "#d44747";
const lengthMultiplier = 3;
const formLength = 34 * lengthMultiplier;

const canvas = document.querySelector("#triangle-poly");
const screwScene = document.querySelector(".screw-scene") || canvas.parentElement;
const stickyFrame = document.querySelector(".sticky-frame");
const scene = new THREE.Scene();
scene.background = null;
scene.fog = new THREE.FogExp2(0x050505, 0.035);

if (stickyFrame) {
  stickyFrame.style.setProperty("--top-background", topBackground);
  stickyFrame.style.setProperty("--bottom-background", bottomBackground);
}

const camera = new THREE.PerspectiveCamera(36, window.innerWidth / window.innerHeight, 0.1, 90);
camera.position.set(0, -12, 3.2);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0);
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
form.renderOrder = 2;
const horizonShield = createHorizonShield();
const colorSilhouette = createColorSilhouette();
const formSilhouette = createFormSilhouette();
root.add(horizonShield);
root.add(colorSilhouette);
root.add(formSilhouette);
root.add(form);

const ambient = new THREE.AmbientLight(0xffffff, 0.006);
scene.add(ambient);

const keyLight = new THREE.DirectionalLight(0xffffff, 9.5);
keyLight.position.set(-6.6, -5.8, 5.4);
scene.add(keyLight);

const sunLight = new THREE.DirectionalLight(0xffffff, keyLight.intensity / 3);
sunLight.position.set(6.4, 5.8, 8.2);
scene.add(sunLight);

const underLight = new THREE.DirectionalLight(0xffffff, keyLight.intensity / 8);
underLight.position.set(-5.8, 4.8, -4.2);
scene.add(underLight);

const rimLight = new THREE.DirectionalLight(0xffffff, 3.2);
rimLight.position.set(6.4, -1.4, 2.2);
scene.add(rimLight);

const clock = new THREE.Clock();
const pointerLight = {
  current: new THREE.Vector2(0.26, 0.28),
  target: new THREE.Vector2(0.26, 0.28),
};
const progressOverride = {
  value: null,
};

function animate() {
  const elapsed = clock.getElapsedTime();
  const scrollProgress = getScrollProgress();

  form.rotation.x = Math.PI * 0.5 + scrollProgress * Math.PI * 7.25;
  const screwWobble = Math.sin(elapsed * 0.14) * 0.012;
  form.rotation.z = 0.02 + screwWobble;
  colorSilhouette.rotation.copy(form.rotation);
  formSilhouette.rotation.copy(form.rotation);
  root.rotation.z = -0.38 + Math.sin(elapsed * 0.08) * 0.018;
  animateFormVertices(elapsed);

  const { width: viewportWidth } = getViewportSize();
  const narrowViewport = viewportWidth < 700;
  const cameraOrbit = elapsed * 0.06;
  const baseScale = narrowViewport ? 0.62 : 0.82;
  const exitScale = THREE.MathUtils.lerp(1, 0.5, scrollProgress);
  root.scale.setScalar(baseScale * exitScale);
  camera.position.x = Math.sin(cameraOrbit) * 0.4;
  camera.position.y = narrowViewport ? -17.2 : -15.8;
  camera.position.z = (narrowViewport ? 4.45 : 3.9) + Math.sin(cameraOrbit * 1.4) * 0.18;
  camera.lookAt(0.05, 0, 0.1);
  updateHorizonShield();

  updatePointerLighting(elapsed);

  formPosition.needsUpdate = true;
  geometry.computeVertexNormals();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function resize() {
  const { width, height } = getViewportSize();

  camera.aspect = width / height;
  camera.fov = width < 700 ? 48 : 36;
  camera.updateProjectionMatrix();

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  horizonShield.material.uniforms.resolution.value.set(width, height);
  colorSilhouette.material.uniforms.resolution.value.set(width, height);
}

function getScrollProgress() {
  if (progressOverride.value !== null) {
    return progressOverride.value;
  }

  const { start, end } = getScrollRange();
  const scrollableDistance = end - start;

  if (scrollableDistance <= 0) {
    return 0;
  }

  return THREE.MathUtils.clamp((window.scrollY - start) / scrollableDistance, 0, 1);
}

function getScrollRange() {
  const viewportHeight = getViewportSize().height;
  const sceneTop = screwScene ? screwScene.offsetTop : canvas.offsetTop;
  const sceneHeight = screwScene ? screwScene.offsetHeight : canvas.offsetHeight;

  return {
    start: sceneTop - viewportHeight,
    end: sceneTop + sceneHeight,
  };
}

function getViewportSize() {
  const frameRect = stickyFrame ? stickyFrame.getBoundingClientRect() : null;
  const width = Math.max(1, Math.round(frameRect?.width || canvas.clientWidth || window.innerWidth));
  const height = Math.max(1, Math.round(frameRect?.height || canvas.clientHeight || window.innerHeight));

  return { width, height };
}

function createTwistedTriangularForm() {
  const radialSegments = 3;
  const lengthSegments = 14 * lengthMultiplier;
  const length = formLength;
  const twistTurns = 3.35 * lengthMultiplier;
  const vertices = [];
  const indices = [];

  for (let i = 0; i <= lengthSegments; i += 1) {
    const t = i / lengthSegments;
    const x = (t - 0.5) * length;
    const taper = 1 - Math.pow(Math.abs(t - 0.5) * 1.18, 2);
    const radius = 2.45 + Math.max(0, taper) * 0.95 + Math.sin(t * Math.PI * 5 * lengthMultiplier) * 0.14;
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

function createHorizonShield() {
  const width = 276;
  const height = 24;
  const distanceBehindForm = 7.2;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array([
    -width / 2, distanceBehindForm, -height / 2,
    width / 2, distanceBehindForm, -height / 2,
    -width / 2, distanceBehindForm, height / 2,
    width / 2, distanceBehindForm, height / 2,
  ]);
  const uvs = new Float32Array([
    0, 0,
    1, 0,
    0, 1,
    1, 1,
  ]);

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex([0, 1, 2, 2, 1, 3]);

  const material = new THREE.ShaderMaterial({
    transparent: false,
    depthWrite: false,
    depthTest: true,
    toneMapped: false,
    uniforms: {
      topColor: { value: parseCssHexColor(topBackground) },
      bottomColor: { value: parseCssHexColor(bottomBackground) },
      resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      splitSlope: { value: 0 },
      splitCenter: { value: 0.5 },
    },
    vertexShader: `
      varying vec2 vUv;

      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform vec2 resolution;
      uniform float splitSlope;
      uniform float splitCenter;
      varying vec2 vUv;

      void main() {
        vec2 screenUv = gl_FragCoord.xy / resolution;
        float yFromTop = 1.0 - screenUv.y;
        float splitLine = splitCenter + splitSlope * (screenUv.x - 0.5);
        vec3 splitColor = yFromTop < splitLine ? topColor : bottomColor;

        gl_FragColor = vec4(splitColor, 1.0);
      }
    `,
  });

  const shield = new THREE.Mesh(geometry, material);
  shield.renderOrder = -1;
  return shield;
}

function createFormSilhouette() {
  const material = new THREE.MeshBasicMaterial({
    color: 0x050505,
    side: THREE.BackSide,
    depthWrite: false,
    toneMapped: false,
  });
  const silhouette = new THREE.Mesh(geometry, material);

  silhouette.rotation.copy(form.rotation);
  silhouette.scale.set(1.012, 1.065, 1.065);
  silhouette.renderOrder = 1;
  return silhouette;
}

function createColorSilhouette() {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    toneMapped: false,
    uniforms: {
      topColor: { value: parseCssHexColor(topBackground) },
      bottomColor: { value: parseCssHexColor(bottomBackground) },
      resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      splitSlope: { value: 0 },
      splitCenter: { value: 0.5 },
    },
    vertexShader: `
      void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform vec2 resolution;
      uniform float splitSlope;
      uniform float splitCenter;

      void main() {
        vec2 screenUv = gl_FragCoord.xy / resolution;
        float yFromTop = 1.0 - screenUv.y;
        float splitLine = splitCenter + splitSlope * (screenUv.x - 0.5);
        vec3 splitColor = yFromTop < splitLine ? topColor : bottomColor;
        vec3 accentColor = mix(splitColor, vec3(0.0), 0.24);

        gl_FragColor = vec4(accentColor, 1.0);
      }
    `,
  });
  const silhouette = new THREE.Mesh(geometry, material);

  silhouette.rotation.copy(form.rotation);
  silhouette.scale.set(1.045, 1.28, 1.28);
  silhouette.renderOrder = 0;
  return silhouette;
}

const formAxisStart = new THREE.Vector3(-formLength / 2, 0, 0);
const formAxisEnd = new THREE.Vector3(formLength / 2, 0, 0);
const formAxisCenter = new THREE.Vector3(0, 0, 0);
const projectedStart = new THREE.Vector3();
const projectedEnd = new THREE.Vector3();
const projectedCenter = new THREE.Vector3();
const horizonSample = new THREE.Vector3();
const horizonFitBinCount = 18;
const horizonFitBins = Array.from({ length: horizonFitBinCount }, () => ({
  x: 0,
  bottom: Number.NEGATIVE_INFINITY,
  active: false,
}));

function updateHorizonShield() {
  const uniforms = horizonShield.material.uniforms;
  const colorUniforms = colorSilhouette.material.uniforms;
  root.updateMatrixWorld(true);
  form.updateMatrixWorld(true);
  camera.updateMatrixWorld(true);

  projectedStart.copy(formAxisStart).applyMatrix4(form.matrixWorld).project(camera);
  projectedEnd.copy(formAxisEnd).applyMatrix4(form.matrixWorld).project(camera);
  projectedCenter.copy(formAxisCenter).applyMatrix4(form.matrixWorld).project(camera);

  const startX = (projectedStart.x + 1) * 0.5;
  const startY = (1 - projectedStart.y) * 0.5;
  const endX = (projectedEnd.x + 1) * 0.5;
  const endY = (1 - projectedEnd.y) * 0.5;
  const dx = endX - startX;

  if (Math.abs(dx) > 0.001) {
    uniforms.splitSlope.value = THREE.MathUtils.clamp((endY - startY) / dx, -1.2, 1.2);
  }

  uniforms.splitCenter.value = THREE.MathUtils.clamp((1 - projectedCenter.y) * 0.5, 0.18, 0.82);

  fitHorizonToLowerSilhouette(uniforms);
  colorUniforms.splitSlope.value = uniforms.splitSlope.value;
  colorUniforms.splitCenter.value = uniforms.splitCenter.value;
}

function fitHorizonToLowerSilhouette(uniforms) {
  const positions = formPosition.array;

  for (const bin of horizonFitBins) {
    bin.bottom = Number.NEGATIVE_INFINITY;
    bin.active = false;
  }

  for (let i = 0; i < positions.length; i += 3) {
    horizonSample
      .set(positions[i], positions[i + 1], positions[i + 2])
      .applyMatrix4(form.matrixWorld)
      .project(camera);

    if (horizonSample.z < -1 || horizonSample.z > 1) {
      continue;
    }

    const screenX = (horizonSample.x + 1) * 0.5;
    const screenY = (1 - horizonSample.y) * 0.5;

    if (screenX < -0.08 || screenX > 1.08 || screenY < -0.08 || screenY > 1.08) {
      continue;
    }

    const binIndex = THREE.MathUtils.clamp(
      Math.floor(screenX * horizonFitBinCount),
      0,
      horizonFitBinCount - 1
    );
    const bin = horizonFitBins[binIndex];

    if (screenY > bin.bottom) {
      bin.x = screenX;
      bin.bottom = screenY;
      bin.active = true;
    }
  }

  const activeBins = horizonFitBins.filter((bin) => bin.active);

  if (activeBins.length < 3) {
    return;
  }

  let sumX = 0;
  let sumY = 0;

  for (const bin of activeBins) {
    sumX += bin.x;
    sumY += bin.bottom;
  }

  const meanX = sumX / activeBins.length;
  const meanY = sumY / activeBins.length;
  let numerator = 0;
  let denominator = 0;

  for (const bin of activeBins) {
    const xDelta = bin.x - meanX;
    numerator += xDelta * (bin.bottom - meanY);
    denominator += xDelta * xDelta;
  }

  if (denominator < 0.0001) {
    return;
  }

  const slope = THREE.MathUtils.clamp(numerator / denominator, -1.2, 1.2);
  const center = meanY - slope * (meanX - 0.5);
  const silhouetteInset = window.innerWidth < 700 ? 0.016 : 0.012;

  uniforms.splitSlope.value = slope;
  uniforms.splitCenter.value = THREE.MathUtils.clamp(center - silhouetteInset, 0.18, 0.82);
}

function parseCssHexColor(hexColor) {
  const value = hexColor.replace("#", "");
  const colorNumber = Number.parseInt(value, 16);

  return new THREE.Vector3(
    ((colorNumber >> 16) & 255) / 255,
    ((colorNumber >> 8) & 255) / 255,
    (colorNumber & 255) / 255
  );
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

function updatePointerLighting(elapsed) {
  pointerLight.current.lerp(pointerLight.target, 0.12);

  const x = (pointerLight.current.x - 0.5) * 2;
  const y = (0.5 - pointerLight.current.y) * 2;
  const shimmer = Math.sin(elapsed * 0.32) * 0.12;

  keyLight.position.set(
    x * 8.2,
    -6.4,
    4.7 + y * 2.4 + shimmer
  );

  rimLight.position.set(
    x * -5.8,
    -1.2,
    2.1 + y * -1.4
  );

  sunLight.position.set(
    x * -6.8,
    5.8,
    8.4 + y * 1.8
  );

  underLight.position.set(
    x * 5.2,
    4.6,
    -4.4 + y * -1.2
  );
}

function updatePointerTarget(clientX, clientY) {
  pointerLight.target.set(
    THREE.MathUtils.clamp(clientX / window.innerWidth, 0, 1),
    THREE.MathUtils.clamp(clientY / window.innerHeight, 0, 1)
  );
}

window.trianglePoly = {
  clearProgress() {
    progressOverride.value = null;
  },
  getProgress() {
    return getScrollProgress();
  },
  getState() {
    const { start, end } = getScrollRange();
    const { width, height } = getViewportSize();

    return {
      progress: getScrollProgress(),
      scrollY: window.scrollY,
      rangeStart: start,
      rangeEnd: end,
      viewportWidth: width,
      viewportHeight: height,
      devicePixelRatio: window.devicePixelRatio,
      visualViewportWidth: window.visualViewport?.width ?? null,
      visualViewportHeight: window.visualViewport?.height ?? null,
      visualViewportScale: window.visualViewport?.scale ?? null,
    };
  },
  scrollToProgress(progress) {
    progressOverride.value = null;

    const normalizedProgress = THREE.MathUtils.clamp(Number(progress) || 0, 0, 1);
    const { start, end } = getScrollRange();
    window.scrollTo(0, start + (end - start) * normalizedProgress);
  },
  setProgress(progress) {
    progressOverride.value = THREE.MathUtils.clamp(Number(progress) || 0, 0, 1);
  },
};

window.addEventListener("resize", resize);
window.addEventListener("pointermove", (event) => {
  updatePointerTarget(event.clientX, event.clientY);
});

window.addEventListener(
  "touchstart",
  (event) => {
    const touch = event.touches[0];

    if (touch) {
      updatePointerTarget(touch.clientX, touch.clientY);
    }
  },
  { passive: true }
);

window.addEventListener(
  "touchmove",
  (event) => {
    const touch = event.touches[0];

    if (touch) {
      updatePointerTarget(touch.clientX, touch.clientY);
    }
  },
  { passive: true }
);

resize();
animate();
