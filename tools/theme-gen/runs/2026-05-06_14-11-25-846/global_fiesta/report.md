# global_fiesta — theme-gen report

- **Display name**: Global en + LATAM — vibrant fiesta
- **Audience**: English-speaking global audience plus LATAM, vibrant tropical and festive aesthetic
- **QA pass**: NO

## Palette
- sphereColors:
  - `#d53174`
  - `#82440f`
  - `#159cb4`
  - `#f4bb2e`
  - `#a97220`
  - `#cfa04d`
  - `#eac180`
  - `#3c2c1a`
  - `#586d84`
  - `#e5d5c8`
- fieldDecorColors:
  - `#16656f`
  - `#237781`
- backgroundColor: `#0e7c8a`

## Generation attempts
### background — attempt 1 (ok)
Prompt:
```
(svg generator: beach_mosaic)
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

### money — attempt 102 (ok)
Prompt:
```
(contrast retry, options={"outlineRadius":4,"outlineAlpha":0.8400000000000001,"shadowOffset":5,"shadowBlur":5,"shadowAlpha":0.34,"bgLuminance":0.4908480829694914})
```
Issues:
- Low contrast for money (icon L=0.60 vs bg L=0.49 → weighted Δ=0.13 < 0.18)

### decor_cube — attempt 102 (ok)
Prompt:
```
(contrast retry, options={"outlineRadius":4,"outlineAlpha":0.8400000000000001,"shadowOffset":5,"shadowBlur":5,"shadowAlpha":0.34,"bgLuminance":0.4908480829694914})
```
Issues:
- Low contrast for decor_cube (icon L=0.57 vs bg L=0.49 → weighted Δ=0.18 < 0.18)

### money — attempt 103 (ok)
Prompt:
```
(contrast retry, options={"outlineRadius":4,"outlineAlpha":0.9,"shadowOffset":5,"shadowBlur":5,"shadowAlpha":0.4,"bgLuminance":0.4908480829694914})
```
Issues:
- Low contrast for money (icon L=0.61 vs bg L=0.49 → weighted Δ=0.14 < 0.18)

### money — attempt 104 (ok)
Prompt:
```
(contrast retry, options={"outlineRadius":4,"outlineAlpha":0.95,"shadowOffset":5,"shadowBlur":5,"shadowAlpha":0.45,"bgLuminance":0.4908480829694914})
```
Issues:
- Low contrast for money (icon L=0.61 vs bg L=0.49 → weighted Δ=0.14 < 0.18)

## QA layers
### static: pass
- (no issues)

### contrast: fail
- money: Low contrast for money (icon L=0.61 vs bg L=0.49 → weighted Δ=0.15 < 0.18)
