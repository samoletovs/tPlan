"""Validate tPlan app pages with mocked auth and API responses."""
from playwright.sync_api import sync_playwright
import json, os

MOCK_USER = {
    "clientPrincipal": {
        "userId": "test-user-123",
        "userRoles": ["authenticated", "anonymous"],
        "identityProvider": "google",
        "userDetails": "d.146099412+samoletovs@users.noreply.github.comgmail.com",
        "claims": [{"typ": "name", "val": "Sam"}, {"typ": "email", "val": "d.146099412+samoletovs@users.noreply.github.comgmail.com"}]
    }
}

MOCK_PROFILE = {
    "userId": "test-user-123", "email": "d.146099412+samoletovs@users.noreply.github.comgmail.com", "displayName": "Sam",
    "avatarUrl": "", "locale": "en", "createdAt": "2026-02-21T00:00:00Z",
    "currentLevels": {
        "pushups": {"level": 5, "sets": 2, "reps": 11, "consecutiveEasy": 0},
        "legRaises": {"level": 5, "sets": 2, "reps": 5, "consecutiveEasy": 0},
        "squats": {"level": 5, "sets": 2, "reps": 11, "consecutiveEasy": 0},
        "bridges": {"level": 1, "sets": 2, "reps": 10, "consecutiveEasy": 0},
        "plank": {"durationSec": 60, "consecutiveEasy": 0},
        "dumbbells": {
            "weightKg": 3.5,
            "reps": {"Bicep curl": 5, "French press": 5, "Front raise": 5, "Bench press": 5, "Side bend": 6, "Back extension": 5, "Calf raise": 10},
            "consecutiveEasy": {}
        }
    },
    "preferences": {"defaultDifficulty": "easy", "restTimerEnabled": True, "soundEnabled": True, "weekStartsOn": "monday"},
    "enrolledPrograms": ["convict-conditioning", "dumbbell-gymnastics"]
}

MOCK_DASHBOARD = {
    "totalWorkouts": 11, "totalMinutes": 432, "totalSets": 77, "totalReps": 941,
    "currentStreak": 2, "maxStreak": 11, "lastWeight": 84.8,
    "weightHistory": [{"date": "2026-02-21", "weight": 85}, {"date": "2026-02-25", "weight": 84.5}, {"date": "2026-03-22", "weight": 85}, {"date": "2026-03-25", "weight": 84.8}],
    "repsPerExercise": [{"date": "2026-02-21", "exercise": "Push-ups", "reps": 14}, {"date": "2026-03-25", "exercise": "Push-ups", "reps": 22}, {"date": "2026-02-21", "exercise": "Squats", "reps": 14}, {"date": "2026-03-25", "exercise": "Squats", "reps": 22}],
    "difficultyDistribution": [{"date": "2026-02-21", "easy": 5, "normal": 2, "hard": 0}, {"date": "2026-03-25", "easy": 7, "normal": 1, "hard": 1}]
}

MOCK_LOGS = [
    {"id": "log1", "userId": "test", "date": "2026-03-26", "day": "Thursday", "week": 5, "workout": "Calisthenics A", "durationMin": 32, "bodyWeightKg": 84.8, "streak": 3,
     "exercises": [
         {"name": "Full Push-ups", "set": "Level 5 - Set 1 of 2", "planned": 11, "actual": 11, "difficulty": "easy", "notes": ""},
         {"name": "Full Push-ups", "set": "Level 5 - Set 2 of 2", "planned": 11, "actual": 11, "difficulty": "easy", "notes": ""},
         {"name": "Straight Leg Raises", "set": "Level 5 - Set 1 of 2", "planned": 5, "actual": 5, "difficulty": "normal", "notes": ""},
         {"name": "Full Squats", "set": "Level 5 - Set 1 of 2", "planned": 11, "actual": 11, "difficulty": "easy", "notes": ""},
         {"name": "Plank", "set": "Hold - 60s", "planned": 60, "actual": 60, "difficulty": "easy", "notes": ""}
     ], "notes": "", "timestamp": "2026-03-26T11:33:39Z"},
    {"id": "log2", "userId": "test", "date": "2026-03-25", "day": "Wednesday", "week": 5, "workout": "Calisthenics B + Dumbbells", "durationMin": 45, "bodyWeightKg": 84.8, "streak": 2,
     "exercises": [
         {"name": "Full Push-ups", "set": "Level 5 - Set 1 of 2", "planned": 11, "actual": 11, "difficulty": "normal", "notes": ""},
         {"name": "Short Bridges", "set": "Level 1 - Set 1 of 2", "planned": 10, "actual": 10, "difficulty": "easy", "notes": ""}
     ], "notes": "Good session", "timestamp": "2026-03-25T11:00:00Z"}
]

MOCK_SCHEDULE = {
    "userId": "test", "updatedAt": "2026-03-20T00:00:00Z",
    "weeklySchedule": {
        "mon": [{"programId": "convict-conditioning", "slot": "B"}],
        "tue": [{"programId": "convict-conditioning", "slot": "A"}],
        "wed": [{"programId": "convict-conditioning", "slot": "B"}, {"programId": "dumbbell-gymnastics", "slot": "evening"}],
        "thu": [{"programId": "convict-conditioning", "slot": "A"}],
        "fri": [{"programId": "convict-conditioning", "slot": "B"}],
        "sat": [{"programId": "convict-conditioning", "slot": "A"}, {"programId": "dumbbell-gymnastics", "slot": "evening"}],
        "sun": [{"programId": "convict-conditioning", "slot": "B"}]
    },
    "programs": []
}

MOCK_PROGRAMS = [
    {"id": "convict-conditioning", "name": "Convict Conditioning", "description": "Bodyweight calisthenics from Paul Wade", "type": "calisthenics",
     "exercises": [
         {"id": "pushups", "name": "Push-ups", "type": "reps", "technique": "Full push-ups", "tempo": "2-1-2", "restBetweenSets": 60, "defaultSets": 2, "defaultReps": 5, "startLevel": 1, "slots": ["A", "B"]},
         {"id": "legRaises", "name": "Leg Raises", "type": "reps", "technique": "Straight leg raises", "tempo": "2-1-2", "restBetweenSets": 60, "defaultSets": 2, "defaultReps": 5, "startLevel": 1, "slots": ["A"]},
         {"id": "squats", "name": "Squats", "type": "reps", "technique": "Full squats", "tempo": "2-1-2", "restBetweenSets": 60, "defaultSets": 2, "defaultReps": 5, "startLevel": 1, "slots": ["A"]},
         {"id": "bridges", "name": "Bridges", "type": "reps", "technique": "Short bridges", "tempo": "2-1-2", "restBetweenSets": 60, "defaultSets": 2, "defaultReps": 10, "startLevel": 1, "slots": ["B"]},
         {"id": "plank", "name": "Plank", "type": "timed", "technique": "Forearm plank", "tempo": "hold", "restBetweenSets": 0, "defaultSets": 1, "defaultReps": 60, "startLevel": 1, "slots": ["A", "B"]}
     ],
     "levels": [
         {"exerciseId": "pushups", "level": 5, "name": "Full Push-ups", "technique": "Hands shoulder-width on floor", "beginnerReps": 5, "advancedReps": 20},
         {"exerciseId": "legRaises", "level": 5, "name": "Straight Leg Raises", "technique": "Lying flat, raise straight legs", "beginnerReps": 5, "advancedReps": 20},
         {"exerciseId": "squats", "level": 5, "name": "Full Squats", "technique": "Full depth squats", "beginnerReps": 5, "advancedReps": 30},
         {"exerciseId": "bridges", "level": 1, "name": "Short Bridges", "technique": "Lying, press hips up", "beginnerReps": 10, "advancedReps": 50}
     ],
     "progressionRules": {"repsIncrement": 2, "consecutiveEasyThreshold": 2, "levelUpAtMaxReps": True}},
    {"id": "dumbbell-gymnastics", "name": "Dumbbell Gymnastics", "description": "Classic Russian dumbbell complex", "type": "weights",
     "exercises": [
         {"id": "bicep-curl", "name": "Bicep Curl", "type": "reps", "technique": "Standing bicep curls", "tempo": "2-0-2", "restBetweenSets": 20, "defaultSets": 1, "defaultReps": 5, "startLevel": 1, "slots": ["evening"]},
         {"id": "french-press", "name": "French Press", "type": "reps", "technique": "Overhead tricep extension", "tempo": "2-0-2", "restBetweenSets": 20, "defaultSets": 1, "defaultReps": 5, "startLevel": 1, "slots": ["evening"]},
         {"id": "front-raise", "name": "Front Raise", "type": "reps", "technique": "Standing front dumbbell raise", "tempo": "2-0-2", "restBetweenSets": 20, "defaultSets": 1, "defaultReps": 5, "startLevel": 1, "slots": ["evening"]},
         {"id": "bench-press", "name": "Bench Press", "type": "reps", "technique": "Dumbbell bench press", "tempo": "2-0-2", "restBetweenSets": 20, "defaultSets": 1, "defaultReps": 5, "startLevel": 1, "slots": ["evening"]}
     ],
     "levels": [],
     "progressionRules": {"repsIncrement": 1, "consecutiveEasyThreshold": 3, "levelUpAtMaxReps": False}}
]

OUT = r"c:\VS_CODE_LOCAL\.nauroLabs\tPlan\tplan-app\test-screenshots"
os.makedirs(OUT, exist_ok=True)

def setup_mocks(page):
    page.route("**/.auth/me", lambda route: route.fulfill(status=200, content_type="application/json", body=json.dumps(MOCK_USER)))
    page.route("**/api/user", lambda route: route.fulfill(status=200, content_type="application/json", body=json.dumps(MOCK_PROFILE)))
    page.route("**/api/seed", lambda route: route.fulfill(status=200, content_type="application/json", body='{"seeded":false}'))
    page.route("**/api/dashboard", lambda route: route.fulfill(status=200, content_type="application/json", body=json.dumps(MOCK_DASHBOARD)))
    page.route("**/api/workouts**", lambda route: route.fulfill(status=200, content_type="application/json", body='[]'))
    page.route("**/api/logs**", lambda route: route.fulfill(status=200, content_type="application/json", body=json.dumps(MOCK_LOGS)))
    page.route("**/api/schedule", lambda route: route.fulfill(status=200, content_type="application/json", body=json.dumps(MOCK_SCHEDULE)))
    page.route("**/api/programs**", lambda route: route.fulfill(status=200, content_type="application/json", body=json.dumps(MOCK_PROGRAMS)))
    page.route("**/api/feedback", lambda route: route.fulfill(status=200, content_type="application/json", body='{"data":null}'))

PAGES = [
    ("/app", "dashboard"),
    ("/app/workout", "workout"),
    ("/app/schedule", "schedule"),
    ("/app/programs", "programs"),
    ("/app/history", "history"),
    ("/app/profile", "profile"),
]

with sync_playwright() as p:
    for viewport_name, width, height in [("mobile", 390, 844), ("desktop", 1280, 900)]:
        browser = p.chromium.launch(headless=True)
        
        for path, name in PAGES:
            context = browser.new_context(viewport={"width": width, "height": height})
            page = context.new_page()
            setup_mocks(page)
            
            url = f"http://localhost:5174{path}"
            page.goto(url)
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(500)  # Extra time for charts to render
            
            filename = f"{OUT}/{name}-{viewport_name}.png"
            page.screenshot(path=filename, full_page=True)
            print(f"OK: {name}-{viewport_name}")
            
            # For programs page, expand first card
            if name == "programs":
                cards = page.locator(".card").all()
                if len(cards) > 0:
                    cards[0].click()
                    page.wait_for_timeout(300)
                    page.screenshot(path=f"{OUT}/{name}-expanded-{viewport_name}.png", full_page=True)
                    print(f"OK: {name}-expanded-{viewport_name}")
            
            # For history page, expand first log
            if name == "history":
                cards = page.locator(".card").all()
                if len(cards) > 0:
                    cards[0].click()
                    page.wait_for_timeout(300)
                    page.screenshot(path=f"{OUT}/{name}-expanded-{viewport_name}.png", full_page=True)
                    print(f"OK: {name}-expanded-{viewport_name}")
            
            context.close()
        
        browser.close()

print("All screenshots captured!")
