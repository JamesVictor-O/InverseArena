## Inverse Arena Frontend

Next.js + Tailwind landing page and UI.

### Setup

Install deps:

```bash
npm install
```

Add local env:

- **`NEXT_PUBLIC_PRIVY_APP_ID`**: your Privy App ID (from the Privy dashboard)

Example:

```bash
NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id
```

### Run

```bash
npm run dev
```

Then open `http://localhost:3000`.

### Privy wallet connect

- Provider: `src/app/providers.tsx`
- Connect button: `src/components/LandingPage/Navbar.tsx`
