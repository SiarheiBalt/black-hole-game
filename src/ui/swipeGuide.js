import './swipeGuide.css';

const HAND_ANIM_DURATION = 2200;
const HAND_AMPLITUDE_X = 46;
const HAND_AMPLITUDE_Y = 28;

const handImageUrl = new URL('../assets/hand-outline.svg', import.meta.url).href;

export function createSwipeGuide(container) {
  const root = document.createElement('div');
  root.className = 'swipe-guide';
  root.setAttribute('aria-hidden', 'true');

  const message = document.createElement('div');
  message.className = 'swipe-guide__message';
  message.textContent = 'Swipe to move';

  const handPath = document.createElement('div');
  handPath.className = 'swipe-guide__hand-path';

  const hand = document.createElement('img');
  hand.className = 'swipe-guide__hand';
  hand.src = handImageUrl;
  hand.alt = '';
  hand.setAttribute('aria-hidden', 'true');

  handPath.appendChild(hand);
  root.append(message, handPath);
  container.appendChild(root);

  let animationFrame = null;
  let startTime = null;
  let removed = false;
  let dismissed = false;

  function updateHandPosition(time) {
    if (dismissed || removed) return;
    if (startTime === null) startTime = time;
    const elapsed = time - startTime;
    const progress = (elapsed % HAND_ANIM_DURATION) / HAND_ANIM_DURATION;
    const angle = progress * Math.PI * 2;
    const x = HAND_AMPLITUDE_X * Math.sin(angle);
    const y = HAND_AMPLITUDE_Y * Math.sin(angle) * Math.cos(angle);
    root.style.setProperty('--swipe-guide-hand-x', `${x}px`);
    root.style.setProperty('--swipe-guide-hand-y', `${y}px`);
    animationFrame = requestAnimationFrame(updateHandPosition);
  }

  function startAnimation() {
    if (animationFrame !== null) return;
    animationFrame = requestAnimationFrame(updateHandPosition);
  }

  function stopAnimation() {
    if (animationFrame !== null) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
  }

  function cleanup() {
    if (removed) return;
    removed = true;
    stopAnimation();
    root.remove();
  }

  function hide() {
    if (dismissed) return;
    dismissed = true;
    root.classList.add('swipe-guide--hidden');
    root.addEventListener('transitionend', cleanup, { once: true });
    window.setTimeout(cleanup, 500);
  }

  function destroy() {
    cleanup();
  }

  startAnimation();

  return { hide, destroy };
}
