#!/usr/bin/env python3
"""Compose the Chrome Web Store graphics from the captured harness renders.

Takes the raw captures produced by ``scripts/build-store-assets.mjs`` plus a
browser screenshot pass, and lays them out on the 1280x800 canvas the store
expects, along with the 440x280 small promo tile.

Inputs (in ``store-assets/``):
    raw-popup.jpg    full-viewport capture of harness-popup.html
    raw-viewer.jpg   full-viewport capture of harness-viewer.html
    raw-pdf.png      page 1 of sample-transcript.pdf, rendered by ``sips``

Outputs (in ``store-assets/``):
    screenshot-1-popup.png     1280x800
    screenshot-2-pdf.png       1280x800
    screenshot-3-viewer.png    1280x800
    promo-tile-small.png       440x280

Usage:
    python3 scripts/compose-store-screenshots.py
"""

from __future__ import annotations

import pathlib
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
ASSETS = ROOT / "store-assets"

CANVAS = (1280, 800)
TILE = (440, 280)

INK = (16, 21, 27)
MUTED = (92, 103, 115)
ACCENT = (200, 32, 42)
BACKDROP = (243, 245, 247)
CARD_EDGE = (223, 227, 232)

BOLD_FONT = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
REGULAR_FONT = "/System/Library/Fonts/Supplemental/Arial.ttf"

# The browser captures a 2824 CSS-pixel viewport into a 1568-pixel image, so
# every CSS measurement taken from the page scales by this factor.
CAPTURE_SCALE = 1568 / 2824


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    """Loads a TrueType font, falling back to Pillow's default."""
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.load_default()


def css_box(x: float, y: float, width: float, height: float) -> tuple[int, int, int, int]:
    """Converts a CSS-pixel rectangle into a crop box in capture coordinates."""
    left = round(x * CAPTURE_SCALE)
    top = round(y * CAPTURE_SCALE)
    return left, top, left + round(width * CAPTURE_SCALE), top + round(height * CAPTURE_SCALE)


def rounded(image: Image.Image, radius: int) -> Image.Image:
    """Applies rounded corners, returning an RGBA image."""
    image = image.convert("RGBA")
    mask = Image.new("L", image.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([(0, 0), (image.width - 1, image.height - 1)],
                                           radius=radius, fill=255)
    image.putalpha(mask)
    return image


def paste_card(canvas: Image.Image, art: Image.Image, position: tuple[int, int],
               radius: int = 14) -> None:
    """Pastes an image as a rounded card with a soft drop shadow and a hairline edge."""
    card = rounded(art, radius)

    shadow = Image.new("RGBA", (card.width + 80, card.height + 80), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle(
        [(40, 46), (40 + card.width, 46 + card.height)], radius=radius, fill=(16, 21, 27, 60)
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(16))
    canvas.alpha_composite(shadow, (position[0] - 40, position[1] - 40))
    canvas.alpha_composite(card, position)

    ImageDraw.Draw(canvas).rounded_rectangle(
        [position, (position[0] + card.width - 1, position[1] + card.height - 1)],
        radius=radius, outline=CARD_EDGE + (255,), width=1,
    )


def wrap(draw: ImageDraw.ImageDraw, text: str, face: ImageFont.FreeTypeFont,
         max_width: int) -> list[str]:
    """Greedy word wrap against a measured font."""
    lines: list[str] = []
    line = ""
    for word in text.split():
        candidate = f"{line} {word}".strip()
        if draw.textlength(candidate, font=face) <= max_width:
            line = candidate
        else:
            if line:
                lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def new_canvas() -> Image.Image:
    """A store-sized canvas with the accent rule along the top."""
    canvas = Image.new("RGBA", CANVAS, BACKDROP + (255,))
    ImageDraw.Draw(canvas).rectangle([(0, 0), (CANVAS[0], 6)], fill=ACCENT + (255,))
    return canvas


def draw_copy(canvas: Image.Image, heading: str, body: str, box: tuple[int, int, int]) -> None:
    """Draws a heading and wrapped body copy inside a left-hand column."""
    x, y, width = box
    draw = ImageDraw.Draw(canvas)

    head_face = font(BOLD_FONT, 46)
    body_face = font(REGULAR_FONT, 23)

    for line in wrap(draw, heading, head_face, width):
        draw.text((x, y), line, font=head_face, fill=INK)
        y += 58

    y += 18
    for line in wrap(draw, body, body_face, width):
        draw.text((x, y), line, font=body_face, fill=MUTED)
        y += 34


def scaled(image: Image.Image, height: int) -> Image.Image:
    """Resizes to a target height, preserving aspect ratio."""
    ratio = height / image.height
    return image.resize((max(1, round(image.width * ratio)), height), Image.LANCZOS)


def require(name: str) -> Image.Image:
    """Opens a required input, failing with a usable message."""
    path = ASSETS / name
    if not path.exists():
        sys.exit(f"Missing {path.relative_to(ROOT)} — capture it before composing.")
    return Image.open(path)


def flatten(image: Image.Image) -> Image.Image:
    """Composites any transparency onto white.

    `sips` renders a PDF page as RGBA with a transparent background, and a plain
    RGB conversion drops that onto black — producing a black page with barely
    visible text rather than a document.
    """
    if image.mode not in ("RGBA", "LA", "P"):
        return image.convert("RGB")

    image = image.convert("RGBA")
    white = Image.new("RGBA", image.size, (255, 255, 255, 255))
    return Image.alpha_composite(white, image).convert("RGB")


def build_popup_shot() -> None:
    """Screenshot 1: the popup, mid-export."""
    # The popup renders at 988x1194 CSS pixels at the zoom used for capture.
    art = require("raw-popup.jpg").crop(css_box(0, 0, 988, 1194))
    canvas = new_canvas()

    draw_copy(
        canvas,
        "Any YouTube URL, one PDF",
        "Paste a link or let it read the tab you are already on. Pick the caption "
        "language, choose timestamps and paragraphs, and export.",
        (80, 150, 520),
    )
    paste_card(canvas, scaled(art, 664), (688, 68))
    canvas.convert("RGB").save(ASSETS / "screenshot-1-popup.png")


def build_pdf_shot() -> None:
    """Screenshot 2: the exported document."""
    art = flatten(require("raw-pdf.png"))
    canvas = new_canvas()

    draw_copy(
        canvas,
        "A real PDF, written locally",
        "No server and no upload. The file is generated in your browser and saved "
        "straight to your downloads, with timestamps and readable paragraphs.",
        (80, 150, 520),
    )
    paste_card(canvas, scaled(art, 672), (690, 64), radius=6)
    canvas.convert("RGB").save(ASSETS / "screenshot-2-pdf.png")


def build_viewer_shot() -> None:
    """Screenshot 3: the print path."""
    # Crop to the rendered document itself. The toolbar is excluded: it sits
    # flush against the viewport edge, so any crop that includes part of it
    # slices the button in half.
    art = require("raw-viewer.jpg").crop(css_box(668, 132, 1474, 1106))
    canvas = new_canvas()

    draw = ImageDraw.Draw(canvas)
    head_face = font(BOLD_FONT, 44)
    body_face = font(REGULAR_FONT, 23)

    draw.text((80, 60), "Every language, via Print", font=head_face, fill=INK)
    for index, line in enumerate(
        wrap(draw,
             "Japanese, Russian, Arabic and anything else the built-in writer cannot "
             "encode render through Chrome instead. Same transcript, same formatting.",
             body_face, 1120)
    ):
        draw.text((80, 126 + index * 34), line, font=body_face, fill=MUTED)

    art = scaled(art, 548)
    paste_card(canvas, art, ((CANVAS[0] - art.width) // 2, 226))
    canvas.convert("RGB").save(ASSETS / "screenshot-3-viewer.png")


def build_promo_tile() -> None:
    """The 440x280 small promo tile."""
    tile = Image.new("RGBA", TILE, (255, 255, 255, 255))
    draw = ImageDraw.Draw(tile)
    draw.rectangle([(0, 0), (TILE[0], 5)], fill=ACCENT + (255,))

    icon = Image.open(ROOT / "icons/icon-128.png").convert("RGBA").resize((72, 72), Image.LANCZOS)
    tile.alpha_composite(icon, (36, 52))

    draw.text((36, 148), "Transcript to PDF", font=font(BOLD_FONT, 30), fill=INK)
    body_face = font(REGULAR_FONT, 17)
    for index, line in enumerate(
        wrap(draw, "Export any YouTube transcript as a formatted PDF.", body_face, 368)
    ):
        draw.text((36, 192 + index * 25), line, font=body_face, fill=MUTED)

    tile.convert("RGB").save(ASSETS / "promo-tile-small.png")


def main() -> None:
    build_popup_shot()
    build_pdf_shot()
    build_viewer_shot()
    build_promo_tile()

    for name in ("screenshot-1-popup.png", "screenshot-2-pdf.png",
                 "screenshot-3-viewer.png", "promo-tile-small.png"):
        with Image.open(ASSETS / name) as image:
            print(f"  {name}  {image.width}x{image.height}")


if __name__ == "__main__":
    main()
