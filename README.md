# iSchool Placement Test (v2 demo)

An adaptive placement test for ages 6 to 18. It finds the **level**, then the **grade** (Grade 1 to 12), then a **tier** (Foundation, Core, Advanced) that the team uses to build group sessions.

Source of truth for questions and rules: the Google Sheet **"iSchool Placement Test v2: Blueprint, Rules, Tiers and Question Bank"**.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # engine tests: every score path, tiers, all 366 answer keys
npm run build      # static site in dist/
```

## Deploy

`npm run build` makes a static site in `dist/` (relative paths, hash routing). Any static host works:

- **Vercel or Netlify**: import the repo. Build command `npm run build`, output folder `dist`.
- **Netlify Drop**: drag the `dist` folder onto app.netlify.com/drop for an instant link.
- **Cloudflare Pages, GitHub Pages, S3**: upload `dist`.

## Three views

| View | URL | What it is |
|---|---|---|
| Student | `#/student` | Name, age, avatar, practice round, the adaptive test, grade reveal. English and Arabic (RTL). Audio on every question, auto-play for ages 6 to 7. |
| Admin | `#/admin` | Every test taken, KPIs, filters, **session groups** (grade x tier board). `#/admin/<id>` opens one test: journey roadmap, tier gauge, flags, every answer with a drawer. |
| Content | `#/content/bank`, `rules`, `tiers`, `sim` | Bank browser with live student preview (EN/AR, answer key), editable rules with the every-score table, tier rules, simulator. |

## How the code is laid out

```
src/engine/engine.ts     The adaptive rules, answer checking, tiers, simulator. Pure functions, no UI.
src/engine/engine.test.ts One test per row of the "Every possible score" table in the sheet.
src/data/bank.json       366 questions, generated from the sheet (npm run bank -- file.csv).
src/data/ladder.ts       Levels, tools, "what you will learn", avatars, emoji for young options.
src/store.ts             Storage adapter. localStorage for the demo; swap for an API (see below).
src/question/            One QuestionView used by student, admin and content. Visual.tsx draws stages,
                         shape patterns, Scratch-style blocks and code without image files.
src/student/ admin/ content/   The three views.
```

## Going live (what is missing on purpose)

The demo stores tests **in the browser**. Each device sees its own tests. For real use:

1. **Backend**: add Supabase (or Firebase). Two tables: `tests` (one JSON row per `TestRecord`) and `config`. Replace the functions in `src/store.ts`; nothing else changes.
2. **Sign-in for the team**: protect `#/admin` and `#/content` (Supabase Auth with Google sign-in for @ischooltech.com).
3. **Student links**: give each student a link with a code instead of typing a name.
4. **Pictures**: the sheet's Drive images are not used. Visuals are drawn in code. Add new ones in `Visual.tsx`.
5. **Pilot**: run 50 to 100 students, then set the pass marks and tier thresholds (45 and 75) in Content > Rules so each tier holds about a third of students.
