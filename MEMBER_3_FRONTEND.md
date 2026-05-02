# 🎨 Member 3 — Frontend Developer Guide
## GestureLink Smart Home | HTML + CSS + JavaScript + MediaPipe

---

> **Your Role:** You are the face of this project. Every pixel the user sees, every animation, every button click, every webcam frame — that's your code. You own the complete browser experience: the login page, the live dashboard, the gesture detection engine, and the activity log display.

---

## 📦 Your Files

| File | Location | What It Is |
|------|----------|-----------|
| `login.html` | `frontend/login.html` | Login and signup page |
| `index.html` | `frontend/index.html` | Main dashboard after login |
| `app.js` | `frontend/app.js` | All JavaScript logic: webcam, AI, UI updates |

These 3 files are the **entire frontend**. No framework, no build step, no npm. Pure HTML + CSS + JavaScript.

---

## 🧠 Your Responsibility in the System

```
WEBCAM → MediaPipe → YOUR app.js → fetch("/predict") → Node.js → Python AI
                                                                        │
                                          UI updates ◄── response flows back
                                          Device cards glow
                                          Confidence bar updates
                                          Activity log refreshes
```

- The user **only sees your code** — the backend is invisible to them
- All your API calls use relative paths (`/predict`, `/logs`) — they go to Node.js
- You never talk to Supabase or Python directly — always through Node.js

---

## 📄 File 1: `frontend/login.html` — The Login/Signup Page

### What the user sees

A **two-panel layout**:
- **Left panel** (hero): Project name, tagline, and 4 feature pill cards describing the system
- **Right panel** (auth form): Email + password form that toggles between Login and Sign Up

### The color palette (CSS variables)

```css
:root {
    --bg: #060b18;                          /* Very dark navy background */
    --card: rgba(15, 23, 42, 0.75);         /* Semi-transparent card bg */
    --primary: #38bdf8;                     /* Sky blue — main accent */
    --primary-hover: #0ea5e9;               /* Darker blue for hover states */
    --secondary: #818cf8;                   /* Purple — secondary accent */
    --success: #22c55e;                     /* Green — success messages */
    --error: #ef4444;                       /* Red — error messages */
    --text: #f1f5f9;                        /* Near-white text */
    --text-muted: #94a3b8;                  /* Muted grey text */
    --border: rgba(255, 255, 255, 0.08);    /* Subtle white border */
}
```

These variables are used throughout both `login.html` and `index.html`. Changing one variable updates the color everywhere.

### Layout structure

```html
<body>                          <!-- grid: 1fr 1fr (two equal columns) -->
  <aside class="hero-panel">    <!-- LEFT: gradient bg, project description -->
    <div class="hero-logo">...</div>
    <h1 class="hero-title">Control Your Home<br>With a Gesture</h1>
    <p class="hero-subtitle">...</p>
    <div class="feature-pills">  <!-- 4 pill cards -->
      <div class="pill">🖐️ Real-time hand gesture detection</div>
      ...
    </div>
  </aside>

  <main class="auth-panel">     <!-- RIGHT: dark bg, auth form -->
    <div class="auth-card">
      <form id="authForm">
        <input type="email" id="email">
        <input type="password" id="password">
        <button id="authBtn">Log In</button>
      </form>
      <div id="messageBox">...</div>   <!-- success/error feedback -->
      <p id="toggleText">Don't have an account? <a>Sign Up</a></p>
    </div>
  </main>
</body>
```

### Key animations

```css
/* Pulsing dot in the logo */
@keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%       { opacity: 0.5; transform: scale(0.8); }
}

/* Auth card slides up when page loads */
@keyframes fadeUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
}

/* Button hover lifts up and glows */
.btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 24px -8px rgba(56, 189, 248, 0.4);
}
```

### The JavaScript — Auth logic (inside `<script>` at bottom of login.html)

#### Auto-redirect if already logged in

```javascript
const existingSession = localStorage.getItem('sb_session');
if (existingSession) {
    try {
        JSON.parse(existingSession);
        window.location.href = '/';   // Already logged in → go to dashboard
    } catch(e) {
        localStorage.removeItem('sb_session');  // Corrupted session → clear it
    }
}
```

This runs the moment the page loads. If a valid session exists in `localStorage`, the user is skipped straight to the dashboard. This is the **auth guard** on the login page (the inverse guard is in `index.html`).

#### Toggle between Login and Sign Up mode

```javascript
let isLoginMode = true;

function toggleMode() {
    isLoginMode = !isLoginMode;
    authTitle.textContent    = isLoginMode ? 'Welcome Back'    : 'Create Account';
    authBtn.textContent      = isLoginMode ? 'Log In'          : 'Sign Up';
    toggleLink.textContent   = isLoginMode ? 'Sign Up'         : 'Log In';
    // ...updates subtitle and toggle text too
}
toggleLink.addEventListener('click', toggleMode);
```

One form handles both Login and Sign Up. The only difference is which API endpoint is called and what the button/titles say. No page reload needed.

#### The form submit handler

```javascript
document.getElementById('authForm').addEventListener('submit', async () => {
    const email    = emailInput.value.trim();
    const password = passwordInput.value;

    const endpoint = isLoginMode ? '/auth/login' : '/auth/signup';

    authBtn.disabled = true;
    authBtn.innerHTML = `<span class="spinner"></span>Logging in...`;

    const res  = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (res.ok) {
        if (isLoginMode) {
            localStorage.setItem('sb_session', JSON.stringify(data.session));
            localStorage.setItem('user_email', email);
            showMessage('✓ Login successful! Redirecting...', 'success');
            setTimeout(() => window.location.href = '/', 900);
        } else {
            showMessage('✓ Account created! You can now log in.', 'success');
            setTimeout(() => toggleMode(), 1800);
        }
    } else {
        showMessage(data.error || 'An error occurred.', 'error');
    }
});
```

**Step by step:**
1. Collect email and password from the inputs
2. Disable the button and show a loading spinner (prevents double-submit)
3. `fetch()` sends JSON to `/auth/login` or `/auth/signup` → goes to Node.js
4. On success (login):
   - Save the session JWT to `localStorage` as `'sb_session'`
   - Save the user's email as `'user_email'`
   - Wait 900ms (so user sees the success message) → redirect to dashboard
5. On success (signup): Show success → wait 1.8s → switch back to login mode
6. On error: Show the error from Node.js in the red message box

---

## 📄 File 2: `frontend/index.html` — The Dashboard

### Auth guard (runs immediately on page load)

```javascript
const session = JSON.parse(localStorage.getItem('sb_session') || 'null');
if (!session) window.location.href = '/login.html';
const userEmail = localStorage.getItem('user_email') || 'User';
```

If there's no session stored → kick to login page instantly. If there is a session → load the dashboard and show the user's email.

### Two-tab layout

The dashboard has two tabs: **Dashboard** and **About Project**. Tabs switch without a page reload using pure JavaScript class toggling.

```javascript
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(tabName + 'Tab').classList.add('active');
}
```

### Dashboard Tab — Key HTML Elements

```html
<!-- The webcam video (hidden — MediaPipe reads from it) -->
<video id="webcam" autoplay playsinline></video>

<!-- Drawn on top of webcam — skeleton + bounding box -->
<canvas id="output_canvas"></canvas>

<!-- Hidden — used to crop the hand region before sending to AI -->
<canvas id="crop_canvas" style="display:none"></canvas>

<!-- Prediction result card -->
<div id="predIcon">🤚</div>
<div id="predText">Starting AI engine...</div>
<div id="confBar"></div>    <!-- Colored confidence bar -->
<div id="confPct">—</div>   <!-- Percentage text -->

<!-- Device cards -->
<div id="LightCard" class="device-card">
    <span id="LightStatus">OFF</span>
</div>
<div id="FanCard" class="device-card">
    <span id="FanStatus">OFF</span>
    <div id="FanIcon">🌀</div>
</div>

<!-- Activity log -->
<div id="logList">...</div>
```

### Device card ON state (CSS)

```css
.device-card.on {
    border-color: rgba(56, 189, 248, 0.5);
    background: rgba(56, 189, 248, 0.08);
    box-shadow: 0 0 30px rgba(56, 189, 248, 0.1);
}

/* Fan spinning animation */
@keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
}
.spinning { animation: spin 1s linear infinite; }
```

When the light turns ON → the Light card glows blue. When the fan turns ON → the fan icon 🌀 starts spinning continuously.

---

## 📄 File 3: `frontend/app.js` — The Gesture Engine (Most Important File)

This JavaScript file is loaded by `index.html` and is responsible for:
1. Initializing MediaPipe hand detection
2. Processing each webcam frame
3. Sending cropped hand images to the AI server
4. Updating the UI based on responses
5. Logging actions to the database
6. Fetching and rendering the activity log

### Constants and DOM references

```javascript
const PREDICT_URL = "/predict";    // Goes to Node.js → Flask
const LOG_URL     = "/log-state";  // Goes to Node.js → Supabase insert
const LOGS_URL    = "/logs";       // Goes to Node.js → Supabase read

const videoEl    = document.getElementById('webcam');
const canvas     = document.getElementById('output_canvas');
const cropCanvas = document.getElementById('crop_canvas');
// ...prediction card elements...
```

### MediaPipe Initialization

```javascript
const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
    maxNumHands: 1,                  // Only track 1 hand
    modelComplexity: 1,              // 0=lite, 1=full (more accurate)
    minDetectionConfidence: 0.7,     // 70% sure a hand exists before tracking
    minTrackingConfidence: 0.7       // 70% sure hand is same as last frame
});

hands.onResults(onResults);   // Our callback called every frame
```

MediaPipe is a **Google library** loaded from a CDN (no installation needed). It runs **in the browser** — it never sends your webcam to a server. It finds 21 landmarks on your hand (fingertips, knuckles, wrist) and calls `onResults()` with their coordinates.

### Camera Initialization

```javascript
const camera = new Camera(videoEl, {
    onFrame: async () => {
        canvas.width  = videoEl.videoWidth;
        canvas.height = videoEl.videoHeight;
        await hands.send({ image: videoEl });   // Feed each frame to MediaPipe
    },
    width: 640,
    height: 480
});

camera.start().then(() => {
    aiStatus.textContent = 'AI Engine Active';
    fetchLogs();
});
```

`camera.start()` opens the webcam and continuously feeds frames to MediaPipe. On each frame, MediaPipe processes and calls `onResults()` automatically.

### `onResults(results)` — The Heart of the Frontend

This function runs **every single webcam frame** (roughly 30 times per second).

```javascript
function onResults(results) {
    // Match canvas size to video
    canvas.width  = videoEl.videoWidth;
    canvas.height = videoEl.videoHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(results.image, 0, 0);    // Draw the raw video frame

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];   // First detected hand

        // 1. Draw the hand skeleton
        drawConnectors(ctx, landmarks, HAND_CONNECTIONS, { color: '#0ea5e9', lineWidth: 2.5 });
        drawLandmarks(ctx, landmarks, { color: '#38bdf8', radius: 3 });

        // 2. Calculate bounding box around all 21 landmarks
        let xMin = canvas.width, yMin = canvas.height, xMax = 0, yMax = 0;
        landmarks.forEach(lm => {
            const x = lm.x * canvas.width;
            const y = lm.y * canvas.height;
            xMin = Math.min(xMin, x);  yMin = Math.min(yMin, y);
            xMax = Math.max(xMax, x);  yMax = Math.max(yMax, y);
        });

        // 3. Dynamic crop size based on wrist-to-MCP distance
        const wrist = landmarks[0], mcp = landmarks[9];
        const dx = (wrist.x - mcp.x) * canvas.width;
        const dy = (wrist.y - mcp.y) * canvas.height;
        const dist = Math.sqrt(dx*dx + dy*dy);
        let size = Math.floor(dist * 4.8);   // Scales with hand distance from camera

        const cx = xMin + (xMax - xMin) / 2;   // Center X of bounding box
        const cy = yMin + (yMax - yMin) / 2;   // Center Y
        const cropX = Math.max(0, Math.floor(cx - size/2));
        const cropY = Math.max(0, Math.floor(cy - size/2));
        const cropW = Math.min(canvas.width  - cropX, size);
        const cropH = Math.min(canvas.height - cropY, size);

        // 4. Draw the green crop box
        ctx.strokeStyle = '#22c55e';
        ctx.strokeRect(cropX, cropY, cropW, cropH);

        // 5. Send to AI (if not already waiting for a response)
        if (!isPredicting && cropW > 20 && cropH > 20) {
            sendCropToServer(results.image, cropX, cropY, cropW, cropH);
        }

        setPredText('Hand detected — classifying...', '🤚', null);
    } else {
        setPredText('Waiting for hand gesture...', '🤚', null);
        voteBuffer = [];  // Clear the vote buffer when hand disappears
    }
}
```

**Understanding the dynamic crop size:**
- `landmarks[0]` = wrist, `landmarks[9]` = middle finger MCP knuckle
- Distance between them scales with how close your hand is to the camera
- Multiplying by `4.8` gives a crop box that always covers the whole hand
- This is better than a fixed-size crop which would fail at different distances

### `sendCropToServer()` — Sending the Image to AI

```javascript
async function sendCropToServer(imgSrc, x, y, w, h) {
    isPredicting = true;   // Lock — prevents sending while waiting for response

    // Draw just the hand region onto the hidden crop canvas
    cropCanvas.width  = w;
    cropCanvas.height = h;
    cropCtx.drawImage(imgSrc, x, y, w, h, 0, 0, w, h);

    // Convert to Base64 JPEG string
    const base64 = cropCanvas.toDataURL('image/jpeg', 0.88);  // 88% quality

    try {
        const res  = await fetch(PREDICT_URL, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ image: base64 })
        });
        const data = await res.json();

        if (data.status === 'triggered' || data.status === 'ignored') {
            const gesture    = data.gesture || 'unknown';
            const confidence = data.confidence ?? null;

            // Push to vote buffer
            voteBuffer.push(gesture);
            if (voteBuffer.length > VOTE_SIZE) voteBuffer.shift();

            const allMatch = voteBuffer.length === VOTE_SIZE
                          && voteBuffer.every(v => v === gesture);

            if (data.status === 'triggered' && allMatch) {
                // ✅ Confirmed gesture → update UI + log to DB
                setPredText(`Gesture: ${capitalize(gesture)} → ${data.action}`,
                            GESTURE_ICONS[gesture], confidence);
                updateDeviceUI('Light', data.light);
                updateDeviceUI('Fan',   data.fan);
                logToDatabase(
                    data.action.includes('Light') ? 'Light' : 'Fan',
                    data.action.includes('ON')    ? 'ON'    : 'OFF'
                );
                voteBuffer = [];  // Reset after a successful trigger

            } else if (data.status === 'ignored') {
                // Show "hold steady" or "gesture detected" but don't trigger
                const hint = data.reason?.includes('Low confidence')
                    ? 'Hold steady...'
                    : 'Gesture detected...';
                setPredText(hint, GESTURE_ICONS[gesture], confidence);
                updateDeviceUI('Light', data.light);
                updateDeviceUI('Fan',   data.fan);
            }
        }
    } catch (e) {
        setPredText('AI Server Offline — is Flask running?', '⚠️', null);
    }

    setTimeout(() => { isPredicting = false; }, 380);  // Unlock after 380ms
}
```

**The 380ms lock:** After sending a request, `isPredicting` stays `true` for 380ms even if the response arrives faster. This throttles the request rate to ~2–3 per second instead of 30 per second (webcam frame rate). Otherwise you'd flood the server.

### The Vote Buffer — Preventing Accidental Triggers

```javascript
const VOTE_SIZE = 3;
let voteBuffer = [];

// Push gesture on each response
voteBuffer.push(gesture);
if (voteBuffer.length > VOTE_SIZE) voteBuffer.shift();  // Keep only last 3

// Only trigger if all 3 agree
const allMatch = voteBuffer.length === VOTE_SIZE
              && voteBuffer.every(v => v === gesture);
```

**Why?** The webcam runs at ~30fps. You could get a sequence like:
```
Frame 1: palm (blurry)
Frame 2: fist (you're transitioning)
Frame 3: palm
```
Without the buffer, frame 1 might trigger the light. With the buffer, you need 3 consecutive identical results. This acts as a **debounce** for gesture recognition.

### `setPredText()` — Updating the Prediction Card

```javascript
function setPredText(text, icon, confidence) {
    predText.textContent = text;
    predIcon.textContent = icon || '🤚';

    if (confidence !== null && confidence !== undefined) {
        const pct = Math.round(confidence * 100);
        confPct.textContent = pct + '%';
        confBar.style.width = pct + '%';
        confBar.style.background = pct >= 75
            ? 'linear-gradient(90deg, #38bdf8, #22c55e)'   // Green — high confidence
            : pct >= 50
                ? 'linear-gradient(90deg, #f59e0b, #38bdf8)'  // Yellow — medium
                : 'linear-gradient(90deg, #ef4444, #f59e0b)'; // Red — low
    } else {
        confPct.textContent = '—';
        confBar.style.width = '0%';
    }
}
```

The confidence bar **changes color** based on the AI's certainty:
- 🟢 ≥75% confidence → blue→green gradient
- 🟡 50–74% → yellow→blue gradient
- 🔴 <50% → red→yellow gradient

### `updateDeviceUI()` — Making Device Cards Respond

```javascript
function updateDeviceUI(device, state) {
    const statusEl = document.getElementById(device + 'Status');  // e.g. 'LightStatus'
    const card     = document.getElementById(device + 'Card');    // e.g. 'LightCard'
    const iconBox  = document.getElementById(device + 'Icon');    // e.g. 'FanIcon'
    if (!statusEl || !card) return;

    statusEl.textContent = state;  // "ON" or "OFF"

    if (state === 'ON') {
        statusEl.className = 'state on-state';    // Green text
        card.classList.add('on');                 // Glowing card border
        if (device === 'Fan') iconBox.classList.add('spinning');    // Spin animation
    } else {
        statusEl.className = 'state off-state';   // Red text
        card.classList.remove('on');              // Remove glow
        if (device === 'Fan') iconBox.classList.remove('spinning'); // Stop spinning
    }
}
```

### `logToDatabase()` — Recording to Supabase

```javascript
async function logToDatabase(device, state) {
    const userEmail = localStorage.getItem('user_email') || 'anonymous';
    try {
        await fetch(LOG_URL, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ device, state, user_email: userEmail })
        });
        fetchLogs();  // Refresh the activity log immediately after
    } catch (e) {
        console.error('Logging failed:', e);
    }
}
```

After a confirmed gesture trigger, you log it to the database and then immediately refresh the activity log — so the user sees their action appear in real time.

### `fetchLogs()` — Loading the Activity Log

```javascript
async function fetchLogs() {
    const logList = document.getElementById('logList');
    const res  = await fetch(LOGS_URL);   // GET /logs → Node.js → Supabase
    const data = await res.json();        // Array of up to 10 rows

    logList.innerHTML = '';
    data.forEach(log => {
        const time  = new Date(log.created_at).toLocaleTimeString([], {
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
        const icon  = log.device === 'Light' ? '💡' : '🌀';
        const color = log.state === 'ON' ? 'var(--secondary)' : 'var(--danger)';

        const item = document.createElement('div');
        item.className = 'log-item';
        item.innerHTML = `
            <span class="log-device-icon">${icon}</span>
            <span class="log-text"><b>${log.device}</b> turned
              <b style="color:${color}">${log.state}</b></span>
            <span class="log-time">${time}</span>
        `;
        logList.appendChild(item);
    });
}
```

---

## 🔗 How Your Code Connects to the Other Members

### You ↔ Member 1 (Backend/Node.js)

```
Your fetch("/predict", { image: base64 })
    → Member 1's Node.js /predict route
        → Member 2's Flask AI
        ← response
    ← response to you

Your fetch("/log-state", { device, state, user_email })
    → Member 1's Node.js /log-state route
        → Supabase insert
    ← { message: "Logged saved" }

Your fetch("/logs")
    → Member 1's Node.js /logs route
        → Supabase select
    ← Array of 10 rows
```

**Your API contract with Member 1:**

| You send | Endpoint | You receive |
|---------|---------|------------|
| `{ email, password }` | POST `/auth/login` | `{ session }` — save to localStorage |
| `{ image: base64 }` | POST `/predict` | `{ status, gesture, confidence, light, fan }` |
| `{ device, state, user_email }` | POST `/log-state` | `{ message }` |
| nothing | GET `/logs` | Array of log rows |

### You ↔ Member 2 (AI/Python)

- You **don't call Member 2 directly** — everything goes through Member 1
- But the **quality of your crop** affects AI accuracy:
  - The tighter the crop around the hand (not background), the better
  - The dynamic crop size algorithm in `onResults()` is critical for accuracy

---

## 🚀 How to Run Your Part

Your files are **automatically served** by Member 1's Node.js server. You don't run anything separately.

```bash
# You don't need to run anything yourself.
# Just open the browser after Member 1 and 2 have started their servers:
http://localhost:3000/login.html
```

For editing your files during development, just save and refresh the browser — no build step needed.

---

## 🧪 Quick Visual Testing Checklist

| Test | Expected Result |
|------|----------------|
| Open `http://localhost:3000/login.html` | Two-panel page loads, left side shows project info |
| Click "Sign Up" | Form title changes, button text changes (no page reload) |
| Enter wrong password | Red message box appears: "Invalid login credentials" |
| Log in successfully | Green "✓ Login successful!" → redirects to `/` |
| Dashboard loads | Webcam asks for permission, skeleton appears on hand |
| Show open palm | Green box appears around hand, confidence bar fills |
| Hold palm for 3+ frames | Light card glows, status shows "ON", activity log entry appears |
| Show fist | Fan card glows, fan icon 🌀 spins |
| Click logout | Session cleared, redirected to login |
| Refresh dashboard without login | Instantly redirected to `login.html` |

---

## 📋 Summary — Your Checklist

| Task | Notes |
|------|-------|
| Understand the color system | CSS variables in `:root` — change once, updates everywhere |
| Understand `onResults()` | This is the core — called every frame, does cropping |
| Understand the vote buffer | 3 consecutive frames needed → prevents false triggers |
| Understand `fetch()` calls | All relative paths — always go to Node.js (Member 1) |
| Edit responsively | Mobile breakpoint hides the hero panel at ≤768px |
| Test with real gestures | The crop box must tightly surround your hand |

---

*GestureLink Smart Home — Member 3: Frontend Developer*
