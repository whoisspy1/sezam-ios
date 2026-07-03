# SEZAM Smart Home — iOS (Capacitor)

Обёртка Home Assistant для iOS с ребрендингом **SEZAM** — тот же подход, что и в
Android-версии (`D:\claude\sezam-app`): WebView + инъекция `inject.js`.

Собирается **без Mac** (в облаке через GitHub Actions) и ставится на айфон
**без $99** Apple Developer — через **AltStore / SideStore** с бесплатным Apple ID.

---

## Что внутри

| Файл | Роль |
|---|---|
| `www/index.html`, `www/app.js` | Нативный экран-выбор Онлайн/Локально + языковая полоса TK/RU/EN + редактор адресов (порт с Android) |
| `www/inject.js` | Ребрендинг HA → SEZAM (копия Android-версии + iOS-ветка: плавающая ⚙ для возврата к выбору) |
| `www/logo.txt`, `www/logo_dark.txt` | Логотипы (base64), передаются в инъекцию как data-URI |
| `ios-native/SezamViewController.swift` | Мост: грузит адрес сервера в WebView и вешает inject.js |
| `.github/workflows/build-ios.yml` | Сборка unsigned `.ipa` на macOS-раннере |
| `capacitor.config.json` | appId `com.sezam.smarthome`, разрешена навигация на любой хост HA |

`ios/` и `node_modules/` в репозиторий **не коммитятся** — CI генерирует их сам.

---

## Как собрать IPA (без Mac)

1. Создай **публичный** GitHub-репозиторий (для приватного бесплатные macOS-минуты
   ограничены — публичный проще).
2. Залей в него содержимое этой папки:
   ```bash
   cd D:/claude/sezam-ios
   git init
   git add .
   git commit -m "SEZAM iOS"
   git branch -M main
   git remote add origin https://github.com/<ТВОЙ_ЛОГИН>/<РЕПО>.git
   git push -u origin main
   ```
3. Открой на GitHub вкладку **Actions** → workflow **«Build unsigned iOS IPA»**
   запустится сам после push (или нажми **Run workflow**).
4. Когда сборка позеленеет (~5–10 мин), внизу страницы run’а скачай артефакт
   **`SEZAM-ios-ipa`** — внутри `SEZAM-Smart-Home.ipa`.

> IPA **неподписанный** — это нормально. Подпись ставится на этапе установки
> твоим Apple ID через AltStore.

---

## Как поставить на свой iPhone (без $99)

С твоего **Windows-ПК**:

1. Поставь **AltServer** на Windows: https://altstore.io  (нужен iTunes + iCloud
   из apple.com, не из Microsoft Store).
2. Подключи iPhone кабелем, в AltServer → **Install AltStore** → выбери устройство,
   войди **бесплатным Apple ID**.
3. На iPhone: **Настройки → Основные → VPN и управление устройством** → доверься
   своему сертификату разработчика.
4. Открой на iPhone приложение **AltStore → My Apps → “+”** → выбери
   `SEZAM-Smart-Home.ipa` → установится за минуту.

Готово — на экране появится **SEZAM Smart Home**.

### Ограничения бесплатного Apple ID (это лимиты Apple)
- Приложение живёт **7 дней**, потом AltServer **переподписывает автоматически**,
  пока iPhone в одной Wi-Fi-сети с включённым ПК (AltServer в трее).
- Максимум **3** своих приложения на устройстве.
- Нет пуш-уведомлений.

Не хочешь держать ПК включённым — вместо AltStore есть **SideStore**
(переподписывает прямо с телефона).

---

## Первый запуск

1. Открывается экран-выбор с логотипом SEZAM.
2. Сверху выбери язык (Türkmençe / Русский / English).
3. **⚙ Изменить онлайн-адрес** — по умолчанию уже прописан Nabu Casa; можно сменить.
   **⚙ Изменить локальный адрес** — введи `http://192.168.1.123:8123` (свой IP HA).
4. Жми **ОНЛАЙН** или **ЛОКАЛЬНО** → загрузится Home Assistant уже как SEZAM.
5. Вернуться к выбору сервера — оранжевая **⚙** в правом нижнем углу.

Логин HA сохраняется между запусками (WKWebView хранит cookies/session) —
поставь в HA галку «Keep me logged in».

---

## Обновить приложение (сменить логотип/строки/версию)

Правишь `www/…` → `git commit && git push` → Actions пересобирает IPA →
скачал → переустановил через AltStore. Native-логику менять — в
`ios-native/SezamViewController.swift`.

## Иконка приложения (опционально)

Сейчас иконка стандартная (Capacitor). Чтобы поставить SEZAM-иконку — положи
непрозрачный PNG 1024×1024 и прогони `@capacitor/assets`
(`npx @capacitor/assets generate --ios`) локально/в CI. Apple запрещает
прозрачность в иконке, так что логотип нужно на белом фоне.
