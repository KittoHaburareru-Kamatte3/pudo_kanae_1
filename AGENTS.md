# AI Agent Guidance for `pudo_kanae_1`

## What this project is
- A simple static Progressive Web App under `PUDOWebApp/`.
- It is a送迎割り当て (pickup assignment) app for a welfare service using drag-and-drop cards.
- The app uses Google Firebase Authentication + Firebase Realtime Database.

## Key files
- `PUDOWebApp/index.html` — main UI and page structure.
- `PUDOWebApp/thepudointeractive.js` — app logic, Firebase integration, authorization, drag-and-drop, and data persistence.
- `PUDOWebApp/thepudomitame.css` — styling and responsive layouts.
- `PUDOWebApp/manifest.json` — PWA metadata.

## Important conventions
- There is no build system or `package.json`; treat this as a static web app.
- The app uses ES module imports from Firebase CDN URLs.
- `thepudointeractive.js` is the source of truth for authentication and database behavior.
- The app is intended to run with a specific allowed email: `kanaewebapp.2026@gmail.com`.
- Firebase data paths in Realtime Database include `masterItems`, `assignments`, and `editableItems`.

## What agents should do
- Prefer minimal changes and preserve the static deploy model.
- Do not assume Node.js tooling or bundling.
- Fix issues in the existing HTML/JS/CSS structure rather than adding new frameworks.
- Keep Firebase configuration and auth flows intact unless the user explicitly asks for auth or backend changes.

## Known issue to be careful about
- `PUDOWebApp/manifest.json` has `start_url: "./thepudokanae.html"` but the actual entry file is `PUDOWebApp/index.html`.

## How to validate changes
- Review `PUDOWebApp/index.html` and `PUDOWebApp/thepudointeractive.js` together, because DOM IDs and event names are tightly coupled.
- Use a local static server or open `PUDOWebApp/index.html` in a browser to confirm UI and Firebase login behavior.

## Helpful note
- Since this app is small and static, agents should avoid introducing new build tooling or complicating deployment.
