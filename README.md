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

## Thông báo Zalo

Hệ thống hỗ trợ gửi thông báo tự động qua Zalo OA cho chủ nhà về hóa đơn quá hạn và lịch bảo trì đến hạn.

Để kích hoạt, cấu hình các biến môi trường sau trong `.env`:

```
ZALO_OA_ACCESS_TOKEN=<token từ Zalo OA>
CRON_SECRET=<chuỗi bí mật tùy chọn>
```

Sau đó, thiết lập một cron job gọi endpoint sau **một lần mỗi ngày** (ví dụ lúc 8 giờ sáng):

```bash
0 8 * * * curl -s "https://<host>/api/cron/notify?secret=$CRON_SECRET"
```

Endpoint trả về JSON: `{ sent, failed, skipped }`.

> Lưu ý: `adminZaloUserId` phải được cấu hình trong bảng `Setting` (qua trang Cài đặt) để hệ thống biết gửi thông báo đến Zalo nào.
