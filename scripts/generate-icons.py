#!/usr/bin/env python3
"""Generates the extension's icon set.

The mark is a document — a white page with a folded corner and lines of text —
on the project's red field. It deliberately avoids a play triangle: an icon that
closely evokes YouTube's play-button mark is a trademark risk on the Chrome Web
Store, and the extension's subject is the transcript, not the video.

Detail is size-aware. Text lines are omitted below 32px, where they would blur
into a grey smear, leaving a clean page silhouette that still reads at 16px.

Every icon is drawn at 8x and downsampled, which is what gives the curves and
the corner fold clean edges.

Usage:
    python3 scripts/generate-icons.py
"""

from __future__ import annotations

import pathlib

from PIL import Image, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parent.parent
ICONS = ROOT / "icons"

SIZES = (16, 32, 48, 128)
SUPERSAMPLE = 8

RED = (200, 32, 42, 255)
PAGE = (255, 255, 255, 255)
FOLD = (236, 214, 216, 255)
TEXT = (200, 32, 42, 255)


def draw_icon(size: int) -> Image.Image:
    """Renders one icon at the requested pixel size."""
    scale = size * SUPERSAMPLE
    image = Image.new("RGBA", (scale, scale), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    def unit(value: float) -> float:
        """Maps a coordinate on a 128-unit design grid to device pixels."""
        return value / 128 * scale

    # Red field. The corner radius is proportionally softer on small icons,
    # which keeps the silhouette from reading as a circle at 16px.
    radius = unit(26 if size >= 32 else 20)
    draw.rounded_rectangle([(0, 0), (scale - 1, scale - 1)], radius=radius, fill=RED)

    # Page body, with the top-right corner turned down.
    #
    # Small icons get a tighter page and a much larger corner cut: the text
    # lines are dropped below 32px, so the turned-down corner is the only cue
    # left that this is a document rather than a plain rectangle. It has to be
    # big enough to survive the downsample.
    if size >= 32:
        left, top, right, bottom = unit(36), unit(24), unit(92), unit(104)
        fold = unit(18)
    else:
        left, top, right, bottom = unit(40), unit(26), unit(88), unit(102)
        fold = unit(30)

    draw.polygon(
        [
            (left, top),
            (right - fold, top),
            (right, top + fold),
            (right, bottom),
            (left, bottom),
        ],
        fill=PAGE,
    )
    # The turned-down corner itself, a shade darker so the fold is legible.
    draw.polygon([(right - fold, top), (right, top + fold), (right - fold, top + fold)], fill=FOLD)

    # Lines of text. Below 32px these blur into a smear, so the page is left
    # blank and reads as a document by silhouette alone.
    if size >= 32:
        line_left = left + unit(9)
        line_right = right - unit(9)
        thickness = unit(7)
        for index, y in enumerate((unit(50), unit(64), unit(78))):
            end = line_right - (unit(16) if index == 2 else 0)
            draw.rounded_rectangle(
                [(line_left, y), (end, y + thickness)],
                radius=thickness / 2,
                fill=TEXT,
            )

    return image.resize((size, size), Image.LANCZOS)


def main() -> None:
    ICONS.mkdir(exist_ok=True)
    for size in SIZES:
        path = ICONS / f"icon-{size}.png"
        draw_icon(size).save(path)
        print(f"  {path.relative_to(ROOT)}  {size}x{size}")


if __name__ == "__main__":
    main()
