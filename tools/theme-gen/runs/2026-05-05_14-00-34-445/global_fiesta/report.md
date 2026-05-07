# global_fiesta — theme-gen report

- **Display name**: Global en + LATAM — vibrant fiesta
- **Audience**: English-speaking global audience plus LATAM, vibrant tropical and festive aesthetic
- **QA pass**: NO

## Palette
- sphereColors:
  - `#f17d0e`
  - `#8e442b`
  - `#deaf45`
  - `#248da2`
  - `#e5ab8d`
  - `#ecdcc4`
  - `#f4f4f3`
  - `#f17d0e`
  - `#8e442b`
  - `#deaf45`
- fieldDecorColors:
  - `#1c949b`
  - `#e7b44f`
- backgroundColor: `#686f5b`

## Generation attempts
### trump — attempt 1 (rejected)
Prompt:
```
(staged file: tools/theme-gen/agent-stage/global_fiesta/trump.png)
```
Issues:
- icon missing alpha channel
- background bleed at corners (alpha 255.0/255)

### money — attempt 1 (rejected)
Prompt:
```
(staged file: tools/theme-gen/agent-stage/global_fiesta/money.png)
```
Issues:
- icon missing alpha channel
- background bleed at corners (alpha 255.0/255)

### poop — attempt 1 (rejected)
Prompt:
```
(staged file: tools/theme-gen/agent-stage/global_fiesta/poop.png)
```
Issues:
- icon missing alpha channel
- background bleed at corners (alpha 255.0/255)

### background — attempt 1 (ok)
Prompt:
```
(staged file: tools/theme-gen/agent-stage/global_fiesta/bg.png)
```

## QA layers
### static: fail
- trump: Icon trump missing alpha channel
- trump: Icon trump has background bleed (corner alpha mean 255.0/255)
- money: Icon money missing alpha channel
- money: Icon money has background bleed (corner alpha mean 255.0/255)
- poop: Icon poop missing alpha channel
- poop: Icon poop has background bleed (corner alpha mean 255.0/255)
