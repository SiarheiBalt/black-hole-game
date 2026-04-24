import './gameOverOverlay.css';
import { openClickout } from '../app/playableAdapter.js';

/**
 * @param {HTMLElement} container
 * @param {object} [opts]
 * @param {typeof openClickout} [opts.openClickout]
 * @param {string} [opts.ctaLabel]
 */
export function createGameOverOverlay(container, opts = {}) {
  const clickout = opts.openClickout ?? openClickout;
  const ctaLabel = opts.ctaLabel ?? 'Install';

  const root = document.createElement('div');
  root.className = 'game-over-overlay';
  root.setAttribute('role', 'alert');
  root.hidden = true;

  const panel = document.createElement('div');
  panel.className = 'game-over-overlay__panel';

  const stars = document.createElement('div');
  stars.className = 'game-over-overlay__stars';
  stars.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 3; i++) {
    const star = document.createElement('span');
    star.className = 'game-over-overlay__star';
    star.style.setProperty('--go-star-i', String(i));
    star.textContent = '★';
    stars.appendChild(star);
  }

  const text = document.createElement('p');
  text.className = 'game-over-overlay__message';

  const cta = document.createElement('button');
  cta.type = 'button';
  cta.className = 'game-over-overlay__cta tap-target';
  cta.textContent = ctaLabel;
  cta.addEventListener('click', () => {
    clickout();
  });

  panel.append(stars, text, cta);
  root.appendChild(panel);
  container.appendChild(root);

  /**
   * @param {string} message
   * @param {boolean} [isWin]
   * @param {object} [extra]
   * @param {boolean} [extra.isFatal]
   */
  function show(message, isWin = false, extra = {}) {
    const { isFatal = false } = extra;
    text.textContent = message;
    root.classList.toggle('game-over-overlay--win', isWin);
    root.classList.toggle('game-over-overlay--lose', !isWin);
    root.classList.toggle('game-over-overlay--fatal', isFatal);
    const ariaMsg = isFatal ? `${message}. Tap ${ctaLabel} to continue.` : message;
    root.setAttribute(
      'aria-label',
      isWin ? `${message}, 3 stars` : ariaMsg,
    );
    root.hidden = false;
  }

  function hide() {
    root.classList.remove(
      'game-over-overlay--win',
      'game-over-overlay--lose',
      'game-over-overlay--fatal',
    );
    root.hidden = true;
  }

  function destroy() {
    root.remove();
  }

  return { show, hide, destroy };
}
