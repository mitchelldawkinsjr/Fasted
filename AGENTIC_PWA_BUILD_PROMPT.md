# Agentic Build Prompt: Fasted Calendar PWA

You are an autonomous senior product engineer and UI/UX designer. Build a production-ready Progressive Web App called **Fasted Calendar**.

The app helps a user open the page, automatically detect today’s date, and immediately see what is expected for that day’s biblical fast from **June 13 through December 19, 2026**. The experience should feel encouraging, faith-centered, simple, and motivating.

## Core Product Idea

Create a PWA that functions like a spiritual fasting companion:

- Shows the current fasting phase based on today’s date.
- Shows the fasting instructions for that specific day.
- Shows the scripture for the day in CEV wording or a clear placeholder with verse reference if licensing limits prevent shipping full CEV text.
- Shows prayer points for the day.
- Gives daily encouragement in a Christ-centered encouragement style.
- Lets the user journal about prayer points, discipline, emotions, hunger, victories, and what God is teaching them.
- Uses a fasting calendar as the main mental model.
- Gamifies consistency with streaks, check-ins, badges, phase completion, and positive dopamine-style feedback.
- Uses the provided phase images as visual anchors for each phase.

## Tech Direction

Build this as a modern PWA.

Recommended stack:
- Next.js or Vite + React + TypeScript
- Tailwind CSS
- Local-first storage with IndexedDB or localStorage
- Optional future sync layer, but do not require backend for MVP
- PWA manifest
- Service worker for offline use
- Installable on mobile home screen
- Responsive mobile-first design

If using Next.js:
- App Router
- TypeScript
- Tailwind
- Component-based architecture
- Client-side storage for journal entries and check-ins

## Required Asset Mapping

Use the images in `/assets/phases/` and `/assets/fasting-plan-all-phases.png`.

Each phase must have a corresponding image:

1. `/assets/phases/phase-01-daniel-1-fast-pattern.png`
2. `/assets/phases/phase-02-davids-fast-seeking-god.png`
3. `/assets/phases/phase-03-first-daniel-fast.png`
4. `/assets/phases/phase-04-joel-repentance-fast.png`
5. `/assets/phases/phase-05-isaiah-58-fast.png`
6. `/assets/phases/phase-06-second-daniel-fast.png`
7. `/assets/phases/phase-07-esther-preparation-fast.png`
8. `/assets/phases/phase-08-year-end-consecration.png`

Also include a full overview page using:
- `/assets/fasting-plan-all-phases.png`

## Data Model

Create a structured data file for the fasting plan.

Each phase should include:

```ts
type FastPhase = {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
  themeColor: string;
  scriptureReference: string;
  scriptureTextCEV: string;
  scheduleSummary: string;
  allowed?: string[];
  avoid?: string[];
  dailyReadings?: string[];
  prayerFocus: string[];
  imagePath: string;
};
```

Also create daily logic:

```ts
type DailyFastPlan = {
  date: string;
  phaseId: number;
  isFastDay: boolean;
  fastType: "normal-eating" | "sunrise-to-sunset-water" | "sunrise-to-sunset-with-coffee-tea" | "daniel-fast" | "twenty-four-hour-water" | "extended-prayer";
  instructions: string[];
  scriptureReferences: string[];
  prayerPoints: string[];
  encouragement: string;
  checkInPrompts: string[];
};
```

## Fasting Plan Data

### Phase 1: Daniel 1 Fast Pattern
Dates: June 13 – July 11, 2026  
Scripture: Daniel 1:12  
CEV text: “For the next ten days, let us eat vegetables and drink water.”

Schedule:
- Every Wednesday: sunrise to sunset fast, water only.
- Daily eating: lean protein, vegetables, fruit, water.
- Remove: soda, candy, fast food.

Prayer focus:
- Dedication of your weight-loss journey.
- Wisdom for health decisions.
- Family leadership.

### Phase 2: David’s Fast for Seeking God
Dates: July 12 – August 8, 2026  
Scripture: 2 Samuel 12:16  
CEV text: “David prayed and went without eating. He spent the night lying on the floor.”

Schedule:
- Wednesday and Friday: sunrise to sunset.
- Water, black coffee, and unsweet tea allowed.
- Daily scripture focus: Psalm 23, Psalm 51, Psalm 103.

Prayer focus:
- Healing.
- Emotional renewal.
- Physical discipline.

### Phase 3: First Daniel Fast
Dates: August 9 – August 29, 2026  
Scripture: Daniel 10:2-3  
Use CEV wording if available. Otherwise show reference and a clear short summary:
Daniel mourned for three weeks and did not eat fancy food, meat, or drink wine.

Schedule:
- 21 consecutive days.
- Eat: vegetables, fruit, beans, rice, oats, water.
- Avoid: meat, dairy, sweets, fried foods.

Prayer focus:
- Spiritual breakthrough.
- Family.
- Direction for work and ministry.

### Phase 4: Joel Repentance Fast
Dates: August 30 – September 26, 2026  
Scripture: Joel 2:12  
Use CEV wording if available. Otherwise show reference and a clear short summary:
Return to God with all your heart, with fasting, crying, and mourning.

Schedule:
- Monday: sunrise to sunset.
- Thursday: sunrise to sunset.
- Daily: read Joel 2.

Prayer focus:
- Repentance.
- Revival.
- Holiness.

### Phase 5: Isaiah 58 Fast
Dates: September 27 – October 17, 2026  
Scripture: Isaiah 58:6-8  
Use CEV wording if available. Otherwise show reference and a clear short summary:
The fast God chooses includes freeing the oppressed, feeding the hungry, serving others, and healing.

Schedule:
- Wednesday fast each week.
- Each week give food or resources to someone in need.
- Encourage one person.
- Perform one act of service.

Prayer focus:
- Healing.
- Compassion.
- Kingdom impact.

### Phase 6: Second Daniel Fast
Dates: October 18 – November 7, 2026  
Scripture: Daniel 10:2-3

Schedule:
- 21 days.
- Same Daniel Fast foods.
- Walk daily.

Prayer focus:
- Endurance.
- Physical transformation.
- Future vision.

### Phase 7: Esther Preparation Fast
Dates: November 8 – November 28, 2026  
Scripture: Esther 4:16  
Use CEV wording if available. Otherwise show reference and a clear short summary:
Esther asked the Jews to fast with no eating or drinking for three days and nights.

Safer schedule:
- Week 1: one 24-hour water fast.
- Week 2: one 24-hour water fast.
- Week 3: one sunrise-to-sunset fast.

Prayer focus:
- Courage.
- Faith.
- Trust in God’s provision.

Important: Include a safety note in the UI that full no-food/no-water fasts are not recommended without medical guidance.

### Phase 8: Year-End Consecration
Dates: November 29 – December 19, 2026

Schedule:
- Monday: sunrise to sunset fast.
- Thursday: sunrise to sunset fast.
- Saturday: extended prayer time.

Daily reading:
- Isaiah 58
- Psalm 103
- Matthew 6
- James 5

Prayer focus:
- Gratitude.
- Healing.
- Family.
- Vision for 2027.

## Daily Date Logic

When the app opens:

1. Get today’s local date.
2. Determine which phase today falls into.
3. Determine if today is a fast day based on the phase rules.
4. Display:
   - Today’s date.
   - Current phase.
   - Phase image.
   - What to eat or avoid today.
   - Whether today is a fast day.
   - Scripture for today.
   - Prayer points.
   - Daily encouragement.
   - Journal prompt.
   - Check-in button.

If today is outside June 13 – December 19, 2026:
- Show the full overview.
- Show a message: “This fasting plan runs June 13 through December 19, 2026.”
- Allow the user to preview any phase manually.

## Main Screens

### 1. Today Screen

This is the default screen.

Include:
- “Today’s Fast”
- Date
- Phase name
- Phase image
- Fast status card:
  - “Fast Day” or “Preparation / Normal Eating Day”
- Instructions for today
- Scripture card
- Prayer points card
- Daily encouragement card
- “Complete Today’s Check-In” button
- Streak widget

### 2. Calendar Screen

Create a calendar view from June 13 through December 19.

Visual rules:
- Color-code each phase.
- Mark fast days with a flame, water drop, or sun icon.
- Mark completed days with a checkmark.
- Mark missed days softly, not shame-based.
- Tapping a date opens that day’s plan.

### 3. Journal Screen

Allow the user to create a daily journal entry.

Fields:
- Date
- Prayer point I focused on
- What I prayed about
- What God is teaching me
- Hunger / discipline notes
- Victory today
- Tomorrow’s intention

Save entries locally.

Features:
- Edit previous entries.
- View entries by date.
- Search journal entries.
- Export journal as JSON or Markdown.

### 4. Progress Screen

Gamify consistency.

Show:
- Current streak
- Longest streak
- Total check-ins
- Phase completion percentage
- Number of fast days completed
- Number of journal entries
- Badge wall

Badge ideas:
- First Check-In
- 3-Day Streak
- 7-Day Streak
- Phase 1 Complete
- Daniel Fast Complete
- Prayer Warrior
- Journal Keeper
- Isaiah 58 Servant
- Finished the Plan

Dopamine feedback:
- Gentle animation when completing a check-in.
- Encouraging message.
- Confetti burst, but keep it tasteful and faith-centered.
- Example: “You showed up today. Small obedience still counts.”

### 5. Phase Overview Screen

Show all 8 phases in cards.

Each card:
- Image
- Dates
- Scripture
- Schedule summary
- Prayer focus
- CTA: “View Phase”

### 6. Settings Screen

Include:
- Reset progress
- Export journal
- Import journal backup
- Reminder time preference
- Theme preference
- Scripture translation note
- Safety disclaimer

## Daily Encouragement System

Create a local encouragement generator.

**Tone reference:** Match the Christ-centered, gentle, scripture-informed voice of [ChristGPT](https://github.com/ortegaalfredo/ChristGPT) — that repo is inspiration for *how* the messages should feel, not a name for this feature. Do not label the UI or code with “ChristGPT” or similar.

Tone:
- Christ-centered
- Gentle
- encouraging
- not condemning
- practical
- hopeful
- short enough to read daily

In the UI, call it **Daily Encouragement**. Internally, name the module `encouragements` (or similar).

Example encouragements:
- “Today is not about proving yourself. It is about returning your heart to God one decision at a time.”
- “Consistency is a form of worship when your heart is surrendered.”
- “You do not need a perfect day. You need an honest day with God.”
- “Small obedience still matters.”
- “Let hunger become a reminder to pray, not a reason to quit.”

## Check-In Flow

When the user taps “Complete Today’s Check-In,” ask:

- Did you follow today’s fasting plan?
- Did you pray over today’s focus?
- Did you read today’s scripture?
- Did you journal today?
- What is one win from today?

Then save the check-in.

Show:
- Updated streak
- Badge if earned
- Celebration message
- Suggest journaling if they have not journaled yet

## Safety and Health Notes

Include a small but visible safety note:

“Fasting is a spiritual discipline, not medical treatment. If you have a medical condition, take medication, are pregnant, have a history of disordered eating, or are doing 24-hour or no-water fasts, speak with a qualified healthcare professional first.”

For fast days, include:
- Hydrate when allowed.
- Break fast gently.
- Avoid binge eating after the fast.
- Stop if dizzy, faint, confused, or unwell.

## Design Style

Use the provided graphics as the foundation.

Visual style:
- Cute, clean, faith-based
- Soft cream background
- Phase-specific colors
- Rounded cards
- Scripture card with Bible icon
- Prayer card with heart or hands icon
- Fast day card with sun or water icon
- Streak card with flame icon
- Encouragement card with soft highlight

Make it mobile-first but nice on desktop.

## Suggested File Structure

```txt
src/
  app/
    page.tsx
    calendar/page.tsx
    journal/page.tsx
    progress/page.tsx
    phases/page.tsx
    settings/page.tsx
  components/
    TodayFastCard.tsx
    PhaseImage.tsx
    ScriptureCard.tsx
    PrayerPointsCard.tsx
    EncouragementCard.tsx
    StreakWidget.tsx
    CalendarGrid.tsx
    JournalEditor.tsx
    BadgeWall.tsx
    CheckInModal.tsx
  data/
    fastingPlan.ts
    encouragements.ts
  lib/
    dateUtils.ts
    streaks.ts
    storage.ts
    badges.ts
    dailyPlan.ts
  styles/
    globals.css
public/
  assets/
    phases/
      phase-01-daniel-1-fast-pattern.png
      phase-02-davids-fast-seeking-god.png
      phase-03-first-daniel-fast.png
      phase-04-joel-repentance-fast.png
      phase-05-isaiah-58-fast.png
      phase-06-second-daniel-fast.png
      phase-07-esther-preparation-fast.png
      phase-08-year-end-consecration.png
    fasting-plan-all-phases.png
```

## Implementation Requirements

- Use TypeScript.
- Create reusable components.
- Use local storage or IndexedDB for persistence.
- No backend required for MVP.
- Support offline mode.
- Add PWA manifest.
- Add service worker.
- Use semantic HTML.
- Ensure accessibility:
  - Proper labels
  - Keyboard navigation
  - Good color contrast
  - Alt text for images
- Make all date calculations timezone-safe using local date strings.

## Acceptance Criteria

The app is complete when:

1. Opening the app shows today’s correct phase and daily fasting details.
2. The calendar shows every date from June 13 to December 19.
3. Fast days are correctly marked for every phase.
4. Users can complete a daily check-in.
5. Streaks update correctly.
6. Users can write and save journal entries.
7. Users can revisit past journal entries.
8. Users can view all 8 phases.
9. Each phase uses its matching image.
10. The app is installable as a PWA.
11. The app works offline after first load.
12. The UI feels encouraging, clean, and easy to use.
13. Health and fasting safety notes are visible.
14. The app does not shame the user for missed days.
15. The full overview graphic is available somewhere in the app.

## Build Order for the Agent

1. Scaffold project.
2. Add Tailwind and base design system.
3. Copy image assets into `public/assets`.
4. Create `fastingPlan.ts`.
5. Build date logic in `dailyPlan.ts`.
6. Build Today screen.
7. Build Calendar screen.
8. Build local storage persistence.
9. Build check-in modal.
10. Build streaks and badges.
11. Build Journal screen.
12. Build Progress screen.
13. Build Phase Overview screen.
14. Add PWA manifest and offline support.
15. Polish UI animations and responsiveness.
16. Test all phase date rules.
17. Add README with setup instructions.

## Important Product Principle

This app should feel like a gentle companion, not a punishment tracker.

The emotional goal is:

“Open the app, know what today requires, feel encouraged to seek God, complete the day, journal honestly, and build momentum through consistency.”
