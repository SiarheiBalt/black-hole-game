import './gameOverOverlay.css';

/**
 * @param {HTMLElement} container
 */
export function createGameOverOverlay(container) {
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
  panel.append(stars, text);
  root.appendChild(panel);
  container.appendChild(root);

  /**
   * @param {string} message
   * @param {boolean} [isWin] — яркое «победное» оформление
   */
  function show(message, isWin = false) {
    text.textContent = message;
    root.classList.toggle('game-over-overlay--win', isWin);
    root.classList.toggle('game-over-overlay--lose', !isWin);
    root.setAttribute(
      'aria-label',
      isWin ? `${message}, 3 stars` : message,
    );
    root.hidden = false;
  }

  function hide() {
    root.classList.remove('game-over-overlay--win', 'game-over-overlay--lose');
    root.hidden = true;
  }

  function destroy() {
    root.remove();
  }

  return { show, hide, destroy };
}
