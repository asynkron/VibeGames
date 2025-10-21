# VibeGames

Static collection of CRT-flavoured browser games that can be hosted straight from GitHub Pages.

## GitHub Pages

Once GitHub Pages is configured to serve from the `main` branch (root), the site will be available at:

- https://asynkron.github.io/VibeGames/

Each game is also directly accessible:

- https://asynkron.github.io/VibeGames/boulderdash/
- https://asynkron.github.io/VibeGames/bubble-bobble/
- https://asynkron.github.io/VibeGames/pacman/
- https://asynkron.github.io/VibeGames/snake/
- https://asynkron.github.io/VibeGames/defender/
- https://asynkron.github.io/VibeGames/battle-isle/

### Enable the site

1. Push these changes to GitHub.
2. In the repository settings, open **Pages**.
3. Under **Build and deployment**, pick **Deploy from a branch**.
4. Select the `main` branch and the `/ (root)` folder, then save.
5. GitHub will build and deploy to the URLs above (takes ~1 minute).

## Local development

Every game is self-contained inside its folder (`boulderdash/`, `pacman/`, `snake/`). To work on a game locally you can serve the folder with any static web server, for example:

```bash
npx serve snake
```

Then open the reported `http://localhost` URL in your browser.
