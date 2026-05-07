// Ручная тема `city` — в production в графе только при VITE_THEME=city (virtual:active-theme).
import { createTheme } from '../_factory.js';

const cityPlayfieldBg = new URL(
  '../../assets/themes/city/city-playfield-bg.webp',
  import.meta.url,
).href;
const cityPizza = new URL('../../assets/themes/city/city-pizza.webp', import.meta.url).href;
const cityCoffee = new URL('../../assets/themes/city/city-coffee.webp', import.meta.url).href;
const cityCone = new URL('../../assets/themes/city/city-cone.webp', import.meta.url).href;

/** Город сверху: пицца, кофе, конусы; контрастные спрайты для читаемости на карте. */
export default createTheme({
  id: 'city',
  fieldDecorColors: [0x94a3b8, 0xf59e0b],
  assetReplacements: {
    '1': cityPizza,
    '2': cityCoffee,
    '3': cityCone,
  },
  playfieldTheme: {
    backgroundColor: 0x1e1433,
    backgroundImage: cityPlayfieldBg,
    decorColor: 0x4c4658,
    starColor: 0xffe066,
    starAlpha: 0.5,
    starCount: 100,
    starSize: 1.35,
  },
  hudIcons: {
    planar: cityCoffee,
    trump: cityPizza,
    poop: cityCone,
  },
  musicVolume: 0.7,
});
