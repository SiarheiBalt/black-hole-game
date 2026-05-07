# kr_sea_pop — theme-gen report

- **Display name**: KR + SEA 16-30 — K-pop / boba
- **Audience**: Korean and Southeast Asian Gen Z (16-30), K-pop fans, boba culture, vibrant nightlife
- **QA pass**: NO

## Palette
- sphereColors:
  - `#f34c85`
  - `#a77355`
  - `#3d2334`
  - `#e0a491`
  - `#a865d7`
  - `#e7a4f3`
  - `#eccfbe`
  - `#f2dfe8`
  - `#f5f5f5`
  - `#f34c85`
- fieldDecorColors:
  - `#1485c8`
  - `#103a8b`
- backgroundColor: `#26164a`

## Generation attempts
### trump — attempt 1 (rejected)
Prompt:
```
(staged file: tools/theme-gen/agent-stage/kr_sea_pop/trump.png)
```
Issues:
- icon missing alpha channel
- background bleed at corners (alpha 255.0/255)

### money — attempt 1 (rejected)
Prompt:
```
(staged file: tools/theme-gen/agent-stage/kr_sea_pop/money.png)
```
Issues:
- icon missing alpha channel
- background bleed at corners (alpha 255.0/255)

### poop — attempt 1 (rejected)
Prompt:
```
(staged file: tools/theme-gen/agent-stage/kr_sea_pop/poop.png)
```
Issues:
- icon missing alpha channel
- background bleed at corners (alpha 255.0/255)

### background — attempt 1 (ok)
Prompt:
```
(staged file: tools/theme-gen/agent-stage/kr_sea_pop/bg.png)
```

## QA layers
### static: fail
- trump: Icon trump missing alpha channel
- trump: Icon trump has background bleed (corner alpha mean 255.0/255)
- money: Icon money missing alpha channel
- money: Icon money has background bleed (corner alpha mean 255.0/255)
- poop: Icon poop missing alpha channel
- poop: Icon poop has background bleed (corner alpha mean 255.0/255)
