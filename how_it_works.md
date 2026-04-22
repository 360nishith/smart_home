# ⚙️ How It Works: The 10-Step Journey

From a hand movement to a spinning fan—here is the exact path:

1.  **Secure Entry**: User logs in. **Supabase Auth** validates and saves a secure session.
2.  **Vision Link**: The Browser calls the webcam and initializes **MediaPipe**.
3.  **Skeleton Mode**: MediaPipe tracks **21 hand joints** in real-time within your browser.
4.  **Smart Snapshot**: We capture a square crop of your hand to ensure high AI accuracy.
5.  **Proxy Bridge**: The image is sent to the **Web App Server** (Node.js) for security verification.
6.  **AI Engine**: Node.js forwards the image to the **AI Engine** (Python) for processing.
7.  **Neural Classification**: The **MobileNetV2 CNN** model analyzes the image.
8.  **The Trigger**: If confidence is $>82\%$, the AI sends a 'Trigger' command back.
9.  **Cloud Logging**: The Node server saves the action (Device, State, Time) to **Supabase Database**.
10. **UI Glow**: The icons light up, the fan spins, and the 'Recent Activity' log refreshes instantly!

---

### 🧱 The Architecture Layers
- **Layer 1: The Eye** (Frontend + MediaPipe)
- **Layer 2: The Logic** (Node.js + Supabase Auth)
- **Layer 3: The Brain** (Python + TensorFlow AI)
- **Layer 4: The Memory** (Supabase Cloud Database)
