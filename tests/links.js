#!/usr/bin/env node
/* Проверка собранного сайта без браузера: внутренние ссылки и якоря ведут на существующие
   файлы и id, в каждой странице есть title, description, canonical и корректный JSON-LD,
   в sitemap.xml нет адресов без файла. Запуск: node tests/links.js */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SITE = "https://avzalbekbozorov506-rgb.github.io/Farm_uroki/";
const errors = [];
const files = [];
for (const dir of ["", "uroki", "granulyaciya"])
  for (const f of fs.readdirSync(path.join(ROOT, dir)))
    if (f.endsWith(".html") && f !== "all-in-one.html") files.push(dir ? dir + "/" + f : f);

const ids = {};
const html = {};
for (const f of files) {
  html[f] = fs.readFileSync(path.join(ROOT, f), "utf8");
  ids[f] = new Set([...html[f].matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
}

let links = 0;
for (const f of files) {
  const s = html[f];
  const seen = new Set();
  for (const id of s.matchAll(/\sid="([^"]+)"/g)) {
    if (seen.has(id[1])) errors.push(`${f}: повтор id="${id[1]}"`);
    seen.add(id[1]);
  }
  for (const m of s.matchAll(/\s(?:href|src)="([^"]*)"/g)) {
    const url = m[1];
    if (!url || /^(https?:|mailto:|tel:|data:|javascript:)/.test(url)) continue;
    links++;
    const [p0, hash] = url.split("#");
    const p = p0.split("?")[0];
    let target = p ? path.posix.normalize(path.posix.join(path.posix.dirname(f), p)) : f;
    if (target.endsWith("/") || target === ".") target = (target === "." ? "" : target) + "index.html";
    if (!fs.existsSync(path.join(ROOT, target))) { errors.push(`${f}: нет файла для ссылки ${url}`); continue; }
    // testy.html#test-… — маршрут теста, его открывает app.js (проверяется в tests/smoke.js)
    if (hash && !(target === "testy.html" && hash.startsWith("test-")) && target.endsWith(".html") && ids[target] && !ids[target].has(decodeURIComponent(hash)))
      errors.push(`${f}: нет якоря #${hash} в ${target}`);
  }
  if (f === "404.html") continue;
  for (const [name, re] of [["title", /<title>[^<]+<\/title>/], ["description", /<meta name="description" content="[^"]+"/],
                            ["canonical", /<link rel="canonical" href="[^"]+"/]])
    if (!re.test(s)) errors.push(`${f}: нет ${name}`);
  const canon = (s.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
  if (canon && !canon.startsWith(SITE)) errors.push(`${f}: canonical не на сайт: ${canon}`);
  for (const j of s.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(j[1]); } catch (e) { errors.push(`${f}: неверный JSON-LD (${e.message})`); }
  }
}

const sitemap = fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8");
const locs = [...sitemap.matchAll(/<loc>\s*(.*?)\s*<\/loc>/g)].map(m => m[1]);
for (const u of locs) {
  if (!u.startsWith(SITE)) { errors.push(`sitemap.xml: чужой адрес ${u}`); continue; }
  let p = u.slice(SITE.length);
  if (!p || p.endsWith("/")) p += "index.html";
  if (!fs.existsSync(path.join(ROOT, p))) errors.push(`sitemap.xml: нет файла для ${u}`);
}

console.log(`Страниц: ${files.length}, внутренних ссылок: ${links}, адресов в sitemap: ${locs.length}`);
if (errors.length) { console.error(`Ошибок: ${errors.length}\n` + errors.join("\n")); process.exit(1); }
console.log("Ошибок нет");
