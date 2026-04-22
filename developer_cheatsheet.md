# 🛠️ Developer Cheat Sheet: The "Quick Fix" Guide

> **Objective:** Instant answers for any "What if..." question from examiners.

---

## 🗺️ Master File Map

| Category | File | Purpose |
| :--- | :--- | :--- |
| **AI Brain** | [backend/app_server.py](file:///d:/project/smart_home_gesture/backend/app_server.py) | **Inference Engine**: Handness, thresholds, and CNN class mapping. |
| **Logic Bridge** | [web_app/server.js](file:///d:/project/smart_home_gesture/web_app/server.js) | **Backend**: Auth, AI Proxying, and Supabase Logging. |
| **Dashboard** | [web_app/public/index.html](file:///d:/project/smart_home_gesture/web_app/public/index.html) | **Design**: CSS themes, device cards, and layout. |
| **Hand Tracking** | [web_app/public/app.js](file:///d:/project/smart_home_gesture/web_app/public/app.js) | **Client Logic**: MediaPipe detection and image cropping. |

---

## 🏃 Commands to Run (Start these 2 first!)

1.  **Start AI Microservice**:
    `cd backend` -> `python app_server.py` (Runs on Port 5000)
2.  **Start Web Web App**:
    `cd web_app` -> `npm start` (Runs on Port 3000)

---

## 🧩 Common Maintenance Scenarios

### 1. "Change AI Sensitivity" (Open `app_server.py`)
- **Confidence Gate**: Change `if confidence < 0.82:` (Line ~114).
- **Toggle Cooldown**: Change `COOLDOWN = 2` (Line ~32).

### 2. "Modify the UI Look" (Open `index.html`)
- Change the **CSS Variables** at the top of the file:
  - `--primary`: Branding color (Sky Blue).
  - `--bg`: Background color.
  - `--card`: Glassmorphism transparency level.

### 3. "Add a New Device" (e.g., AC or Door)
1. **Frontend**: Duplicate a device card in `index.html` and give it a unique ID.
2. **Backend**: Add the device logic to the response in `app_server.py`.
3. **Sync**: Add a line to `updateUI()` in `public/app.js` to handle the new ID.

### 4. "Hand Detection Settings" (Open `public/app.js`)
- Find `hands.setOptions({})` near the end:
  - `minDetectionConfidence`: Increase this (e.g., 0.8) to make hand detection more strict.

---

## ⚡ Quick Reference
- **Model Path**: `ml/saved_model.h5` (CNN MobileNetV2).
- **Database**: Supabase PostgreSQL (Cloud-hosted).
- **Gesture Mapping**: 🖐️ Palm = Light Toggle | ✊ Fist = Fan Toggle.
