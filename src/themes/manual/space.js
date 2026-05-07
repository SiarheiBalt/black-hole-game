// Ручная тема `space` — в production в графе только при VITE_THEME=space (virtual:active-theme).
import { createTheme } from '../_factory.js';

const alienShip = new URL('../../assets/themes/space/alien-ship.svg', import.meta.url).href;
const sun = new URL('../../assets/themes/space/sun.svg', import.meta.url).href;
const planet = new URL('../../assets/themes/space/planet.svg', import.meta.url).href;

export default createTheme({
  id: 'space',
  fieldDecorColors: [0xf69837, 0x4f41ff],
  assetReplacements: {
    '1': alienShip,
    '2': sun,
    '3': planet,
  },
  playfieldTheme: {
    backgroundColor: 0x020a1f,
    decorColor: 0x28304b,
    starColor: 0xffffff,
    starAlpha: 0.7,
    starCount: 480,
    starSize: 1.2,
  },
  hudIcons: {
    planar: sun,
    trump: alienShip,
    poop: planet,
  },
  musicVolume: 0.7,
});
