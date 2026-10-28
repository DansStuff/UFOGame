# NoPROBElem

| | |
|---|---|
| Public experience title | NoPROBElem — IP & [Content Policy](https://decentraland.org/content/) status: owner declaration: TBD; name screening: not searched; unresolved: title screening TBD |
| Deployment target | Decentraland World `noprobelem.dcl.eth` (TBD: World name not yet registered) |
| Studio / team name | DanL |
| Date | 2026-10-26 |
| Contact (Discord + email) | discord: banting_ · daniellucasdev@gmail.com |

---

## 0. TL;DR

| | |
|---|---|
| **Player promise** | You're with a clumsy crew of aliens, snatching creatures from the planet's surface and hunting for the rarest finds. |
| **Primary player** | For completionists and collectors, including Decentraland's existing wearable-motivated community, arriving alone or with friends, looking for rare finds to collect. |
| **Current status** | Core-mechanic prototype in SDK7: players tilt the ship by where they stand, and the planet spins beneath it. Abduction and codex are not built yet. Playable link: World `danl.dcl.eth` — a simple, work-in-progress prototype of ship movement only. |
| **Requested round** | V0 |
| **Live at end of the round** | A player can walk to steer the shared saucer over a round planet, abduct creatures and fill an 8-creature codex, alone or with a crew, live in our World. |

---

## 1. Player Promise

**One-line promise**

You're with a clumsy crew of aliens, snatching creatures from the planet's surface and hunting for the rarest finds.

**One familiar comparison**

It's like an arcade claw machine, but you're on a team of aliens working to "abduct" the prize.

**Why this game**

I think I can make an experience that is immediately understandable and rewarding as soon as the player moves their avatar. I'd like the game to be a fun way to hand out collectables while having emergent social value.

---

## 2. First Minutes & How to Play

| Time | Player experience |
|---|---|
| **0–5 seconds after control** | You spawn near the middle of the saucer. Other crew are likely flying toward a target or abducting in the middle. A prominent indicator points to the next target or the abduction in progress. |
| **5–10 seconds** | You walk toward the saucer's edge and the ship flies that way. With lots of players, it follows the largest group, with a small pull toward the target. TBD: exact multiplayer controls, settled in playtesting. During an abduction, you step into the middle to help. |
| **10–60 seconds** | Flight to the target takes about 45 seconds; the crew makes small adjustments until the ship is centered over it. The abduction starts once it is, and everyone can stand in the safe zone in the middle, which doesn't steer, for about 30 seconds while the abduction animation plays. TBD: whether standing is enough or needs something more interactive, like a skill-check UI; decide after playtesting. |
| **1–3 minutes** | Your first full cycle ends: fly, then abduct. Every player sees a brief cinematic of the catch. You get a codex entry and currency toward an unlockable cosmetic. |
| **3–10 minutes** | You play a few more cycles. Rarity varies, so you want to see the next target and keep earning and collecting. |
| **Natural stopping point** | Your codex shows the empty slots still to fill and your progress toward the next cosmetic. Tomorrow your daily streak reward lands with your first catch: a little currency on days 1 and 2, then the full "double catch" from day 3 — an extra random common or uncommon creature. |

**Player-facing How to Play**

- Walk to the ship's edge to fly there
- Stand in the middle to abduct and collect
- The ship follows where most crew stand

---

## 3. Core Loop

| # | Step (verb) | What the player does (Player input → what they see or hear → what changes) | Why do it again? |
|---|---|----------------------------------------------------------------------------|---|
| 1 | Fly | Walk toward the saucer's edge, or with the crowd → the planet turns under the ship and a new target comes over the horizon → the ship arrives at the target in about 45 seconds | You never know what the next target will be; it might be a rare one. |
| 2 | Abduct | The crew makes small adjustments back and forth until the ship is centered over the target, then everyone can stand in the middle safe zone, which doesn't steer → the abduction starts and its animation plays for about 30 seconds → the target is pulled up | Every crew member in the middle helps complete the catch. |
| 3 | Reveal & Collect | No input: players only act while the abduction is in progress → every player sees a brief cinematic view of the catch → you get a codex entry and currency toward an unlockable cosmetic | New finds fill the codex; duplicates still give a small currency bonus. |

| | |
|---|---|
| **One complete loop takes** | About 75 seconds of flight and abduction, plus the cinematic. The cinematic marks completion; a codex entry and currency follow. |
| **Decision, challenge, or expression** | Timing and coordination to start the abduction: the ship must be centered over the target, so the crew makes small adjustments back and forth together, then gathers in the middle safe zone, which doesn't steer. |
| **Shortest satisfying visit / typical session** | 3–4 abductions (about 4–5 minutes) / about 10 minutes (roughly 7–8 abductions), on the low side for a casual mobile game. The shortest visit is long enough to collect the daily streak reward and likely see at least one uncommon target. |
| **Why repetition 10 remains appealing** | Hunting for rare finds and collecting currency. Duplicates give a small currency bonus, so no catch is wasted. |

**Pillars**

1. Movement is the controller
2. What's over the horizon?
3. Every catch is shared

---

## 4. Why Players Come Back

### 4.1 The next-day (D1) sentence

> "A player who enjoyed their first session returns the next day (D1) because Hook 1, the daily streak, pays its next reward on their first abduction after 00:00 UTC, which they know or anticipate from the streak reward shown before they leave."

### 4.2 The progression chain

> **Repeatable action → persistent reward → new capability, status, or social role → new decision or challenge**

| Moment | What persists or has been built? | What becomes possible next? | How can another player tell? |
|---|---|---|---|
| **End of first session** | A few codex entries, some currency and a day-1 streak | Tomorrow's streak reward, shown before you leave | Your nametag shows your current codex completion |
| **End of first week** | The base codex completed or close to it, possibly including the rare; currency toward, or spent on, a first cosmetic | Hunting the golden and rainbow variants | Your nametag shows a completed base codex |
| **Week 3+ — what takes more than two weeks?** | Golden and rainbow variants, shown as small icons on codex entries | True completion: every variant of all 8 creatures | Your nametag shows your codex completion |

Your first catch of the day brings a bonus creature: day 5 of your streak. Your nametag shows a completed base codex, so the crew can see you've already found all 8 creatures. You stand in the middle with them anyway, because now you're watching the horizon for a golden or rainbow variant. Every duplicate still adds currency toward your next cosmetic.

Currency: earned from abductions, duplicate catches and the day 1–2 streak reward; spent on unlockable cosmetics, such as a miniature probing contraption hat. Main abuse risk: idling in the middle of the ship to earn without helping. This is acceptable for a casual game; if it becomes a problem, players would need to take part in a small abduction skill check to get credit (see the abduction TBD in Section 2).

### 4.3 Two return hooks

| Selected hook | Exact trigger or timing | What the player anticipates | Reminder channel + no-reminder fallback |
|---|---|---|---|
| **1.** Daily goals + streak — the daily "double catch" | Resets at 00:00 UTC. The reward is handed out when your first abduction of the day completes, and it escalates with your streak: a bit of currency on days 1 and 2, then from day 3 onwards the full bonus: an extra random common or uncommon creature. A missed day resets the streak. (Future, not v1: a microtransaction to save the streak.) | Keeping the streak alive and reaching the bonus creature | No reminder channel in v1. Fallback: the stopping point shows tomorrow's streak reward before you leave. |
| **2.** Collection — the codex | Each new creature fills a codex slot; duplicates give a small currency bonus. v1 has one planet with 8 creatures: 4 common, 3 uncommon and 1 rare. The rare one likely takes 5–10 play sessions to find. Each creature also has golden and rainbow variants that multiply its rarity. Later planets would get their own codex tabs. The codex is visibly "completed" once all 8 base creatures are found. True completion requires every golden and rainbow variant as well, each shown as a small icon overlaid on that creature's codex entry. At true completion, the player has effectively finished the game. A rotating set of unlockables to save currency for depends on future support for the game. | The next empty slot, especially the rare finds | No reminder channel in v1. Fallback: the stopping point shows your empty codex slots. |

---

## 5. Social by Design

| | |
|---|---|
| **The repeatable social loop** | Player A walks toward the edge facing the target → Player B joins them, adding to the largest group → together they center the ship over the target, then gather in the middle safe zone → the shared cinematic catch, which everyone on board receives, gives them a reason to stay for the next target. |
| **The disappearance test** | Little breaks: a solo player can still fly and abduct alone. They lose the crew's extra speed (more players tilt the ship faster) and the on-screen rarity boost, which scales with the number of players. |
| **From strangers to a group** | Everyone has the same role. The prominent indicator points to the current goal, and the crowd at one edge shows where to go; walking with them is coordinating. No voice or shared language is needed. |
| **Recognition & continuity** | Names show above avatars, and custom nametags show each player's codex completion. Codex progress persists between visits, so returning players can spot who has completed the base codex. |
| **Quiet hours & player counts** | With nobody else online, a solo player enjoys the full loop because each target coming over the horizon might be a rare find. With a crew, the ship moves slightly faster and an on-screen rarity boost grows with each player. Social play becomes viable at 2 players, when positioning needs coordination and the speed boost starts; the ideal group is as many as possible, for the rarity boost; the target player count is 15 players, a realistic number for our playtests; play doesn't change much after the first few, and we expect no performance issues as it scales. Tested count: not tested. There is one shared ship with no instancing, so every arrival lands on the same saucer as everyone else online. |
| **Drop-in / drop-out** | A late arrival spawns near the middle of the ship, and the indicator points to the flight or abduction in progress, so they can join it at once. The ship follows the largest group with a small pull toward the target, so a player who leaves or walks the wrong way cannot stop everyone else. |
| **Visible play (the bystander test)** | You see the crew bunch up at one edge and the saucer swing toward a creature coming over the horizon. |
| **Shareable play (the memorable moment)** | A rainbow rare coming aboard: the whole crew watches the collection animation, then the cinematic shows the catch. |
| **Bring-a-friend** | The abduction only starts once the ship is positioned over the target, so when a rare target comes over the horizon the crew can wait beside it and invite friends to share the catch. The rarity boost grows with every player, so a crewed ship snowballs: people invite friends to share in the loot. |

---

## 6. Mobile-First

**Every core-loop verb on touch.**

| Core-loop verb | How it works with touch controls |
|---|---|
| Fly | Standard character locomotion: walk with the on-screen joystick toward the edge you want the ship to fly to |
| Abduct | Make small position adjustments to center the ship over the target, then walk into the middle safe zone. If a skill check is added, it uses standard pointer events (tap) |
| Reveal & Collect | No input: watch the catch cinematic; the codex entry and currency are added automatically |

**UI plan.**

The screen stays nearly empty. The indicator toward the next target or the abduction in progress is an in-world 3D arrow, combined with an on-screen UI indicator that helps the player orient toward it. The rarity boost is shown in the on-screen UI. An on-screen button opens the codex, a scrolling grid of thumbnails, 4 per row so they stay visible on a small screen (adjustable if they are too small).

**Performance.**

Target: 60fps on recommended desktop hardware and 30fps in the mobile client, both at 15 players — our target player count. Planned mobile test device: Pixel 10 Pro in the mobile client. Not tested yet.

**Desktop-only dependencies.**

None planned: movement is standard locomotion and any skill check uses standard pointer events. TBD: confirm the catch cinematic camera and custom nametags work in the mobile client.

---

## 7. World, Look & Story

**Story / world**

The aliens are obsessed with human wearables and accessories, and they are trying to get some for themselves. It's a confusing process, so they abduct all kinds of things.

**Visual direction**

Our signature shot: the crew bunched at one edge, tilting the saucer toward a creature coming over the horizon — the main mechanic and the most unique thing about the game in one frame. The objective stays readable on a small screen through the in-world 3D arrow and the on-screen indicator. The style is low poly and cartoony, with a bit of atompunk. In the middle of the ship, an animated probing contraption works while the abduction is in progress: a bunch of tools and implements that jab randomly toward the target. It evokes alien "probing" and matches the aliens' general incompetence, like the clumsy ship movement and their irrational obsession with accessories.

---

## 8. Audience & Comparables

**Primary player + arrival context**

For completionists and collectors, including Decentraland's existing wearable-motivated community, arriving alone or with friends, looking for rare finds to collect.

**How the first group arrives**

The biggest and easiest driver is Decentraland Events, which depends partly on future support for the game. Because everyone lands on one shared ship and crew play starts at just 2 players, a single event can reach the social threshold.

**Deliberately not for**

Players looking for deep gameplay and customization systems.

### Comparables

| | Comparable A — outside Decentraland: arcade claw machine | Comparable B — outside Decentraland: gacha parlor |
|---|---|---|
| What we observed works | Instantly readable: you see the prize and the clumsy grab, and the near miss makes you want another go | Rarity tiers and the drive to complete a set keep people coming back for one more pull |
| What does not fit our audience or context—and why | Solo and pay-per-play; nobody else changes your attempt | Paid pulls; collecting is private, not shared |
| What we will do differently | A whole crew steers and shares every catch, and play is free | Catches are earned through play, everyone on board receives them, and codex completion shows on your nametag |

---

## 9. 4 Week Plan (v1 scope)

| Week | What is playable / done |
|---|---|
| 1 — Prototype definition | Ship steering moves from averaging player positions to following the largest group, with a small pull toward the target. Targets spawn and come over the horizon; the 3D arrow and on-screen indicator point to them. Greybox art. |
| 2 — Core interaction + first-group test | Abduction works: it starts once the crew centers the ship over the target, everyone can wait in the middle safe zone, then a placeholder catch cinematic plays. First test with a small group decides whether standing is enough or a skill check is needed, and tunes the multiplayer steering. |
| 3 — Core systems refinement | Codex with 8 creatures and golden and rainbow variants, rarity tiers and the crew rarity boost, currency and one unlockable cosmetic (the miniature probing contraption hat), daily streak, and codex completion on nametags. Griefing fallbacks added if testing shows they are needed. |
| 4 — Playable release, including testing and deployment | Low-poly atompunk art pass, including the probing contraption and the final catch cinematic. Sign-off meeting with Decentraland's QA team on a range of devices, a performance check at 15 players, then deployment to our World. |

**What keeps the experience changing after launch**

- Updates, contingent on future support for the game: additional planets, or purchasable wearables.
- If an update is skipped, which creature comes over the horizon next, and how rare it is, still varies every loop.

**Not building in v1**

- Additional planets, each with its own codex tab
- The streak-save microtransaction
- A rotating set of unlockables to save currency for

**Top risk + fallback**

Player griefing: a small group of players could hinder others from collecting. Fallback: a strong bias in the direction of the collectable, weighting the ship's direction more heavily toward the majority, and resetting players to the middle safe zone after a period of inactivity. If idling to earn becomes a problem, a small skill check is required to get credit for the abduction.
