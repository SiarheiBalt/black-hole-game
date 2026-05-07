# uk_pub — theme-gen report

- **Display name**: UK + IE 18-30 — pub culture
- **Audience**: UK and Ireland Gen Z and Millennials (18-30), pub culture, quirky British aesthetic
- **QA pass**: NO

## Palette
- sphereColors:
  - `#c91314`
  - `#951d11`
  - `#f0a122`
  - `#c64540`
  - `#cf6b0d`
  - `#4f231c`
  - `#9c7872`
  - `#634f4a`
  - `#c79d95`
  - `#ded0c6`
- fieldDecorColors:
  - `#723f37`
  - `#a9926f`
- backgroundColor: `#7a2f24`

## Generation attempts
### background — attempt 1 (ok)
Prompt:
```
(svg generator: brick_warm)
```

### sphere — attempt 1 (ok)
Prompt:
```
(staged file: tools/theme-gen/agent-stage/uk_pub/sphere.png)
```

### trump — attempt 1 (ok)
Prompt:
```
(staged file: tools/theme-gen/agent-stage/uk_pub/trump.png)
```

### money — attempt 1 (ok)
Prompt:
```
(staged file: tools/theme-gen/agent-stage/uk_pub/money.png)
```

### poop — attempt 1 (ok)
Prompt:
```
(staged file: tools/theme-gen/agent-stage/uk_pub/poop.png)
```

### decor_cube — attempt 1 (ok)
Prompt:
```
(staged file: tools/theme-gen/agent-stage/uk_pub/decor_cube.png)
```

### decor_triangle — attempt 1 (ok)
Prompt:
```
(staged file: tools/theme-gen/agent-stage/uk_pub/decor_triangle.png)
```

### poop — attempt 102 (ok)
Prompt:
```
(contrast retry, options={"outlineRadius":4,"outlineAlpha":0.8400000000000001,"shadowOffset":5,"shadowBlur":5,"shadowAlpha":0.34,"bgLuminance":0.15738002648446536})
```
Issues:
- Low contrast for poop (icon L=0.31 vs bg L=0.16 → weighted Δ=0.17 < 0.18)

### decor_cube — attempt 102 (ok)
Prompt:
```
(contrast retry, options={"outlineRadius":4,"outlineAlpha":0.8400000000000001,"shadowOffset":5,"shadowBlur":5,"shadowAlpha":0.34,"bgLuminance":0.15738002648446536})
```
Issues:
- Low contrast for decor_cube (icon L=0.32 vs bg L=0.16 → weighted Δ=0.17 < 0.18)

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
