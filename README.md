# HomeLab Hub — Proxmox & Self-Hosting

An interactive, static website about Proxmox VE and self-hosting. No build step, no dependencies — just HTML, CSS, and JavaScript.

## Features
- **Proxmox in a nutshell** — tabbed explainer (VMs vs LXC, storage, backups, networking, clustering)
- **Service explorer** — search and filter 27 popular self-hosted apps, with detail pop-ups
- **Lab builder** — set your host's CPU/RAM/storage and see if your chosen services fit; copy the plan as Markdown
- **VM or LXC? game** — a 10-question quiz with best-score tracking
- **Getting-started checklist** — progress saved in your browser
- Light/dark theme, mobile-friendly, respects reduced-motion

All state is stored in `localStorage`; nothing is sent to a server.

## Files
| File | Purpose |
|------|---------|
| `index.html` | Page structure and static content |
| `styles.css` | All styling (dark + light themes) |
| `data.js` | Services, quiz questions, checklist items — edit this to add content |
| `app.js` | Interactive behavior |
| `.nojekyll` | Tells GitHub Pages to serve files as-is |

## Run locally
```bash
python3 -m http.server 8000 --bind 127.0.0.1
```
Then open http://localhost:8000.

## Deploy to GitHub Pages
1. Create a repository on GitHub (e.g. `homelab-hub`, or `<username>.github.io` for a user site).
2. Push these files to the `main` branch:
   ```bash
   git init
   git add .
   git commit -m "Initial site"
   git branch -M main
   git remote add origin https://github.com/<username>/<repo>.git
   git push -u origin main
   ```
3. On GitHub, go to **Settings → Pages**, set **Source** to *Deploy from a branch*, choose `main` and `/ (root)`, then **Save**.
4. After a minute your site will be live at `https://<username>.github.io/<repo>/`.

## Adding a service
Add an object to the `SERVICES` array in `data.js`:
```js
{ id: "myapp", name: "My App", emoji: "✨", category: "Dev & Tools", type: "LXC",
  cpu: 1, ram: 512, disk: 8, desc: "One-line summary.", details: "Longer notes.",
  tags: ["keyword"], url: "https://example.com" }
```

## Security notes
- **Content Security Policy** (in `index.html`): only scripts and styles from this site may run; no inline scripts or styles, no network requests, no plugins. Keep new code in `app.js`/`styles.css` (no `onclick=` or `style=` attributes) or the CSP will block it.
- **All data is HTML-escaped** before rendering, and service links only allow `http(s)://` URLs.
- **Saved data from `localStorage` is validated** (type-checked and clamped) before use.
- Outbound links use `rel="noopener noreferrer"`.
- GitHub Pages can't send custom HTTP headers, so `frame-ancestors`/`X-Frame-Options` (clickjacking protection) can't be set. The site has no accounts or sensitive actions, so the risk is low.
- When previewing locally, bind to `127.0.0.1` so the files aren't served to your whole network.
