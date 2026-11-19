# PRD updates waiting to be pasted

Decisions made while building the demo. Paste each one into the PRD section it names, then delete it here.
Newest decisions go at the bottom of each section.

Everything up to 19 November 2026 is in the PRD.

## 11 Technical notes
- Storage: Supabase, one table `tests` (id, data as JSON, status, updated_at). Schema in `supabase/schema.sql`. Without the two env values the app stays a local demo with fake students.
- Students save through one function, `save_test`, and cannot read anything. A finished test can never be overwritten. A save that fails (offline) is kept in the browser and sent again later.
- The admin view needs a team sign-in (Supabase email and password). Sign-ups are off; team accounts are added in Supabase. A sign-in lasts about an hour.
