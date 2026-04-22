# 🎬 Live Demo Guide: Smart Home Gesture Control

> **Objective:** A flawless 3-minute demonstration for your evaluators.

---

## 🛠️ Phase 1: Setup (2 Minutes Before)

1.  **Start AI Server**: `cd backend` -> `python app_server.py`
2.  **Start Web Server**: `cd web_app` -> `node server.js`
3.  **Prepare Browser**: Open `http://localhost:3000` and Login.

---

## 🚪 Phase 2: The Pitch (0:00 - 0:30)

**Script:** *"This is a **Full-Stack AI Home Controller**. It uses a bridge architecture: **Node.js** for security and logging, and **Python** for real-time AI inference. I'll start by logging into my secure dashboard."*

- **Action:** **Log in** to show the Supabase Auth integration.

---

## 🖐️ Phase 3: Gesture Control (0:30 - 2:00)

**Script:** *"MediaPipe tracks my hand landmarks in the browser, while our custom CNN model classifies the gesture on the server."*

1.  **Toggle Light**: Show a **Steady Palm**. 
    - *Highlight:* The **Light Card** glowing green + Status update.
2.  **Toggle Fan**: Show a **Closed Fist**. 
    - *Highlight:* The **Fan Card** glowing + **Fan Emoji spinning** (real-time state feedback).
3.  **Throttling**: Show a random hand movement. 
    - *Highlight:* *"The 82% confidence gate prevents accidental triggers."*

---

## 📊 Phase 4: Data Logging (2:00 - 3:00)

**Script:** *"Every action is recorded in our cloud audit log."*

- **Action:** Point to the **Recent Activity** list.
- **Explain:** *"These logs are fetched from **Supabase PostgreSQL**. It tracks which device was changed and by which user, creating a professional audit trail."*

---

## 💡 Quick Tips
- **Lighting**: Ensure your hand is well-lit (avoid shadows).
- **Cooldown**: Wait **2 seconds** between gestures (one palm = one trigger).
- **The "Wow" Factor**: Mention that detection happens at **30 FPS** in the browser.

---

## 🏁 The Closing
*"In summary, we've bridged **Computer Vision**, **Node.js**, and **Cloud Databases** into a single, accessible solution. Any questions?"*
