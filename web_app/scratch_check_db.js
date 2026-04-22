require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function checkTable() {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
    const { data, error } = await supabase.from('device_states').select('*').limit(1);
    if (error) {
        console.error("Table check failed:", error.message);
    } else {
        console.log("Table check success. Data count:", data.length);
    }
}
checkTable();
