# zh_urban — theme-gen report

- **Display name**: zh-CN urban 18-35 — modern festive
- **Audience**: Chinese urban Gen Z and Millennials (18-35), modern festive aesthetic, premium-feel mobile content
- **QA pass**: NO

## Palette
- sphereColors:
  - `#cc6915`
  - `#e98f2a`
  - `#a24811`
  - `#981106`
  - `#e7aa64`
  - `#bb120c`
  - `#d92c1e`
  - `#c5843c`
  - `#e74c37`
  - `#50261b`
- fieldDecorColors:
  - `#6a1c14`
  - `#722417`
- backgroundColor: `#490c0c`

## Generation attempts
### background — attempt 1 (ok)
Prompt:
```
(svg generator: paper_festive)
```

### sphere — attempt 1 (ok)
Prompt:
```
(staged file: tools/theme-gen/agent-stage/zh_urban/sphere.png)
```

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
