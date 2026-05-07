# zh_urban — theme-gen report

- **Display name**: zh-CN urban 18-35 — modern festive
- **Audience**: Chinese urban Gen Z and Millennials (18-35), modern festive aesthetic, premium-feel mobile content
- **QA pass**: NO

## Palette
- sphereColors:
  - `#d17426`
  - `#ce331e`
  - `#8b1f0f`
  - `#e39a4e`
  - `#ebb282`
  - `#efd6c2`
  - `#f5f4f3`
  - `#d17426`
  - `#ce331e`
  - `#8b1f0f`
- fieldDecorColors:
  - `#762316`
  - `#922e1e`
- backgroundColor: `#491b12`

## Generation attempts
### trump — attempt 1 (rejected)
Prompt:
```
(staged file: tools/theme-gen/agent-stage/zh_urban/trump.png)
```
Issues:
- icon missing alpha channel
- background bleed at corners (alpha 255.0/255)

### money — attempt 1 (rejected)
Prompt:
```
(staged file: tools/theme-gen/agent-stage/zh_urban/money.png)
```
Issues:
- icon missing alpha channel
- background bleed at corners (alpha 255.0/255)

### poop — attempt 1 (rejected)
Prompt:
```
(staged file: tools/theme-gen/agent-stage/zh_urban/poop.png)
```
Issues:
- icon missing alpha channel
- background bleed at corners (alpha 255.0/255)

### background — attempt 1 (ok)
Prompt:
```
(staged file: tools/theme-gen/agent-stage/zh_urban/bg.png)
```

## QA layers
### static: fail
- trump: Icon trump missing alpha channel
- trump: Icon trump has background bleed (corner alpha mean 255.0/255)
- money: Icon money missing alpha channel
- money: Icon money has background bleed (corner alpha mean 255.0/255)
- poop: Icon poop missing alpha channel
- poop: Icon poop has background bleed (corner alpha mean 255.0/255)
