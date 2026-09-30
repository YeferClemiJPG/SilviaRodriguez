import { readFile, writeFile, access, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { format } from "prettier";
import QRCode from "qrcode";

const root = fileURLToPath(new URL("../", import.meta.url));
const profile = JSON.parse(
  await readFile(path.join(root, "content/profile.json"), "utf8"),
);
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const fullName = [profile.honorific, profile.givenName, profile.familyName]
  .filter(Boolean)
  .join(" ");
for (const key of ["givenName", "familyName", "slug"]) {
  if (!profile[key]) throw new Error(`Falta el dato obligatorio: ${key}`);
}
if (profile.phone && !/^\+[1-9]\d{6,14}$/.test(profile.phone))
  throw new Error("El teléfono debe usar formato internacional E.164.");
if (!/^[a-z0-9-]+$/.test(profile.slug)) throw new Error("Slug inválido.");
for (const key of ["instagramPersonal", "instagramInstitutional"]) {
  if (profile[key] && !/^[A-Za-z0-9._]+$/.test(profile[key]))
    throw new Error(`Usuario de Instagram inválido: ${key}`);
}
if (new URL(profile.portfolio).protocol !== "https:")
  throw new Error("El portafolio debe usar HTTPS.");
if (profile.publicUrl && new URL(profile.publicUrl).protocol !== "https:")
  throw new Error("La URL pública debe usar HTTPS.");
const biographySources = profile.biographySources ?? [];
if (!Array.isArray(biographySources))
  throw new Error("Las fuentes de la biografía deben ser una lista.");
for (const source of biographySources) {
  if (typeof source?.label !== "string" || !source.label.trim())
    throw new Error("Cada fuente de la biografía debe tener un nombre.");
  if (
    typeof source.url !== "string" ||
    new URL(source.url).protocol !== "https:"
  )
    throw new Error("Las fuentes de la biografía deben usar HTTPS.");
}
for (const key of [
  "logo",
  "portrait",
  "instagramPortrait",
  "editorialPortrait",
  "professionalPortrait",
  "institutionalPhoto",
  "scienceIllustration",
  "researchIllustration",
  "portfolioArtwork",
  "biographyBanner",
  "contactWaves",
  "portfolioIllustration",
]) {
  if (profile[key]) {
    if (!/^assets\/[a-zA-Z0-9/_-]+\.(svg|png|webp|jpe?g)$/.test(profile[key]))
      throw new Error(`Recurso local inválido: ${key}`);
    await access(path.join(root, "public", profile[key]));
  }
}
for (const asset of [
  "contact-save-sculpture.png",
  "contact-whatsapp-sculpture-v2.png",
  "contact-mail-sculpture.png",
  "contact-phone-sculpture-v2.png",
]) {
  await access(path.join(root, "public/assets", asset));
}
const values = Object.fromEntries(
  Object.entries(profile).map(([k, v]) => [k, escape(v ?? "")]),
);
Object.assign(values, {
  whatsappIcon: await readFile(
    path.join(root, "public/assets/icons/whatsapp.svg"),
    "utf8",
  ),
  instagramIcon: await readFile(
    path.join(root, "public/assets/icons/instagram.svg"),
    "utf8",
  ),
  fullName: escape(fullName),
  emailDisplay: escape(profile.email ?? "Por configurar").replace(
    "@",
    "@<wbr>",
  ),
  biographySources: biographySources
    .map(
      ({ label, url }) =>
        `<a class="biography-source" href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(label)}</a>`,
    )
    .join("\n"),
  description: escape(
    `${fullName}. ${profile.roles.join(" · ")}. Datos de contacto, redes sociales y portafolio CLEMI.`,
  ),
  role1: escape(profile.roles[0]),
  role2: escape(profile.roles[1] ?? ""),
  whatsapp: `https://wa.me/${(profile.phone ?? "").slice(1)}`,
  instagramPersonalUrl: `https://www.instagram.com/${(profile.instagramPersonal ?? "").toLowerCase()}/`,
  instagramPersonalHandle: `@${(profile.instagramPersonal ?? "").toLowerCase()}`,
  instagramInstitutionalUrl: `https://www.instagram.com/${profile.instagramInstitutional.toLowerCase()}/`,
  robots:
    !profile.template && profile.publicUrl
      ? "index, follow"
      : "noindex, nofollow",
  canonical: profile.publicUrl
    ? `<link rel="canonical" href="${escape(profile.publicUrl)}" />`
    : "",
  brand: profile.logo
    ? `<img class="official-logo" src="./${escape(profile.logo)}" alt="Logo oficial de CLEMI" width="${Number(profile.logoWidth) || 64}" height="${Number(profile.logoHeight) || 64}" />`
    : "Perfil profesional",
  cardLogo: profile.logo
    ? `<img class="card-logo" src="./${escape(profile.logo)}" alt="Logo oficial de CLEMI" width="${Number(profile.logoWidth) || 64}" height="${Number(profile.logoHeight) || 64}" />`
    : `<span>CLEMI</span>`,
  portraitClass: profile.portrait ? "has-portrait" : "",
  portrait: profile.portrait
    ? `<div class="portrait-frame"><img class="portrait" src="./${escape(profile.portrait)}" alt="${escape(profile.portraitAlt)}" width="${Number(profile.portraitWidth) || 768}" height="${Number(profile.portraitHeight) || 1024}" fetchpriority="high" /></div>`
    : "",
  portraitTile: profile.portrait
    ? `<img class="tile-image personal-image" src="./${escape(profile.portrait)}" alt="" width="${Number(profile.portraitWidth) || 768}" height="${Number(profile.portraitHeight) || 1024}" loading="lazy" />`
    : "",
  instagramPortrait: profile.instagramPortrait
    ? `<img class="instagram-profile-image" src="./${escape(profile.instagramPortrait)}" alt="${escape(fullName)} · perfil personal de Instagram" width="${Number(profile.instagramPortraitWidth) || 1080}" height="${Number(profile.instagramPortraitHeight) || 1080}" loading="lazy" />`
    : "",
  editorialPortrait: profile.editorialPortrait
    ? `<img class="editorial-portrait-image" src="./${escape(profile.editorialPortrait)}" alt="Retrato editorial de ${escape(fullName)}" aria-describedby="editorial-quote" width="${Number(profile.editorialPortraitWidth) || 715}" height="${Number(profile.editorialPortraitHeight) || 786}" loading="lazy" />`
    : "",
  professionalPortrait: profile.professionalPortrait
    ? `<img class="professional-portrait-image" src="./${escape(profile.professionalPortrait)}" alt="${escape(fullName)} con bata médica, retrato publicado por SCCOT" width="${Number(profile.professionalPortraitWidth) || 853}" height="${Number(profile.professionalPortraitHeight) || 1280}" loading="lazy" />`
    : "",
  mottoLines: String(profile.motto ?? "")
    .split(/,\s*/)
    .map(
      (line, index, lines) =>
        `<span>${escape(line)}${index < lines.length - 1 ? "," : ""}</span>`,
    )
    .join(" "),
});
values.biography = escape(
  profile.biography ??
    "Aquí irá la presentación profesional y la trayectoria. El contenido se completará más adelante.",
);
const pending =
  'role="link" aria-disabled="true" tabindex="0" title="Pendiente de configurar"';
values.saveAttributes =
  profile.email || profile.phone
    ? 'href="./contacto.vcf" download="' +
      escape(profile.slug) +
      '.vcf" type="text/vcard" data-contact-download'
    : pending;
values.phoneAttributes = profile.phone
  ? 'href="tel:' + escape(profile.phone) + '"'
  : pending;
values.whatsappAttributes = profile.phone
  ? 'href="' + values.whatsapp + '" target="_blank" rel="noopener noreferrer"'
  : pending;
values.emailAttributes = profile.email
  ? 'href="mailto:' + escape(profile.email) + '"'
  : pending;
values.instagramAttributes = profile.instagramPersonal
  ? 'href="' +
    values.instagramPersonalUrl +
    '" target="_blank" rel="noopener noreferrer"'
  : pending;
values.portrait = profile.portrait
  ? values.portrait
  : '<div class="portrait-frame template-photo"><span class="template-initials" aria-hidden="true">' +
    escape(profile.initials) +
    "</span><span>Fotografía de portada</span><small>Por incorporar</small></div>";
values.instagramPortrait = profile.instagramPortrait
  ? values.instagramPortrait
  : '<div class="template-instagram"><span aria-hidden="true">' +
    escape(profile.initials) +
    "</span><small>Fotografía de Instagram</small></div>";
values.bannerArtwork = profile.biographyBanner
  ? '<img class="biography-backdrop" src="./' +
    escape(profile.biographyBanner) +
    '" alt="Retrato de ' +
    escape(fullName) +
    '" width="1774" height="887" loading="lazy" />'
  : '<div class="template-banner-photo"><span aria-hidden="true">' +
    escape(profile.initials) +
    "</span><small>Fotografía para el banner</small></div>";
values.templateNotice = profile.template
  ? '<p class="template-notice">Plantilla · fotografías y datos por completar</p>'
  : "";
const template = await readFile(path.join(root, "src/page.html"), "utf8");
const html = template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
  if (!(key in values)) throw new Error(`Marcador desconocido: ${key}`);
  return values[key];
});
await writeFile(
  path.join(root, "index.html"),
  await format(html, { parser: "html" }),
);
const vEscape = (value) =>
  String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
const lines = [
  "BEGIN:VCARD",
  "VERSION:3.0",
  `N:${vEscape(profile.familyName)};${vEscape(profile.givenName)};;${vEscape(profile.honorific)};`,
  `FN:${vEscape(fullName)}`,
  `ORG:${vEscape(profile.organization)}`,
  `TITLE:${vEscape(profile.roles.join(" - "))}`,
  ...(profile.phone ? [`TEL;TYPE=CELL:${profile.phone}`] : []),
  ...(profile.email ? [`EMAIL;TYPE=INTERNET,WORK:${profile.email}`] : []),
  `URL:${profile.portfolio}`,
  ...(profile.instagramPersonal
    ? [
        `X-SOCIALPROFILE;TYPE=instagram:https://www.instagram.com/${profile.instagramPersonal.toLowerCase()}/`,
      ]
    : []),
  "END:VCARD",
];
// RFC 2425: folded content lines are at most 75 UTF-8 octets, using CRLF + space.
const fold = (line) => {
  let output = "",
    count = 0;
  for (const character of line) {
    const bytes = Buffer.byteLength(character);
    if (count + bytes > 75) {
      output += "\r\n ";
      count = 1;
    }
    output += character;
    count += bytes;
  }
  return output;
};
const vcard = lines.map(fold).join("\r\n") + "\r\n";
await writeFile(path.join(root, "public/contacto.vcf"), vcard);
await mkdir(path.join(root, "public/assets"), { recursive: true });
await writeFile(
  path.join(root, "public/assets/contacto-qr.svg"),
  await QRCode.toString(vcard, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 4,
    color: { dark: "#1A2744", light: "#F4EFE4" },
  }),
);
console.log(`Contenido generado: ${fullName}.`);
