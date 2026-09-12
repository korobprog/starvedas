# Релей к Telegram Bot API. Разворачивается на сервере вне блокировки
# (Dokploy 64.130.62.129), потому что Deno Deploy приостановлен по лимитам.
FROM denoland/deno:alpine-2.1.4

WORKDIR /app

COPY telegram-relay.ts ./telegram-relay.ts

RUN deno cache telegram-relay.ts

EXPOSE 8000

# Права точечные: сеть для запросов к Telegram и чтение переменных окружения.
CMD ["run", "--allow-net", "--allow-env", "telegram-relay.ts"]
