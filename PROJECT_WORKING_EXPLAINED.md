# GestureLink: Smart Home Gesture Control System
## Complete Project Working Guide

GestureLink is a next-generation smart home ecosystem that allows users to control household appliances (like lights and fans) using simple hand gestures. This document provides a full breakdown of how the system works, from a simple overview to deep technical details.

---

## 1. Non-Technical Overview (The "Big Picture")
Imagine walking into a room and simply showing your **Palm** to turn on the light or a **Fist** to toggle the fan. No switches, no remotes, no voice commands needed.

### How it feels to use:
1.  **Login**: You securely log in to your dashboard via the web app.
2.  **Vision**: Your webcam starts, acting as the "eyes" of your smart home.
3.  **Interaction**: You perform a gesture in front of the camera.
4.  **Reaction**: The system instantly recognizes the gesture and toggles the device, while logging the action to your personal cloud history.

---

## 2. Technical Architecture (The "Brain")
The project is built using a **Full-Stack Architecture**, combining modern web technologies with specialized machine learning services.

### The Technology Stack:
*   **Frontend**: HTML5 + CSS3 + JavaScript (ES6+) — lives in `frontend/`, served by the Node.js backend
*   **Backend**: Node.js + Express.js (The Orchestrator & Static File Server)
*   **AI Engine**: Python (Flask) + TensorFlow + OpenCV (The Recognition)
*   **Cloud/DB**: Supabase (Authentication & PostgreSQL Database)
*   **Vision SDK**: MediaPipe (Hand Landmark Detection, runs in-browser)

---

## 3. Step-by-Step Working Pipeline
Here is exactly what happens when you show a gesture:

### Phase A: Input & Tracking (Browser — Frontend)
1.  **Frame Capture**: The browser captures frames from your webcam using the MediaPipe Camera utility.
2.  **Hand Detection**: The **MediaPipe Hands** library processes each frame locally in the browser to find 21 hand landmarks.
3.  **Smart Cropping**: Instead of sending the whole frame, the app crops a tight square around your hand using bounding-box math. This saves bandwidth and boosts AI accuracy.
4.  **Data Transmission**: The cropped hand image (encoded as Base64 JPEG) is sent via `fetch()` to the Node.js backend at `/predict`.

### Phase B: Recognition (AI Engine)
5.  **Proxying**: The Node.js Express server receives the image and proxies it to the Python Flask AI service running locally.
6.  **Inference**: The Flask service runs the image through a **MobileNetV2 CNN** model (`saved_model.h5`):
    *   **Palm** → Trigger "Light" toggle
    *   **Fist** → Trigger "Fan" toggle
7.  **Stability Check**: A **3-frame Vote Buffer** prevents false triggers — the same gesture must be detected 3 consecutive times before an action fires.

### Phase C: Action & Logging (Backend & Database)
8.  **State Update**: If a gesture is confirmed, the system determines the new state (e.g., Light OFF → ON).
9.  **Cloud Logging**: The Node.js server calls the Supabase REST API to insert a row into the `device_states` table, recording the timestamp, device name, new state, and user email.
10. **Feedback**: The response flows back to the browser, which updates the Device Cards and the Prediction Result card (with gesture label and confidence score) dynamically — no page reload.

---

## 4. Key Components Deep Dive

### 📂 `backend/`
*   **`server.js`**: The main Express server. Serves all HTML/CSS/JS files from `frontend/` (one level up, via `../frontend`), and exposes API routes for auth, prediction proxying, and Supabase logging.
*   **`.env`**: Stores sensitive credentials — `SUPABASE_URL`, `SUPABASE_KEY`, `FLASK_SERVER_URL`, `PORT`.

### 📂 `frontend/` *(The entire frontend lives here)*
*   **`login.html`**: Two-panel login page — left panel describes the project, right panel has the email/password auth form (Login + Signup toggle). Communicates with `/auth/login` and `/auth/signup` routes.
*   **`index.html`**: The main dashboard with two tabs:
    - **Dashboard tab**: Live webcam feed with hand skeleton overlay, a Prediction Result card (gesture name + confidence bar), device cards (Light & Fan), gesture guide, and a Recent Activity log fetched from Supabase.
    - **About Project tab**: Full project description, tech stack tags, feature cards, and a 5-step pipeline diagram.
*   **`app.js`**: All frontend JavaScript — MediaPipe integration, gesture detection, Base64 image capture, fetch calls to `/predict` and `/log-state`, confidence score rendering, and activity log fetching from `/logs`.
### 📂 `ml/`
*   **`server.py`**: A Flask server that loads the TensorFlow model and performs real-time classification. Returns gesture label, confidence score, and device states.
*   **`train_model.py`**: Trains a MobileNetV2 CNN on your dataset images and saves `saved_model.h5`.
*   **`saved_model.h5`**: The trained "brain" — capable of distinguishing between palm and fist gestures.

### ☁️ `Supabase`
*   **Auth**: Manages user signup, login, and JWT sessions via `supabase.auth`.
*   **Database**: The `device_states` table stores every gesture-triggered action — device, state, user email, and timestamp.

---

## 5. Why This Stack?
*   **Pure HTML/CSS/JS** keeps the frontend simple, dependency-free, and served directly by Express — no build step required.
*   **Node.js** is perfect for handling many small requests between the browser and the AI service, and for proxying Supabase calls securely.
*   **Python/TensorFlow** is the industry standard for high-accuracy image recognition.
*   **Supabase** eliminates the need for managing complex local databases — cloud-ready out of the box.

---

## 6. The Engineering Procedure (The Full Lifecycle)

This project follows a complete AI lifecycle. It doesn't just come with a pre-trained brain; it is designed to be trained on **your** unique hand gestures.

### Phase 1: Data Preparation
1.  **Collection**: You provide images of your hand in the `dataset/palm` and `dataset/fist` folders.
2.  **Organization**: The system expects a minimum of 50–100 images per category for stable results.

### Phase 2: Training (Building the Brain)
1.  **Procedure**: Run the training script. It reads your images, applies Data Augmentation (rotating and zooming to make the AI more robust), and fine-tunes **MobileNetV2** to learn your gesture patterns.
2.  **Output**: The result is a unique `ml/saved_model.h5` file tailored specifically to your hand.

### Phase 3: Recognition & Integration
1.  **Inference**: The Flask server loads your custom `.h5` file.
2.  **Live Vision**: The browser frontend captures webcam frames and sends cropped hand images to the backend.
3.  **Command**: The AI recognizes the gesture, triggers the Smart Home action (Light/Fan), and logs it to Supabase.

---

## 7. How to Build & Run (The Complete Pipeline)

Follow these steps in exact order:

### 1. Prepare your Dataset
Place your gesture images here:
*   `dataset/palm/` (palm photos)
*   `dataset/fist/` (fist photos)

### 2. Train the Model
```bash
cd ml
python train_model.py
```
This creates `ml/saved_model.h5`.

### 3. Start the AI (Flask) Service
```bash
# Still inside the ml/ folder
python server.py
```
Flask runs on `http://127.0.0.1:5000`.

### 4. Start the Node.js Backend
Open a new terminal:
```bash
cd backend
npm start
```
The app is now live at **http://localhost:3000**

> **Note:** No separate frontend terminal is needed. The Node.js server serves `login.html`, `index.html`, and `app.js` directly from the `frontend/` folder at the project root.

### 5. Open the App
Navigate to `http://localhost:3000/login.html` in your browser. Log in or create an account, and start controlling devices with gestures.

---

*This project was restructured to a clean, dependency-free frontend (pure HTML/CSS/JS) served directly by Express, eliminating the need for a separate React/Vite build step.*
