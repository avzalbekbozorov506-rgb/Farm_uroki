(function () {
  "use strict";

  var D = window.TLF_DATA;
  var KEY = "tlf-trainer-v1";
  var DISCLAIMER = "Учебный материал для самоподготовки, не заменяет СОП предприятия и инструктаж.";
  var PASS = 80; // учебный порог курса, не норматив

  /* ---------- Хранилище ---------- */
  function loadState() {
    var base = { done: {}, opened: {}, tests: {}, fav: {}, known: {}, wrong: {}, last: null, theme: null };
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
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* игнорируем */ }
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
  function fmtDate(ts) {
    try { return new Date(ts).toLocaleDateString("ru-RU", { day: "numeric", month: "short" }); } catch (e) { return ""; }
  }
  var $view = document.getElementById("view");

  /* ---------- Банк вопросов ---------- */
  var LESSONS = D.lessons;
  var LMAP = {};
  var BANK = [];
  LESSONS.forEach(function (l, li) {
    LMAP[l.id] = l;
    l.num = li + 1;
    l.qs = l.questions.map(function (q, qi) {
      var n = {
        id: l.id + "-" + (qi + 1), lesson: l.id, type: q.type, q: q.q, explain: q.explain
      };
      if (q.type === "tf") {
        n.options = ["Верно", "Неверно"];
        n.correct = [q.answer ? 0 : 1];
      } else {
        n.options = q.options;
        n.correct = q.type === "multi" ? q.answer.slice() : [q.answer];
      }
      BANK.push(n);
      return n;
    });
  });
  var QMAP = {};
  BANK.forEach(function (q) { QMAP[q.id] = q; });

  var TYPE_LABEL = { single: "Один ответ", multi: "Несколько ответов", tf: "Верно / неверно" };

  function isCorrect(q, sel) {
    if (sel.length !== q.correct.length) return false;
    for (var i = 0; i < sel.length; i++) if (q.correct.indexOf(sel[i]) === -1) return false;
    return true;
  }

  /* Состояния отдельных вопросов (самопроверка и тест) */
  var QS = {};
  function makeQState(key, q) {
    QS[key] = { key: key, q: q, order: q.type === "tf" ? [0, 1] : shuffle(range(q.options.length)), sel: [], checked: false, ok: null };
    return QS[key];
  }

  function questionHTML(st, opts) {
    opts = opts || {};
    var q = st.q;
    var h = '<div class="q" data-qkey="' + esc(st.key) + '">';
    h += '<div class="q-meta"><span class="q-type">' + TYPE_LABEL[q.type] + "</span>";
    if (opts.lessonTag) h += '<span class="chip idle">' + esc(LMAP[q.lesson].title) + "</span>";
    h += "</div>";
    h += '<p class="q-text">' + esc(q.q) + "</p>";
    h += '<div class="opts" role="group" aria-label="Варианты ответа">';
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
    h += "</div>";
    return h;
  }

  function selectOpt(st, oi) {
    if (st.checked) return;
    if (st.q.type === "multi") {
      var i = st.sel.indexOf(oi);
      if (i === -1) st.sel.push(oi); else st.sel.splice(i, 1);
    } else {
      st.sel = [oi];
    }
  }
  function checkQ(st) {
    if (st.checked || !st.sel.length) return;
    st.checked = true;
    st.ok = isCorrect(st.q, st.sel);
    if (st.ok) delete S.wrong[st.q.id]; else S.wrong[st.q.id] = 1;
    save();
  }

  /* ---------- Тема ---------- */
  function applyTheme() {
    if (S.theme === "dark" || S.theme === "light") document.documentElement.setAttribute("data-theme", S.theme);
    else document.documentElement.removeAttribute("data-theme");
  }
  function currentTheme() {
    if (S.theme) return S.theme;
    try { return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"; } catch (e) { return "light"; }
  }
  document.getElementById("themeBtn").addEventListener("click", function () {
    S.theme = currentTheme() === "dark" ? "light" : "dark";
    applyTheme(); save();
  });
  applyTheme();

  /* ---------- Прогресс ---------- */
  function doneCount() { return LESSONS.filter(function (l) { return S.done[l.id]; }).length; }
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
  function knownCount() {
    return D.glossary.filter(function (g) { return S.known[g.term] === 1; }).length;
  }
  function wrongIds() { return Object.keys(S.wrong).filter(function (id) { return QMAP[id]; }); }

  /* ---------- Экраны ---------- */
  function viewHome() {
    var dc = doneCount(), total = LESSONS.length, pct = Math.round(dc / total * 100);
    var nl = nextLesson();
    var exam = S.tests.exam;
    var h = '<div class="view-inner">';
    h += '<section class="hero"><span class="eyebrow">Курс самоподготовки · ' + total + " модулей</span>";
    h += "<h1>Производство твёрдых лекарственных форм</h1>";
    h += '<p class="lead">Уроки по GMP и технологическим операциям для операторов участков взвешивания, грануляции, таблетирования, покрытия, инкапсулирования и упаковки.</p></section>';

    h += '<section class="panel lifted progress-card" aria-label="Прогресс по курсу">';
    h += '<div class="progress-top"><div><span class="eyebrow">Прогресс по курсу</span><div class="big num">' + pct + "<small>%</small></div></div>";
    h += '<p class="muted num">' + dc + " из " + total + " уроков пройдено</p></div>";
    h += '<div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><i style="width:' + pct + '%"></i></div>';
    h += '<div class="cta">';
    if (nl) h += '<a class="btn primary" href="#lesson-' + nl.id + '">Продолжить: урок ' + nl.num + "</a>";
    else h += '<a class="btn primary" href="#test-exam">Курс пройден: экзамен</a>';
    h += '<a class="btn" href="#tests">Тест</a><a class="btn" href="#cards">Карточки</a></div>';
    if (nl) h += '<p class="muted">Следующий: ' + esc(nl.title) + "</p>";
    h += "</section>";

    h += '<section class="stats" aria-label="Статистика">';
    h += '<div class="stat"><b>' + (exam ? exam.best + "%" : "—") + "</b><span>лучший результат экзамена</span></div>";
    h += '<div class="stat"><b>' + knownCount() + "/" + D.glossary.length + "</b><span>терминов отмечено «знаю»</span></div>";
    var w = wrongIds().length;
    h += '<div class="stat"><b>' + w + "</b><span>" + plural(w, "вопрос", "вопроса", "вопросов") + " в работе над ошибками</span></div>";
    h += "</section>";

    h += '<section class="stack"><div class="row" style="justify-content:space-between"><h2>Модули</h2><a href="#lessons">Все уроки</a></div>';
    h += modulesHTML();
    h += "</section>";
    h += '<p class="note">' + DISCLAIMER + "</p>";
    h += "</div>";
    return h;
  }

  function modulesHTML() {
    var h = '<div class="modules">';
    LESSONS.forEach(function (l) {
      h += '<a class="module" href="#lesson-' + l.id + '"><span class="idx">' + pad(l.num) + '</span><span class="t"><b>' + esc(l.title) + "</b><span>" + esc(l.short) + "</span></span>" + lessonChip(l) + "</a>";
    });
    return h + "</div>";
  }

  function viewLessons() {
    var dc = doneCount();
    var h = '<div class="view-inner">';
    h += '<section class="hero"><span class="eyebrow">Уроки</span><h1>Программа курса</h1>';
    h += '<p class="lead">Модули идут в порядке технологического процесса: от правил и допуска в зону до упаковки, контроля и действий при отклонениях. Пройдено ' + dc + " из " + LESSONS.length + ".</p></section>";
    h += modulesHTML();
    h += "</div>";
    return h;
  }

  function viewLesson(id) {
    var l = LMAP[id];
    if (!l) return viewNotFound();
    if (!S.opened[id] || S.last !== id) { S.opened[id] = 1; S.last = id; save(); }
    var prev = LESSONS[l.num - 2], next = LESSONS[l.num];
    var h = '<div class="view-inner">';
    h += '<div class="lesson-head"><nav class="crumbs" aria-label="Навигация"><a href="#lessons">Уроки</a> / Модуль ' + pad(l.num) + "</nav>";
    h += '<div class="row">' + lessonChip(l) + '<span class="eyebrow">Модуль ' + pad(l.num) + " из " + LESSONS.length + "</span></div>";
    h += "<h1>" + esc(l.title) + '</h1><p class="lead">' + esc(l.short) + "</p></div>";

    h += '<section class="panel"><div class="section-title"><span class="tag theory">Теория</span></div><div class="prose">';
    l.theory.forEach(function (p) { h += "<p>" + esc(p) + "</p>"; });
    h += "</div></section>";

    h += '<div class="two"><section class="panel"><div class="section-title"><span class="tag rules">Ключевые правила</span></div><ul class="checklist">';
    l.rules.forEach(function (r) { h += "<li>" + esc(r) + "</li>"; });
    h += '</ul></section><section class="panel"><div class="section-title"><span class="tag errs">Типичные ошибки</span></div><ul class="errlist">';
    l.errors.forEach(function (r) { h += "<li>" + esc(r) + "</li>"; });
    h += "</ul></section></div>";

    h += '<section class="panel"><div class="section-title"><span class="tag check">Самопроверка</span><span class="muted">' + l.qs.length + " " + plural(l.qs.length, "вопрос", "вопроса", "вопросов") + "</span></div>";
    l.qs.forEach(function (q) {
      var key = "l-" + q.id;
      var st = QS[key] || makeQState(key, q);
      h += questionHTML(st);
    });
    h += "</section>";

    h += '<section class="panel stack"><div class="row" style="justify-content:space-between">';
    h += '<p>' + (S.done[id] ? "Урок отмечен как пройденный." : "Прочитали теорию и ответили на вопросы? Отметьте урок.") + "</p>";
    h += '<button type="button" class="btn ' + (S.done[id] ? "" : "primary") + '" data-act="toggle-done" data-id="' + id + '">' + (S.done[id] ? "Снять отметку" : "Отметить урок пройденным") + "</button></div>";
    h += '<div class="row"><a class="btn small" href="#test-' + id + '">Тест по модулю</a></div></section>';

    h += '<nav class="lesson-nav" aria-label="Соседние уроки">';
    h += prev ? '<a class="btn ghost" href="#lesson-' + prev.id + '">← ' + esc(prev.title) + "</a>" : "<span></span>";
    h += next ? '<a class="btn ghost" href="#lesson-' + next.id + '">' + esc(next.title) + " →</a>" : '<a class="btn ghost" href="#test-exam">Итоговый экзамен →</a>';
    h += "</nav></div>";
    return h;
  }

  /* ---------- Тесты ---------- */
  var T = null;
  var EXAM_SIZE = 40;

  function testDefs() {
    var defs = [
      { id: "exam", title: "Итоговый экзамен", desc: EXAM_SIZE + " случайных вопросов из всех модулей.", feature: true },
      { id: "all", title: "Все вопросы курса", desc: BANK.length + " вопросов, полный прогон." }
    ];
    var w = wrongIds().length;
    if (w) defs.push({ id: "mistakes", title: "Работа над ошибками", desc: w + " " + plural(w, "вопрос", "вопроса", "вопросов") + ", где был дан неверный ответ." });
    return defs;
  }

  function scoreChip(id) {
    var r = S.tests[id];
    if (!r) return '<span class="chip idle">Не пройден</span>';
    return '<span class="chip ' + (r.best >= PASS ? "ok" : "warn") + ' num">Лучший ' + r.best + "%</span>";
  }

  function viewTests() {
    var h = '<div class="view-inner">';
    h += '<section class="hero"><span class="eyebrow">Тесты</span><h1>Проверка знаний</h1>';
    h += '<p class="lead">' + BANK.length + " вопросов: один ответ, несколько ответов, верно или неверно. Вопросы и варианты перемешиваются. После каждого ответа показывается объяснение. Учебный порог курса — " + PASS + "%.</p></section>";
    h += '<div class="test-grid">';
    testDefs().forEach(function (d) {
      h += '<div class="test-card' + (d.feature ? " feature" : "") + '"><div class="stack" style="gap:6px"><h3>' + esc(d.title) + "</h3><p>" + esc(d.desc) + "</p></div>";
      h += '<div class="row">' + (d.id === "mistakes" ? '<span class="chip bad">Ошибки</span>' : scoreChip(d.id)) + '<a class="btn small ' + (d.feature ? "primary" : "") + '" href="#test-' + d.id + '">Начать</a></div></div>';
    });
    h += "</div>";
    h += '<h2>Тесты по модулям</h2><div class="test-grid">';
    LESSONS.forEach(function (l) {
      h += '<div class="test-card"><div class="stack" style="gap:6px"><span class="eyebrow">Модуль ' + pad(l.num) + "</span><h3>" + esc(l.title) + "</h3></div>";
      h += '<div class="row">' + scoreChip(l.id) + '<a class="btn small" href="#test-' + l.id + '">Начать</a></div></div>';
    });
    h += "</div></div>";
    return h;
  }

  function startTest(id, ids, title) {
    var qs;
    if (ids) qs = ids.map(function (x) { return QMAP[x]; }).filter(Boolean);
    else if (id === "exam") qs = shuffle(BANK).slice(0, EXAM_SIZE);
    else if (id === "all") qs = BANK.slice();
    else if (id === "mistakes") qs = wrongIds().map(function (x) { return QMAP[x]; });
    else if (LMAP[id]) qs = LMAP[id].qs.slice();
    else return false;
    if (!qs.length) return false;
    qs = shuffle(qs);
    if (!title) {
      if (id === "exam") title = "Итоговый экзамен";
      else if (id === "all") title = "Все вопросы курса";
      else if (id === "mistakes") title = "Работа над ошибками";
      else title = "Тест: " + LMAP[id].title;
    }
    T = {
      id: id, title: title, i: 0, finished: false, saved: false,
      items: qs.map(function (q, n) { return makeQState("t-" + n + "-" + q.id, q); })
    };
    return true;
  }

  function viewTest(id) {
    if (!T || T.id !== id) {
      if (!startTest(id)) {
        return '<div class="view-inner"><h1>Тест недоступен</h1><p class="lead">Для этого теста нет вопросов. <a href="#tests">Вернуться к тестам</a></p></div>';
      }
    }
    return T.finished ? resultsHTML() : runnerHTML();
  }

  function runnerHTML() {
    var st = T.items[T.i], n = T.items.length;
    var answered = T.items.filter(function (x) { return x.checked; }).length;
    var correct = T.items.filter(function (x) { return x.ok; }).length;
    var h = '<div class="view-inner">';
    h += '<div class="runner-head"><nav class="crumbs"><a href="#tests">Тесты</a> / ' + esc(T.title) + "</nav>";
    h += '<div class="row"><span class="eyebrow num">Вопрос ' + (T.i + 1) + " из " + n + '</span><span class="muted num">Верно: ' + correct + " из " + answered + "</span></div>";
    h += '<div class="bar"><i style="width:' + Math.round(answered / n * 100) + '%"></i></div></div>';
    var after = '<div class="row"><button type="button" class="btn primary" data-act="next">' + (T.i + 1 < n ? "Следующий вопрос" : "Показать итог") + "</button></div>";
    h += '<section class="panel lifted">' + questionHTML(st, { lessonTag: T.id === "exam" || T.id === "all" || T.id === "mistakes", after: after }) + "</section>";
    h += '<div class="row"><button type="button" class="btn ghost small" data-act="finish">Завершить досрочно</button></div>';
    h += "</div>";
    return h;
  }

  function finishTest() {
    T.finished = true;
    var answered = T.items.filter(function (x) { return x.checked; });
    var right = answered.filter(function (x) { return x.ok; }).length;
    var pct = Math.round(right / T.items.length * 100);
    T.result = { right: right, total: T.items.length, pct: pct };
    // сохраняем результат только для полноценных тестов
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
    var h = '<div class="view-inner">';
    h += '<nav class="crumbs"><a href="#tests">Тесты</a> / ' + esc(T.title) + "</nav>";
    h += '<section class="panel lifted result-score">';
    h += '<svg class="ring" viewBox="0 0 112 112" role="img" aria-label="Результат ' + r.pct + '%"><circle class="bg" cx="56" cy="56" r="46"/><circle class="fg" cx="56" cy="56" r="46" stroke-dasharray="' + (C * r.pct / 100).toFixed(1) + " " + C.toFixed(1) + '"/><text x="56" y="64" text-anchor="middle">' + r.pct + "%</text></svg>";
    h += '<div class="stack" style="gap:6px;min-width:0"><span class="chip ' + (r.pct >= PASS ? "ok" : "warn") + '">' + (r.pct >= PASS ? "Учебный порог пройден" : "Нужно повторить") + "</span>";
    h += "<h1>" + esc(T.title) + '</h1><p class="muted num">Верных ответов: ' + r.right + " из " + r.total + "</p></div></section>";
    h += '<div class="row">';
    if (wrong.length) h += '<button type="button" class="btn primary" data-act="retry-wrong">Повторить только ошибки (' + wrong.length + ")</button>";
    h += '<button type="button" class="btn" data-act="restart">Пройти заново</button><a class="btn ghost" href="#tests">Все тесты</a></div>';

    if (wrong.length) {
      h += '<section class="panel"><h2 style="margin-bottom:14px">Разбор ошибок</h2>';
      wrong.forEach(function (st) {
        var q = st.q;
        h += '<div class="mistake"><span class="muted" style="font-size:.85rem">' + esc(LMAP[q.lesson].title) + '</span><p class="q-text">' + esc(q.q) + "</p>";
        if (st.checked) {
          h += '<div><span class="lbl yours">Ваш ответ</span><ul>' + st.sel.map(function (i) { return "<li>" + esc(q.options[i]) + "</li>"; }).join("") + "</ul></div>";
        } else {
          h += '<div><span class="lbl yours">Без ответа</span></div>';
        }
        h += '<div><span class="lbl right">Правильно</span><ul>' + q.correct.map(function (i) { return "<li>" + esc(q.options[i]) + "</li>"; }).join("") + "</ul></div>";
        h += "<p>" + esc(q.explain) + "</p></div>";
      });
      h += "</section>";
    } else {
      h += '<p class="note">Ошибок нет. Для закрепления попробуйте итоговый экзамен или карточки.</p>';
    }
    h += "</div>";
    return h;
  }

  /* ---------- Карточки ---------- */
  var FC = { mode: "all", dir: "term", deck: null, i: 0, flipped: false, stats: { yes: 0, no: 0 } };

  function buildDeck() {
    var list = D.glossary.filter(function (g) {
      if (FC.mode === "fav") return S.fav[g.term];
      if (FC.mode === "unknown") return S.known[g.term] !== 1;
      return true;
    });
    FC.deck = shuffle(list);
    FC.i = 0; FC.flipped = false; FC.stats = { yes: 0, no: 0 };
  }

  function starBtn(term, withLabel) {
    var on = !!S.fav[term];
    return '<button type="button" class="star" data-act="fav" data-term="' + esc(term) + '" aria-pressed="' + on + '" aria-label="' + (on ? "Убрать из избранного" : "В избранное") + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg>' + (withLabel ? (on ? "В избранном" : "В избранное") : "") + "</button>";
  }

  function viewCards() {
    if (!FC.deck) buildDeck();
    var favN = D.glossary.filter(function (g) { return S.fav[g.term]; }).length;
    var unkN = D.glossary.length - knownCount();
    var h = '<div class="view-inner">';
    h += '<section class="hero"><span class="eyebrow">Флеш-карточки</span><h1>Термины и определения</h1>';
    h += '<p class="lead">Нажмите на карточку, чтобы перевернуть. Отметьте «Знаю» или «Не знаю»: незнакомые термины соберутся в отдельную колоду. Знаю: ' + knownCount() + " из " + D.glossary.length + ".</p></section>";

    h += '<div class="fc-tools"><div class="seg" role="group" aria-label="Колода">';
    [["all", "Все · " + D.glossary.length], ["unknown", "Не знаю · " + unkN], ["fav", "Избранные · " + favN]].forEach(function (m) {
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
      var frontIsTerm = FC.dir === "term";
      var termFace = '<span class="hint">Термин</span><span class="term">' + esc(g.term) + "</span>";
      var defFace = '<span class="hint">Определение</span><span class="def">' + esc(g.def) + "</span>";
      h += '<div class="row" style="justify-content:space-between"><span class="eyebrow num">Карточка ' + (FC.i + 1) + " из " + FC.deck.length + "</span>" + starBtn(g.term, true) + "</div>";
      h += '<div class="card-stage"><button type="button" class="flash' + (FC.flipped ? " flipped" : "") + '" data-act="flip" aria-label="Перевернуть карточку">';
      h += '<span class="face front">' + (frontIsTerm ? termFace : defFace) + '<span class="hint">нажмите, чтобы перевернуть</span></span>';
      h += '<span class="face back">' + (frontIsTerm ? defFace : termFace) + "</span></button></div>";
      h += '<div class="fc-actions"><button type="button" class="btn no" data-act="fc-no">Не знаю</button><button type="button" class="btn yes" data-act="fc-yes">Знаю</button></div>';
    }
    h += "</div>";
    return h;
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
    var items = D.glossary.slice().sort(function (a, b) { return a.term.localeCompare(b.term, "ru"); })
      .filter(function (g) { return !q || g.term.toLowerCase().indexOf(q) !== -1 || g.def.toLowerCase().indexOf(q) !== -1; });
    if (!items.length) return '<div class="gl"><p class="empty">Ничего не найдено по запросу «' + esc(GQ) + "». Попробуйте часть слова.</p></div>";
    var h = '<dl class="gl">';
    items.forEach(function (g) {
      h += '<div class="gl-item"><dt>' + hl(g.term, q) + "</dt>" + starBtn(g.term, false) + "<dd>" + hl(g.def, q) + "</dd></div>";
    });
    return h + "</dl>";
  }
  function viewGlossary() {
    var h = '<div class="view-inner">';
    h += '<section class="hero"><span class="eyebrow">Глоссарий</span><h1>Термины производства</h1><p class="lead">' + D.glossary.length + " терминов GMP и технологии ТЛФ. Звёздочка добавляет термин в избранную колоду карточек.</p></section>";
    h += '<div class="search"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14zM16 16l4 4"/></svg><input id="glSearch" type="search" placeholder="Поиск: CAPA, карантин, капинг…" autocomplete="off" aria-label="Поиск по глоссарию" value="' + esc(GQ) + '"></div>';
    h += '<div id="glList">' + glossaryListHTML() + "</div></div>";
    return h;
  }

  /* ---------- Шпаргалка ---------- */
  function canPrint() {
    try { return window.self === window.top; } catch (e) { return false; }
  }
  function viewSheet() {
    var h = '<div class="view-inner">';
    h += '<div class="sheet-head"><div class="stack" style="gap:8px"><span class="eyebrow">Шпаргалка на смену</span><h1>Чек-лист оператора ТЛФ</h1><p class="lead">Короткая памятка на одну страницу. ' + esc(D.norms) + "</p></div>";
    if (canPrint()) h += '<button type="button" class="btn primary no-print" data-act="print">Печать</button>';
    h += "</div>";
    if (!canPrint()) h += '<p class="muted no-print">Для печати откройте файл index.html в браузере и используйте кнопку «Печать» или меню браузера: страница свёрстана под лист A4.</p>';
    h += '<div class="sheet">';
    D.sheet.forEach(function (s) {
      h += "<section><h3>" + esc(s.title) + "</h3><ul>" + s.items.map(function (i) { return "<li><span>" + esc(i) + "</span></li>"; }).join("") + "</ul></section>";
    });
    h += "</div>";
    h += '<p class="sheet-foot">' + DISCLAIMER + "</p></div>";
    return h;
  }

  function viewNotFound() {
    return '<div class="view-inner"><h1>Раздел не найден</h1><p class="lead"><a href="#home">Вернуться на главную</a></p></div>';
  }

  /* ---------- Роутер ---------- */
  var lastRoute = "";
  function route() {
    var r = (location.hash || "#home").slice(1) || "home";
    var section = r;
    var html;
    if (r === "home") html = viewHome();
    else if (r === "lessons") html = viewLessons();
    else if (r.indexOf("lesson-") === 0) { section = "lessons"; html = viewLesson(r.slice(7)); }
    else if (r === "tests") html = viewTests();
    else if (r.indexOf("test-") === 0) {
      section = "tests";
      var tid = r.slice(5);
      // новый заход на тест (не из «повторить ошибки») — начинаем заново
      if (r !== lastRoute && !(T && T.keep && T.id === tid)) T = null;
      if (T) T.keep = false;
      html = viewTest(tid);
    }
    else if (r === "cards") html = viewCards();
    else if (r === "glossary") html = viewGlossary();
    else if (r === "sheet") html = viewSheet();
    else { section = ""; html = viewNotFound(); }

    $view.innerHTML = html;
    document.querySelectorAll(".nav a").forEach(function (a) {
      var on = a.getAttribute("data-nav") === section;
      a.classList.toggle("active", on);
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    if (r !== lastRoute) {
      window.scrollTo(0, 0);
      try { $view.focus({ preventScroll: true }); } catch (e) { /* старые браузеры */ }
    }
    lastRoute = r;
  }
  function rerender() { var y = window.scrollY; route(); window.scrollTo(0, y); }

  /* ---------- События ---------- */
  function replaceQ(st, opts) {
    var el = $view.querySelector('.q[data-qkey="' + (window.CSS && CSS.escape ? CSS.escape(st.key) : st.key) + '"]');
    if (!el) return rerender();
    var tmp = document.createElement("div");
    tmp.innerHTML = questionHTML(st, opts);
    el.replaceWith(tmp.firstChild);
  }

  $view.addEventListener("click", function (e) {
    var b = e.target.closest("[data-act]");
    if (!b || !$view.contains(b)) return;
    var act = b.getAttribute("data-act");
    var st;
    switch (act) {
      case "opt":
        st = QS[b.getAttribute("data-qkey")];
        if (!st) return;
        selectOpt(st, +b.getAttribute("data-opt"));
        if (T && T.items.indexOf(st) !== -1) rerender(); else replaceQ(st);
        break;
      case "check":
        st = QS[b.getAttribute("data-qkey")];
        if (!st) return;
        checkQ(st);
        if (T && T.items.indexOf(st) !== -1) rerender(); else replaceQ(st);
        break;
      case "next":
        if (!T) return;
        if (T.i + 1 < T.items.length) T.i++; else finishTest();
        route(); window.scrollTo(0, 0);
        break;
      case "finish":
        if (T) { finishTest(); route(); window.scrollTo(0, 0); }
        break;
      case "restart":
        if (!T) return;
        var tid = T.id, ids = tid === "retry" ? T.items.map(function (x) { return x.q.id; }) : null, title = tid === "retry" ? T.title : null;
        startTest(tid, ids, title);
        route(); window.scrollTo(0, 0);
        break;
      case "retry-wrong":
        if (!T) return;
        var wids = T.items.filter(function (x) { return !x.ok; }).map(function (x) { return x.q.id; });
        var baseTitle = T.title.replace(/^Повтор ошибок: /, "");
        startTest("retry", wids, "Повтор ошибок: " + baseTitle);
        T.keep = true;
        if (location.hash === "#test-retry") { route(); window.scrollTo(0, 0); }
        else location.hash = "#test-retry";
        break;
      case "toggle-done":
        var id = b.getAttribute("data-id");
        if (S.done[id]) delete S.done[id]; else S.done[id] = 1;
        save(); rerender();
        break;
      case "fav":
        var term = b.getAttribute("data-term");
        if (S.fav[term]) delete S.fav[term]; else S.fav[term] = 1;
        save();
        if (location.hash === "#glossary") {
          var on = !!S.fav[term];
          b.setAttribute("aria-pressed", on);
          b.setAttribute("aria-label", on ? "Убрать из избранного" : "В избранное");
        } else rerender();
        break;
      case "flip":
        FC.flipped = !FC.flipped;
        b.classList.toggle("flipped", FC.flipped);
        break;
      case "fc-yes":
      case "fc-no":
        var g = FC.deck[FC.i];
        if (!g) return;
        S.known[g.term] = act === "fc-yes" ? 1 : 0;
        FC.stats[act === "fc-yes" ? "yes" : "no"]++;
        save();
        FC.i++; FC.flipped = false;
        rerender();
        break;
      case "fc-mode":
        FC.mode = b.getAttribute("data-mode"); buildDeck(); rerender();
        break;
      case "fc-dir":
        FC.dir = b.getAttribute("data-dir"); FC.flipped = false; rerender();
        break;
      case "fc-restart":
        buildDeck(); rerender();
        break;
      case "print":
        try { window.print(); } catch (err) { /* печать недоступна */ }
        break;
    }
  });

  $view.addEventListener("input", function (e) {
    if (e.target.id === "glSearch") {
      GQ = e.target.value;
      var list = document.getElementById("glList");
      if (list) list.innerHTML = glossaryListHTML();
    }
  });

  document.addEventListener("keydown", function (e) {
    if (location.hash !== "#cards" || e.target.tagName === "INPUT") return;
    if (e.key === "ArrowRight" && FC.flipped) { var y = $view.querySelector('[data-act="fc-yes"]'); if (y) y.click(); }
    if (e.key === "ArrowLeft" && FC.flipped) { var n = $view.querySelector('[data-act="fc-no"]'); if (n) n.click(); }
  });

  window.addEventListener("hashchange", route);
  route();
})();
