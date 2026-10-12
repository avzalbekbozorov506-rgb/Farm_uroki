#!/usr/bin/env node
/* Сборка сайта «Оператор ТЛФ».
   Исходники: site/ (data.js, data-gran.js, app.js, style.css, fonts/, favicon.svg, og.png, index.html).
   Результат:
     корень репозитория    — многостраничный статический сайт для GitHub Pages (ветка main, папка /);
     all-in-one.html       — вся работа одним файлом (офлайн, CSS/JS/шрифты внутри);
     dist/artifact.html    — тот же файл без <html>/<head>/<body> для публикации как Artifact.
   Запуск: node build.js */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT_DIR = __dirname;
const SRC = path.join(ROOT_DIR, "site");
const OUT = ROOT_DIR; // GitHub Pages публикует ветку main из корня репозитория
const DIST = path.join(ROOT_DIR, "dist");
const TODAY = new Date().toISOString().slice(0, 10);

// Ключ IndexNow (публичный по устройству протокола, не секрет). Файл <ключ>.txt кладётся в корень сайта.
const INDEXNOW_KEY = "a1fbe23784c51ce37b5823264bd25739";

// Коды подтверждения прав (бесплатно). Вставьте значение content из мета-тега и пересоберите: node build.js
const VERIFICATION = {
  yandex: "", // Яндекс.Вебмастер: <meta name="yandex-verification" content="ВОТ_ЭТО">
  google: ""  // Google Search Console: <meta name="google-site-verification" content="ВОТ_ЭТО">
};

// --- загрузка данных и приложения в режиме сборки ---
global.TLF_DATA = undefined;
const vm = require("vm");
const ctx = { console };
ctx.globalThis = ctx;
vm.createContext(ctx);
for (const f of ["data.js", "data-gran.js", "schemes.js", "app.js"]) {
  const code = fs.readFileSync(path.join(SRC, f), "utf8").replace(/\bwindow\.TLF_/g, "globalThis.TLF_");
  vm.runInContext(code, ctx, { filename: f });
}
const APP = ctx.TLF_APP;
if (!APP) throw new Error("TLF_APP не экспортирован");
const SITE = APP.SITE_URL;

function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]); }
function rm(dir) { fs.rmSync(dir, { recursive: true, force: true }); }
function write(file, content) {
  if (file.endsWith(".html") && path.relative(OUT, file) !== "all-in-one.html") content = versionAssets(content);
  fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, content);
}
function read(f) { return fs.readFileSync(path.join(SRC, f), "utf8"); }

// --- CSS со шрифтами ---
const fontsCss = read("fonts/fonts.css");
const css = read("style.css");
const siteCss = () => fontsCss.replace(/url\(([^)]+\.woff2)\)/g, "url(fonts/$1)") + "\n" + css;

// Версия ассета по содержимому (?v=…): после публикации браузер не возьмёт из кэша
// старые style.css или app.js к новым страницам.
const ASSET_VER = {};
for (const f of ["data.js", "data-gran.js", "schemes.js", "app.js"]) ASSET_VER[f] = hash(read(f));
ASSET_VER["style.css"] = hash(siteCss());
function hash(s) { return require("crypto").createHash("sha256").update(s).digest("hex").slice(0, 10); }
function versionAssets(htmlText) {
  return htmlText.replace(/(assets\/(style\.css|data\.js|data-gran\.js|schemes\.js|app\.js))"/g, (m, p, f) => `${p}?v=${ASSET_VER[f]}"`);
}
const fontFiles = fs.readdirSync(path.join(SRC, "fonts")).filter(f => f.endsWith(".woff2"));

function themeInit() {
  return '<script>document.documentElement.className+=" js";try{var t=JSON.parse(localStorage.getItem("tlf-trainer-v1")||"{}").theme;if(t==="dark"||t==="light")document.documentElement.setAttribute("data-theme",t)}catch(e){}</script>';
}

function person() { return { "@type": "Person", name: APP.AUTHOR_NAME, jobTitle: APP.AUTHOR_JOB }; }
function jsonLd(route, m, url) {
  const website = { "@type": "WebSite", "@id": SITE + "#website", name: "Оператор ТЛФ", url: SITE, inLanguage: "ru",
    description: "Информационно-справочный материал для самоподготовки операторов производства твёрдых лекарственных форм.", author: person() };
  const graph = [website];
  if (m.article) {
    graph.push({ "@type": "Article", headline: m.headline || (m.lesson ? m.lesson.title : m.title.split(" | ")[0]), description: m.description, inLanguage: "ru",
      url, mainEntityOfPage: url, author: person(), isPartOf: { "@id": SITE + "#website" }, dateModified: TODAY, image: SITE + "assets/og.png" });
  }
  if (m.faq) {
    graph.push({ "@type": "FAQPage", url, inLanguage: "ru",
      mainEntity: m.faq.map(f => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) });
  }
  return '<script type="application/ld+json">' + JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c") + "</script>";
}

// схемы нужны только там, где они рисуются: уроки со схемой и списки уроков (метка «Схема»)
function needsSchemes(route) {
  if (route === "home" || route === "lessons" || route === "gran") return true;
  return route.indexOf("lesson-") === 0 && !!ctx.TLF_SCHEMES.forLesson(route.slice(7));
}
function pageHtml(route) {
  const p = APP.pathFor(route);
  const depth = p.split("/").length - 1;
  const rootRel = "../".repeat(depth);
  APP.setMode("mpa", rootRel);
  const parts = APP.page(route);
  const m = APP.meta(route);
  const url = APP.publicUrl(route);
  const verify = route === "home"
    ? "\n<!-- Подтверждение прав в поисковых системах (бесплатно). Вставьте сюда мета-теги из кабинетов:\n     Яндекс.Вебмастер:      <meta name=\"yandex-verification\" content=\"...\">\n     Google Search Console: <meta name=\"google-site-verification\" content=\"...\">\n     Удобнее всего: впишите коды в VERIFICATION в build.js и выполните node build.js.\n     Подробно — в файле DEPLOY.md. -->"
    : "";
  const verifyTags = route === "home"
    ? (VERIFICATION.yandex ? `\n<meta name="yandex-verification" content="${esc(VERIFICATION.yandex)}">` : "") +
      (VERIFICATION.google ? `\n<meta name="google-site-verification" content="${esc(VERIFICATION.google)}">` : "")
    : "";
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(m.title)}</title>
<meta name="description" content="${esc(m.description)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="index, follow">
<meta name="author" content="${esc(APP.AUTHOR_NAME)}">
<meta name="theme-color" content="#f4f7f6" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0a1113" media="(prefers-color-scheme: dark)">
<meta property="og:type" content="${m.article ? "article" : "website"}">
<meta property="og:locale" content="ru_RU">
<meta property="og:site_name" content="Оператор ТЛФ">
<meta property="og:title" content="${esc(m.title)}">
<meta property="og:description" content="${esc(m.description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}assets/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Оператор ТЛФ — самоподготовка оператора производства твёрдых лекарственных форм">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(m.title)}">
<meta name="twitter:description" content="${esc(m.description)}">
<meta name="twitter:image" content="${SITE}assets/og.png">
<link rel="icon" href="${rootRel}assets/favicon.svg" type="image/svg+xml">
<link rel="preload" href="${rootRel}assets/fonts/golos-text-cyrillic.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${rootRel}assets/style.css">
${themeInit()}
${jsonLd(route, m, url)}${verify}${verifyTags}
</head>
<body data-route="${route}" data-root="${rootRel}">
${parts.header}
<div class="shell">
${parts.nav}
<main id="view" tabindex="-1">${parts.view}</main>
</div>
${parts.footer}
<script src="${rootRel}assets/data.js" defer></script>
<script src="${rootRel}assets/data-gran.js" defer></script>
${needsSchemes(route) ? `<script src="${rootRel}assets/schemes.js" defer></script>\n` : ""}<script src="${rootRel}assets/app.js" defer></script>
</body>
</html>
`;
}

function page404() {
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Страница не найдена | Оператор ТЛФ</title>
<meta name="description" content="Такой страницы на сайте «Оператор ТЛФ» нет.">
<meta name="robots" content="noindex">
<style>
:root{--bg:#f4f7f6;--fg:#0f1f1c;--muted:#566562;--accent:#0a6b5c;--ink:#fff;--surface:#fff;--line:#dbe3e1;--soft:#dff0eb;color-scheme:light}
@media (prefers-color-scheme:dark){:root{--bg:#0a1113;--fg:#e4ecea;--muted:#93a6a2;--accent:#4fd1b5;--ink:#04201a;--surface:#101a1c;--line:#213235;--soft:#0f2e29;color-scheme:dark}}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(900px 420px at 80% -10%,var(--soft),transparent 70%),var(--bg);color:var(--fg);font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}
main{max-width:640px;margin:0 auto;padding:48px 16px;display:grid;gap:18px;justify-items:start}
svg{width:132px;height:auto}
.t1{fill:var(--accent)}.t2{fill:var(--surface);stroke:var(--line);stroke-width:2}.cr{stroke:var(--bg);stroke-width:5;stroke-linecap:round}
.code{font:600 .78rem/1 ui-monospace,Consolas,monospace;letter-spacing:.12em;color:var(--muted)}
h1{margin:0;font-size:clamp(1.7rem,1.3rem + 2vw,2.4rem);line-height:1.15;letter-spacing:-.02em}
p{margin:0;color:var(--muted);max-width:60ch}
nav{display:flex;flex-wrap:wrap;gap:8px}
a{color:var(--accent);font-weight:600}
nav a{display:inline-flex;align-items:center;min-height:44px;padding:10px 16px;border:1px solid var(--line);border-radius:12px;background:var(--surface);text-decoration:none;transition:border-color .2s}
nav a:first-child{background:var(--accent);border-color:var(--accent);color:var(--ink)}
nav a:hover{border-color:var(--accent)}
a:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.small{font-size:.85rem}
</style>
</head>
<body>
<main>
<svg viewBox="0 0 140 100" aria-hidden="true"><g transform="rotate(-8 50 50)"><path class="t1" d="M50 8a42 42 0 0 0 0 84z"/></g><g transform="translate(14 6) rotate(10 76 50)"><path class="t2" d="M76 8a42 42 0 0 1 0 84z"/></g></svg>
<span class="code">ОШИБКА 404</span>
<h1>Страница не найдена</h1>
<p>Возможно, адрес набран с ошибкой или страница была перемещена. Ссылки ниже ведут на основные разделы.</p>
<nav aria-label="Разделы">
<a href="${SITE}">Главная</a><a href="${SITE}uroki/">Уроки</a><a href="${SITE}granulyaciya/">Грануляция ТЛФ</a><a href="${SITE}testy.html">Тесты</a><a href="${SITE}glossarij.html">Глоссарий</a>
</nav>
<p class="small">${esc(APP.DISCLAIMER)}</p>
</main>
</body>
</html>
`;
}

// --- однофайловая версия ---
function allInOne() {
  let fcss = fontsCss.replace(/url\(([^)]+\.woff2)\)/g, (_, f) =>
    "url(data:font/woff2;base64," + fs.readFileSync(path.join(SRC, "fonts", f)).toString("base64") + ")");
  let html = read("index.html");
  const js = ["data.js", "data-gran.js", "schemes.js", "app.js"].map(f => {
    const c = read(f);
    if (/<\/script/i.test(c)) throw new Error(f + " содержит </script>");
    return c;
  });
  html = html
    .replace('<link rel="stylesheet" href="fonts/fonts.css">', "")
    .replace('<link rel="stylesheet" href="style.css">',
      () => '<link rel="canonical" href="' + SITE + '">\n<link rel="icon" href="data:image/svg+xml;base64,' + Buffer.from(read("favicon.svg")).toString("base64") + '">\n<style>\n' + fcss + "\n" + css + "</style>")
    .replace('<script src="data.js"></script>', () => "<script>\n" + js[0] + "</script>")
    .replace('<script src="data-gran.js"></script>', () => "<script>\n" + js[1] + "</script>")
    .replace('<script src="schemes.js"></script>', () => "<script>\n" + js[2] + "</script>")
    .replace('<script src="app.js"></script>', () => "<script>\n" + js[3] + "</script>");
  if (/(href|src)="(?!https?:|#|data:)[^"]+"/.test(html.replace(/<script>[\s\S]*?<\/script>/g, ""))) throw new Error("all-in-one: остались ссылки на внешние файлы");
  return html;
}
function artifactVersion(html) {
  const head = html.match(/<head>([\s\S]*?)<\/head>/)[1]
    .replace(/<meta charset[^>]*>\s*/, "").replace(/<meta name="viewport"[^>]*>\s*/, "");
  const body = html.match(/<body>([\s\S]*)<\/body>/)[1];
  return head.trim() + "\n" + body.trim() + "\n";
}

// --- сборка ---
// чистим только то, что генерирует сборка (исходники и документы не трогаем)
for (const d of ["assets", "uroki", "granulyaciya"]) rm(path.join(OUT, d));
const routes = APP.routes();
for (const r of routes) {
  const p = APP.pathFor(r).replace(/#.*$/, "");
  write(path.join(OUT, p), pageHtml(r));
}
write(path.join(OUT, "404.html"), page404());

// ассеты
write(path.join(OUT, "assets/style.css"), siteCss());
for (const f of ["data.js", "data-gran.js", "schemes.js", "app.js", "favicon.svg"]) fs.copyFileSync(path.join(SRC, f), path.join(OUT, "assets", f));
fs.copyFileSync(path.join(SRC, "og.png"), path.join(OUT, "assets/og.png"));
fs.mkdirSync(path.join(OUT, "assets/fonts"), { recursive: true });
for (const f of fs.readdirSync(path.join(SRC, "fonts"))) if (/\.(woff2|txt)$/.test(f)) fs.copyFileSync(path.join(SRC, "fonts", f), path.join(OUT, "assets/fonts", f));

// robots, sitemap, служебное
write(path.join(OUT, "robots.txt"), "User-agent: *\nAllow: /\nDisallow: /all-in-one.html\nDisallow: /site/\n\nSitemap: " + SITE + "sitemap.xml\n");
const sm = routes.map(r => {
  const pri = r === "home" ? "1.0" : (r === "lessons" || r === "gran") ? "0.9" : r.indexOf("lesson-") === 0 ? "0.8" : "0.6";
  return `  <url>\n    <loc>${APP.publicUrl(r)}</loc>\n    <lastmod>${TODAY}</lastmod>\n    <priority>${pri}</priority>\n  </url>`;
}).join("\n");
write(path.join(OUT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sm}\n</urlset>\n`);
write(path.join(OUT, ".nojekyll"), "");
write(path.join(OUT, INDEXNOW_KEY + ".txt"), INDEXNOW_KEY);

const aio = allInOne();
write(path.join(OUT, "all-in-one.html"), aio);
write(path.join(DIST, "artifact.html"), artifactVersion(aio));

const c = APP.counts();
console.log(`Готово: ${routes.length} страниц + 404, ${c.lessons} уроков (${c.base} + ${c.gran}), ${c.questions} вопросов (модуль грануляции: ${c.gran_q}), ${c.glossary} терминов.`);
console.log(`all-in-one.html: ${(Buffer.byteLength(aio) / 1024).toFixed(0)} КБ`);
