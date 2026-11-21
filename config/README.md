# Config

Edit these, then `npm run build` (or `npm run deploy`). No code changes needed for anything below.

## rounds.json — round types

Each key is a round type. When the host begins a game, a plan is made:

- **big** round types (`"big": true`, e.g. standup) open the game and come back every `schedule.bigRoundEvery` regular rounds (game.json). If there are several, one is picked at random each time.
- **regular** round types fill the other `schedule.rounds` slots, picked at random by `weight` (default 1, 0 disables), never the same type twice in a row when there's a choice.

Fields:

| field | meaning |
|---|---|
| `kind` | the mechanic: `"text"` (write an answer), `"draw"` (canvas), `"standup"` (write `entries` jokes, performed later) |
| `label` | shown as "round 2 / {label}" |
| `seconds` | time to enter a response |
| `favorite` | text/draw: players also pick one favorite (worth `scoring.favorite`) |
| `entries` | standup: number of jokes |
| `card` | intro card before the round. `{time}` in rules becomes e.g. "3 minutes" |
| `prompts` | one is used per round, no repeats in a game. `{P}` becomes another player's character name. `{ "text": ..., "tag": "x" }` prompts are skipped if a prompt with the same tag was already used this game |
| `performance` | standup only: `seconds` on stage and the intro `card`. A performance follows every regular round after a standup, rotating through players |

Text/draw rounds go: task → review (likes) → vote (who's who) → results (+ boon for the top) → performance if a standup happened. Standup rounds go straight to the next round.

To add a new question-style round, copy `question`, rename the key, change `label`, `card`, `prompts`.

## game.json

`schedule`, phase `durations` (seconds), timer `labels`, `scoring`, `chat` delays, `drawing` canvas/palette, and `character.fields` (profile form; fields sharing a `line` are shown together as "a / b", `multiline` fields as paragraphs).

## boons.json

Boon menu labels. Delete a line to remove that boon. The keys are fixed mechanics (`guess`, `notes`, `likers`, `top`, `take`).
