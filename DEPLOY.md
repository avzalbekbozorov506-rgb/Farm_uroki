# Публикация сайта «Оператор ТЛФ» (бесплатно)

Готовый сайт лежит в корне репозитория (страницы `.html`, папки `assets/`, `uroki/`, `granulyaciya/`). Это обычные HTML-файлы: без сервера, без базы данных, без платных сервисов.
Адрес после публикации: **https://avzalbekbozorov506-rgb.github.io/Farm_uroki/**

Всё ниже бесплатно. Если на каком-то шаге сервис попросит банковскую карту или оплату — остановитесь и используйте GitHub Pages (основной вариант), он карту не требует.

---

## 1. GitHub Pages (основной вариант)

Сайт публикуется из ветки `main`, папка `/` (корень репозитория) — так GitHub Pages уже был настроен,
менять ничего не нужно. Репозиторий публичный — это условие бесплатного GitHub Pages.

Проверить настройку: репозиторий → **Settings** → **Pages** → *Build and deployment* →
Source: **Deploy from a branch**, Branch: **main**, папка: **/ (root)**.

После каждого изменения в `main` GitHub сам пересобирает сайт за 1–3 минуты. Ход публикации — во вкладке
**Actions** (задание *pages build and deployment*).

Проверьте после публикации:
- https://avzalbekbozorov506-rgb.github.io/Farm_uroki/robots.txt
- https://avzalbekbozorov506-rgb.github.io/Farm_uroki/sitemap.xml
- любой несуществующий адрес → должна открыться страница «Страница не найдена».

### Как обновлять сайт

1. Правьте исходники в папке `site/` (`data.js`, `data-gran.js`, `app.js`, `style.css`).
2. Выполните `node build.js` (нужен бесплатный Node.js). Сборка перезапишет страницы в корне и папки `assets/`, `uroki/`, `granulyaciya/`.
3. Зафиксируйте и отправьте изменения в `main`. GitHub Pages обновится сам.

Не редактируйте сгенерированные `.html` в корне вручную: следующая сборка их перезапишет.

---

## 2. Запасные бесплатные варианты

Сайт статический, поэтому подходит любой бесплатный статический хостинг. Канонические ссылки (`canonical`) везде
указывают на адрес GitHub Pages, поэтому зеркало не создаёт дублей в поиске.

**Cloudflare Pages (бесплатный тариф).** dash.cloudflare.com → Workers & Pages → Create → Pages →
Connect to Git → выберите репозиторий → Framework preset: *None*, Build command: *пусто*,
Build output directory: `/` (корень) → Save and Deploy. Адрес будет вида `имя-проекта.pages.dev`.

**Netlify (бесплатный тариф).** app.netlify.com → Add new site → Import an existing project → GitHub →
репозиторий → Build command: *пусто*, Publish directory: `/` (корень) → Deploy. Адрес будет вида `имя.netlify.app`.

---

> Подробная пошаговая инструкция для Яндекса и Google, включая IndexNow и проверку индексации, — в `SEARCH_SETUP.md`.

## 3. Яндекс.Вебмастер (бесплатно)

1. Войдите на https://webmaster.yandex.ru (нужен аккаунт Яндекса) → **Добавить сайт** →
   `https://avzalbekbozorov506-rgb.github.io/Farm_uroki/`.
2. Способ подтверждения: **Мета-тег**. Скопируйте значение `content` из тега вида
   `<meta name="yandex-verification" content="…">`.
3. Откройте `build.js`, впишите значение в `VERIFICATION.yandex`, выполните `node build.js`,
   отправьте изменения в `main`. Тег появится в `<head>` главной страницы (место отмечено комментарием в `index.html`).
4. Через пару минут после обновления сайта нажмите **Проверить** в Вебмастере.
5. **Индексирование → Файлы Sitemap** → добавьте `https://avzalbekbozorov506-rgb.github.io/Farm_uroki/sitemap.xml`.

## 4. Google Search Console (бесплатно)

1. Откройте https://search.google.com/search-console → **Добавить ресурс** → тип **Ресурс с префиксом в URL**
   (тип «Домен» не подойдёт: для github.io нет доступа к DNS) → `https://avzalbekbozorov506-rgb.github.io/Farm_uroki/`.
2. Способ подтверждения: **HTML-тег**. Скопируйте значение `content` из
   `<meta name="google-site-verification" content="…">`.
3. Впишите его в `VERIFICATION.google` в `build.js`, выполните `node build.js`, отправьте изменения в `main`.
4. Нажмите **Подтвердить**.
5. **Файлы Sitemap** → введите `sitemap.xml` → **Отправить**.

Индексация обычно занимает от нескольких дней до нескольких недель.

---

## 5. Ссылка для шаринга без хостинга

Весь сайт собран в один файл `all-in-one.html` (CSS, скрипты и шрифты внутри, работает офлайн).
Его можно открыть в браузере с диска или переслать файлом. Этот файл закрыт от индексации (`noindex`),
чтобы не дублировать страницы сайта в поиске. Приватная ссылка на опубликованную копию — в ответе в чате.

## 6. Перед каждой публикацией

- Не добавляйте в репозиторий пароли, токены, фото с производства, названия предприятия, модели оборудования, номера серий, ссылки на внутренние СОП.
- Проверка внешних ресурсов (должно быть пусто):
  `grep -rnE "googleapis|gstatic|cdn|metrika|analytics" . --include=*.html --include=*.js --include=*.css`
