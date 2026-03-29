"""Migrate local tPlan workout logs to Azure Table Storage.

Reads all JSON log files from tPlan/logs/ and uploads them to the
tplanLogs table in Azure Table Storage, keyed by the real user's
SWA userId. Also seeds the global programs if not present.
"""
import json, os, sys, glob

try:
    from azure.data.tables import TableServiceClient, UpdateMode
except ImportError:
    print("Installing azure-data-tables...")
    os.system(f"{sys.executable} -m pip install azure-data-tables -q")
    from azure.data.tables import TableServiceClient, UpdateMode

# Get connection string
CS = os.environ.get("STORAGE_CONNECTION_STRING", "")
if not CS:
    # Fetch from Azure CLI
    import subprocess
    result = subprocess.run(
        ["az", "storage", "account", "show-connection-string",
         "--name", "tplanstorage", "--resource-group", "rg-personal-agents", "-o", "tsv"],
        capture_output=True, text=True
    )
    CS = result.stdout.strip()

if not CS:
    print("ERROR: No STORAGE_CONNECTION_STRING found. Set it or login to az CLI.")
    sys.exit(1)

service = TableServiceClient.from_connection_string(CS)
LOGS_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "logs")

# We need the real SWA userId for the user.
# Since the user logs in with Google (d.146099412+samoletovs@users.noreply.github.comgmail.com), the SWA generates
# a userId from the identity provider. We'll use a placeholder that the seed
# endpoint will later adopt, OR we use the actual userId from SWA auth.
# For now, we'll use a known identifier and the app will match on first login.
USER_ID = "migrate-pending"  # Will be remapped on first login

def ensure_table(name):
    """Create table if it doesn't exist."""
    try:
        service.create_table(name)
        print(f"  Created table: {name}")
    except Exception as e:
        if "TableAlreadyExists" in str(e):
            pass
        else:
            raise

def migrate_logs():
    """Upload all JSON log files to tplanLogs table."""
    ensure_table("tplanLogs")
    table = service.get_table_client("tplanLogs")

    log_files = sorted(glob.glob(os.path.join(LOGS_DIR, "*.json")))
    print(f"\nFound {len(log_files)} log files to migrate:")

    for filepath in log_files:
        filename = os.path.basename(filepath)
        date = filename.replace(".json", "")
        
        with open(filepath, "r", encoding="utf-8") as f:
            log_data = json.load(f)

        log_id = f"{date}-{log_data.get('timestamp', '').replace(':', '-').replace('.', '-')[:19]}"

        # Normalize field names (local logs use snake_case, API uses camelCase)
        normalized = {
            "id": log_id,
            "userId": USER_ID,
            "date": log_data.get("date", date),
            "day": log_data.get("day", ""),
            "week": log_data.get("week", 1),
            "workout": log_data.get("workout", ""),
            "durationMin": log_data.get("duration_min", 0),
            "bodyWeightKg": log_data.get("body_weight_kg"),
            "streak": log_data.get("streak", 0),
            "exercises": log_data.get("exercises", []),
            "notes": log_data.get("notes", ""),
            "timestamp": log_data.get("timestamp", ""),
            "programId": "convict-conditioning",  # Default; gym logs would be dumbbell-gymnastics
        }

        # Detect if this is a gym/dumbbell log
        exercises = normalized["exercises"]
        if any("Гантели" in (e.get("set", "") or "") for e in exercises):
            normalized["programId"] = "mixed"  # Has both CC and dumbbell exercises

        entity = {
            "PartitionKey": USER_ID,
            "RowKey": log_id,
            "data": json.dumps(normalized, ensure_ascii=False),
        }

        try:
            table.upsert_entity(entity, mode=UpdateMode.REPLACE)
            ex_count = len(exercises)
            print(f"  ✓ {date}: {normalized['workout']} ({ex_count} exercises, {normalized['durationMin']} min)")
        except Exception as e:
            print(f"  ✗ {date}: {e}")

def seed_programs():
    """Ensure global programs exist in tplanPrograms table."""
    ensure_table("tplanPrograms")
    table = service.get_table_client("tplanPrograms")

    cc_program = {
        "PartitionKey": "global",
        "RowKey": "convict-conditioning",
        "name": "Convict Conditioning",
        "description": "Progressive bodyweight calisthenics system by Paul Wade. 6 movements, 10 levels each.",
        "type": "calisthenics",
        "source": "ConvictConditioning_Vol1.md",
        "exercises": json.dumps([
            {"id": "pushups", "name": "Push-ups", "type": "reps", "technique": "Full push-ups on floor, hands shoulder-width", "tempo": "2-1-2", "restBetweenSets": 60, "defaultSets": 2, "defaultReps": 5, "startLevel": 1, "slots": ["A", "B"]},
            {"id": "legRaises", "name": "Leg Raises", "type": "reps", "technique": "Lying flat, raise straight legs to vertical", "tempo": "2-1-2", "restBetweenSets": 60, "defaultSets": 2, "defaultReps": 5, "startLevel": 1, "slots": ["A"]},
            {"id": "squats", "name": "Squats", "type": "reps", "technique": "Full depth bodyweight squats", "tempo": "2-1-2", "restBetweenSets": 60, "defaultSets": 2, "defaultReps": 5, "startLevel": 1, "slots": ["A"]},
            {"id": "bridges", "name": "Bridges", "type": "reps", "technique": "Short bridges - lying, press hips up", "tempo": "2-1-2", "restBetweenSets": 60, "defaultSets": 2, "defaultReps": 10, "startLevel": 1, "slots": ["B"]},
            {"id": "plank", "name": "Plank", "type": "timed", "technique": "Forearm plank, core tight, body straight", "tempo": "hold", "restBetweenSets": 0, "defaultSets": 1, "defaultReps": 60, "startLevel": 1, "slots": ["A", "B"]},
        ]),
        "levels": json.dumps([
            {"exerciseId": "pushups", "level": 1, "name": "Wall Push-ups", "technique": "Stand arm's length from wall, push-up against it", "beginnerReps": 10, "advancedReps": 25},
            {"exerciseId": "pushups", "level": 2, "name": "Incline Push-ups", "technique": "Hands on elevated surface (table/chair)", "beginnerReps": 10, "advancedReps": 20},
            {"exerciseId": "pushups", "level": 3, "name": "Kneeling Push-ups", "technique": "On knees, straight line from head to knees", "beginnerReps": 10, "advancedReps": 15},
            {"exerciseId": "pushups", "level": 4, "name": "Half Push-ups", "technique": "Standard position, lower halfway", "beginnerReps": 8, "advancedReps": 15},
            {"exerciseId": "pushups", "level": 5, "name": "Full Push-ups", "technique": "Full range of motion, chest to floor", "beginnerReps": 5, "advancedReps": 20},
            {"exerciseId": "pushups", "level": 6, "name": "Close Push-ups", "technique": "Hands touching, diamond position", "beginnerReps": 5, "advancedReps": 20},
            {"exerciseId": "legRaises", "level": 1, "name": "Knee Tucks", "technique": "Lying flat, pull knees to chest", "beginnerReps": 10, "advancedReps": 25},
            {"exerciseId": "legRaises", "level": 2, "name": "Flat Knee Raises", "technique": "Lying flat, raise bent knees", "beginnerReps": 10, "advancedReps": 20},
            {"exerciseId": "legRaises", "level": 3, "name": "Flat Bent Leg Raises", "technique": "Lying flat, raise legs with slight bend", "beginnerReps": 10, "advancedReps": 15},
            {"exerciseId": "legRaises", "level": 4, "name": "Flat Frog Raises", "technique": "Lying flat, frog-kick leg raises", "beginnerReps": 8, "advancedReps": 15},
            {"exerciseId": "legRaises", "level": 5, "name": "Straight Leg Raises", "technique": "Lying flat, raise fully straight legs to vertical", "beginnerReps": 5, "advancedReps": 20},
            {"exerciseId": "squats", "level": 1, "name": "Shoulderstand Squats", "technique": "On back, legs up, bend/extend knees", "beginnerReps": 10, "advancedReps": 25},
            {"exerciseId": "squats", "level": 2, "name": "Jackknife Squats", "technique": "Hold support, squat with assistance", "beginnerReps": 10, "advancedReps": 20},
            {"exerciseId": "squats", "level": 3, "name": "Supported Squats", "technique": "Light hand support on doorframe", "beginnerReps": 10, "advancedReps": 15},
            {"exerciseId": "squats", "level": 4, "name": "Half Squats", "technique": "Squat to 90 degrees", "beginnerReps": 8, "advancedReps": 25},
            {"exerciseId": "squats", "level": 5, "name": "Full Squats", "technique": "Full depth, hamstrings touch calves", "beginnerReps": 5, "advancedReps": 30},
            {"exerciseId": "bridges", "level": 1, "name": "Short Bridges", "technique": "On back, knees bent, press hips up", "beginnerReps": 10, "advancedReps": 50},
            {"exerciseId": "bridges", "level": 2, "name": "Straight Bridges", "technique": "Legs straight, hands by sides, hips up", "beginnerReps": 10, "advancedReps": 40},
            {"exerciseId": "bridges", "level": 3, "name": "Angled Bridges", "technique": "Hands on elevated surface, bridge up", "beginnerReps": 8, "advancedReps": 30},
            {"exerciseId": "bridges", "level": 4, "name": "Head Bridges", "technique": "Bridge up onto head, hands assist", "beginnerReps": 8, "advancedReps": 25},
            {"exerciseId": "bridges", "level": 5, "name": "Half Bridges", "technique": "From standing, bridge back halfway", "beginnerReps": 8, "advancedReps": 20},
        ]),
        "progressionRules": json.dumps({"repsIncrement": 2, "consecutiveEasyThreshold": 2, "levelUpAtMaxReps": True}),
        "createdAt": "2026-02-21T00:00:00Z",
    }

    db_program = {
        "PartitionKey": "global",
        "RowKey": "dumbbell-gymnastics",
        "name": "Dumbbell Gymnastics",
        "description": "Classic Russian dumbbell complex. 13 exercises targeting full body with light dumbbells (3-4 kg).",
        "type": "weights",
        "source": "DumbbellGymnastics.md",
        "exercises": json.dumps([
            {"id": "tennis-ball", "name": "Tennis Ball Squeeze", "type": "reps", "technique": "Squeeze tennis ball, hold 2s per rep", "tempo": "2-2-0", "restBetweenSets": 20, "defaultSets": 1, "defaultReps": 8, "startLevel": 1, "slots": ["evening"]},
            {"id": "bicep-curl", "name": "Bicep Curl", "type": "reps", "technique": "Standing strict bicep curl", "tempo": "2-0-2", "restBetweenSets": 20, "defaultSets": 1, "defaultReps": 5, "startLevel": 1, "slots": ["evening"]},
            {"id": "reverse-curl", "name": "Reverse Curl", "type": "reps", "technique": "Standing reverse grip curl", "tempo": "2-0-2", "restBetweenSets": 20, "defaultSets": 1, "defaultReps": 5, "startLevel": 1, "slots": ["evening"]},
            {"id": "french-press", "name": "French Press", "type": "reps", "technique": "Overhead tricep extension (behind head)", "tempo": "2-0-2", "restBetweenSets": 20, "defaultSets": 1, "defaultReps": 5, "startLevel": 1, "slots": ["evening"]},
            {"id": "front-raise", "name": "Front Raise", "type": "reps", "technique": "Standing front dumbbell raise to shoulder height", "tempo": "2-0-2", "restBetweenSets": 20, "defaultSets": 1, "defaultReps": 5, "startLevel": 1, "slots": ["evening"]},
            {"id": "bench-press", "name": "Dumbbell Bench Press", "type": "reps", "technique": "Lying on floor/bench, press dumbbells up", "tempo": "2-0-2", "restBetweenSets": 20, "defaultSets": 1, "defaultReps": 5, "startLevel": 1, "slots": ["evening"]},
            {"id": "neck-raise", "name": "Neck Raise", "type": "reps", "technique": "Lying face up, weight on forehead, raise head", "tempo": "2-0-2", "restBetweenSets": 20, "defaultSets": 1, "defaultReps": 5, "startLevel": 1, "slots": ["evening"]},
            {"id": "back-extension", "name": "Back Extension", "type": "reps", "technique": "Bent over, extend back with dumbbells", "tempo": "2-0-2", "restBetweenSets": 20, "defaultSets": 1, "defaultReps": 5, "startLevel": 1, "slots": ["evening"]},
            {"id": "side-bend", "name": "Side Bend", "type": "reps", "technique": "Standing side bends with dumbbell", "tempo": "2-0-2", "restBetweenSets": 20, "defaultSets": 1, "defaultReps": 6, "startLevel": 1, "slots": ["evening"]},
            {"id": "db-squat", "name": "Dumbbell Squat", "type": "reps", "technique": "Full squat holding dumbbells at sides", "tempo": "2-0-2", "restBetweenSets": 20, "defaultSets": 1, "defaultReps": 5, "startLevel": 1, "slots": ["evening"]},
            {"id": "calf-raise", "name": "Calf Raise", "type": "reps", "technique": "Standing calf raises holding dumbbells", "tempo": "2-0-2", "restBetweenSets": 20, "defaultSets": 1, "defaultReps": 10, "startLevel": 1, "slots": ["evening"]},
            {"id": "wrist-curl", "name": "Wrist Curl", "type": "reps", "technique": "Seated, forearm on thigh, curl wrist up", "tempo": "2-0-2", "restBetweenSets": 20, "defaultSets": 1, "defaultReps": 8, "startLevel": 1, "slots": ["evening"]},
            {"id": "reverse-wrist", "name": "Reverse Wrist Curl", "type": "reps", "technique": "Seated, reverse grip wrist curl", "tempo": "2-0-2", "restBetweenSets": 20, "defaultSets": 1, "defaultReps": 8, "startLevel": 1, "slots": ["evening"]},
        ]),
        "levels": json.dumps([]),
        "progressionRules": json.dumps({"repsIncrement": 1, "consecutiveEasyThreshold": 3, "levelUpAtMaxReps": False}),
        "createdAt": "2026-02-21T00:00:00Z",
    }

    for prog in [cc_program, db_program]:
        try:
            table.upsert_entity(prog, mode=UpdateMode.REPLACE)
            print(f"  \u2713 Program: {prog['RowKey']} ({prog['name']})")
        except Exception as e:
            print(f"  \u2717 Program {prog['RowKey']}: {e}")

def create_tables():
    """Ensure all required tables exist."""
    for name in ["tplanUsers", "tplanSchedules", "tplanPrograms", "tplanLogs", "tplanWorkouts"]:
        ensure_table(name)

if __name__ == "__main__":
    print("=== tPlan Data Migration ===\n")
    print("1. Creating tables...")
    create_tables()
    print("\n2. Seeding programs...")
    seed_programs()
    print("\n3. Migrating logs...")
    migrate_logs()
    print("\n=== Migration complete! ===")
    print(f"\nNote: Logs uploaded with userId='{USER_ID}'.")
    print("On first login, the /api/seed endpoint will create the user profile.")
    print("A one-time remap will be needed to associate migrated logs with the real SWA userId.")
