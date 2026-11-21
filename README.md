# 😂 LinkedLOL — Work hard. LOL harder.

A playful, accessible, **zero-framework** meme gallery inspired by the LinkedIn aesthetic. Save screenshots of the funniest posts, then find them instantly by a partial filename. No database, backend, API key, or manual code update.

## Add a meme (the only recurring step)

1. Place a screenshot in **`images/`** (PNG, JPG, JPEG, WebP, GIF, or AVIF; folders inside `images/` are supported).
2. Give it a descriptive name, for example `GTA six release.png` or `Jensen Huang GPU jokes.jpg`.
3. Commit and push to the `main` branch. Or upload the images from GitHub's web interface and commit there.
4. GitHub Actions discovers **all** images, creates optimized WebP thumbnails, and publishes the updated gallery automatically.

> You do not need to update `index.html`, JS, CSS, or `manifest.json` when adding memes. `manifest.json` is **generated during the build**, not maintained by hand.

## First-time GitHub Pages setup

This project is published in **`vinny59200/linkedin-lol`**. To enable the first deployment:

1. Open your repository's **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Go to **Actions → Publish LinkedLOL → Run workflow**, or push a new commit to `main`.
4. After it succeeds, the site is available at `https://vinny59200.github.io/linkedin-lol/`.

This one-time setting is required by GitHub; thereafter each image commit triggers the build automatically. GitHub Pages publishes static files publicly — **never upload private messages or sensitive personal information** without permission.

### Optional: publish from your PC via GitHub CLI

```powershell
# Inside the extracted project folder (Git + GitHub CLI installed and authenticated)
git init -b main
git add .
git commit -m "feat: launch LinkedLOL gallery"
gh repo create linkedin-lol --public --source . --remote origin --push
```

Then perform the **Settings → Pages** one-time step above. Since this repository already exists, clone `https://github.com/vinny59200/linkedin-lol.git` and work inside the clone; use `git add images/ && git commit -m "Add memes" && git push` for new files.

## Local preview

```bash
python -m pip install Pillow
python build.py
cd dist
python -m http.server 8000
```

Open `http://localhost:8000`. **Do not** double-click `index.html`: browser security prevents `file://` from fetching the local manifest.

## Interface

- Responsive masonry-style grid; open any card into a dedicated fullscreen-like reading page.
- Reader: previous/next buttons, **← →** keyboard arrows, **Esc** to return, swipe gestures on mobile, a miniature filmstrip, optional larger image, permanent shareable links (`#m/…`).
- Partial, case-insensitive, accent-insensitive multiword search. `Jensen` finds `Jensen Huang`, and `GTA six` matches `GTA six release`. `GTA 6` also matches `GTA six`.
- Instant filtering while typing, **/** shortcut to focus search, sorting by recent / alphabetically.
- Lazy loading & progressive batches of 20 cards, pre-generated thumbnails, original-resolution photos only in the reader.
- Automatic light/dark mode with local setting; no tracking, no framework, no external JavaScript libraries.

## How it works

```
images/ (commit your screenshots here)
   │
   ▼
GitHub Actions on push to main
   │
   ├── build.py scans all files and generates dist/manifest.json
   ├── Creates dist/thumbs/*.webp
   └── Copies HTML/CSS/JS + full images into dist/
           │
           ▼
      GitHub Pages
           │
           ▼
      LinkedLOL single-page app
```

### Search limitations

The search indexes **filename titles** only, not the text visible inside the screenshots (no OCR). It matches partial words and any order of multiple query terms; it does not search comments or LinkedIn live data.

### Notes

- Original images are preserved; GIFs remain animated in the reader (their preview is a still image).
- `images/` can contain folders; spaces, accents, and special characters in filenames are handled.
- Files added to a public repository are publicly accessible on the internet, even if later removed from the site, because Git history is retained.
- GitHub imposes repository, Pages, and Actions usage limits. Optimize especially large screenshots when possible.

Project is independent and **not affiliated with LinkedIn**.
