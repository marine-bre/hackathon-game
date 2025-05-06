This is your roadmap or milestone tracker.

# Dev Plan

## MVP Scope

- [x] Player movement
- [x] Camera follow
- [ ] Spell casting
- [ ] Basic UI
- [ ] Arena with colliders

## Later

- [ ] AI enemy
- [ ] Sound design
- [ ] Asset optimization

## Timeline

- MVP by May 10
- Playtest v0.2 by May 15

# Tel Aviv Minigame Adventure – Dev Plan

## MVP Scope

- [ ] Character selection (avatars with unique 2D art)
- [ ] Interactive Tel Aviv map (clickable neighborhoods)
- [ ] One playable minigame (e.g., Florentin – Avoid AC Drops)
- [ ] Heart/life system (5 hearts, lose 1 per minigame max)
- [ ] Collectibles (hummus/falafel, restore 1 heart, random spawn)
- [ ] Bus stop transition animation (looping)
- [ ] Basic UI (HUD: hearts, collectibles, area)
- [ ] Game over and victory screens (with animations)

## Core Components

- WelcomeScreen (character select, rules, avatars)
- MapScreen (explorable map, neighborhood selection)
- BusTransition (looping animation between stages)
- MinigameContainer (loads minigame by area)
- HUD (hearts, collectibles, current area)
- GameOverScreen (shark/rocket ending)
- VictoryScreen (Wolt delivery)

## Game Flow

1. WelcomeScreen → character selection
2. MapScreen → pick neighborhood
3. BusTransition → animated wait
4. MinigameContainer → play minigame
5. HUD overlays during play
6. On win: return to MapScreen
7. On lose: lose 1 heart, return to MapScreen
8. Game over: all hearts lost → GameOverScreen
9. All areas complete: VictoryScreen

## Next Steps

- [ ] Set up project structure and dependencies
- [ ] Implement global state (Zustand)
- [ ] Build WelcomeScreen with character selection
- [ ] Create interactive MapScreen
- [ ] Stub MinigameContainer and sample minigame
- [ ] Add BusTransition and HUD
- [ ] Wire up game flow
- [ ] Add placeholder art and animations

---

## Recent Changes

### Start Button (Welcome Screen)

- The Start button now sets the selected character in the global Zustand store and advances the game state to 'map' when clicked.
- This ensures the player's choice is saved and the game flow proceeds as intended.

### Neighborhood (Minigame) Buttons (Map Screen)

- Each neighborhood button now sets the selected neighborhood in the Zustand store and advances the game state to 'transition' when clicked.
- This triggers the bus transition animation and then loads the appropriate minigame.
- The store was extended to include `selectedNeighborhood` and `setSelectedNeighborhood` for this purpose.

---

## Issues & Requirements

### Health System (Hearts/Lives)

- You have 5 lives (hearts) for the whole game, across all stages.
- If you lose all your hearts, it's game over (animation: shark or rocket ending).
- Sometimes, not too often in minigames, a bowl of hummus or a falafel in pita shows up and can be collected to refill one heart.
- If 2 enemies touch you at the same time, you only lose one life (max 1 life lost per minigame).
- Currently, the minigame does not interact with the global heart system. The lose condition in the minigame does not decrement hearts or trigger game over.
- The health system needs to be fixed to match the above requirements.

## Implementation: Health System Fix (Florentin Minigame)

- Integrate the global heart system into the Florentin minigame:
  - On first collision with an enemy, decrement hearts using the Zustand store (`loseHeart`).
  - If hearts reach 0, set game state to `'gameover'`.
  - Only allow one life to be lost per minigame (ignore further collisions after the first).
- Occasionally spawn a collectible (hummus or falafel) in the minigame:
  - If collected, increment hearts using the Zustand store (`gainHeart`), up to a max of 5.
- Update the minigame logic to use these rules and test the flow.

---

## New Requirements: Heart Display System

- Always display 5 hearts in the HUD, filled or empty, never remove hearts from the display.
- When a heart is lost, show it as empty (not removed).
- When a heart is gained, fill an empty heart (up to 5 max).
- Never show more than 5 hearts, even if you collect more.
- Remove the hardcoded 'Florentin' label from the minigame UI.

---

## Temporary Dev Change

- For development/testing, spawn a life UPP (collectible) every 5 seconds in the minigame.

---

## New Requirement: Dynamic Max Hearts

- Allow the player to collect and display more than 5 hearts (max hearts increases if you collect more).
- Update the HUD to show all hearts, filled or empty, up to the current max.
- Update the minigame to allow collecting more than 5 hearts.

---

## Zelda-Style Heart System

- Hearts above 5 are temporary (yellow/gold) and disappear when lost.
- Hearts 1-5 are permanent and become empty when lost.
- HUD should visually distinguish between permanent (filled), empty, and temporary hearts.
- When a temporary heart is lost, it is removed from the display.
- When a permanent heart is lost, it becomes empty but remains visible.

---

## Interactive Map Menu (Leaflet.js + MapTiler)

- Use Leaflet.js via CDN.
- Create a full-screen map centered on Tel Aviv (lat 32.0853, lon 34.7818), zoom 13.
- Use MapTiler tiles with the "Basic" style (API key placeholder).
- Load a local GeoJSON file named `tel_aviv_neighborhoods.geojson`.
- Each GeoJSON feature is a neighborhood polygon, styled with:
  - Blue borders (`color: #3388ff`)
  - Light blue fill (`fillColor: #3388ff`)
  - `fillOpacity` 0.3
- Interactivity:
  - On hover, increase `fillOpacity` to 0.6
  - On mouseout, revert to 0.3
  - On click, alert: "You clicked on [neighborhood name]" using `feature.properties.name`
  - Show a tooltip on hover with the neighborhood name

---

## MapScreen Linter/Type Fixes (continued)

- Use 'unknown' instead of 'any' for event and feature/layer parameters in MapScreen.
- Use type assertions to access properties/methods as needed for Leaflet interop.

---

## MapScreen: Fix for Renderer.js:54 appendChild Error

- Add an isMounted flag to the MapScreen effect to track if the component is still mounted.
- Check that mapRef.current is not null before initializing the map.
- Ensure no code runs after the component has unmounted.
- This prevents trying to call .appendChild or initialize the map on an undefined or removed DOM node.

---

## API Key Management

- Create a private file (e.g., src/private/apiKeys.ts) to store API keys.
- Import the MapTiler API key from this file in MapScreen instead of hardcoding it.
- Ensure this file is added to .gitignore and not committed to version control.

---

## Map-to-Minigame Integration

- Clicking a neighborhood on the map should start the corresponding minigame.
- Area to minigame mapping:
  - 'Florentin': 'Florentin'
  - 'Old North': 'oldNorth'
  - 'Kerem': 'Kerem'
  - 'ParkHamesila': 'parkHaMesilah'
  - 'Kaplan': 'kaplan'
  - 'Rothschild': 'rothschild'
  - "Neve Sha'anan": 'tahanaMerkazit'
  - 'Beach/Tayelet': 'tayelet'

---

## Zustand Store Update for Map-to-Minigame

- Add selectedMinigame and setSelectedMinigame to the Zustand store.
- Type guard areaName before passing to setSelectedNeighborhood (only call if valid Neighborhood).

---

## Horizontally Scrolling Background

- Use /public/combined_street_panorama.png as the background image.
- Create a React component (ScrollingBackground) that scrolls the image horizontally to the left, looping seamlessly, to simulate rightward movement.
- Use requestAnimationFrame for smooth animation.
- Make speed and height adjustable via props.
- Integrate this component into minigames as needed.
