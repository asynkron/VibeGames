"""Capture a Populus Plateau screenshot using Playwright.

The script expects a dev server to be running locally on port 4173.
"""

import asyncio
from pathlib import Path

from playwright.async_api import async_playwright

OUTPUT_PATH = Path(__file__).resolve().parent.parent / "populus" / "populus-randomized.png"
TARGET_URL = "http://127.0.0.1:4173/populus/"
VIEWPORT = {"width": 1280, "height": 720}
WAIT_MS = 2000


async def capture() -> None:
    """Launch Chromium, visit the Populus scene, and store a screenshot."""
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport=VIEWPORT)
        await page.goto(TARGET_URL, wait_until="networkidle")
        await page.wait_for_timeout(WAIT_MS)
        await page.screenshot(path=str(OUTPUT_PATH), full_page=True)
        await browser.close()


def main() -> None:
    asyncio.run(capture())


if __name__ == "__main__":
    main()
