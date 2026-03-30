# tPlan — Product Vision

> Last updated: 2026-03-30

## Origin Story

tPlan started as a personal experiment. I was following Convict Conditioning — a progressive bodyweight training methodology — and tracking everything manually: reading the book, deciding today's exercises, noting difficulty, advancing levels when reps hit the target. It worked, but the process was tedious and the decisions repetitive.

So I tried something: what if AI read the book for me and generated my daily workouts? In VS Code with GitHub Copilot, I fed the full Convict Conditioning text alongside my exercise logs (with difficulty ratings and notes) and asked it to generate tomorrow's workout. It worked — the AI understood the book's progression system, respected my feedback, and generated correct, progressive plans.

Phase 1 was raw: AI-generated HTML workout pages, one per day, with timers, difficulty ratings, and JSON export. No database, no auth — just files. But the core loop was validated: **book + logs + AI = personalized progressive coaching**. I added dumbbell programs, removed running (Nike Running Club handles that better), and trained daily using AI-generated pages for weeks.

The insight: **the training book already contains all the coaching logic — exercises, levels, progression rules, technique cues, rest periods**. AI can extract this and deliver it as a personalized, adaptive experience. No personal trainer needed. No generic fitness app that ignores your methodology.

## NauroLabs Experiment

tPlan is part of the NauroLabs research lab. While it's a real product built for real training, it tests a fundamental question:

**Is a dynamic, content-driven UI better than a fixed app?**

Every fitness app forces your training into its predetermined screens — the same logging form whether you're doing barbell squats, yoga flows, or martial arts katas. tPlan flips this: **the content defines the interface**. Upload a different program, get a different experience. The UI reshapes itself around the methodology, not the other way around.

This connects to NauroLabs' broader questions:

- **"Do we still need apps?"** — tPlan explores the middle ground. The app exists, but AI does the decision-making. The user's role is minimal: train, provide feedback, review progress. Everything else — scheduling, progression, plan generation — is AI-driven.
- **"Can AI replace a service?"** — Personal trainers charge €30–100/hour to do what tPlan does: read a methodology, build a progressive plan, adjust based on feedback. If AI can deliver 80% of that value from the source material, the implication is significant.
- **"What's worth selling?"** — If users can upload any book and get a coach from it, the value is in the extraction pipeline + the program marketplace, not in any specific program.

## Mission

**Turn any training book, program, or methodology into a personalized, progressive AI coach — with minimal interface and maximum coaching intelligence.**

## Core Insight

Training methodology books contain everything needed for progressive coaching: exercises, technique descriptions, levels, progression rules, rest periods, and periodization logic. But nobody reads 300-page books to decide what to do in their next workout. Existing fitness apps ignore this — they offer generic exercise databases with manual rep tracking, or AI that generates random "personalized" plans with no methodological foundation.

tPlan bridges this gap: **the book becomes the brain, AI becomes the coach, and the app becomes invisible**.

## Target Users

### Primary: Self-Directed Trainers
- People who follow specific methodologies: Convict Conditioning, Starting Strength, 5/3/1, yoga programs, martial arts curricula, rehabilitation protocols, sport-specific training
- Already motivated — they don't need gamification or social pressure
- Want an app that **respects the methodology** they've chosen
- Train at home, in a gym, outdoors — equipment varies by program
- Tired of apps that don't understand progressive overload, levels, or periodization

### Secondary: Program Explorers
- People who discover training programs online, from coaches, from athletes, or from books
- Want to try a program without reading 300 pages
- Want to see if a program works for them before committing long-term

### Future: Program Creators
- Coaches who want to digitize their methodology for clients
- Authors who want their book to become an interactive experience
- Athletes who share their personal programs with followers

## How It Works — The Book-to-Coach Pipeline

1. **Upload** — User uploads a training book (PDF, markdown, or structured text), or selects from the program library
2. **Extract** — AI reads the material, identifies: exercises, levels/progressions, technique cues, rest periods, warm-up/cool-down routines, transition rules (when to advance), periodization logic, equipment requirements
3. **Plan** — AI generates a weekly schedule based on the program's structure, user's current levels, and available training days
4. **Generate** — Each day, AI generates today's workout from the plan, incorporating feedback from the last session (difficulty ratings, notes, actual reps vs. planned)
5. **Train** — User follows the guided workout: exercise-by-exercise, with technique reminders, timers, and rep tracking
6. **Feedback** — After each exercise: rate difficulty, add notes. After the workout: key metrics (body weight, etc.), general comments, post-workout summary with progress insights
7. **Progress** — AI analyzes feedback and adjusts: advance to next level if consistently easy, maintain if hard, modify if user requests changes
8. **Repeat** — Tomorrow's workout is shaped by today's results

### The Dynamic Interface

The UI is not fixed. Different programs generate different training experiences:

- A calisthenics program → exercise cards with sets, reps, tempo, technique, rest timers
- A yoga program → flow sequences with hold timers, breathing cues, pose descriptions
- A running program → distance/pace targets, interval timers, route suggestions
- A martial arts curriculum → technique drills with rounds, combination sequences, partner work indicators

**The program defines the interface, not the app.** This is the core experiment.

### Multi-Program Scheduling

Users often follow multiple programs simultaneously (e.g., calisthenics mornings + dumbbell evenings, or a strength program + a flexibility program). AI balances the weekly schedule:

- Prevents over-training the same muscle groups on consecutive days
- Respects each program's intended frequency
- Adjusts when sessions are missed
- Suggests optimal time-of-day for each program type

## Key Differentiators

### 1. Book-to-Coach
No other fitness app reads your training book and turns it into a personalized progressive program. Fitbod generates random workouts. Strong is a manual logger. Jefit has templates but no methodology understanding. tPlan starts from the source material — the book IS the coach.

### 2. Dynamic Interface
Traditional apps: one logging screen for everything. tPlan: the program defines the UI. A yoga program looks different from a powerlifting program because they ARE different. The interface adapts to serve the methodology, not force the methodology into a generic form.

### 3. Professional Minimalism
For people who are already motivated. No XP, no achievements, no badges, no streaks, no social feeds. Open → today's workout is ready → train → rate → progress insights → close. Every screen earns its place or gets removed. Strava/Apple Fitness level of polish, not a gamified mobile game.

### 4. AI Coaching Intelligence
- Understands progression rules from the source material (not generic "+5 lbs per week")
- Adjusts based on user-reported difficulty, not just rep counts
- Reads and acts on free-text notes ("my wrist hurts", "switch to next level", "too easy")
- Generates technique reminders from the original book's cues Maintains proper periodization and deload logic

### 5. Program Agnostic
Calisthenics, barbell training, dumbbell work, bodyweight, yoga, Pilates, martial arts, swimming drills, rehabilitation exercises — if a book or program describes it with exercises and progression, tPlan can handle it. The AI extraction pipeline is generic; the programs are specific.

### 6. Community Programs (Future)
Users share programs they've uploaded and validated. Programs are auto-evaluated for structure quality, progression logic, and completeness. High-rated programs become available to everyone — a GitHub for training programs.

## Daily Experience

A typical tPlan session for a motivated user:

1. **Open app** — see today's workout, already generated based on last session's results
2. **Review** — quick glance at exercises, sets, reps. AI explains any changes ("Increased to 2×13 — last two sessions rated easy")
3. **Start workout** — exercise-by-exercise guided flow:
   - Technique reminder from the book
   - Timer for rest periods
   - Rep counter
   - Previous performance shown for reference
4. **Rate each exercise** — difficulty (easy/normal/hard) + optional notes
5. **Finish** — post-workout summary:
   - Duration
   - Key body metrics (weight, etc. — varies by program)
   - Free-text notes
   - Progress insights ("Bridge progression: 2 sessions at easy → next session will advance to Level 2")
6. **Close** — done. Tomorrow's workout will be generated from today's data.

Total interaction time beyond actual training: **under 2 minutes**.

## Design Direction

**Clean. Professional. Data-rich but uncluttered.**

Think Strava meets Apple Fitness — white/light base, bold typography, progress charts front and center. A professional athlete wouldn't be embarrassed to use this.

- Light theme, clean white backgrounds
- Sans-serif system fonts (Inter or SF Pro)
- Data visualizations: progress charts, level indicators, workout history
- Large tap targets for mid-workout use (sweaty hands)
- Minimal chrome — content first, navigation second
- Mobile-first PWA (375px primary breakpoint)

## Business Model

**Freemium** (hypothesis — to be validated)

| Tier | Price | Features |
|------|-------|----------|
| Free | €0 | Built-in programs (Convict Conditioning, basic calisthenics), full core loop (generate → train → feedback → progress), basic history |
| Pro | ~€5–10/mo | Upload your own books/programs, AI scheduling across multiple programs, advanced progress analytics, export data |

Revenue hypothesis: if tPlan can replace even a fraction of personal trainer sessions (€30–100/hr), a €5–10/month subscription is a no-brainer for motivated self-directed trainers.

Later: program marketplace with revenue share for creators.

## Language Strategy

- **English** — primary language, all UI and documentation
- **Russian** — secondary, the founder's training language and natural user base
- i18n infrastructure supports LV, ES — re-enable when expanding to those markets

## Phase Strategy

### Phase 2 — Core Loop (Current)
Stabilize the web app for personal use. Perfect the cycle: AI generates workout from last results → guided training → difficulty feedback → AI adjusts next session. Polish the existing Convict Conditioning + Dumbbell programs. Ship to tplan.naurolabs.com.

**Success criteria**: the founder uses it daily and it's better than the Phase 1 HTML approach.

### Phase 3 — Book Upload + AI Extraction
The killer feature. Users upload training books (PDF/markdown) → AI extracts structured programs (exercises, levels, progression rules, technique, periodization). This is the hardest technical challenge — extraction quality defines the product.

**Success criteria**: upload a new book (e.g., Starting Strength), get a usable progressive program without manual configuration.

### Phase 4 — Dynamic Interface (The Core Experiment)
The UI adapts to the methodology — different programs generate different training experiences. This is tPlan's core NauroLabs research question, placed right after book upload makes multiple program types possible.

**Success criteria**: visually distinct, methodology-appropriate interfaces for 3+ different program types.

### Phase 5 — Multi-User + Public Launch
Google OAuth, cloud sync, user profiles. Multiple people can use tPlan with their own programs and progress. Prepare for public launch.

**Success criteria**: 5+ external users training regularly with tPlan.

### Phase 6 — Shared Programs + Monetization
Program sharing, community ratings, freemium paywall. Test whether the marketplace model generates traction and revenue.

**Success criteria**: measurable subscription revenue covering hosting costs.

## Technical Architecture

| Layer | Current | Target |
|-------|---------|--------|
| Frontend | React 19 + TypeScript + Vite | Same — PWA with responsive design |
| Backend | Azure Functions (Node.js) | Same + AI extraction pipeline |
| Database | Azure Table Storage | Azure Cosmos DB (scale for multi-user) |
| Auth | Google OAuth via SWA | Same |
| AI | Manual prompts (Phase 1) | Azure OpenAI GPT-4o for extraction + coaching |
| Hosting | Azure Static Web Apps | Same |
| Storage | — | Azure Blob Storage (book uploads) |

## What tPlan Is NOT

- **Not a generic exercise database** — tPlan doesn't have 10,000 exercises. It has the exercises YOUR program defines.
- **Not a social fitness app** — No feeds, no friends, no "John just did 50 push-ups!" notifications.
- **Not gamified** — No XP, badges, streaks, or rewards. Your progress IS the reward.
- **Not a personal trainer replacement for beginners** — tPlan assumes you've chosen a methodology. It helps you follow it progressively.
- **Not a one-size-fits-all app** — The whole point is that it adapts to YOUR program, not the reverse.
