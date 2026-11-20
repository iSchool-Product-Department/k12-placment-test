# PRD updates waiting to be pasted

Decisions made while building the demo. Paste each one into the PRD section it names, then delete it here.
Newest decisions go at the bottom of each section.

Everything up to 19 November 2026 is in the PRD.

## 11 Technical notes
- Addresses: the student test is the home page (/), the admin is /admin (one test: /admin/<id>), content is /content/<tab>. Students see no tabs. For the demo, admin and content are open with no password; add one before real students take the test.
- Storage: Supabase, one table `tests` (id, data as JSON, status, updated_at). Schema in `supabase/schema.sql`. Without the two env values the app stays a local demo with fake students.
- Students save through one function, `save_test`, and cannot read anything. A finished test can never be overwritten. A save that fails (offline) is kept in the browser and sent again later.
- The admin view needs a team sign-in (Supabase email and password). Sign-ups are off; team accounts are added in Supabase. A sign-in lasts about an hour.
- Change: no team sign-in. The deployed link is the student test only: no Admin or Content tabs, and any other link opens the test. Admin and content run only on the team's laptop (npm run dev), reading Supabase with the service key from `.env.local`, which never goes into a build. The `tests` table has no read policy, so nobody can read results with the public key.
- Change: the deployed site also has the admin at #/admin, behind one team password (no email). A Vercel function (`api/tests.js`) checks the password and reads Supabase with the service key, so neither is ever in the page. The password is remembered until the browser tab closes. Content stays on the laptop only.

## 6 Question bank
- The bank is 600 questions, 100 per level: 8 Starter, 16 Logic, 34 Lower grade, 33 Upper grade, 9 Grade task.
- Match and Sort cards split on the last lone "=" so code like "x = 5" or "4 == 4" can sit on the left. A right side must not contain "=".
- A Sort always has exactly 2 boxes. A question with one box per card is a Match (L5-G10-32 was changed to Match).
- Ages 6 to 9 (levels 1 and 2): cards with no picture get a drawn icon from their words (a coin, a keyboard, a moon). A question gets icons only when every card gets a different one, so a Sort never hints with matching icons. Long text answers (over 3 words) stay text.
- New stages: L1-G2-21 (robot repeats forward twice), L1-G2-22 (closed door: wait or bump), L1-G2-23 (robot turns right four times).
- Scenes (ages 6 to 9): small drawings for word-only questions, never showing the answer before Next. Like stages, they stay still while the student answers (marking the pick where it fits), then play after Next and the test moves on: the stars join, a dot hops along the week, the car drives the picked way, app screens tap Start, count the score, bring the sprite forward, change screen or build in the student's order, AI steps light up in turn, and the chatbot types its reply. Counting stars (L1-G1-23), a week strip (L2-LG-04), children in a line (L2-LG-07, L2-LG-01), app screens for App Lab questions (L2-G3-01, 09, 12, 19, 21, 23, 25, 28), chat bubbles and picture rows for AI questions (L1-G2-24, L2-G4-02, 03, 06, 08, 09, 10, 15, 16, 18, 20, 21, 22, 24).
- 600-question audit (iSchool_Placement_600_Question_Audit_FOR_REVIEW.csv): 36 flagged questions rewritten and 5 fixed for ".0". Each row's Reviewer decision and note say what changed. Rewrites keep the ID, pool, difficulty and (except L6-LG-10, now Text MCQ) the type. New ones get a visual where it helps: robot stages (L1-LG-12, L1-G2-21, L1-G2-28, L6-LG-06), a number line (L6-LG-10), drawn balls (L1-LG-16), icons, and scenes (L2-G4-21, L3-LG-05, L6-LG-09, L6-DL-07).
- Whole numbers never show as "2.0". A test fails if one does, unless the code really makes a float.

- Second audit (iSchool_Placement_All_600_Difficulty_Audit.csv): 54 drafted replacements written in full (options, Arabic, why), mostly plainer Lower-grade and warm-up questions for levels 5 and 6. Difficulty changes: L5-LG-10, L5-G10-17 and L6-LG-16 Hard to Medium, L1-G2-28 Medium to Easy. Each row's decision is in the audit file.
- Game screens for ages 6 to 9 (GameScene.tsx): game-making questions show a small game picture (the cat mid-jump, a coin to collect, a wall). After Next it acts out the student's answer. An Order rebuilds the game in their order, and "Test" only works if what it needs came first; a wrong order just does not work, with no right or wrong shown. Used on L1-G1-22, 24, 29, 30, 31, L1-T-07, L2-G3-11, 14, 16, 29. Still pictures on L1-G1-07 and L2-LG-05; robot stage with a gate on L1-G2-18.
- L1-G2-12 now has a goal: "Repeat 4 times: move forward. Where does the robot stop?" A row with a battery 1 step away, a star 4 away and a flower 5 away. After Next the robot moves to the picked spot. The wrong answers are still the same mistakes (counting the block once, or one step too many).
- Playback after Next is neutral: no shake, no pop at the goal, nothing that reads as right or wrong. A step that cannot work just does nothing (the cat stands still, the robot bumps and stops). Every playback is capped at about 2.5 seconds, and a tap on the stage skips to the next question.
- Game screens no longer show small icon chips in the corner as parts are added.
- Screen readers: drawn stages and scenes are read from the sheet's picture note (On screen column), when it describes a picture.
- Ages 6 to 9: card icons are drawn as filled shapes on a soft blue tile, to match the stage drawings. Older students keep line icons.
- Pictures for young ages stay drawings of things in the question (a cat, a coin, a robot), not a character with a name or personality, so the no-mascot rule holds.

## 5 Placement steps
- "Skill check" is now called "Grade check" in the admin and content views: it decides the lower or upper grade of the age's level. "Grade check one level higher" for the step above.

## 6.3 Read-aloud
- Listen still only plays when tapped. While it reads, the student can Pause or Start again; while paused, Resume or Start again.
