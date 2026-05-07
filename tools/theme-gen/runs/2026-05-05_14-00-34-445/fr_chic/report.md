# fr_chic — theme-gen report

- **Display name**: FR + BE + QC — French chic
- **Audience**: French-speaking adults (FR, BE, QC), café culture, chic and elegant aesthetic
- **QA pass**: NO

## Palette
- sphereColors:
  - `#b05d17`
  - `#eba444`
  - `#d1b794`
  - `#948e76`
  - `#cfd2c3`
  - `#ece5df`
  - `#b05d17`
  - `#eba444`
  - `#d1b794`
  - `#948e76`
- fieldDecorColors:
  - `#a7825e`
  - `#c6a279`
- backgroundColor: `#574435`

## Generation attempts
### trump — attempt 1 (rejected)
Prompt:
```
(staged file: tools/theme-gen/agent-stage/fr_chic/trump.png)
```
Issues:
- icon missing alpha channel
- background bleed at corners (alpha 255.0/255)

### money — attempt 1 (rejected)
Prompt:
```
(staged file: tools/theme-gen/agent-stage/fr_chic/money.png)
```
Issues:
- icon missing alpha channel
- background bleed at corners (alpha 255.0/255)

### poop — attempt 1 (rejected)
Prompt:
```
(staged file: tools/theme-gen/agent-stage/fr_chic/poop.png)
```
Issues:
- icon missing alpha channel
- background bleed at corners (alpha 255.0/255)

### background — attempt 1 (ok)
Prompt:
```
(staged file: tools/theme-gen/agent-stage/fr_chic/bg.png)
```

## QA layers
### static: fail
- trump: Icon trump missing alpha channel
- trump: Icon trump has background bleed (corner alpha mean 255.0/255)
- money: Icon money missing alpha channel
- money: Icon money has background bleed (corner alpha mean 255.0/255)
- poop: Icon poop missing alpha channel
- poop: Icon poop has background bleed (corner alpha mean 255.0/255)
