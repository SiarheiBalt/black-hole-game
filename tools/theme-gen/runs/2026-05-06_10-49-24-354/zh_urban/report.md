# zh_urban — theme-gen report

- **Display name**: zh-CN urban 18-35 — modern festive
- **Audience**: Chinese urban Gen Z and Millennials (18-35), modern festive aesthetic, premium-feel mobile content
- **QA pass**: NO

## Palette
- sphereColors:
  - `#a71008`
  - `#be5d13`
  - `#db7717`
  - `#d92d1f`
  - `#ec942d`
  - `#9a4211`
  - `#e5a257`
  - `#c4813b`
  - `#ea5c46`
  - `#4f261b`
- fieldDecorColors:
  - `#6a1211`
  - `#722618`
- backgroundColor: `#490c0c`

## Generation attempts
### trump — attempt 1 (ok)
Prompt:
```
(staged file: tools/theme-gen/agent-stage/zh_urban/trump.png)
```

### money — attempt 1 (ok)
Prompt:
```
(staged file: tools/theme-gen/agent-stage/zh_urban/money.png)
```

### poop — attempt 1 (ok)
Prompt:
```
(staged file: tools/theme-gen/agent-stage/zh_urban/poop.png)
```

### decor_cube — attempt 1 (ok)
Prompt:
```
(staged file: tools/theme-gen/agent-stage/zh_urban/decor_cube.png)
```

### decor_triangle — attempt 1 (ok)
Prompt:
```
(staged file: tools/theme-gen/agent-stage/zh_urban/decor_triangle.png)
```

### background — attempt 1 (ok)
Prompt:
```
(svg generator: paper_festive)
```

### decor_cube — attempt 102 (ok)
Prompt:
```
(contrast retry, options={"outlineRadius":4,"outlineAlpha":0.8400000000000001,"shadowOffset":5,"shadowBlur":5,"shadowAlpha":0.35000000000000003})
```
Issues:
- Low contrast for decor_cube (icon L=0.40 vs bg L=0.20 → ΔL=0.20 < 0.2)

## QA layers
### static: pass
- (no issues)

### contrast: pass
- (no issues)

### render: fail
- general: Playwright failed: browserType.launch: Executable doesn't exist at /var/folders/qs/sh8t064x3vx_lw3z78rfvckm0000gn/T/cursor-sandbox-cache/539b0c0a621d17052c5275452130006c/playwright/chromium_headless_shell-1217/chrome-headless-shell-mac-x64/chrome-headless-shell
╔════════════════════════════════════════════════════════════╗
║ Looks like Playwright was just installed or updated.       ║
║ Please run the following command to download new browsers: ║
║                                                            ║
║     npx playwright install                                 ║
║                                                            ║
║ <3 Playwright Team                                         ║
╚════════════════════════════════════════════════════════════╝
