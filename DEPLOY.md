# Публикация сайта «Оператор ТЛФ» (бесплатно)

Готовый сайт лежит в папке `docs/`. Это обычные HTML-файлы: без сервера, без базы данных, без платных сервисов.
Адрес после публикации: **https://avzalbekbozorov506-rgb.github.io/Farm_uroki/**

Всё ниже бесплатно. Если на каком-то шаге сервис попросит банковскую карту или оплату — остановитесь и используйте GitHub Pages (основной вариант), он карту не требует.

---

## 1. GitHub Pages (основной вариант)

Репозиторий `avzalbekbozorov506-rgb/Farm_uroki` уже публичный — это условие бесплатного GitHub Pages.

1. **Слейте изменения в `main`.** Работа сделана в ветке `claude/pharma-training-app-ru-3gj8g9`.
   На github.com откройте репозиторий → вкладка **Pull requests** → **New pull request** →
   base: `main`, compare: `claude/pharma-training-app-ru-3gj8g9` → **Create pull request** → **Merge pull request**.
2. **Включите публикацию из папки `/docs`.** Репозиторий → **Settings** → **Pages** →
   *Build and deployment* → Source: **Deploy from a branch** → Branch: **main**, папка: **/docs** → **Save**.
3. Подождите 1–3 минуты и откройте адрес выше. Ход публикации виден во вкладке **Actions** (задание *pages build and deployment*).
4. Проверьте:
   - https://avzalbekbozorov506-rgb.github.io/Farm_uroki/robots.txt
   - https://avzalbekbozorov506-rgb.github.io/Farm_uroki/sitemap.xml
   - любой несуществующий адрес → должна открыться страница «Страница не найдена».

> Старый файл `index.html` в корне репозитория (прежняя версия сайта) не удалён. После переключения на папку `/docs`
> он перестанет публиковаться, но останется в репозитории. Решение о нём — в `LEGAL_CHECK.md`.

### Как обновлять сайт

1. Правьте исходники в папке `site/` (`data.js`, `data-gran.js`, `app.js`, `style.css`).
2. Выполните `node build.js` (нужен бесплатный Node.js). Сборка перезапишет `docs/`.
3. Зафиксируйте и отправьте изменения в `main` (вместе с `docs/`). GitHub Pages обновится сам.

Не редактируйте файлы в `docs/` вручную: следующая сборка их перезапишет.

---

## 2. Запасные бесплатные варианты

Сайт статический, поэтому подходит любой бесплатный статический хостинг. Канонические ссылки (`canonical`) везде
указывают на адрес GitHub Pages, поэтому зеркало не создаёт дублей в поиске.

**Cloudflare Pages (бесплатный тариф).** dash.cloudflare.com → Workers & Pages → Create → Pages →
Connect to Git → выберите репозиторий → Framework preset: *None*, Build command: *пусто*,
Build output directory: `docs` → Save and Deploy. Адрес будет вида `имя-проекта.pages.dev`.

**Netlify (бесплатный тариф).** app.netlify.com → Add new site → Import an existing project → GitHub →
репозиторий → Build command: *пусто*, Publish directory: `docs` → Deploy. Адрес будет вида `имя.netlify.app`.

---

## 3. Яндекс.Вебмастер (бесплатно)

1. Войдите на https://webmaster.yandex.ru (нужен аккаунт Яндекса) → **Добавить сайт** →
   `https://avzalbekbozorov506-rgb.github.io/Farm_uroki/`.
2. Способ подтверждения: **Мета-тег**. Скопируйте значение `content` из тега вида
   `<meta name="yandex-verification" content="…">`.
3. Откройте `build.js`, впишите значение в `VERIFICATION.yandex`, выполните `node build.js`,
   отправьте изменения в `main`. Тег появится в `<head>` главной страницы (место отмечено комментарием в `docs/index.html`).
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

Весь сайт собран в один файл `docs/all-in-one.html` (CSS, скрипты и шрифты внутри, работает офлайн).
Его можно открыть в браузере с диска или переслать файлом. Этот файл закрыт от индексации (`noindex`),
чтобы не дублировать страницы сайта в поиске. Приватная ссылка на опубликованную копию — в ответе в чате.

## 6. Перед каждой публикацией

- Не добавляйте в репозиторий пароли, токены, фото с производства, названия предприятия, модели оборудования, номера серий, ссылки на внутренние СОП.
- Проверка внешних ресурсов (должно быть пусто):
  `grep -rnE "googleapis|gstatic|cdn|metrika|analytics" docs site --include=*.html --include=*.js --include=*.css`
