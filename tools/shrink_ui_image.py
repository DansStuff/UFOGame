"""
Shrinks full-size UI art (tutorial frames and the like) into small palette PNGs
that look clean on screen.

  python tools/shrink_ui_image.py assets/images/tutorial/new_frame.png
  python tools/shrink_ui_image.py references/tutorial/*.png --dither 1

An image under assets/images/<folder>/ is first copied to references/<folder>/
(never overwriting an existing original), then replaced by the shrunk version.
An image under references/<folder>/ is shrunk into assets/images/<folder>/, so
any frame can be redone from its original. references/ is not deployed.

Steps, each chosen to avoid light fringes along dark outlines:
  1. Box (area-average) downscale to --width. Lanczos overshoots next to dark
     lines and leaves a pale ring.
  2. Alpha >= 240 snaps to solid and <= 4 to clear. AI-cut art is mostly
     alpha 250-254, which wastes palette entries on invisible differences.
  3. libimagequant palette (256 colors with alpha). Pillow's own octree
     quantizer scatters light colors along edges.
Leave --dither at 0 for flat cartoon art; use 1 when the image has soft
see-through gradients (the camera beam bands without it).

Needs Pillow and imagequant:  python -m pip install --user pillow imagequant
"""

import argparse
import shutil
import sys
from pathlib import Path

try:
    import imagequant
    from PIL import Image
except ImportError:
    sys.exit("Needs Pillow and imagequant: python -m pip install --user pillow imagequant")

ROOT = Path(__file__).resolve().parent.parent
ASSET_IMAGES = ROOT / "assets" / "images"
REFERENCES = ROOT / "references"


def resolve_paths(image: Path) -> tuple[Path, Path]:
    """Returns (original to read, shrunk file to write)."""
    image = image.resolve()
    if image.is_relative_to(ASSET_IMAGES):
        original = REFERENCES / image.relative_to(ASSET_IMAGES)
        if not original.exists():
            original.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(image, original)
            print(f"  backed up original to {original.relative_to(ROOT)}")
        return original, image
    if image.is_relative_to(REFERENCES):
        return image, ASSET_IMAGES / image.relative_to(REFERENCES)
    sys.exit(f"{image}: expected a file under assets/images/ or references/")


def shrink(original: Path, out: Path, width: int, height: int | None, dither: float) -> None:
    im = Image.open(original).convert("RGBA")
    h = height or round(width * im.height / im.width)
    resized = im.resize((width, h), Image.BOX)
    alpha = resized.getchannel("A").point(lambda v: 255 if v >= 240 else (0 if v <= 4 else v))
    resized.putalpha(alpha)
    quantized = imagequant.quantize_pil_image(
        resized, dithering_level=dither, max_colors=256, min_quality=0, max_quality=100
    )
    out.parent.mkdir(parents=True, exist_ok=True)
    quantized.save(out, optimize=True)
    before = original.stat().st_size // 1024
    after = out.stat().st_size // 1024
    print(f"  {im.width}x{im.height} {before} KB -> {width}x{h} {after} KB: {out.relative_to(ROOT)}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Shrink UI art into clean palette PNGs.")
    parser.add_argument("images", nargs="+", type=Path, help="files under assets/images/ or references/")
    parser.add_argument("--width", type=int, default=1024, help="output width in px (default 1024)")
    parser.add_argument("--height", type=int, help="output height in px (default: keep aspect)")
    parser.add_argument("--dither", type=float, default=0.0, help="0 flat art (default), 1 soft gradients")
    args = parser.parse_args()

    for image in args.images:
        print(image)
        original, out = resolve_paths(image)
        shrink(original, out, args.width, args.height, args.dither)


if __name__ == "__main__":
    main()
