// ==========================================
//  SmartHome AI — Frontend Gesture Engine
//  Connects MediaPipe → Flask (via Node proxy) → UI + Supabase log
// ==========================================

const PREDICT_URL = "/predict";
const LOG_URL     = "/log-state";
const LOGS_URL    = "/logs";

// ---- DOM refs ----
const videoEl    = document.getElementById('webcam');
const canvas     = document.getElementById('output_canvas');
const ctx        = canvas.getContext('2d');
const cropCanvas = document.getElementById('crop_canvas');
const cropCtx    = cropCanvas.getContext('2d');

// ---- Prediction UI refs ----
const predIcon  = document.getElementById('predIcon');
const predText  = document.getElementById('predText');
const confBar   = document.getElementById('confBar');
const confPct   = document.getElementById('confPct');
const aiStatus  = document.getElementById('aiStatus');

// ---- State ----
let isPredicting = false;
const VOTE_SIZE  = 3;
let voteBuffer   = [];

// ---- Gesture icon map ----
const GESTURE_ICONS = { palm: '🖐️', fist: '✊', unknown: '🤚' };

// ==========================================
//  MediaPipe Hand Results Callback
// ==========================================
function onResults(results) {
    canvas.width  = videoEl.videoWidth;
    canvas.height = videoEl.videoHeight;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];

        // Draw skeleton
        drawConnectors(ctx, landmarks, HAND_CONNECTIONS, { color: '#0ea5e9', lineWidth: 2.5 });
        drawLandmarks(ctx, landmarks, { color: '#38bdf8', lineWidth: 1, radius: 3 });

        // Bounding box
        let xMin = canvas.width, yMin = canvas.height, xMax = 0, yMax = 0;
        landmarks.forEach(lm => {
            const x = lm.x * canvas.width, y = lm.y * canvas.height;
            xMin = Math.min(xMin, x); yMin = Math.min(yMin, y);
            xMax = Math.max(xMax, x); yMax = Math.max(yMax, y);
        });

        // Dynamic crop size based on wrist-to-MCP distance
        const wrist = landmarks[0], mcp = landmarks[9];
        const dx = (wrist.x - mcp.x) * canvas.width;
        const dy = (wrist.y - mcp.y) * canvas.height;
        const dist = Math.sqrt(dx * dx + dy * dy);
        let size = Math.floor(dist * 4.8);
        const cx = xMin + (xMax - xMin) / 2;
        const cy = yMin + (yMax - yMin) / 2;
        const cropX = Math.max(0, Math.floor(cx - size / 2));
        const cropY = Math.max(0, Math.floor(cy - size / 2));
        const cropW = Math.min(canvas.width  - cropX, size);
        const cropH = Math.min(canvas.height - cropY, size);

        // Green crop box
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.strokeRect(cropX, cropY, cropW, cropH);

        if (!isPredicting && cropW > 20 && cropH > 20) {
            sendCropToServer(results.image, cropX, cropY, cropW, cropH);
        }

        setPredText('Hand detected — classifying...', '🤚', null);

    } else {
        setPredText('Waiting for hand gesture...', '🤚', null);
        voteBuffer = [];
    }

    ctx.restore();
}

// ==========================================
//  Send cropped hand image to Flask via Node.js proxy
// ==========================================
async function sendCropToServer(imgSrc, x, y, w, h) {
    isPredicting = true;

    cropCanvas.width  = w;
    cropCanvas.height = h;
    cropCtx.drawImage(imgSrc, x, y, w, h, 0, 0, w, h);
    const base64 = cropCanvas.toDataURL('image/jpeg', 0.88);

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

            // Vote buffer for stability
            if (gesture) {
                voteBuffer.push(gesture);
                if (voteBuffer.length > VOTE_SIZE) voteBuffer.shift();
            }

            const allMatch = voteBuffer.length === VOTE_SIZE && voteBuffer.every(v => v === gesture);

            if (data.status === 'triggered' && allMatch) {
                setPredText(`Gesture: ${capitalize(gesture)} → ${data.action}`, GESTURE_ICONS[gesture] || '🤚', confidence);
                updateDeviceUI('Light', data.light);
                updateDeviceUI('Fan',   data.fan);
                logToDatabase(data.action.includes('Light') ? 'Light' : 'Fan',
                              data.action.includes('ON')    ? 'ON'    : 'OFF');
                voteBuffer = [];
            } else if (data.status === 'ignored') {
                const hint = (data.reason || '').includes('Low confidence') ? 'Hold steady...' : 'Gesture detected...';
                setPredText(hint, GESTURE_ICONS[gesture] || '🤚', confidence);
                updateDeviceUI('Light', data.light);
                updateDeviceUI('Fan',   data.fan);
            }
        }

    } catch (e) {
        setPredText('AI Server Offline — is Flask running?', '⚠️', null);
        aiStatus.textContent = 'AI Server Offline';
    }

    setTimeout(() => { isPredicting = false; }, 380);
}

// ==========================================
//  Update prediction result card
// ==========================================
function setPredText(text, icon, confidence) {
    predText.textContent = text;
    predIcon.textContent = icon || '🤚';

    if (confidence !== null && confidence !== undefined) {
        const pct = Math.round(confidence * 100);
        confPct.textContent   = pct + '%';
        confBar.style.width   = pct + '%';
        confBar.style.background = pct >= 75
            ? 'linear-gradient(90deg, #38bdf8, #22c55e)'
            : pct >= 50
                ? 'linear-gradient(90deg, #f59e0b, #38bdf8)'
                : 'linear-gradient(90deg, #ef4444, #f59e0b)';
    } else {
        confPct.textContent = '—';
        confBar.style.width = '0%';
    }
}

// ==========================================
//  Update device card UI
// ==========================================
function updateDeviceUI(device, state) {
    const statusEl = document.getElementById(device + 'Status');
    const card     = document.getElementById(device + 'Card');
    const iconBox  = document.getElementById(device + 'Icon');
    if (!statusEl || !card) return;

    statusEl.textContent = state;

    if (state === 'ON') {
        statusEl.className = 'state on-state';
        card.classList.add('on');
        if (device === 'Fan') iconBox.classList.add('spinning');
    } else {
        statusEl.className = 'state off-state';
        card.classList.remove('on');
        if (device === 'Fan') iconBox.classList.remove('spinning');
    }
}

// ==========================================
//  Log device state to Supabase via Node.js
// ==========================================
async function logToDatabase(device, state) {
    const userEmail = localStorage.getItem('user_email') || 'anonymous';
    try {
        await fetch(LOG_URL, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ device, state, user_email: userEmail })
        });
        fetchLogs();
    } catch (e) { console.error('Logging failed:', e); }
}

// ==========================================
//  Fetch + render recent activity logs from Supabase
// ==========================================
async function fetchLogs() {
    const logList = document.getElementById('logList');
    if (!logList) return;

    try {
        const res  = await fetch(LOGS_URL);
        const data = await res.json();

        if (!Array.isArray(data) || data.length === 0) {
            logList.innerHTML = '<div style="color:var(--text-muted);text-align:center;padding:1rem;font-size:0.85rem;">No activity yet.</div>';
            return;
        }

        logList.innerHTML = '';
        data.forEach(log => {
            const time  = new Date(log.created_at || log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const icon  = log.device === 'Light' ? '💡' : '🌀';
            const color = log.state === 'ON' ? 'var(--secondary)' : 'var(--danger)';

            const item = document.createElement('div');
            item.className = 'log-item';
            item.innerHTML = `
                <span class="log-device-icon">${icon}</span>
                <span class="log-text"><b>${log.device}</b> turned <b style="color:${color}">${log.state}</b></span>
                <span class="log-time">${time}</span>
            `;
            logList.appendChild(item);
        });

    } catch (e) {
        logList.innerHTML = '<div style="color:var(--danger);text-align:center;font-size:0.85rem;">Failed to load activity logs.</div>';
    }
}

// ==========================================
//  Helpers
// ==========================================
function capitalize(str) { return str ? str.charAt(0).toUpperCase() + str.slice(1) : ''; }

// ==========================================
//  MediaPipe + Camera Init
// ==========================================
const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7
});

hands.onResults(onResults);

const camera = new Camera(videoEl, {
    onFrame: async () => {
        canvas.width  = videoEl.videoWidth;
        canvas.height = videoEl.videoHeight;
        await hands.send({ image: videoEl });
    },
    width: 640,
    height: 480
});

// Startup
setPredText('Starting AI engine...', '🤚', null);
camera.start().then(() => {
    aiStatus.textContent = 'AI Engine Active';
    fetchLogs();
}).catch(err => {
    setPredText('Webcam access denied. Please allow camera permissions.', '⚠️', null);
    aiStatus.textContent = 'Camera Error';
});
