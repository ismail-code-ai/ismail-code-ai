import { readFileSync, existsSync, statSync } from "node:fs";
import assert from "node:assert/strict";

const readme = readFileSync("README.md", "utf8");
const assets = [...new Set([...readme.matchAll(/\.\/(assets\/v2\/[\w-]+\.svg)/g)].map(m => m[1]))];

assert.ok(assets.length >= 9, "README should use at least nine self-hosted V2 artwork paths");
assert.ok(!/github-readme-stats|capsule-render|shields\.io|streak-stats/i.test(readme), "No generic external widgets");
for (const asset of assets) {
  assert.ok(existsSync(asset), "Missing asset: " + asset);
  assert.ok(statSync(asset).size < 95000, "Oversized asset: " + asset);
  const src = readFileSync(asset, "utf8");
  assert.match(src, /^<svg\b/);
  assert.match(src, /xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(src, /<\/svg>\s*$/);
  assert.ok(!/<script|<iframe|<foreignObject|<image\b/i.test(src), "Unsupported or unsafe elements: " + asset);
  assert.ok(!/https?:\/\//i.test(src.replace('xmlns="http://www.w3.org/2000/svg"', "")), "Externally hosted references: " + asset);
}
assert.ok(readme.includes("PRIVATE"), "Explain private projects");
console.log("PROFILE VALIDATED: " + assets.length + " image paths verified, no external widgets");
