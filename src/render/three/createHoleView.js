import {
  WebGLRenderer,
  Scene,
  OrthographicCamera,
  Group,
  Mesh,
  MeshBasicMaterial,
  DoubleSide,
  RingGeometry,
  CircleGeometry,
  BoxGeometry,
  SphereGeometry,
  ConeGeometry,
  MeshStandardMaterial,
  PlaneGeometry,
  ShadowMaterial,
  AmbientLight,
  DirectionalLight,
  PCFSoftShadowMap,
  SRGBColorSpace,
  TextureLoader,
  Shape,
  ShapeGeometry,
  Clock,
  Box3,
  Quaternion,
  Vector3,
} from 'three';
import { containerToDesignNormalized } from '../../core/viewport.js';
import {
  HOLE_RING_COLOR,
  HOLE_CORE_COLOR,
  HOLE_INNER_RIM,
  HOLE_OUTLINE_COLOR,
  HOLE_ELLIPSE_X,
  HOLE_ELLIPSE_Z,
  HOLE_VISUAL_BUMP_ON_GROW,
  HOLE_VISUAL_SETTLE_RATE,
  COLLECTIBLE_RADIUS_01,
  COLLECTIBLE_COUNT,
  COLLECTIBLE_SPHERE_COUNT,
  COLLECTIBLE_FALL_POW,
  COLLECTIBLE_FALL_MIN_REL_SC,
  COLLECTIBLE_RENDER_ORDER_IDLE,
  COLLECTIBLE_RENDER_ORDER_FALLING,
} from '../../core/constants.js';
import {
  getCollectibleItems,
  getFieldDecorItems,
  getFieldDecorTriangleItems,
  isPlanarCollectibleKind,
  layoutWorldSize,
  FIELD_DECOR_CUBE_COUNT,
  FIELD_DECOR_TRIANGLE_COUNT,
} from '../../core/collectibleState.js';
import { DEFAULT_HOLE_THEME } from '../../themes.js';

/**
 * @typedef {import('../../themes.js').HoleThemeConfig} HoleThemeConfig
 */

const DEFAULT_FIELD_DECOR_COLORS = [0x5eead4, 0xff7eb3];
const DEFAULT_COLLECTIBLE_SCALE = { sphere: 1, planar: 1, trump: 1, poop: 1 };
const DEFAULT_FIELD_DECOR_SCALE = { cube: 1, triangle: 1 };

/**
 * @typedef {Object} CreateHoleViewOptions
 * @property {boolean} [collectibleMoneyShadows=false] — cast/receive shadow map для плоских PNG (`planar`, `trump`, `poop`); обычно выкл.
 * @property {boolean} [planarCollectibleFall=true] — для плоских kind (`planar`, `trump`, `poop`): падение + масштаб + спин по Y.
 * @property {HoleThemeConfig} [theme] — без пропсов `theme` берёт значения по-умолчанию (см. `docs/themes.md`).
 */

/**
 * @param {HTMLElement} container
 * @param {CreateHoleViewOptions} [options]
 */
export async function createHoleView(container, options = {}) {
  const {
    collectibleMoneyShadows = false,
    planarCollectibleFall = true,
    theme = DEFAULT_HOLE_THEME,
  } = options;
  const holeTheme = theme ?? DEFAULT_HOLE_THEME;
  const slotRenderKinds = holeTheme.slotRenderKinds;
  const renderer = new WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.classList.add('three-layer');
  container.appendChild(renderer.domElement);

  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 500);
  camera.position.set(0, 100, 0);
  camera.up.set(0, 0, -1);
  camera.lookAt(0, 0, 0);

  const hemi = 0.42;
  const ambient = new AmbientLight(0xffffff, hemi);
  scene.add(ambient);
  const sun = new DirectionalLight(0xfff5e6, 0.85);
  sun.position.set(-3.2, 10.5, -2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 0.05;
  sun.shadow.camera.far = 200;
  sun.shadow.radius = 3;
  sun.shadow.normalBias = 0.04;
  sun.shadow.bias = -0.00015;
  sun.target.position.set(0, 0, 0);
  scene.add(sun.target);
  scene.add(sun);

  const mapLayer = new Group();
  scene.add(mapLayer);

  const groundGeom = new PlaneGeometry(1, 1);
  const groundMat = new ShadowMaterial({ opacity: 0.35, color: 0x0a0a0a });
  const ground = new Mesh(groundGeom, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.receiveShadow = true;
  ground.renderOrder = 0;
  mapLayer.add(ground);

  const fieldDecorCubeGeom = new BoxGeometry(1, 1, 1);
  const fieldDecorTriangleGeom = new ConeGeometry(1, 1.6, 3);
  const fieldDecorPlanarGeom = new PlaneGeometry(1, 1);

  /**
   * Themed planar декор: плоский PNG/WebP с прозрачным фоном вместо 3D-геометрии.
   * Спин остаётся (вокруг Y → визуально как «плавающий значок»), вращение и масштаб
   * задаются снаружи. Aspect сохраняется через X-scale, чтобы предмет не сплющивался.
   *
   * @param {{ aspect: number, mat: MeshBasicMaterial }} sprite
   * @param {number} yaw
   */
  function createFieldDecorPlanarGroup(sprite, yaw = 0) {
    const g = new Group();
    const orient = new Group();
    const aspectWrap = new Group();
    aspectWrap.scale.set(sprite.aspect, 1, 1);
    const mesh = new Mesh(fieldDecorPlanarGeom, sprite.mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    aspectWrap.add(mesh);
    orient.add(aspectWrap);
    const twist = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), yaw);
    orient.quaternion.copy(twist);
    g.add(orient);
    g.renderOrder = 1;
    orient.traverse((o) => {
      if ('isMesh' in o && o.isMesh) o.renderOrder = 1;
    });
    return { group: g, mat: sprite.mat, isPlanar: true };
  }

  /**
   * Куб стоит на одной вершине: диагональ (1,1,1) → вниз, затем скрутка yaw вокруг Y; выравнивание по нижней точке через Box3.
   * @param {number} color
   * @param {number} yaw — поворот вокруг мировой Y после постановки на вершину.
   */
  function createFieldDecorCubeGroup(color, yaw = 0) {
    const g = new Group();
    const orient = new Group();
    const mat = new MeshStandardMaterial({
      color,
      roughness: 0.42,
      metalness: 0,
      emissive: color,
      emissiveIntensity: 0.09,
      flatShading: true,
    });
    const mesh = new Mesh(fieldDecorCubeGeom, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    orient.add(mesh);
    const diag = new Vector3(1, 1, 1).normalize();
    const down = new Vector3(0, -1, 0);
    const align = new Quaternion().setFromUnitVectors(diag, down);
    const twist = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), yaw);
    orient.quaternion.copy(twist).multiply(align);
    orient.updateMatrixWorld(true);
    const bounds = new Box3().setFromObject(orient);
    orient.position.y = -bounds.min.y;
    g.add(orient);
    g.renderOrder = 1;
    orient.traverse((o) => {
      if ('isMesh' in o && o.isMesh) o.renderOrder = 1;
    });
    return { group: g, mat, isPlanar: false };
  }

  function createFieldDecorTriangleGroup(color, yaw = 0) {
    const g = new Group();
    const orient = new Group();
    const mat = new MeshStandardMaterial({
      color,
      roughness: 0.32,
      metalness: 0.04,
      emissive: color,
      emissiveIntensity: 0.08,
      flatShading: true,
    });
    const mesh = new Mesh(fieldDecorTriangleGeom, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    orient.add(mesh);
    const twist = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), yaw);
    orient.quaternion.copy(twist);
    orient.updateMatrixWorld(true);
    const bounds = new Box3().setFromObject(orient);
    orient.position.y = -bounds.min.y;
    g.add(orient);
    g.renderOrder = 1;
    orient.traverse((o) => {
      if ('isMesh' in o && o.isMesh) o.renderOrder = 1;
    });
    return { group: g, mat, isPlanar: false };
  }

  const fieldDecor = new Group();
  mapLayer.add(fieldDecor);
  const fieldDecorTriangles = new Group();
  mapLayer.add(fieldDecorTriangles);

  const decorColors =
    Array.isArray(holeTheme.fieldDecorColors) &&
    holeTheme.fieldDecorColors.length >= FIELD_DECOR_CUBE_COUNT
      ? holeTheme.fieldDecorColors
      : DEFAULT_FIELD_DECOR_COLORS;
  const [decorColor12 = DEFAULT_FIELD_DECOR_COLORS[0], decorColor6 = DEFAULT_FIELD_DECOR_COLORS[1]] =
    decorColors;
  const triangleYaws = [0.2, 1.05, 2.15, 3.1];

  const sphereSeg = 24;
  const sphereGeom = new SphereGeometry(1, sphereSeg, sphereSeg);
  const sphereColorList =
    Array.isArray(holeTheme.sphereColors) &&
    holeTheme.sphereColors.length === COLLECTIBLE_SPHERE_COUNT
      ? holeTheme.sphereColors
      : Array.from({ length: COLLECTIBLE_SPHERE_COUNT }, () => holeTheme.sphereColor);

  const sphereMats = sphereColorList.map(
    (hex) =>
      new MeshStandardMaterial({
        color: hex,
        metalness: 0.12,
        roughness: 0.32,
        emissive: hex,
        emissiveIntensity: 0.16,
      }),
  );

  /** @type {Map<import('../../core/collectibleState.js').CollectibleKind, { aspect: number, mat: MeshBasicMaterial, tex: import('three').Texture }>} */
  const planarSpriteByKind = new Map();
  /** @type {Map<number, { aspect: number, mat: MeshBasicMaterial, tex: import('three').Texture }>} */
  const slotPlanarSpriteBySlot = new Map();
  const textureLoader = new TextureLoader();
  /** @type {{ aspect: number, mat: MeshBasicMaterial, tex: import('three').Texture } | null} */
  let sphereCollectibleSprite = null;

  /**
   * @param {string} url
   */
  function loadPlanarSpriteByUrl(url) {
    return new Promise((resolve, reject) => {
      textureLoader.load(
        url,
        (tex) => {
          tex.colorSpace = SRGBColorSpace;
          const img = /** @type {HTMLImageElement | undefined} */ (tex.image);
          const aspect =
            img?.naturalWidth && img?.naturalHeight
              ? img.naturalWidth / img.naturalHeight
              : 1;
          const mat = new MeshBasicMaterial({
            map: tex,
            transparent: true,
            depthWrite: false,
            depthTest: false,
            side: DoubleSide,
          });
          resolve({ aspect, mat, tex });
        },
        undefined,
        reject,
      );
    });
  }

  const assetPromises = [];
  /** @type {{ aspect: number, mat: MeshBasicMaterial, tex: import('three').Texture } | null} */
  let fieldDecorCubeSprite = null;
  /** @type {{ aspect: number, mat: MeshBasicMaterial, tex: import('three').Texture } | null} */
  let fieldDecorTriangleSprite = null;
  const fieldDecorAssets = holeTheme.fieldDecorAssets ?? {};
  if (typeof holeTheme.sphereAsset === 'string' && holeTheme.sphereAsset) {
    assetPromises.push(
      loadPlanarSpriteByUrl(holeTheme.sphereAsset)
        .then((sprite) => {
          sphereCollectibleSprite = sprite;
        })
        .catch(() => {
          sphereCollectibleSprite = null;
        }),
    );
  }
  if (typeof fieldDecorAssets.cube === 'string' && fieldDecorAssets.cube) {
    assetPromises.push(
      loadPlanarSpriteByUrl(fieldDecorAssets.cube)
        .then((sprite) => {
          fieldDecorCubeSprite = sprite;
        })
        .catch(() => {
          fieldDecorCubeSprite = null;
        }),
    );
  }
  if (typeof fieldDecorAssets.triangle === 'string' && fieldDecorAssets.triangle) {
    assetPromises.push(
      loadPlanarSpriteByUrl(fieldDecorAssets.triangle)
        .then((sprite) => {
          fieldDecorTriangleSprite = sprite;
        })
        .catch(() => {
          fieldDecorTriangleSprite = null;
        }),
    );
  }
  const planarAssets = holeTheme.planarAssets;
  for (const [kind, file] of Object.entries(planarAssets)) {
    assetPromises.push(
      loadPlanarSpriteByUrl(
        new URL(`../../assets/${file}`, import.meta.url).href,
      ).then((sprite) => {
        planarSpriteByKind.set(
          /** @type {import('../../core/collectibleState.js').CollectibleKind} */ (kind),
          sprite,
        );
      }),
    );
  }
  const slotOverrides = Array.isArray(holeTheme.slotAssetOverrides)
    ? holeTheme.slotAssetOverrides
    : [];
  for (const override of slotOverrides) {
    if (
      !override ||
      !Number.isInteger(override.position) ||
      override.position < 0 ||
      override.position >= COLLECTIBLE_COUNT
    ) {
      continue;
    }
    if (!override.asset) continue;
    const renderKind = slotRenderKinds[override.position];
    if (!isPlanarCollectibleKind(renderKind)) continue;
    assetPromises.push(
      loadPlanarSpriteByUrl(override.asset).then((sprite) => {
        slotPlanarSpriteBySlot.set(override.position, sprite);
      }),
    );
  }
  await Promise.all(assetPromises);

  const decorCube12 = fieldDecorCubeSprite
    ? createFieldDecorPlanarGroup(fieldDecorCubeSprite, 0)
    : createFieldDecorCubeGroup(decorColor12, 0);
  const decorCube6 = fieldDecorCubeSprite
    ? createFieldDecorPlanarGroup(fieldDecorCubeSprite, 0.63)
    : createFieldDecorCubeGroup(decorColor6, 0.63);
  fieldDecor.add(decorCube12.group);
  fieldDecor.add(decorCube6.group);
  const decorCubePivots = [decorCube12.group, decorCube6.group];
  const triangleInfos = Array.from(
    { length: FIELD_DECOR_TRIANGLE_COUNT },
    (_, index) => {
      const yaw = triangleYaws[index % triangleYaws.length];
      const color = decorColors[index % decorColors.length];
      const info = fieldDecorTriangleSprite
        ? createFieldDecorPlanarGroup(fieldDecorTriangleSprite, yaw)
        : createFieldDecorTriangleGroup(color, yaw);
      fieldDecorTriangles.add(info.group);
      return info;
    },
  );
  const decorTrianglePivots = triangleInfos.map((info) => info.group);

  const planarSpriteGeom = new PlaneGeometry(1, 1);

  /**
   * @param {{ aspect: number, mat: MeshBasicMaterial }} sprite
   */
  function makePlanarSpriteMesh(sprite) {
    const m = new Mesh(planarSpriteGeom, sprite.mat);
    m.rotation.x = -Math.PI / 2;
    m.scale.set(sprite.aspect, 1, 1);
    m.frustumCulled = false;
    m.castShadow = collectibleMoneyShadows;
    m.receiveShadow = collectibleMoneyShadows;
    m.renderOrder = 2;
    return m;
  }

  function makeSphereCollectibleMesh(slotIndex) {
    const mat =
      sphereMats[Math.max(0, Math.min(COLLECTIBLE_SPHERE_COUNT - 1, slotIndex))] ?? sphereMats[0];
    const m = new Mesh(sphereGeom, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    m.renderOrder = 2;
    return m;
  }

  /**
   * @param {import('../../core/collectibleState.js').CollectibleKind} kind
   */
  function planarSpriteAspect(kind, slotIndex) {
    if (typeof slotIndex === 'number') {
      const slotSprite = slotPlanarSpriteBySlot.get(slotIndex);
      if (slotSprite) return slotSprite.aspect;
    }
    if (kind === 'sphere') return sphereCollectibleSprite?.aspect ?? 1;
    return planarSpriteByKind.get(kind)?.aspect ?? 1;
  }

  function usesPlanarCollectibleSprite(kind) {
    return isPlanarCollectibleKind(kind) || (kind === 'sphere' && !!sphereCollectibleSprite);
  }

  /**
   * @param {number} slotIndex
   */
  function makeObjectMesh(slotIndex) {
    const kind = slotRenderKinds[slotIndex] ?? 'sphere';
    if (kind === 'sphere') {
      return sphereCollectibleSprite
        ? makePlanarSpriteMesh(sphereCollectibleSprite)
        : makeSphereCollectibleMesh(slotIndex);
    }
    const sprite =
      slotPlanarSpriteBySlot.get(slotIndex) ?? planarSpriteByKind.get(kind);
    if (sprite) return makePlanarSpriteMesh(sprite);
    return makeSphereCollectibleMesh(slotIndex);
  }

  /** @type {Group[]} */
  const collectiblePivots = [];
  for (let i = 0; i < COLLECTIBLE_COUNT; i++) {
    const mesh = makeObjectMesh(i);
    const bg = new Group();
    bg.add(mesh);
    mapLayer.add(bg);
    collectiblePivots.push(bg);
  }

  const holePivot = new Group();
  const holeVisual = new Group();
  const ELLIPSE_X = HOLE_ELLIPSE_X;
  const ELLIPSE_Z = HOLE_ELLIPSE_Z;

  const radialSeg = 64;
  const R_OUT = 1;
  const R_OUTLINE = 1.02;
  const R_COLOR_IN = 0.79;
  const R_CORE = R_COLOR_IN;
  const innerRimGeom = new RingGeometry(0.75, R_COLOR_IN, radialSeg);
  const rimGeom = new RingGeometry(R_COLOR_IN, R_OUT, radialSeg);
  const outlineGeom = new RingGeometry(R_OUT, R_OUTLINE, radialSeg);
  const coreGeom = new CircleGeometry(R_CORE, radialSeg);
  const coreMat = new MeshBasicMaterial({
    color: HOLE_CORE_COLOR,
    side: DoubleSide,
    depthWrite: false,
  });
  const core = new Mesh(coreGeom, coreMat);
  core.rotation.x = -Math.PI / 2;
  core.position.y = 0.002;

  const rimMat = new MeshBasicMaterial({
    color: HOLE_RING_COLOR,
    side: DoubleSide,
    depthWrite: false,
  });
  const rim = new Mesh(rimGeom, rimMat);
  rim.rotation.x = -Math.PI / 2;
  rim.position.y = 0.004;

  const innerRimMat = new MeshBasicMaterial({
    color: HOLE_INNER_RIM,
    side: DoubleSide,
    depthWrite: false,
  });
  const innerRim = new Mesh(innerRimGeom, innerRimMat);
  innerRim.rotation.x = -Math.PI / 2;
  innerRim.position.y = 0.003;

  const outlineMat = new MeshBasicMaterial({
    color: HOLE_OUTLINE_COLOR,
    side: DoubleSide,
    depthWrite: false,
  });
  const outline = new Mesh(outlineGeom, outlineMat);
  outline.rotation.x = -Math.PI / 2;
  outline.position.y = 0.005;

  holeVisual.add(core);
  holeVisual.add(innerRim);
  holeVisual.add(rim);
  holeVisual.add(outline);
  holePivot.add(holeVisual);
  scene.add(holePivot);

  core.renderOrder = 7;
  innerRim.renderOrder = 6;
  rim.renderOrder = 8;
  outline.renderOrder = 9;

  holeVisual.scale.set(ELLIPSE_X, 1, ELLIPSE_Z);

  let holeRTarget = 0.065;
  let holeRDisplay = 0.065;
  let holeRLast = 0.065;
  let holeRAnimInited = false;
  /** Сразу после роста target — кадр показать вылет без lerp, следующий `step` сглаживает. */
  let holeRJustBumped = false;

  function applyHoleScale01(r01) {
    if (!layoutCache) return;
    const base = Math.min(layoutCache.designWidth, layoutCache.designHeight);
    const rWorld = r01 * base;
    const s = rWorld;
    holeVisual.scale.set(ELLIPSE_X * s, 1, ELLIPSE_Z * s);
  }

  /** Индикатор направления: один равнобедренный треугольник (+Y — остриё → после поворота на XZ указывает ход). */
  function buildDirectionArrowShape() {
    const shape = new Shape();
    const tipY = 0.46;
    const baseY = -0.34;
    const halfW = 0.27;
    const r = 0.074;

    shape.moveTo(0, tipY);
    shape.lineTo(halfW - r * 0.42, baseY + r * 1.12);
    shape.quadraticCurveTo(
      halfW + r * 0.12,
      baseY + r * 0.42,
      halfW - r * 0.68,
      baseY - r * 0.02,
    );
    shape.lineTo(-halfW + r * 0.68, baseY - r * 0.02);
    shape.quadraticCurveTo(
      -halfW - r * 0.12,
      baseY + r * 0.42,
      -halfW + r * 0.42,
      baseY + r * 1.12,
    );
    shape.closePath();
    return shape;
  }

  const moveArrow = new Group();
  const arrowFillGeom = new ShapeGeometry(buildDirectionArrowShape(), 36);
  const arrowOutlineMat = new MeshBasicMaterial({
    color: 0x94c4d8,
    side: DoubleSide,
    depthWrite: false,
    transparent: true,
    opacity: 0.24,
    polygonOffset: true,
    polygonOffsetFactor: -0.6,
    polygonOffsetUnits: -0.6,
  });
  const arrowFillMat = new MeshBasicMaterial({
    color: 0xf2fbfe,
    side: DoubleSide,
    depthWrite: false,
    transparent: true,
    opacity: 0.5,
  });
  const arrowOutlineMesh = new Mesh(arrowFillGeom, arrowOutlineMat);
  const arrowFillMesh = new Mesh(arrowFillGeom, arrowFillMat);
  arrowOutlineMesh.rotation.x = -Math.PI / 2;
  arrowFillMesh.rotation.x = -Math.PI / 2;
  arrowOutlineMesh.renderOrder = 9;
  arrowFillMesh.renderOrder = 10;
  moveArrow.add(arrowOutlineMesh);
  moveArrow.add(arrowFillMesh);
  moveArrow.visible = false;
  holePivot.add(moveArrow);

  const arrowAnimClock = new Clock();
  /** Лёгкое вращение декоративных кубов вокруг Y (мир). */
  const fieldDecorSpinClock = new Clock();
  let arrowReveal = 0;
  const arrowStore = { x: 0, y: 0, z: 0, ry: 0 };
  let moveArrowSmUx = 0;
  let moveArrowSmUz = 0;

  /** @type {ReturnType<typeof import('../../core/viewport.js').computeLayout> | null} */
  let layoutCache = null;
  const ballWobbleBase = 0.38;
  const fallStartX = new Float32Array(COLLECTIBLE_COUNT);
  const fallStartZ = new Float32Array(COLLECTIBLE_COUNT);
  const decorFallStartX = new Float32Array(FIELD_DECOR_CUBE_COUNT);
  const decorFallStartZ = new Float32Array(FIELD_DECOR_CUBE_COUNT);
  const triangleFallStartX = new Float32Array(FIELD_DECOR_TRIANGLE_COUNT);
  const triangleFallStartZ = new Float32Array(FIELD_DECOR_TRIANGLE_COUNT);

  let viewZoomFactor = 1;

  function syncSunShadowToLayout(layout) {
    const z = Math.max(1, viewZoomFactor);
    const w = layout.worldHalfW * z;
    const h = layout.worldHalfH * z;
    const halfDiagonal = Math.hypot(w, h);
    const span = halfDiagonal * 2.1;
    const cam = sun.shadow.camera;
    cam.left = -span;
    cam.right = span;
    cam.top = span;
    cam.bottom = -span;
    cam.near = 0.05;
    cam.far = 200;
    cam.updateProjectionMatrix();
  }

  function applyMainCameraLayout() {
    if (!layoutCache) return;
    const z = Math.max(1, viewZoomFactor);
    const hw = layoutCache.worldHalfW * z;
    const hh = layoutCache.worldHalfH * z;
    camera.left = -hw;
    camera.right = hw;
    camera.top = hh;
    camera.bottom = -hh;
    camera.updateProjectionMatrix();
    syncSunShadowToLayout(layoutCache);
  }

  const collectibleScaleByKind = {
    ...DEFAULT_COLLECTIBLE_SCALE,
    ...(holeTheme.collectibleScaleByKind ?? {}),
  };
  const fieldDecorScaleByKind = {
    ...DEFAULT_FIELD_DECOR_SCALE,
    ...(holeTheme.fieldDecorScaleByKind ?? {}),
  };

  /**
   * @param {import('../../core/collectibleState.js').CollectibleKind} kind
   */
  function collectibleKindScale(kind) {
    const s = collectibleScaleByKind[kind];
    return typeof s === 'number' && Number.isFinite(s) && s > 0 ? s : 1;
  }

  /**
   * @param {NonNullable<typeof layoutCache>} layout
   * @param {import('../../core/collectibleState.js').CollectibleItem} item
   */
  function objectWorldR(layout, item) {
    const r01 = item.radius01 ?? COLLECTIBLE_RADIUS_01;
    const baseR = r01 * Math.min(layout.designWidth, layout.designHeight);
    return baseR * collectibleKindScale(item.kind);
  }

  /**
   * Field decor uses `kind: 'sphere'` in items, but its visual size lives on
   * `fieldDecorScaleByKind`, not `collectibleScaleByKind`. Pull the raw
   * radius and apply the matching decor scale.
   * @param {NonNullable<typeof layoutCache>} layout
   * @param {import('../../core/collectibleState.js').CollectibleItem} item
   * @param {'cube' | 'triangle'} decorKind
   */
  function fieldDecorWorldR(layout, item, decorKind) {
    const r01 = item.radius01 ?? COLLECTIBLE_RADIUS_01;
    const baseR = r01 * Math.min(layout.designWidth, layout.designHeight);
    const s = fieldDecorScaleByKind[decorKind];
    const m = typeof s === 'number' && Number.isFinite(s) && s > 0 ? s : 1;
    return baseR * m;
  }

  /**
   * Высота центра объекта в покое: сфера стоит на полу, «деньги» — плоскость почти у Y=0.
   * @param {import('../../core/collectibleState.js').CollectibleItem} item
   * @param {number} rObj
   */
  function idleCenterY(item, rObj) {
    return isPlanarCollectibleKind(item.kind) ? 0.08 * rObj : rObj;
  }

  function updateGroundScale(layout) {
    const s = Math.max(layout.designWidth, layout.designHeight) * 3;
    ground.scale.set(s, s, 1);
  }

  /**
   * @param {Group} objGroup
   * @param {number} order
   */
  function setCollectibleMeshRenderOrder(objGroup, order) {
    objGroup.renderOrder = order;
    objGroup.traverse((o) => {
      if ('isMesh' in o && o.isMesh) o.renderOrder = order;
    });
  }

  /**
   * Треугольник направления: при зажатой кнопке и движении; гашение начинается при отпускании.
   * Орбита — эллипс R_OUTLINE × (ELLIPSE_X|Z) × rWorld.
   * @param {NonNullable<typeof layoutCache>} layout
   * @param {{ mapNx: number, mapNy: number, holeRadius01: number, holeVnX?: number, holeVnY?: number, pointerDragging?: boolean }} g
   */
  function updateMoveArrow(layout, g) {
    const dt = Math.min(arrowAnimClock.getDelta(), 0.08);
    const base = Math.min(layout.designWidth, layout.designHeight);
    const rWorld = g.holeRadius01 * base;
    const yLift = Math.max(0.006 * base, 0.004);
    const { worldW, worldH } = layoutWorldSize(layout);

    const vx = g.holeVnX ?? 0;
    const vy = g.holeVnY ?? 0;
    const vnPxSec = Math.hypot(vx * worldW, vy * worldH);
    const minSpeedPx = Math.max(2.2, 0.005 * base);
    const vnNorm = Math.hypot(vx, vy);
    const dragging = g.pointerDragging === true;
    const wantsShow =
      dragging && vnPxSec >= minSpeedPx && vnNorm >= 1e-12;

    if (wantsShow) {
      let ux = vx / vnNorm;
      let uz = vy / vnNorm;
      const tau = 0.22;
      moveArrowSmUx += (ux - moveArrowSmUx) * tau;
      moveArrowSmUz += (uz - moveArrowSmUz) * tau;
      const sm = Math.hypot(moveArrowSmUx, moveArrowSmUz);
      if (sm > 1e-6) {
        moveArrowSmUx /= sm;
        moveArrowSmUz /= sm;
      }

      const semiX = R_OUTLINE * ELLIPSE_X * rWorld;
      const semiZ = R_OUTLINE * ELLIPSE_Z * rWorld;
      const orbitMargin = 1.1;
      const orbitGapPx = 0.022 * base;
      const sx = moveArrowSmUx;
      const sz = moveArrowSmUz;
      const denom = Math.sqrt(
        (sx * sx) / (semiX * semiX) + (sz * sz) / (semiZ * semiZ),
      );
      const tEdge = denom > 1e-9 ? 1 / denom : 0;
      const tOrbit = tEdge * orbitMargin + orbitGapPx;
      arrowStore.x = sx * tOrbit;
      arrowStore.y = yLift;
      arrowStore.z = sz * tOrbit;
      arrowStore.ry = Math.atan2(sx, sz) + Math.PI;
    }

    const target = wantsShow ? 1 : 0;
    const k = target > arrowReveal ? 12 : 8;
    arrowReveal += (target - arrowReveal) * Math.min(1, dt * k);
    if (arrowReveal < 1e-4) arrowReveal = 0;
    if (arrowReveal > 1 - 1e-4) arrowReveal = 1;

    if (arrowReveal <= 0 && !wantsShow) {
      moveArrow.visible = false;
      moveArrowSmUx = 0;
      moveArrowSmUz = 0;
      return;
    }

    moveArrow.visible = true;
    moveArrow.position.set(arrowStore.x, arrowStore.y, arrowStore.z);
    moveArrow.rotation.y = arrowStore.ry;

    const te = arrowReveal * arrowReveal * (3 - 2 * arrowReveal);
    const scalePop = 0.86 + 0.14 * te;
    const arrowSizeFrac = 0.56;
    const s = rWorld * scalePop * arrowSizeFrac;
    arrowFillMesh.scale.set(s, s, s);
    arrowOutlineMesh.scale.set(s * 1.06, s * 1.06, s * 1.06);

    arrowFillMat.opacity = 0.5 * te;
    arrowOutlineMat.opacity = 0.24 * te;
  }

  /**
   * @param {import('../../core/collectibleState.js').CollectibleRunState} b
   * @param {Group} objGroup
   * @param {number} i
   * @param {import('../../core/collectibleState.js').CollectibleItem} item
   * @param {NonNullable<typeof layoutCache>} layout
   * @param {{ mapNx: number, mapNy: number, holeRadius01: number, holeVnX?: number, holeVnY?: number, pointerDragging?: boolean }} g
   */
  function applyOneCollectible(b, objGroup, i, item, layout, g) {
    if (b.phase === 'done') {
      objGroup.visible = false;
      return;
    }

    const { worldW, worldH } = layoutWorldSize(layout);
    const base = Math.min(layout.designWidth, layout.designHeight);
    const rObj = objectWorldR(layout, item);
    const sHole = g.holeRadius01 * base;

    objGroup.visible = true;

    const mapNx0 = b.effectiveMapNx ?? item.mapNx;
    const mapNy0 = b.effectiveMapNy ?? item.mapNy;

    /** @type {Mesh | undefined} */
    const objMesh = /** @type {Mesh | undefined} */ (objGroup.children[0]);
    const renderKind = slotRenderKinds[i] ?? 'sphere';
    const isPlanarSprite = usesPlanarCollectibleSprite(renderKind);

    if (b.phase === 'idle') {
      if (objGroup.parent !== mapLayer) {
        mapLayer.add(objGroup);
      }
      setCollectibleMeshRenderOrder(objGroup, COLLECTIBLE_RENDER_ORDER_IDLE);
      if (objMesh && isPlanarSprite) {
        objMesh.scale.set(planarSpriteAspect(renderKind, i), 1, 1);
      } else if (objMesh) {
        objMesh.scale.set(1, 1, 1);
      }
      objGroup.scale.setScalar(rObj);
      const ox = (mapNx0 - g.mapNx) * worldW;
      const oz = (mapNy0 - g.mapNy) * worldH;
      const y0 = idleCenterY(item, rObj);
      objGroup.position.set(ox, y0, oz);
      objGroup.rotation.set(0, 0, 0);
    } else if (b.phase === 'falling') {
      if (objGroup.parent !== holePivot) {
        holePivot.attach(objGroup);
        fallStartX[i] = objGroup.position.x;
        fallStartZ[i] = objGroup.position.z;
      }
      setCollectibleMeshRenderOrder(objGroup, COLLECTIBLE_RENDER_ORDER_FALLING);
      const t = Math.min(1, b.t);
      const p = 1 - (1 - t) ** COLLECTIBLE_FALL_POW;
      const y0 = idleCenterY(item, rObj);
      const y1 = -Math.max(0.28 * sHole, 0.12 * rObj) - 0.55 * sHole;
      const y = y0 * (1 - p) + y1 * p;
      const sc =
        (1 - p) + COLLECTIBLE_FALL_MIN_REL_SC * p;
      const pull = 1 - p;
      const vnX = g.holeVnX ?? 0;
      const vnY = g.holeVnY ?? 0;
      const wFunnel = 4 * p * (1 - p);
      const worldSlideX = -vnX * worldW;
      const worldSlideZ = -vnY * worldH;
      const sideGain = 0.14;
      let sideX = worldSlideX * sideGain * wFunnel;
      let sideZ = worldSlideZ * sideGain * wFunnel;
      const cap = 1.05 * sHole;
      const sideLen = Math.hypot(sideX, sideZ);
      if (sideLen > cap && sideLen > 1e-6) {
        const kc = cap / sideLen;
        sideX *= kc;
        sideZ *= kc;
      }
      const fsx = fallStartX[i];
      const fsz = fallStartZ[i];
      objGroup.position.set(fsx * pull + sideX, y, fsz * pull + sideZ);
      if (objMesh) {
        if (isPlanarSprite) {
          objMesh.scale.set(planarSpriteAspect(renderKind, i), 1, 1);
        } else {
          objMesh.scale.set(1, 1, 1);
        }
      }
      objGroup.scale.setScalar(rObj * sc);
      if (isPlanarCollectibleKind(renderKind)) {
        if (planarCollectibleFall) {
          const spin = Math.sin(t * Math.PI) * 0.72;
          objGroup.rotation.set(0, spin, 0);
        } else {
          objGroup.rotation.set(0, 0, 0);
        }
      } else {
        const wobble = (1 - t) * (1 - t);
        const tiltF = 2.6 * wFunnel * wobble;
        const rx =
          Math.sin(t * Math.PI * 2.1) * ballWobbleBase * wobble - vnY * tiltF;
        const ry = t * 3.1 + t * t * 2.4;
        const rz =
          Math.sin(t * Math.PI * 2.5 + 0.3) * ballWobbleBase * wobble +
          vnX * tiltF;
        objGroup.rotation.set(rx, ry, rz);
      }
    }
  }

  /**
   * У 3D-декора mesh — прямой потомок `orient`; у планара — orient → aspectWrap → mesh.
   * @param {import('three').Object3D | undefined} orient
   * @returns {import('three').Mesh | undefined}
   */
  function fieldDecorMeshFromOrient(orient) {
    const first = orient?.children[0];
    if (!first) return undefined;
    if ('isMesh' in first && first.isMesh) return /** @type {import('three').Mesh} */ (first);
    const nested = first.children[0];
    if (nested && 'isMesh' in nested && nested.isMesh)
      return /** @type {import('three').Mesh} */ (nested);
    return undefined;
  }

  /**
   * Декоративные кубы: коллизия как у шара (радиус r); куб на вершине, ребро 2r.
   * @param {import('../../core/collectibleState.js').CollectibleRunState} b
   * @param {Group} objGroup
   * @param {number} i
   * @param {import('../../core/collectibleState.js').CollectibleItem} item
   * @param {NonNullable<typeof layoutCache>} layout
   * @param {{ mapNx: number, mapNy: number, holeRadius01: number, holeVnX?: number, holeVnY?: number, pointerDragging?: boolean }} g
   */
  function applyOneFieldDecorCube(b, objGroup, i, item, layout, g) {
    if (b.phase === 'done') {
      objGroup.visible = false;
      return;
    }

    const { worldW, worldH } = layoutWorldSize(layout);
    const base = Math.min(layout.designWidth, layout.designHeight);
    const rObj = fieldDecorWorldR(layout, item, 'cube');
    const sHole = g.holeRadius01 * base;
    /** Опора на вершине: pivot у пола (y=0), не у центра шара. */
    const y0 = 0;

    objGroup.visible = true;

    const mapNx0 = b.effectiveMapNx ?? item.mapNx;
    const mapNy0 = b.effectiveMapNy ?? item.mapNy;

    const orient = /** @type {Group | undefined} */ (objGroup.children[0]);
    const objMesh = fieldDecorMeshFromOrient(orient);

    const spinY =
      fieldDecorSpinClock.getElapsedTime() * 0.36 + i * 2.05;

    if (b.phase === 'idle') {
      if (objGroup.parent !== mapLayer) {
        mapLayer.add(objGroup);
      }
      setCollectibleMeshRenderOrder(objGroup, COLLECTIBLE_RENDER_ORDER_IDLE);
      if (objMesh) objMesh.scale.set(1, 1, 1);
      objGroup.scale.setScalar(2 * rObj);
      const ox = (mapNx0 - g.mapNx) * worldW;
      const oz = (mapNy0 - g.mapNy) * worldH;
      objGroup.position.set(ox, y0, oz);
      objGroup.rotation.set(0, spinY, 0);
    } else if (b.phase === 'falling') {
      if (objGroup.parent !== holePivot) {
        holePivot.attach(objGroup);
        decorFallStartX[i] = objGroup.position.x;
        decorFallStartZ[i] = objGroup.position.z;
      }
      setCollectibleMeshRenderOrder(objGroup, COLLECTIBLE_RENDER_ORDER_FALLING);
      const t = Math.min(1, b.t);
      const p = 1 - (1 - t) ** COLLECTIBLE_FALL_POW;
      const y1 = -Math.max(0.28 * sHole, 0.12 * rObj) - 0.55 * sHole;
      const y = y0 * (1 - p) + y1 * p;
      const sc = (1 - p) + COLLECTIBLE_FALL_MIN_REL_SC * p;
      const pull = 1 - p;
      const vnX = g.holeVnX ?? 0;
      const vnY = g.holeVnY ?? 0;
      const wFunnel = 4 * p * (1 - p);
      const worldSlideX = -vnX * worldW;
      const worldSlideZ = -vnY * worldH;
      const sideGain = 0.14;
      let sideX = worldSlideX * sideGain * wFunnel;
      let sideZ = worldSlideZ * sideGain * wFunnel;
      const cap = 1.05 * sHole;
      const sideLen = Math.hypot(sideX, sideZ);
      if (sideLen > cap && sideLen > 1e-6) {
        const kc = cap / sideLen;
        sideX *= kc;
        sideZ *= kc;
      }
      const fsx = decorFallStartX[i];
      const fsz = decorFallStartZ[i];
      objGroup.position.set(fsx * pull + sideX, y, fsz * pull + sideZ);
      if (objMesh) objMesh.scale.set(1, 1, 1);
      objGroup.scale.setScalar(2 * rObj * sc);
      const wobble = (1 - t) * (1 - t);
      const tiltF = 2.6 * wFunnel * wobble;
      const rx =
        Math.sin(t * Math.PI * 2.1) * ballWobbleBase * wobble - vnY * tiltF;
      const ry = t * 3.1 + t * t * 2.4;
      const rz =
        Math.sin(t * Math.PI * 2.5 + 0.3) * ballWobbleBase * wobble +
        vnX * tiltF;
      objGroup.rotation.set(rx, ry + spinY, rz);
    }
  }

  function applyOneFieldDecorTriangle(b, objGroup, i, item, layout, g) {
    if (b.phase === 'done') {
      objGroup.visible = false;
      return;
    }

    const { worldW, worldH } = layoutWorldSize(layout);
    const base = Math.min(layout.designWidth, layout.designHeight);
    const rObj = fieldDecorWorldR(layout, item, 'triangle');
    const sHole = g.holeRadius01 * base;
    const y0 = 0;

    objGroup.visible = true;

    const mapNx0 = b.effectiveMapNx ?? item.mapNx;
    const mapNy0 = b.effectiveMapNy ?? item.mapNy;

    const orient = /** @type {Group | undefined} */ (objGroup.children[0]);
    const objMesh = fieldDecorMeshFromOrient(orient);

    const triangleSpinTime =
      fieldDecorSpinClock.getElapsedTime() * 0.66 + i * 0.8;
    const spinY = triangleSpinTime * 0.9;
    const swayX = Math.sin(triangleSpinTime * 1.2) * 0.22;
    const swayZ = Math.cos(triangleSpinTime * 0.78) * 0.14;
    const idlePitch = Math.sin(triangleSpinTime * 0.9) * 0.18;
    const idleRoll = Math.cos(triangleSpinTime * 0.65) * 0.1;
    const bobY = Math.sin(triangleSpinTime * 2.1) * 0.06;

    if (b.phase === 'idle') {
      if (objGroup.parent !== mapLayer) {
        mapLayer.add(objGroup);
      }
      setCollectibleMeshRenderOrder(objGroup, COLLECTIBLE_RENDER_ORDER_IDLE);
      if (objMesh) objMesh.scale.set(1, 1, 1);
      objGroup.scale.setScalar(1.6 * rObj);
      const ox = (mapNx0 - g.mapNx) * worldW;
      const oz = (mapNy0 - g.mapNy) * worldH;
      objGroup.position.set(ox, y0 + bobY, oz);
      objGroup.scale.setScalar(2.4 * rObj);
      objGroup.rotation.set(swayX + idlePitch, spinY, swayZ + idleRoll);
    } else if (b.phase === 'falling') {
      if (objGroup.parent !== holePivot) {
        holePivot.attach(objGroup);
        triangleFallStartX[i] = objGroup.position.x;
        triangleFallStartZ[i] = objGroup.position.z;
      }
      setCollectibleMeshRenderOrder(objGroup, COLLECTIBLE_RENDER_ORDER_FALLING);
      const t = Math.min(1, b.t);
      const p = 1 - (1 - t) ** COLLECTIBLE_FALL_POW;
      const y1 = -Math.max(0.28 * sHole, 0.12 * rObj) - 0.55 * sHole;
      const y = y0 * (1 - p) + y1 * p;
      const sc = (1 - p) + COLLECTIBLE_FALL_MIN_REL_SC * p;
      const pull = 1 - p;
      const vnX = g.holeVnX ?? 0;
      const vnY = g.holeVnY ?? 0;
      const wFunnel = 4 * p * (1 - p);
      const worldSlideX = -vnX * worldW;
      const worldSlideZ = -vnY * worldH;
      const sideGain = 0.14;
      let sideX = worldSlideX * sideGain * wFunnel;
      let sideZ = worldSlideZ * sideGain * wFunnel;
      const cap = 1.05 * sHole;
      const sideLen = Math.hypot(sideX, sideZ);
      if (sideLen > cap && sideLen > 1e-6) {
        const kc = cap / sideLen;
        sideX *= kc;
        sideZ *= kc;
      }
      const fsx = triangleFallStartX[i];
      const fsz = triangleFallStartZ[i];
      objGroup.position.set(fsx * pull + sideX, y, fsz * pull + sideZ);
      if (objMesh) objMesh.scale.set(1, 1, 1);
      objGroup.scale.setScalar(1.6 * rObj * sc);
      const wobble = (1 - t) * (1 - t);
      const tiltF = 2.6 * wFunnel * wobble;
      const rx =
        Math.sin(t * Math.PI * 2.1) * ballWobbleBase * wobble - vnY * tiltF;
      const ry = t * 3.1 + t * t * 2.4;
      const rz =
        Math.sin(t * Math.PI * 2.5 + 0.3) * ballWobbleBase * wobble +
        vnX * tiltF;
      const extraTiltX = Math.sin(triangleSpinTime * 2 + t * 6) * 0.12;
      const extraTiltZ = Math.cos(triangleSpinTime * 1.5 + t * 4) * 0.08;
      objGroup.rotation.set(rx + extraTiltX, ry + spinY, rz + extraTiltZ);
    }
  }

  /**
   * @param {import('../../core/collectibleState.js').CollectibleRunState[] | undefined} decorRuns
   * @param {NonNullable<typeof layoutCache>} layout
   * @param {{ mapNx: number, mapNy: number, holeRadius01: number, holeVnX?: number, holeVnY?: number, pointerDragging?: boolean }} g
   */
  function applyFieldDecorCubes(decorRuns, layout, g) {
    if (!decorRuns || decorRuns.length !== FIELD_DECOR_CUBE_COUNT) return;
    const items = getFieldDecorItems(layout);
    for (let i = 0; i < FIELD_DECOR_CUBE_COUNT; i++) {
      applyOneFieldDecorCube(
        decorRuns[i],
        decorCubePivots[i],
        i,
        items[i],
        layout,
        g,
      );
    }
  }

  function applyFieldDecorTriangles(triangleRuns, layout, g) {
    if (!triangleRuns || triangleRuns.length !== FIELD_DECOR_TRIANGLE_COUNT) return;
    const items = getFieldDecorTriangleItems(layout);
    for (let i = 0; i < FIELD_DECOR_TRIANGLE_COUNT; i++) {
      applyOneFieldDecorTriangle(
        triangleRuns[i],
        decorTrianglePivots[i],
        i,
        items[i],
        layout,
        g,
      );
    }
  }

  /**
   * @param {import('../../core/collectibleState.js').CollectibleRunState[]} runStates
   * @param {NonNullable<typeof layoutCache>} layout
   * @param {{ mapNx: number, mapNy: number, holeRadius01: number, holeVnX?: number, holeVnY?: number, pointerDragging?: boolean }} g
   */
  function applyCollectiblesVisual(
    runStates,
    layout,
    g,
    decorRuns,
    triangleRuns,
  ) {
    if (runStates.length !== collectiblePivots.length) return;
    const items = getCollectibleItems(layout);
    for (let i = 0; i < collectiblePivots.length; i++) {
      applyOneCollectible(runStates[i], collectiblePivots[i], i, items[i], layout, g);
    }
    applyFieldDecorCubes(decorRuns, layout, g);
    applyFieldDecorTriangles(triangleRuns, layout, g);
    updateMoveArrow(layout, g);
  }

  function updateCamera(layout) {
    applyMainCameraLayout();
    const pr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(pr);
    renderer.setSize(layout.cssW, layout.cssH, false);
  }

  return {
    resize(layout) {
      layoutCache = layout;
      updateCamera(layout);
      updateGroundScale(layout);
    },

    /**
     * «Отъезд» камеры: `viewZoom` &gt;1 расширяет ортогон (должно совпадать с Pixi `setScroll` fourth arg).
     * @param {number} zoom
     */
    setViewZoom(zoom) {
      if (!layoutCache) return;
      viewZoomFactor = Math.max(1, zoom);
      applyMainCameraLayout();
    },

    setScreenCentered() {
      holePivot.position.set(0, 0, 0);
    },

    setPointerNorm(nx, ny, layout) {
      const { dx, dy } = containerToDesignNormalized(layout, nx, ny);
      const worldX = (dx - 0.5) * layout.designWidth;
      const worldZ = (dy - 0.5) * layout.designHeight;
      holePivot.position.set(worldX, 0, worldZ);
    },

    /**
     * Старт / resize: без овершута, дисплей = логике.
     * @param {number} r01
     */
    setHoleRadius01Immediate(r01) {
      if (!layoutCache) return;
      holeRTarget = r01;
      holeRDisplay = r01;
      holeRLast = r01;
      holeRAnimInited = true;
      holeRJustBumped = false;
      applyHoleScale01(r01);
    },
    /**
     * Целевой r01 с игры: при росте — скачок `display` вверх, потом `stepHoleRadiusAnimation` сглаживает.
     * @param {number} r01
     */
    setHoleRadiusTarget01(r01) {
      if (!layoutCache) return;
      if (!holeRAnimInited) {
        holeRTarget = r01;
        holeRDisplay = r01;
        holeRLast = r01;
        holeRAnimInited = true;
        applyHoleScale01(holeRDisplay);
        return;
      }
      holeRTarget = r01;
      if (r01 > holeRLast + 1e-7) {
        holeRDisplay = r01 * (1 + HOLE_VISUAL_BUMP_ON_GROW);
        holeRLast = r01;
        holeRJustBumped = true;
      }
    },
    /**
     * @param {number} dt
     */
    stepHoleRadiusAnimation(dt) {
      if (!layoutCache || !holeRAnimInited) return;
      if (holeRJustBumped) {
        holeRJustBumped = false;
        applyHoleScale01(holeRDisplay);
        return;
      }
      const d = Math.min(Math.max(0, dt), 0.1);
      const t = 1 - Math.exp(-HOLE_VISUAL_SETTLE_RATE * d);
      holeRDisplay += (holeRTarget - holeRDisplay) * t;
      if (Math.abs(holeRDisplay - holeRTarget) < 1e-5) {
        holeRDisplay = holeRTarget;
      }
      applyHoleScale01(holeRDisplay);
    },

    /**
     * @param {import('../../core/collectibleState.js').CollectibleRunState[]} runStates
     * @param {NonNullable<typeof layoutCache>} layout
     * @param {{ mapNx: number, mapNy: number, holeRadius01: number, holeVnX?: number, holeVnY?: number, pointerDragging?: boolean }} g
     * @param {import('../../core/collectibleState.js').CollectibleRunState[] | undefined} [fieldDecorRuns]
     */
    updateCollectibles(
      runStates,
      layout,
      g,
      fieldDecorRuns,
      fieldDecorTriangleRuns,
    ) {
      applyCollectiblesVisual(
        runStates,
        layout,
        g,
        fieldDecorRuns,
        fieldDecorTriangleRuns,
      );
    },

    render() {
      renderer.render(scene, camera);
    },

    /**
     * Центр canvas дыры в координатах от `offsetParent` (как смещения от `getBoundingClientRect`).
     * @param {HTMLElement} offsetParent
     * @returns {{ x: number, y: number }}
     */
    getHoleScreenCenterIn(offsetParent) {
      const el = renderer.domElement;
      const er = el.getBoundingClientRect();
      const pr = offsetParent.getBoundingClientRect();
      return {
        x: er.left + er.width * 0.5 - pr.left,
        y: er.top + er.height * 0.5 - pr.top,
      };
    },

    dispose() {
      groundGeom.dispose();
      groundMat.dispose();
      sphereGeom.dispose();
      for (const m of sphereMats) m.dispose();
      planarSpriteGeom.dispose();
      for (const { tex, mat } of planarSpriteByKind.values()) {
        mat.dispose();
        tex.dispose();
      }
      for (const { tex, mat } of slotPlanarSpriteBySlot.values()) {
        mat.dispose();
        tex.dispose();
      }
      if (sphereCollectibleSprite) {
        sphereCollectibleSprite.mat.dispose();
        sphereCollectibleSprite.tex.dispose();
      }
      renderer.dispose();
      coreGeom.dispose();
      rimGeom.dispose();
      innerRimGeom.dispose();
      outlineGeom.dispose();
      coreMat.dispose();
      rimMat.dispose();
      innerRimMat.dispose();
      outlineMat.dispose();
      arrowFillGeom.dispose();
      arrowOutlineMat.dispose();
      arrowFillMat.dispose();
      fieldDecorCubeGeom.dispose();
      fieldDecorTriangleGeom.dispose();
      fieldDecorPlanarGeom.dispose();
      if (!decorCube12.isPlanar) decorCube12.mat.dispose();
      if (!decorCube6.isPlanar) decorCube6.mat.dispose();
      for (const info of triangleInfos) {
        if (!info.isPlanar) info.mat.dispose();
      }
      if (fieldDecorCubeSprite) {
        fieldDecorCubeSprite.mat.dispose();
        fieldDecorCubeSprite.tex.dispose();
      }
      if (fieldDecorTriangleSprite) {
        fieldDecorTriangleSprite.mat.dispose();
        fieldDecorTriangleSprite.tex.dispose();
      }
      renderer.domElement.remove();
    },
  };
}
