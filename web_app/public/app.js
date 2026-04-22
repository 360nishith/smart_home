// --- Configuration ---
const PREDICT_URL = "/predict";
const LOG_URL = "/log-state";

let isPredicting = false;
const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');
const cropCanvas = document.getElementById('crop_canvas');
const cropCtx = cropCanvas.getContext('2d');
const feedbackText = document.getElementById("feedbackText");

// Mirror the camera
videoElement.style.transform = "scaleX(-1)";
canvasElement.style.transform = "scaleX(-1)";

// --- Voting & Stability ---
const VOTE_BUFFER_SIZE = 3;
let voteBuffer = [];

// --- Hand Detection Callback ---
function onResults(results) {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        feedbackText.innerText = "Hand detected. Classifying...";
        feedbackText.style.color = "#38bdf8";

        const landmarks = results.multiHandLandmarks[0];

        // Draw skeleton overlay
        drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {color: '#0ea5e9', lineWidth: 3});
        drawLandmarks(canvasCtx, landmarks, {color: '#38bdf8', lineWidth: 1});

        // Bounding box calculation
        let xMin = canvasElement.width, yMin = canvasElement.height;
        let xMax = 0, yMax = 0;
        landmarks.forEach(lm => {
            const x = Math.floor(lm.x * canvasElement.width);
            const y = Math.floor(lm.y * canvasElement.height);
            xMin = Math.min(xMin, x); yMin = Math.min(yMin, y);
            xMax = Math.max(xMax, x); yMax = Math.max(yMax, y);
        });

        const wrist = landmarks[0];
        const mcp = landmarks[9];
        const dx = (wrist.x - mcp.x) * canvasElement.width;
        const dy = (wrist.y - mcp.y) * canvasElement.height;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        let centerX = xMin + (xMax - xMin) / 2;
        let centerY = yMin + (yMax - yMin) / 2;
        let size = Math.floor(dist * 4.8); 
        
        xMin = Math.max(0, Math.floor(centerX - size / 2));
        yMin = Math.max(0, Math.floor(centerY - size / 2));
        xMax = Math.min(canvasElement.width, xMin + size);
        yMax = Math.min(canvasElement.height, yMin + size);

        // Draw crop box
        canvasCtx.strokeStyle = "#22c55e";
        canvasCtx.lineWidth = 2;
        canvasCtx.strokeRect(xMin, yMin, xMax - xMin, yMax - yMin);

        // Send to server
        if (!isPredicting && (xMax > xMin)) {
            sendCropToServer(results.image, xMin, yMin, size, size);
        }
    } else {
        feedbackText.innerText = "Waiting for hand gesture...";
        feedbackText.style.color = "#94a3b8";
        voteBuffer = [];
    }
    canvasCtx.restore();
}

async function sendCropToServer(imageSource, x, y, width, height) {
    isPredicting = true;

    cropCanvas.width = width;
    cropCanvas.height = height;
    cropCtx.drawImage(imageSource, x, y, width, height, 0, 0, width, height);

    const base64Image = cropCanvas.toDataURL("image/jpeg", 0.9);

    try {
        const response = await fetch(PREDICT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64Image })
        });

        const data = await response.json();

        if (data.status === "triggered" || data.status === "ignored") {
            if (data.gesture) {
                voteBuffer.push(data.gesture);
                if (voteBuffer.length > VOTE_BUFFER_SIZE) voteBuffer.shift();
            }

            const allMatch = voteBuffer.length === VOTE_BUFFER_SIZE && voteBuffer.every(v => v === data.gesture);

            if (data.status === "triggered" && allMatch) {
                feedbackText.innerText = data.action;
                feedbackText.style.color = "#22c55e";
                updateUI("Light", data.light);
                updateUI("Fan", data.fan);
                
                // LOG TO DB via Node Server
                logToDatabase(data.action.includes("Light") ? "Light" : "Fan", 
                             data.action.includes("ON") ? "ON" : "OFF");

                voteBuffer = []; 
            } else if (data.status === "ignored") {
                if (data.reason.includes("Low confidence")) {
                    feedbackText.innerText = "Hold steady...";
                    feedbackText.style.color = "#f59e0b";
                }
                updateUI("Light", data.light);
                updateUI("Fan", data.fan);
            }
        }
    } catch (e) {
        feedbackText.innerText = "AI Server Offline";
        feedbackText.style.color = "#ef4444";
    }

    setTimeout(() => { isPredicting = false; }, 400);
}

function updateUI(device, state) {
    const statusEl = document.getElementById(device + "Status");
    const card = document.getElementById(device + "Card");
    const icon = document.getElementById(device + "Icon");

    if (!statusEl || !card) return;
    statusEl.innerText = state;

    if (state === "ON") {
        statusEl.style.color = "#22c55e";
        card.classList.add("active");
        if (device === "Fan") icon.classList.add("fan-spin");
    } else {
        statusEl.style.color = "#ef4444";
        card.classList.remove("active");
        if (device === "Fan") icon.classList.remove("fan-spin");
    }
}

async function logToDatabase(device, state) {
    const userEmail = localStorage.getItem('user_email') || 'anonymous';
    try {
        await fetch(LOG_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ device, state, user_email: userEmail })
        });
        fetchLogs(); // refresh list after logging new action
    } catch (e) { console.error("Logging failed:", e); }
}

async function fetchLogs() {
    const logList = document.getElementById('logList');
    if (!logList) return;

    try {
        const response = await fetch('/logs');
        const data = await response.json();
        
        logList.innerHTML = '';
        if (data.length === 0) {
            logList.innerHTML = '<div style="color: var(--text-muted); text-align: center;">No activity yet.</div>';
            return;
        }

        data.forEach(log => {
            const date = new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const item = document.createElement('div');
            item.style.display = 'flex';
            item.style.justifyContent = 'space-between';
            item.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
            item.style.paddingBottom = '0.4rem';
            
            const color = log.state === "ON" ? "#22c55e" : "#ef4444";
            
            item.innerHTML = `
                <span style="color: var(--text-muted);">${date}</span>
                <span>${log.device} turned <b style="color: ${color}">${log.state}</b></span>
            `;
            logList.appendChild(item);
        });
    } catch (e) {
        logList.innerHTML = '<div style="color: #ef4444; text-align: center;">Failed to load logs.</div>';
    }
}
fetchLogs(); // Initial load

// --- Init MediaPipe ---
const hands = new Hands({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
}});

hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7
});

hands.onResults(onResults);

const camera = new Camera(videoElement, {
    onFrame: async () => {
        canvasElement.width = videoElement.videoWidth;
        canvasElement.height = videoElement.videoHeight;
        await hands.send({image: videoElement});
    },
    width: 640,
    height: 480
});

feedbackText.innerText = "Starting engine...";
camera.start();
