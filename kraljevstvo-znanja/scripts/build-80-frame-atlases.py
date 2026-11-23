#!/usr/bin/env python3
"""Build 80-frame RGBA sprite atlases for the two retained Kraljevstvo znanja guardians.

Walking castle and Sir Željezni: each 40 original frames plus 40 optical-flow
midpoints, including the loop transition. The Magic Forest is separately
supplied as a video; deleted decorative characters are not regenerated.
"""
from __future__ import annotations
import io
import re
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
GAME = ROOT / "kraljevstvo-znanja"
FRAMES = 80
COLS = 10
ROWS = 8

OLD_RASTER = {
    "castle": ("kz-roaming-castle-atlas.js", "hodajuci-dvorac-80.webp", 192),
    "iron": ("kz-sir-zeljeznik-optical-40.js", "sir-zeljezni-80.webp", 224),
}

def read_webp_from_js(path: Path) -> Image.Image:
    text = path.read_text(encoding="utf-8")
    match = re.search(r'data:image/webp;base64,([A-Za-z0-9+/=]+)', text)
    if not match:
        raise ValueError(f"WebP content is absent from {path}")
    return Image.open(io.BytesIO(base64.b64decode(match.group(1)))).convert("RGBA")


def unpack(source: Image.Image, width: int) -> list[Image.Image]:
    if source.width % width or source.height % width:
        raise ValueError(f"Invalid input atlas {source.size}, frame {width}")
    cols, rows = source.width // width, source.height // width
    if cols * rows != 40:
        raise ValueError(f"Expected precisely 40 original frames, got {cols*rows}")
    return [
        source.crop((i % cols * width, i // cols * width,
                     (i % cols + 1) * width, (i // cols + 1) * width))
        for i in range(40)
    ]


def premultiplied(array: np.ndarray) -> np.ndarray:
    f = array.astype(np.float32) / 255.0
    f[:, :, :3] *= f[:, :, 3:4]
    return f


def motion_midpoint(before: Image.Image, after: Image.Image) -> Image.Image:
    """Two-sided dense optical flow at t=0.5, in premultiplied RGBA."""
    a = np.asarray(before, dtype=np.uint8)
    b = np.asarray(after, dtype=np.uint8)
    fa, fb = premultiplied(a), premultiplied(b)
    ag = cv2.cvtColor((fa[:, :, :3] * 255).astype(np.uint8), cv2.COLOR_RGB2GRAY)
    bg = cv2.cvtColor((fb[:, :, :3] * 255).astype(np.uint8), cv2.COLOR_RGB2GRAY)
    forward = cv2.calcOpticalFlowFarneback(
        ag, bg, None, 0.5, 3, 19, 3, 5, 1.1, 0)
    backward = cv2.calcOpticalFlowFarneback(
        bg, ag, None, 0.5, 3, 19, 3, 5, 1.1, 0)
    h, w = ag.shape
    xs, ys = np.meshgrid(np.arange(w, dtype=np.float32),
                         np.arange(h, dtype=np.float32))
    warp_a = cv2.remap(fa, xs - 0.5 * forward[:, :, 0],
                       ys - 0.5 * forward[:, :, 1],
                       cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
    warp_b = cv2.remap(fb, xs - 0.5 * backward[:, :, 0],
                       ys - 0.5 * backward[:, :, 1],
                       cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
    both = (warp_a + warp_b) * 0.5
    alpha = np.clip(both[:, :, 3:4], 0, 1)
    rgb = np.clip(both[:, :, :3] / np.maximum(alpha, 1e-6), 0, 1)
    result = np.concatenate([rgb, alpha], axis=2)
    result = np.clip(result * 255 + 0.5, 0, 255).astype(np.uint8)
    result[alpha[:, :, 0] < 1 / 255, :] = 0
    return Image.fromarray(result, "RGBA")


def compose(frames: list[Image.Image], px: int) -> Image.Image:
    if len(frames) != FRAMES:
        raise AssertionError("A character must have exactly 80 frames")
    sheet = Image.new("RGBA", (COLS * px, ROWS * px), (0, 0, 0, 0))
    for i, frame in enumerate(frames):
        if frame.size != (px, px):
            raise ValueError(f"Frame {i} size {frame.size} differs from {px}")
        sheet.paste(frame, (i % COLS * px, i // COLS * px))
    return sheet


def build_raster():
    for kind, (source, output, px) in OLD_RASTER.items():
        frames = unpack(read_webp_from_js(GAME / source), px)
        doubled: list[Image.Image] = []
        for i in range(40):
            doubled.append(frames[i])
            doubled.append(motion_midpoint(frames[i], frames[(i+1) % 40]))
        unique = len({frame.tobytes() for frame in doubled})
        if unique < 75:
            raise ValueError(f"{kind}: {unique}/80 unique frames")
        target = GAME / "media" / output
        target.parent.mkdir(parents=True, exist_ok=True)
        sheet = compose(doubled, px)
        sheet.save(target, format="WEBP", quality=94, method=6, exact=True)
        verify = Image.open(target)
        if verify.size != sheet.size:
            raise AssertionError(f"Wrong media atlas size for {kind}")
        print(f"OK {kind}: 80 frames, 10x8 x {px}px; {unique} unique; {target.stat().st_size:,} bytes")


def main():
    build_raster()


if __name__ == "__main__":
    main()
