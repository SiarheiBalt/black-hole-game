# Playable Ad Requirements Guide

**Cross-Platform Compatibility for: Vungle, AppLovin, Unity Ads, Google Ads, Mintegral, Moloco, ironSource, Facebook**

Use this document as the **source of truth** when generating, updating, reviewing, or refactoring HTML5 playable ads.

The goal is to create **one universal ZIP bundle** that works across all supported ad networks without breaking clickout, lifecycle, audio handling, safe areas, or policy compliance.

---

## Primary Goal

Generate HTML5 playable ads that pass review across:

- Vungle
- AppLovin
- Unity Ads
- Google Ads
- Mintegral
- Moloco
- ironSource
- Facebook

Use **ONE universal bundle**.

Do not break:

- clickout
- lifecycle
- audio rules
- safe area support
- policy compliance
- Mintegral hooks
- Google clickTag compatibility

---

## Implementation Contract for Claude Code

When generating or editing playable ad code, always:

1. Keep one universal bundle for all supported networks
2. Preserve all required global hooks and variables
3. Avoid introducing remote dependencies
4. Reuse the universal adapter pattern where possible
5. Validate clickout, lifecycle, audio, and error fallback logic
6. Prefer modifying existing code over rewriting working adapters
7. Never remove platform-critical compatibility code unless replacing it with an equivalent implementation
8. Favor simple, deterministic code over clever abstractions

---

## Non-Negotiable Requirements (MUST)

| Requirement | Details |
|-------------|---------|
| **Single Bundle** | One ZIP file works on all networks |
| **No Remote Dependencies** | All assets embedded locally (no external scripts, fonts, images, analytics SDKs) |
| **No Autoplay Audio** | Audio only after user gesture |
| **Pause on Background** | Pause gameplay + audio when app goes to background |
| **Resume Without Duplication** | No duplicate loops, timers, or overlapping audio on resume |
| **MRAID Support** | Use `mraid.open()` for clickout when available |
| **Google Click Tags** | Always include `window.clickTag` and `window.clickTag1` |
| **Mintegral Hooks** | Preserve `gameStart()` and `gameClose()` support |
| **Safe Area Support** | UI respects notch and bottom bar |
| **Error Fallback** | Never leave a blank screen; show end card on fatal error |
| **Universal Clickout Fallback** | Must still click out when MRAID is unavailable |
| **Restricted Webview Compatibility** | Must work in non-MRAID environments like Facebook and Moloco |
| **ZIP Size** | Maximum 5MB, recommended target 3MB |

---

## Recommended Requirements (SHOULD)

- Target ZIP size **≤ 3MB** whenever possible
- Keep first meaningful interaction within **3 seconds**
- Keep playable session length roughly **10–30 seconds**
- Prefer a single mechanic per ad
- Use immediate feedback for taps, drags, or swipes
- Use `requestAnimationFrame` instead of timer-heavy loops when possible
- Avoid DOM-heavy rendering for fast-action gameplay
- Chunk heavy initialization work to avoid frozen loading screens

---

## Nice to Have (NICE TO HAVE)

- Replay button on end card
- Lightweight progress tracking hooks
- Starter architecture with separate `adapter.js`
- Object pooling for repeated entities
- Asset atlas / sprite sheet optimization

---

## Platform Compatibility Matrix

| Platform     | Clickout Method           | Special Hooks / APIs          | Notes |
|--------------|---------------------------|-------------------------------|-------|
| **AppLovin** | `mraid.open()`            | `ALPlayableAnalytics`         | Full MRAID lifecycle expected |
| **Unity Ads** | `mraid.open()`           | —                             | Similar to AppLovin |
| **Google Ads** | `clickTag` / `clickTag1` | —                           | No MRAID support |
| **Mintegral** | `install()`              | `gameStart`, `gameClose`, `gameReady`, `gameEnd` | Hooks are important |
| **Moloco** | `window.open()` fallback   | —                             | Standard webview behavior |
| **Vungle** | `mraid.open()`             | —                             | Strict lifecycle handling recommended |
| **ironSource** | `mraid.open()`          | —                             | Strong validation on lifecycle and resume behavior |
| **Facebook** | `window.open()` fallback | —                             | No MRAID, strict policy and popup constraints |

---

## Cross-Platform Priority Rules

When implementing features:

1. Always support both:
   - MRAID platforms (Vungle, AppLovin, Unity Ads, ironSource)
   - non-MRAID platforms (Google Ads, Facebook, Moloco)
2. Never assume MRAID exists
3. Always include fallback logic for:
   - clickout
   - lifecycle
   - audio
4. Mintegral hooks must never be removed
5. Google clickTag support must always remain
6. Policy compliance overrides convenience
7. Universal compatibility is more important than platform-specific optimization

---

## Conflict Resolution Rules

If platform-specific behavior conflicts with generic behavior:

1. Preserve **policy compliance** first
2. Preserve **universal compatibility** second
3. Prefer **MRAID clickout** when available
4. Preserve **Google Ads clickTag compatibility**
5. Preserve **Mintegral hooks**
6. Never remove **error fallback** or **pause/resume** behavior

---

## Do Not Remove or Break

- `window.clickTag`
- `window.clickTag1`
- `mraid.open()` support
- `window.install()` support
- `window.gameStart()`
- `window.gameClose()`
- `visibilitychange` handler
- `blur` / `focus` handlers
- `pagehide` cleanup logic
- global error fallback to end card
- safe area layout protection

---

## Safe Area & Scaling

### CSS Variables for Safe Area

```css
:root {
    --sat: env(safe-area-inset-top);
    --sar: env(safe-area-inset-right);
    --sab: env(safe-area-inset-bottom);
    --sal: env(safe-area-inset-left);
}
```

### Apply to Main Container

```css
.game-container {
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
    padding-left: env(safe-area-inset-left);
    padding-right: env(safe-area-inset-right);
}
```

### Critical UI Positioning

```css
/* CTA button - always above bottom safe area */
.cta-button {
    bottom: calc(20px + env(safe-area-inset-bottom));
}

/* Score/header - always below top safe area */
.header {
    top: calc(10px + env(safe-area-inset-top));
}
```

### Viewport Meta Tag

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
```

### Prevent Scroll/Bounce

```css
html, body {
    overflow: hidden;
    position: fixed;
    width: 100%;
    height: 100%;
    overscroll-behavior: none;
}
```

---

## Orientation Handling

- Prefer **portrait orientation** unless the ad brief explicitly requires landscape
- Do not assume orientation lock APIs are available everywhere
- The UI must still behave acceptably if rotation occurs
- Do not place critical buttons near edges that become unsafe after rotation

Optional helper:

```javascript
function lockOrientation() {
    if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('portrait').catch(() => {});
    }
}
```

---

## Clickout / CTA Implementation

### Clickout Priority Order

1. **MRAID** → `mraid.open()`
2. **Mintegral** → `install()`
3. **Fallback** → `window.open()` then `window.location.href`

### Google Ads Click Tags (Required)

Define globally at the start of your script:

```javascript
window.clickTag = window.clickTag || 'https://play.google.com/store/apps/details?id=YOUR_APP_ID';
window.clickTag1 = window.clickTag1 || window.clickTag;
```

### Universal Clickout Function

```javascript
function openClickout(url) {
    const targetUrl = url || window.clickTag1 || window.clickTag;

    if (typeof markGameClosed === 'function') {
        markGameClosed();
    }

    // 1. MRAID first (Vungle, AppLovin, Unity, ironSource)
    if (window.mraid && typeof mraid.open === 'function') {
        mraid.open(targetUrl);
        return;
    }

    // 2. Mintegral SDK
    if (typeof window.install === 'function') {
        window.install();
        return;
    }

    // 3. Standard fallback (Moloco, Facebook, generic webviews)
    const newWindow = window.open(targetUrl, '_blank');
    if (!newWindow || newWindow.closed) {
        window.location.href = targetUrl;
    }
}
```

### MRAID Initialization

```javascript
let mraidReady = false;

function initMRAID() {
    if (window.mraid) {
        if (mraid.getState() === 'ready') {
            mraidReady = true;
        } else {
            mraid.addEventListener('ready', function() {
                mraidReady = true;
            });
        }
    }
}

initMRAID();
```

---

## Audio Requirements

### Gesture-Gating (Required)

Audio must **never** play before user interaction:

```javascript
let audioUnlocked = false;

function unlockAudio() {
    if (audioUnlocked) return;
    audioUnlocked = true;
    bgMusic.play().catch(() => {});
}

document.addEventListener('click', unlockAudio, { once: true });
document.addEventListener('touchstart', unlockAudio, { once: true });
document.addEventListener('pointerdown', unlockAudio, { once: true });
```

### Background Pause/Resume

```javascript
let bgMusicRef = null;
let audioWasPlaying = false;

function setBgMusicRef(music) {
    bgMusicRef = music;
}

function pauseAudio() {
    if (bgMusicRef && !bgMusicRef.paused) {
        audioWasPlaying = true;
        bgMusicRef.pause();
    }
}

function resumeAudio() {
    if (bgMusicRef && audioWasPlaying) {
        bgMusicRef.play().catch(() => {});
    }
    audioWasPlaying = false;
}
```

---

## Lifecycle Management

### Required Events

Must correctly handle:

- `visibilitychange`
- `blur`
- `focus`
- `pagehide`
- `mraid.viewableChange` when available

### Lifecycle Handler

```javascript
let sessionStarted = false;
let gamePaused = false;

document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        pauseGame();
    } else {
        resumeGame();
    }
});

window.addEventListener('blur', pauseGame);
window.addEventListener('focus', resumeGame);
window.addEventListener('pagehide', markGameClosed);

function pauseGame() {
    if (gamePaused) return;
    gamePaused = true;
    pauseAudio();
    // Stop game loop, timers, animations, physics, etc.
}

function resumeGame() {
    if (!gamePaused || !sessionStarted) return;
    gamePaused = false;
    resumeAudio();
    // Resume game loop, timers, animations, physics, etc.
}
```

### MRAID Viewable Change

```javascript
if (window.mraid && typeof mraid.addEventListener === 'function') {
    mraid.addEventListener('viewableChange', function(viewable) {
        if (viewable) {
            resumeGame();
        } else {
            pauseGame();
        }
    });
}
```

---

## Mintegral-Specific Hooks

### gameStart / gameClose

```javascript
let gameStartCalled = false;
let gameCloseCalled = false;

window.gameStart = window.gameStart || function() {};
window.gameClose = window.gameClose || function() {};

function markGameStarted() {
    if (gameStartCalled) return;
    gameStartCalled = true;
    if (typeof window.gameStart === 'function') {
        window.gameStart();
    }
}

function markGameClosed() {
    if (gameCloseCalled) return;
    gameCloseCalled = true;
    if (typeof window.gameClose === 'function') {
        window.gameClose();
    }
}

document.addEventListener('pointerdown', function onFirstGesture() {
    markGameStarted();
    document.removeEventListener('pointerdown', onFirstGesture);
}, { once: true });

window.addEventListener('pagehide', markGameClosed);
```

### Other Mintegral Hooks

```javascript
window.gameReady = window.gameReady || function() {};
window.gameEnd = window.gameEnd || function() {};
window.install = window.install || function() {};

window.gameReady();
```

---

## AppLovin Analytics

### Event Tracking

```javascript
function trackAnalytics(eventName) {
    if (typeof window.ALPlayableAnalytics !== 'undefined') {
        window.ALPlayableAnalytics.trackEvent(eventName);
    }
}
```

### Events to Track

| Event | When to Fire |
|-------|--------------|
| `LOADING` | On script initialization |
| `LOADED` | After all assets loaded |
| `DISPLAYED` | When game screen is shown |
| `CHALLENGE_STARTED` | On first user interaction |
| `CHALLENGE_PASS_25` | At 25% progress |
| `CHALLENGE_PASS_50` | At 50% progress |
| `CHALLENGE_PASS_75` | At 75% progress |
| `CHALLENGE_SOLVED` | On game completion (success) |
| `CHALLENGE_FAILED` | On game failure (wrong answer, timeout) |
| `CHALLENGE_RETRY` | When player retries after failure |
| `ENDCARD_SHOWN` | When end card appears |
| `CTA_CLICKED` | When install button clicked |

### Progress Tracking Helper

```javascript
let progressTracked = { p25: false, p50: false, p75: false };

function trackProgress(currentIndex, totalItems) {
    const percent = (currentIndex / totalItems) * 100;

    if (percent >= 25 && !progressTracked.p25) {
        progressTracked.p25 = true;
        trackAnalytics('CHALLENGE_PASS_25');
    }
    if (percent >= 50 && !progressTracked.p50) {
        progressTracked.p50 = true;
        trackAnalytics('CHALLENGE_PASS_50');
    }
    if (percent >= 75 && !progressTracked.p75) {
        progressTracked.p75 = true;
        trackAnalytics('CHALLENGE_PASS_75');
    }
}
```

---

## Facebook Playable Constraints

- No MRAID support
- No autoplay audio
- No automatic redirects
- Navigation must be user-initiated
- Popup opening may fail, so fallback is required
- No misleading UI (fake close buttons, fake system chrome, deceptive dialogs)
- Must function in a restricted mobile webview

---

## Vungle / ironSource Notes

- Treat both as **strict lifecycle environments**
- Ads may be rejected if:
  - audio continues in background
  - game continues when hidden
  - resume creates duplicate timers, loops, or audio layers
- Always test repeated pause/resume cycles

---

## End Card & Error Handling

### Global Error Fallback

```javascript
window.onerror = function(msg, url, line, col, error) {
    const endScreen = document.getElementById('endScreen');
    if (endScreen) {
        endScreen.classList.add('active');
    }
    markGameClosed();
    return true;
};

window.addEventListener('unhandledrejection', function(event) {
    const endScreen = document.getElementById('endScreen');
    if (endScreen) {
        endScreen.classList.add('active');
    }
    markGameClosed();
});
```

### End Card Requirements

- Must appear on win / lose / timeout / fatal error
- Must include CTA button wired through `openClickout()`
- Optional replay button is allowed
- Never leave a blank screen

---

## Touch & Webview Quirks

### Prevent Unintended Scrolling

```css
html, body {
    overflow: hidden;
    touch-action: none;
    -webkit-tap-highlight-color: transparent;
}

button, .interactive {
    touch-action: manipulation;
}
```

### Minimum Tap Target Size

```css
button, .tap-target {
    min-width: 44px;
    min-height: 44px;
}
```

### Prevent Default Only Where Needed

```javascript
gameArea.addEventListener('touchmove', function(e) {
    e.preventDefault();
}, { passive: false });
```

---

## Bundle Size & Performance

### Size Limits

| Network Group | Max Size | Recommended Target |
|---------------|----------|--------------------|
| All Networks | 5 MB | 3 MB |

### Optimization Techniques

1. **Images**: Compress PNGs, use JPG for photos, WebP where supported
2. **Audio**: Use MP3 at 48–64 kbps mono; convert WAV to MP3
3. **Fonts**: Subset fonts or use system fonts
4. **Code**: Minify JS/CSS, remove dead code and debug logs
5. **Base64**: Avoid giant embeds; compress before embedding
6. **Loading**: Lazy load non-critical assets when possible
7. **Rendering**: Prefer lightweight draw/update paths

### Performance Guardrails

- Target **30–60 FPS**
- Avoid excessive `setInterval` usage
- Avoid heavy DOM mutation inside the gameplay loop
- Prefer `requestAnimationFrame` for animation and render updates
- Use sprite atlases or batching when appropriate
- Avoid synchronous startup work that freezes the first frame

### Preloader Requirements

- Show loading UI immediately
- Avoid heavy synchronous initialization
- Use `requestAnimationFrame` or `setTimeout(0)` to split large work into chunks

---

## Policy Compliance

### Prohibited

- Fake system UI or deceptive close buttons
- Restricted APIs: clipboard, geolocation, camera, notifications
- Automatic redirects (navigation only via user click)
- Autoplay audio
- Remote asset loading
- Misleading claims about rewards, installs, or gameplay outcomes

### Required

- Clear CTA button
- User-initiated navigation only
- Proper error handling
- Honest interaction model

---

## Self-Validation Checklist (Mandatory)

Before finalizing any playable ad:

- [ ] `window.clickTag` exists
- [ ] `window.clickTag1` exists
- [ ] audio starts only after user gesture
- [ ] pause/resume works on `visibilitychange`
- [ ] pause/resume works on `blur` / `focus`
- [ ] CTA uses `openClickout()`
- [ ] no remote assets are loaded
- [ ] end card exists and is reachable on failure
- [ ] Mintegral hooks remain intact
- [ ] ZIP is under 5MB

---

## Acceptance Tests

Run these tests before submission:

| Test | Expected Result |
|------|-----------------|
| Tap screen, check audio | Audio starts only after tap |
| Switch to another app | Game pauses, audio stops |
| Return to ad | Game resumes without duplicate loops |
| Click CTA button in MRAID environment | Opens store via `mraid.open()` |
| Click CTA button in non-MRAID environment | Opens store via fallback |
| Facebook clickout | Opens destination without relying solely on popup success |
| Mintegral test tool | `gameStart` / `gameClose` detected |
| Vungle / ironSource repeated resume test | No duplicate audio, timers, or loops |
| Test on iPhone with notch | UI not obscured by notch/home bar |
| Force JS error | End card appears, not blank screen |
| Google HTML5 Validator | No missing clickTag error |
| ZIP size check | Under 5MB |

---

## Common Failure Modes

| Failure | Likely Cause |
|---------|--------------|
| CTA does not open store | Missing clickTag, broken MRAID path, or missing fallback |
| Sound never plays | Audio not gesture-unlocked |
| Sound keeps playing in background | Missing pause logic |
| Blank screen after crash | Missing error fallback / end card |
| Google validator reject | `clickTag` or `clickTag1` missing |
| Mintegral reject / bad instrumentation | `gameStart()` / `gameClose()` removed or not triggered |
| Lifecycle bugs on Vungle / ironSource | Resume duplicates loops or audio |
| Facebook clickout fails | Popup blocked and no `location.href` fallback |
| UI clipped by notch | No safe area support |
| ZIP too large | Uncompressed assets or oversized audio/images |

---

## Starter Template Structure

```text
/playable
  /assets
  index.html
  style.css
  main.js
  adapter.js
```

Recommended role split:

- `index.html` → structure + viewport + root container
- `style.css` → layout + safe area + interaction styling
- `main.js` → game logic + UI state
- `adapter.js` → cross-platform lifecycle + clickout + hooks

---

## Code Templates

### Complete Universal Adapter Block

```javascript
// ==========================================
// UNIVERSAL PLAYABLE ADAPTER v2
// Supports: Vungle, AppLovin, Unity, Google,
// Mintegral, Moloco, ironSource, Facebook
// ==========================================

window.clickTag = window.clickTag || 'https://example.com';
window.clickTag1 = window.clickTag1 || window.clickTag;

let mraidReady = false;
let gameStarted = false;
let gameClosed = false;
let gamePaused = false;
let sessionStarted = false;

let audioUnlocked = false;
let audioWasPlaying = false;
let bgMusicRef = null;

function initPlayable() {
    initMRAID();
    setupLifecycle();
    setupAudioUnlock();
}

function initMRAID() {
    if (!window.mraid) return;

    if (mraid.getState() === 'ready') {
        mraidReady = true;
    } else {
        mraid.addEventListener('ready', () => {
            mraidReady = true;
        });
    }

    mraid.addEventListener('viewableChange', (viewable) => {
        viewable ? resumeGame() : pauseGame();
    });
}

function openClickout(url) {
    const target = url || window.clickTag1 || window.clickTag;

    markGameClosed();

    if (window.mraid && typeof mraid.open === 'function') {
        mraid.open(target);
        return;
    }

    if (typeof window.install === 'function') {
        window.install();
        return;
    }

    const win = window.open(target, '_blank');
    if (!win || win.closed) {
        window.location.href = target;
    }
}

window.gameStart = window.gameStart || function () {};
window.gameClose = window.gameClose || function () {};

function markGameStarted() {
    if (gameStarted) return;
    gameStarted = true;
    window.gameStart();
}

function markGameClosed() {
    if (gameClosed) return;
    gameClosed = true;
    window.gameClose();
}

function setupAudioUnlock() {
    function unlock() {
        if (audioUnlocked) return;
        audioUnlocked = true;

        if (bgMusicRef) {
            bgMusicRef.play().catch(() => {});
        }
    }

    document.addEventListener('pointerdown', unlock, { once: true });
    document.addEventListener('click', unlock, { once: true });
}

function setupLifecycle() {
    document.addEventListener('visibilitychange', () => {
        document.hidden ? pauseGame() : resumeGame();
    });

    window.addEventListener('blur', pauseGame);
    window.addEventListener('focus', resumeGame);
    window.addEventListener('pagehide', markGameClosed);
}

function pauseGame() {
    if (gamePaused) return;
    gamePaused = true;

    if (bgMusicRef && !bgMusicRef.paused) {
        audioWasPlaying = true;
        bgMusicRef.pause();
    }

    window.onGamePause && window.onGamePause();
}

function resumeGame() {
    if (!gamePaused || !sessionStarted) return;
    gamePaused = false;

    if (bgMusicRef && audioWasPlaying) {
        bgMusicRef.play().catch(() => {});
    }

    audioWasPlaying = false;

    window.onGameResume && window.onGameResume();
}

function markSessionStarted() {
    sessionStarted = true;
}

function showEndCard() {
    document.getElementById('endScreen')?.classList.add('active');
}

window.onerror = function () {
    showEndCard();
    markGameClosed();
    return true;
};

window.addEventListener('unhandledrejection', () => {
    showEndCard();
    markGameClosed();
});

window.PlayableAdapter = {
    init: initPlayable,
    openClickout,
    setBgMusic: (audio) => (bgMusicRef = audio),
    startSession: markSessionStarted,
    startGame: markGameStarted
};
```

---

## Required Output Format for Claude Code

When asked to update a playable ad, return:

1. Short summary of changes
2. Full updated code or exact patch
3. Checklist of preserved requirements
4. Any risks, assumptions, or unknowns

---

## Responsive Scaling (320px–500px+)

### CSS Custom Properties Pattern

Use CSS variables for scalable UI elements:

```css
:root {
    --circle-size: 260px;
    --container-size: 280px;
    --tile-width: 50px;
    --tile-height: 70px;
    --tile-radius: 90px;
}

@media (min-width: 360px) {
    :root {
        --circle-size: 280px;
        --container-size: 300px;
        --tile-width: 54px;
        --tile-height: 76px;
        --tile-radius: 100px;
    }
}

@media (min-width: 400px) {
    :root {
        --circle-size: 300px;
        --container-size: 320px;
        --tile-width: 58px;
        --tile-height: 82px;
        --tile-radius: 110px;
    }
}
```

### Dynamic JavaScript Reading

When positioning elements dynamically, read CSS variables at runtime:

```javascript
var styles = getComputedStyle(document.documentElement);
var containerSize = parseFloat(styles.getPropertyValue('--container-size')) || 280;
var tileWidth = parseFloat(styles.getPropertyValue('--tile-width')) || 50;
var centerX = (containerSize / 2) - (tileWidth / 2);
```

**Important**: Never hardcode pixel values for positioned elements. Always derive from CSS variables.

---

## Seamless Audio Looping

### Problem

Using `audio.loop = true` causes audible stutter/gap when the track restarts.

### Solution: Dual-Audio Crossfade

```javascript
var bgMusic1 = null;
var bgMusic2 = null;
var activeBgMusic = null;
var musicPlaying = false;
var targetMusicVolume = 0.3;
var crossfadeDuration = 1.5; // seconds

function startBackgroundMusic() {
    if (musicPlaying) return;
    musicPlaying = true;

    bgMusic1 = new Audio(SOUND_MUSIC);
    bgMusic2 = new Audio(SOUND_MUSIC);
    bgMusic1.volume = 0;
    bgMusic2.volume = 0;
    activeBgMusic = bgMusic1;

    setupCrossfade(bgMusic1, bgMusic2);
    setupCrossfade(bgMusic2, bgMusic1);

    bgMusic1.play().then(function() {
        // Fade in over 2 seconds
        var fadeInDuration = 2000;
        var fadeInterval = 50;
        var steps = fadeInDuration / fadeInterval;
        var step = targetMusicVolume / steps;
        var fadeIn = setInterval(function() {
            if (bgMusic1.volume < targetMusicVolume - step) {
                bgMusic1.volume += step;
            } else {
                bgMusic1.volume = targetMusicVolume;
                clearInterval(fadeIn);
            }
        }, fadeInterval);
    }).catch(function() {});
}

function setupCrossfade(current, next) {
    current.addEventListener('timeupdate', function() {
        if (!musicPlaying) return;
        var timeLeft = current.duration - current.currentTime;
        if (timeLeft <= crossfadeDuration && timeLeft > 0 && next.paused) {
            next.currentTime = 0;
            next.volume = 0;
            next.play().catch(function() {});
            activeBgMusic = next;
            // Crossfade logic here
        }
    });
}
```

---

## Text Styling Best Practices

### Animated Text Outline

**Do NOT use multiple text-shadows** for outlines—causes clipping and layering artifacts.

**Use `-webkit-text-stroke` with `paint-order`**:

```css
.outlined-text {
    color: #ffffff;
    -webkit-text-stroke: 2px #979EE7;
    paint-order: stroke fill; /* Stroke renders behind fill */
    text-shadow: 0 0 15px rgba(151, 158, 231, 0.8); /* Glow only */
}

@keyframes gradient-outline {
    0%, 100% {
        -webkit-text-stroke: 2px #979EE7;
        text-shadow: 0 0 15px rgba(151, 158, 231, 0.8);
    }
    50% {
        -webkit-text-stroke: 2px #DD8FC7;
        text-shadow: 0 0 15px rgba(221, 143, 199, 0.8);
    }
}
```

**Key points**:
- `paint-order: stroke fill` prevents stroke from eating into letter shapes
- Use `text-shadow` only for glow effects, not outlines
- Add padding to text containers to prevent outline clipping

---

## Error Fallback Best Practices

### Show Actual CTA on Error

Never reference a non-existent `endScreen` element. Always show real clickable CTA:

```javascript
function showErrorEndCard() {
    // Hide game elements
    var gameElements = document.querySelectorAll('.game-element');
    gameElements.forEach(function(el) { el.style.display = 'none'; });

    // Show CTA - use existing elements
    var header = document.querySelector('.header');
    if (header) header.classList.add('center-logo');
    var ctaBtn = document.getElementById('playNowBtn');
    if (ctaBtn) ctaBtn.classList.add('show');

    trackAnalytics('ENDCARD_SHOWN');
}

window.onerror = function() {
    showErrorEndCard();
    markGameClosed();
    return true;
};
```

**Rule**: Error fallback must display a working CTA button, never a blank screen.

---

## Final Rule

Do not optimize for one platform by silently breaking another.

The correct result is a **universal, review-safe playable ad bundle**.

---

*Document Version: 2.1*
*Last Updated: 2026-03-22*
