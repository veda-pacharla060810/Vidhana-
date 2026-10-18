# VEXA — Own Your Time

A private, local-first productivity app: tasks, focus sessions, a calendar, time insights and daily recaps.

- No accounts, no database, no tracking. Everything is saved in your browser's local storage.
- Built with React + Vite. Works on desktop, tablet and phone.

## How it's deployed (GitHub Pages)

- `main` holds the source code.
- `gh-pages` holds the ready-built website (the contents of `dist/`).

One-time setup: **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `gh-pages`, folder `/ (root)` → Save.**

The site is then at `https://<your-username>.github.io/<repo-name>/`.

### Updating the site after changing code

```bash
npm install
npm run build
```

Then replace the contents of the `gh-pages` branch with the new `dist/` folder and push.

## Deploy on Netlify (optional)

Import the repo in Netlify. `netlify.toml` already sets the build command (`npm run build`) and publish folder (`dist`). No environment variables are needed.

## Run locally

```bash
npm install
npm run dev
```

## Your data

VEXA stores your tasks and session history locally in this browser. There are no user accounts or cloud synchronization. Clearing browser storage or using another browser may remove or separate your data. Use **Settings → Export JSON** to back up.
