# global_fiesta — theme-gen report

- **Display name**: Global en + LATAM — vibrant fiesta
- **Audience**: English-speaking global audience plus LATAM, vibrant tropical and festive aesthetic
- **QA pass**: NO

## Palette
- sphereColors:
  - `#f59510`
  - `#f46707`
  - `#d23275`
  - `#a24d14`
  - `#f0b93b`
  - `#552c0d`
  - `#1aa4bb`
  - `#ba9046`
  - `#e8c082`
  - `#7e7a17`
- fieldDecorColors:
  - `#ffffff`
  - `#ffffff`
- backgroundColor: `#0a5b66`

## Generation attempts
### background — attempt 1 (ok)
Prompt:
```
(svg generator: beach_mosaic)
```

### sphere — attempt 1 (ok)
Prompt:
```
(staged file: tools/theme-gen/agent-stage/global_fiesta/sphere.png)
```

### trump — attempt 1 (ok)
Prompt:
```
(staged file: tools/theme-gen/agent-stage/global_fiesta/trump.png)
```

### money — attempt 1 (ok)
Prompt:
```
(staged file: tools/theme-gen/agent-stage/global_fiesta/money.png)
```

### poop — attempt 1 (ok)
Prompt:
```
(staged file: tools/theme-gen/agent-stage/global_fiesta/poop.png)
```

### decor_cube — attempt 1 (ok)
Prompt:
```
(staged file: tools/theme-gen/agent-stage/global_fiesta/decor_cube.png)
```

### decor_triangle — attempt 1 (ok)
Prompt:
```
(staged file: tools/theme-gen/agent-stage/global_fiesta/decor_triangle.png)
```

## QA layers
### static: pass
- (no issues)

### contrast: pass
- (no issues)

### render: fail
- general: Playwright failed: browserType.launch: Executable doesn't exist at /var/folders/qs/sh8t064x3vx_lw3z78rfvckm0000gn/T/cursor-sandbox-cache/c9aabc537dd472845deacc8f6d8bd7c1/playwright/chromium_headless_shell-1217/chrome-headless-shell-mac-arm64/chrome-headless-shell
╔════════════════════════════════════════════════════════════╗
║ Looks like Playwright was just installed or updated.       ║
║ Please run the following command to download new browsers: ║
║                                                            ║
║     npx playwright install                                 ║
║                                                            ║
║ <3 Playwright Team                                         ║
╚════════════════════════════════════════════════════════════╝
