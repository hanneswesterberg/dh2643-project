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

## Browser end-to-end tests

The Playwright suite runs against a production Next.js build and tests signup,
login, profile editing, and the handoff to a ticket-provider page. Run it against
a disposable backend/test database that has at least one event with coordinates
and an HTTPS ticket URL:

```bash
npx playwright install chromium
E2E_API_URL=http://localhost:8000 npm run test:e2e
```

The test build starts on `http://localhost:3000`, so stop any frontend already
using that port before running the suite. If you choose another `E2E_BASE_URL`,
allow that origin in the test backend's CORS and CSRF trusted-origin settings.

Optionally set `E2E_TICKET_EVENT_ID` to select a specific event. The browser
checkout step intercepts the provider URL with a local test page; it does not
visit the real ticket site or make a purchase. The test creates a unique account,
saves the fixture event to that account, and deletes the account afterward
(which also removes the saved-event relation). The test server build points
frontend API calls and Next.js event/media rewrites at `E2E_API_URL`. Remote API
targets are rejected unless `E2E_ALLOW_REMOTE_API=true` is explicitly set.

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
