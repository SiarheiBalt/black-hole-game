import './brandInstallCta.css';
import { brandLogoUrl, brandName } from '../assets/brand/brandLogo.js';
import { APP_STORE_URL, openClickout } from '../app/playableAdapter.js';

/**
 * @param {HTMLElement} container
 * @param {object} [opts]
 * @param {typeof openClickout} [opts.openClickout]
 */
export function createBrandInstallCta(container, opts = {}) {
  const clickout = opts.openClickout ?? openClickout;

  const root = document.createElement('aside');
  root.className = 'brand-install-cta';
  root.setAttribute('aria-label', `Install ${brandName}`);

  const logoButton = document.createElement('button');
  logoButton.type = 'button';
  logoButton.className = 'brand-install-cta__logo-button tap-target';
  logoButton.setAttribute('aria-label', `Install ${brandName}`);

  const logo = document.createElement('img');
  logo.className = 'brand-install-cta__logo';
  logo.src = brandLogoUrl;
  logo.alt = brandName;
  logo.decoding = 'async';
  logo.draggable = false;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'brand-install-cta__button tap-target';
  button.textContent = 'Install now';

  const onClick = () => {
    clickout(APP_STORE_URL);
  };
  logoButton.addEventListener('click', onClick);
  button.addEventListener('click', onClick);

  logoButton.appendChild(logo);
  root.append(logoButton, button);
  container.appendChild(root);

  function destroy() {
    root.remove();
  }

  return { destroy };
}
