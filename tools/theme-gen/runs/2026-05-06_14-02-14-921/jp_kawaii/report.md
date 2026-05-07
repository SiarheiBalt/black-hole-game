# jp_kawaii — theme-gen report

- **Display name**: JP female 18-34 — kawaii pastel
- **Audience**: Japanese women 18-34, kawaii / pastel aesthetic, soft and cute
- **QA pass**: YES

## Palette
- sphereColors:
  - `#ecb2b5`
  - `#b7c353`
  - `#91ac79`
  - `#f099a3`
  - `#ed7a89`
  - `#d7a6a7`
  - `#c5d5a5`
  - `#332326`
  - `#d2485c`
  - `#b4898e`
- fieldDecorColors:
  - `#e4a5bd`
  - `#ffffff`
- backgroundColor: `#ffb8d4`

## Generation attempts
### trump — attempt 1 (ok)
Prompt:
```
(staged file: tools/theme-gen/agent-stage/jp_kawaii/trump.png)
```

### money — attempt 1 (ok)
Prompt:
```
(staged file: tools/theme-gen/agent-stage/jp_kawaii/money.png)
```

### poop — attempt 1 (ok)
Prompt:
```
(staged file: tools/theme-gen/agent-stage/jp_kawaii/poop.png)
```

### decor_cube — attempt 1 (ok)
Prompt:
```
(staged file: tools/theme-gen/agent-stage/jp_kawaii/decor_cube.png)
```

### decor_triangle — attempt 1 (ok)
Prompt:
```
(staged file: tools/theme-gen/agent-stage/jp_kawaii/decor_triangle.png)
```

### background — attempt 1 (ok)
Prompt:
```
(svg generator: kawaii_dots)
```

### money — attempt 102 (ok)
Prompt:
```
(contrast retry, options={"outlineRadius":4,"outlineAlpha":0.8400000000000001,"shadowOffset":5,"shadowBlur":5,"shadowAlpha":0.35000000000000003})
```
Issues:
- Low contrast for money (icon L=0.63 vs bg L=0.81 → ΔL=0.18 < 0.2)

### poop — attempt 102 (ok)
Prompt:
```
(contrast retry, options={"outlineRadius":4,"outlineAlpha":0.8400000000000001,"shadowOffset":5,"shadowBlur":5,"shadowAlpha":0.35000000000000003})
```
Issues:
- Low contrast for poop (icon L=0.62 vs bg L=0.81 → ΔL=0.19 < 0.2)

### decor_cube — attempt 102 (ok)
Prompt:
```
(contrast retry, options={"outlineRadius":4,"outlineAlpha":0.8400000000000001,"shadowOffset":5,"shadowBlur":5,"shadowAlpha":0.35000000000000003})
```
Issues:
- Low contrast for decor_cube (icon L=0.62 vs bg L=0.81 → ΔL=0.19 < 0.2)

## QA layers
### static: pass
- (no issues)

### contrast: pass
- (no issues)

### render: pass
- (no issues)

## Screenshots
![screenshot](screenshots/t0.png)
![screenshot](screenshots/t2.png)
![screenshot](screenshots/t4.png)