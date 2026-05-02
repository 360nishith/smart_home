# 🎓 GestureLink — Complete Teaching Guide
### *"Let me explain your own project to you, from first principles"*

---

## 📚 Lesson 0 — Before We Look at Any Code: The Big Idea

Imagine you're sitting on your couch. Your hands are full or you're too lazy to reach for a switch. What if you could just **show your hand** to a webcam and your light turns on?

That's exactly what this project does.

**GestureLink** is a smart home controller where:
- You show a ✋ **open palm** → The light toggles ON/OFF
- You show a ✊ **closed fist** → The fan toggles ON/OFF
- Every action is **logged to a cloud database** so you can see the history
- There's a **login system** so only you can control your devices

The magic is that a **camera** watches your hand, **AI** recognizes the gesture, and **software** acts on it — all happening in under a second.

---

## 📚 Lesson 1 — The Three-Brain Architecture

> **Most important concept first:** This project is NOT one program. It is **THREE separate programs** running simultaneously, talking to each other.

```
┌─────────────────────────────────────────────────────┐
│                   YOUR COMPUTER                      │
│                                                      │
│  ┌──────────────┐    ┌──────────────┐               │
│  │   BROWSER    │───▶│  Node.js     │───▶ INTERNET  │
│  │  (Frontend)  │◀───│  Server      │    (Supabase) │
│  │  Port: N/A   │    │  Port: 3000  │               │
│  └──────────────┘    └──────┬───────┘               │
│                             │                        │
│                             ▼                        │
│                    ┌──────────────┐                  │
│                    │   Python     │                  │
│                    │  Flask + AI  │                  │
│                    │  Port: 5000  │                  │
│                    └──────────────┘                  │
└─────────────────────────────────────────────────────┘
```

| Program | Language | Port | Responsibility |
|---------|----------|------|----------------|
| **Browser** | HTML/CSS/JS | — | What the user sees and interacts with |
| **Node.js (Express)** | JavaScript | 3000 | The middleman — handles auth and database |
| **Python (Flask)** | Python | 5000 | The AI brain — runs the gesture model |

> **Why three programs?**  
> Because each technology is best at ONE thing:
> - **Browsers** are best at showing UIs and accessing webcams
> - **Node.js** is best at handling web requests and working with cloud APIs
> - **Python** is best at running machine learning models (TensorFlow only works in Python)

---

## 📚 Lesson 2 — The Full Journey of ONE Gesture

Let's trace exactly what happens when you hold up your open palm. Every step, every file.

```
Step 1: WEBCAM FRAME CAPTURED
  └── app.js: camera.start() → hands.send({ image: videoEl })
              The MediaPipe library receives each webcam frame

Step 2: HAND DETECTED + SKELETON DRAWN
  └── app.js: onResults(results)
              MediaPipe finds your hand's 21 landmark points
              Draws the blue skeleton on the <canvas>
              Calculates a green bounding box around your hand

Step 3: HAND REGION CROPPED
  └── app.js: sendCropToServer()
              Copies just the hand area to a hidden <canvas>
              Converts it to a Base64 JPEG string (text-encoded image)

Step 4: IMAGE SENT TO NODE.JS
  └── app.js → fetch("POST /predict", { image: base64 })
              The browser sends the Base64 image to Node.js on port 3000

Step 5: NODE.JS FORWARDS TO PYTHON
  └── server.js: app.post('/predict', ...)
              Node.js receives the image and immediately forwards it
              to the Flask server at http://127.0.0.1:5000/predict
              using the axios library

Step 6: PYTHON RUNS THE AI
  └── ml/server.py: predict_gesture()
              Decodes Base64 → raw bytes → NumPy array → OpenCV image
              Resizes to 128×128, normalizes pixel values (0 to 1)
              Feeds into the trained MobileNetV2 model
              Gets back: [fist_confidence, palm_confidence]
              e.g.: [0.03, 0.97] → "palm" at 97% confidence

Step 7: CONFIDENCE CHECK
  └── ml/server.py
              Is confidence < 0.82? → Return "ignored" (too uncertain)
              Did we just trigger within 2 seconds? → Return "ignored" (cooldown)
              Otherwise: Toggle light_state (palm) and return "triggered"

Step 8: RESULT FLOWS BACK
  └── ml/server.py → server.js → app.js
              { status:"triggered", gesture:"palm", confidence:0.97,
                action:"Light turned ON", light:"ON", fan:"OFF" }

Step 9: VOTE BUFFER CHECK
  └── app.js: voteBuffer
              Was the same gesture detected 3 consecutive frames?
              No → show "Gesture detected..." (wait for stability)
              Yes → proceed to trigger

Step 10: UI UPDATED
  └── app.js: updateDeviceUI('Light', 'ON')
              The Light card glows and shows "ON" in green

Step 11: LOGGED TO DATABASE
  └── app.js → logToDatabase() → fetch("POST /log-state")
              server.js receives { device:"Light", state:"ON", user_email:"you@mail.com" }
              Inserts a row into Supabase's device_states table

Step 12: ACTIVITY LOG REFRESHED
  └── app.js → fetchLogs() → fetch("GET /logs")
              server.js queries Supabase for latest 10 rows
              Dashboard renders them with icons and timestamps
```

---

## 📚 Lesson 3 — The Machine Learning Pipeline

This is the "AI" part. Let's break it down like you've never heard of machine learning.

### 3.1 — What is a CNN?

A **Convolutional Neural Network (CNN)** is a program that learns to recognize patterns in images by looking at millions of examples.

Think of it like a baby learning what a dog looks like:
- It sees 1000 dog photos → learns "dogs have fur, 4 legs, ears"
- It sees 1000 non-dog photos → learns what's NOT a dog
- After training, it can identify a dog it's never seen before

Our CNN does the same, but for **fist** vs **palm**.

### 3.2 — Why MobileNetV2 (Transfer Learning)?

Training a CNN from scratch needs **millions of images** and hours of computation.

**Transfer Learning** is a shortcut:
> "Use a CNN that already knows how to see (trained on 1.4M images), and just teach its final layer to tell fist from palm."

**MobileNetV2** was trained by Google on ImageNet (1.4 million photos). It already knows how to detect:
- Edges, corners, curves
- Textures, shapes, color gradients
- Complex patterns like fingers

We just **freeze all those layers** (don't retrain them) and add 3 new layers on top:

```
MobileNetV2 Base (FROZEN — Google's knowledge)
      ↓
GlobalAveragePooling2D  (squishes feature maps into a vector)
      ↓
Dense(128, relu)        (learns hand-specific patterns)
      ↓
Dropout(0.3)            (prevents overfitting — randomly disables 30% of neurons during training)
      ↓
Dense(2, softmax)       (outputs: [fist_probability, palm_probability])
```

### 3.3 — The Training Script: `ml/train_model.py`

This script runs **once** to produce `saved_model.h5`. Let's walk through it:

```python
# Step 1: Copy dataset to temp folder (Keras needs specific folder structure)
setup_temp_dirs()
# Creates:  ml/_temp_train/fist/  and  ml/_temp_train/palm/

# Step 2: Data Augmentation — artificially expand the dataset
ImageDataGenerator(
    rescale=1.0/255,          # Normalize pixels: 0-255 → 0.0-1.0
    rotation_range=15,        # Randomly rotate image ±15°
    width_shift_range=0.1,    # Randomly shift left/right 10%
    height_shift_range=0.1,   # Randomly shift up/down 10%
    zoom_range=0.15,          # Random zoom ±15%
    horizontal_flip=True,     # Mirror the image randomly
    brightness_range=[0.8, 1.2]  # Vary brightness
)
# Why? 100 real images + augmentation = effectively 1000+ varied images

# Step 3: Load MobileNetV2 + add our custom head
build_model()

# Step 4: Train for 10 epochs
model.fit(train_data, epochs=10, callbacks=[ReduceLROnPlateau(...)])
# ReduceLROnPlateau: if loss stops improving for 3 epochs → cut learning rate in half

# Step 5: Save the trained weights
model.save("ml/saved_model.h5")
```

### 3.4 — The Inference Server: `ml/server.py`

This runs **continuously** while the app is in use. Its only endpoint is `POST /predict`:

```python
# What arrives: Base64 string of a cropped hand image
# 1. Decode Base64 → NumPy image array
# 2. Resize to 128×128 (must match training input size)
# 3. Normalize: divide by 255 (must match training preprocessing)
# 4. model.predict(img) → e.g. [0.03, 0.97]
# 5. np.argmax → 1 (index of max) → "palm" (classes[1])
# 6. confidence = 0.97 → passes 0.82 threshold
# 7. Toggle light_state: "OFF" → "ON"
# 8. Return JSON
```

**Critical insight:** The threshold `0.82` is a design choice. Lower = more triggers but more errors. Higher = fewer false positives but might miss gestures.

---

## 📚 Lesson 4 — The Node.js Backend: `backend/server.js`

Think of Node.js as the **hotel receptionist**: it receives all requests, knows who to send them to, and holds the master keys (API credentials).

### Why can't the browser talk directly to Supabase or Flask?

1. **Security**: The Supabase secret key would be exposed to anyone who views browser source code. Node.js keeps it hidden on the server.
2. **CORS**: Browsers block JavaScript from sending requests to a different domain/port unless explicitly allowed. Node.js handles these restrictions.

### Route Map

```
POST /auth/signup  →  supabase.auth.signUp()           → New account
POST /auth/login   →  supabase.auth.signInWithPassword() → JWT session token
POST /auth/logout  →  supabase.auth.signOut()           → Clear session
POST /predict      →  axios.post(Flask_URL, body)       → AI result
POST /log-state    →  supabase.from('device_states').insert() → Save to DB
GET  /logs         →  supabase.from('device_states').select() → Read from DB
GET  /health       →  { status: "ok" }                 → Health check
```

### The Middleware Stack (Lines 23–26)

```javascript
app.use(cors());                          // Allow browser requests from any origin
app.use(bodyParser.json({ limit: '10mb' })); // Parse JSON bodies (10MB for Base64 images)
app.use(express.static(path.join(__dirname, 'public'))); // Serve HTML/CSS/JS files
```

Middleware = code that runs **before** every route handler. Think of it as security checkpoints at the hotel entrance.

### The `.env` File — Why It Exists

```
SUPABASE_URL=https://xxx.supabase.co   ← Never hardcode this!
SUPABASE_KEY=eyJhbGci...               ← This is like a password to your database
FLASK_SERVER_URL=http://127.0.0.1:5000/predict
PORT=3000
```

**Rule of thumb:** Any string that would change between your laptop and a production server → goes in `.env`. The `dotenv` package loads these at startup with `require('dotenv').config()`.

---

## 📚 Lesson 5 — The Frontend: Browser HTML/JS

The browser has **zero business logic** — it only does 3 things:
1. Show the UI
2. Access the webcam
3. Send API calls to Node.js

### The Two HTML Files

| File | When Shown | What It Does |
|------|-----------|--------------|
| `login.html` | First visit / logged out | Email/password form → calls `/auth/login` |
| `index.html` | After login | Dashboard with webcam, device cards, activity log |

### The Auth Guard Pattern

```javascript
// In index.html (top of page):
const session = JSON.parse(localStorage.getItem('supabase_session'));
if (!session) window.location.href = '/login.html';
// If no session stored → kick to login page immediately
```

```javascript
// In login.html (after successful login):
localStorage.setItem('supabase_session', JSON.stringify(data.session));
localStorage.setItem('user_email', data.session.user.email);
window.location.href = '/';
// Store session, redirect to dashboard
```

### The Vote Buffer — Preventing Accidental Triggers

```javascript
const VOTE_SIZE = 3;
let voteBuffer = [];  // e.g. ["palm", "palm", "palm"]

// Every frame:
voteBuffer.push(gesture);
if (voteBuffer.length > VOTE_SIZE) voteBuffer.shift();  // Keep only last 3

const allMatch = voteBuffer.length === VOTE_SIZE && voteBuffer.every(v => v === gesture);
// Only trigger if ALL 3 recent frames agreed on the same gesture
```

This prevents a single blurry frame from accidentally toggling your fan.

### MediaPipe — The Hand Skeleton Library

MediaPipe is a **Google library** that does real-time hand detection. It:
1. Receives each webcam frame
2. Finds all 21 hand landmark points (fingertips, knuckles, wrist)
3. Returns their X/Y coordinates normalized to 0–1

```javascript
const hands = new Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/.../${file}` });
hands.setOptions({ maxNumHands: 1, minDetectionConfidence: 0.7 });
hands.onResults(onResults);  // Our callback is called on every frame
```

We use the landmarks to:
- **Draw** the blue skeleton with `drawConnectors()`
- **Calculate a bounding box** around the hand
- **Crop** just the hand region for our CNN

---

## 📚 Lesson 6 — The Database: Supabase + SQL

Supabase is a **cloud database** built on PostgreSQL. You access it like a REST API.

### The Table: `device_states`

```sql
CREATE TABLE device_states (
    id          BIGINT PRIMARY KEY,   -- Auto-increments (1, 2, 3...)
    device      TEXT NOT NULL,        -- "Light" or "Fan"
    state       TEXT NOT NULL,        -- "ON" or "OFF"
    user_email  TEXT,                 -- Who triggered it
    timestamp   TIMESTAMPTZ,          -- When the action happened
    created_at  TIMESTAMPTZ           -- When the DB row was created
);
```

Every gesture trigger becomes one row. Example data:

| id | device | state | user_email | created_at |
|----|--------|-------|-----------|-----------|
| 1 | Light | ON | you@mail.com | 2026-05-02 08:01:23 |
| 2 | Fan | ON | you@mail.com | 2026-05-02 08:01:41 |
| 3 | Light | OFF | you@mail.com | 2026-05-02 08:02:05 |

### Row Level Security (RLS)

Supabase requires you to **explicitly grant permissions** on tables. Without the SQL policies:
- Inserting rows → 403 Forbidden
- Reading rows → empty result

The `supabase_setup.sql` creates two policies:
1. **"Allow anonymous inserts"** → anyone can log a device state (fine for a demo)
2. **"Allow public read access"** → anyone can read the activity log

In a production app, you'd restrict insert to authenticated users only.

---

## 📚 Lesson 7 — The Files That Never Run at Runtime

Some files exist only during setup or development:

| File | Role | When Used |
|------|------|-----------|
| `supabase_setup.sql` | Creates the DB table | One-time, pasted into Supabase SQL editor |
| `ml/train_model.py` | Trains the AI | One-time (or when retraining) |
| `dataset/fist/` | Training photos | Only during `python train_model.py` |
| `dataset/palm/` | Training photos | Only during `python train_model.py` |
| `package.json` | Lists Node.js dependencies | Only when running `npm install` |
| `.gitignore` | Tells Git what to exclude | Only when running git commands |
| `.md` files | Documentation | Only when a human reads them |

---

## 📚 Lesson 8 — How To Start the Project (Run Order)

This is the exact startup sequence. Order matters.

```
STEP 1 — Start the AI Server (Python/Flask)
  cd d:\project\smart_home_gesture\ml
  python server.py
  ✅ You see: "SMART HOME GESTURE SERVER" + "LISTENING on port 5000"

STEP 2 — Start the Web Server (Node.js/Express)
  cd d:\project\smart_home_gesture\backend
  node server.js
  ✅ You see: "Smart Home Backend running at http://localhost:3000"

STEP 3 — Open the Browser
  Navigate to: http://localhost:3000/login.html
  Log in → redirected to dashboard → webcam starts → gesture detection active
```

> ⚠️ **If Flask is not running**, Node.js `/predict` returns: `"Could not reach AI server"`. The app won't crash, but gesture detection fails.

---

## 📚 Lesson 9 — Key Engineering Decisions (For Interviews)

These are "why did you do it THIS way?" questions you'll face:

### Q: Why is the prediction proxied through Node.js instead of calling Flask directly from the browser?
**A:** Two reasons:
1. **Security** — The browser runs in a public environment. Exposing the Flask server URL directly means anyone could flood it with requests. Node.js acts as a gatekeeper.
2. **CORS** — Flask is on port 5000, the browser page is from port 3000. Browsers block cross-origin requests by default. Node.js on the same origin as the browser can communicate with Flask on localhost without CORS issues.

### Q: Why Transfer Learning instead of training your own CNN?
**A:** You'd need 10,000+ images per gesture to train a CNN from scratch for acceptable accuracy. With MobileNetV2 (pretrained on 1.4M images), 50–100 images per gesture is enough. The pretrained layers already understand shapes and textures; we only retrain the final classification layer.

### Q: Why the vote buffer? Why not act on every frame?
**A:** The webcam runs at ~30 fps. A single blurry or transitional frame could misclassify as a gesture. Requiring 3 consecutive frames with the same result is a cheap, effective debounce mechanism.

### Q: Why is the model stored in `.h5` format? What's in that file?
**A:** HDF5 is a binary format for storing large numerical arrays. The `.h5` file contains all the neural network weights — millions of floating-point numbers that represent the model's "learned knowledge." It's ~11MB because MobileNetV2 has ~3.5M parameters.

### Q: What's the 0.82 confidence threshold?
**A:** It's a tuned hyperparameter. Lower means more triggers but more false positives. Higher means fewer errors but might miss genuine gestures when lighting is poor. 0.82 (82%) was found to balance accuracy and responsiveness for this use case.

---

## 📚 Lesson 10 — Technology Map

Here's every technology used, in one place:

| Technology | Category | Used In | What It Does |
|-----------|----------|---------|--------------|
| **HTML5** | Frontend | `login.html`, `index.html` | Page structure |
| **CSS3** | Frontend | `login.html`, `index.html` | Styling, animations |
| **JavaScript (ES6+)** | Frontend | `app.js`, inline in HTML | Webcam, API calls, UI |
| **MediaPipe Hands** | Frontend Library | `app.js` | Real-time hand landmark detection |
| **Node.js** | Runtime | `server.js` | Runs JavaScript on the server |
| **Express.js** | Node Library | `server.js` | Web framework (routes, middleware) |
| **axios** | Node Library | `server.js` | HTTP client to call Flask |
| **dotenv** | Node Library | `server.js` | Loads `.env` secrets |
| **cors** | Node Library | `server.js` | Enables cross-origin requests |
| **body-parser** | Node Library | `server.js` | Parses JSON request bodies |
| **@supabase/supabase-js** | Node Library | `server.js` | Supabase Auth + Database client |
| **Python** | Language | `server.py`, `train_model.py` | ML runtime |
| **Flask** | Python Library | `server.py` | Web framework for the AI server |
| **TensorFlow/Keras** | Python Library | Both `.py` files | Deep learning framework |
| **MobileNetV2** | Pretrained Model | `train_model.py` | Base CNN for transfer learning |
| **OpenCV (cv2)** | Python Library | `server.py` | Image decoding and preprocessing |
| **NumPy** | Python Library | `server.py` | Array manipulation |
| **Supabase** | Cloud Service | Via `server.js` | Auth (JWT) + PostgreSQL database |
| **HDF5 (.h5)** | File Format | `saved_model.h5` | Neural network weights storage |

---

## 🎯 Summary — The 30-Second Pitch

> "GestureLink is a full-stack smart home controller that uses a webcam to recognize hand gestures in real time. The system has three layers: a browser frontend that captures webcam frames using MediaPipe, a Node.js server that handles authentication and database logging via Supabase, and a Python Flask server that runs a MobileNetV2 transfer learning model to classify gestures with 82%+ confidence. An open palm toggles the light; a closed fist toggles the fan. Every action is persisted to a Supabase PostgreSQL database and displayed in a live activity log on the dashboard."

---

*Document generated: 2026-05-02 | Project: GestureLink Smart Home*
