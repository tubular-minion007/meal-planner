# Meal Planner (variété douce) — Build Notes

This repo contains a **single-page, static** meal-planning web app designed for a "gentle variety" rotation (safe foods + rotation rules), originally built for an autistic/aspie teen use case.

> **Privacy-first:** data is stored in the browser via `localStorage` (no server DB).

## Where it runs

- GitHub Pages: https://tubular-minion007.github.io/meal-planner/
- Reference deployment (same `index.html`): https://cri.ch/lena/meal-planner/

## What problem it solves

- Keep meals within a **safe list** while still creating **small variations**.
- Reduce decision fatigue by producing **3 suggested options**.
- Make it easy to avoid “no-go” items via highlighting and warnings.

## Key UX/product decisions

- **Single-file app (`index.html`)**
  - Simple hosting (GitHub Pages / any static host).
  - Easier sharing and offline-ish usage.

- **Local-first storage (no backend)**
  - Uses `localStorage` for all state.
  - Avoids storing sensitive dietary info on a server.

- **French UI + mobile-first**
  - Francophone wording.
  - Buttons and inputs sized for mobile usability.

- **Light mode by default**
  - Light/Dark toggle saved in `localStorage`.

- **Dessert behavior: 1 dessert is enough**
  - App supports a dessert list; when used it’s intended to be **one dessert choice** (not multiple per option).

## Sharing + portability

- **Export / Import JSON**
  - Export current profile data to a JSON file.
  - Import JSON to restore or share the configuration.

- **Shareable link (URL hash payload)**
  - A share option encodes JSON into the URL hash (`#p=...`).
  - On open, the app can prompt to import.
  - Note: longer link, and anyone with the link can read the shared data.

## History, favorites, and profiles

- **History (Historique)**
  - When the user marks a day/menu as used, it is stored in per-profile history.

- **Favorites (Favoris)**
  - Users can save the chosen option as a favorite for easy reuse.

- **Multi-profile support**
  - The app supports multiple profiles (e.g., sisters/boyfriend).
  - Each profile has its own settings + history + favorites.

## WhatsApp sharing

Originally a WhatsApp “send” button existed. Because deep links / pop-up policies vary wildly by browser (and can be blocked), it was replaced with a **reliable** option:

- **📋 Copy menu**: copies a ready-to-paste message to clipboard (with prompt fallback).

## Notable implementation notes (high-level)

- State is stored in `localStorage`.
- Current storage namespace is `lena_meal_planner_v2` with migration from older `v1` keys.
- Multi-profile storage is implemented by storing a **profiles index** plus per-profile keys.
- Share link uses base64url JSON in the hash.

## Code structure

The app remains **fully static** (no build tooling required), but is now split into:

- `index.html` — structure / markup
- `styles.css` — custom styles
- `app.js` — state, rendering, storage, actions

This keeps GitHub Pages deployment simple while making maintenance much safer than a single large inline-script HTML file.

## How to update / publish

This repo is GitHub Pages-friendly:

1. Edit `index.html`
2. Commit and push to `main`
3. GitHub Pages updates automatically

Recommended: include a small “What changed” note when shipping UX changes (short bullets).
