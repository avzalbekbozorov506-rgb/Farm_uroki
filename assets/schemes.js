/* Оператор ТЛФ — интерактивные SVG-схемы процессов.
   Каждая схема — рисунок с шагами. Сборка (node) выводит схему в состоянии «обзор» (шаг 0):
   без JavaScript это статичная картинка с подписью и списком стадий.
   В браузере TLF_SCHEMES.init() добавляет управление: заново, назад, пуск/пауза, вперёд.
   Разметка шагов внутри SVG:
     data-s="1 2"   элемент виден только на этих шагах (0 — обзор);
     data-h="1 2"   элемент подсвечен на этих шагах;
     data-m="1 2"   элемент движется на этих шагах, пока схема проигрывается;
     data-tf="a|b"  CSS-трансформация для шагов 0, 1, 2… (последнее значение повторяется).
   Числовых режимов в схемах нет: значения задают регламент и СОП. */
(function (root) {
  "use strict";

  var IS_NODE = typeof document === "undefined";

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function S(v) { return ' data-s="' + v + '"'; }
  function H(v) { return ' data-h="' + v + '"'; }
  function M(v) { return ' data-m="' + v + '"'; }
  function TF(list) { return ' data-tf="' + list.join("|") + '"'; }
  function T(x, y, s, cls, anchor) {
    return '<text x="' + x + '" y="' + y + '" class="' + (cls || "k-t") + '"' + (anchor ? ' text-anchor="' + anchor + '"' : "") + ">" + esc(s) + "</text>";
  }
  // детерминированный «случайный» разброс частиц, чтобы сборка всегда давала одинаковый рисунок
  function rng(seed) { var x = seed; return function () { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; }; }
  function scatter(seed, n, x0, x1, y0, y1, minD) {
    var r = rng(seed), pts = [], guard = 0;
    while (pts.length < n && guard++ < 4000) {
      var p = [x0 + r() * (x1 - x0), y0 + r() * (y1 - y0)], ok = true;
      for (var i = 0; i < pts.length; i++) { var dx = pts[i][0] - p[0], dy = pts[i][1] - p[1]; if (dx * dx + dy * dy < minD * minD) { ok = false; break; } }
      if (ok) pts.push(p);
    }
    return pts;
  }
  function f1(n) { return Math.round(n * 10) / 10; }
  function circles(pts, r, cls, extra) {
    return pts.map(function (p, i) { return '<circle cx="' + f1(p[0]) + '" cy="' + f1(p[1]) + '" r="' + (typeof r === "function" ? r(i) : r) + '" class="' + (typeof cls === "function" ? cls(i) : cls) + '"' + (extra ? extra(i) : "") + "/>"; }).join("");
  }
  function arrowDefs(id) {
    return '<defs><marker id="' + id + '-ar" viewBox="0 0 10 10" refX="8" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" class="k-arhead"/></marker></defs>';
  }
  function arrow(id, d, cls, extra) { return '<path d="' + d + '" class="' + (cls || "k-arrow") + '" marker-end="url(#' + id + '-ar)"' + (extra || "") + "/>"; }
  function delays(i) { return ' style="animation-delay:' + (-(i % 7) * 0.23).toFixed(2) + 's"'; }

  /* ---------- 1. Влажная грануляция по стадиям ---------- */
  function svgWet(id) {
    var h = arrowDefs(id);
    // дорожка стадий
    h += '<path d="M50 30H470" class="k-track"/>';
    for (var i = 1; i <= 7; i++) {
      var x = 50 + (i - 1) * 70, done = [];
      for (var j = i; j <= 7; j++) done.push(j);
      h += '<circle cx="' + x + '" cy="30" r="18" class="k-ring"' + S(i) + "/>";
      h += '<circle cx="' + x + '" cy="30" r="12" class="k-node"' + H(done.join(" ")) + "/>";
      h += '<text x="' + x + '" y="34.5" class="k-node-t" text-anchor="middle"' + H(done.join(" ")) + ">" + i + "</text>";
    }
    // обзор: порошок → гранулы
    var powder = scatter(11, 46, 80, 210, 120, 250, 11);
    var gr = [[330, 150], [385, 140], [440, 160], [350, 205], [410, 200], [455, 225], [330, 255], [390, 250]];
    h += "<g" + S(0) + ">" + circles(powder, function (k) { return k % 3 ? 4.5 : 3.5; }, function (k) { return k % 3 ? "k-exc" : "k-api"; });
    h += arrow(id, "M228 192H290", "k-arrow k-strong");
    h += gr.map(function (p, k) { return granule(p[0], p[1], 20 + (k % 3) * 2, k); }).join("");
    h += T(145, 288, "порошковая смесь", "k-t k-mut", "middle") + T(392, 298, "гранулы", "k-t k-mut", "middle") + "</g>";

    // чаша (стадии 1–3)
    h += "<g" + S("1 2 3") + '><path d="M150 96V252Q150 292 188 292H332Q370 292 370 252V96" class="k-vessel"/>';
    h += '<ellipse cx="260" cy="276" rx="66" ry="9" class="k-dash"' + M("1 2 3") + "/>";
    h += '<path d="M206 276Q260 262 314 276Q260 288 206 276Z" class="k-part"/><circle cx="260" cy="276" r="5" class="k-ink"/></g>';
    // частицы (1–2)
    var mix = scatter(23, 34, 172, 348, 176, 266, 14);
    h += '<g class="mv-sway"' + S("1 2") + M("1 2") + ">";
    h += "<g" + S(2) + ">" + circles(mix, 9, "k-liq-soft") + "</g>";
    h += circles(mix, function (k) { return k % 3 ? 5.5 : 4.5; }, function (k) { return k % 3 ? "k-exc" : "k-api"; }) + "</g>";
    h += "<g" + S(1) + '><circle cx="384" cy="150" r="5" class="k-api"/>' + T(396, 155, "действующее", "k-t k-sm") + T(396, 172, "вещество", "k-t k-sm") +
      '<circle cx="384" cy="200" r="5.5" class="k-exc"/>' + T(396, 205, "вспомогательные", "k-t k-sm") + T(396, 222, "вещества", "k-t k-sm") + "</g>";
    // форсунка и капли (2)
    h += "<g" + S(2) + '><path d="M240 50H280V66L268 80H252L240 66Z" class="k-part"/>';
    h += '<g class="mv-drop"' + M(2) + '><circle cx="252" cy="98" r="4" class="k-liq"/><circle cx="268" cy="112" r="4" class="k-liq" style="animation-delay:-.4s"/><circle cx="260" cy="130" r="4" class="k-liq" style="animation-delay:-.8s"/></g>';
    h += T(292, 66, "раствор связующего", "k-t") + "</g>";
    // агломераты (3)
    var agg = [[200, 248], [248, 232], [300, 250], [334, 226], [228, 270], [282, 274], [318, 268], [190, 214], [270, 204]];
    h += '<g class="mv-tumble"' + S(3) + M(3) + ">" + agg.map(function (p, k) { return cluster(p[0], p[1], 15 + (k % 2) * 3, k); }).join("") + "</g>";
    h += "<g" + S(3) + ">" + T(260, 140, "образуются агломераты", "k-t", "middle") + "</g>";
    // влажное просеивание (4)
    h += "<g" + S(4) + ">" + sieve(140, 380, 196);
    h += lump(196, 146, 34, 22, 1) + lump(274, 132, 28, 20, 2) + lump(340, 156, 24, 16, 3);
    var g4 = [[175, 236], [215, 252], [258, 236], [300, 256], [342, 240], [196, 280], [238, 284], [282, 286], [326, 282]];
    h += '<g class="mv-fall"' + M(4) + ">" + g4.map(function (p, k) { return granule(p[0], p[1], 10, k, true); }).join("") + "</g>";
    h += T(392, 201, "сито", "k-t") + T(260, 108, "крупные комки разбиваются", "k-t", "middle") + "</g>";
    // сушка (5)
    h += "<g" + S(5) + '><path d="M150 274H370" class="k-plate"/>';
    [180, 230, 280, 330].forEach(function (x, k) { h += arrow(id, "M" + x + " 312V284", "k-arrow k-heat mv-up", M(5) + ' style="animation-delay:' + (-k * 0.3) + 's"'); });
    var g5 = [[180, 236], [222, 214], [262, 240], [304, 212], [344, 238], [200, 176], [246, 170], [290, 180], [334, 168]];
    h += g5.map(function (p, k) { return '<g class="mv-bob"' + M(5) + delays(k) + ">" + granule(p[0], p[1], 11, k, true) + "</g>"; }).join("");
    [200, 260, 320].forEach(function (x, k) { h += '<path d="M' + x + ' 150q-8-10 0-20t0-20" class="k-vapor mv-rise"' + M(5) + ' style="animation-delay:' + (-k * 0.5) + 's"/>'; });
    h += T(380, 300, "горячий воздух", "k-t k-heat-t") + T(346, 104, "влага испаряется", "k-t") + "</g>";
    // сухая калибровка (6)
    h += "<g" + S(6) + ">" + sieve(140, 380, 196);
    var g6a = [[180, 160, 16], [226, 150, 9], [262, 164, 20], [306, 148, 7], [346, 162, 13], [204, 120, 7], [292, 116, 11]];
    h += g6a.map(function (p, k) { return granule(p[0], p[1], p[2], k, true); }).join("");
    h += '<g class="mv-fall"' + M(6) + ">" + g4.map(function (p, k) { return granule(p[0], p[1], 9, k + 3, true); }).join("") + "</g>";
    h += T(392, 194, "сито или", "k-t") + T(392, 212, "мельница", "k-t") + T(260, 100, "размер гранул выравнивается", "k-t", "middle") + "</g>";
    // опудривание (7)
    h += "<g" + S(7) + '><rect x="150" y="110" width="220" height="182" rx="22" class="k-vessel"/>';
    var g7 = scatter(71, 12, 178, 342, 138, 268, 34);
    h += g7.map(function (p, k) { return granule(p[0], p[1], 10, k, true); }).join("");
    var lub = scatter(97, 60, 166, 354, 124, 282, 8);
    h += '<g class="mv-fadein"' + M(7) + ">" + circles(lub, 2, "k-lub") + "</g>";
    h += T(384, 150, "внешняя фаза:", "k-t k-sm") + T(384, 168, "разрыхлитель,", "k-t k-sm") + T(384, 186, "скользящие,", "k-t k-sm") + T(384, 204, "смазывающие", "k-t k-sm");
    h += T(260, 312, "смазывающее — коротко, по регламенту", "k-t", "middle") + "</g>";
    return h;
  }
  function granule(x, y, r, k, plain) {
    var h = '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" class="k-gran"/>';
    if (!plain) {
      h += '<circle cx="' + (x - r * 0.35).toFixed(1) + '" cy="' + (y - r * 0.2).toFixed(1) + '" r="' + (r * 0.18).toFixed(1) + '" class="k-api"/>';
      h += '<circle cx="' + (x + r * 0.3).toFixed(1) + '" cy="' + (y + r * 0.3).toFixed(1) + '" r="' + (r * 0.16).toFixed(1) + '" class="k-api"/>';
    }
    return h;
  }
  function cluster(x, y, r, k) {
    var h = '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" class="k-liq-soft"/>';
    var off = [[-6, -5], [6, -4], [-4, 6], [7, 6], [0, 0]];
    off.forEach(function (o, i) { h += '<circle cx="' + (x + o[0]) + '" cy="' + (y + o[1]) + '" r="' + (i === 4 ? 4 : 5) + '" class="' + (i % 3 ? "k-exc" : "k-api") + '"/>'; });
    return h;
  }
  function lump(x, y, rx, ry, k) {
    return '<ellipse cx="' + x + '" cy="' + y + '" rx="' + rx + '" ry="' + ry + '" class="k-lump"/>' +
      '<circle cx="' + (x - rx * 0.4) + '" cy="' + (y - 3) + '" r="4" class="k-api"/><circle cx="' + (x + rx * 0.35) + '" cy="' + (y + 4) + '" r="4" class="k-api"/>';
  }
  function sieve(x0, x1, y) {
    return '<path d="M' + x0 + " " + (y - 14) + "V" + (y + 6) + "M" + x1 + " " + (y - 14) + "V" + (y + 6) + '" class="k-line"/><path d="M' + x0 + " " + y + "H" + x1 + '" class="k-sieve"/>';
  }

  /* ---------- 2. Смеситель-гранулятор: импеллер и чоппер ---------- */
  function svgHsg(id) {
    var h = arrowDefs(id);
    // подача раствора и форсунка
    h += '<path d="M150 40H226V60" class="k-pipe"/>';
    h += '<rect x="219" y="58" width="14" height="36" rx="3" class="k-part"' + H(3) + "/>";
    h += "<g" + S("0 3") + ">" + T(240, 54, "форсунка", "k-t") + "</g>";
    h += "<g" + S("0 3") + ">" + T(18, 44, "подача раствора", "k-t k-mut") + "</g>";
    // чаша
    h += '<path d="M150 96V250Q150 286 186 286H334Q370 286 370 250V96" class="k-vessel"/>';
    // влажная масса (3–5)
    h += '<path d="M152 196Q260 182 368 196V250Q368 284 334 284H186Q152 284 152 250Z" class="k-liq-soft"' + S("3 4 5") + "/>";
    // сухая смесь (2–4)
    var mass = scatter(41, 36, 168, 352, 206, 274, 12);
    h += '<g class="mv-sway"' + S("2 3 4") + M("2 3") + ">" + circles(mass, function (k) { return k % 3 ? 5 : 4; }, function (k) { return k % 3 ? "k-exc" : "k-api"; }) + "</g>";
    // циркуляция массы
    h += "<g" + S("2 3") + ">" + arrow(id, "M178 262Q160 216 204 196", "k-arrow k-soft") + arrow(id, "M342 262Q360 216 316 196", "k-arrow k-soft") + "</g>";
    // капли (3)
    h += '<g class="mv-drop"' + S(3) + M(3) + '><circle cx="226" cy="108" r="4" class="k-liq"/><circle cx="226" cy="128" r="4" class="k-liq" style="animation-delay:-.45s"/><circle cx="226" cy="150" r="4" class="k-liq" style="animation-delay:-.9s"/></g>';
    // комки у чоппера (4)
    h += "<g" + S(4) + ">" + lump(318, 230, 16, 12, 1) + lump(300, 256, 13, 10, 2) + '<g class="mv-fly"' + M(4) + '><circle cx="330" cy="212" r="4" class="k-gran"/><circle cx="338" cy="242" r="3.5" class="k-gran"/><circle cx="322" cy="262" r="3" class="k-gran"/></g>' + T(260, 150, "чоппер разбивает комки", "k-t", "middle") + "</g>";
    // гранулы (5–6)
    var gran = scatter(53, 18, 172, 348, 214, 272, 17);
    h += "<g" + S(5) + ">" + gran.map(function (p) { return '<circle cx="' + f1(p[0]) + '" cy="' + f1(p[1]) + '" r="7" class="k-gran"/>'; }).join("") + "</g>";
    h += "<g" + S(6) + ">" + gran.slice(0, 7).map(function (p) { return '<circle cx="' + f1(p[0]) + '" cy="' + f1(p[1] + 6) + '" r="7" class="k-gran"/>'; }).join("") + "</g>";
    // крышка с блокировкой
    h += '<rect x="138" y="82" width="244" height="14" rx="5" class="k-part"' + H(1) + "/>";
    h += "<g" + H(1) + '><path d="M392 84v-6a8 8 0 0 1 16 0v6" class="k-line"/><rect x="388" y="84" width="24" height="16" rx="3" class="k-part"/></g>';
    h += "<g" + S("0 1") + ">" + T(260, 116, "крышка с блокировкой", "k-t k-sm k-mut", "middle") + "</g>";
    // импеллер
    h += '<ellipse cx="260" cy="266" rx="66" ry="9" class="k-dash"' + M("2 3 4 5") + "/>";
    h += "<g" + H(1) + '><path d="M198 266Q260 250 322 266Q260 280 198 266Z" class="k-part"/><circle cx="260" cy="266" r="6" class="k-ink"/></g>';
    h += '<rect x="255" y="286" width="10" height="12" class="k-part"/><rect x="226" y="298" width="68" height="18" rx="4" class="k-part"/>';
    h += "<g" + S("0 1 2") + ">" + T(218, 312, "импеллер и привод", "k-t", "end") + "</g>";
    // чоппер
    h += '<rect x="352" y="195" width="58" height="8" class="k-part"/><rect x="408" y="184" width="40" height="30" rx="4" class="k-part"' + H(4) + "/>";
    h += '<g class="mv-spin-fast"' + M("3 4 5") + H("1 4") + '><circle cx="350" cy="199" r="15" class="k-none"/><path d="M350 184l3 12-3 3-3-3zM350 214l-3-12 3-3 3 3zM335 199l12-3 3 3-3 3zM365 199l-12 3-3-3 3-3z" class="k-blade"/></g>';
    h += "<g" + S("0 1 4") + ">" + T(428, 176, "чоппер", "k-t", "middle") + "</g>";
    // разгрузочный клапан и влажный измельчитель
    h += '<path d="M384 252H444V266" class="k-pipe"/>';
    h += '<rect x="366" y="240" width="18" height="24" rx="3" class="k-valve"' + H(6) + TF(["none", "none", "none", "none", "none", "none", "translate(14px,0)"]) + "/>";
    h += '<rect x="400" y="266" width="104" height="34" rx="6" class="k-part"' + H(6) + "/>" + T(452, 287, "измельчитель", "k-t k-xs", "middle");
    h += "<g" + S("0 6") + ">" + T(462, 228, "разгрузочный", "k-t k-xs", "middle") + T(462, 243, "клапан", "k-t k-xs", "middle") + "</g>";
    h += '<g class="mv-flowx"' + S(6) + M(6) + '><circle cx="394" cy="252" r="4" class="k-gran"/><circle cx="414" cy="252" r="4" class="k-gran" style="animation-delay:-.3s"/><circle cx="432" cy="252" r="4" class="k-gran" style="animation-delay:-.6s"/></g>';
    // статус перед пуском (1)
    h += "<g" + S(1) + '><rect x="180" y="128" width="150" height="54" rx="10" class="k-tagbox"/>' + T(255, 151, "статус «Чистое»", "k-t k-b", "middle") + T(255, 170, "и срок его действия", "k-t k-sm", "middle") + "</g>";
    // график нагрузки (3–5)
    h += "<g" + S("3 4 5") + '><path d="M20 110V226H134" class="k-axis"/>' + T(20, 102, "нагрузка привода", "k-t k-sm") + T(134, 242, "время", "k-t k-sm k-mut", "end") + "</g>";
    h += '<path d="M22 216C42 215 56 208 70 197" class="k-curve"' + S("3 4 5") + "/>";
    h += '<path d="M70 197C86 182 94 160 104 150" class="k-curve"' + S("4 5") + "/>";
    h += '<path d="M104 150C112 143 120 141 132 140" class="k-curve"' + S(5) + "/>";
    h += "<g" + S(5) + '><path d="M104 120V226" class="k-mark"/><circle cx="104" cy="150" r="5" class="k-acc"/>' + T(76, 262, "конечная точка", "k-t k-sm k-b", "middle") + T(76, 278, "по регламенту", "k-t k-sm", "middle") + "</g>";
    return h;
  }

  /* ---------- 3. Кипящий слой ---------- */
  function svgFbd(id) {
    var h = arrowDefs(id);
    // нагреватель и воздуховод
    h += '<rect x="22" y="268" width="92" height="38" rx="6" class="k-part"' + H(2) + "/>" + T(68, 291, "нагреватель", "k-t k-xs", "middle");
    h += '<path d="M114 280H222M114 294H218" class="k-line"/>';
    h += '<g class="mv-flowx"' + S("2 3 4 5") + M("2 3 4 5") + ">" + arrow(id, "M126 287H150", "k-arrow k-heat") + arrow(id, "M166 287H190", "k-arrow k-heat", ' style="animation-delay:-.5s"') + "</g>";
    h += '<circle cx="168" cy="280" r="5" class="k-sensor"' + H(2) + "/>" + "<g" + S("0 2") + ">" + T(168, 266, "T входа", "k-t k-sm", "middle") + "</g>";
    // камера
    h += '<path d="M228 262L196 175V80H324V175L292 262Z" class="k-vessel"/>';
    h += '<path d="M222 262H298L306 294H214Z" class="k-part"/>';
    h += '<path d="M228 262H292" class="k-plate"' + H(1) + "/>";
    // заземление
    h += "<g" + H(1) + '><path d="M306 286H340V300M330 300H350M334 306H346M338 312H342" class="k-line"/></g><g' + S(1) + ">" + T(356, 306, "заземление", "k-t k-sm") + "</g>";
    // поток воздуха вверх через решётку
    h += "<g" + S("2 3 4 5") + ">";
    [240, 260, 280].forEach(function (x, k) { h += arrow(id, "M" + x + " 258V234", "k-arrow k-heat mv-up", M("2 3 4 5") + ' style="animation-delay:' + (-k * 0.35) + 's"'); });
    h += "</g>";
    // продукт: лежит (0–2) и «кипит» (3–6)
    var rest = scatter(5, 22, 232, 288, 238, 256, 8);
    h += "<g" + S("0 1 2") + ">" + circles(rest, 4.5, "k-gran") + "</g>";
    var fl = scatter(8, 22, 218, 302, 160, 246, 14).filter(function (p) { var half = 32 + (262 - p[1]) * (32 / 87); return Math.abs(p[0] - 260) < half - 6; });
    h += "<g" + S("3 4 5 6") + ">" + fl.map(function (p, k) { return '<circle cx="' + f1(p[0]) + '" cy="' + f1(p[1]) + '" r="4.5" class="k-gran mv-bob"' + M("3 4 5") + delays(k) + "/>"; }).join("") + "</g>";
    // рукава
    h += "<g" + H(1) + ">" + [208, 245, 282].map(function (x) { return '<rect x="' + x + '" y="88" width="30" height="54" rx="13" class="k-bag"/>'; }).join("") + "</g>";
    h += "<g" + S("0 1") + ">" + T(260, 70, "фильтровальные рукава", "k-t", "middle") + "</g>";
    // испарение (4)
    h += "<g" + S(4) + ">" + [236, 260, 284].map(function (x, k) { return '<path d="M' + x + ' 196q-7-9 0-18t0-18" class="k-vapor mv-rise"' + M(4) + ' style="animation-delay:' + (-k * 0.5) + 's"/>'; }).join("") + "</g>";
    // отходящий воздух и вентилятор
    h += '<path d="M324 100H400" class="k-pipe"/><circle cx="420" cy="100" r="18" class="k-part"/>';
    h += '<g class="mv-spin"' + M("2 3 4 5") + '><circle cx="420" cy="100" r="14" class="k-none"/><path d="M420 100l0-12a6 6 0 0 1 6 6zM420 100l12 0a6 6 0 0 1-6 6zM420 100l0 12a6 6 0 0 1-6-6zM420 100l-12 0a6 6 0 0 1 6-6z" class="k-blade"/></g>';
    h += arrow(id, "M438 100H476V74", "k-arrow");
    h += "<g" + S("0 2") + ">" + T(420, 134, "вентилятор", "k-t k-sm", "middle") + "</g>";
    h += '<circle cx="364" cy="100" r="5" class="k-sensor"' + H(5) + "/><g" + S("0 5") + ">" + T(364, 86, "T выхода", "k-t k-sm", "middle") + "</g>";
    h += '<g class="mv-flowx"' + S(4) + M(4) + '><path d="M336 108q6-6 12 0t12 0" class="k-vapor"/><path d="M372 108q6-6 12 0t12 0" class="k-vapor" style="animation-delay:-.6s"/></g>';
    // датчик температуры продукта
    h += '<path d="M202 224H218" class="k-line"/><circle cx="218" cy="224" r="5" class="k-sensor"' + H(5) + "/><g" + S("0 5") + ">" + T(196, 229, "T продукта", "k-t k-sm", "end") + "</g>";
    // график (4–6)
    h += "<g" + S("4 5 6") + '><path d="M366 160V250H506" class="k-axis"/>' + T(366, 152, "температура", "k-t k-sm") + T(506, 266, "время", "k-t k-sm k-mut", "end");
    h += '<path d="M362 284H380" class="k-curve"/>' + T(386, 288, "продукт", "k-t k-xs") + '<path d="M362 302H380" class="k-curve k-curve2"/>' + T(386, 306, "выход воздуха", "k-t k-xs") + "</g>";
    h += '<path d="M369 230C400 228 420 228 440 227" class="k-curve"' + S("4 5 6") + '/><path d="M369 206C400 211 420 211 440 210" class="k-curve k-curve2"' + S("4 5 6") + "/>";
    h += '<path d="M440 227C462 224 482 202 502 188" class="k-curve"' + S("5 6") + '/><path d="M440 210C462 206 482 186 502 172" class="k-curve k-curve2"' + S("5 6") + "/>";
    h += "<g" + S(4) + ">" + T(436, 180, "тепло уходит", "k-t k-sm", "middle") + T(436, 196, "на испарение", "k-t k-sm", "middle") + "</g>";
    // проба на влажность (6)
    h += "<g" + S(6) + ">" + arrow(id, "M232 222Q190 214 170 214", "k-arrow k-strong") + '<path d="M150 198h16v28a4 4 0 0 1-4 4h-8a4 4 0 0 1-4-4z" class="k-part"/><rect x="148" y="194" width="20" height="6" rx="2" class="k-ink"/>';
    h += '<rect x="20" y="186" width="112" height="44" rx="8" class="k-tagbox"/>' + T(76, 205, "анализатор", "k-t k-sm k-b", "middle") + T(76, 221, "влажности", "k-t k-sm k-b", "middle");
    h += T(76, 248, "потеря в массе", "k-t k-xs", "middle") + T(76, 263, "при высушивании", "k-t k-xs", "middle") + "</g>";
    return h;
  }

  /* ---------- 4. Сухая грануляция: роликовое уплотнение ---------- */
  function svgRc(id) {
    var h = arrowDefs(id);
    h += '<clipPath id="' + id + '-tube"><rect x="56" y="106" width="148" height="32" rx="6"/></clipPath>';
    // бункер
    h += '<path d="M28 40H132L96 106H64Z" class="k-vessel"' + H(1) + "/>" + T(80, 30, "бункер", "k-t", "middle");
    h += circles(scatter(3, 14, 52, 108, 52, 92, 9).filter(function (p) { return Math.abs(p[0] - 80) < 44 - (p[1] - 40) * 0.42; }), 4, "k-exc");
    // шнек
    h += '<rect x="54" y="104" width="152" height="36" rx="7" class="k-part"' + H(1) + "/>";
    var z = "M50 109";
    for (var x = 50; x < 222; x += 20) z += "L" + (x + 10) + " 135L" + (x + 20) + " 109";
    h += '<g clip-path="url(#' + id + '-tube)"><path d="M58 122H204" class="k-line"/><path d="' + z + '" class="k-flight mv-screw"' + M(1) + "/></g>";
    h += "<g" + S("0 1") + ">" + T(130, 162, "подающий шнек", "k-t", "middle") + "</g>";
    h += '<g class="mv-flowx"' + S(1) + M(1) + '><circle cx="210" cy="118" r="3.5" class="k-exc"/><circle cx="214" cy="128" r="3.5" class="k-exc" style="animation-delay:-.5s"/></g>';
    // валки
    h += "<g" + H(2) + '><circle cx="240" cy="90" r="30" class="k-roll"/><circle cx="240" cy="154" r="30" class="k-roll"/></g>';
    h += '<circle cx="240" cy="90" r="19" class="k-dash mv-spin"' + M("2 3 4") + '/><circle cx="240" cy="154" r="19" class="k-dash mv-spin-rev"' + M("2 3 4") + "/>";
    h += '<circle cx="240" cy="90" r="4" class="k-ink"/><circle cx="240" cy="154" r="4" class="k-ink"/>';
    h += "<g" + S("0 2") + ">" + arrow(id, "M240 30V54", "k-arrow k-strong") + arrow(id, "M240 214V190", "k-arrow k-strong") + T(254, 40, "усилие", "k-t") + "</g>";
    h += "<g" + S(2) + '><path d="M296 168L250 124" class="k-leader"/>' + T(300, 180, "зазор", "k-t k-b") + "</g>";
    // лента
    h += '<rect x="262" y="117" width="80" height="10" rx="2" class="k-ribbon"' + H(3) + "/>";
    h += "<g" + S("0 3") + ">" + T(302, 108, "лента", "k-t", "middle") + "</g>";
    h += "<g" + S(3) + '><path d="M300 128L240 228M320 128L340 228" class="k-leader"/><rect x="180" y="228" width="180" height="50" rx="6" class="k-ribbon"/>';
    h += '<rect x="180" y="228" width="180" height="10" rx="4" class="k-ribbon-edge"/><rect x="180" y="268" width="180" height="10" rx="4" class="k-ribbon-edge"/>';
    h += T(270, 258, "плотная середина", "k-t k-sm", "middle") + T(370, 238, "края", "k-t k-sm") + T(370, 254, "рыхлее", "k-t k-sm") + "</g>";
    // гранулятор с ситом
    h += '<rect x="342" y="100" width="88" height="100" rx="10" class="k-vessel"' + H(4) + "/>";
    h += '<g class="mv-spin"' + M(4) + '><circle cx="386" cy="146" r="22" class="k-part"/><path d="M386 126V166M366 146H406" class="k-line"/></g>';
    h += '<path d="M346 192H426" class="k-sieve"/>';
    h += "<g" + S("0 4") + ">" + T(386, 90, "гранулятор с ситом", "k-t", "middle") + "</g>";
    // приёмный контейнер
    h += '<path d="M346 234V300H426V234" class="k-vessel"' + S("0 1 2 4 5") + "/>";
    var gr = scatter(19, 12, 356, 416, 256, 292, 12);
    h += "<g" + S("0 4 5") + ">" + circles(gr, 5.5, "k-gran") + "</g>";
    h += '<g class="mv-fall"' + S(4) + M(4) + '><circle cx="370" cy="212" r="4.5" class="k-gran"/><circle cx="392" cy="218" r="4.5" class="k-gran" style="animation-delay:-.4s"/><circle cx="410" cy="210" r="4.5" class="k-gran" style="animation-delay:-.8s"/></g>';
    // мелочь и возврат (5)
    h += "<g" + S(5) + ">" + circles(scatter(29, 14, 354, 418, 246, 294, 8), 2.2, "k-fines") + T(436, 262, "мелочь", "k-t k-b");
    h += arrow(id, "M346 290H16V64H30", "k-arrow k-return");
    h += T(186, 312, "возврат — только если предусмотрен регламентом", "k-t k-xs", "middle") + "</g>";
    return h;
  }

  /* ---------- 5. Цикл таблеточного пресса ---------- */
  function svgPress(id) {
    var h = arrowDefs(id);
    // ротор, вид сверху
    h += '<circle cx="75" cy="95" r="48" class="k-part"/><circle cx="75" cy="95" r="12" class="k-ink"/>';
    for (var a = 0; a < 12; a++) {
      var ang = a * Math.PI / 6;
      h += '<circle cx="' + f1(75 + 34 * Math.sin(ang)) + '" cy="' + f1(95 - 34 * Math.cos(ang)) + '" r="4.5" class="k-die"/>';
    }
    for (var st = 1; st <= 6; st++) {
      var t = (st - 1) * Math.PI / 3;
      h += '<text x="' + f1(75 + 62 * Math.sin(t)) + '" y="' + f1(99 - 62 * Math.cos(t)) + '" class="k-t k-sm k-b" text-anchor="middle"' + H(String(st)) + ">" + st + "</text>";
    }
    h += '<g class="k-rotor"' + TF(["rotate(0deg)", "rotate(0deg)", "rotate(60deg)", "rotate(120deg)", "rotate(180deg)", "rotate(240deg)", "rotate(300deg)"]) + '><circle cx="75" cy="95" r="48" class="k-none"/><circle cx="75" cy="61" r="7" class="k-acc"/></g>';
    h += "<g" + S(0) + ">" + T(75, 178, "ротор, вид сверху", "k-t k-sm k-mut", "middle") + "</g>";
    // верхний пуансон (кончик в 0)
    h += '<g class="k-move"' + TF(["translate(0,110px)", "translate(0,110px)", "translate(0,110px)", "translate(0,182px)", "translate(0,196px)", "translate(0,96px)", "translate(0,96px)"]) + '><rect x="254" y="-96" width="32" height="96" rx="2" class="k-punch"/><rect x="246" y="-108" width="48" height="13" rx="3" class="k-punch"/></g>';
    // ролики предварительного и основного прессования
    h += "<g" + S(3) + '><circle cx="270" cy="58" r="16" class="k-roll"/><circle cx="270" cy="308" r="12" class="k-roll"/></g>';
    h += "<g" + S(4) + '><circle cx="270" cy="62" r="26" class="k-roll"/><circle cx="270" cy="306" r="14" class="k-roll"/></g>';
    // нижний пуансон (верх в 0)
    h += '<g class="k-move"' + TF(["translate(0,228px)", "translate(0,228px)", "translate(0,214px)", "translate(0,214px)", "translate(0,210px)", "translate(0,170px)", "translate(0,170px)"]) + '><rect x="254" y="0" width="32" height="72" rx="2" class="k-punch"/><rect x="246" y="70" width="48" height="12" rx="3" class="k-punch"/></g>';
    // масса в матрице и таблетка
    h += '<rect x="250" y="0" width="40" height="100" class="k-powder k-move"' + S("0 1 2 3") + TF(["translate(0,165px) scale(1,.63)", "translate(0,165px) scale(1,.63)", "translate(0,170px) scale(1,.44)", "translate(0,182px) scale(1,.32)", "translate(0,196px) scale(1,.14)"]) + "/>";
    h += '<rect x="252" y="0" width="36" height="14" rx="5" class="k-tablet k-move"' + S("4 5 6") + TF(["translate(0,196px)", "translate(0,196px)", "translate(0,196px)", "translate(0,196px)", "translate(0,196px)", "translate(0,156px)", "translate(122px,162px)"]) + "/>";
    // стол матриц
    h += '<rect x="166" y="170" width="84" height="60" rx="3" class="k-table"/><rect x="290" y="170" width="84" height="60" rx="3" class="k-table"/>';
    h += "<g" + S(0) + ">" + T(320, 250, "матрица", "k-t k-sm", "middle") + T(304, 66, "верхний пуансон", "k-t k-sm") + T(300, 306, "нижний пуансон", "k-t k-sm") + "</g>";
    // питатель (0–1)
    h += "<g" + S("0 1") + '><rect x="196" y="148" width="148" height="20" rx="5" class="k-feeder"/>' + circles(scatter(61, 12, 204, 336, 152, 164, 10), 3, "k-exc") + T(384, 162, "питатель", "k-t") + "</g>";
    // дозирование (2)
    h += "<g" + S(2) + '><path d="M300 168L332 148" class="k-blade-line"/><g class="mv-flowx"' + M(2) + '><circle cx="304" cy="163" r="3" class="k-exc"/><circle cx="314" cy="160" r="3" class="k-exc" style="animation-delay:-.5s"/></g>' + T(384, 186, "лишнее", "k-t") + T(384, 204, "снимается", "k-t") + "</g>";
    // воздух (3)
    h += "<g" + S(3) + ">" + arrow(id, "M246 176Q236 160 226 150", "k-arrow k-soft mv-up", M(3)) + arrow(id, "M294 176Q304 160 314 150", "k-arrow k-soft mv-up", M(3) + ' style="animation-delay:-.4s"') + T(384, 186, "уходит", "k-t") + T(384, 204, "воздух", "k-t") + "</g>";
    // основное прессование (4)
    h += "<g" + S(4) + ">" + T(384, 186, "усилие →", "k-t k-b") + T(384, 204, "прочность", "k-t") + T(384, 222, "и толщина", "k-t") + "</g>";
    // выталкивание (5)
    h += "<g" + S(5) + ">" + arrow(id, "M232 296V250", "k-arrow k-strong") + T(384, 186, "таблетка", "k-t") + T(384, 204, "выходит", "k-t") + T(384, 222, "на стол", "k-t") + "</g>";
    // съём (6)
    h += "<g" + S(6) + '><path d="M296 150L318 168" class="k-blade-line"/><path d="M374 172L470 190" class="k-line"/>' + T(384, 218, "обеспыливатель,", "k-t k-sm") + T(384, 236, "металлодетектор", "k-t k-sm") + "</g>";
    return h;
  }

  /* ---------- 6. Поток материала и статусы ---------- */
  function svgFlow(id) {
    var h = '<defs><marker id="' + id + '-ar" viewBox="0 0 10 10" refX="8" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" class="k-arhead"/></marker>' +
      '<pattern id="' + id + '-hq" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" class="k-q-bg"/><rect width="3" height="8" class="k-q-line"/></pattern>' +
      '<pattern id="' + id + '-hr" width="9" height="9" patternUnits="userSpaceOnUse"><rect width="9" height="9" class="k-r-bg"/><path d="M0 0L9 9M9 0L0 9" class="k-r-line"/></pattern></defs>';
    function box(x, y, w, hh, cls, title, sub, steps, icon, fill) {
      return "<g" + H(steps) + '><rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + hh + '" rx="12" class="k-box ' + cls + '"' + (fill ? ' style="fill:url(#' + id + "-" + fill + ')"' : "") + "/>" +
        T(x + (icon ? 32 : 12), y + 27, title, "k-t k-b" + (icon ? " k-caps" : " k-sm")) + T(x + 12, y + 46, sub, "k-t k-xs") + (icon ? icon(x + 19, y + 22) : "") + "</g>";
    }
    function iQ(x, y) { return '<path d="M' + (x - 6) + " " + (y - 8) + "h12l-12 16h12z" + '" class="k-ico"/>'; }
    function iOk(x, y) { return '<circle cx="' + x + '" cy="' + y + '" r="9" class="k-ico"/><path d="M' + (x - 4) + " " + y + "l3 3 5-6" + '" class="k-ico"/>'; }
    function iNo(x, y) { return '<circle cx="' + x + '" cy="' + y + '" r="9" class="k-ico"/><path d="M' + (x - 4) + " " + (y - 4) + "l8 8m0-8l-8 8" + '" class="k-ico"/>'; }
    h += box(10, 36, 122, 66, "", "Приёмка", "осмотр, номер", "1");
    h += box(168, 28, 152, 82, "k-q", "Карантин", "не использовать", "2", iQ, "hq");
    h += box(356, 36, 154, 66, "", "Служба качества", "пробы, испытания", "3");
    h += box(356, 150, 154, 66, "k-ok", "Разрешено", "можно выдавать", "4", iOk);
    h += box(356, 252, 154, 58, "", "Весовая", "маркировка", "5");
    h += box(168, 150, 152, 66, "k-no", "Забраковано", "не использовать", "6", iNo, "hr");
    h += box(168, 252, 152, 58, "", "Изоляция", "возврат, уничтожение", "6");
    function ar(d, steps) { return '<path d="' + d + '" class="k-arrow k-flow"' + H(steps) + ' marker-end="url(#' + id + '-ar)"/>'; }
    h += ar("M134 69H164", "2") + ar("M322 69H352", "3") + ar("M433 104V146", "4") + ar("M433 218V248", "5") + ar("M380 104V126H244V146", "6") + ar("M244 218V248", "6");
    // ярлык статуса на таре
    function badge(cls, icon) { return '<circle cx="0" cy="0" r="13" class="k-badge ' + cls + '"/>' + icon; }
    var pos = ["translate(320px,28px)", "translate(132px,36px)", "translate(320px,28px)", "translate(510px,36px)", "translate(510px,150px)", "translate(510px,252px)", "translate(510px,252px)"];
    h += '<g class="k-move"' + S("0 1 2 3 4 5") + TF(pos) + ">";
    h += "<g" + S("0 1 2 3") + ">" + badge("k-q", '<path d="M-5-6h10l-10 12h10z" class="k-badge-i"/>') + "</g>";
    h += "<g" + S("4 5") + ">" + badge("k-ok", '<path d="M-5 0l3 3 6-7" class="k-badge-i"/>') + "</g></g>";
    h += '<g class="k-move"' + S(6) + TF(["translate(320px,150px)"]) + ">" + badge("k-no", '<path d="M-4-4l8 8m0-8l-8 8" class="k-badge-i"/>') + "</g>";
    return h;
  }

  /* ---------- Тексты схем ---------- */
  var SCHEMES = [
    { id: "wet", lesson: "g-wet", svg: svgWet,
      title: "Влажная грануляция по стадиям",
      desc: "Как порошковая смесь превращается в гранулят: семь стадий влажной грануляции. Порядок, режимы и время для вашего продукта задаёт регламент.",
      steps: [
        { t: "Сухое смешивание", w: "Компоненты перемешивают без жидкости, чтобы действующее вещество равномерно распределилось по всей массе до увлажнения.", e: "Сократить сухое смешивание «для экономии времени»: неравномерность на следующих стадиях уже не исправить." },
        { t: "Увлажнение связующим", w: "Раствор связующего подают с заданной скоростью при работающем импеллере и, как правило, чоппере. Жидкость смачивает частицы и связывает их между собой.", e: "Подать весь раствор одной порцией: местное переувлажнение и комки." },
        { t: "Массирование", w: "Влажное перемешивание после подачи жидкости: масса уплотняется, частицы собираются в агломераты нужной плотности. Окончание стадии определяют способом из регламента.", e: "Закончить массирование «на глаз», без признака конечной точки из регламента." },
        { t: "Влажное просеивание", w: "Влажную массу пропускают через сито или влажный измельчитель: крупные комки разбиваются, и гранулы затем сохнут равномерно.", e: "Сушить без влажного просеивания, когда оно предусмотрено регламентом." },
        { t: "Сушка", w: "Гранулы сушат в кипящем слое или сушильном шкафу. Конечную точку подтверждают измерением потери в массе при высушивании.", e: "Остановить сушку только по времени, без измерения влажности." },
        { t: "Сухая калибровка", w: "Сухой гранулят пропускают через сито или мельницу: разбиваются агломераты, образовавшиеся при сушке, выравнивается гранулометрический состав.", e: "Работать с ситом, целостность которого не проверена до и после операции." },
        { t: "Опудривание", w: "К грануляту добавляют внешнюю фазу: разрыхлитель (если предусмотрен), скользящие и смазывающие вещества. Смазывающее смешивают коротко, строго по регламенту.", e: "Добавить смазывающее вещество на старте вместе с остальными компонентами." }
      ] },
    { id: "hsg", lesson: "g-equip", svg: svgHsg,
      title: "Смеситель-гранулятор: импеллер и чоппер",
      desc: "Высокоскоростной смеситель-гранулятор в разрезе: чаша, импеллер на дне, чоппер сбоку, форсунка подачи раствора, крышка с блокировкой и разгрузочный клапан.",
      steps: [
        { t: "Проверка перед пуском", w: "Статус «Чистое» и срок его действия, выполненный line clearance, целостность импеллера, чоппера и уплотнений, исправная блокировка крышки, правильная программа на панели.", e: "Пуск без проверки статуса «Чистое» и срока его действия." },
        { t: "Сухое перемешивание", w: "Импеллер вращается у дна и поднимает массу вдоль стенок чаши: компоненты перемешиваются без жидкости.", e: "Загрузить компоненты не в том порядке, который указан в регламенте." },
        { t: "Подача связующего", w: "Раствор подают через форсунку или воронку с заданной скоростью при работающих импеллере и чоппере. Фактическое количество и время записывают.", e: "Подогнать скорость подачи раствора и не записать изменение." },
        { t: "Работа чоппера", w: "Чоппер быстро вращается сбоку и разбивает комки, регулируя размер гранул. Его скорость задана регламентом.", e: "Продолжать работу при необычном звуке или вибрации вместо остановки по СОП." },
        { t: "Конечная точка", w: "По мере образования гранул масса уплотняется, и нагрузка привода импеллера растёт, выходя на характерный уровень. Конечную точку определяют способом из регламента.", e: "Промолчать, если конечная точка достигнута заметно раньше или позже, чем по регламенту: это отклонение." },
        { t: "Выгрузка", w: "Открывают разгрузочный клапан, и влажная масса уходит во влажный измельчитель. Время хранения влажной массы ограничено регламентом.", e: "Оставить влажную массу в таре дольше разрешённого времени." }
      ] },
    { id: "fbd", lesson: "g-control", svg: svgFbd,
      title: "Сушка в кипящем слое",
      desc: "Сушилка с кипящим (псевдоожиженным) слоем: нагретый воздух поднимается через перфорированное дно, продукт сверху задерживают фильтровальные рукава.",
      steps: [
        { t: "Проверка перед пуском", w: "Проверяют целостность и правильную установку рукавов, целостность дна контейнера, уплотнения и подключённое заземление: мелкая пыль горюча.", e: "Установить повреждённый рукав или рукав другого продукта." },
        { t: "Подача нагретого воздуха", w: "Воздух проходит через нагреватель и снизу через перфорированное дно попадает в продукт. Контролируют температуру воздуха на входе и расход воздуха.", e: "Продолжать сушку при срабатывании сигнализации установки." },
        { t: "Псевдоожижение", w: "Поток воздуха поднимает и перемешивает частицы: слой «кипит», и каждая гранула омывается воздухом. Характер псевдоожижения видно в смотровом окне.", e: "Не заметить, что слой «кипит» неравномерно, и продолжать как обычно." },
        { t: "Испарение влаги", w: "Пока свободной влаги много, тепло уходит на испарение, и температура продукта держится относительно низкой. Влажный воздух уходит через рукава.", e: "Игнорировать рост перепада давления на фильтрах." },
        { t: "Рост температуры", w: "Когда свободной влаги становится мало, температура продукта и отходящего воздуха начинает расти. Это признак приближения к концу сушки, но не доказательство нужной влажности.", e: "Прекратить сушку только по времени или по ощущению." },
        { t: "Проба на влажность", w: "Пробу отбирают в указанных местах, сразу закрывают и без задержки определяют потерю в массе при высушивании. Результат сравнивают с пределами из регламента.", e: "Повторять измерение, пока не получится «нужный» результат." }
      ] },
    { id: "rc", lesson: "g-dry", svg: svgRc,
      title: "Сухая грануляция: роликовое уплотнение",
      desc: "Компактор: шнек подаёт порошок в зазор между валками, валки сжимают его в ленту, гранулятор с ситом измельчает ленту в гранулы.",
      steps: [
        { t: "Подача шнеком", w: "Подающий шнек направляет порошок из бункера в зазор между валками. От равномерности подачи зависит плотность ленты.", e: "Неравномерная подача порошка в шнек." },
        { t: "Уплотнение между валками", w: "Валки сжимают порошок с заданным усилием при заданном зазоре и скорости вращения. Значения задаёт регламент, оператор следит за их стабильностью.", e: "Изменить усилие валков, чтобы уменьшить мелочь, без согласования." },
        { t: "Лента", w: "Внешний вид ленты — быстрый признак качества: без расслоения, трещин и рыхлых краёв. По краям лента обычно рыхлее, чем в середине.", e: "Не обращать внимания на утечку порошка мимо валков." },
        { t: "Измельчение", w: "Ленту измельчают в грануляторе с ситом заданного размера. Оператор следит за долей мелкой фракции и нагревом.", e: "Работать с ситом, целостность которого не проверена." },
        { t: "Мелкая фракция", w: "Мелочь после измельчения неизбежна. Возвращать её на повторное уплотнение можно, только если это предусмотрено регламентом.", e: "Вернуть мелочь в процесс, когда регламент этого не предусматривает." }
      ] },
    { id: "press", lesson: "tableting", svg: svgPress,
      title: "Цикл таблеточного пресса",
      desc: "Цикл одной таблетки на роторном прессе: матрица проходит станции заполнения, дозирования, предварительного и основного прессования, выталкивания и съёма.",
      steps: [
        { t: "Заполнение", w: "Нижний пуансон опущен, матрица проходит под питателем и заполняется гранулятом с избытком.", e: "Дать бункеру опустеть, пока оператор занят записями." },
        { t: "Дозирование", w: "Нижний пуансон поднимается до заданного уровня, лишнее выталкивается и снимается. Глубина заполнения в первую очередь задаёт массу таблетки.", e: "Скорректировать глубину заполнения и не записать изменение." },
        { t: "Предварительное прессование", w: "Ролики предварительного прессования сближают пуансоны: из массы уходит воздух. Недостаточное предварительное прессование — одна из причин капинга и расслаивания.", e: "Поднять скорость ротора выше разрешённой, чтобы «нагнать план»." },
        { t: "Основное прессование", w: "Основные ролики сближают пуансоны, и формируется таблетка. При прочих равных большее усилие даёт более прочную и тонкую таблетку.", e: "Поднять усилие прессования, чтобы «вылечить» капинг, без согласования." },
        { t: "Выталкивание", w: "Верхний пуансон уходит вверх, нижний поднимается и выталкивает таблетку на уровень стола матриц.", e: "Работать пуансоном со сколом «до конца серии»." },
        { t: "Съём", w: "Съёмник направляет таблетку в лоток; дальше таблетки обычно проходят обеспыливатель и металлодетектор.", e: "Вернуть таблетки, полученные при настройке, в общий поток." }
      ] },
    { id: "flow", lesson: "weighing", svg: svgFlow,
      title: "Поток материала: карантин, разрешено, забраковано",
      desc: "Путь материала от приёмки до весовой. Статус показан цветом, значком и надписью; цвет и вид этикеток на вашем участке задаёт СОП предприятия.",
      steps: [
        { t: "Приёмка", w: "Проверяют целостность упаковки и пломб, этикетки поставщика, документы. Материалу присваивают внутренний номер и статус «Карантин».", e: "Пересыпать сырьё из повреждённого мешка без уведомления мастера." },
        { t: "Карантин", w: "Материал хранят отдельно — физически или с блокировкой в учётной системе. Пока нет решения, использовать его нельзя.", e: "Взять материал из карантина, «потому что анализ точно будет хороший»." },
        { t: "Решение службы качества", w: "Отбирают пробы и проводят испытания. Решение о статусе принимает служба контроля качества, а не оператор.", e: "Решить вопрос о пригодности самому, не дожидаясь службы качества." },
        { t: "Разрешено", w: "Материал можно выдавать в производство — в пределах срока годности или даты переконтроля.", e: "Выдать материал с истёкшим сроком годности или датой переконтроля." },
        { t: "Взвешивание", w: "В весовой работают с одним материалом за раз. Навеску маркируют, правильность материала и массы подтверждает второй человек или электронная система.", e: "Использовать один совок для нескольких веществ." },
        { t: "Забраковано", w: "Если материал не соответствует требованиям, он получает статус «Забраковано»: его изолируют до возврата или уничтожения.", e: "Хранить забракованный материал рядом с разрешённым без изоляции." }
      ] }
  ];
  var BY_LESSON = {}, BY_ID = {};
  SCHEMES.forEach(function (s) { BY_LESSON[s.lesson] = s; BY_ID[s.id] = s; });

  // применить шаг к строке SVG (для статичного вывода)
  function staticize(svg, step) {
    function has(list) { return (" " + list + " ").indexOf(" " + step + " ") !== -1; }
    return svg
      .replace(/data-s="([^"]*)"/g, function (m, l) { return m + (has(l) ? " data-on" : ""); })
      .replace(/data-h="([^"]*)"/g, function (m, l) { return m + (has(l) ? " data-hon" : ""); })
      .replace(/data-tf="([^"]*)"/g, function (m, l) { var a = l.split("|"); return m + ' style="transform:' + (a[Math.min(step, a.length - 1)]) + '"'; });
  }

  var ICON = {
    restart: '<path d="M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4"/>',
    prev: '<path d="M15 5l-7 7 7 7"/>',
    next: '<path d="M9 5l7 7-7 7"/>',
    play: '<path class="i-play" d="M8 5v14l11-7z"/><path class="i-pause" d="M8 5v14M16 5v14"/>'
  };
  function btn(act, label, extra) {
    return '<button type="button" class="sc-btn sc-' + act + '" data-sc="' + act + '" aria-label="' + label + '" title="' + label + '"' + (extra || "") + '><svg viewBox="0 0 24 24" aria-hidden="true">' + ICON[act] + "</svg></button>";
  }

  function html(s, headingTag) {
    var id = "sc-" + s.id, n = s.steps.length, tag = headingTag || "h2";
    var h = '<figure class="scheme" id="shema" data-scheme="' + s.id + '" data-step="0" data-n="' + n + '" aria-labelledby="' + id + '-h">';
    h += '<div class="sc-head"><span class="sc-kicker">Интерактивная схема · ' + n + " " + (n < 5 ? "стадии" : "стадий") + "</span><" + tag + ' class="sc-title" id="' + id + '-h">' + esc(s.title) + "</" + tag + "></div>";
    h += '<div class="sc-body"><div class="sc-stage">';
    h += '<svg class="sc-svg" viewBox="0 0 520 320" role="img" aria-label="Схема: ' + esc(s.title) + '" aria-labelledby="' + id + "-t " + id + '-d"><title id="' + id + '-t">' + esc(s.title) + '</title><desc id="' + id + '-d">' + esc(s.desc) + " Стадии: " + esc(s.steps.map(function (x, i) { return (i + 1) + ". " + x.t; }).join("; ")) + ".</desc>";
    h += staticize(s.svg(id), 0) + "</svg>";
    h += '<div class="sc-ui" role="group" aria-label="Управление схемой"><div class="sc-status"><span class="sc-count num">Обзор</span><b class="sc-label" aria-live="polite">' + esc(s.title) + '</b></div>';
    h += '<div class="sc-btns">' + btn("restart", "Заново") + btn("prev", "Шаг назад", " disabled") + btn("play", "Пуск", ' aria-pressed="false"') + btn("next", "Шаг вперёд") + "</div>";
    h += '<div class="sc-prog" aria-hidden="true"><i></i></div></div></div>';
    h += '<figcaption class="sc-cap"><p class="sc-desc">' + esc(s.desc) + '</p><ol class="sc-steps">';
    s.steps.forEach(function (st, i) {
      h += '<li data-i="' + (i + 1) + '"><button type="button" class="sc-go" data-sc="go" data-i="' + (i + 1) + '"><span class="sc-n num">' + (i + 1) + "</span><span>" + esc(st.t) + "</span></button>";
      h += '<div class="sc-more"><p><span class="sc-k">Что происходит и зачем</span>' + esc(st.w) + '</p><p class="sc-err"><span class="sc-k">Типичная ошибка</span>' + esc(st.e) + "</p></div></li>";
    });
    return h + "</ol></figcaption></div></figure>";
  }

  var API = { forLesson: function (id) { return BY_LESSON[id] || null; }, html: html, list: SCHEMES };

  if (!IS_NODE) {
    var RM = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
    var STEP_MS = 6500;
    var io = "IntersectionObserver" in window ? new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (!e.isIntersecting && e.target._sc && e.target._sc.playing) pause(e.target); });
    }, { threshold: 0.15 }) : null;

    var has = function (list, i) { return (" " + list + " ").indexOf(" " + i + " ") !== -1; };
    var go = function (fig, i) {
      var st = fig._sc, s = BY_ID[fig.getAttribute("data-scheme")];
      i = Math.max(0, Math.min(st.n, i));
      st.i = i;
      fig.setAttribute("data-step", i);
      fig.querySelectorAll("[data-s]").forEach(function (el) { el.toggleAttribute("data-on", has(el.getAttribute("data-s"), i)); });
      fig.querySelectorAll("[data-h]").forEach(function (el) { el.toggleAttribute("data-hon", has(el.getAttribute("data-h"), i)); });
      fig.querySelectorAll("[data-m]").forEach(function (el) { el.toggleAttribute("data-mon", has(el.getAttribute("data-m"), i)); });
      fig.querySelectorAll("[data-tf]").forEach(function (el) { var a = el.getAttribute("data-tf").split("|"); el.style.transform = a[Math.min(i, a.length - 1)]; });
      fig.querySelectorAll(".sc-steps li").forEach(function (li) {
        var on = +li.getAttribute("data-i") === i;
        li.classList.toggle("cur", on);
        li.classList.toggle("past", +li.getAttribute("data-i") < i);
        var b = li.querySelector(".sc-go");
        if (on) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
      });
      fig.querySelector(".sc-count").textContent = i ? "Шаг " + i + " из " + st.n : "Обзор";
      fig.querySelector(".sc-label").textContent = i ? s.steps[i - 1].t : s.title;
      fig.querySelector(".sc-prog i").style.transform = "scaleX(" + (i / st.n) + ")";
      fig.querySelector('[data-sc="prev"]').disabled = i === 0;
      fig.querySelector('[data-sc="next"]').disabled = i === st.n;
    };
    var schedule = function (fig) {
      var st = fig._sc;
      clearTimeout(st.timer);
      if (!st.playing) return;
      st.timer = setTimeout(function () {
        if (!fig.isConnected) return;
        if (st.i < st.n) { go(fig, st.i + 1); schedule(fig); } else pause(fig);
      }, st.i === 0 ? 700 : STEP_MS);
    };
    var play = function (fig) {
      var st = fig._sc;
      if (st.i >= st.n) go(fig, 0);
      st.playing = true;
      fig.classList.add("is-playing");
      var b = fig.querySelector('[data-sc="play"]');
      b.setAttribute("aria-pressed", "true"); b.setAttribute("aria-label", "Пауза"); b.title = "Пауза";
      schedule(fig);
    };
    var pause = function (fig) {
      var st = fig._sc;
      st.playing = false; clearTimeout(st.timer);
      fig.classList.remove("is-playing");
      var b = fig.querySelector('[data-sc="play"]');
      b.setAttribute("aria-pressed", "false"); b.setAttribute("aria-label", "Пуск"); b.title = "Пуск";
    };
    var onClick = function (e) {
      var b = e.target.closest("[data-sc]"); if (!b) return;
      var fig = b.closest(".scheme"), st = fig._sc, a = b.getAttribute("data-sc");
      if (a === "play") { if (st.playing) pause(fig); else play(fig); return; }
      if (a === "restart") { go(fig, 1); if (!st.playing) play(fig); else schedule(fig); return; }
      if (a === "prev") go(fig, st.i - 1);
      if (a === "next") go(fig, st.i + 1);
      if (a === "go") go(fig, +b.getAttribute("data-i") === st.i ? 0 : +b.getAttribute("data-i"));
      if (st.playing) schedule(fig);
    };
    var onKey = function (e) {
      if (e.target.closest("input, textarea")) return;
      var fig = e.currentTarget, st = fig._sc;
      if (e.key === "ArrowRight") { go(fig, st.i + 1); if (st.playing) schedule(fig); e.preventDefault(); }
      else if (e.key === "ArrowLeft") { go(fig, st.i - 1); if (st.playing) schedule(fig); e.preventDefault(); }
    };
    API.init = function (rootEl) {
      (rootEl || document).querySelectorAll(".scheme").forEach(function (fig) {
        if (fig._sc) return;
        fig._sc = { i: 0, n: +fig.getAttribute("data-n"), playing: false, timer: null };
        fig.classList.add("is-live");
        fig.addEventListener("click", onClick);
        fig.addEventListener("keydown", onKey);
        if (io) io.observe(fig);
        go(fig, 0);
      });
    };
    API.reducedMotion = function () { return RM.matches; };
  }

  root.TLF_SCHEMES = API;
})(typeof window !== "undefined" ? window : globalThis);
