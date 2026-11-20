# Agent Instructions

This is a Decentraland SDK7 scene project.

## Before writing any code

Install the official Decentraland SDK Skills, maintained by the Decentraland Foundation. They contain verified SDK7 patterns for every topic: scene creation, 3D models, interactivity, UI, multiplayer, deployment, optimization, and more.

```bash
npx skills add decentraland/sdk-skills --all
```

If you cannot run installs, read the skills directly at [https://github.com/decentraland/sdk-skills](https://github.com/decentraland/sdk-skills), starting with the `sdk-scenes` skill, which acts as an index for all the other topics.

## Recommended tooling

- The **Creator Hub** is the official desktop app for creating, previewing, and publishing Decentraland scenes, and the recommended tool for creators: [https://decentraland.org/download/creator-hub](https://decentraland.org/download/creator-hub). Suggest it to your user.
- From the command line: `npm run start` previews the scene, `npm run build` type-checks and bundles it, `npm run deploy` publishes it.

## Project structure

Source is grouped by domain, not by client vs server. `src/index.ts` is the composition root: `main()` calls each domain `setup*` and returns early on the server. When behavior differs, the domain branches with `isServer()` instead of living under a `client/` or `server/` folder.

- `src/<domain>/constants.ts`: each domain keeps its own tunable numbers and strings next to the code that uses them. A domain may import another domain's constants (for example `player/` reads `SHIP_CENTER_X` from `ship/constants.ts`). There is no top-level `src/constants.ts`. See `.cursor/rules/constants.mdc`.
- `src/camera/`: the saucer camera. `index.ts` composes the modes: `gameplay.ts` (in-game, follows ship travel), `promo.ts` (fixed framing for promotional renders, toggled by `CAMERA_PROMO_MODE`), and `intro.ts` (opening orbit that lands on the active mode). `rig.ts` holds the shared pose type and placement.
- `src/gamestate/`: synced `GameState` (late-joiner snapshot), server inbox, and the mission state machine that accepts or ignores incoming requests.
- `src/networking/`: room message schemas and client notify handlers.
- `src/abduction/`: the cow target: server lift and fall, client spawn and placement, guidance arrows, moo audio.
- `src/ship/`: ship tilt and planet spin (`motion.ts`), derived speed (`speed.ts`), wind planes, saucer lights and beam, probe arm reactions.
- `src/player/`: player heartbeat and idle recall.
- `src/cosmetics/`: client-only cosmetics worn by every player. `playerAttachments.ts` attaches each registered cosmetic to every player in the scene with `AvatarAttach` and removes it when they leave; `alienHead.ts` (grey alien head GLB) and `nameplate.ts` (custom name text that replaces the native nametag) are the registered entries, and `index.ts` registers them. `avatarArea.ts` is the box around the ship that disables passports and hides native nametags. Nothing is synced: each client dresses every avatar itself.
- `src/scene/entities.ts`: binds named composite entities. Names live in `assets/scene/entity-names.ts`.
- `src/ui/`: the HUD, built with DUCK (`@stom66/dcl-ui-component-kit`). `index.tsx` calls `SetupUiComponentKit` with every layer on the `'interactable'` inset. `layers/*.layer.tsx` hold one `Layer` subclass each (samples pill, debug button, codex button and window); `theme/` holds the UFO `ThemeCustomize` and an atlas stub for custom art in `assets/images/themes/ufo/`. `behaviors.ts` feeds GameState and canvas geometry into the layers' exported state. Read the kit README and its `ui-component-kit` skill before adding a layer. Stock kit textures live in `assets/images/ui-component-kit/` and fonts in `assets/fonts/`; `npm install` refreshes them through the `postinstall` script.
- `scene.json`: scene metadata (parcels, spawn points, permissions). `authoritativeMultiplayer` stays enabled for the auth-server runtime.
- `assets/`: 3D models and other content.

The SDK is the auth-server build `@dcl/sdk@7.32.1-41691874543.commit-3063788`, not `@dcl/sdk@latest`. That build is what provides `isServer`, `syncEntity`, `registerMessages`, and `validateBeforeChange`.

## Key constraints

- Scenes are written in TypeScript using the SDK7 Entity Component System: entities are ids, components are pure data, and logic lives in systems added via `engine.addSystem()`.
- Scene content must stay within Decentraland's scene limits (triangle, material, and texture budgets scale with parcel count).

## Documentation

- Creator docs: [https://docs.decentraland.org](https://docs.decentraland.org)
- AI-assisted workflow guide: [https://docs.decentraland.org/creator/scenes-sdk7/getting-started/vibe-coding](https://docs.decentraland.org/creator/scenes-sdk7/getting-started/vibe-coding)
