# 🏗️ How This Project Was Built: 5 Phases

This document records the creation of the **Full-Stack Smart Home Gesture Control** system.

---

## 🛠️ The Construction Path

### Phase 1: Cloud Foundation (Database)
-   **Supabase Setup**: Initialized the PostgreSQL cloud database and configured **JWT Auth**.
-   **SQL Schema**: Executed scripts to build the `device_states` audit log table.

### Phase 2: AI Intelligence (Machine Learning)
-   **Architecture**: Chose **MobileNetV2** for hardware-efficient gesture classification.
-   **Training**: Ran `train_model.py` with data augmentation to handle real-world lighting.

### Phase 3: The Brain (AI Engine)
-   **Flask API**: Developed a Python microservice to host the TensorFlow model.
-   - **Logic Gate**: Built an **82% Confidence Filter** and a **2-second cooldown** to prevent false triggers.

### Phase 4: The Bridge (Web App Server)
-   **Node.js Gateway**: Built the primary app controller using Express.js.
-   **Security**: Integrated authenticated proxying to protect the AI resources and log events to the cloud.

### Phase 5: The Interface (Dashboard)
-   **Real-time Vision**: Integrated **MediaPipe Hands** for sub-30ms tracking in the browser.
-   **Reactivity**: Built a glassmorphism UI that reacts instantly to AI triggers.

---

## 📂 Documentation Directory

| File | Use it when... |
| :--- | :--- |
| **project_explanation.md** | You need to explain the system architecture to a professor. |
| **viva_prep.md** | You are studying for your final project defense/exam. |
| **developer_cheatsheet.md** | You need to change settings (sensitivity, colors, ports) quickly. |
| **demo_guide.md** | You are preparing for your live project presentation. |
| **how_it_works.md** | You want to trace a gesture's journey from camera to cloud. |
