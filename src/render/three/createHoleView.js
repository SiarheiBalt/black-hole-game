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
  SphereGeometry,
  MeshStandardMaterial,
  PlaneGeometry,
  ShadowMaterial,
  AmbientLight,
  DirectionalLight,
  PCFSoftShadowMap,
  SRGBColorSpace,
  TextureLoader,
} from 'three';
import { containerToDesignNormalized } from '../../core/viewport.js';
import {
  HOLE_RING_COLOR,
  HOLE_CORE_COLOR,
  HOLE_INNER_RIM,
  HOLE_OUTLINE_COLOR,
  HOLE_ELLIPSE_X,
  HOLE_ELLIPSE_Z,
  WORLD_MAP_VIEW_MULTIPLIER,
  COLLECTIBLE_RADIUS_01,
  COLLECTIBLE_COUNT,
  COLLECTIBLE_FALL_POW,
  COLLECTIBLE_FALL_MIN_REL_SC,
  COLLECTIBLE_RENDER_ORDER_IDLE,
  COLLECTIBLE_RENDER_ORDER_FALLING,
} from '../../core/constants.js';
import {
  getCollectibleItems,
  getCollectibleSlotKind,
  isPlanarCollectibleKind,
} from '../../core/collectibleState.js';

/**
 * @typedef {Object} CreateHoleViewOptions
 * @property {boolean} [collectibleMoneyShadows=false] — cast/receive shadow map для мешей `planar` (PNG); обычно выкл.
 * @property {boolean} [planarCollectibleFall=true] — для `planar`: падение + масштаб + слабый плавный наклон (без шарового кручения).
 */

/**
 * @param {HTMLElement} container
 * @param {CreateHoleViewOptions} [options]
 */
export async function createHoleView(container, options = {}) {
  const { collectibleMoneyShadows = false, planarCollectibleFall = true } =
    options;
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
  sun.position.set(3.2, 10.5, 2.1);
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

  const sphereSeg = 24;
  const sphereGeom = new SphereGeometry(1, sphereSeg, sphereSeg);
  const sphereMat = new MeshStandardMaterial({
    color: 0x4cc4ff,
    metalness: 0.2,
    roughness: 0.38,
    emissive: 0x0a1a2a,
    emissiveIntensity: 0.08,
  });

  const moneyUrl = new URL('../../assets/money.png', import.meta.url).href;
  const moneyTex = await new Promise((resolve, reject) => {
    new TextureLoader().load(moneyUrl, resolve, undefined, reject);
  });
  moneyTex.colorSpace = SRGBColorSpace;
  const img = /** @type {HTMLImageElement | undefined} */ (moneyTex.image);
  const texAspect =
    img?.naturalWidth && img?.naturalHeight
      ? img.naturalWidth / img.naturalHeight
      : 1;

  const moneyGeom = new PlaneGeometry(1, 1);
  const moneyMat = new MeshBasicMaterial({
    map: moneyTex,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    side: DoubleSide,
  });

  /**
   * @param {import('../../core/collectibleState.js').CollectibleItem['kind']} kind
   */
  function makeObjectMesh(kind) {
    if (kind === 'sphere') {
      const m = new Mesh(sphereGeom, sphereMat);
      m.castShadow = true;
      m.receiveShadow = true;
      m.renderOrder = 2;
      return m;
    }
    if (kind === 'planar') {
      const m = new Mesh(moneyGeom, moneyMat);
      m.rotation.x = -Math.PI / 2;
      m.scale.set(texAspect, 1, 1);
      m.frustumCulled = false;
      m.castShadow = collectibleMoneyShadows;
      m.receiveShadow = collectibleMoneyShadows;
      m.renderOrder = 2;
      return m;
    }
    const m = new Mesh(sphereGeom, sphereMat);
    m.castShadow = true;
    m.receiveShadow = true;
    m.renderOrder = 2;
    return m;
  }

  /** @type {Group[]} */
  const collectiblePivots = [];
  for (let i = 0; i < COLLECTIBLE_COUNT; i++) {
    const mesh = makeObjectMesh(getCollectibleSlotKind(i));
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

  /** @type {ReturnType<typeof import('../../core/viewport.js').computeLayout> | null} */
  let layoutCache = null;
  const ballWobbleBase = 0.38;
  const fallStartX = new Float32Array(COLLECTIBLE_COUNT);
  const fallStartZ = new Float32Array(COLLECTIBLE_COUNT);

  function syncSunShadowToLayout(layout) {
    const w = layout.worldHalfW;
    const h = layout.worldHalfH;
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

  /**
   * @param {NonNullable<typeof layoutCache>} layout
   * @param {import('../../core/collectibleState.js').CollectibleItem} item
   */
  function objectWorldR(layout, item) {
    const r01 = item.radius01 ?? COLLECTIBLE_RADIUS_01;
    return r01 * Math.min(layout.designWidth, layout.designHeight);
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
   * @param {import('../../core/collectibleState.js').CollectibleRunState} b
   * @param {Group} objGroup
   * @param {number} i
   * @param {import('../../core/collectibleState.js').CollectibleItem} item
   * @param {NonNullable<typeof layoutCache>} layout
   * @param {{ mapNx: number, mapNy: number, holeRadius01: number, holeVnX?: number, holeVnY?: number }} g
   */
  function applyOneCollectible(b, objGroup, i, item, layout, g) {
    if (b.phase === 'done') {
      objGroup.visible = false;
      return;
    }

    const m = WORLD_MAP_VIEW_MULTIPLIER;
    const worldW = layout.designWidth * m;
    const worldH = layout.designHeight * m;
    const base = Math.min(layout.designWidth, layout.designHeight);
    const rObj = objectWorldR(layout, item);
    const sHole = g.holeRadius01 * base;

    objGroup.visible = true;

    const mapNx0 = item.mapNx;
    const mapNy0 = item.mapNy;

    /** @type {Mesh | undefined} */
    const objMesh = /** @type {Mesh | undefined} */ (objGroup.children[0]);

    if (b.phase === 'idle') {
      if (objGroup.parent !== mapLayer) {
        mapLayer.add(objGroup);
      }
      setCollectibleMeshRenderOrder(objGroup, COLLECTIBLE_RENDER_ORDER_IDLE);
      if (objMesh && isPlanarCollectibleKind(item.kind)) {
        objMesh.scale.set(texAspect, 1, 1);
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
        if (isPlanarCollectibleKind(item.kind)) {
          objMesh.scale.set(texAspect, 1, 1);
        } else {
          objMesh.scale.set(1, 1, 1);
        }
      }
      objGroup.scale.setScalar(rObj * sc);
      if (isPlanarCollectibleKind(item.kind)) {
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
   * @param {import('../../core/collectibleState.js').CollectibleRunState[]} runStates
   * @param {NonNullable<typeof layoutCache>} layout
   * @param {{ mapNx: number, mapNy: number, holeRadius01: number, holeVnX?: number, holeVnY?: number }} g
   */
  function applyCollectiblesVisual(runStates, layout, g) {
    if (runStates.length !== collectiblePivots.length) return;
    const items = getCollectibleItems(layout);
    for (let i = 0; i < collectiblePivots.length; i++) {
      applyOneCollectible(runStates[i], collectiblePivots[i], i, items[i], layout, g);
    }
  }

  function updateCamera(layout) {
    const hw = layout.worldHalfW;
    const hh = layout.worldHalfH;
    camera.left = -hw;
    camera.right = hw;
    camera.top = hh;
    camera.bottom = -hh;
    camera.updateProjectionMatrix();
    const pr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(pr);
    renderer.setSize(layout.cssW, layout.cssH, false);
    syncSunShadowToLayout(layout);
  }

  return {
    resize(layout) {
      layoutCache = layout;
      updateCamera(layout);
      updateGroundScale(layout);
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

    setRadius01(r01) {
      if (!layoutCache) return;
      const base = Math.min(layoutCache.designWidth, layoutCache.designHeight);
      const rWorld = r01 * base;
      const s = rWorld / 1;
      holeVisual.scale.set(ELLIPSE_X * s, 1, ELLIPSE_Z * s);
    },

    /**
     * @param {import('../../core/collectibleState.js').CollectibleRunState[]} runStates
     * @param {NonNullable<typeof layoutCache>} layout
     * @param {{ mapNx: number, mapNy: number, holeRadius01: number, holeVnX?: number, holeVnY?: number }} g
     */
    updateCollectibles(runStates, layout, g) {
      applyCollectiblesVisual(runStates, layout, g);
    },

    render() {
      renderer.render(scene, camera);
    },

    dispose() {
      groundGeom.dispose();
      groundMat.dispose();
      sphereGeom.dispose();
      sphereMat.dispose();
      moneyGeom.dispose();
      moneyMat.dispose();
      moneyTex.dispose();
      renderer.dispose();
      coreGeom.dispose();
      rimGeom.dispose();
      innerRimGeom.dispose();
      outlineGeom.dispose();
      coreMat.dispose();
      rimMat.dispose();
      innerRimMat.dispose();
      outlineMat.dispose();
      renderer.domElement.remove();
    },
  };
}
