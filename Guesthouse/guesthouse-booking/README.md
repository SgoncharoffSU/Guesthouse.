This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Реализованные рабочие сценарии

- регистрация клиента по имени, телефону и паролю;
- вход клиента и администратора, защищенная сессия и выход;
- поиск реально свободных номеров из PostgreSQL по датам и вместимости;
- серверный расчет стоимости и предоплаты;
- создание бронирования с транзакционной проверкой пересечений;
- удержание брони на время оплаты и автоматическое истечение при открытии кабинета;
- тестовая оплата только вне production с идемпотентным платежным событием;
- личный кабинет клиента, повторный переход к оплате и отмена брони;
- защищенная административная панель;
- сводка «Сегодня» из реальных данных;
- просмотр, поиск и изменение статуса бронирований;
- ручная отметка оплаты;
- добавление, изменение и архивирование номеров;
- добавление фотографий по URL;
- создание характеристик;
- создание сезонных цен;
- блокировка номеров на даты;
- просмотр клиентов;
- редактирование основных настроек, правил и юридических текстов;
- журналирование критических административных действий.

## Первый запуск

```bash
cp .env.example .env
npm ci
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

Для PostgreSQL и MinIO можно использовать:

```bash
docker compose up -d db minio
```

После seed вход администратора:

- телефон: `+79990000000`;
- пароль: значение `DEV_ADMIN_PASSWORD` из `.env`, по умолчанию только в development `ChangeMe123!`.

Перед production обязательно замените `AUTH_SECRET`, пароль администратора и отключите демонстрационный seed.

## Проверка проекта

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

В изолированной среде генерация Prisma может завершиться ошибкой DNS при обращении к `binaries.prisma.sh`. Это инфраструктурная ошибка загрузки бинарного движка. Повторите `npx prisma generate` в среде с доступом в интернет, затем запустите build.
