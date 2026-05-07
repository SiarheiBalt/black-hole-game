/**
 * Left button drag → normalized [0,1] coords relative to element.
 * @param {HTMLElement} target
 * @param {(nx: number, ny: number) => void} onMove — only pointermove while dragging
 * @param {(nx: number, ny: number) => void} [onDragStart] — pointerdown; hole should not jump here
 * @param {() => void} [onDragEnd]
 * @returns {() => void} detach
 */
export function attachPointerDrag(target, onMove, onDragStart, onDragEnd) {
  let dragging = false;

  function isInteractiveTarget(eventTarget) {
    return (
      eventTarget instanceof Element &&
      Boolean(eventTarget.closest('button, a, input, select, textarea, .tap-target'))
    );
  }

  function toNorm(clientX, clientY) {
    const r = target.getBoundingClientRect();
    const nx = r.width > 0 ? (clientX - r.left) / r.width : 0.5;
    const ny = r.height > 0 ? (clientY - r.top) / r.height : 0.5;
    return {
      nx: Math.max(0, Math.min(1, nx)),
      ny: Math.max(0, Math.min(1, ny)),
    };
  }

  function onPointerDown(e) {
    if (e.button !== 0) return;
    if (isInteractiveTarget(e.target)) return;
    dragging = true;
    target.setPointerCapture(e.pointerId);
    const { nx, ny } = toNorm(e.clientX, e.clientY);
    onDragStart?.(nx, ny);
  }

  function onPointerMove(e) {
    if (!dragging) return;
    const { nx, ny } = toNorm(e.clientX, e.clientY);
    onMove(nx, ny);
  }

  function endDrag() {
    if (!dragging) return;
    dragging = false;
    onDragEnd?.();
  }

  function onPointerUp(e) {
    if (e.button !== 0) return;
    target.releasePointerCapture(e.pointerId);
    endDrag();
  }

  function onPointerCancel() {
    endDrag();
  }

  function onLostCapture() {
    endDrag();
  }

  target.addEventListener('pointerdown', onPointerDown);
  target.addEventListener('pointermove', onPointerMove);
  target.addEventListener('pointerup', onPointerUp);
  target.addEventListener('pointercancel', onPointerCancel);
  target.addEventListener('lostpointercapture', onLostCapture);

  return () => {
    target.removeEventListener('pointerdown', onPointerDown);
    target.removeEventListener('pointermove', onPointerMove);
    target.removeEventListener('pointerup', onPointerUp);
    target.removeEventListener('pointercancel', onPointerCancel);
    target.removeEventListener('lostpointercapture', onLostCapture);
  };
}
