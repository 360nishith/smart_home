import sys
from backend.db_config import supabase

def send_to_db(command):
    """Insert a device state change into supabase."""
    data = {
        "device": command["device"],
        "state": command["state"]
    }

    try:
        supabase.table("device_states").insert(data).execute()
        print(f"DB updated: {command['device']} -> {command['state']}")
        sys.stdout.flush()
    except Exception as e:
        print(f"DB error: {e}")
        sys.stdout.flush()
