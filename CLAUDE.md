# Notes for Claude Code and developers

The PRD is the source of truth: [iSchool Placement Test PRD](https://docs.google.com/document/d/1Tx9PsSYmmA0DU_IToRnGX8upIXgo-ntrOK6l6h2j--c/edit). Read it before changing behavior. This file only lists what is easy to get wrong.

Every decision made while building goes into `PRD-updates.md` (by PRD section) until someone pastes it into the PRD.

## Storage
- Everything goes through `src/store.ts`. With `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set (`.env.local`), tests save to Supabase (`src/cloud.ts`, plain fetch, schema in `supabase/schema.sql`) and the admin needs a team sign-in. Without them it is a local demo with fake students seeded in `store.ts`.
- Students can only call `save_test`; they can never read results. Keep it that way.

## Rules that must match the PRD
- Placement logic is PRD section 5. `src/engine/engine.ts` implements it, and every row of the "Every possible score" table (5.3) has a test in `src/engine/engine.test.ts`. Change the PRD, the engine and the test together, then run `npm test`.
- Numbers (pass marks, tier cut-offs 45 and 75) come from the sheet's Settings tab. Questions come from its Questions tab: export as CSV, run `npm run bank -- file.csv`, then `npm test`.
- 3 to 15 questions. The first is always a Starter, and it does not count toward the warm-up. Warm-up passes at 2 of 3 logic, so one slip is forgiven. No hard question before the final check; there, a hard one only after all right so far. A step stops once it is decided; the grade task is always shown.
- Tiers: Explorers, Creators, Innovators. Group name is tier plus grade, like "Creators G4".
- Students see only their grade and their tier as a name: "You're a Creator in Grade 4!". Never the other tier names, an order, the score, strength or right and wrong.
- Read-aloud plays only when the student taps Listen. Never on its own.
- Option pictures stay big enough to read. Students should not scroll to reach the answers.
- Stages (robot, bee, number line) stay still while the student answers. Next locks the answer, plays it, then moves on by itself. Never let a student change an answer after Next.
- No XP, no points, no streaks for students.
- No retakes. A finished test is final. An unfinished test resumes within 24 hours, then expires.
- Say Lower grade and Upper grade, and real grade numbers (Grade 1 to 12). Never "Grade A" or "Grade B".

## Views
- Student `#/student`, Admin `#/admin` and `#/admin/<id>`, Content `#/content/<tab>`. Hash routing in `App.tsx` so any static host works.
- Admin is for the team that talks to parents. It lists finished tests only.

## Brand and copy
- Colors in `src/index.css` (@theme). Blue leads, orange accents, a little gold. Light screens at every age, no dark mode.
- Baloo 2 headings, Nunito Sans body, Noto Sans Arabic. Arabic is full RTL, code stays LTR.
- No emoji as icons, no confetti, no gradient banners. The only praise is the short line by the progress-bar rocket after each answer ("Nice work"), never tied to right or wrong. No characters or mascots. See PRD section 10.
- Plain background on the name and age screen; after Start it fades into the age's background (brand colors only). The logo never moves or changes (brand rule).
- Copy is short, warm and plain. Never use the long dash character.

## Stack
React 18, TypeScript, Tailwind v4, motion, lucide-react. Don't add dependencies for what a few lines can do.
