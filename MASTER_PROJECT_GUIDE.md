# 🏛️ MASTER PROJECT GUIDE: AI Gesture Control System

This document is the **Comprehensive Source of Truth** for the AI-Powered Smart Home Gesture Control system. It is designed for developers, examiners, and researchers to understand, modify, and extend 100% of the project.

---

## 1. Project Blueprint
### Vision
To provide a contactless, low-latency assistive technology for individuals with limited mobility (e.g., bedridden patients), allowing them to control their environment (lights, fans) using intuitive hand gestures.

### The Tech Stack (4-Layer Architecture)
1.  **Client-Side (User Interface)**: Vanilla JS, HTML5, CSS3 + **Google MediaPipe** (Tracking).
2.  **App Server (Security Bridge)**: **Node.js & Express** (Authentication & API Proxy).
3.  **AI Microservice (The Brain)**: **Python & Flask** + **TensorFlow/Keras** (CNN Inference).
4.  **Cloud Database (Storage)**: **Supabase** (PostgreSQL) for Auth and Real-time logging.

---

## 2. Code Anatomy (Detailed Walkthrough)

### 🛰️ Layer 1: The Eyes (web_app/public/app.js)
This file handles the camera stream and hand detection.
-   **Landmark Tracking**: Uses MediaPipe to detect 21 coordinates on the hand.
-   **Square-Crop Logic**:
    - Calculates the bounding box of the hand.
    - Expands it to a square to maintain aspect ratio for the AI.
    - Crops the canvas and sends only the cropped hand image (Base64) to the server.
-   **State Polling**: Periodically fetches logs from `/logs` to update the "Recent Activity" list.

### 🛡️ Layer 2: The Bridge (web_app/server.js)
This is the security gateway.
-   **Authentication**: Uses Supabase Auth for login/signup.
-   **AI Proxy (`/predict`)**: Instead of the browser talking to the AI server directly, it sends the image to Node.js, which then uses `axios` to talk to Flask. This hides the AI server's IP and allows for future security checks.
-   **Database Logging (`/log-state`)**: Records every successful gesture into the `device_states` table.

### 🧠 Layer 3: The Brain (backend/app_server.py)
This is where the actual AI lives.
-   **Model**: Uses a **MobileNetV2** (Transfer Learning) model trained on `fist` and `palm` gestures.
-   **Preprocessing**: Resizes the image to 128x128, normalizes pixels to [0,1].
-   **Confidence Threshold (0.82)**: If the model is less than 82% sure, it ignores the gesture.
-   **Cooldown Logic (2 seconds)**: Prevents "flickering" (e.g., the light turning ON and OFF 10 times in 1 second).

---

## 3. The Data Journey (Webcam to Cloud)
1.  **Webcam** captures frame.
2.  **MediaPipe** (in browser) finds hand landmarks.
3.  **Canvas** crops hand $\rightarrow$ sends to **Node.js** `/predict`.
4.  **Node.js** proxies to **Flask** `/predict`.
5.  **Flask** runs CNN $\rightarrow$ returns "Palm" or "Fist" (only if confidence > 0.82).
6.  **Node.js** receives result $\rightarrow$ calls **Supabase** to log action.
7.  **Database** triggers UI update.

---

## 4. Developer's Modification Playbook
Use this section to alter or extend the project.

### How to change the Confidence Sensitivity
-   **File**: `backend/app_server.py`
-   **Line**: Around line 82 (`if confidence < 0.82:`)
-   **Change**: Lower it (e.g., 0.70) for easier triggering, or raise it (0.90) for higher accuracy.

### How to change the Cooldown Timer
-   **File**: `backend/app_server.py`
-   **Line**: Around line 40 (`COOLDOWN = 2`)
-   **Change**: Set to 1 for faster clicking, or 5 for more deliberate actions.

### How to add a Third Gesture (e.g., "Thumbs Up")
1.  **Data**: Add a new folder `thumbs_up` to your training dataset.
2.  **Train**: Update `ml/train_model.py` to include the new class and re-run training.
3.  **Update Logic**:
    - In `backend/app_server.py`, add "thumbs\_up" to the `classes = [...]` list.
    - Inside `predict_gesture()`, add an `elif gesture == "thumbs_up":` block to define what happens (e.g., `command = {"device": "AC", "state": "ON"}`).

---

## 5. The Examiner's Q&A (Technical Defense)

**Q: Why use a Decoupled Architecture (Node + Flask)?**
A: **Security and Scalability.** Node.js handles high-concurrency web traffic and authentication, while Flask handles heavy computation (TensorFlow). Isolating them prevents an AI crash from taking down the entire website.

**Q: Why MobileNetV2 instead of a larger model like ResNet?**
A: **Inference Speed.** MobileNetV2 is optimized for mobile and edge devices. It provides high accuracy (>90%) while being fast enough to respond in under 500ms.

**Q: Why use MediaPipe in the browser instead of the server?**
A: **Latency.** Processing the video stream on the server would require sending 30 frames per second over the internet. By doing detection in the browser, we only send an image when a hand is actually present, saving bandwidth and reducing lag.

**Q: How does the system handle different lighting?**
A: **Data Augmentation.** During training (`ml/train_model.py`), we used a "Brightness Jitter" of 0.8 to 1.2. This teaches the model to recognize the hand skin features even if the room is dim or very bright.

---

## 6. Installation Summary
1.  **Database**: Run `supabase_setup.sql` in Supabase SQL editor.
2.  **Backend**: `cd backend && python app_server.py`
3.  **Web App**: `cd web_app && npm install && npm start`
4.  **Login**: Visit `http://localhost:3000` and create an account.
