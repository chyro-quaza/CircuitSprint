# Circuit Sprint

A static offline event site for puzzle pathways, persistent points, and component unlocks.

## Run

Open `index.html` in a browser. No build step is required.

## Edit the event content

All puzzle and unlock content lives in `app.js`.

- `pathways`: six pathway cards, their questions, accepted answers, and point values.
- `unlocks`: blueprint and component thresholds.
- `STORAGE_KEY`: change this if you want to reset all browsers for a new event version.

## Persistence

Progress is stored in `localStorage`, so a refresh will not reset points. This is good for an offline event flow, but it is not secure against deliberate browser tampering. For serious scoring, use coordinator verification: ask participants to show the unlock screen before giving components, or run the site only on event-controlled devices.

## Suggested event flow

1. Participants choose any pathway from the home page.
2. Each correct answer awards points once.
3. The total score stays visible in the top bar.
4. The Build Unlocks section shows when the blueprint and components are available.
5. Coordinators hand over parts after checking the visible unlock state.
