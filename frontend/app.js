const SERVER_URL = "http://127.0.0.1:5000/predict";

let isPredicting = false;

const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');

const cropCanvas = document.getElementById('crop_canvas');
const cropCtx = cropCanvas.getContext('2d');

const feedbackText = document.getElementById("feedbackText");

// mirror the camera so it feels natural
videoElement.style.transform = "scaleX(-1)";
canvasElement.style.transform = "scaleX(-1)";


// --- voting buffer ---
// instead of acting on every single prediction, we collect the last few
// and only trigger when they agree. cuts down on flickery misclassifications.
const VOTE_BUFFER_SIZE = 3;
let voteBuffer = [];


// --- hand detection callback ---

function onResults(results) {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        feedbackText.innerText = "Hand found, classifying...";
        feedbackText.style.color = "#38bdf8";

        const landmarks = results.multiHandLandmarks[0];

        // draw the skeleton overlay
        drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {color: '#0ea5e9', lineWidth: 3});
        drawLandmarks(canvasCtx, landmarks, {color: '#38bdf8', lineWidth: 2});

        // figure out the bounding box from the landmarks
        let xMin = canvasElement.width, yMin = canvasElement.height;
        let xMax = 0, yMax = 0;

        landmarks.forEach(lm => {
            const x = Math.floor(lm.x * canvasElement.width);
            const y = Math.floor(lm.y * canvasElement.height);
            xMin = Math.min(xMin, x);
            yMin = Math.min(yMin, y);
            xMax = Math.max(xMax, x);
            yMax = Math.max(yMax, y);
        });

        // Instead of a tight dynamic bounding box which changes scale,
        // we anchor the crop size to the physical distance between Wrist (0) and Middle Finger MCP (9).
        // This ensures a fist appears physically smaller than an open palm in the final 128x128 image,
        // exactly matching the relative scale found in the Rock-Paper-Scissors training dataset.
        const wrist = landmarks[0];
        const mcp = landmarks[9];
        const dx = (wrist.x - mcp.x) * canvasElement.width;
        const dy = (wrist.y - mcp.y) * canvasElement.height;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        let centerX = xMin + (xMax - xMin) / 2;
        let centerY = yMin + (yMax - yMin) / 2;

        let size = Math.floor(dist * 4.8); // 4.8x the bone length comfortably fits an open grown palm
        
        xMin = Math.max(0, Math.floor(centerX - size / 2));
        yMin = Math.max(0, Math.floor(centerY - size / 2));
        // Force square aspect ratio by defining xMax and yMax purely from xMin/yMin + size
        // If it clips off-screen, sendCropToServer will handle it natively via canvas drawing
        xMax = Math.min(canvasElement.width, xMin + size);
        yMax = Math.min(canvasElement.height, yMin + size);

        // draw the crop rectangle
        canvasCtx.strokeStyle = "#22c55e";
        canvasCtx.lineWidth = 3;
        canvasCtx.strokeRect(xMin, yMin, xMax - xMin, yMax - yMin);

        // send the crop to the backend for classification
        if (!isPredicting && (xMax > xMin) && (yMax > yMin)) {
            sendCropToServer(results.image, xMin, yMin, size, size);
        }
    } else {
        feedbackText.innerText = "Waiting for hand...";
        feedbackText.style.color = "#94a3b8";

        // no hand visible, clear the vote buffer
        voteBuffer = [];
    }

    canvasCtx.restore();
}


// --- send cropped hand to flask ---

async function sendCropToServer(imageSource, x, y, width, height) {
    isPredicting = true;

    // crop just the hand region
    cropCanvas.width = width;
    cropCanvas.height = height;
    cropCtx.drawImage(imageSource, x, y, width, height, 0, 0, width, height);

    const base64Image = cropCanvas.toDataURL("image/jpeg", 0.95);

    try {
        const response = await fetch(SERVER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64Image })
        });

        const data = await response.json();

        if (data.status === "triggered" || data.status === "ignored") {
            // Buffer the predicted gesture regardless of whether it triggered or was ignored
            if (data.gesture) {
                voteBuffer.push(data.gesture);
                if (voteBuffer.length > VOTE_BUFFER_SIZE) voteBuffer.shift();
            }

            // Check for 3 consistent frames of the same gesture
            const allMatch = voteBuffer.length === VOTE_BUFFER_SIZE && voteBuffer.every(v => v === data.gesture);

            if (data.status === "triggered" && allMatch) {
                feedbackText.innerText = data.action;
                feedbackText.style.color = "#22c55e";
                updateUI("Light", data.light);
                updateUI("Fan", data.fan);
                voteBuffer = []; // Reset after successful action to require fresh stability for next toggle
            } else if (data.status === "ignored") {
                if (data.reason.includes("Low confidence")) {
                    feedbackText.innerText = "Hold still...";
                    feedbackText.style.color = "#f59e0b";
                } else if (data.reason.includes("Cooldown")) {
                    feedbackText.innerText = "Cooldown active...";
                }
                updateUI("Light", data.light);
                updateUI("Fan", data.fan);
            }
        }

    } catch (e) {
        feedbackText.innerText = "Can't reach server";
        feedbackText.style.color = "#ef4444";
        console.error("Server connection failed:", e);
    }

    // throttle — wait a bit before the next prediction
    setTimeout(() => { isPredicting = false; }, 350);
}


// --- update the device cards ---

function updateUI(device, state) {
    const statusEl = document.getElementById(device + "Status");
    const card = document.getElementById(device + "Card");
    const icon = document.getElementById(device + "Icon");

    if (!statusEl || !card) return;

    statusEl.innerText = state;

    if (state === "ON") {
        statusEl.style.color = "#22c55e";
        card.classList.add("active");
        if (device === "Fan" && icon) icon.classList.add("fan-spin");
    } else {
        statusEl.style.color = "#ef4444";
        card.classList.remove("active");
        if (device === "Fan" && icon) icon.classList.remove("fan-spin");
    }
}


// --- manual override (direct to supabase) ---

async function sendCommand(device, state) {
    updateUI(device, state);
    const SUPABASE_URL = "https://eqbxbedijrimscgwyvaj.supabase.co";
    const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxYnhiZWRpanJpbXNjZ3d5dmFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1OTkxNDQsImV4cCI6MjA5MDE3NTE0NH0.ObCSZjd3ujOBjaUw7u7y7Kmgzv96kmqCPr1GrZWZBbs";

    try {
        await fetch(`${SUPABASE_URL}/rest/v1/device_states`, {
            method: "POST",
            headers: {
                "apikey": SUPABASE_KEY,
                "Authorization": `Bearer ${SUPABASE_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ device: device, state: state })
        });
    } catch(e) { console.error(e); }
}


// --- init mediapipe and start the camera ---

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
    width: 320,
    height: 240
});

feedbackText.innerText = "Starting camera...";
camera.start();
