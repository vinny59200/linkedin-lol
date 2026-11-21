#!/usr/bin/env python3
"""Build a static GitHub Pages gallery from images/, without editing HTML/JS.

Run: python -m pip install Pillow && python build.py
"""
from __future__ import annotations

import hashlib
import json
import re
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

from PIL import Image, ImageOps, UnidentifiedImageError

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'dist'
IMAGES = ROOT / 'images'
ALLOWED = {'.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif'}
MAX_THUMB = (720, 1240)


def published_date(path: Path) -> str:
    # The checkout has the full Git history; a file's original commit date is stable.
    try:
        result = subprocess.run(
            ['git', 'log', '--follow', '--diff-filter=A', '-1', '--format=%cI', '--', path.relative_to(ROOT).as_posix()],
            cwd=ROOT, check=False, capture_output=True, text=True, timeout=10,
        )
        stamp = result.stdout.strip()
        if stamp:
            return stamp
    except (OSError, subprocess.TimeoutExpired):
        pass
    return datetime.fromtimestamp(path.stat().st_mtime, timezone.utc).isoformat()


def safe_title(filename: str) -> str:
    title = re.sub(r'^\d{4}[-_ ]\d{2}[-_ ]\d{2}[-_ ]+', '', filename)
    title = re.sub(r'[_-]+', ' ', title)
    return re.sub(r'\s+', ' ', title).strip() or filename


def build() -> dict:
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)
    for asset in ['index.html', 'styles.css', 'app.js', 'search.mjs', 'favicon.svg']:
        shutil.copy2(ROOT / asset, OUT / asset)
    (OUT / '.nojekyll').touch()
    (OUT / 'images').mkdir()
    (OUT / 'thumbs').mkdir()
    items = []
    for source in sorted(IMAGES.rglob('*')):
        if not source.is_file() or source.suffix.lower() not in ALLOWED:
            continue
        relative = source.relative_to(IMAGES)
        # Reject symlinks to prevent accidentally publishing files outside images/.
        if source.is_symlink() or any(parent.is_symlink() for parent in source.parents if parent != IMAGES):
            print(f'SKIP symlink: {relative}')
            continue
        digest = hashlib.sha256(relative.as_posix().encode('utf-8')).hexdigest()[:16]
        target = OUT / 'images' / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
        thumb_url = None
        width, height = 0, 0
        try:
            with Image.open(source) as opened:
                width, height = opened.size
                if width * height > 160_000_000:
                    raise ValueError('image too large to generate a thumbnail')
                opened.seek(0)  # First frame for animated GIF / WebP
                preview = ImageOps.exif_transpose(opened).convert('RGB')
                preview.thumbnail(MAX_THUMB, Image.Resampling.LANCZOS)
                thumb_file = OUT / 'thumbs' / f'{digest}.webp'
                preview.save(thumb_file, format='WEBP', quality=80, method=5)
                thumb_url = f'./thumbs/{digest}.webp'
        except (UnidentifiedImageError, OSError, ValueError) as exc:
            print(f'WARNING thumbnail for {relative}: {exc} (original still available)')
        items.append({
            'id': digest,
            'title': safe_title(relative.stem),
            'file': './images/' + '/'.join(quote(part) for part in relative.parts),
            'thumb': thumb_url,
            'width': width,
            'height': height,
            'format': source.suffix[1:].lower(),
            'addedAt': published_date(source),
        })
    items.sort(key=lambda x: (x['addedAt'], x['title']), reverse=True)
    manifest = {'version': 1, 'generatedAt': datetime.now(timezone.utc).isoformat(), 'items': items}
    (OUT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'LinkedLOL: built {len(items)} images into {OUT}')
    return manifest


if __name__ == '__main__':
    build()
