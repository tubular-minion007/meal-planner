# Changelog

This changelog reflects the **full build discussion** (decisions + changes) for the Meal Planner app, distilled into an implementation timeline.

> Scope: meal-planner only (UI/logic/storage/sharing/deployment). Not general Telegram chat banter.

## Unreleased / Next

- Add a small in-app **“Quoi de neuf ?” / context reminder** box (optional, dismissible) to explain what changed after updates.
- (Optional) Add a “Copy menu” message preview area (in addition to clipboard/prompt) for browsers with strict clipboard permissions.

## 2026-04-04

### Refactor
- Split the app from a single giant `index.html` into:
  - `index.html`
  - `styles.css`
  - `app.js`
- Kept the app fully static and GitHub Pages-friendly (no build step required).

### Storage + profile fixes
- Introduced a cleaner storage namespace (`lena_meal_planner_v2`) while preserving migration from legacy `v1` keys.
- Fixed profile import/share/reset flows so they operate on the **active profile** instead of writing back to outdated single-profile keys.
- Normalized saved data into a more consistent schema with a version marker.

### Reliability fixes
- Fixed the mismatch where **history rendering used `historyLog`** but “mark used” only updated `history`.
- “Mark used” now records both rotation history and visible history entries.
- Switched recurring date calculations away from `toISOString()` day math to local date strings, avoiding timezone-related off-by-one surprises.

### Maintainability
- Centralized state normalization/helpers instead of scattering storage assumptions across the page.
- Preserved the original product model (static, local-first, privacy-first) while making the codebase less brittle.

### Recipe referrals
- Added lightweight **recipe referral links** directly inside each generated option.
- Priority order reflects user preference:
  - simple / minimal-ingredient recipes first
  - then a softer “safe food” search
  - then Swiss / Peruvian inspiration
- Implemented as external search links to keep the app static and low-maintenance.

## 2026-03-30

### Reliability fix
- Fixed a **JS syntax issue** (a missing `}` in `ensureProfiles()`), which could stop the script and break click handlers.

### Sharing
- Replaced “🟢 Envoyer sur WhatsApp” deep-link sending with a **100% reliable** option:
  - **📋 Copier le menu**: copy-to-clipboard with a `prompt()` fallback.
  - Rationale: deep links / popups / in-app browsers behave inconsistently across devices.

### Memory features
- Added **Historique 🗓️** (history of used menus) with **“✅ Marquer aujourd’hui comme utilisé”**.
- Added **Favoris ⭐** (save the chosen option) with add/remove/clear actions.

### Multi-user
- Added **Multi-profils 👤**:
  - Profile picker (active profile).
  - Create / rename / delete profile.
  - Each profile has separate settings + history + favorites.

### Publishing
- Synced updates to:
  - GitHub Pages (repo `tubular-minion007/meal-planner`).
  - Reference host (cri.ch) as the source `index.html`.

## 2026-03-29

### Sharing & portability
- Added **JSON Export** and **JSON Import**.
- Added **shareable link** feature using URL hash payload:
  - `#p=<base64url(JSON)>`
  - On open, prompts to import.
  - Privacy note: link can contain personal food lists/preferences.

### WhatsApp integration (initial attempt)
- Added a WhatsApp share button using `wa.me/?text=...` (later replaced on 2026-03-30).

### UX polish
- Improved mobile UX:
  - full-width buttons on small screens
  - 16px inputs (avoid mobile zoom)
  - non-sticky header on mobile
  - `type="time"` for send time
- Fixed placeholder/newline rendering by converting `\n` to `&#10;` where needed.

### Food categories / rules
- Added **Desserts (options)** field and dessert pills + legend.
- Included desserts in suggestions and “no-go” scanning.

## 2026-03-28

### Base app creation
- Built the first version of the static single-page app (Bootstrap 5.3).
- Implemented the core concept: **“variété douce”** with 3 suggested options:
  - mains/proteins
  - carbs
  - sides
  - breakfast safe list
- Implemented semantic colors + **legend** to communicate meaning clearly.

### Theme
- Light mode by default.
- Light/Dark toggle stored in `localStorage`.

### Storage decision
- Chose **localStorage-first** (no backend DB).
  - Rationale: simplicity + privacy.

## Notes / Design constraints captured during the build

- **Language:** Francophone UI.
- **Accessibility & comfort:** avoid overwhelming visuals; use meaningful emojis, not spam.
- **Dessert policy:** one dessert is enough (avoid multiple dessert options).
- **Deployment:** static hosting via GitHub Pages; reference deploy on cri.ch.
