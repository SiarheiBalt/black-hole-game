# uk_pub — theme-gen report

- **Display name**: UK + IE 18-30 — pub culture
- **Audience**: UK and Ireland Gen Z and Millennials (18-30), pub culture, quirky British aesthetic
- **QA pass**: NO

## Palette
- sphereColors:
  - `#95261d`
  - `#eb9923`
  - `#f1c775`
  - `#a86d66`
  - `#d4c8c0`
  - `#f1e7e0`
  - `#95261d`
  - `#eb9923`
  - `#f1c775`
  - `#a86d66`
- fieldDecorColors:
  - `#7f5749`
  - `#8f7b73`
- backgroundColor: `#3c3330`

## Generation attempts
### trump — attempt 1 (rejected)
Prompt:
```
(staged file: tools/theme-gen/agent-stage/uk_pub/trump.png)
```
Issues:
- icon missing alpha channel
- background bleed at corners (alpha 255.0/255)

### money — attempt 1 (rejected)
Prompt:
```
(staged file: tools/theme-gen/agent-stage/uk_pub/money.png)
```
Issues:
- icon missing alpha channel
- background bleed at corners (alpha 255.0/255)

### poop — attempt 1 (rejected)
Prompt:
```
(staged file: tools/theme-gen/agent-stage/uk_pub/poop.png)
```
Issues:
- icon missing alpha channel
- background bleed at corners (alpha 255.0/255)

### background — attempt 1 (ok)
Prompt:
```
(staged file: tools/theme-gen/agent-stage/uk_pub/bg.png)
```

## QA layers
### static: fail
- trump: Icon trump missing alpha channel
- trump: Icon trump has background bleed (corner alpha mean 255.0/255)
- money: Icon money missing alpha channel
- money: Icon money has background bleed (corner alpha mean 255.0/255)
- poop: Icon poop missing alpha channel
- poop: Icon poop has background bleed (corner alpha mean 255.0/255)
