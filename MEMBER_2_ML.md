# 🧠 Member 2 — AI/ML Developer Guide
## GestureLink Smart Home | Python + TensorFlow + Flask

---

> **Your Role:** You are the intelligence of this project. You build and train the machine learning model that recognizes hand gestures, and you serve that model as a running HTTP API that the rest of the system calls in real time. Without your work, the system is just a webcam with no brain.

---

## 📦 Your Files

| File | Location | What It Is |
|------|----------|-----------|
| `train_model.py` | `ml/train_model.py` | One-time script: builds and trains the CNN model |
| `server.py` | `ml/server.py` | Always-running Flask HTTP server: loads model and serves predictions |
| `saved_model.h5` | `ml/saved_model.h5` | The trained neural network weights (output of training) |
| `dataset/fist/` | `dataset/fist/` | Folder of training photos — closed fist gesture |
| `dataset/palm/` | `dataset/palm/` | Folder of training photos — open palm gesture |

---

## 🧠 Your Responsibility in the System

```
Browser (webcam image)
        │
        ▼
Node.js server (port 3000)
        │  receives Base64 image, forwards it
        ▼
YOUR Flask server (port 5000)  ←── YOU OWN THIS
        │  loads saved_model.h5
        │  decodes image → preprocesses → runs through CNN
        │  returns { gesture, confidence, light_state, fan_state }
        ▼
Node.js → Browser → UI updates
```

Your job splits into **two phases**:

| Phase | When | What You Run |
|-------|------|-------------|
| **Training** | Once, before deployment | `python train_model.py` |
| **Serving** | Every time the app is used | `python server.py` |

---

## 📄 File 1: `ml/train_model.py` — Building the AI Brain

This script runs **only once** (or when you want to retrain). It produces `saved_model.h5`.

### How to run it

```bash
cd d:\project\smart_home_gesture\ml
python train_model.py
```

Expected output:
```
Setting up dataset folders...
  fist: 87 images (from fist/)
  palm: 93 images (from palm/)

Class indices: {'fist': 0, 'palm': 1}

Starting training...
Epoch 1/10 - loss: 0.6231 - accuracy: 0.6812
Epoch 2/10 - loss: 0.3914 - accuracy: 0.8456
...
Epoch 10/10 - loss: 0.1023 - accuracy: 0.9734

Model saved to: ml/saved_model.h5
Cleaned up temp files.
```

### Step 1 — Dataset Preparation (`setup_temp_dirs()`)

```python
def setup_temp_dirs():
    """Create a clean temp folder with copies for just fist and palm."""
    if os.path.exists(TEMP_DIR):
        shutil.rmtree(TEMP_DIR)

    mapping = { "fist": "fist", "palm": "palm" }
    for src_name, dst_name in mapping.items():
        src = os.path.join(DATASET_DIR, src_name)
        dst = os.path.join(TEMP_DIR, dst_name)
        shutil.copytree(src, dst)
        count = len(os.listdir(dst))
        print(f"  {dst_name}: {count} images")
```

**Why this step?** Keras's `ImageDataGenerator` requires images to be organized in a specific folder structure:
```
_temp_train/
├── fist/    ← all fist images
└── palm/    ← all palm images
```
It reads the **folder name** as the label. So a file in `fist/` is automatically labeled as class `"fist"`.

### Step 2 — Data Augmentation

```python
train_gen = ImageDataGenerator(
    rescale=1.0 / 255,         # Normalize: 0-255 → 0.0-1.0
    rotation_range=15,         # Randomly rotate ±15°
    width_shift_range=0.1,     # Shift horizontally ±10%
    height_shift_range=0.1,    # Shift vertically ±10%
    zoom_range=0.15,           # Random zoom ±15%
    horizontal_flip=True,      # Mirror the image randomly
    brightness_range=[0.8, 1.2]  # Vary brightness ×0.8 to ×1.2
)
```

**Why augmentation?** You probably have 50–100 real photos per gesture. That's not many.

Augmentation **artificially creates variations** of each photo by applying random transformations. A photo of your fist can become:
- A rotated fist
- A slightly brighter fist
- A mirrored fist
- A zoomed-in fist

This makes your model **generalize better** — it won't memorize your exact 87 photos; it'll learn what a fist fundamentally looks like.

**Critical rule:** `rescale=1.0/255` divides every pixel value by 255.  
- Before: pixel values are 0–255 (integers)  
- After: pixel values are 0.0–1.0 (floats)  
- This is **required** because neural networks work best with small input values. **The same normalization must be applied in `server.py` at prediction time.**

### Step 3 — Building the Model (`build_model()`)

```python
from tensorflow.keras.applications import MobileNetV2

def build_model():
    base_model = MobileNetV2(
        input_shape=(128, 128, 3),  # 128×128 RGB image
        include_top=False,           # Don't include MobileNetV2's final layers
        weights='imagenet'           # Use weights trained on 1.4M images
    )
    base_model.trainable = False  # Freeze — don't retrain Google's layers

    model = Sequential([
        base_model,
        GlobalAveragePooling2D(),   # Compress feature maps to a vector
        Dense(128, activation='relu'),  # Learn gesture-specific patterns
        Dropout(0.3),               # Randomly disable 30% of neurons (prevents overfitting)
        Dense(2, activation='softmax')  # Output: [fist_probability, palm_probability]
    ])

    model.compile(
        optimizer=Adam(learning_rate=0.001),
        loss='categorical_crossentropy',
        metrics=['accuracy']
    )
    return model
```

**Understanding Transfer Learning:**

| Layer | Owner | Trainable? | What It Knows |
|-------|-------|-----------|---------------|
| MobileNetV2 base (154 layers) | Google | ❌ Frozen | Edges, textures, shapes from 1.4M images |
| GlobalAveragePooling2D | Us | ✅ Trained | Reduces 4D tensor to 1D |
| Dense(128, relu) | Us | ✅ Trained | Learns "what does a fist/palm look like" |
| Dropout(0.3) | Us | ✅ Trained | Regularization — prevents memorization |
| Dense(2, softmax) | Us | ✅ Trained | Outputs final probabilities |

**Understanding softmax:** The final layer outputs `[p_fist, p_palm]` where both add up to 1.0.
- Example: `[0.03, 0.97]` → 3% confident it's a fist, 97% confident it's a palm → **classified as palm**
- `np.argmax([0.03, 0.97])` → index `1` → `classes[1]` → `"palm"`

### Step 4 — Class Weights

```python
total = train_data.samples
num_classes = train_data.num_classes
class_weights = {}
for cls_idx, count in zip(*np.unique(train_data.classes, return_counts=True)):
    class_weights[cls_idx] = total / (num_classes * count)
```

**Why?** If you have 87 fist photos and 93 palm photos, the model trains on slightly more palms. Class weights compensate — the model "pays more attention" to the rarer class during training. This prevents bias.

### Step 5 — Training

```python
history = model.fit(
    train_data,
    epochs=10,
    callbacks=[ReduceLROnPlateau(monitor='loss', factor=0.5, patience=3)],
    class_weight=class_weights
)
```

**ReduceLROnPlateau:** If the loss doesn't improve for 3 consecutive epochs, it cuts the learning rate in half. This helps the model converge to a better solution without oscillating.

**Epochs:** The training data is passed through the model 10 times. Each pass, the model adjusts its weights slightly to reduce loss.

### Step 6 — Save

```python
model.save(OUTPUT_MODEL)  # → ml/saved_model.h5
shutil.rmtree(TEMP_DIR)   # Clean up _temp_train/ folder
```

The trained model is saved as an HDF5 file (`saved_model.h5`). This file contains:
- The model architecture (all layer definitions)
- All the learned weights (millions of floating-point numbers)
- The optimizer state

---

## 📄 File 2: `ml/server.py` — The Always-Running Prediction Server

This is a Flask HTTP server. It runs continuously while the app is in use and serves one endpoint: `POST /predict`.

### How to start it

```bash
cd d:\project\smart_home_gesture\ml
python server.py
```

Expected output:
```
========================================
🚀 SMART HOME GESTURE SERVER
========================================
📡 Status: LISTENING
🔗 URL:    http://127.0.0.1:5000
🧠 Model:  MobileNetV2 (Transfer Learning)
========================================

Model loaded from: .../ml/saved_model.h5
```

### On startup — model loading (lines 19–31)

```python
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, "ml", "saved_model.h5")

try:
    if os.path.exists(MODEL_PATH):
        model = load_model(MODEL_PATH)
        print(f"Model loaded from: {MODEL_PATH}")
    else:
        print(f"ERROR: Model file not found at {MODEL_PATH}")
        model = None
except Exception as e:
    print(f"Could not load model: {e}")
    model = None
```

The model is loaded **once at startup** into memory. It stays in RAM. Every prediction request uses the already-loaded model — this is what makes predictions fast (no disk read per request).

### In-memory device state (lines 33–40)

```python
classes = ["fist", "palm"]   # Index 0 = fist, Index 1 = palm

light_state = "OFF"
fan_state   = "OFF"

last_trigger_time = 0
COOLDOWN = 2  # seconds between allowed toggles
```

> ⚠️ **Important:** These states live only in **Python's memory**. If you restart `server.py`, `light_state` and `fan_state` reset to "OFF". The permanent history is stored in Supabase (Member 1's responsibility).

### The `/predict` endpoint — step by step (lines 43–135)

#### Step 1: Receive and validate

```python
data = request.json
if "image" not in data:
    return jsonify({"error": "No image in request"}), 400

# Strip the "data:image/jpeg;base64," prefix if present
encoded_data = data["image"].split(',')[1] if ',' in data["image"] else data["image"]
```

The browser sends: `"data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ..."`  
The part before the comma is metadata we don't need — we strip it.

#### Step 2: Decode Base64 → image

```python
image_bytes = base64.b64decode(encoded_data)    # text → raw bytes
nparr = np.frombuffer(image_bytes, np.uint8)    # bytes → NumPy uint8 array
img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR) # NumPy → OpenCV BGR image
```

The browser sends images as Base64 text (because HTTP is text-based). We reverse the encoding:
1. Base64 text → raw bytes
2. Raw bytes → NumPy array (how OpenCV expects data)
3. NumPy array → decoded color image

#### Step 3: Preprocess for the CNN

```python
roi_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)  # BGR → RGB (OpenCV uses BGR, TF uses RGB)
img = cv2.resize(roi_rgb, (128, 128))                # Resize to match training input size
img = img / 255.0                                    # Normalize (must match training!)
img = np.expand_dims(img, axis=0)                   # Add batch dimension: (128,128,3) → (1,128,128,3)
```

> **Critical:** Every preprocessing step here **must exactly match** what `train_model.py` did during training:
> - Training used 128×128 → we resize to 128×128 ✅
> - Training used `rescale=1/255` → we divide by 255 ✅
> - Training used RGB images from ImageDataGenerator → we convert BGR→RGB ✅

#### Step 4: Run the model

```python
prediction = model.predict(img, verbose=0)    # → e.g. [[0.03, 0.97]]
confidence = float(np.max(prediction))         # → 0.97
gesture    = classes[np.argmax(prediction)]    # → "palm"

print(f"🔍 DEBUG | Raw: {prediction[0]} | gesture: {gesture} | confidence: {confidence:.3f}")
```

The debug print is extremely useful during development — you can see exactly what the model outputs for each frame.

#### Step 5: Confidence threshold

```python
if confidence < 0.82:
    return jsonify({
        "status": "ignored",
        "reason": f"Low confidence ({confidence:.2f})",
        "gesture": gesture,
        "confidence": confidence,
        "light": light_state,
        "fan": fan_state
    })
```

If the model is less than 82% confident, we **don't act**. The response still goes back (so the frontend can show "Hold steady..."), but no toggle happens. This threshold was tuned to balance responsiveness vs accuracy.

**Tuning tip:** If genuine gestures are being missed → lower the threshold (e.g., `0.75`). If false triggers happen → raise it (e.g., `0.88`).

#### Step 6: Cooldown

```python
current_time = time.time()
if current_time - last_trigger_time < COOLDOWN:
    return jsonify({"status": "ignored", "reason": "Cooldown", ...})
```

Prevents rapid consecutive toggles. After a gesture fires, you must wait 2 seconds before the next one. Without this, a sustained gesture would toggle the device many times per second.

#### Step 7: Toggle and respond

```python
if gesture == "palm":
    light_state = "ON" if light_state == "OFF" else "OFF"
    last_trigger_time = current_time
    command = {"device": "Light", "state": light_state}

elif gesture == "fist":
    fan_state = "ON" if fan_state == "OFF" else "OFF"
    last_trigger_time = current_time
    command = {"device": "Fan", "state": fan_state}

return jsonify({
    "status": "triggered",
    "action": f"Light turned {light_state}",  # or Fan
    "gesture": gesture,
    "confidence": confidence,
    "light": light_state,
    "fan": fan_state
})
```

**Toggle logic:** `"ON" if current == "OFF" else "OFF"` — it flips the state each time. The new state and the full device status are returned in every response so the frontend can always stay in sync.

---

## 📄 File 3: `ml/saved_model.h5` — The Trained Model

| Property | Value |
|----------|-------|
| Format | HDF5 (Hierarchical Data Format) |
| Size | ~11 MB |
| Contents | All neural network weights + architecture |
| Created by | `python train_model.py` |
| Used by | `python server.py` on startup |
| Human-readable? | No — it's binary data |

> ⚠️ This file is in `.gitignore` — it is **not pushed to GitHub**. Each person training the model gets their own version tuned to their own hand and lighting. If a new team member needs to use the system, they must train their own model using `train_model.py`.

---

## 📂 Files 4 & 5: `dataset/fist/` and `dataset/palm/` — Training Data

These folders contain the photos you took of your own hand.

### Requirements

| Gesture | Folder | Minimum photos | Recommended |
|---------|--------|---------------|-------------|
| Closed fist | `dataset/fist/` | 50 | 80–150 |
| Open palm | `dataset/palm/` | 50 | 80–150 |

### How to collect good training data

Take photos with **variety** — the model needs to generalize:
- Different distances from camera (30cm, 50cm, 80cm)
- Different angles (straight, slightly rotated, tilted)
- Different lighting conditions (bright, dim, natural light)
- Different backgrounds if possible
- Different hand positions within the gesture (slightly open fist, fully closed, etc.)

### Supported formats

Any image format OpenCV can read: `.jpg`, `.jpeg`, `.png`, `.bmp`

---

## 🔗 How Your Code Connects to the Other Members

### You ↔ Member 1 (Backend/Node.js)

```
Member 1's server.js (port 3000)
    └── POST /predict → axios.post("http://127.0.0.1:5000/predict", body)
            └── YOUR server.py (port 5000)
                    └── returns { status, gesture, confidence, light, fan }
            └── Member 1 forwards response to browser
```

- **You must be running** before Member 1 starts, or their `/predict` route will fail
- The only contract: you receive `{ image: "base64string" }` and return the JSON above
- `FLASK_SERVER_URL` in Member 1's `.env` must point to `http://127.0.0.1:5000/predict`

### You ↔ Member 3 (Frontend)

- You **don't communicate with Member 3 directly** — Node.js is in the middle
- But Member 3's gesture cropping quality directly affects your accuracy:
  - If the crop is too wide, the model sees the background
  - If too narrow, it misses finger tips
  - Their MediaPipe bounding box logic needs to produce tight, hand-only crops

---

## 🚀 Startup Sequence

```bash
# 1. Prepare dataset (one time — take your photos)
# Put fist photos in: d:\project\smart_home_gesture\dataset\fist\
# Put palm photos in: d:\project\smart_home_gesture\dataset\palm\

# 2. Train the model (one time)
cd d:\project\smart_home_gesture\ml
python train_model.py
# Wait ~5-10 minutes → produces saved_model.h5

# 3. Start the Flask server (every session)
python server.py
# Must be running BEFORE Member 1 starts Node.js
```

---

## 🛠️ Required Python Packages

```bash
pip install flask flask-cors tensorflow opencv-python numpy
```

| Package | Used For |
|---------|---------|
| `flask` | HTTP web server |
| `flask-cors` | Allows cross-origin requests from Node.js |
| `tensorflow` | Loading and running the `.h5` model |
| `opencv-python` | Image decoding and color conversion |
| `numpy` | Array math and image manipulation |

---

## 🧪 Testing Your Server Manually

Once `python server.py` is running on port 5000, you can test it with curl or Postman:

```bash
# Quick health check — does the server respond?
curl http://127.0.0.1:5000/predict -X POST \
  -H "Content-Type: application/json" \
  -d "{\"image\": \"invalid\"}"
# Expected: {"error": "Couldn't decode image"}
# This confirms Flask is running and the route is reachable
```

---

## 📋 Summary — Your Checklist

| Task | Command |
|------|---------|
| Install Python packages | `pip install flask flask-cors tensorflow opencv-python numpy` |
| Collect training images | Take 80+ photos per gesture, place in `dataset/fist/` and `dataset/palm/` |
| Train the model | `cd ml && python train_model.py` |
| Verify model exists | Check that `ml/saved_model.h5` exists (~11 MB) |
| Start Flask server | `cd ml && python server.py` |
| Confirm it's running | Look for "LISTENING on port 5000" in the terminal |

---

*GestureLink Smart Home — Member 2: AI/ML Developer*
