# 🛠️ Member 1 — Backend Developer Guide
## GestureLink Smart Home | Node.js + Supabase

---

> **Your Role:** You are the backbone of this project. Every request from the browser passes through your code. You own the Node.js server, the database setup, the authentication system, and all the API routes that connect the frontend to the AI and cloud.

---

## 📦 Your Files

| File | Location | What It Is |
|------|----------|-----------|
| `server.js` | `backend/server.js` | The main Express.js web server |
| `.env` | `backend/.env` | Secret credentials (never share/commit this) |
| `package.json` | `backend/package.json` | Node.js project manifest and dependency list |
| `package-lock.json` | `backend/package-lock.json` | Auto-generated exact version lock file |
| `supabase_setup.sql` | `supabase_setup.sql` (root) | One-time SQL script to create the database table |

---

## 🧠 Your Responsibility in the System

Here's the full system and where YOUR code sits:

```
Browser (frontend) ──► YOUR server.js on Port 3000 ──► Python AI on Port 5000
                                   │
                                   └──► Supabase Cloud (Auth + Database)
```

- The **frontend** never talks to Supabase directly — it always goes through you.
- The **frontend** never talks to the Python AI directly — it always goes through you.
- You are the **trusted gatekeeper** who holds all the secret keys.

---

## 📄 File 1: `backend/server.js` — The Express Server

This is the most important file you own. It is a Node.js program that runs continuously as an HTTP server.

### How to start it

```bash
cd backend
node server.js
# OR if package.json has a start script:
npm start
```

You should see:
```
🚀 Smart Home Backend running at http://localhost:3000
📡 AI Proxy: http://127.0.0.1:5000/predict
```

### What it does on startup (lines 1–21)

```javascript
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Safety Check: Ensure credentials exist
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
    console.error("❌ ERROR: Supabase credentials missing in .env file!");
    process.exit(1);
}

// Connect to Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
```

**Step by step:**
1. `dotenv` loads the `.env` file — your Supabase keys and Flask URL now live in `process.env`
2. If the keys are missing, the server refuses to start (crash-early strategy)
3. `createClient()` opens a connection to the Supabase cloud project

### Middleware (lines 23–26)

```javascript
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '..', 'frontend')));
```

Middleware = code that runs for **every request** before the route handlers.

| Middleware | Why It's There |
|-----------|---------------|
| `cors()` | Allows the browser (different port) to make requests to this server |
| `bodyParser.json({ limit: '10mb' })` | Parses incoming JSON bodies — 10MB limit because Base64 images are big |
| `express.static('../frontend')` | Serves `login.html`, `index.html`, `app.js` automatically when the browser visits the URL |

### Route: POST `/auth/signup`

```javascript
app.post('/auth/signup', async (req, res) => {
    const { email, password } = req.body;
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return res.status(400).json({ error: error.message });
    res.json({ message: "Signup successful", user: data.user });
});
```

**What happens:**
1. Browser sends `{ email: "...", password: "..." }` as JSON
2. You pass those to Supabase Auth's `signUp()` method
3. Supabase creates the user in its internal auth table
4. You return success or the error message back to the browser

### Route: POST `/auth/login`

```javascript
app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return res.status(400).json({ error: error.message });
    res.json({ message: "Login successful", session: data.session });
});
```

**What happens:**
1. Browser sends credentials
2. Supabase verifies them and returns a **JWT session** object
3. You return that session to the browser — the browser saves it in `localStorage`
4. Future requests use this to know who the user is

> **What is a JWT?** A JSON Web Token — a digitally signed string that proves "this user is logged in." It expires after a while for security.

### Route: POST `/predict` — The AI Proxy

```javascript
app.post('/predict', async (req, res) => {
    try {
        const response = await axios.post(process.env.FLASK_SERVER_URL, req.body);
        res.json(response.data);
    } catch (error) {
        console.error("Flask Proxy Error:", error.message);
        res.status(500).json({ error: "Could not reach AI server" });
    }
});
```

**What happens:**
1. Browser sends `{ image: "data:image/jpeg;base64,/9j/..." }` — a Base64-encoded hand photo
2. You receive it on `/predict`
3. You forward it **as-is** to the Python Flask server using `axios.post()`
4. Flask returns `{ status, gesture, confidence, light, fan }`
5. You forward that response back to the browser

> **Why not let the browser call Flask directly?**  
> Because Flask is on port 5000 — the browser's CORS policy blocks cross-origin requests. Your server on port 3000 (same origin as the page) can make server-to-server calls without CORS restrictions.

### Route: POST `/log-state` — Database Insert

```javascript
app.post('/log-state', async (req, res) => {
    const { device, state, user_email } = req.body;
    const { data, error } = await supabase
        .from('device_states')
        .insert([{ device, state, user_email, timestamp: new Date().toISOString() }])
        .select();

    if (error) {
        console.error("Supabase Log Error:", error.message);
        return res.status(400).json({ error: error.message });
    }
    res.json({ message: "Logged saved", data });
});
```

**What happens:**
1. Browser sends `{ device: "Light", state: "ON", user_email: "you@mail.com" }`
2. You insert a new row into the `device_states` table in Supabase
3. Every gesture trigger becomes a permanent record in the cloud

### Route: GET `/logs` — Database Read

```javascript
app.get('/logs', async (req, res) => {
    const { data, error } = await supabase
        .from('device_states')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});
```

**What happens:**
1. Browser requests the recent activity log
2. You query Supabase for the 10 most recent rows, ordered by newest first
3. Returns them as a JSON array for the dashboard to render

### Complete Route Map

| Route | Method | Browser sends | You return |
|-------|--------|--------------|-----------|
| `/` | GET | nothing | `index.html` (served automatically) |
| `/login.html` | GET | nothing | `login.html` (served automatically) |
| `/auth/signup` | POST | `{ email, password }` | `{ message, user }` |
| `/auth/login` | POST | `{ email, password }` | `{ message, session }` |
| `/auth/logout` | POST | nothing | `{ message }` |
| `/predict` | POST | `{ image: base64 }` | `{ status, gesture, confidence, light, fan }` |
| `/log-state` | POST | `{ device, state, user_email }` | `{ message, data }` |
| `/logs` | GET | nothing | Array of last 10 log rows |
| `/health` | GET | nothing | `{ status: "ok" }` |

---

## 📄 File 2: `backend/.env` — Environment Secrets

```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
FLASK_SERVER_URL=http://127.0.0.1:5000/predict
PORT=3000
```

### Rules about this file

- ✅ It is listed in `.gitignore` — it is **never pushed to GitHub**
- ✅ It is loaded by `dotenv` at server startup — accessible as `process.env.VARIABLE_NAME`
- ❌ Never hardcode these values directly into `server.js`
- ❌ Never share this file in a group chat or email

### How to find the Supabase values

1. Go to [supabase.com](https://supabase.com) → Your project → **Settings → API**
2. Copy the **Project URL** → `SUPABASE_URL`
3. Copy the **anon/public key** → `SUPABASE_KEY`

---

## 📄 File 3: `backend/package.json` — Project Manifest

```json
{
  "name": "smart-home-gesture-backend",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.x.x",
    "@supabase/supabase-js": "^2.x.x",
    "axios": "^1.x.x",
    "cors": "^2.x.x",
    "body-parser": "^1.x.x",
    "dotenv": "^16.x.x"
  }
}
```

### What each dependency does

| Package | What It Does | Where It's Used in server.js |
|---------|-------------|------------------------------|
| `express` | Web framework — routing, middleware, static files | `const app = express()` |
| `@supabase/supabase-js` | Supabase SDK — Auth + Database | `createClient(url, key)` |
| `axios` | HTTP client — makes requests from Node to Flask | `axios.post(FLASK_URL, body)` |
| `cors` | Enables cross-origin requests | `app.use(cors())` |
| `body-parser` | Parses JSON request bodies | `app.use(bodyParser.json())` |
| `dotenv` | Loads `.env` file | `require('dotenv').config()` |

### How to install dependencies

```bash
cd backend
npm install
# This reads package.json and installs everything into node_modules/
```

---

## 📄 File 4: `supabase_setup.sql` — One-Time Database Setup

```sql
-- 1. Create the table
CREATE TABLE IF NOT EXISTS device_states (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    device TEXT NOT NULL,        -- "Light" or "Fan"
    state TEXT NOT NULL,         -- "ON" or "OFF"
    user_email TEXT,             -- who triggered it
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security (required by Supabase)
ALTER TABLE device_states ENABLE ROW LEVEL SECURITY;

-- 3. Allow anyone to insert rows (logging)
CREATE POLICY "Allow anonymous inserts"
ON device_states FOR INSERT WITH CHECK (true);

-- 4. Allow anyone to read rows (activity log)
CREATE POLICY "Allow public read access"
ON device_states FOR SELECT USING (true);

-- 5. Index for fast retrieval of latest logs
CREATE INDEX IF NOT EXISTS idx_device_states_created_at
ON device_states (created_at DESC);
```

### How to run this (one time only)

1. Go to [supabase.com](https://supabase.com) → Your Project → **SQL Editor**
2. Paste this entire file
3. Click **Run**
4. Done — the table exists permanently in your cloud database

### What each part means

| Part | Explanation |
|------|------------|
| `BIGINT GENERATED BY DEFAULT AS IDENTITY` | Auto-incrementing ID (1, 2, 3...) |
| `TIMESTAMPTZ` | Timestamp with timezone info |
| `ENABLE ROW LEVEL SECURITY` | Supabase requires this — without it, all queries are blocked |
| `CREATE POLICY ... WITH CHECK (true)` | Allows inserts from anyone (fine for a demo) |
| `CREATE INDEX ... (created_at DESC)` | Makes fetching the 10 latest logs fast |

---

## 🔗 How Your Code Connects to the Other Members

### You ↔ Member 2 (AI/Python)

```
Your /predict route → axios.post(http://127.0.0.1:5000/predict) → Member 2's Flask server
Member 2's Flask → returns JSON → your route → browser
```

- Member 2 must have their Flask server running on port 5000 **before** you start
- If Member 2's server is down, your `/predict` returns `"Could not reach AI server"`
- The `FLASK_SERVER_URL` in your `.env` is where you point to their server

### You ↔ Member 3 (Frontend)

```
Browser loads http://localhost:3000 → your express.static serves frontend/index.html
Browser calls fetch("/predict") → your route handles it
Browser calls fetch("/log-state") → your route handles it
```

- Member 3's files are served automatically by your `express.static()` call
- All their `fetch()` calls use relative paths (`/predict`, `/logs`) — they always go to you

---

## 🚀 How to Start Your Part

```bash
# Step 1 — Install dependencies (first time only)
cd d:\project\smart_home_gesture\backend
npm install

# Step 2 — Start the server
node server.js

# You should see:
# 🚀 Smart Home Backend running at http://localhost:3000
# 📡 AI Proxy: http://127.0.0.1:5000/predict
```

> ⚠️ Make sure Member 2's Flask server (`python server.py`) is running **first** on port 5000, otherwise gesture prediction will fail.

---

## 🧪 How to Test Your Routes (Without the Frontend)

Use any HTTP tool (Postman, curl, browser DevTools):

```bash
# Health check (open in browser)
GET http://localhost:3000/health
# Expected: { "status": "ok", "supabase": true }

# Test login
POST http://localhost:3000/auth/login
Body: { "email": "test@test.com", "password": "password123" }

# Test logs fetch
GET http://localhost:3000/logs
# Expected: Array of up to 10 rows from device_states table
```

---

## 📋 Summary — Your Checklist

| Task | Command / Action |
|------|-----------------|
| Install dependencies | `cd backend && npm install` |
| Create `.env` with Supabase keys | Copy from Supabase dashboard → Settings → API |
| Set up database table | Paste `supabase_setup.sql` into Supabase SQL Editor |
| Start the server | `node server.js` |
| Verify it works | Open `http://localhost:3000/health` in browser |

---

*GestureLink Smart Home — Member 1: Backend Developer*
