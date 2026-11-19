# Notes for Claude Code and developers

The PRD is the source of truth: [iSchool Placement Test PRD](https://docs.google.com/document/d/1Tx9PsSYmmA0DU_IToRnGX8upIXgo-ntrOK6l6h2j--c/edit). Read it before changing behavior. This file only lists what is easy to get wrong.

## This is a demo
- Front end only. Storage is localStorage through `src/store.ts`, nothing else touches it.
- Fake students (seeded in `store.ts`). No backend, no login. Ignore PRD section 11 (Supabase, team login) for now.

## Rules that must match the PRD
- Placement logic is PRD section 5. `src/engine/engine.ts` implements it, and every row of the "Every possible score" table (5.3) has a test in `src/engine/engine.test.ts`. Change the PRD, the engine and the test together, then run `npm test`.
- Numbers (pass marks, tier cut-offs 45 and 75) come from the sheet's Settings tab. Questions come from its Questions tab: export as CSV, run `npm run bank -- file.csv`, then `npm test`.
- 3 to 15 scored questions. The first scored question is always a Starter.
- Tiers: Explorers, Creators, Innovators. Group name is tier plus grade, like "Creators G4".
- Students see only their grade. Never show them the tier, score, strength or right and wrong.
- Stages (robot, bee, number line) stay still while the student answers. "Run it" locks the answer, then plays it, then Next. Never let a student run an answer they can still change.
- No XP, no points, no streaks for students.
- No retakes. A finished test is final. An unfinished test resumes within 24 hours, then expires.
- Say Lower grade and Upper grade, and real grade numbers (Grade 1 to 12). Never "Grade A" or "Grade B".

## Views
- Student `#/student`, Admin `#/admin` and `#/admin/<id>`, Content `#/content/<tab>`. Hash routing in `App.tsx` so any static host works.
- Admin is for the team that talks to parents. It lists finished tests only.

## Brand and copy
- Colors in `src/index.css` (@theme). Blue leads, orange accents, a little gold. Light screens at every age, no dark mode.
- Baloo 2 headings, Nunito Sans body, Noto Sans Arabic. Arabic is full RTL, code stays LTR.
- No emoji as icons, no confetti, no gradient banners, no cheerleading copy. See PRD section 10.
- Copy is short, warm and plain. Never use the long dash character.

## Stack
React 18, TypeScript, Tailwind v4, motion, lucide-react. Don't add dependencies for what a few lines can do.
