# PRD updates waiting to be pasted

Decisions made while building the demo. Paste each one into the PRD section it names, then delete it here.
Newest decisions go at the bottom of each section.

## 3.2 Out
- Retakes stay out. Once a student presses Next, that answer is final: no going back, no changing it.

## 6.1 Getting in
- Until test links exist, the student types their name and picks their age. Start stays off until a name is typed.

## 6.2 Practice question
- Read-aloud never plays by itself. If the practice answer is wrong or takes over 20 seconds, the Listen button stands out (orange, with its label) on every question after it.
- Ages 6 to 9: "Put the apple in the basket", with a ball and a star as the other choices. One tap on the apple drops it in; dragging works too, so no child gets stuck on the first screen. If the student taps instead of dragging, or takes over 20 seconds, later drag questions show tap instructions. Tap works on every drag question anyway.

## 6.3 The question screen
- Replace "Read-aloud plays on its own for ages 6 to 7" with: "Read-aloud plays only when the student taps Listen."
- A question should fit on one screen. On wider screens: a picture, stage, code or block program sits beside the answers; order cards sit beside their numbered slots; the block palette sits beside the script; four short options go in two columns.
- Next stays pinned to the bottom of the screen, so it is never scrolled away.

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
- Five parts: color (6), face (4), top (5), outfit (4), extra (4). Built on the name and age screen, no extra screen. Saved as a short code so a designer can swap the drawings later without changing saved tests.

## 6.9 The end
- In the demo only, a small "New student" link lets the next person on the same device start.

## 7.1 Test list
- The student code is click to copy for now. Linking it to the iSchool admin needs the URL format of the student page (open question).

## 7.2 One test
- Flags (missed starter, very fast answers, odd pattern) show under the strength score.

## 8 Content view
- Flowchart: every step with its score branches, built from the Settings numbers. Clicking a step lights up where students come from and where they go.
- Question bank: a "Changed in v4" filter shows every edited question with what changed, why, and its old wording.

## 9 Questions and settings sheet
- v4 content (100 questions): definitions became doing questions, tool names removed (Sprite Lab, Godot, Figma, Unity, pandas and others), every starter at Levels 3 to 6 has 4 options, icons on young students' options.
- The bank has a test that every question stays within the word limit for its age (Start here tab), and that every stage belongs to a real question.

## 11 Technical notes
- Test status values: in progress, finished, expired.

## 12 Open questions
- What is the URL of a student's page in the iSchool admin, so the student code can link to it?
