# PRD updates waiting to be pasted

Decisions made while building the demo. Paste each one into the PRD section it names, then delete it here.
Newest decisions go at the bottom of each section.

Everything up to 19 November 2026 is in the PRD.

## 11 Technical notes
- Storage: Supabase, one table `tests` (id, data as JSON, status, updated_at). Schema in `supabase/schema.sql`. Without the two env values the app stays a local demo with fake students.
- Students save through one function, `save_test`, and cannot read anything. A finished test can never be overwritten. A save that fails (offline) is kept in the browser and sent again later.
- The admin view needs a team sign-in (Supabase email and password). Sign-ups are off; team accounts are added in Supabase. A sign-in lasts about an hour.
- Change: no team sign-in. The deployed link is the student test only: no Admin or Content tabs, and any other link opens the test. Admin and content run only on the team's laptop (npm run dev), reading Supabase with the service key from `.env.local`, which never goes into a build. The `tests` table has no read policy, so nobody can read results with the public key.
- Change: the deployed site also has the admin at #/admin, behind one team password (no email). A Vercel function (`api/tests.js`) checks the password and reads Supabase with the service key, so neither is ever in the page. The password is remembered until the browser tab closes. Content stays on the laptop only.

## 6 Question bank
- The bank is 600 questions, 100 per level: 8 Starter, 16 Logic, 34 Lower grade, 33 Upper grade, 9 Grade task.
- Match and Sort cards split on the last lone "=" so code like "x = 5" or "4 == 4" can sit on the left. A right side must not contain "=".
- A Sort always has exactly 2 boxes. A question with one box per card is a Match (L5-G10-32 was changed to Match).
