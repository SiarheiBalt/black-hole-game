# kr_sea_pop — theme-gen report

- **Display name**: KR + SEA 16-30 — K-pop / boba
- **Audience**: Korean and Southeast Asian Gen Z (16-30), K-pop fans, boba culture, vibrant nightlife
- **QA pass**: YES

## Palette
- sphereColors:
  - `#f34a83`
  - `#ab7d57`
  - `#cda783`
  - `#f3a1ab`
  - `#e099eb`
  - `#c372e5`
  - `#432d36`
  - `#9658d8`
  - `#725752`
  - `#503485`
- fieldDecorColors:
  - `#ffffff`
  - `#ffffff`
- backgroundColor: `#05040e`

## Generation attempts
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

### background — attempt 1 (ok)
Prompt:
```
(svg generator: neon_grid)
```

### decor_cube — attempt 102 (ok)
Prompt:
```
(contrast retry, options={"outlineRadius":4,"outlineAlpha":0.8400000000000001,"shadowOffset":5,"shadowBlur":5,"shadowAlpha":0.35000000000000003})
```
Issues:
- Low contrast for decor_cube (icon L=0.32 vs bg L=0.14 → ΔL=0.19 < 0.2)

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