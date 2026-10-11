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
for (const f of ["data.js", "data-gran.js", "app.js"]) {
  const code = fs.readFileSync(path.join(SRC, f), "utf8").replace(/\bwindow\.TLF_/g, "globalThis.TLF_");
  vm.runInContext(code, ctx, { filename: f });
}
const APP = ctx.TLF_APP;
if (!APP) throw new Error("TLF_APP не экспортирован");
const SITE = APP.SITE_URL;

function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]); }
function rm(dir) { fs.rmSync(dir, { recursive: true, force: true }); }
function write(file, content) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, content); }
function read(f) { return fs.readFileSync(path.join(SRC, f), "utf8"); }

// --- CSS со шрифтами ---
const fontsCss = read("fonts/fonts.css");
const css = read("style.css");
const fontFiles = fs.readdirSync(path.join(SRC, "fonts")).filter(f => f.endsWith(".woff2"));

function themeInit() {
  return '<script>try{var t=JSON.parse(localStorage.getItem("tlf-trainer-v1")||"{}").theme;if(t==="dark"||t==="light")document.documentElement.setAttribute("data-theme",t)}catch(e){}</script>';
}

function person() { return { "@type": "Person", name: APP.AUTHOR_NAME, jobTitle: APP.AUTHOR_JOB }; }
function jsonLd(route, m, url) {
  const website = { "@type": "WebSite", "@id": SITE + "#website", name: "Оператор ТЛФ", url: SITE, inLanguage: "ru",
    description: "Информационно-справочный материал для самоподготовки операторов производства твёрдых лекарственных форм.", author: person() };
  const graph = [website];
  if (m.article) {
    graph.push({ "@type": "Article", headline: m.lesson ? m.lesson.title : m.title.split(" | ")[0], description: m.description, inLanguage: "ru",
      url, mainEntityOfPage: url, author: person(), isPartOf: { "@id": SITE + "#website" }, dateModified: TODAY, image: SITE + "assets/og.png" });
  }
  return '<script type="application/ld+json">' + JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c") + "</script>";
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
<meta name="theme-color" content="#0e6a5d">
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
<script src="${rootRel}assets/app.js" defer></script>
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
:root{--bg:#edf1f0;--fg:#142220;--muted:#55625f;--accent:#0e6a5d;--surface:#fff;--line:#c9d3d1}
@media (prefers-color-scheme:dark){:root{--bg:#0e1514;--fg:#e3ebe9;--muted:#98a7a4;--accent:#5cc4b1;--surface:#162120;--line:#2b3a38;color-scheme:dark}}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}
main{max-width:620px;margin:0 auto;padding:64px 16px;display:grid;gap:16px}
.mark{width:56px;height:56px;border-radius:50%;background:var(--accent);position:relative}
.mark:after{content:"";position:absolute;left:25px;top:0;width:6px;height:56px;background:var(--bg)}
h1{margin:0;font-size:1.8rem;line-height:1.2}
p{margin:0;color:var(--muted)}
nav{display:flex;flex-wrap:wrap;gap:10px}
a{color:var(--accent);font-weight:600}
nav a{display:inline-block;padding:10px 16px;border:1px solid var(--line);border-radius:8px;background:var(--surface);text-decoration:none}
</style>
</head>
<body>
<main>
<div class="mark" aria-hidden="true"></div>
<h1>Страница не найдена</h1>
<p>Возможно, адрес набран с ошибкой или страница была перемещена. Ссылки ниже ведут на основные разделы.</p>
<nav aria-label="Разделы">
<a href="${SITE}">Главная</a><a href="${SITE}uroki/">Уроки</a><a href="${SITE}granulyaciya/">Грануляция ТЛФ</a><a href="${SITE}testy.html">Тесты</a><a href="${SITE}glossarij.html">Глоссарий</a>
</nav>
<p>${esc(APP.DISCLAIMER)}</p>
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
  const js = ["data.js", "data-gran.js", "app.js"].map(f => {
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
    .replace('<script src="app.js"></script>', () => "<script>\n" + js[2] + "</script>");
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
write(path.join(OUT, "assets/style.css"), fontsCss.replace(/url\(([^)]+\.woff2)\)/g, "url(fonts/$1)") + "\n" + css);
for (const f of ["data.js", "data-gran.js", "app.js", "favicon.svg"]) fs.copyFileSync(path.join(SRC, f), path.join(OUT, "assets", f));
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

const aio = allInOne();
write(path.join(OUT, "all-in-one.html"), aio);
write(path.join(DIST, "artifact.html"), artifactVersion(aio));

const c = APP.counts();
console.log(`Готово: ${routes.length} страниц + 404, ${c.lessons} уроков (${c.base} + ${c.gran}), ${c.questions} вопросов (модуль грануляции: ${c.gran_q}), ${c.glossary} терминов.`);
console.log(`all-in-one.html: ${(Buffer.byteLength(aio) / 1024).toFixed(0)} КБ`);
