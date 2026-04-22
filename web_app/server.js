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
    console.error("\n❌ ERROR: Supabase credentials missing in .env file!");
    console.error("Check that web_app/.env exists and contains SUPABASE_URL and SUPABASE_KEY.\n");
    process.exit(1);
}

// Supabase Setup
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// --- Authentication Routes ---

// Signup
app.post('/auth/signup', async (req, res) => {
    const { email, password } = req.body;
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return res.status(400).json({ error: error.message });
    res.json({ message: "Signup successful", user: data.user });
});

// Login
app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return res.status(400).json({ error: error.message });
    res.json({ message: "Login successful", session: data.session });
});

// Logout (Frontend just clears session, but we can have an endpoint)
app.post('/auth/logout', async (req, res) => {
    const { error } = await supabase.auth.signOut();
    if (error) return res.status(400).json({ error: error.message });
    res.json({ message: "Logged out" });
});

// --- AI & Logic Routes ---

// Proxy Prediction to Flask
app.post('/predict', async (req, res) => {
    try {
        const response = await axios.post(process.env.FLASK_SERVER_URL, req.body);
        res.json(response.data);
    } catch (error) {
        console.error("Flask Proxy Error:", error.message);
        res.status(500).json({ error: "Could not reach AI server" });
    }
});

// Log Device State Change to DB
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

// Fetch Recent Logs (Data Retrieval)
app.get('/logs', async (req, res) => {
    const { data, error } = await supabase
        .from('device_states')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error("Supabase Fetch Error:", error.message);
        return res.status(400).json({ error: error.message });
    }
    res.json(data);
});

// Serve frontend - fallback for all other requests
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`\n🚀 Web App Server running at http://localhost:${PORT}`);
    console.log(`📡 Proxying AI requests to: ${process.env.FLASK_SERVER_URL}\n`);
});
