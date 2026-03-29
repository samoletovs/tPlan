<#
.SYNOPSIS
  Seed Tplan Azure Table Storage with programs and user data.
  Migrates Convict Conditioning + Dumbbell Gymnastics programs and sets up
  d.146099412+samoletovs@users.noreply.github.comgmail.com user with current Week 5 levels.
#>
param([string]$StorageAccount = "stagentss6vbks3oteo4y")

$ErrorActionPreference = "Stop"

# Get storage key
$key = az storage account keys list --account-name $StorageAccount --query "[0].value" -o tsv 2>$null

Write-Host "`n=== Tplan Data Seed ===" -ForegroundColor Cyan

# ─── Helper: Insert entity into Azure Table Storage ─────────────────
function Set-TableEntity {
  param([string]$Table, [string]$PK, [string]$RK, [hashtable]$Props)
  
  $entity = @{ PartitionKey = $PK; RowKey = $RK }
  foreach ($k in $Props.Keys) { $entity[$k] = $Props[$k] }
  
  $body = $entity | ConvertTo-Json -Depth 10
  $date = [DateTime]::UtcNow.ToString("R")
  $resource = "/$StorageAccount/$Table"
  
  # Use az CLI for simplicity
  az storage entity insert --table-name $Table --account-name $StorageAccount --account-key $key --entity `
    PartitionKey=$PK RowKey=$RK @($Props.Keys | ForEach-Object { "$_=$($Props[$_])" }) `
    --if-exists replace -o none 2>$null
}

# ─── 1. Seed Program: Convict Conditioning ──────────────────────────
Write-Host "`n[1] Convict Conditioning..." -ForegroundColor Yellow

$ccExercises = @(
  @{ id = "pushups"; name = "Push-ups"; type = "reps"; technique = "Full push-ups on floor"; tempo = "2-1-2"; restBetweenSets = 60; defaultSets = 2; defaultReps = 5; startLevel = 1; slots = @("A","B") }
  @{ id = "legRaises"; name = "Leg Raises"; type = "reps"; technique = "Abs — progressive leg raises"; tempo = "2-1-2"; restBetweenSets = 60; defaultSets = 2; defaultReps = 5; startLevel = 1; slots = @("A","B") }
  @{ id = "squats"; name = "Squats"; type = "reps"; technique = "Full squats to parallel and below"; tempo = "2-1-2"; restBetweenSets = 90; defaultSets = 2; defaultReps = 5; startLevel = 1; slots = @("A") }
  @{ id = "bridges"; name = "Bridges"; type = "reps"; technique = "Back bridge progressions"; tempo = "2-1-2"; restBetweenSets = 60; defaultSets = 2; defaultReps = 10; startLevel = 1; slots = @("B") }
  @{ id = "plank"; name = "Plank"; type = "timed"; technique = "Forearm plank hold"; restBetweenSets = 0; defaultSets = 1; defaultReps = 30; startLevel = 1; slots = @("A","B") }
) | ConvertTo-Json -Depth 5 -Compress

$ccLevels = @(
  # Push-ups levels
  @{ exerciseId = "pushups"; level = 1; name = "Wall Push-ups"; technique = "Stand arm-length from wall. Place hands flat. Bend arms until forehead almost touches wall. Push back. Start: 1x10, Intermediate: 2x25, Advanced: 3x50."; beginnerReps = 10; advancedReps = 50 }
  @{ exerciseId = "pushups"; level = 2; name = "Incline Push-ups"; technique = "Hands on a table or bench (waist height). Body straight. Lower until chest touches edge. Push up. Start: 1x10, Intermediate: 2x20, Advanced: 3x40."; beginnerReps = 10; advancedReps = 40 }
  @{ exerciseId = "pushups"; level = 3; name = "Kneeling Push-ups"; technique = "On knees and hands. Body straight from knees to head. Lower chest to fist-height. Push up. Start: 1x10, Intermediate: 2x15, Advanced: 3x30."; beginnerReps = 10; advancedReps = 30 }
  @{ exerciseId = "pushups"; level = 4; name = "Half Push-ups"; technique = "Regular position but only go down halfway (elbows at 90 degrees). Start: 1x8, Intermediate: 2x12, Advanced: 2x25."; beginnerReps = 8; advancedReps = 25 }
  @{ exerciseId = "pushups"; level = 5; name = "Full Push-ups"; technique = "Hands shoulder-width at lower chest level. Body straight. Lower until chest is fist-height from floor. Pause. Push up. Start: 1x5, Intermediate: 2x10, Advanced: 2x20."; beginnerReps = 5; advancedReps = 20 }
  @{ exerciseId = "pushups"; level = 6; name = "Close Push-ups"; technique = "Hands touching (index fingers and thumbs form diamond). Lower chest to hands. Start: 1x5, Intermediate: 2x10, Advanced: 2x20."; beginnerReps = 5; advancedReps = 20 }
  # Leg Raises levels
  @{ exerciseId = "legRaises"; level = 1; name = "Knee Tucks"; technique = "On back, hands at sides. Pull knees to chest. Start: 1x10, Intermediate: 2x25, Advanced: 3x40."; beginnerReps = 10; advancedReps = 40 }
  @{ exerciseId = "legRaises"; level = 2; name = "Flat Knee Raises"; technique = "On back. Raise bent legs until thighs are perpendicular. Lower slowly. Start: 1x10, Intermediate: 2x20, Advanced: 3x35."; beginnerReps = 10; advancedReps = 35 }
  @{ exerciseId = "legRaises"; level = 3; name = "Flat Bent Leg Raises"; technique = "On back. Legs bent at 45 degrees. Raise until perpendicular. Start: 1x10, Intermediate: 2x15, Advanced: 3x30."; beginnerReps = 10; advancedReps = 30 }
  @{ exerciseId = "legRaises"; level = 4; name = "Flat Frog Raises"; technique = "On back. Legs bent, feet together (frog position). Straighten legs up, then lower bent. Start: 1x8, Intermediate: 2x15, Advanced: 2x25."; beginnerReps = 8; advancedReps = 25 }
  @{ exerciseId = "legRaises"; level = 5; name = "Flat Straight Leg Raises"; technique = "On back, legs straight. Raise to perpendicular. Lower slowly. Feet never touch floor between reps! Start: 1x5, Intermediate: 2x10, Advanced: 2x20."; beginnerReps = 5; advancedReps = 20 }
  # Squats levels
  @{ exerciseId = "squats"; level = 1; name = "Shoulderstand Squats"; technique = "Shoulder stand position, bend and straighten legs. Start: 1x10, Intermediate: 2x25, Advanced: 3x50."; beginnerReps = 10; advancedReps = 50 }
  @{ exerciseId = "squats"; level = 2; name = "Jackknife Squats"; technique = "Hold a chair/table for support. Squat all the way down. Start: 1x10, Intermediate: 2x20, Advanced: 3x40."; beginnerReps = 10; advancedReps = 40 }
  @{ exerciseId = "squats"; level = 3; name = "Supported Squats"; technique = "Hold a support at waist height. Squat to full depth. Start: 1x10, Intermediate: 2x15, Advanced: 3x30."; beginnerReps = 10; advancedReps = 30 }
  @{ exerciseId = "squats"; level = 4; name = "Half Squats"; technique = "Arms forward for balance. Squat to knee-level (half depth). Start: 1x8, Intermediate: 2x35, Advanced: 2x50."; beginnerReps = 8; advancedReps = 50 }
  @{ exerciseId = "squats"; level = 5; name = "Full Squats"; technique = "Feet shoulder-width, toes slightly out. Arms forward. Squat all the way down. Start: 1x5, Intermediate: 2x10, Advanced: 2x30."; beginnerReps = 5; advancedReps = 30 }
  # Bridges levels (simplified)
  @{ exerciseId = "bridges"; level = 1; name = "Short Bridges"; technique = "On back, knees bent. Raise hips until straight line. Squeeze glutes. Start: 1x10, Intermediate: 2x25, Advanced: 3x50."; beginnerReps = 10; advancedReps = 50 }
  # Plank (no levels, just duration)
  @{ exerciseId = "plank"; level = 1; name = "Plank Hold"; technique = "Forearm plank on toes. Body straight. Engage abs, glutes, quads. Progress: 30s → 45s → 60s → 90s → 120s."; beginnerReps = 30; advancedReps = 120 }
) | ConvertTo-Json -Depth 5 -Compress

$ccRules = @{
  repsIncrement = 2
  consecutiveEasyThreshold = 2
  levelUpAtMaxReps = $true
} | ConvertTo-Json -Compress

az storage entity insert --table-name tplanPrograms --account-name $StorageAccount --account-key $key --if-exists replace --entity `
  PartitionKey=global RowKey=convict-conditioning `
  name="Convict Conditioning" `
  description="Bodyweight calisthenics with 10-level progressions (Paul Wade)" `
  type=calisthenics `
  source="ConvictConditioning_Vol1.md" `
  exercises="$ccExercises" `
  levels="$ccLevels" `
  progressionRules="$ccRules" `
  createdAt="2026-02-16T00:00:00Z" `
  -o none 2>$null

Write-Host "  Convict Conditioning saved" -ForegroundColor Green

# ─── 2. Seed Program: Dumbbell Gymnastics ───────────────────────────
Write-Host "`n[2] Dumbbell Gymnastics..." -ForegroundColor Yellow

$dbExercises = @(
  @{ id = "tennis-ball"; name = "Tennis Ball Squeeze"; type = "reps"; technique = "Squeeze tennis ball firmly"; tempo = "1-1-1"; restBetweenSets = 30; defaultSets = 1; defaultReps = 8 }
  @{ id = "bicep-curl"; name = "Bicep Curl"; type = "reps"; technique = "Standing, curl dumbbells alternately"; tempo = "2-1-2"; restBetweenSets = 30; defaultSets = 1; defaultReps = 5 }
  @{ id = "reverse-curl"; name = "Reverse Curl"; type = "reps"; technique = "Standing, reverse grip curl"; tempo = "2-1-2"; restBetweenSets = 30; defaultSets = 1; defaultReps = 5 }
  @{ id = "french-press"; name = "French Press"; type = "reps"; technique = "Standing, dumbbell behind head, extend arms"; tempo = "2-1-2"; restBetweenSets = 30; defaultSets = 1; defaultReps = 5 }
  @{ id = "front-raise"; name = "Front Raise"; type = "reps"; technique = "Arms at sides, raise dumbbells forward to shoulder height"; tempo = "2-1-2"; restBetweenSets = 30; defaultSets = 1; defaultReps = 5 }
  @{ id = "bench-press"; name = "Dumbbell Bench Press"; type = "reps"; technique = "Lying on floor/bench, press dumbbells up"; tempo = "2-1-2"; restBetweenSets = 30; defaultSets = 1; defaultReps = 5 }
  @{ id = "neck-raise"; name = "Neck Raise"; type = "reps"; technique = "Lying face up, dumbbell on forehead, raise head"; tempo = "2-1-2"; restBetweenSets = 30; defaultSets = 1; defaultReps = 5 }
  @{ id = "back-extension"; name = "Back Extension"; type = "reps"; technique = "Bent over, arms hanging, extend back straight"; tempo = "2-1-2"; restBetweenSets = 30; defaultSets = 1; defaultReps = 5 }
  @{ id = "side-bend"; name = "Side Bend"; type = "reps"; technique = "Standing, dumbbell in one hand, lean to opposite side"; tempo = "2-1-2"; restBetweenSets = 30; defaultSets = 1; defaultReps = 6 }
  @{ id = "db-squat"; name = "Dumbbell Squat"; type = "reps"; technique = "Hold dumbbells at sides, squat to parallel"; tempo = "2-1-2"; restBetweenSets = 30; defaultSets = 1; defaultReps = 5 }
  @{ id = "calf-raise"; name = "Calf Raise"; type = "reps"; technique = "Standing on step edge, rise on toes"; tempo = "2-1-2"; restBetweenSets = 30; defaultSets = 1; defaultReps = 10 }
  @{ id = "wrist-curl"; name = "Wrist Curl"; type = "reps"; technique = "Forearm on thigh, curl wrist up with dumbbell"; tempo = "2-1-2"; restBetweenSets = 30; defaultSets = 1; defaultReps = 8 }
  @{ id = "reverse-wrist"; name = "Reverse Wrist Curl"; type = "reps"; technique = "Forearm on thigh, reverse grip, curl wrist up"; tempo = "2-1-2"; restBetweenSets = 30; defaultSets = 1; defaultReps = 8 }
) | ConvertTo-Json -Depth 5 -Compress

$dbRules = @{
  repsIncrement = 1
  consecutiveEasyThreshold = 3
  weightIncrementKg = 0.5
} | ConvertTo-Json -Compress

az storage entity insert --table-name tplanPrograms --account-name $StorageAccount --account-key $key --if-exists replace --entity `
  PartitionKey=global RowKey=dumbbell-gymnastics `
  name="Dumbbell Gymnastics" `
  description="Classic dumbbell complex — 13 exercises for full body (3-4 kg)" `
  type=weights `
  source="DumbbellGymnastics.md" `
  exercises="$dbExercises" `
  levels="[]" `
  progressionRules="$dbRules" `
  createdAt="2026-02-16T00:00:00Z" `
  -o none 2>$null

Write-Host "  Dumbbell Gymnastics saved" -ForegroundColor Green

# ─── 3. Seed User Schedule ──────────────────────────────────────────
Write-Host "`n[3] User Schedule (interleaving)..." -ForegroundColor Yellow

# Schedule: CC Day B = Mon, Wed, Fri, Sun; CC Day A = Tue, Thu, Sat; Gym = Wed evening, Sat evening
$schedule = @{
  mon = @(@{ programId = "convict-conditioning"; slot = "B" })
  tue = @(@{ programId = "convict-conditioning"; slot = "A" })
  wed = @(@{ programId = "convict-conditioning"; slot = "B" }, @{ programId = "dumbbell-gymnastics"; slot = "evening" })
  thu = @(@{ programId = "convict-conditioning"; slot = "A" })
  fri = @(@{ programId = "convict-conditioning"; slot = "B" })
  sat = @(@{ programId = "convict-conditioning"; slot = "A" }, @{ programId = "dumbbell-gymnastics"; slot = "evening" })
  sun = @(@{ programId = "convict-conditioning"; slot = "B" })
} | ConvertTo-Json -Depth 5 -Compress

$schedPrograms = @(
  @{
    programId = "convict-conditioning"
    currentLevels = @{
      pushups = @{ level = 5; sets = 2; reps = 11; consecutiveEasy = 0 }
      legRaises = @{ level = 5; sets = 2; reps = 5; consecutiveEasy = 0 }
      squats = @{ level = 5; sets = 2; reps = 11; consecutiveEasy = 0 }
      bridges = @{ level = 1; sets = 2; reps = 10; consecutiveEasy = 0 }
      plank = @{ level = 1; sets = 1; reps = 60; durationSec = 60; consecutiveEasy = 0 }
    }
  }
  @{
    programId = "dumbbell-gymnastics"
    currentLevels = @{
      "tennis-ball" = @{ level = 1; sets = 1; reps = 8; consecutiveEasy = 0 }
      "bicep-curl" = @{ level = 1; sets = 1; reps = 5; consecutiveEasy = 0 }
      "reverse-curl" = @{ level = 1; sets = 1; reps = 5; consecutiveEasy = 0 }
      "french-press" = @{ level = 1; sets = 1; reps = 5; consecutiveEasy = 0 }
      "front-raise" = @{ level = 1; sets = 1; reps = 5; consecutiveEasy = 0 }
      "bench-press" = @{ level = 1; sets = 1; reps = 5; consecutiveEasy = 0 }
      "neck-raise" = @{ level = 1; sets = 1; reps = 5; consecutiveEasy = 0 }
      "back-extension" = @{ level = 1; sets = 1; reps = 5; consecutiveEasy = 0 }
      "side-bend" = @{ level = 1; sets = 1; reps = 6; consecutiveEasy = 0 }
      "db-squat" = @{ level = 1; sets = 1; reps = 5; consecutiveEasy = 0 }
      "calf-raise" = @{ level = 1; sets = 1; reps = 10; consecutiveEasy = 0 }
      "wrist-curl" = @{ level = 1; sets = 1; reps = 8; consecutiveEasy = 0 }
      "reverse-wrist" = @{ level = 1; sets = 1; reps = 8; consecutiveEasy = 0 }
    }
  }
) | ConvertTo-Json -Depth 5 -Compress

# We need the SWA userId for d.146099412+samoletovs@users.noreply.github.comgmail.com
# SWA userId is generated from the identity provider — we'll use a placeholder
# The actual userId will be set when the user first logs in
# For now, seed under "seed-user" and the user API will migrate on first login

# Actually, let's get the userId from SWA auth - we can't know it ahead of time
# Instead, create an API endpoint that does the migration: POST /api/seed

Write-Host "  Schedule prepared (will be applied on first login or via /api/seed)" -ForegroundColor Green

# ─── 4. Create seed endpoint data as JSON for the API to use ────────
$seedData = @{
  schedule = $schedule | ConvertFrom-Json
  programs = $schedPrograms | ConvertFrom-Json
  currentLevels = @{
    "convict-conditioning" = @{
      pushups = @{ level = 5; sets = 2; reps = 11; consecutiveEasy = 0 }
      legRaises = @{ level = 5; sets = 2; reps = 5; consecutiveEasy = 0 }
      squats = @{ level = 5; sets = 2; reps = 11; consecutiveEasy = 0 }
      bridges = @{ level = 1; sets = 2; reps = 10; consecutiveEasy = 0 }
      plank = @{ level = 1; sets = 1; reps = 60; durationSec = 60; consecutiveEasy = 0 }
    }
    "dumbbell-gymnastics" = @{
      "tennis-ball" = @{ level = 1; sets = 1; reps = 8; consecutiveEasy = 0 }
      "bicep-curl" = @{ level = 1; sets = 1; reps = 5; consecutiveEasy = 0 }
      "reverse-curl" = @{ level = 1; sets = 1; reps = 5; consecutiveEasy = 0 }
      "french-press" = @{ level = 1; sets = 1; reps = 5; consecutiveEasy = 0 }
      "front-raise" = @{ level = 1; sets = 1; reps = 5; consecutiveEasy = 0 }
      "bench-press" = @{ level = 1; sets = 1; reps = 5; consecutiveEasy = 0 }
      "neck-raise" = @{ level = 1; sets = 1; reps = 5; consecutiveEasy = 0 }
      "back-extension" = @{ level = 1; sets = 1; reps = 5; consecutiveEasy = 0 }
      "side-bend" = @{ level = 1; sets = 1; reps = 6; consecutiveEasy = 0 }
      "db-squat" = @{ level = 1; sets = 1; reps = 5; consecutiveEasy = 0 }
      "calf-raise" = @{ level = 1; sets = 1; reps = 10; consecutiveEasy = 0 }
      "wrist-curl" = @{ level = 1; sets = 1; reps = 8; consecutiveEasy = 0 }
      "reverse-wrist" = @{ level = 1; sets = 1; reps = 8; consecutiveEasy = 0 }
    }
  }
} | ConvertTo-Json -Depth 10

$seedData | Out-File "c:\VS_CODE_LOCAL\.nauroLabs\Tplan\tplan-app\api\seed-data.json" -Encoding utf8NoBOM

Write-Host "`n✓ Programs seeded to Azure Table Storage" -ForegroundColor Green
Write-Host "✓ User schedule + levels saved as seed-data.json" -ForegroundColor Green
Write-Host "  → On first login, call POST /api/seed to apply schedule to user" -ForegroundColor DarkGray
