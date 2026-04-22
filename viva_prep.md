# 🎓 Viva Preparation — Smart Home Gesture Control

> **Objective:** Punchy, confident answers for every possible question.

---

## 🚀 1. The 30-Second Pitch

**"What is your project about?"**
> "It's a **Full-Stack Smart Home Controller**. We use Computer Vision (MediaPipe) to detect hands in the browser, a **Node.js/Express** server for authenticated access and cloud logging, and a **Python/Flask** AI microservice running a custom **MobileNetV2 CNN** to classify gestures. Basically: I show my palm or fist, and my lights and fan toggle instantly while being logged to a cloud database (Supabase)."

---

## 🧠 2. The AI Engine (The Brain)

**"What is a CNN and why use it?"**
> "A Convolutional Neural Network is built specifically for image processing. It uses 'filters' to detect features like fingers or palm lines. Unlike regular networks, CNNs understand spatial relationships, making them perfect for identifying hand shapes regardless of where they are in the frame."

**"Explain your model architecture."**
> "We use **Transfer Learning** with **MobileNetV2**. It’s a state-of-the-art model pre-trained on millions of images. We froze the base layers and only trained a custom 'head' on our gesture dataset. This gave us ~96% accuracy with very low computation cost."

**"What is the role of MediaPipe?"**
> "MediaPipe handles the 'Detection' phase within the browser. It finds the hand and returns 21 landmark points. We then use those points to crop just the hand region, which is what we send to our CNN for 'Classification'. This dual-stage pipeline is 90% more bandwidth-efficient than sending full video frames."

---

## 🌉 3. The Full-Stack Bridge (The Plumbing)

**"Why use both Node.js and Python?"**
> "This is a **Single Responsibility Architecture**. Node.js is industry-standard for handling users, security (Auth), and fast I/O. Python is the gold standard for ML and Computer Vision. By using both, we get the best of both worlds—a secure, scalable app server and a high-performance AI inference engine."

**"How does the database logging work?"**
> "We use **Supabase (PostgreSQL)**. Every time a gesture is recognized, the Node.js server inserts a row into the cloud database with the device name, the new state, and the user's email. This creates a secure audit trail for IoT monitoring."

**"What is the Cooldown and Confidence Gate?"**
> - **82% Confidence**: To prevent 'ghost triggers' from random hand movements.
> - **2-Second Cooldown**: To prevent flickering (one palm = only one toggle).

---

## 🏁 4. Quick-Fire Round (1-Line Answers)

- **Input Size:** 128 x 128 (RGB).
- **Activation:** ReLU (hidden layers), Softmax (output).
- **Optimizer:** Adam.
- **Classes:** 2 (Fist and Palm).
- **Tech Stack:** HTML/CSS (Frontend), Node.js (App Server), Flask (AI Server), Supabase (Cloud DB).
- **Hand Landmarks:** 21 points (via MediaPipe).
- **Dataset:** Rock-Paper-Scissors (RPS) repurposed.

---

## ⚠️ 5. Project Limitations (Be Honest)
- **Lighting**: Works best in well-lit rooms.
- **Hardware**: It's a simulation (UI cards) — real IoT needs MQTT/GPIO.
- **Single User**: Currently follows only one hand at a time.
