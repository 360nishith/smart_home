# GestureLink — Complete File Reference Guide

> Every file in the project explained: **what it is**, **why it exists**, and **when it runs**.

---

## Project Structure at a Glance

```
smart_home_gesture/
├── backend/
│   ├── public/
│   │   ├── login.html
│   │   ├── index.html
│   │   └── app.js
│   ├── server.js
│   ├── package.json
│   ├── package-lock.json
│   └── .env
├── ml/
│   ├── server.py
│   ├── train_model.py
│   └── saved_model.h5
├── dataset/
│   ├── fist/
│   └── palm/
├── supabase_setup.sql
├── .gitignore
└── PROJECT_WORKING_EXPLAINED.md
```

---

## 📂 `backend/` — The Node.js Web Server

This folder is the **heart of the web application**. It contains the Express.js server that handles all HTTP communication and serves every page the user sees.

---

### `backend/server.js`

| | |
|---|---|
| **What it is** | The main Node.js + Express.js backend server |
| **Language** | JavaScript (Node.js) |
| **When it runs** | Started once with `node server.js` — stays running while the app is in use |

**What it does, route by route:**

| Route | Method | Purpose |
|---|---|---|
| `/` | `GET` | Serves `index.html` (the dashboard) |
| `/login.html` | `GET` | Serves `login.html` (the login page) |
| `/app.js` | `GET` | Serves the frontend JavaScript |
| `/auth/signup` | `POST` | Receives `{email, password}`, calls Supabase Auth to create a new user |
| `/auth/login` | `POST` | Receives `{email, password}`, calls Supabase Auth to sign in, returns a JWT session |
| `/auth/logout` | `POST` | Signs out the current Supabase session |
| `/predict` | `POST` | Receives a Base64 hand image from the browser, **proxies** it to the Python Flask server at port 5000, returns the gesture result |
| `/log-state` | `POST` | Receives `{device, state, user_email}` and **inserts a row** into the Supabase `device_states` table |
| `/logs` | `GET` | **Queries** the Supabase `device_states` table for the 10 most recent actions and returns them as JSON |
| `/health` | `GET` | Simple health check — confirms the server is alive |

**Why it exists:** The browser cannot talk directly to Supabase (that would expose the secret key) or to the Python Flask server (CORS restriction). Node.js acts as the trusted **middleman** — it holds the credentials securely in `.env` and forwards requests safely.

---

### `backend/.env`

| | |
|---|---|
| **What it is** | A secret environment configuration file |
| **Language** | Plain text (key=value pairs) |
| **When it runs** | Loaded automatically at server startup by the `dotenv` package |

**Contents:**
```
SUPABASE_URL=https://...supabase.co       ← Your Supabase project URL
SUPABASE_KEY=eyJhbGci...                  ← Your Supabase anon/service key
FLASK_SERVER_URL=http://127.0.0.1:5000/predict  ← Where Flask AI server lives
PORT=3000                                 ← Which port Node.js listens on
```

**Why it exists:** Credentials must **never** be hardcoded in source code. This file keeps them separate. It is listed in `.gitignore` so it is never accidentally pushed to GitHub.

---

### `backend/package.json`

| | |
|---|---|
| **What it is** | Node.js project manifest — lists the app's name, version, scripts, and dependencies |
| **Language** | JSON |
| **When it runs** | Read by `npm` whenever you run `npm install` or `npm start` |

**Dependencies it declares:**

| Package | Why it's needed |
|---|---|
| `express` | Web server framework — handles routes, middleware, and static file serving |
| `@supabase/supabase-js` | Official Supabase client — used to call Auth and Database APIs |
| `axios` | HTTP client — used to forward prediction requests from Node.js to Flask |
| `cors` | Middleware that allows the browser to make cross-origin requests to the API |
| `body-parser` | Middleware that parses incoming JSON request bodies |
| `dotenv` | Loads `.env` file variables into `process.env` at startup |

---

### `backend/package-lock.json`

| | |
|---|---|
| **What it is** | Auto-generated lock file that records the **exact version** of every installed package |
| **When it runs** | Generated/updated automatically by `npm install` — never edited manually |

**Why it exists:** Ensures that every developer (or deployment) gets the exact same dependency versions, preventing "it works on my machine" bugs.

---

## 📂 `backend/public/` — The Frontend (HTML/CSS/JS)

These three files are the **entire user interface**. They are static files served directly by `server.js` via `express.static()`. No build step, no framework, no compilation needed.

---

### `backend/public/login.html`

| | |
|---|---|
| **What it is** | The login and signup page — the first page a user sees |
| **Language** | HTML + CSS + JavaScript (inline) |
| **When it runs** | When a user visits `http://localhost:3000/login.html`, or when the dashboard redirects an unauthenticated user |

**What it does:**
- Displays a **two-panel layout**: left hero panel describes the project, right panel has the auth form
- Supports **Login** and **Sign Up** (toggled with a single click — no page reload)
- On submit, sends `POST /auth/login` or `POST /auth/signup` to Node.js
- On successful login, saves the **JWT session** to `localStorage` and redirects to the dashboard
- On load, checks if a valid session already exists in `localStorage` — if yes, skips login and goes straight to the dashboard

---

### `backend/public/index.html`

| | |
|---|---|
| **What it is** | The main dashboard — the app's core interface after login |
| **Language** | HTML + CSS + JavaScript (inline + loads `app.js`) |
| **When it runs** | When a logged-in user visits `http://localhost:3000` |

**What it does:**

It has **two tabs** switchable without a page reload:

**Tab 1 — Dashboard:**
- Live **webcam feed** with MediaPipe hand skeleton overlay drawn on a `<canvas>`
- **Prediction Result Card** — shows the detected gesture name, a confidence score percentage, and a color-coded confidence bar (green ≥75%, yellow ≥50%, red <50%)
- **Device Cards** (Light & Fan) — change color and animate when toggled ON
- **Gesture Guide** — reminds the user which gesture does what
- **Recent Activity Log** — fetches the last 10 actions from Supabase via `GET /logs` and renders them with icons and timestamps

**Tab 2 — About Project:**
- Full project description with a tech stack tag cloud
- Six feature cards explaining the system's capabilities
- A 5-step pipeline diagram (Webcam → MediaPipe → Crop → CNN → Toggle)

**Auth guard:** On load it checks `localStorage` for a session — if missing, immediately redirects to `login.html`.

---

### `backend/public/app.js`

| | |
|---|---|
| **What it is** | All the frontend JavaScript logic — gesture detection, API calls, and UI updates |
| **Language** | JavaScript (ES6+) |
| **When it runs** | Loaded by `index.html`. Executes as soon as the dashboard page loads |

**What it does, function by function:**

| Function | Purpose |
|---|---|
| `onResults(results)` | MediaPipe callback — called every frame. Draws the hand skeleton, calculates the bounding box, crops the hand region, and calls `sendCropToServer()` |
| `sendCropToServer()` | Converts the cropped canvas region to a Base64 JPEG and sends it via `fetch()` to `POST /predict`. Receives gesture + confidence back |
| `setPredText()` | Updates the Prediction Result Card — sets the gesture icon, text, confidence percentage, and the color of the confidence bar |
| `updateDeviceUI()` | Updates a Device Card — toggles the `.on` CSS class, changes the status text color (green/red), and starts/stops the fan spinning animation |
| `logToDatabase()` | Sends `POST /log-state` to Node.js after a confirmed gesture triggers a device change. Then refreshes the activity log |
| `fetchLogs()` | Calls `GET /logs`, parses the Supabase response, and renders each log entry as a styled row with a device icon and timestamp |
| Vote Buffer | A 3-item array (`voteBuffer`) that ensures the same gesture appears 3 consecutive frames before any action fires — prevents accidental triggers |

**When the camera starts:** `camera.start()` is called, which feeds webcam frames into `hands.send()` (MediaPipe) continuously.

---

## 📂 `ml/` — The AI (Python / Flask)

This folder contains the machine learning engine. It runs as a completely separate process from Node.js.

---

### `ml/train_model.py`

| | |
|---|---|
| **What it is** | A one-time training script that builds and saves the gesture recognition model |
| **Language** | Python |
| **When it runs** | **Only once** (or when retraining) — run manually with `python train_model.py` before starting the server |

**What it does, step by step:**

1. **`setup_temp_dirs()`** — Copies `dataset/fist/` and `dataset/palm/` into a temporary folder structured the way Keras `ImageDataGenerator` expects
2. **`ImageDataGenerator`** — Applies **data augmentation**: randomly rotates images (±15°), shifts, zooms (15%), flips horizontally, and adjusts brightness (0.8×–1.2×). This artificially expands the dataset and makes the model more robust
3. **`build_model()`** — Uses **Transfer Learning**:
   - Loads `MobileNetV2` pre-trained on ImageNet (1.4 million images) as the base — its layers already know how to detect edges, shapes, and textures
   - Freezes the base layers (their weights don't change during training)
   - Adds a new `GlobalAveragePooling2D` → `Dense(128, relu)` → `Dropout(0.3)` → `Dense(2, softmax)` head that learns the difference between `fist` and `palm`
4. **Training** — Runs for 10 epochs with `ReduceLROnPlateau` (automatically lowers the learning rate if loss plateaus) and class weights (compensates if one gesture has fewer training images)
5. **Saves** the trained model to `ml/saved_model.h5` and deletes the temp folder

**Why Transfer Learning?** Training a full CNN from scratch needs thousands of images. MobileNetV2 already knows how to see — we just teach its top layer to tell fist from palm. 50–100 images per gesture is enough.

---

### `ml/server.py`

| | |
|---|---|
| **What it is** | A Flask HTTP server that loads the trained model and serves predictions |
| **Language** | Python |
| **When it runs** | Started with `python server.py` — stays running as a background service while the app is in use |

**What it does:**

1. On startup, loads `saved_model.h5` into memory using `tensorflow.keras.models.load_model()`
2. Maintains two in-memory state variables: `light_state` and `fan_state` (both start as `"OFF"`)
3. Exposes one endpoint: `POST /predict`

**Inside `/predict`:**
1. Receives the Base64-encoded JPEG from Node.js
2. **Decodes** the Base64 string → raw bytes → NumPy array → OpenCV BGR image
3. **Preprocesses**: converts BGR→RGB, resizes to 128×128, normalizes pixel values to 0–1
4. **Runs inference**: `model.predict()` returns confidence scores for `[fist, palm]`
5. **Confidence threshold**: if max confidence < 0.82, returns `status: "ignored"` — the gesture is too uncertain to act on
6. **Cooldown**: if less than 2 seconds have passed since the last trigger, also returns `"ignored"` — prevents rapid flickering
7. **Toggles** `light_state` (palm) or `fan_state` (fist) and returns `status: "triggered"` with the action, gesture label, confidence score, and both device states

**Why a separate Python server?** TensorFlow/Keras is Python-only. Node.js cannot run `.h5` models natively. The two servers communicate over HTTP on localhost.

---

### `ml/saved_model.h5`

| | |
|---|---|
| **What it is** | The trained neural network model saved in HDF5 format |
| **Language** | Binary (HDF5) — not human-readable |
| **When it runs** | Loaded into memory by `server.py` at startup — not "run" directly |

**What it contains:** The exact numerical weights (millions of floating-point numbers) that define how the MobileNetV2 CNN classifies hand images. It is the output of `train_model.py`.

**Why `.gitignore` excludes it:** At ~11 MB, the file is large for Git. It is also personal — trained on your specific hand and lighting conditions. Each user should generate their own.

---

## 📂 `dataset/` — Training Images

| | |
|---|---|
| **What it is** | A folder of raw hand gesture photos used to train the model |
| **When it's used** | Only during the training phase (`python train_model.py`) — never touched at runtime |

| Subfolder | Contents |
|---|---|
| `dataset/fist/` | Photos of a closed fist gesture (your hand making a fist) |
| `dataset/palm/` | Photos of an open palm gesture (your hand spread open) |

**Why it exists:** Machine learning models learn by example. The more diverse your images (different lighting, angles, distances), the more accurate the model becomes. Minimum 50–100 images per category is recommended.

---

## `supabase_setup.sql`

| | |
|---|---|
| **What it is** | A SQL script that sets up the required database table in Supabase |
| **Language** | SQL (PostgreSQL dialect) |
| **When it runs** | **One time only** — pasted manually into the Supabase SQL Editor when setting up the project for the first time |

**What it creates:**

```sql
-- The main logging table
CREATE TABLE device_states (
    id          BIGINT PRIMARY KEY,   -- auto-incrementing row ID
    device      TEXT NOT NULL,        -- "Light" or "Fan"
    state       TEXT NOT NULL,        -- "ON" or "OFF"
    user_email  TEXT,                 -- who triggered the action
    timestamp   TIMESTAMPTZ,          -- when it was sent
    created_at  TIMESTAMPTZ           -- when the DB row was created
);
```

It also:
- Enables **Row Level Security (RLS)** — Supabase's security system (required for the table to work with the anon key)
- Creates two **policies**: one allowing anonymous inserts (for logging), one allowing public reads (for the activity log)
- Creates an **index** on `created_at DESC` so fetching the latest 10 logs is fast

---

## `.gitignore`

| | |
|---|---|
| **What it is** | A Git configuration file that lists files and folders Git should never track or commit |
| **Language** | Plain text (glob patterns) |
| **When it runs** | Checked automatically by Git on every `git add` / `git commit` |

**What it ignores and why:**

| Pattern | Why excluded |
|---|---|
| `node_modules/` | Hundreds of MB of auto-installable packages — never committed, recreated with `npm install` |
| `__pycache__/`, `*.py[cod]` | Python bytecode cache files — auto-generated, not needed in version control |
| `venv/`, `env/` | Python virtual environment folders — local only |
| `.env`, `.env.local` | **CRITICAL** — contains secret API keys. Committing these would expose your Supabase database to anyone who views the repo |
| `.DS_Store`, `Thumbs.db` | OS-generated metadata files (macOS / Windows) — not part of the project |
| `ml/saved_model.h5` | Large binary model file (~11 MB) — trained locally, not shared via Git |
| `ml/saved_model_backup.h5` | Backup created during retraining — also local only |

---

## `PROJECT_WORKING_EXPLAINED.md`

| | |
|---|---|
| **What it is** | The main project documentation — explains the architecture, pipeline, and how to run the project |
| **Language** | Markdown |
| **When it's used** | Reference document for developers, interviewers, or anyone wanting to understand the system |

Covers the non-technical overview, technical stack, step-by-step pipeline, key components, engineering lifecycle, and complete run instructions.

---

## Quick-Reference: When Does Each File Run?

| Phase | Files Active |
|---|---|
| **Setup (one-time)** | `supabase_setup.sql` (run in Supabase SQL editor) |
| **Training (one-time)** | `ml/train_model.py` → produces `ml/saved_model.h5` |
| **Every app launch** | `ml/server.py` (starts Flask on port 5000), `backend/server.js` (starts Node.js on port 3000) |
| **Every page load** | `backend/public/login.html` or `backend/public/index.html` |
| **Every webcam frame** | `backend/public/app.js` → `backend/server.js /predict` → `ml/server.py /predict` |
| **Every gesture trigger** | `backend/public/app.js` → `backend/server.js /log-state` → Supabase `device_states` table |
| **Every dashboard open** | `backend/public/app.js` → `backend/server.js /logs` → Supabase `device_states` table |
| **Never at runtime** | `dataset/`, `.gitignore`, `package-lock.json`, `supabase_setup.sql`, `.md` files |
