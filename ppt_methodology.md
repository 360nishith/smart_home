# 📊 PPT Methodology — Slide-by-Slide Content

> Copy this content directly into your slides. Each section = 1 slide.

---

## Slide 1 — Title Slide

**Title:** AI-Powered Smart Home Gesture Control System  
**Subtitle:** Contactless Appliance Control Using Hand Gesture Recognition  
**Team Members:** [Your Names]  
**Guide:** [Professor Name]  
**College:** [College Name]  
**Date:** March 2026

---

## Slide 2 — Problem Statement

**Problem:**
- Traditional smart home systems rely on physical switches, mobile apps, or voice assistants
- Not accessible for people with mobility impairments or speech difficulties
- Touch-based controls are unhygienic in shared/public spaces
- Voice commands fail in noisy environments

**Our Solution:**
- A **contactless, gesture-based** smart home controller
- Uses only a standard webcam — no special hardware needed
- Show your **palm** → Light toggles | Show your **fist** → Fan toggles

---

## Slide 3 — Objectives

1. Develop a **real-time hand gesture recognition system** using computer vision and deep learning
2. Control smart home appliances (Light, Fan) through **contactless hand gestures**
3. Implement a **secure web application** using Node.js for authentication and project management
4. Log all device state changes and **retrieve activity history** from a cloud database (Supabase)
5. Build a **premium dashboard** with dual-server architecture and real-time visual feedback

---

## Slide 4 — Scope of the Project

**In Scope:**
- Secure User Authentication (Login/Signup) via Supabase
- Real-time hand detection (MediaPipe) and classification (CNN)
- Gesture-based control for Light and Fan
- Cloud database logging & historical data retrieval
- Responsive full-stack dashboard (Node.js + Flask)

**Future Scope:**
- IoT hardware integration (ESP32 / Raspberry Pi)
- More gestures (thumbs up, peace sign, pointing)
- Mobile app support
- Multi-user authentication

---

## Slide 5 — System Architecture

> [!TIP]
> Use this diagram on your slide. Draw it as a flowchart with boxes and arrows.

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Webcam    │───▶│ Node.js     │───▶│ Flask API   │───▶│ CNN Model   │
│ (Login Auth)│    │ (Proxy/App) │    │ (Inference) │    │ (Prediction)│
└─────────────┘    └─────────────┘    └─────────────┘    └──────┬──────┘
                                                                │
      ▲                    │                  │                 ▼
      │                    ▼                  ▼          ┌─────────────┐
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │  Toggle     │
│ Dashboard   │◀───│ DB Logs     │◀───│  Supabase   │◀───│  State      │
│ UI Update   │    │ Retrieval   │    │  Cloud DB   │    └─────────────┘
└─────────────┘    └─────────────┘    └─────────────┘
```

**Four Layers:**
- **Frontend Layer** — HTML/CSS/JS (Dashboard UI)
- **App Management Layer** — Node.js & Express (Auth, Proxy, DB)
- **AI Inference Layer** — Python Flask & TensorFlow (Model Processing)
- **Data Layer** — Supabase Cloud (Authentication & PostgreSQL)

---

## Slide 6 — Methodology

### Phase 1: Data Collection & Preparation
- Used the **Rock-Paper-Scissors (RPS)** public image dataset
- ~840 images each for Rock and Paper categories
- **Rock** gesture → mapped as **"Fist"**
- **Paper** gesture → mapped as **"Palm"**
- All images resized to **128×128 pixels** and normalized (0 to 1 range)

### Phase 2: Model Training
- Utilized **MobileNetV2 Transfer Learning** via TensorFlow/Keras
- Architecture: Pre-trained MobileNetV2 Base → GlobalAveragePooling2D → Dense(128) → Softmax
- **Input:** 128×128×3 RGB image
- **Output:** 2 classes (Fist, Palm) with probability scores
- Trained and saved as `saved_model.h5` (~10 MB)

### Phase 3: Frontend Development
- Built a **web dashboard** using HTML5, CSS3, and JavaScript
- Integrated **Google MediaPipe Hands** for real-time hand detection in the browser
- MediaPipe detects **21 hand landmarks** at 30+ FPS
- Cropped hand region extracted using **Canvas API** and encoded as Base64

### Phase 4: Backend Development
- Created a **REST API** using Python Flask
- Single endpoint: `POST /predict`
- Receives Base64 image → preprocesses → runs CNN inference → returns result
- Implemented **confidence threshold** (82%) and **cooldown timer** (2 seconds)

### Phase 5: Database Integration
- Connected to **Supabase** (cloud-hosted PostgreSQL)
- Every device state change is logged with device name, state, and timestamp
- Enables future analytics and monitoring capabilities

### Phase 6: Integration & Testing
- Connected frontend ↔ backend via HTTP (CORS-enabled)
- End-to-end testing with live webcam gestures
- Verified database logging for each toggle event

---

## Slide 7 — Methodology Flowchart

> [!TIP]
> This is the visual version of the methodology. Put this as a clean vertical flowchart.

```
        ┌─────────────────────────┐
        │  1. Data Collection     │
        │  (RPS Image Dataset)    │
        └───────────┬─────────────┘
                    ▼
        ┌─────────────────────────┐
        │  2. Data Preprocessing  │
        │  Resize, Normalize,     │
        │  Split Train/Test       │
        └───────────┬─────────────┘
                    ▼
        ┌─────────────────────────┐
        │  3. CNN Model Training  │
        │  TensorFlow / Keras     │
        │  Binary Classification  │
        └───────────┬─────────────┘
                    ▼
        ┌─────────────────────────┐
        │  4. Model Evaluation    │
        │  Accuracy & Confidence  │
        │  Threshold Tuning       │
        └───────────┬─────────────┘
                    ▼
        ┌─────────────────────────┐
        │  5. Frontend Dev        │
        │  MediaPipe + Dashboard  │
        │  Camera + UI Cards      │
        └───────────┬─────────────┘
                    ▼
        ┌─────────────────────────┐
        │  6. Backend Dev         │
        │  Flask API + Inference  │
        │  State Management       │
        └───────────┬─────────────┘
                    ▼
        ┌─────────────────────────┐
        │  7. Database Setup      │
        │  Supabase Cloud DB      │
        │  Logging & Audit Trail  │
        └───────────┬─────────────┘
                    ▼
        ┌─────────────────────────┐
        │  8. Integration &       │
        │  End-to-End Testing     │
        └─────────────────────────┘
```

---

## Slide 8 — Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Web Server | **Node.js + Express** | Primary backend for Auth, Proxy, and DB |
| AI Server | **Python Flask** | Dedicated microservice for AI inference |
| Hand Tracking | **MediaPipe Hands** | Real-time 21-point tracking in browser |
| Classifier | **MobileNetV2 (TF)** | Classify fist vs palm from cropped image |
| Database | **Supabase (Postgres)** | Secure Cloud storage for Auth and Logs |
| Frontend | **HTML5, CSS3, JS** | Modern Dashboard with project documentation |

---

## Slide 9 — CNN Model Architecture

```
┌────────────────────────────────────────────┐
│           Input Layer (128×128×3)           │
├────────────────────────────────────────────┤
│     MobileNetV2 Base (Pre-trained)         │
│     (155 layers, feature extraction)       │
├────────────────────────────────────────────┤
│     GlobalAveragePooling2D                 │
├────────────────────────────────────────────┤
│     Dense (128) + ReLU                     │
├────────────────────────────────────────────┤
│     Dense (2) + Softmax                    │
│     Output: [fist_prob, palm_prob]          │
└────────────────────────────────────────────┘
```

**Key Points:**
- Convolutional layers **extract visual features** (edges, textures, finger shapes)
- Pooling layers **reduce dimensionality** while retaining important patterns
- Dense layers make the **final classification decision**
- Softmax gives **probability distribution** across 2 classes

---

## Slide 10 — Data Flow Diagram

```
User Hand → Webcam → MediaPipe (21 landmarks) → Bounding Box → Crop
→ Base64 Encode → HTTP POST → Flask Server → Base64 Decode
→ Resize 128×128 → Normalize ÷255 → MobileNetV2 Predict → Confidence Check
→ Cooldown Check → Toggle State → Log to Supabase → JSON Response
→ UI Card Update (glow, color, animation)
```

**Key Design Decisions:**
- MediaPipe runs **client-side** (no server load for detection)
- Only **cropped hand** sent to server (~90% bandwidth saving)
- **82% confidence threshold** prevents false triggers
- **2-second cooldown** prevents rapid toggling

---

## Slide 11 — Database Design

**Table: `device_states`**

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGINT (Auto) | Unique record ID |
| `device` | TEXT | "Light" or "Fan" |
| `state` | TEXT | "ON" or "OFF" |
| `created_at` | TIMESTAMP | Auto-generated UTC timestamp |

**Sample Records:**

| id | device | state | created_at |
|----|--------|-------|------------|
| 1 | Light | ON | 2026-03-28 18:00:01 |
| 2 | Fan | ON | 2026-03-28 18:00:05 |
| 3 | Light | OFF | 2026-03-28 18:00:12 |

---

## Slide 12 — UI Screenshots

> [!IMPORTANT]
> Take actual screenshots of your running project for this slide:
> 1. Dashboard with all devices OFF (default state)
> 2. Dashboard with Light ON (palm detected, card glowing green)
> 3. Dashboard with Fan ON (fan icon spinning)
> 4. Camera view showing hand skeleton + green bounding box

---

## Slide 13 — Results & Testing

| Test Case | Input | Expected Output | Result |
|-----------|-------|-----------------|--------|
| Palm gesture | Open hand shown | Light toggles ON | ✅ Pass |
| Fist gesture | Closed fist shown | Fan toggles ON | ✅ Pass |
| No hand | Empty camera | "STANDBY" status | ✅ Pass |
| Low confidence | Ambiguous gesture | Ignored (no toggle) | ✅ Pass |
| Rapid gestures | Palm shown 3x in 2 sec | Only 1st toggle accepted | ✅ Pass |
| Server offline | Flask not running | "API OFFLINE" error shown | ✅ Pass |
| DB logging | Any toggle | Record appears in Supabase | ✅ Pass |

---

## Slide 14 — Advantages

1. **Contactless** — No physical touch required, hygienic
2. **No special hardware** — Works with any standard webcam
3. **Real-time** — Response in under 500ms
4. **Accessible** — Usable by people with speech/mobility difficulties
5. **Cloud-logged** — Every action stored for monitoring and analytics
6. **Scalable** — Easy to add more gestures and devices
7. **Low bandwidth** — Only cropped hand region sent to server

---

## Slide 15 — Limitations

1. Requires good lighting for accurate detection
2. Limited to 2 gestures (fist and palm) currently
3. Simulated devices (no real IoT hardware connected)
4. Single-user system (one hand at a time)
5. Requires Flask server to be running locally
6. Model accuracy depends on training data quality

---

## Slide 16 — Future Scope

1. **IoT Hardware Integration** — Connect to ESP32/Raspberry Pi for real appliance control
2. **More Gestures** — Thumbs up, peace sign, pointing for more devices
3. **Voice + Gesture Hybrid** — Combine speech and gestures for robust control
4. **Mobile App** — Progressive Web App for phone-based access
5. **Multi-User Support** — Face recognition + gesture for personalized control
6. **Usage Analytics** — Dashboard showing usage patterns from database
7. **Edge Deployment** — Run CNN model directly in the browser using TensorFlow.js

---

## Slide 17 — Conclusion

- Successfully developed a **real-time gesture-based smart home control system**
- Demonstrated a **two-stage AI pipeline**: MediaPipe (detection) + CNN (classification)
- Achieved **contactless device control** with just a webcam
- Every state change **logged to cloud database** for audit and analytics
- The system is **modular and extensible** — easy to add new gestures and devices
- Proves the feasibility of **computer vision for accessible home automation**

---

## Slide 18 — References

1. Google MediaPipe — https://mediapipe.dev/
2. TensorFlow / Keras Documentation — https://www.tensorflow.org/
3. Flask Web Framework — https://flask.palletsprojects.com/
4. Supabase Documentation — https://supabase.com/docs
5. OpenCV Library — https://opencv.org/
6. Rock-Paper-Scissors Dataset — Laurence Moroney (TensorFlow Datasets)

---

## Slide 19 — Thank You

**Thank You!**

_Questions?_

---

## 💡 Suggested PPT Slide Order (20 slides total)

| # | Slide | Time |
|---|-------|------|
| 1 | Title | 30 sec |
| 2 | Problem Statement | 1 min |
| 3 | Objectives | 1 min |
| 4 | Scope | 45 sec |
| 5 | System Architecture | 1.5 min |
| 6 | Methodology (text) | 2 min |
| 7 | Methodology Flowchart | 1 min |
| 8 | Tech Stack | 1 min |
| 9 | CNN Architecture | 1.5 min |
| 10 | Data Flow | 1 min |
| 11 | Database Design | 45 sec |
| 12 | UI Screenshots | 1 min |
| 13 | Results & Testing | 1 min |
| 14 | Advantages | 45 sec |
| 15 | Limitations | 30 sec |
| 16 | Future Scope | 1 min |
| 17 | Conclusion | 1 min |
| 18 | References | 15 sec |
| 19 | Thank You / Q&A | — |
| **Total** | | **~15 min** |
