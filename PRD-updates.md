# PRD updates waiting to be pasted

Decisions made while building the demo. Paste each one into the PRD section it names, then delete it here.
Newest decisions go at the bottom of each section.

## 3.2 Out
- Retakes stay out. Once a student presses Next, that answer is final: no going back, no changing it.

## 5 Placement logic
Goal: a first test that feels easy and still places well. Checked on 6,000 simulated new students (ages 6 to 18): about 8.5 questions instead of 9, 3.2 wrong instead of 4.4, three wrong in a row for 19% of students instead of 57%, right grade 53% instead of 51%, within one grade 84% instead of 82%.
- Warm-up: 1 starter, then up to 3 medium logic questions (was 1 medium and 1 hard). The starter is for confidence and does not count toward the warm-up. Pass at 2 of 3, so one slip never moves a student down a level: 2 right in a row and the third is not asked. Settings "warm-up pass" stays 2.
- Skill check, and skill check one level higher: lower grade easy, lower grade medium, upper grade medium (the upper grade hard is gone). One level higher at 3 of 3; lower grade at 0 or 1.
- Why no hard question in those steps: it was always last, and a student could only earn it by getting everything before it right, by which point the step is already decided.
- Final check: 3 lower grade questions and 1 grade task, upper grade at 3 of 4 as before. A hard question only comes when every earlier question in the step was right; otherwise a medium is drawn instead.
- Every step stops once the questions left cannot change where the student goes. The grade task is always shown, even when the final check is already decided.
- A test is still 3 to 15 questions.
- "Perfect one level higher" (Innovators) is now 3 of 3.
- Tier cut-offs stay 45 and 75. In the simulation the tier mix moves from about 52/35/12 to 20/61/18 (Explorers/Creators/Innovators), but the tier was close to chance before and after, so the cut-offs should be set from pilot data, not the simulation.
- The sheet's Adaptive Rules tab needs the same changes.

## 6.1 Getting in
- Until test links exist, the student types their name and picks their age. Start stays off until a name is typed.

## 6.2 Practice question
- Read-aloud never plays by itself. If the practice answer is wrong or takes over 20 seconds, the Listen button stands out (orange, with its label) on every question after it.
- Ages 6 to 9: "Put the apple in the basket", with a ball and a star as the other choices. One tap on the apple drops it in; dragging works too, so no child gets stuck on the first screen. If the student taps instead of dragging, or takes over 20 seconds, later drag questions show tap instructions. Tap works on every drag question anyway.

## 6.3 The question screen
- Replace "Read-aloud plays on its own for ages 6 to 7" with: "Read-aloud plays only when the student taps Listen."
- A question should fit on one screen. On wider screens: a picture, stage, code or block program sits beside the answers; order cards sit beside their numbered slots; the block palette sits beside the script; four short options go in two columns.
- Next stays pinned to the bottom of the screen, so it is never scrolled away.
- Text-only questions use a narrower card with bigger answers (64 px tall, larger text). Questions with a picture, code, stage or drag answers use the full width.
- A small rocket rides the progress bar. After each answer it moves forward and one short line pops up ("Nice work", "Keep going", "Good thinking"...). The line never depends on whether the answer was right.

## 6.4 Question types
- Stage questions (robot, bee, number line). The stage stays still while the student answers. Next locks the answer, the stage plays it, then the test moves to the next question by itself. There is no separate Run button, and no trying again.
- Match. Drag from a card's dot to its partner, or tap a card and then its partner. A colored line joins each pair. Drop on nothing to undo.
- Order, Levels 1 to 2. Scratch-style blocks: drag blocks from the palette into the script, or tap a block to add it. In the sheet, ">" at the start of an option means the block goes inside the block above it.
- Order, code. The lines start out of order inside the editor, never already right. The student drags them up or down, or taps a line and then where it goes. Indentation is fixed, like a real editor.
- Sort. Drag each card into one of two boxes, or tap a card and then a box.

## 6.6 Pictures
- Option pictures must be big enough to read: 120 px tiles, 88 px in a list. Four picture options sit in one row on wider screens.
- Emoji in the sheet are shown as drawn icons, never as emoji. A new emoji needs an icon added first; the bank script stops with a message until it is.

## 6.7 Buddy
- Removed. A made-up character did not feel real or close to our students' culture. The name and age screen has only name and age; the admin shows the student's initials where the iSchool admin shows a photo.

## 6.9 The end
- The end screen shows the icon of the student's grade from the iSchool roadmap. Only the icon: no track name or topics.
- Replace the ending with: "You're a Creator in Grade 4! Our team will contact you soon." (Explorer, Creator or Innovator). The student sees only their own tier name, never the other names, an order or a score. Arabic: "أنت من المبدعين في الصف 4!"
- In the demo only, a small "New student" link lets the next person on the same device start.

## 7.2 One test (roadmap)
- The Group box shows the group name, the grade's icon and track ("Grade 4: AI Explorer"), the level and lower or upper grade, and the tier with its number: Explorers (Tier 1), Creators (Tier 2), Innovators (Tier 3). Tier badges everywhere in the admin show the number.
- Each level row starts with its two grade icons from the iSchool K12 V2.0 roadmap (2026 deck), with the track name on hover. The final milestone shows the placed grade's icon; clicking it shows the track and what the grade covers. Clicking a step shows its level's two grades.

## 7.1 Test list
- The student code is click to copy for now. Linking it to the iSchool admin needs the URL format of the student page (open question).

## 7.2 One test
- Flags (missed starter, very fast answers, odd pattern) show under the strength score.

## 8 Content view
- Flowchart: every step with its score branches, built from the Settings numbers. Clicking a step lights up where students come from and where they go.
- Question bank: a "Changed in v4" filter shows every edited question with what changed, why, and its old wording.

## 9 Questions and settings sheet
- v4 content (100 questions): definitions became doing questions, tool names removed (Sprite Lab, Godot, Figma, Unity, pandas and others), every starter at Levels 3 to 6 has 4 options, icons on young students' options.
- v5 content (7 questions): L3-LG-05 shows both steps in the code box; L3-LG-02 is now "who is the shortest" (the number guessing game was unclear); L6-DL-02 is now phone storage (spreadsheet ##### needs spreadsheet use); L6-LG-02 and L6-LG-03 are harder, they were too easy for a medium at ages 16 to 18; L1-LG-03 has new shape pictures with sharp corners marked; L1-G2-12 has a row of tiles to count and says "will it move". All in ChangeLog.csv.
- v5 options (72 questions): every wrong option now comes from the same family as the right answer and sounds possible. Starter and Easy: same category, wrong once you think. Medium: neighbor ideas (UI vs UX, authentication vs authorization, DNS vs DHCP). Hard: the usual mistake. Options are close in length so the right one does not stand out. Each question's "why" was rewritten to match. Four Level 1 questions with option pictures (L1-G1-01, -04, -05, -06) keep their wording until new pictures are drawn.
- Option pictures fill their tile (up to 220 px wide). L1-G1-15 got new block pictures that fill the frame.
- A picture can be a file drawn in the repo: write "q/name.svg" in the picture column instead of a Drive link.
- The bank has a test that every question stays within the word limit for its age (Start here tab), and that every stage belongs to a real question.

## 11 Technical notes
- Test status values: in progress, finished, expired.

## 10 Brand
- The name and age screen has a plain background. When the student presses Start, it fades (about 1 second) into their age's background, all in brand colors: sky with clouds (6 to 9), dots with soft shapes (10 to 13), a fine grid (14 to 18).
- The logo stays still. The brand rules forbid moving or changing its parts, so the rocket on the progress bar is what feels alive.

## 12 Open questions
- What is the URL of a student's page in the iSchool admin, so the student code can link to it?
