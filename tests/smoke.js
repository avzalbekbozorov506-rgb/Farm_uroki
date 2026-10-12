#!/usr/bin/env node
/* Браузерная проверка собранного сайта: каждая страница открывается без ошибок JS
   и без 404 на ресурсах; работают ответы на вопросы, схемы, тема, поиск глоссария.
   Запуск: npx playwright@1 install chromium (один раз), затем node tests/smoke.js */
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = path.join(__dirname, "..");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css",
  ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".txt": "text/plain", ".xml": "application/xml" };

function serve() {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (p.endsWith("/")) p += "index.html";
    const file = path.join(ROOT, path.normalize(p));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404, { "Content-Type": TYPES[".html"] });
      return res.end(fs.readFileSync(path.join(ROOT, "404.html")));
    }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
    res.end(fs.readFileSync(file));
  });
  return new Promise(r => server.listen(0, "127.0.0.1", () => r(server)));
}

function pages() {
  const list = [];
  for (const dir of ["", "uroki", "granulyaciya"])
    for (const f of fs.readdirSync(path.join(ROOT, dir)))
      if (f.endsWith(".html") && f !== "all-in-one.html" && f !== "404.html") list.push(dir ? dir + "/" + f : f);
  return list;
}

(async () => {
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}/`;
  const opts = {};
  if (process.env.CHROMIUM_PATH) opts.executablePath = process.env.CHROMIUM_PATH;
  const browser = await chromium.launch(opts);
  const errors = [];
  const check = async (url, width, fn) => {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await ctx.newPage();
    const where = `${url} @${width}`;
    page.on("pageerror", e => errors.push(`${where}: JS ${e.message}`));
    page.on("console", m => { if (m.type() === "error" && !(url.startsWith("no-such-page") && /404/.test(m.text()))) errors.push(`${where}: console ${m.text()}`); });
    const expect404 = url.startsWith("no-such-page");
    page.on("response", r => { if (r.status() >= 400 && !(expect404 && r.url() === base + url) && !r.url().endsWith("favicon.ico")) errors.push(`${where}: HTTP ${r.status()} ${r.url()}`); });
    await page.goto(base + url, { waitUntil: "load" });
    await page.waitForTimeout(150);
    const h1 = await page.locator("h1").count();
    if (!h1) errors.push(`${where}: нет <h1>`);
    if (fn) { try { await fn(page); } catch (e) { errors.push(`${where}: ${e.message.split("\n")[0]}`); } }
    await ctx.close();
  };

  const list = pages();
  for (const url of list) for (const w of [390, 1280]) await check(url, w);
  await check("all-in-one.html", 1280);
  await check("no-such-page.html", 390);

  // Интерактив: вопрос урока (выбор варианта и «Проверить»)
  await check("uroki/tabletirovanie.html", 390, async page => {
    await page.locator('[data-act="opt"]').first().click();
    const btn = page.locator('[data-act="check"]').first();
    await btn.click();
    await page.waitForTimeout(300);
    if (!(await page.locator('[data-act="opt"][disabled]').count())) throw new Error("после «Проверить» вопрос не закрылся");
  });
  // Ссылка «Тест по уроку» (testy.html#test-…) открывает сам тест
  await check("testy.html#test-docs", 390, async page => {
    if (!(await page.locator('[data-act="opt"]').count())) throw new Error("тест по ссылке testy.html#test-docs не открылся");
  });
  // Интерактив: каждая схема листается вперёд и назад, подпись стадии меняется
  const schemePages = list.filter(u => fs.readFileSync(path.join(ROOT, u), "utf8").includes("<figure class=\"scheme"));
  if (schemePages.length < 6) errors.push(`страниц со схемами ${schemePages.length}, ожидалось не меньше 6`);
  for (const url of schemePages) await check(url, 390, async page => {
    const fig = page.locator("figure.scheme").first();
    await fig.scrollIntoViewIfNeeded();
    if (!(await fig.locator("svg title").count())) throw new Error("у схемы нет <title>");
    const label = fig.locator(".sc-label");
    const l0 = await label.textContent();
    await fig.locator('[data-sc="next"]').click();
    await page.waitForTimeout(200);
    const l1 = await label.textContent();
    if (l0 === l1) throw new Error("кнопка «вперёд» не меняет стадию");
    await fig.locator('[data-sc="next"]').click();
    await fig.locator('[data-sc="prev"]').click();
    await page.waitForTimeout(200);
    if ((await label.textContent()) !== l1) throw new Error("кнопка «назад» не возвращает стадию");
    await fig.locator('[data-sc="play"]').first().click();
    await page.waitForTimeout(400);
    await fig.locator('[data-sc="play"]').first().click();
  });
  await check("index.html", 1280, async page => {
    const before = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
    await page.locator('[data-act="theme"]').first().click();
    await page.waitForTimeout(600); // смена темы идёт через View Transition
    const after = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
    if (before === after) throw new Error("переключатель темы не меняет тему");
  });
  await check("glossarij.html", 1280, async page => {
    const input = page.locator('input[type="search"], input[type="text"]').first();
    await input.fill("грануля");
    await page.waitForTimeout(200);
  });

  await browser.close();
  server.close();
  console.log(`Проверено страниц: ${list.length + 2} (телефон и ПК), схем: ${schemePages.length}`);
  if (errors.length) { console.error(`Ошибок: ${errors.length}\n` + errors.join("\n")); process.exit(1); }
  console.log("Ошибок нет");
})().catch(e => { console.error(e); process.exit(1); });
