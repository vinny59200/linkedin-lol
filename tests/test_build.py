"""Unit tests for the static asset/manifest builder (python -m unittest discover -s tests)."""
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest import TestCase
import sys
import json
import importlib.util
from PIL import Image

spec = importlib.util.spec_from_file_location('linkedlol_build', Path(__file__).resolve().parents[1] / 'build.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


class BuildTest(TestCase):
    def test_manifest_discovers_nested_files_with_spaces_and_accents(self):
        with TemporaryDirectory() as folder:
            root = Path(folder)
            (root / 'images' / 'Dev memes').mkdir(parents=True)
            for filename in ['index.html', 'styles.css', 'app.js', 'search.mjs', 'favicon.svg']:
                (root / filename).write_text('fixture', encoding='utf-8')
            first = root / 'images' / 'Dev memes' / 'Jensen Huang.jpg'
            second = root / 'images' / 'GTA six été.png'
            Image.new('RGB', (1200, 800), 'red').save(first)
            Image.new('RGB', (800, 1400), 'blue').save(second)
            (root / 'images' / 'ignored.txt').write_text('not an image')
            old_root, old_out, old_images = builder.ROOT, builder.OUT, builder.IMAGES
            try:
                builder.ROOT, builder.OUT, builder.IMAGES = root, root / 'dist', root / 'images'
                manifest = builder.build()
            finally:
                builder.ROOT, builder.OUT, builder.IMAGES = old_root, old_out, old_images
            self.assertEqual(len(manifest['items']), 2)
            self.assertEqual({i['title'] for i in manifest['items']}, {'Jensen Huang', 'GTA six été'})
            self.assertTrue((root / 'dist' / 'images' / 'Dev memes' / 'Jensen Huang.jpg').exists())
            self.assertEqual(len(list((root / 'dist' / 'thumbs').glob('*.webp'))), 2)
            self.assertIn('GTA%20six%20%C3%A9t%C3%A9.png', (root / 'dist' / 'manifest.json').read_text())
