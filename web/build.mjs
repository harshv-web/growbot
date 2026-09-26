// Builds the Jeevo product site.
//   node web/build.mjs → web/dist (for publishing; index.html is body-only, other pages are full documents)
//                      → web/preview (every page a full document, for local viewing)
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const src = p => readFileSync(join(here, "src", p), "utf8");
const THREE_URL = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
const FONTS = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap";
const SKEL = '<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif;background:#ffffff;color:#171a20}img{max-width:100%}[hidden]{display:none!important}</style></head><body>';

const PAGES = [
  { file: "index.html", key: "home", title: "Jeevo", three: true },
  { file: "soul.html", key: "soul", title: "Jeevo Soul" },
  { file: "bodies.html", key: "bodies", title: "Jeevo Models", three: true },
  { file: "journey.html", key: "journey", title: "Jeevo Journey" },
  { file: "lab.html", key: "lab", title: "Jeevo Lab Live", learn: true }
];
const nav = `<nav class="nav" aria-label="Site"><div class="nav-in">
  <a class="logo" href="index.html">JEEVO</a>
  <div class="links"><a href="bodies.html">Models</a><a href="soul.html">Soul</a><a href="journey.html">Journey</a><a href="lab.html">Lab</a></div>
  <div class="side"><span class="moodpill" title="The soul's mood, live"><span data-mood>Content</span></span></div>
</div></nav>`;
const footer = `<footer><span>Jeevo © 2026</span><span>Built in Bengaluru by Harsh</span><span><a href="https://github.com/britcruise9/GrowBot" target="_blank" rel="noopener">Grown from GrowBot</a></span><span>Noncommercial · Prototype</span></footer>`;

function page(p, threeUrl) {
  const scripts = [
    p.three ? `<script src="${threeUrl}"></script>` : "",
    `<script src="assets/emotion.js"></script>`,
    p.learn ? `<script src="assets/learner.js"></script>` : "",
    `<script>window.JEEVO_PAGE=${JSON.stringify(p.key)}</script>`,
    `<script src="assets/core.js"></script>`,
    p.three ? `<script src="assets/world.js"></script>` : "",
    `<script src="assets/pages.js"></script>`
  ].filter(Boolean).join("\n");
  return `<title>${p.title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}">
<link rel="stylesheet" href="assets/site.css">
${nav}
${src("pages/" + p.file)}
${footer}
${scripts}
`;
}
const assets = [["assets/site.css", "src/assets/site.css"], ["assets/core.js", "src/assets/core.js"], ["assets/world.js", "src/assets/world.js"], ["assets/pages.js", "src/assets/pages.js"],
  ["assets/emotion.js", "../prototypes/soul/emotion.js"], ["assets/learner.js", "../prototypes/legs/learner.js"]];

for (const [out, threeUrl, wrapIndex] of [["dist", THREE_URL, false], ["preview", "assets/three.min.js", true]]) {
  mkdirSync(join(here, out, "assets"), { recursive: true });
  for (const [to, from] of assets) copyFileSync(join(here, from), join(here, out, to));
  for (const p of PAGES) {
    const body = page(p, threeUrl);
    const wrap = p.file !== "index.html" || wrapIndex;
    writeFileSync(join(here, out, p.file), wrap ? SKEL + body + "</body></html>" : body);
  }
}
console.log("built", PAGES.map(p => p.file).join(", "));
