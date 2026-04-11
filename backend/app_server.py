import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
import numpy as np
import cv2
import time
from tensorflow.keras.models import load_model
from backend.backend_api import send_to_db

app = Flask(__name__)
CORS(app)

# --- load the trained CNN ---
try:
    model = load_model("ml/saved_model.h5")
    print("Model loaded.")
except Exception as e:
    print(f"Could not load model: {e}")
    model = None

classes = ["fist", "palm"]

# device states (kept in memory, not persisted across restarts)
light_state = "OFF"
fan_state = "OFF"

last_trigger_time = 0
COOLDOWN = 2  # seconds between toggles to prevent flickering


@app.route('/predict', methods=['POST'])
def predict_gesture():
    global light_state, fan_state, last_trigger_time

    if not model:
        return jsonify({"error": "Model not loaded"}), 500

    data = request.json
    if "image" not in data:
        return jsonify({"error": "No image in request"}), 400

    encoded_data = data["image"].split(',')[1] if ',' in data["image"] else data["image"]

    try:
        # decode the base64 image from the browser
        image_bytes = base64.b64decode(encoded_data)
        nparr = np.frombuffer(image_bytes, np.uint8)
        img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img_bgr is None:
            return jsonify({"error": "Couldn't decode image"}), 400

        # preprocess for the CNN
        roi_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
        img = cv2.resize(roi_rgb, (128, 128))
        # removed GaussianBlur to keep features sharp as per training
        img = img / 255.0
        img = np.expand_dims(img, axis=0)

        # run inference
        prediction = model.predict(img, verbose=0)
        confidence = float(np.max(prediction))
        gesture = classes[np.argmax(prediction)]

        # DEBUG: Print raw prediction to diagnose classification
        print(f"🔍 DEBUG | Raw prediction: {prediction[0]} | argmax: {np.argmax(prediction)} | gesture: {gesture} | confidence: {confidence:.3f}")
        sys.stdout.flush()

        # ignore low-confidence guesses
        if confidence < 0.82:
            return jsonify({
                "status": "ignored",
                "reason": f"Low confidence ({confidence:.2f})",
                "gesture": gesture,
                "confidence": confidence,
                "light": light_state,
                "fan": fan_state
            })

        # cooldown — don't toggle if we just toggled
        current_time = time.time()
        if current_time - last_trigger_time < COOLDOWN:
            return jsonify({
                "status": "ignored",
                "reason": "Cooldown",
                "gesture": gesture,
                "confidence": confidence,
                "light": light_state,
                "fan": fan_state
            })

        # actually toggle the device
        command = None
        action_taken = ""

        if gesture == "palm":
            light_state = "ON" if light_state == "OFF" else "OFF"
            last_trigger_time = current_time
            command = {"device": "Light", "state": light_state}
            action_taken = f"Light turned {light_state}"

        elif gesture == "fist":
            fan_state = "ON" if fan_state == "OFF" else "OFF"
            last_trigger_time = current_time
            command = {"device": "Fan", "state": fan_state}
            action_taken = f"Fan turned {fan_state}"

        if command:
            send_to_db(command)
            return jsonify({
                "status": "triggered",
                "action": action_taken,
                "gesture": gesture,
                "confidence": confidence,
                "light": light_state,
                "fan": fan_state
            })

        return jsonify({"status": "no_action", "light": light_state, "fan": fan_state})

    except Exception as e:
        print(f"Error during prediction: {e}")
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    print("\n--- Smart Home Gesture Server ---")
    print("Listening on http://127.0.0.1:5000\n")
    app.run(host='127.0.0.1', port=5000)
