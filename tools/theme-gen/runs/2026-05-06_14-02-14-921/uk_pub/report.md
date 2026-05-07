# uk_pub — theme-gen report

- **Display name**: UK + IE 18-30 — pub culture
- **Audience**: UK and Ireland Gen Z and Millennials (18-30), pub culture, quirky British aesthetic
- **QA pass**: NO

## Palette
- sphereColors:
  - `#c50c0e`
  - `#c23833`
  - `#8a2015`
  - `#311310`
  - `#e98d16`
  - `#f4b331`
  - `#c0600d`
  - `#5f4943`
  - `#f2cb63`
  - `#c66c64`
- fieldDecorColors:
  - `#6e3126`
  - `#784237`
- backgroundColor: `#7a2f24`

## Generation attempts
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

### background — attempt 1 (ok)
Prompt:
```
(svg generator: brick_warm)
```

### trump — attempt 102 (ok)
Prompt:
```
(contrast retry, options={"outlineRadius":4,"outlineAlpha":0.8400000000000001,"shadowOffset":5,"shadowBlur":5,"shadowAlpha":0.35000000000000003})
```
Issues:
- Low contrast for trump (icon L=0.26 vs bg L=0.29 → ΔL=0.04 < 0.2)

### poop — attempt 102 (ok)
Prompt:
```
(contrast retry, options={"outlineRadius":4,"outlineAlpha":0.8400000000000001,"shadowOffset":5,"shadowBlur":5,"shadowAlpha":0.35000000000000003})
```
Issues:
- Low contrast for poop (icon L=0.31 vs bg L=0.29 → ΔL=0.01 < 0.2)

### decor_cube — attempt 102 (ok)
Prompt:
```
(contrast retry, options={"outlineRadius":4,"outlineAlpha":0.8400000000000001,"shadowOffset":5,"shadowBlur":5,"shadowAlpha":0.35000000000000003})
```
Issues:
- Low contrast for decor_cube (icon L=0.32 vs bg L=0.29 → ΔL=0.03 < 0.2)

### decor_triangle — attempt 102 (ok)
Prompt:
```
(contrast retry, options={"outlineRadius":4,"outlineAlpha":0.8400000000000001,"shadowOffset":5,"shadowBlur":5,"shadowAlpha":0.35000000000000003})
```
Issues:
- Low contrast for decor_triangle (icon L=0.40 vs bg L=0.29 → ΔL=0.11 < 0.2)

### trump — attempt 103 (ok)
Prompt:
```
(contrast retry, options={"outlineRadius":5,"outlineAlpha":0.9,"shadowOffset":6,"shadowBlur":6,"shadowAlpha":0.42000000000000004})
```
Issues:
- Low contrast for trump (icon L=0.28 vs bg L=0.29 → ΔL=0.01 < 0.2)

### poop — attempt 103 (ok)
Prompt:
```
(contrast retry, options={"outlineRadius":5,"outlineAlpha":0.9,"shadowOffset":6,"shadowBlur":6,"shadowAlpha":0.42000000000000004})
```
Issues:
- Low contrast for poop (icon L=0.32 vs bg L=0.29 → ΔL=0.03 < 0.2)

### decor_cube — attempt 103 (ok)
Prompt:
```
(contrast retry, options={"outlineRadius":5,"outlineAlpha":0.9,"shadowOffset":6,"shadowBlur":6,"shadowAlpha":0.42000000000000004})
```
Issues:
- Low contrast for decor_cube (icon L=0.34 vs bg L=0.29 → ΔL=0.05 < 0.2)

### decor_triangle — attempt 103 (ok)
Prompt:
```
(contrast retry, options={"outlineRadius":5,"outlineAlpha":0.9,"shadowOffset":6,"shadowBlur":6,"shadowAlpha":0.42000000000000004})
```
Issues:
- Low contrast for decor_triangle (icon L=0.44 vs bg L=0.29 → ΔL=0.14 < 0.2)

### trump — attempt 104 (ok)
Prompt:
```
(contrast retry, options={"outlineRadius":6,"outlineAlpha":0.95,"shadowOffset":7,"shadowBlur":7,"shadowAlpha":0.49000000000000005})
```
Issues:
- Low contrast for trump (icon L=0.30 vs bg L=0.29 → ΔL=0.01 < 0.2)

### poop — attempt 104 (ok)
Prompt:
```
(contrast retry, options={"outlineRadius":6,"outlineAlpha":0.95,"shadowOffset":7,"shadowBlur":7,"shadowAlpha":0.49000000000000005})
```
Issues:
- Low contrast for poop (icon L=0.34 vs bg L=0.29 → ΔL=0.05 < 0.2)

### decor_cube — attempt 104 (ok)
Prompt:
```
(contrast retry, options={"outlineRadius":6,"outlineAlpha":0.95,"shadowOffset":7,"shadowBlur":7,"shadowAlpha":0.49000000000000005})
```
Issues:
- Low contrast for decor_cube (icon L=0.36 vs bg L=0.29 → ΔL=0.07 < 0.2)

### decor_triangle — attempt 104 (ok)
Prompt:
```
(contrast retry, options={"outlineRadius":6,"outlineAlpha":0.95,"shadowOffset":7,"shadowBlur":7,"shadowAlpha":0.49000000000000005})
```
Issues:
- Low contrast for decor_triangle (icon L=0.47 vs bg L=0.29 → ΔL=0.17 < 0.2)

## QA layers
### static: fail
- decor_triangle: Icon decor_triangle has background bleed (corner alpha mean 18.2/255)
