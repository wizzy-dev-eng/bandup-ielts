lynx. – тренажёр IELTS (проект «IELTS as a Way to Assess English Proficiency: How to Prepare for It»)
Курочкин Ярослав, 9А, Ухтинский технический лицей им. Г. В. Рассохина

Сайт: index.html + ielts-data.js (задания) + ielts-ru.js (русский перевод описаний).
Аккаунты и синхронизация: api/app.js (Vercel Function + Postgres/Neon, переменная DATABASE_URL).
Без сервера сайт тоже работает: прогресс хранится в браузере.

Локально: «python -m http.server 8000» в этой папке → http://localhost:8000
(запись голоса в Speaking работает только по http(s)).

Файлы:
  index.html     – сайт (HTML + CSS + JS в одном файле)
  ielts-data.js  – все задания, ключи, скрипты и тексты (на английском)
  ielts-ru.js    – русская версия описаний, советов и раздела «Об экзамене»;
                   экзаменационные материалы намеренно оставлены на английском
  media/         – фон и логотип
  src/, build.py, lighten.py – исходники; пересборка: python3 build.py
