# kr_sea_pop — theme-gen report

- **Display name**: KR + SEA 16-30 — K-pop / boba
- **Audience**: Korean and Southeast Asian Gen Z (16-30), K-pop fans, boba culture, vibrant nightlife
- **QA pass**: NO

## Palette
- sphereColors:
  - `#e83a71`
  - `#a5734c`
  - `#311a1f`
  - `#cda075`
  - `#d57ceb`
  - `#e4c4a3`
  - `#9b5fd8`
  - `#583861`
  - `#e3aee2`
  - `#e5d7d7`
- fieldDecorColors:
  - `#ffffff`
  - `#ffffff`
- backgroundColor: `#05040e`

## Generation attempts
### background — attempt 1 (ok)
Prompt:
```
(svg generator: neon_grid)
```

### sphere — attempt 1 (ok)
Prompt:
```
(staged file: tools/theme-gen/agent-stage/kr_sea_pop/sphere.png)
```

### trump — attempt 1 (ok)
Prompt:
```
(staged file: tools/theme-gen/agent-stage/kr_sea_pop/trump.png)
```

### money — attempt 1 (ok)
Prompt:
```
(staged file: tools/theme-gen/agent-stage/kr_sea_pop/money.png)
```

### poop — attempt 1 (ok)
Prompt:
```
(staged file: tools/theme-gen/agent-stage/kr_sea_pop/poop.png)
```

### decor_cube — attempt 1 (ok)
Prompt:
```
(staged file: tools/theme-gen/agent-stage/kr_sea_pop/decor_cube.png)
```

### decor_triangle — attempt 1 (ok)
Prompt:
```
(staged file: tools/theme-gen/agent-stage/kr_sea_pop/decor_triangle.png)
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
