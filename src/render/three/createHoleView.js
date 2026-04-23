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
} from 'three';
import { containerToDesignNormalized } from '../../core/viewport.js';
import {
  HOLE_RING_COLOR,
  HOLE_CORE_COLOR,
  HOLE_INNER_RIM,
} from '../../core/constants.js';

/**
 * @param {HTMLElement} container
 */
export function createHoleView(container) {
  const renderer = new WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.classList.add('three-layer');
  container.appendChild(renderer.domElement);

  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 500);
  camera.position.set(0, 100, 0);
  camera.up.set(0, 0, -1);
  camera.lookAt(0, 0, 0);

  const holePivot = new Group();
  const holeVisual = new Group();
  /** Ellipse: slightly flattened like reference. */
  const ELLIPSE_X = 1.06;
  const ELLIPSE_Z = 0.92;

  const radialSeg = 64;
  const coreGeom = new CircleGeometry(0.68, radialSeg);
  const coreMat = new MeshBasicMaterial({
    color: HOLE_CORE_COLOR,
    side: DoubleSide,
    depthWrite: false,
  });
  const core = new Mesh(coreGeom, coreMat);
  core.rotation.x = -Math.PI / 2;
  core.position.y = 0.002;
  core.renderOrder = 1;

  const rimGeom = new RingGeometry(0.68, 1, radialSeg);
  const rimMat = new MeshBasicMaterial({
    color: HOLE_RING_COLOR,
    side: DoubleSide,
    depthWrite: false,
  });
  const rim = new Mesh(rimGeom, rimMat);
  rim.rotation.x = -Math.PI / 2;
  rim.position.y = 0.004;
  rim.renderOrder = 2;

  const innerRimGeom = new RingGeometry(0.62, 0.68, radialSeg);
  const innerRimMat = new MeshBasicMaterial({
    color: HOLE_INNER_RIM,
    side: DoubleSide,
    depthWrite: false,
  });
  const innerRim = new Mesh(innerRimGeom, innerRimMat);
  innerRim.rotation.x = -Math.PI / 2;
  innerRim.position.y = 0.003;
  innerRim.renderOrder = 1;

  holeVisual.add(core);
  holeVisual.add(innerRim);
  holeVisual.add(rim);
  holePivot.add(holeVisual);
  scene.add(holePivot);

  holeVisual.scale.set(ELLIPSE_X, 1, ELLIPSE_Z);

  /** @type {ReturnType<typeof import('../../core/viewport.js').computeLayout> | null} */
  let layoutCache = null;

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
  }

  return {
    resize(layout) {
      layoutCache = layout;
      updateCamera(layout);
    },

    /** Hole fixed at the center of the view; the Pixi playfield scrolls in map space. */
    setScreenCentered() {
      holePivot.position.set(0, 0, 0);
    },

    /**
     * @param {number} nx
     * @param {number} ny
     * @param {NonNullable<typeof layoutCache>} layout
     */
    setPointerNorm(nx, ny, layout) {
      const { dx, dy } = containerToDesignNormalized(layout, nx, ny);
      const worldX = (dx - 0.5) * layout.designWidth;
      const worldZ = (dy - 0.5) * layout.designHeight;
      holePivot.position.set(worldX, 0, worldZ);
    },

    /** @param {number} r01 — fraction of min(design width, height) */
    setRadius01(r01) {
      if (!layoutCache) return;
      const base = Math.min(layoutCache.designWidth, layoutCache.designHeight);
      const rWorld = r01 * base;
      const s = rWorld / 1;
      holeVisual.scale.set(ELLIPSE_X * s, 1, ELLIPSE_Z * s);
    },

    render() {
      renderer.render(scene, camera);
    },

    dispose() {
      renderer.dispose();
      coreGeom.dispose();
      rimGeom.dispose();
      innerRimGeom.dispose();
      coreMat.dispose();
      rimMat.dispose();
      innerRimMat.dispose();
      renderer.domElement.remove();
    },
  };
}
