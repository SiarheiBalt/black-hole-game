# jp_kawaii — theme-gen report

- **Display name**: JP female 18-34 — kawaii pastel
- **Audience**: Japanese women 18-34, kawaii / pastel aesthetic, soft and cute
- **QA pass**: NO

## Palette
- sphereColors:
  - `#eeb0b5`
  - `#adbf75`
  - `#e67987`
  - `#7b7c52`
  - `#d1deb0`
  - `#eeeeee`
  - `#f2f2f2`
  - `#eeb0b5`
  - `#adbf75`
  - `#e67987`
- fieldDecorColors:
  - `#d8b6b1`
  - `#8c7e7a`
- backgroundColor: `#8a817a`

## Generation attempts
### trump — attempt 1 (rejected)
Prompt:
```
(staged file: tools/theme-gen/agent-stage/jp_kawaii/trump.png)
```
Issues:
- icon missing alpha channel
- background bleed at corners (alpha 255.0/255)

### money — attempt 1 (rejected)
Prompt:
```
(staged file: tools/theme-gen/agent-stage/jp_kawaii/money.png)
```
Issues:
- icon missing alpha channel
- background bleed at corners (alpha 255.0/255)

### poop — attempt 1 (rejected)
Prompt:
```
(staged file: tools/theme-gen/agent-stage/jp_kawaii/poop.png)
```
Issues:
- icon missing alpha channel
- background bleed at corners (alpha 255.0/255)

### background — attempt 1 (ok)
Prompt:
```
(staged file: tools/theme-gen/agent-stage/jp_kawaii/bg.png)
```

## QA layers
### static: fail
- trump: Icon trump missing alpha channel
- trump: Icon trump has background bleed (corner alpha mean 255.0/255)
- money: Icon money missing alpha channel
- money: Icon money has background bleed (corner alpha mean 255.0/255)
- poop: Icon poop missing alpha channel
- poop: Icon poop has background bleed (corner alpha mean 255.0/255)
