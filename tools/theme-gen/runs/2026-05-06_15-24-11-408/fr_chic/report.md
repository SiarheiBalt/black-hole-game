# fr_chic — theme-gen report

- **Display name**: FR + BE + QC — French chic
- **Audience**: French-speaking adults (FR, BE, QC), café culture, chic and elegant aesthetic
- **QA pass**: NO

## Palette
- sphereColors:
  - `#bb5f10`
  - `#dc852b`
  - `#ebb950`
  - `#e0948a`
  - `#532d0c`
  - `#9da385`
  - `#868567`
  - `#b6bba1`
  - `#625944`
  - `#d0cbb9`
- fieldDecorColors:
  - `#ffffff`
  - `#ffffff`
- backgroundColor: `#121624`

## Generation attempts
### background — attempt 1 (ok)
Prompt:
```
(svg generator: cafe_cobble)
```

### sphere — attempt 1 (ok)
Prompt:
```
(staged file: tools/theme-gen/agent-stage/fr_chic/sphere.png)
```

### trump — attempt 1 (ok)
Prompt:
```
(staged file: tools/theme-gen/agent-stage/fr_chic/trump.png)
```

### money — attempt 1 (ok)
Prompt:
```
(staged file: tools/theme-gen/agent-stage/fr_chic/money.png)
```

### poop — attempt 1 (ok)
Prompt:
```
(staged file: tools/theme-gen/agent-stage/fr_chic/poop.png)
```

### decor_cube — attempt 1 (ok)
Prompt:
```
(staged file: tools/theme-gen/agent-stage/fr_chic/decor_cube.png)
```

### decor_triangle — attempt 1 (ok)
Prompt:
```
(staged file: tools/theme-gen/agent-stage/fr_chic/decor_triangle.png)
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
