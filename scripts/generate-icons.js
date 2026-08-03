const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const svgPath = path.join(__dirname, "..", "public", "icon.svg");
const svgBuffer = fs.readFileSync(svgPath);

async function generate() {
  await sharp(svgBuffer).resize(192, 192).png().toFile(path.join(__dirname, "..", "public", "icon-192.png"));
  console.log("✓ icon-192.png");
  await sharp(svgBuffer).resize(512, 512).png().toFile(path.join(__dirname, "..", "public", "icon-512.png"));
  console.log("✓ icon-512.png");
  await sharp(svgBuffer).resize(180, 180).png().toFile(path.join(__dirname, "..", "public", "apple-touch-icon.png"));
  console.log("✓ apple-touch-icon.png");
  await sharp(svgBuffer).resize(32, 32).png().toFile(path.join(__dirname, "..", "public", "favicon-32.png"));
  console.log("✓ favicon-32.png");
  console.log("All icons generated!");
}
generate().catch(console.error);
