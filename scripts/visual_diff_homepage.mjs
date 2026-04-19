import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

const getArg = (name, fallback) => {
  const idx = process.argv.findIndex((a) => a === name);
  if (idx === -1) return fallback;
  const v = process.argv[idx + 1];
  return v ?? fallback;
};

const readPng = (filePath) =>
  new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(new PNG())
      .on("parsed", function () {
        resolve(this);
      })
      .on("error", reject);
  });

async function captureViewport({ url, viewport, outPath }) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();

  await page.goto(url, { waitUntil: "networkidle" });

  // Take the screenshot early (before HeroBanner autoplay interval changes slide).
  await page.waitForTimeout(1200);

  await page.screenshot({ path: outPath, fullPage: false });
  await browser.close();
}

async function diffImages({ refPath, actualPath, diffPath, threshold = 0.1 }) {
  const [refImg, actualImg] = await Promise.all([readPng(refPath), readPng(actualPath)]);

  if (refImg.width !== actualImg.width || refImg.height !== actualImg.height) {
    throw new Error(
      `Image dimension mismatch: ref=${refImg.width}x${refImg.height}, actual=${actualImg.width}x${actualImg.height}`
    );
  }

  const diff = new PNG({ width: refImg.width, height: refImg.height });

  const numDiffPixels = pixelmatch(refImg.data, actualImg.data, diff.data, refImg.width, refImg.height, {
    threshold,
    includeAA: true,
  });

  fs.writeFileSync(diffPath, PNG.sync.write(diff));
  const totalPixels = refImg.width * refImg.height;
  const percent = (numDiffPixels / totalPixels) * 100;

  return { numDiffPixels, totalPixels, percent };
}

async function main() {
  const url = getArg("--url", "http://localhost:3000/");
  const refDesktop = getArg("--refDesktop", "");
  const refMobile = getArg("--refMobile", "");
  const outDir = getArg("--outDir", path.join(process.cwd(), "tmp_visual_diff"));

  const ensureDir = (p) => fs.mkdirSync(p, { recursive: true });
  ensureDir(outDir);

  const runOne = async ({ name, viewport, refPath }) => {
    if (!refPath) {
      console.warn(`[${name}] Skipped: missing ref image path`);
      return null;
    }
    const actualPath = path.join(outDir, `actual_${name}.png`);
    const diffPath = path.join(outDir, `diff_${name}.png`);

    console.log(`[${name}] Capturing: ${url} @ ${viewport.width}x${viewport.height}`);
    await captureViewport({ url, viewport, outPath: actualPath });

    console.log(`[${name}] Diffing against: ${refPath}`);
    const stats = await diffImages({ refPath, actualPath, diffPath });

    console.log(
      `[${name}] Diff pixels: ${stats.numDiffPixels}/${stats.totalPixels} (${stats.percent.toFixed(3)}%)`
    );
    console.log(`[${name}] Diff image written to: ${diffPath}`);
    return stats;
  };

  await runOne({
    name: "desktop",
    viewport: { width: 1440, height: 900 },
    refPath: refDesktop,
  });

  await runOne({
    name: "mobile",
    viewport: { width: 375, height: 812 },
    refPath: refMobile,
  });

  console.log(`Done. Output dir: ${outDir}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

