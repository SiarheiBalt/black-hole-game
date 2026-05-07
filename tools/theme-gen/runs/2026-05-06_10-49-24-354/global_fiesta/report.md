# global_fiesta — theme-gen report

- **Display name**: Global en + LATAM — vibrant fiesta
- **Audience**: English-speaking global audience plus LATAM, vibrant tropical and festive aesthetic
- **QA pass**: NO

## Palette
- sphereColors:
  - `#f1b227`
  - `#f45e06`
  - `#d33275`
  - `#784011`
  - `#a46518`
  - `#19a4bc`
  - `#e8bf6f`
  - `#b89246`
  - `#3d2510`
  - `#2e6379`
- fieldDecorColors:
  - `#16656f`
  - `#237781`
- backgroundColor: `#0e7c8a`

## Generation attempts
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

### decor_triangle — attempt 1 (rejected)
Prompt:
```
(staged file: tools/theme-gen/agent-stage/global_fiesta/decor_triangle.png)
```
Issues:
- background bleed at corners (alpha 18.7/255)

### background — attempt 1 (ok)
Prompt:
```
(svg generator: beach_mosaic)
```

### decor_triangle — attempt 202 (ok)
Prompt:
```
(static-retry re-optimize)
```
Issues:
- Icon decor_triangle has background bleed (corner alpha mean 18.7/255)

### decor_triangle — attempt 203 (ok)
Prompt:
```
(static-retry re-optimize)
```
Issues:
- Icon decor_triangle has background bleed (corner alpha mean 23.0/255)

### decor_triangle — attempt 204 (ok)
Prompt:
```
(static-retry re-optimize)
```
Issues:
- Icon decor_triangle has background bleed (corner alpha mean 28.3/255)

## QA layers
### static: fail
- decor_triangle: Icon decor_triangle has background bleed (corner alpha mean 34.1/255)
