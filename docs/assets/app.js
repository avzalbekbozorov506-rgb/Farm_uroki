/* Оператор ТЛФ — общий код страниц.
   Работает в трёх режимах:
   - spa:  один файл (all-in-one.html), навигация через #маршрут;
   - mpa:  многостраничный сайт, у каждой страницы свой маршрут (body[data-route]);
   - node: сборка статических страниц (build.js вызывает TLF_APP.page()). */
(function (root) {
  "use strict";

  var IS_NODE = typeof document === "undefined";
  var W = IS_NODE ? root : window;
  var D = W.TLF_DATA;
  var G = W.TLF_GRAN;

  var SITE_URL = "https://avzalbekbozorov506-rgb.github.io/Farm_uroki/";
  var KEY = "tlf-trainer-v1";
  var DISCLAIMER = "Информационно-справочный материал для самоподготовки. Не является официальным учебным пособием и не заменяет СОП предприятия и инструктаж.";
  var MEDICAL = "Сайт посвящён производству, а не лечению. Не используйте материалы для назначения или приёма лекарств.";
  var AUTHOR_NAME = "Бозоров Авзалбек Сайфуллоевич";
  var AUTHOR_JOB = "оператор производства 3 разряда";
  var PASS = 80; // ориентир для самопроверки, не норматив
  var EXAM_SIZE = 40;

  /* ---------- Режим ---------- */
  var MODE = "node", ROOT = "", FIXED = null;
  if (!IS_NODE) {
    FIXED = document.body.getAttribute("data-route");
    ROOT = document.body.getAttribute("data-root") || "";
    MODE = FIXED ? "mpa" : "spa";
  }

  /* ---------- Хранилище ---------- */
  function loadState() {
    var base = { done: {}, opened: {}, tests: {}, fav: {}, known: {}, wrong: {}, last: null, theme: null };
    if (IS_NODE) return base;
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var o = JSON.parse(raw);
        if (o && typeof o === "object") {
          Object.keys(base).forEach(function (k) { if (o[k] !== undefined && o[k] !== null) base[k] = o[k]; });
        }
      }
    } catch (e) { /* хранилище недоступно — работаем в памяти */ }
    return base;
  }
  var S = loadState();
  function save() {
    if (IS_NODE) return;
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* игнорируем */ }
  }
  function clearState() {
    try { localStorage.removeItem(KEY); } catch (e) { /* игнорируем */ }
    var fresh = loadState();
    Object.keys(S).forEach(function (k) { delete S[k]; });
    Object.keys(fresh).forEach(function (k) { S[k] = fresh[k]; });
  }

  /* ---------- Утилиты ---------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function range(n) { var r = []; for (var i = 0; i < n; i++) r.push(i); return r; }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function plural(n, one, few, many) {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  }
  function qWord(n) { return n + " " + plural(n, "вопрос", "вопроса", "вопросов"); }

  /* ---------- Данные ---------- */
  var BASE_SLUGS = {
    gmp: "osnovy-gmp", personnel: "personal-gigiena", docs: "dokumentaciya-alcoa", weighing: "vzveshivanie-syrya",
    mixing: "prosevanie-smeshivanie", granulation: "granulirovanie-sushka", tableting: "tabletirovanie",
    coating: "nanesenie-obolochki", capsules: "inkapsulirovanie", packaging: "pervichnaya-upakovka",
    ipc: "vnutriprocessnyj-kontrol", cleaning: "uborka-smena-serii", deviations: "otkloneniya-capa", safety: "ohrana-truda"
  };
  var BASE = D.lessons, GRAN = G.lessons;
  var LESSONS = BASE.concat(GRAN);
  var LMAP = {}, BANK = [], QMAP = {};
  BASE.forEach(function (l, i) { l.module = "base"; l.num = i + 1; l.slug = l.slug || BASE_SLUGS[l.id]; });
  GRAN.forEach(function (l, i) { l.module = "gran"; l.num = i + 1; });
  LESSONS.forEach(function (l) {
    LMAP[l.id] = l;
    l.qs = l.questions.map(function (q, qi) {
      var n = { id: l.id + "-" + (qi + 1), lesson: l.id, module: l.module, type: q.type, q: q.q, explain: q.explain };
      if (q.type === "tf") { n.options = ["Верно", "Неверно"]; n.correct = [q.answer ? 0 : 1]; }
      else { n.options = q.options; n.correct = q.type === "multi" ? q.answer.slice() : [q.answer]; }
      BANK.push(n); QMAP[n.id] = n;
      return n;
    });
  });
  var BANK_BASE = BANK.filter(function (q) { return q.module === "base"; });
  var BANK_GRAN = BANK.filter(function (q) { return q.module === "gran"; });
  var GLOSSARY = D.glossary.concat(G.glossary);
  var TYPE_LABEL = { single: "Один ответ", multi: "Несколько ответов", tf: "Верно / неверно" };

  /* ---------- Маршруты и ссылки ---------- */
  var PAGES = { home: "index.html", lessons: "uroki/index.html", gran: "granulyaciya/index.html", tests: "testy.html",
    cards: "kartochki.html", glossary: "glossarij.html", sheet: "shpargalka.html", author: "avtor.html", privacy: "privacy.html" };
  function pathFor(route) {
    if (PAGES[route]) return PAGES[route];
    if (route.indexOf("lesson-") === 0) {
      var l = LMAP[route.slice(7)];
      if (l) return (l.module === "gran" ? "granulyaciya/" : "uroki/") + l.slug + ".html";
    }
    if (route === "test-gran-final") return "granulyaciya/itogovyj-test.html";
    if (route.indexOf("test-") === 0) return "testy.html#" + route;
    return "index.html";
  }
  function link(route) { return MODE === "spa" ? "#" + route : ROOT + pathFor(route); }
  function publicUrl(route) {
    var p = pathFor(route);
    return SITE_URL + p.replace(/(^|\/)index\.html$/, "$1");
  }
  function sectionOf(route) {
    if (route.indexOf("lesson-") === 0) return LMAP[route.slice(7)] && LMAP[route.slice(7)].module === "gran" ? "gran" : "lessons";
    if (route === "test-gran-final") return "gran";
    if (route.indexOf("test-") === 0) return "tests";
    return route;
  }

  /* ---------- Вопросы ---------- */
  function isCorrect(q, sel) {
    if (sel.length !== q.correct.length) return false;
    for (var i = 0; i < sel.length; i++) if (q.correct.indexOf(sel[i]) === -1) return false;
    return true;
  }
  var QS = {};
  function makeQState(key, q, keepOrder) {
    QS[key] = { key: key, q: q, order: (q.type === "tf" || keepOrder) ? range(q.options.length) : shuffle(range(q.options.length)), sel: [], checked: false, ok: null };
    return QS[key];
  }
  function questionHTML(st, opts) {
    opts = opts || {};
    var q = st.q;
    var h = '<div class="q" data-qkey="' + esc(st.key) + '">';
    h += '<div class="q-meta"><span class="q-type">' + TYPE_LABEL[q.type] + "</span>";
    if (opts.lessonTag) h += '<span class="chip idle">' + esc(LMAP[q.lesson].title) + "</span>";
    h += '</div><p class="q-text">' + esc(q.q) + '</p><div class="opts" role="group" aria-label="Варианты ответа">';
    st.order.forEach(function (oi) {
      var cls = "opt" + (q.type === "multi" ? " multi" : "");
      var sel = st.sel.indexOf(oi) !== -1;
      if (st.checked) {
        if (q.correct.indexOf(oi) !== -1) cls += " right";
        else if (sel) cls += " wrong";
      } else if (sel) cls += " sel";
      h += '<button type="button" class="' + cls + '" data-act="opt" data-qkey="' + esc(st.key) + '" data-opt="' + oi + '" aria-pressed="' + sel + '"' + (st.checked ? " disabled" : "") + '><span class="mk" aria-hidden="true"></span><span>' + esc(q.options[oi]) + "</span></button>";
    });
    h += "</div>";
    if (!st.checked) {
      h += '<div class="row"><button type="button" class="btn primary small" data-act="check" data-qkey="' + esc(st.key) + '"' + (st.sel.length ? "" : " disabled") + ">Проверить</button></div>";
    } else {
      h += '<div class="explain ' + (st.ok ? "ok" : "bad") + '" role="status"><b>' + (st.ok ? "Верно" : "Неверно") + "</b><span>" + esc(q.explain) + "</span></div>";
      if (opts.after) h += opts.after;
    }
    return h + "</div>";
  }
  function selectOpt(st, oi) {
    if (st.checked) return;
    if (st.q.type === "multi") {
      var i = st.sel.indexOf(oi);
      if (i === -1) st.sel.push(oi); else st.sel.splice(i, 1);
    } else st.sel = [oi];
  }
  function checkQ(st) {
    if (st.checked || !st.sel.length) return;
    st.checked = true;
    st.ok = isCorrect(st.q, st.sel);
    if (st.ok) delete S.wrong[st.q.id]; else S.wrong[st.q.id] = 1;
    save();
  }

  /* ---------- Прогресс ---------- */
  function doneIn(list) { return list.filter(function (l) { return S.done[l.id]; }).length; }
  function nextLesson() {
    if (S.last && LMAP[S.last] && !S.done[S.last]) return LMAP[S.last];
    for (var i = 0; i < LESSONS.length; i++) if (!S.done[LESSONS[i].id]) return LESSONS[i];
    return null;
  }
  function lessonChip(l) {
    if (S.done[l.id]) return '<span class="chip ok">Пройден</span>';
    if (S.opened[l.id]) return '<span class="chip warn">В работе</span>';
    return '<span class="chip idle">Не начат</span>';
  }
  function knownCount() { return GLOSSARY.filter(function (g) { return S.known[g.term] === 1; }).length; }
  function wrongIds() { return Object.keys(S.wrong).filter(function (id) { return QMAP[id]; }); }
  function moduleLabel(l) { return l.module === "gran" ? "Грануляция · урок " + pad(l.num) : "Урок " + pad(l.num); }

  /* ---------- Оболочка страницы ---------- */
  var ICONS = {
    home: '<path d="M4 11 12 4l8 7v9h-5v-6H9v6H4z"/>',
    lessons: '<path d="M5 4h10l4 4v12H5zM14 4v5h5M8 13h8M8 17h6"/>',
    gran: '<circle cx="8" cy="9" r="3"/><circle cx="16" cy="8" r="2.4"/><circle cx="12" cy="16" r="3.4"/><circle cx="18.5" cy="15" r="1.6"/>',
    tests: '<path d="M9 5h10M9 12h10M9 19h10M4 5l1 1 2-2M4 12l1 1 2-2M4 19l1 1 2-2"/>',
    cards: '<path d="M7 7h12v12H7zM5 17V5h12"/>',
    glossary: '<path d="M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14zM16 16l4 4"/>',
    sheet: '<path d="M6 3h12v18H6zM9 8h6M9 12h6M9 16h3"/>'
  };
  var NAV = [["home", "Главная"], ["lessons", "Уроки"], ["gran", "Грануляция"], ["tests", "Тесты"], ["cards", "Карточки"], ["glossary", "Глоссарий"], ["sheet", "Шпаргалка"]];

  function headerHTML() {
    return '<a class="skip" href="#view">К содержанию</a><header class="top">' +
      '<a class="brand" href="' + link("home") + '" aria-label="Оператор ТЛФ, на главную"><span class="brand-mark" aria-hidden="true"></span>' +
      '<span class="brand-text"><b>Оператор ТЛФ</b><small>таблетки · капсулы · гранулы · порошки</small></span></a>' +
      '<div class="top-actions"><button class="icon-btn" type="button" data-act="share" aria-label="Поделиться ссылкой" title="Поделиться">' +
      '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M12 3v12M7 8l5-5 5 5M5 13v6h14v-6"/></svg></button>' +
      '<button class="icon-btn" type="button" data-act="theme" aria-label="Переключить тему" title="Светлая / тёмная тема">' +
      '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9z"/></svg></button></div></header>';
  }
  function navHTML(section) {
    var h = '<nav class="nav" aria-label="Разделы">';
    NAV.forEach(function (n) {
      var on = n[0] === section;
      h += '<a href="' + link(n[0]) + '" data-nav="' + n[0] + '"' + (n[0] === "sheet" ? ' class="nav-extra' + (on ? " active" : "") + '"' : (on ? ' class="active"' : "")) + (on ? ' aria-current="page"' : "") +
        '><svg viewBox="0 0 24 24" aria-hidden="true">' + ICONS[n[0]] + "</svg><span>" + n[1] + "</span></a>";
    });
    return h + "</nav>";
  }
  function footerHTML() {
    return '<footer class="foot"><div class="foot-in">' +
      "<p><strong>" + DISCLAIMER + "</strong></p>" +
      "<p>" + MEDICAL + "</p>" +
      '<p>Автор: ' + AUTHOR_NAME + ", " + AUTHOR_JOB + ".</p>" +
      '<nav class="foot-links" aria-label="Служебные страницы"><a href="' + link("author") + '">Об авторе</a><a href="' + link("privacy") + '">Конфиденциальность</a><a href="' + link("glossary") + '">Глоссарий</a><a href="' + link("sheet") + '">Шпаргалка</a>' +
      (MODE === "spa" ? "" : '<a href="' + ROOT + 'all-in-one.html">Офлайн-версия одним файлом</a>') + "</nav>" +
      '<p class="foot-src">Источники: Решение Совета ЕЭК от 03.11.2016 № 77 (Правила надлежащей производственной практики ЕАЭС); Федеральный закон от 12.04.2010 № 61-ФЗ «Об обращении лекарственных средств»; Государственная фармакопея Российской Федерации. Текст изложен своими словами и не является официальным изданием этих документов.</p>' +
      "</div></footer>";
  }
  function crumbs(items) {
    var h = '<nav class="crumbs" aria-label="Хлебные крошки"><ol>';
    items.forEach(function (it, i) {
      h += "<li>" + (i < items.length - 1 ? '<a href="' + link(it[0]) + '">' + esc(it[1]) + "</a>" : '<span aria-current="page">' + esc(it[1]) + "</span>") + "</li>";
    });
    return h + "</ol></nav>";
  }

  /* ---------- Экраны ---------- */
  function progressBlock(title, list, route) {
    var dc = doneIn(list), pct = Math.round(dc / list.length * 100);
    return '<div class="pmini"><div class="row" style="justify-content:space-between"><a href="' + link(route) + '"><b>' + title + '</b></a><span class="muted num">' + dc + " / " + list.length + "</span></div>" +
      '<div class="bar" role="progressbar" aria-label="' + esc(title) + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><i style="width:' + pct + '%"></i></div></div>';
  }

  function viewHome() {
    var dc = doneIn(LESSONS), total = LESSONS.length, pct = Math.round(dc / total * 100);
    var nl = nextLesson();
    var exam = S.tests.exam;
    var h = '<div class="view-inner">';
    h += '<section class="hero"><span class="eyebrow">Информационно-справочный материал для самоподготовки</span>';
    h += "<h1>Производство твёрдых лекарственных форм</h1>";
    h += '<p class="lead">Уроки по GMP и технологическим операциям для операторов участков взвешивания, грануляции, таблетирования, покрытия, инкапсулирования и упаковки. ' + BASE.length + " основных уроков и углублённый модуль «" + G.title + "» из " + GRAN.length + " уроков.</p></section>";

    h += '<section class="panel lifted progress-card" aria-label="Ваш прогресс">';
    h += '<div class="progress-top"><div><span class="eyebrow">Ваш прогресс</span><div class="big num">' + pct + "<small>%</small></div></div>";
    h += '<p class="muted num">' + dc + " из " + total + " уроков отмечено</p></div>";
    h += progressBlock("Основные уроки", BASE, "lessons") + progressBlock("Грануляция ТЛФ", GRAN, "gran");
    h += '<div class="cta">';
    if (nl) h += '<a class="btn primary" href="' + link("lesson-" + nl.id) + '">Продолжить</a>';
    else h += '<a class="btn primary" href="' + link("test-exam") + '">Итоговый тест</a>';
    h += '<a class="btn" href="' + link("tests") + '">Тест</a><a class="btn" href="' + link("cards") + '">Карточки</a></div>';
    if (nl) h += '<p class="muted">Следующий: ' + moduleLabel(nl) + " — " + esc(nl.title) + "</p>";
    h += "</section>";

    h += '<section class="stats" aria-label="Статистика">';
    h += '<div class="stat"><b>' + (exam ? exam.best + "%" : "—") + "</b><span>лучший результат итогового теста</span></div>";
    h += '<div class="stat"><b>' + knownCount() + "/" + GLOSSARY.length + "</b><span>терминов отмечено «знаю»</span></div>";
    var w = wrongIds().length;
    h += '<div class="stat"><b>' + w + "</b><span>" + plural(w, "вопрос", "вопроса", "вопросов") + " в работе над ошибками</span></div>";
    h += "</section>";

    h += '<a class="feature-link" href="' + link("gran") + '"><span class="eyebrow">Углублённый модуль</span><b>' + G.title + "</b><span>" + esc(G.short) + "</span></a>";

    h += '<section class="stack"><div class="row" style="justify-content:space-between"><h2>Основные уроки</h2><a href="' + link("lessons") + '">Все уроки</a></div>';
    h += modulesHTML(BASE) + "</section>";
    h += '<p class="note">' + DISCLAIMER + "</p>";
    h += '<p class="note med">' + MEDICAL + "</p>";
    return h + "</div>";
  }

  function modulesHTML(list) {
    var h = '<div class="modules">';
    list.forEach(function (l) {
      h += '<a class="module" href="' + link("lesson-" + l.id) + '"><span class="idx">' + pad(l.num) + '</span><span class="t"><b>' + esc(l.title) + "</b><span>" + esc(l.short) + "</span></span>" + lessonChip(l) + "</a>";
    });
    return h + "</div>";
  }

  function viewLessons() {
    var h = '<div class="view-inner">' + crumbs([["home", "Главная"], ["lessons", "Уроки"]]);
    h += '<section class="hero"><span class="eyebrow">Уроки</span><h1>Основные уроки</h1>';
    h += '<p class="lead">Уроки идут в порядке технологического процесса: от правил и допуска в зону до упаковки, контроля и действий при отклонениях. Отмечено ' + doneIn(BASE) + " из " + BASE.length + ".</p></section>";
    h += modulesHTML(BASE);
    h += '<a class="feature-link" href="' + link("gran") + '"><span class="eyebrow">Дальше</span><b>Углублённый модуль «' + G.title + "»</b><span>" + GRAN.length + " уроков и итоговый тест модуля.</span></a>";
    return h + "</div>";
  }

  function viewGran() {
    var h = '<div class="view-inner">' + crumbs([["home", "Главная"], ["gran", G.title]]);
    h += '<section class="hero"><span class="eyebrow">Углублённый модуль</span><h1>' + G.title + "</h1>";
    h += '<p class="lead">' + esc(G.short) + " Отмечено " + doneIn(GRAN) + " из " + GRAN.length + ". Конкретные режимы (температуры, время, давление, влажность, пределы) задаёт регламент: см. СОП и Государственную фармакопею РФ.</p></section>";
    h += modulesHTML(GRAN);
    var r = S.tests["gran-final"];
    h += '<section class="panel stack"><div class="row" style="justify-content:space-between"><div class="stack" style="gap:4px"><h2>Итоговый тест модуля</h2><p class="muted">' + G.finalSize + " случайных вопросов из " + BANK_GRAN.length + " по всем урокам модуля.</p></div>" + scoreChip("gran-final") + "</div>";
    h += '<div class="row"><a class="btn primary" href="' + link("test-gran-final") + '">' + (r ? "Пройти ещё раз" : "Начать итоговый тест") + '</a><a class="btn" href="' + link("glossary") + '">Термины модуля в глоссарии</a></div></section>';
    return h + "</div>";
  }

  function listBlock(tag, cls, title, items, ordered) {
    var h = '<section class="panel"><div class="section-title"><span class="tag ' + tag + '">' + title + "</span></div><" + (ordered ? "ol" : "ul") + ' class="' + cls + '">';
    items.forEach(function (r) { h += "<li>" + esc(r) + "</li>"; });
    return h + "</" + (ordered ? "ol" : "ul") + "></section>";
  }

  function viewLesson(id) {
    var l = LMAP[id];
    if (!l) return viewNotFound();
    if (!IS_NODE && (!S.opened[id] || S.last !== id)) { S.opened[id] = 1; S.last = id; save(); }
    var list = l.module === "gran" ? GRAN : BASE;
    var prev = list[l.num - 2], next = list[l.num];
    var h = '<article class="view-inner">';
    h += crumbs(l.module === "gran" ? [["home", "Главная"], ["gran", G.title], ["lesson-" + id, l.title]] : [["home", "Главная"], ["lessons", "Уроки"], ["lesson-" + id, l.title]]);
    h += '<header class="lesson-head"><div class="row">' + lessonChip(l) + '<span class="eyebrow">' + moduleLabel(l) + " из " + list.length + "</span></div>";
    h += "<h1>" + esc(l.title) + '</h1><p class="lead">' + esc(l.short) + "</p></header>";

    if (l.goals) h += listBlock("goals", "goallist", "Цели урока", l.goals);

    h += '<section class="panel"><div class="section-title"><span class="tag theory">Теория</span></div><div class="prose">';
    l.theory.forEach(function (p) { h += "<p>" + esc(p) + "</p>"; });
    h += "</div>";
    if (l.stages) {
      h += '<ol class="stages">';
      l.stages.forEach(function (s) { h += "<li><b>" + esc(s.t) + "</b><span>" + esc(s.d) + "</span></li>"; });
      h += "</ol>";
    }
    if (l.theory2) { h += '<div class="prose">'; l.theory2.forEach(function (p) { h += "<p>" + esc(p) + "</p>"; }); h += "</div>"; }
    h += "</section>";

    if (l.table) {
      h += '<section class="panel"><div class="section-title"><span class="tag theory">' + esc(l.table.caption) + '</span></div><div class="tbl-wrap"><table class="tbl"><thead><tr>';
      l.table.head.forEach(function (c) { h += '<th scope="col">' + esc(c) + "</th>"; });
      h += "</tr></thead><tbody>";
      l.table.rows.forEach(function (r) { h += "<tr>" + r.map(function (c, i) { return (i === 0 ? '<th scope="row">' : '<td data-label="' + esc(l.table.head[i]) + '">') + esc(c) + (i === 0 ? "</th>" : "</td>"); }).join("") + "</tr>"; });
      h += "</tbody></table></div></section>";
    }
    if (l.examples) {
      h += '<section class="panel"><div class="section-title"><span class="tag theory">Учебные примеры</span><span class="muted">числа условные</span></div><div class="examples">';
      l.examples.forEach(function (ex) {
        h += '<div class="example"><h3>' + esc(ex.title) + "</h3><ul>" + ex.lines.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div>";
      });
      h += "</div></section>";
    }

    h += '<div class="two">' + listBlock("rules", "checklist", l.theses ? "Ключевые тезисы" : "Ключевые правила", l.theses || l.rules) +
      listBlock("errs", "errlist", "Типичные ошибки", l.errors) + "</div>";

    if (id === "granulation") {
      h += '<a class="feature-link" href="' + link("gran") + '"><span class="eyebrow">Подробнее</span><b>Углублённый модуль «' + G.title + '»</b><span>' + GRAN.length + " отдельных уроков: стадии, оборудование, контроль, дефекты, расчёты, безопасность.</span></a>";
    }

    h += '<section class="panel"><div class="section-title"><span class="tag check">Самопроверка</span><span class="muted">' + qWord(l.qs.length) + "</span></div>";
    l.qs.forEach(function (q) {
      var key = "l-" + q.id;
      h += questionHTML(QS[key] || makeQState(key, q, IS_NODE));
    });
    h += "</section>";

    h += '<section class="panel stack"><div class="row" style="justify-content:space-between">';
    h += "<p>" + (S.done[id] ? "Урок отмечен как пройденный." : "Прочитали теорию и ответили на вопросы? Отметьте урок.") + "</p>";
    h += '<button type="button" class="btn ' + (S.done[id] ? "" : "primary") + '" data-act="toggle-done" data-id="' + id + '">' + (S.done[id] ? "Снять отметку" : "Отметить урок пройденным") + "</button></div>";
    h += '<div class="row"><a class="btn small" href="' + link("test-" + id) + '">Тест по уроку (' + qWord(l.qs.length) + ")</a></div></section>";

    h += '<nav class="lesson-nav" aria-label="Соседние уроки">';
    h += prev ? '<a class="btn ghost" rel="prev" href="' + link("lesson-" + prev.id) + '">← ' + esc(prev.title) + "</a>" : "<span></span>";
    if (next) h += '<a class="btn ghost" rel="next" href="' + link("lesson-" + next.id) + '">' + esc(next.title) + " →</a>";
    else h += l.module === "gran" ? '<a class="btn ghost" href="' + link("test-gran-final") + '">Итоговый тест модуля →</a>' : '<a class="btn ghost" href="' + link("gran") + '">Модуль «' + G.title + '» →</a>';
    return h + "</nav></article>";
  }

  /* ---------- Тесты ---------- */
  var T = null;

  function scoreChip(id) {
    var r = S.tests[id];
    if (!r) return '<span class="chip idle">Не пройден</span>';
    return '<span class="chip ' + (r.best >= PASS ? "ok" : "warn") + ' num">Лучший ' + r.best + "%</span>";
  }
  function testCard(id, title, desc, feature, eyebrow) {
    return '<div class="test-card' + (feature ? " feature" : "") + '"><div class="stack" style="gap:6px">' + (eyebrow ? '<span class="eyebrow">' + eyebrow + "</span>" : "") + "<h3>" + esc(title) + "</h3>" + (desc ? "<p>" + esc(desc) + "</p>" : "") + "</div>" +
      '<div class="row">' + (id === "mistakes" ? '<span class="chip bad">Ошибки</span>' : scoreChip(id)) + '<a class="btn small ' + (feature ? "primary" : "") + '" href="' + link("test-" + id) + '">Начать</a></div></div>';
  }
  function viewTests() {
    var h = '<div class="view-inner">' + crumbs([["home", "Главная"], ["tests", "Тесты"]]);
    h += '<section class="hero"><span class="eyebrow">Тесты</span><h1>Проверка знаний</h1>';
    h += '<p class="lead">' + BANK.length + " вопросов: один ответ, несколько ответов, верно или неверно. Вопросы и варианты перемешиваются, после каждого ответа показывается объяснение. Ориентир для самопроверки — " + PASS + "% (это не норматив и не оценка).</p></section>";
    h += '<div class="test-grid">';
    h += testCard("exam", "Итоговый тест", EXAM_SIZE + " случайных вопросов из основных уроков.", true);
    h += testCard("gran-final", "Итоговый тест: грануляция", G.finalSize + " случайных вопросов из модуля «" + G.title + "».", true);
    h += testCard("all", "Все вопросы основных уроков", BANK_BASE.length + " вопросов подряд.");
    var w = wrongIds().length;
    if (w) h += testCard("mistakes", "Работа над ошибками", qWord(w) + ", где был дан неверный ответ.");
    h += "</div><h2>Основные уроки</h2><div class=\"test-grid\">";
    BASE.forEach(function (l) { h += testCard(l.id, l.title, "", false, "Урок " + pad(l.num)); });
    h += "</div><h2>" + G.title + '</h2><div class="test-grid">';
    GRAN.forEach(function (l) { h += testCard(l.id, l.title, qWord(l.qs.length) + ".", false, "Урок " + pad(l.num)); });
    return h + "</div></div>";
  }

  function testTitle(id) {
    if (id === "exam") return "Итоговый тест";
    if (id === "gran-final") return "Итоговый тест: " + G.title;
    if (id === "all") return "Все вопросы основных уроков";
    if (id === "mistakes") return "Работа над ошибками";
    return LMAP[id] ? "Тест: " + LMAP[id].title : "Тест";
  }
  function startTest(id, ids, title) {
    var qs;
    if (ids) qs = ids.map(function (x) { return QMAP[x]; }).filter(Boolean);
    else if (id === "exam") qs = shuffle(BANK_BASE).slice(0, EXAM_SIZE);
    else if (id === "gran-final") qs = shuffle(BANK_GRAN).slice(0, G.finalSize);
    else if (id === "all") qs = BANK_BASE.slice();
    else if (id === "mistakes") qs = wrongIds().map(function (x) { return QMAP[x]; });
    else if (LMAP[id]) qs = LMAP[id].qs.slice();
    else return false;
    if (!qs.length) return false;
    T = { id: id, title: title || testTitle(id), i: 0, finished: false, saved: false,
      items: shuffle(qs).map(function (q, n) { return makeQState("t-" + n + "-" + q.id, q); }) };
    return true;
  }
  function testCrumbs(id) {
    if (id === "gran-final") return crumbs([["home", "Главная"], ["gran", G.title], ["test-gran-final", "Итоговый тест"]]);
    return crumbs([["home", "Главная"], ["tests", "Тесты"], ["test-" + id, T ? T.title : testTitle(id)]]);
  }
  function viewTestIntro(id) {
    var h = '<div class="view-inner">' + testCrumbs(id);
    h += '<section class="hero"><span class="eyebrow">Тест</span><h1>' + esc(testTitle(id)) + "</h1>";
    h += '<p class="lead">' + (id === "gran-final" ? G.finalSize + " случайных вопросов из " + BANK_GRAN.length + " по урокам модуля «" + G.title + "». Вопросы не требуют знания конкретных числовых пределов." : "Тест запускается в браузере.") + "</p></section>";
    if (id === "gran-final") {
      h += '<section class="panel"><h2 style="margin-bottom:10px">Темы теста</h2><ol class="plain-list">' + GRAN.map(function (l) { return '<li><a href="' + link("lesson-" + l.id) + '">' + esc(l.title) + "</a></li>"; }).join("") + "</ol></section>";
    }
    h += '<div class="row"><a class="btn primary" href="' + link("test-" + id) + '">Начать тест</a></div>';
    return h + "</div>";
  }
  function viewTest(id) {
    if (IS_NODE) return viewTestIntro(id);
    if (!T) {
      if (startTest(id)) T.route = "test-" + id;
      else return '<div class="view-inner">' + testCrumbs(id) + '<h1>Тест недоступен</h1><p class="lead">' + (id === "mistakes" ? "Ошибок для повторения пока нет." : "Для этого теста нет вопросов.") + ' <a href="' + link("tests") + '">Вернуться к тестам</a></p></div>';
    }
    return T.finished ? resultsHTML() : runnerHTML();
  }
  function runnerHTML() {
    var st = T.items[T.i], n = T.items.length;
    var answered = T.items.filter(function (x) { return x.checked; }).length;
    var correct = T.items.filter(function (x) { return x.ok; }).length;
    var h = '<div class="view-inner">' + testCrumbs(T.id);
    h += '<div class="runner-head"><h1 class="h-test">' + esc(T.title) + '</h1><div class="row"><span class="eyebrow num">Вопрос ' + (T.i + 1) + " из " + n + '</span><span class="muted num">Верно: ' + correct + " из " + answered + "</span></div>";
    h += '<div class="bar"><i style="width:' + Math.round(answered / n * 100) + '%"></i></div></div>';
    var after = '<div class="row"><button type="button" class="btn primary" data-act="next">' + (T.i + 1 < n ? "Следующий вопрос" : "Показать итог") + "</button></div>";
    var multi = T.id === "exam" || T.id === "all" || T.id === "mistakes" || T.id === "gran-final" || T.id === "retry";
    h += '<section class="panel lifted">' + questionHTML(st, { lessonTag: multi, after: after }) + "</section>";
    h += '<div class="row"><button type="button" class="btn ghost small" data-act="finish">Завершить досрочно</button></div>';
    return h + "</div>";
  }
  function finishTest() {
    T.finished = true;
    var right = T.items.filter(function (x) { return x.ok; }).length;
    var pct = Math.round(right / T.items.length * 100);
    T.result = { right: right, total: T.items.length, pct: pct };
    if (!T.saved && T.id !== "retry" && T.id !== "mistakes") {
      var prev = S.tests[T.id];
      S.tests[T.id] = { best: Math.max(pct, prev ? prev.best : 0), last: pct, date: Date.now() };
      T.saved = true;
      save();
    }
  }
  function resultsHTML() {
    var r = T.result;
    var wrong = T.items.filter(function (x) { return !x.ok; });
    var C = 2 * Math.PI * 46;
    var h = '<div class="view-inner">' + testCrumbs(T.id);
    h += '<section class="panel lifted result-score">';
    h += '<svg class="ring" viewBox="0 0 112 112" role="img" aria-label="Результат ' + r.pct + '%"><circle class="bg" cx="56" cy="56" r="46"/><circle class="fg" cx="56" cy="56" r="46" stroke-dasharray="' + (C * r.pct / 100).toFixed(1) + " " + C.toFixed(1) + '"/><text x="56" y="64" text-anchor="middle">' + r.pct + "%</text></svg>";
    h += '<div class="stack" style="gap:6px;min-width:0"><span class="chip ' + (r.pct >= PASS ? "ok" : "warn") + '">' + (r.pct >= PASS ? "Ориентир самопроверки достигнут" : "Стоит повторить") + "</span>";
    h += "<h1>" + esc(T.title) + '</h1><p class="muted num">Верных ответов: ' + r.right + " из " + r.total + "</p></div></section>";
    h += '<div class="row">';
    if (wrong.length) h += '<button type="button" class="btn primary" data-act="retry-wrong">Повторить только ошибки (' + wrong.length + ")</button>";
    h += '<button type="button" class="btn" data-act="restart">Пройти заново</button><a class="btn ghost" href="' + link("tests") + '">Все тесты</a></div>';
    if (wrong.length) {
      h += '<section class="panel"><h2 style="margin-bottom:14px">Разбор ошибок</h2>';
      wrong.forEach(function (st) {
        var q = st.q;
        h += '<div class="mistake"><a class="muted small-link" href="' + link("lesson-" + q.lesson) + '">' + esc(LMAP[q.lesson].title) + '</a><p class="q-text">' + esc(q.q) + "</p>";
        h += st.checked ? '<div><span class="lbl yours">Ваш ответ</span><ul>' + st.sel.map(function (i) { return "<li>" + esc(q.options[i]) + "</li>"; }).join("") + "</ul></div>" : '<div><span class="lbl yours">Без ответа</span></div>';
        h += '<div><span class="lbl right">Правильно</span><ul>' + q.correct.map(function (i) { return "<li>" + esc(q.options[i]) + "</li>"; }).join("") + "</ul></div>";
        h += "<p>" + esc(q.explain) + "</p></div>";
      });
      h += "</section>";
    } else h += '<p class="note">Ошибок нет. Для закрепления попробуйте итоговый тест или карточки.</p>';
    return h + "</div>";
  }

  /* ---------- Карточки ---------- */
  var FC = { mode: "all", dir: "term", deck: null, i: 0, flipped: false, stats: { yes: 0, no: 0 } };
  function buildDeck() {
    var list = GLOSSARY.filter(function (g) {
      if (FC.mode === "fav") return S.fav[g.term];
      if (FC.mode === "unknown") return S.known[g.term] !== 1;
      return true;
    });
    FC.deck = IS_NODE ? list : shuffle(list);
    FC.i = 0; FC.flipped = false; FC.stats = { yes: 0, no: 0 };
  }
  function starBtn(term, withLabel) {
    var on = !!S.fav[term];
    return '<button type="button" class="star" data-act="fav" data-term="' + esc(term) + '" aria-pressed="' + on + '" aria-label="' + (on ? "Убрать из избранного" : "В избранное") + ": " + esc(term) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg>' + (withLabel ? (on ? "В избранном" : "В избранное") : "") + "</button>";
  }
  function viewCards() {
    if (!FC.deck) buildDeck();
    var favN = GLOSSARY.filter(function (g) { return S.fav[g.term]; }).length;
    var unkN = GLOSSARY.length - knownCount();
    var h = '<div class="view-inner">' + crumbs([["home", "Главная"], ["cards", "Карточки"]]);
    h += '<section class="hero"><span class="eyebrow">Флеш-карточки</span><h1>Термины и определения</h1>';
    h += '<p class="lead">Нажмите на карточку, чтобы перевернуть. Отметьте «Знаю» или «Не знаю»: незнакомые термины соберутся в отдельную колоду. Знаю: ' + knownCount() + " из " + GLOSSARY.length + ".</p></section>";
    h += '<div class="fc-tools"><div class="seg" role="group" aria-label="Колода">';
    [["all", "Все · " + GLOSSARY.length], ["unknown", "Не знаю · " + unkN], ["fav", "Избранные · " + favN]].forEach(function (m) {
      h += '<button type="button" data-act="fc-mode" data-mode="' + m[0] + '" aria-pressed="' + (FC.mode === m[0]) + '">' + m[1] + "</button>";
    });
    h += '</div><div class="seg" role="group" aria-label="Сторона"><button type="button" data-act="fc-dir" data-dir="term" aria-pressed="' + (FC.dir === "term") + '">Термин → определение</button><button type="button" data-act="fc-dir" data-dir="def" aria-pressed="' + (FC.dir === "def") + '">Определение → термин</button></div></div>';
    if (!FC.deck.length) {
      h += '<div class="panel empty">' + (FC.mode === "fav" ? "В избранном пока пусто. Отмечайте термины звёздочкой в карточках или в глоссарии." : "Все термины отмечены как знакомые. Переключитесь на колоду «Все», чтобы повторить.") + "</div>";
    } else if (FC.i >= FC.deck.length) {
      h += '<section class="panel lifted stack"><span class="eyebrow">Колода пройдена</span><h2 class="num">Знаю: ' + FC.stats.yes + " · Не знаю: " + FC.stats.no + "</h2>";
      h += '<div class="row"><button type="button" class="btn primary" data-act="fc-restart">Перемешать и начать заново</button>';
      if (FC.mode !== "unknown") h += '<button type="button" class="btn" data-act="fc-mode" data-mode="unknown">Только «не знаю»</button>';
      h += "</div></section>";
    } else {
      var g = FC.deck[FC.i];
      var termFace = '<span class="hint">Термин</span><span class="term">' + esc(g.term) + "</span>";
      var defFace = '<span class="hint">Определение</span><span class="def">' + esc(g.def) + "</span>";
      h += '<div class="row" style="justify-content:space-between"><span class="eyebrow num">Карточка ' + (FC.i + 1) + " из " + FC.deck.length + "</span>" + starBtn(g.term, true) + "</div>";
      h += '<div class="card-stage"><button type="button" class="flash' + (FC.flipped ? " flipped" : "") + '" data-act="flip" aria-label="Перевернуть карточку">';
      h += '<span class="face front">' + (FC.dir === "term" ? termFace : defFace) + '<span class="hint">нажмите, чтобы перевернуть</span></span>';
      h += '<span class="face back">' + (FC.dir === "term" ? defFace : termFace) + "</span></button></div>";
      h += '<div class="fc-actions"><button type="button" class="btn no" data-act="fc-no">Не знаю</button><button type="button" class="btn yes" data-act="fc-yes">Знаю</button></div>';
    }
    return h + "</div>";
  }

  /* ---------- Глоссарий ---------- */
  var GQ = "";
  function hl(text, q) {
    var t = esc(text);
    if (!q) return t;
    var qe = esc(q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    try { return t.replace(new RegExp("(" + qe + ")", "gi"), "<mark>$1</mark>"); } catch (e) { return t; }
  }
  function glossaryListHTML() {
    var q = GQ.trim().toLowerCase();
    var items = GLOSSARY.slice().sort(function (a, b) { return a.term.localeCompare(b.term, "ru"); })
      .filter(function (g) { return !q || g.term.toLowerCase().indexOf(q) !== -1 || g.def.toLowerCase().indexOf(q) !== -1; });
    if (!items.length) return '<div class="gl"><p class="empty">Ничего не найдено по запросу «' + esc(GQ) + "». Попробуйте часть слова.</p></div>";
    var h = '<dl class="gl">';
    items.forEach(function (g) { h += '<div class="gl-item"><dt>' + hl(g.term, q) + "</dt>" + starBtn(g.term, false) + "<dd>" + hl(g.def, q) + "</dd></div>"; });
    return h + "</dl>";
  }
  function viewGlossary() {
    var h = '<div class="view-inner">' + crumbs([["home", "Главная"], ["glossary", "Глоссарий"]]);
    h += '<section class="hero"><span class="eyebrow">Глоссарий</span><h1>Термины производства</h1><p class="lead">' + GLOSSARY.length + " терминов GMP и технологии твёрдых лекарственных форм, включая термины модуля «" + G.title + "». Звёздочка добавляет термин в избранную колоду карточек.</p></section>";
    h += '<div class="search"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14zM16 16l4 4"/></svg><input id="glSearch" type="search" placeholder="Поиск: CAPA, карантин, чоппер…" autocomplete="off" aria-label="Поиск по глоссарию" value="' + esc(GQ) + '"></div>';
    return h + '<div id="glList">' + glossaryListHTML() + "</div></div>";
  }

  /* ---------- Шпаргалка ---------- */
  function canPrint() {
    if (IS_NODE) return true;
    try { return window.self === window.top; } catch (e) { return false; }
  }
  function viewSheet() {
    var h = '<div class="view-inner">' + crumbs([["home", "Главная"], ["sheet", "Шпаргалка"]]);
    h += '<div class="sheet-head"><div class="stack" style="gap:8px"><span class="eyebrow">Шпаргалка на смену</span><h1>Чек-лист оператора ТЛФ</h1><p class="lead">Короткая памятка на одну страницу. ' + esc(D.norms) + "</p></div>";
    if (canPrint()) h += '<button type="button" class="btn primary no-print" data-act="print">Печать</button>';
    h += "</div>";
    if (!canPrint()) h += '<p class="muted no-print">В этом окне печать недоступна. Откройте сайт или файл all-in-one.html в браузере и используйте кнопку «Печать» или меню браузера: страница свёрстана под лист A4.</p>';
    h += '<div class="sheet">';
    D.sheet.forEach(function (s) {
      h += "<section><h3>" + esc(s.title) + "</h3><ul>" + s.items.map(function (i) { return "<li><span>" + esc(i) + "</span></li>"; }).join("") + "</ul></section>";
    });
    return h + '</div><p class="sheet-foot">' + DISCLAIMER + "</p></div>";
  }

  /* ---------- Об авторе и конфиденциальность ---------- */
  function viewAuthor() {
    var h = '<div class="view-inner narrow">' + crumbs([["home", "Главная"], ["author", "Об авторе"]]);
    h += '<section class="hero"><span class="eyebrow">Об авторе</span><h1>Об авторе</h1></section>';
    h += '<section class="panel author"><div class="author-mark" aria-hidden="true">БА</div><div class="stack" style="gap:4px;min-width:0"><b class="author-name">' + AUTHOR_NAME + '</b><span class="muted">' + AUTHOR_JOB.charAt(0).toUpperCase() + AUTHOR_JOB.slice(1) + "</span></div></section>";
    h += '<section class="panel prose"><p>Материал подготовлен практикующим оператором производства для самоподготовки. Не является официальным учебным пособием и не заменяет СОП предприятия.</p>';
    h += "<p>Тексты написаны своими словами на основе общедоступных принципов надлежащей производственной практики. Сайт не содержит сведений о каком-либо конкретном предприятии, его оборудовании, документах и продукции.</p>";
    h += "<p>Конкретные режимы, нормы и пределы на вашем участке определяют СОП, производственный регламент и Государственная фармакопея РФ. При любом расхождении действуйте по документам предприятия и указаниям мастера.</p>";
    h += "<p>" + MEDICAL + "</p></section>";
    return h + "</div>";
  }
  var CLEAR_ASK = false;
  function viewPrivacy() {
    var h = '<div class="view-inner narrow">' + crumbs([["home", "Главная"], ["privacy", "Конфиденциальность"]]);
    h += '<section class="hero"><span class="eyebrow">Конфиденциальность</span><h1>Персональные данные и прогресс</h1></section>';
    h += '<section class="panel prose">';
    h += "<h2>Сайт не собирает персональные данные</h2>";
    h += "<p>На сайте нет форм, регистрации, комментариев, счётчиков посещений, аналитики, рекламы и трекеров. Сайт не использует cookie. Шрифты, иконки и скрипты хранятся вместе с сайтом и не загружаются со сторонних серверов.</p>";
    h += "<h2>Где хранится прогресс</h2>";
    h += "<p>Отметки о пройденных уроках, результаты тестов, избранные и знакомые термины, выбранная тема оформления сохраняются только в вашем браузере (локальное хранилище, ключ <code>" + KEY + "</code>). Эти данные не передаются ни автору, ни третьим лицам и не покидают ваше устройство. В другом браузере или на другом устройстве прогресс будет пустым.</p>";
    h += "<h2>Как очистить прогресс</h2>";
    h += "<p>Нажмите кнопку ниже или удалите данные сайта в настройках браузера (раздел «Конфиденциальность» или «Данные сайтов»). Режим инкогнито не сохраняет прогресс после закрытия окна.</p>";
    if (!CLEAR_ASK) h += '<p><button type="button" class="btn" data-act="clear-ask">Очистить прогресс на этом устройстве</button></p>';
    else h += '<div class="confirm" role="alert"><p>Удалить весь прогресс, результаты тестов и избранное? Действие нельзя отменить.</p><div class="row"><button type="button" class="btn danger" data-act="clear-yes">Да, удалить</button><button type="button" class="btn ghost" data-act="clear-no">Отмена</button></div></div>';
    h += "<h2>Хостинг</h2>";
    h += "<p>Сайт размещён на бесплатном статическом хостинге. Хостинг-провайдер может вести технические журналы запросов (например, IP-адрес и время обращения) по своим правилам. Автор сайта к этим журналам доступа не имеет и их не использует.</p>";
    h += "<h2>Об авторе</h2>";
    h += "<p>Фамилия, имя, отчество и должность автора указаны по его желанию. Других сведений об авторе и посетителях сайт не публикует и не обрабатывает.</p>";
    return h + "</section></div>";
  }

  function viewNotFound() {
    return '<div class="view-inner"><h1>Страница не найдена</h1><p class="lead"><a href="' + link("home") + '">Вернуться на главную</a></p></div>';
  }

  /* ---------- Рендер по маршруту ---------- */
  function render(r) {
    if (r === "home") return viewHome();
    if (r === "lessons") return viewLessons();
    if (r === "gran") return viewGran();
    if (r.indexOf("lesson-") === 0) return viewLesson(r.slice(7));
    if (r === "tests") return viewTests();
    if (r.indexOf("test-") === 0) return viewTest(r.slice(5));
    if (r === "cards") return viewCards();
    if (r === "glossary") return viewGlossary();
    if (r === "sheet") return viewSheet();
    if (r === "author") return viewAuthor();
    if (r === "privacy") return viewPrivacy();
    return viewNotFound();
  }

  /* ---------- Метаданные страниц (для сборки) ---------- */
  function routes() {
    var r = ["home", "lessons", "gran", "tests", "cards", "glossary", "sheet", "author", "privacy", "test-gran-final"];
    LESSONS.forEach(function (l) { r.push("lesson-" + l.id); });
    return r;
  }
  function meta(r) {
    var l = r.indexOf("lesson-") === 0 ? LMAP[r.slice(7)] : null;
    if (l) return {
      title: l.title + (l.module === "gran" ? " — Грануляция ТЛФ" : "") + " | Оператор ТЛФ",
      h1: l.title,
      description: l.short + " Урок для самоподготовки оператора производства твёрдых лекарственных форм: " + (l.goals ? "цели, тезисы" : "теория, правила") + ", типичные ошибки, вопросы с объяснениями.",
      article: true, lesson: l
    };
    var M = {
      home: ["Оператор ТЛФ — производство таблеток, капсул, гранул и порошков", "Информационно-справочный материал для самоподготовки операторов производства твёрдых лекарственных форм: GMP, грануляция, таблетирование, упаковка, тесты и глоссарий."],
      lessons: ["Основные уроки | Оператор ТЛФ", "Уроки для оператора производства твёрдых лекарственных форм: GMP, гигиена, документация, взвешивание, смешивание, таблетирование, покрытие, упаковка, контроль, отклонения, охрана труда."],
      gran: ["Грануляция ТЛФ — углублённый модуль | Оператор ТЛФ", "Углублённый модуль о грануляции твёрдых лекарственных форм: влажная и сухая грануляция, оборудование, контроль процесса, свойства гранулята, дефекты, расчёт выхода, GMP и безопасность."],
      tests: ["Тесты для самопроверки | Оператор ТЛФ", "Тесты по урокам и итоговые тесты для операторов производства твёрдых лекарственных форм с объяснением каждого ответа и повтором ошибок."],
      cards: ["Флеш-карточки терминов | Оператор ТЛФ", "Флеш-карточки «термин — определение» по GMP и технологии твёрдых лекарственных форм с режимом «знаю / не знаю»."],
      glossary: ["Глоссарий GMP и ТЛФ | Оператор ТЛФ", "Глоссарий терминов GMP и производства твёрдых лекарственных форм с поиском: ALCOA+, CAPA, OOS, line clearance, карантин, валидация, грануляция."],
      sheet: ["Шпаргалка оператора на смену | Оператор ТЛФ", "Чек-лист оператора производства твёрдых лекарственных форм на одну страницу для печати: перед сменой, записи, контроль, отклонения, безопасность."],
      author: ["Об авторе | Оператор ТЛФ", "Об авторе информационно-справочного материала для операторов производства твёрдых лекарственных форм."],
      privacy: ["Конфиденциальность | Оператор ТЛФ", "Сайт не собирает персональные данные. Прогресс хранится только на устройстве пользователя; как его очистить."],
      "test-gran-final": ["Итоговый тест: грануляция ТЛФ | Оператор ТЛФ", "Итоговый тест углублённого модуля «Грануляция ТЛФ»: " + G.finalSize + " случайных вопросов с объяснениями."]
    };
    var m = M[r] || ["Оператор ТЛФ", ""];
    return { title: m[0], description: m[1], article: r === "gran" };
  }

  /* ---------- Экспорт для сборки ---------- */
  if (IS_NODE) {
    root.TLF_APP = {
      SITE_URL: SITE_URL, AUTHOR_NAME: AUTHOR_NAME, AUTHOR_JOB: AUTHOR_JOB, DISCLAIMER: DISCLAIMER,
      routes: routes, meta: meta, pathFor: pathFor, publicUrl: publicUrl, sectionOf: sectionOf,
      setMode: function (m, rt) { MODE = m; ROOT = rt || ""; },
      page: function (r) { return { header: headerHTML(), nav: navHTML(sectionOf(r)), view: render(r), footer: footerHTML() }; },
      counts: function () { return { lessons: LESSONS.length, base: BASE.length, gran: GRAN.length, questions: BANK.length, gran_q: BANK_GRAN.length, glossary: GLOSSARY.length }; }
    };
    return;
  }

  /* ===================== Браузер ===================== */
  var $view = document.getElementById("view");

  function applyTheme() {
    if (S.theme === "dark" || S.theme === "light") document.documentElement.setAttribute("data-theme", S.theme);
    else document.documentElement.removeAttribute("data-theme");
  }
  function currentTheme() {
    if (S.theme) return S.theme;
    try { return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"; } catch (e) { return "light"; }
  }
  applyTheme();

  // В режиме SPA оболочку (шапка, навигация, подвал) рисуем сами
  if (MODE === "spa") {
    document.getElementById("shellTop").innerHTML = headerHTML();
    document.getElementById("shellFoot").innerHTML = footerHTML();
  }

  function currentRoute() {
    if (MODE === "spa") return (location.hash || "#home").slice(1) || "home";
    if (FIXED === "tests") {
      var hsh = location.hash.slice(1);
      if (hsh.indexOf("test-") === 0) return hsh;
    }
    return FIXED;
  }

  var lastRoute = "";
  function route() {
    var r = currentRoute();
    if (r.indexOf("test-") === 0) {
      if (T && T.route !== r) T = null;
      if (T && r !== lastRoute && !T.keep) T = null;
      if (T) T.keep = false;
    }
    if (r !== "privacy") CLEAR_ASK = false;
    $view.innerHTML = render(r);
    if (MODE === "spa") {
      var navBox = document.getElementById("shellNav");
      navBox.innerHTML = navHTML(sectionOf(r));
    }
    var m = meta(r);
    if (MODE === "spa" || r !== FIXED) document.title = r.indexOf("test-") === 0 && T ? T.title + " | Оператор ТЛФ" : m.title;
    if (r !== lastRoute && lastRoute !== "") {
      window.scrollTo(0, 0);
      try { $view.focus({ preventScroll: true }); } catch (e) { /* старые браузеры */ }
    }
    lastRoute = r;
  }
  function rerender() { var y = window.scrollY; route(); window.scrollTo(0, y); }

  function replaceQ(st) {
    var el = $view.querySelector('.q[data-qkey="' + (window.CSS && CSS.escape ? CSS.escape(st.key) : st.key) + '"]');
    if (!el) return rerender();
    var tmp = document.createElement("div");
    tmp.innerHTML = questionHTML(st);
    el.replaceWith(tmp.firstChild);
  }

  /* Поделиться */
  var toastTimer = null;
  function toast(msg) {
    var t = document.getElementById("toast");
    if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2600);
  }
  function shareUrl() {
    if (MODE === "mpa") {
      var c = document.querySelector('link[rel="canonical"]');
      var base = c ? c.href : location.href.split("#")[0];
      return location.hash && location.hash.indexOf("#test-") === 0 ? base + location.hash : base;
    }
    return publicUrl(currentRoute());
  }
  function fallbackCopy(url) {
    var box = document.getElementById("shareBox");
    if (!box) {
      box = document.createElement("div"); box.id = "shareBox"; box.className = "share-box";
      box.innerHTML = '<label for="shareInput">Ссылка на страницу</label><div class="row"><input id="shareInput" readonly><button type="button" class="btn small" data-act="share-close">Готово</button></div>';
      document.body.appendChild(box);
      box.addEventListener("click", function (e) { if (e.target.closest('[data-act="share-close"]')) box.remove(); });
    }
    var inp = document.getElementById("shareInput");
    inp.value = url; inp.focus(); inp.select();
  }
  function share() {
    var url = shareUrl(), title = document.title;
    if (navigator.share) {
      navigator.share({ title: title, url: url }).catch(function (err) {
        if (err && err.name === "AbortError") return;
        copyLink(url);
      });
      return;
    }
    copyLink(url);
  }
  function copyLink(url) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () { toast("Ссылка скопирована"); }, function () { fallbackCopy(url); });
    } else fallbackCopy(url);
  }

  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-act]");
    if (!b) return;
    var act = b.getAttribute("data-act");
    var st;
    switch (act) {
      case "theme":
        S.theme = currentTheme() === "dark" ? "light" : "dark"; applyTheme(); save(); break;
      case "share": share(); break;
      case "opt":
        st = QS[b.getAttribute("data-qkey")]; if (!st) return;
        selectOpt(st, +b.getAttribute("data-opt"));
        if (T && T.items.indexOf(st) !== -1) rerender(); else replaceQ(st);
        break;
      case "check":
        st = QS[b.getAttribute("data-qkey")]; if (!st) return;
        checkQ(st);
        if (T && T.items.indexOf(st) !== -1) rerender(); else replaceQ(st);
        break;
      case "next":
        if (!T) return;
        if (T.i + 1 < T.items.length) T.i++; else finishTest();
        route(); window.scrollTo(0, 0); break;
      case "finish":
        if (T) { finishTest(); route(); window.scrollTo(0, 0); } break;
      case "restart":
        if (!T) return;
        var tid = T.id, ids = tid === "retry" ? T.items.map(function (x) { return x.q.id; }) : null, title = tid === "retry" ? T.title : null;
        var keepRoute = T.route;
        startTest(tid, ids, title); T.route = keepRoute; route(); window.scrollTo(0, 0); break;
      case "retry-wrong":
        if (!T) return;
        var wids = T.items.filter(function (x) { return !x.ok; }).map(function (x) { return x.q.id; });
        var here = currentRoute();
        startTest("retry", wids, "Повтор ошибок: " + T.title.replace(/^Повтор ошибок: /, ""));
        T.keep = true;
        if (MODE === "mpa" && FIXED !== "tests") {
          // итоговый тест модуля живёт на своей странице: повторяем ошибки прямо здесь
          T.route = here; route(); window.scrollTo(0, 0);
        } else {
          T.route = "test-retry";
          if (location.hash === "#test-retry") { route(); window.scrollTo(0, 0); } else location.hash = "#test-retry";
        }
        break;
      case "toggle-done":
        var id = b.getAttribute("data-id");
        if (S.done[id]) delete S.done[id]; else S.done[id] = 1;
        save(); rerender(); break;
      case "fav":
        var term = b.getAttribute("data-term");
        if (S.fav[term]) delete S.fav[term]; else S.fav[term] = 1;
        save();
        if (currentRoute() === "glossary") {
          var on = !!S.fav[term];
          b.setAttribute("aria-pressed", on);
          b.setAttribute("aria-label", (on ? "Убрать из избранного" : "В избранное") + ": " + term);
        } else rerender();
        break;
      case "flip": FC.flipped = !FC.flipped; b.classList.toggle("flipped", FC.flipped); break;
      case "fc-yes":
      case "fc-no":
        var g = FC.deck[FC.i]; if (!g) return;
        S.known[g.term] = act === "fc-yes" ? 1 : 0;
        FC.stats[act === "fc-yes" ? "yes" : "no"]++;
        save(); FC.i++; FC.flipped = false; rerender(); break;
      case "fc-mode": FC.mode = b.getAttribute("data-mode"); buildDeck(); rerender(); break;
      case "fc-dir": FC.dir = b.getAttribute("data-dir"); FC.flipped = false; rerender(); break;
      case "fc-restart": buildDeck(); rerender(); break;
      case "print": try { window.print(); } catch (err) { /* печать недоступна */ } break;
      case "clear-ask": CLEAR_ASK = true; rerender(); break;
      case "clear-no": CLEAR_ASK = false; rerender(); break;
      case "clear-yes":
        clearState(); CLEAR_ASK = false; FC.deck = null; T = null;
        Object.keys(QS).forEach(function (k) { delete QS[k]; });
        applyTheme(); rerender(); toast("Прогресс удалён"); break;
    }
  });

  document.addEventListener("input", function (e) {
    if (e.target.id === "glSearch") {
      GQ = e.target.value;
      var list = document.getElementById("glList");
      if (list) list.innerHTML = glossaryListHTML();
    }
  });
  document.addEventListener("keydown", function (e) {
    if (currentRoute() !== "cards" || e.target.tagName === "INPUT") return;
    if (e.key === "ArrowRight" && FC.flipped) { var y = $view.querySelector('[data-act="fc-yes"]'); if (y) y.click(); }
    if (e.key === "ArrowLeft" && FC.flipped) { var n = $view.querySelector('[data-act="fc-no"]'); if (n) n.click(); }
  });

  window.addEventListener("hashchange", function () {
    if (MODE === "spa" || FIXED === "tests") route();
  });
  route();
})(typeof window !== "undefined" ? window : globalThis);
