import "./build.mjs";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const dist = path.join(root, "dist");
const mime = {
  ".svg": "image/svg+xml",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
};
const inlineAsset = async (relative, base = dist) => {
  const file = path.resolve(base, relative);
  if (!file.startsWith(dist + path.sep))
    throw new Error("Recurso fuera de la exportación");
  const type = mime[path.extname(file)];
  if (!type) throw new Error(`Formato no previsto: ${file}`);
  return `data:${type};base64,${(await readFile(file)).toString("base64")}`;
};
let html = await readFile(path.join(dist, "index.html"), "utf8");
for (const match of [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g)]) {
  const source = match[0].match(/href="([^"]+)"/)?.[1];
  if (!source?.startsWith("./")) throw new Error("Hoja de estilos no local");
  const cssPath = path.join(dist, source);
  let css = await readFile(cssPath, "utf8");
  for (const url of [...css.matchAll(/url\(["']?([^"')]+)["']?\)/g)]) {
    if (url[1].startsWith("data:")) continue;
    css = css.replace(
      url[0],
      `url("${await inlineAsset(url[1], path.dirname(cssPath))}")`,
    );
  }
  html = html.replace(match[0], () => `<style>${css}</style>`);
}
for (const match of [
  ...html.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/g),
]) {
  if (!match[1].startsWith("./")) throw new Error("Script no local");
  const javascript = await readFile(path.join(dist, match[1]), "utf8");
  html = html.replace(
    match[0],
    () =>
      `<script type="module">${javascript.replace(/<\/script/gi, "<\\/script")}</script>`,
  );
}
for (const match of [...html.matchAll(/src="\.\/(assets\/[^"]+)"/g)]) {
  html = html.replace(match[0], `src="${await inlineAsset(match[1])}"`);
}
const vcard = await readFile(path.join(dist, "contacto.vcf"));
html = html.replaceAll(
  'href="./contacto.vcf"',
  `href="data:text/vcard;charset=utf-8;base64,${vcard.toString("base64")}"`,
);
const notices = await readFile(
  path.join(dist, "THIRD_PARTY_NOTICES.txt"),
  "utf8",
);
html = html.replace(
  "</head>",
  () =>
    `<!-- Licencias de recursos\n${notices.replace(/--/g, "—")}\n-->\n</head>`,
);
await mkdir(path.join(root, "artifacts"), { recursive: true });
await writeFile(
  path.join(root, "artifacts/SilviaRodriguez_Vista_Previa.html"),
  html,
);
console.log(
  "Vista autónoma exportada con fuentes, animaciones, contacto y recursos integrados.",
);
