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
  Shape,
  ShapeGeometry,
  Clock,
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
  COLLECTIBLE_FALL_POW,
  COLLECTIBLE_FALL_MIN_REL_SC,
  COLLECTIBLE_RENDER_ORDER_IDLE,
  COLLECTIBLE_RENDER_ORDER_FALLING,
} from '../../core/constants.js';
import {
  COLLECTIBLE_PLANAR_SPRITE_FILES,
  getCollectibleItems,
  getCollectibleSlotKind,
  isPlanarCollectibleKind,
  layoutWorldSize,
} from '../../core/collectibleState.js';

/**
 * @typedef {Object} CreateHoleViewOptions
 * @property {boolean} [collectibleMoneyShadows=false] — cast/receive shadow map для плоских PNG (`planar`, `trump`, `poop`); обычно выкл.
 * @property {boolean} [planarCollectibleFall=true] — для плоских kind (`planar`, `trump`, `poop`): падение + масштаб + спин по Y.
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

  /** @type {Map<import('../../core/collectibleState.js').CollectibleKind, { aspect: number, mat: MeshBasicMaterial, tex: import('three').Texture }>} */
  const planarSpriteByKind = new Map();

  await Promise.all(
    Object.entries(COLLECTIBLE_PLANAR_SPRITE_FILES).map(([kind, file]) => {
      const url = new URL(`../../assets/${file}`, import.meta.url).href;
      return new Promise((resolve, reject) => {
        new TextureLoader().load(
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
            planarSpriteByKind.set(
              /** @type {import('../../core/collectibleState.js').CollectibleKind} */ (
                kind
              ),
              { aspect, mat, tex },
            );
            resolve(undefined);
          },
          undefined,
          reject,
        );
      });
    }),
  );

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

  function makeSphereCollectibleMesh() {
    const m = new Mesh(sphereGeom, sphereMat);
    m.castShadow = true;
    m.receiveShadow = true;
    m.renderOrder = 2;
    return m;
  }

  /**
   * @param {import('../../core/collectibleState.js').CollectibleItem} item
   */
  function planarSpriteAspect(item) {
    return planarSpriteByKind.get(item.kind)?.aspect ?? 1;
  }

  /**
   * @param {import('../../core/collectibleState.js').CollectibleItem['kind']} kind
   */
  function makeObjectMesh(kind) {
    if (kind === 'sphere') return makeSphereCollectibleMesh();
    const sprite = planarSpriteByKind.get(kind);
    if (sprite) return makePlanarSpriteMesh(sprite);
    return makeSphereCollectibleMesh();
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
  let arrowReveal = 0;
  const arrowStore = { x: 0, y: 0, z: 0, ry: 0 };
  let moveArrowSmUx = 0;
  let moveArrowSmUz = 0;

  /** @type {ReturnType<typeof import('../../core/viewport.js').computeLayout> | null} */
  let layoutCache = null;
  const ballWobbleBase = 0.38;
  const fallStartX = new Float32Array(COLLECTIBLE_COUNT);
  const fallStartZ = new Float32Array(COLLECTIBLE_COUNT);

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
        objMesh.scale.set(planarSpriteAspect(item), 1, 1);
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
          objMesh.scale.set(planarSpriteAspect(item), 1, 1);
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
   * @param {{ mapNx: number, mapNy: number, holeRadius01: number, holeVnX?: number, holeVnY?: number, pointerDragging?: boolean }} g
   */
  function applyCollectiblesVisual(runStates, layout, g) {
    if (runStates.length !== collectiblePivots.length) return;
    const items = getCollectibleItems(layout);
    for (let i = 0; i < collectiblePivots.length; i++) {
      applyOneCollectible(runStates[i], collectiblePivots[i], i, items[i], layout, g);
    }
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
     */
    updateCollectibles(runStates, layout, g) {
      applyCollectiblesVisual(runStates, layout, g);
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
      sphereMat.dispose();
      planarSpriteGeom.dispose();
      for (const { tex, mat } of planarSpriteByKind.values()) {
        mat.dispose();
        tex.dispose();
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
      renderer.domElement.remove();
    },
  };
}
