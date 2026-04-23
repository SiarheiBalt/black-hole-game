import {
    Application,
    Graphics,
    Text,
    TextStyle,
    Assets,
    Sprite,
    Container,
    Spritesheet,
    AnimatedSprite,
  } from 'pixi.js';
  import { initDevtools } from '@pixi/devtools';

  (async () => {
    const app = new Application();

    await app.init({
        resizeTo: window,
        background: '#1099bb',
    });

    initDevtools({ app });
    globalThis.__PIXI_APP__ = app;

    document.getElementById('game-container').appendChild(app.canvas);
  })();