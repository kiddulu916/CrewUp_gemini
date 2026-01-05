# KrewUp

KrewUp is a modern platform designed to connect workers and employers in the trades industry. It features a domain-driven architecture, real-time messaging, geolocation-based job searches, and a robust subscription system.

## 🚀 Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **UI/Styling**: [React 19](https://react.dev/), [Tailwind CSS 4](https://tailwindcss.com/), [Lucide React](https://lucide.dev/)
- **Backend-as-a-Service**: [Supabase](https://supabase.com/) (Auth, PostgreSQL + PostGIS, Storage, Realtime)
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/), [TanStack Query v5](https://tanstack.com/query/latest)
- **Payments**: [Stripe](https://stripe.com/)
- **Monitoring**: [Sentry](https://sentry.io/)
- **Testing**: [Vitest](https://vitest.dev/), [Playwright](https://playwright.dev/)
- **Mobile Support**: [Capacitor](https://capacitorjs.com/)
- **Deployment**: [Vercel](https://vercel.com/)

## 🌐 Live Application

The application is live at: **[https://krewup.net](https://krewup.net)**

## ✨ Key Features

- **Domain-Driven Feature Architecture**: Self-contained modules for better maintainability.
- **Server Actions**: All data mutations use Next.js Server Actions for secure, authenticated operations.
- **Geolocation**: Job postings and searches powered by PostGIS.
- **Real-time Messaging**: Instant communication between workers and employers.
- **Pro Subscriptions**: Tiered features for workers and employers managed via Stripe.
- **Admin Dashboard**: Comprehensive platform management, analytics, and moderation tools.
- **Mobile Ready**: Optimized for web and mobile (Android) via Capacitor.

## 📋 Prerequisites

- **Node.js**: v18+ (v20+ recommended)
- **npm**: Package manager
- **Supabase**: Account and project
- **Stripe**: Account (for payments)
- **Sentry**: Account (for monitoring)
- **Google Maps API Key**: For location autocomplete

## 🛠️ Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/your-repo/krewup.git
cd krewup
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
Copy the example environment file and fill in your credentials:
```bash
cp .env.example .env.local
```

### 4. Database Migrations
Apply migrations to your Supabase project:
- Migrations are located in `supabase/migrations/`.
- Use the Supabase CLI or dashboard to apply them sequentially.

### 5. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to see the result.

## ⚙️ Environment Variables

The following variables are required in your `.env.local`:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (Server-only) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_PRICE_ID_PRO_MONTHLY` | Stripe Price ID for Monthly Pro |
| `STRIPE_PRICE_ID_PRO_ANNUAL` | Stripe Price ID for Annual Pro |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps API key |
| `NEXT_PUBLIC_APP_URL` | Base URL for the application |

## 📜 Available Scripts

- `npm run dev`: Starts the development server.
- `npm run build`: Creates a production build.
- `npm start`: Runs the production server.
- `npm run lint`: Runs ESLint for code quality checks.
- `npm run type-check`: Runs TypeScript compiler checks.
- `npm test`: Runs unit and component tests (Vitest).
- `npm run test:e2e`: Runs end-to-end tests (Playwright).
- `npm run test:all`: Runs both Vitest and Playwright tests.
- `npm run lighthouse`: Runs performance and accessibility audits.

## 🧪 Testing

### Unit & Component Tests
Powered by **Vitest** and **React Testing Library**.
```bash
npm test
# or with UI
npm run test:ui
```

### End-to-End Tests
Powered by **Playwright**.
```bash
npm run test:e2e
```

## 📂 Project Structure

```text
├── app/              # Next.js App Router (pages and layouts)
├── components/       # Reusable UI components (Shadcn-like)
├── features/         # Domain-specific modules (actions, hooks, components)
│   └── [feature]/    # e.g., jobs, auth, profiles
├── lib/              # Shared utilities, Supabase & Stripe clients
├── supabase/         # Database migrations and configurations
├── android/          # Capacitor Android project files
├── __tests__/        # Unit and component tests
├── e2e/              # Playwright E2E tests
├── hooks/            # Global custom React hooks
├── stores/           # Zustand state stores
├── public/           # Static assets
└── scripts/          # Utility scripts (e.g., database seeding)
```

## 📱 Mobile Support

KrewUp uses **Capacitor** to provide an Android application.
```bash
# Sync Capacitor with web build
npx cap sync android

# Open in Android Studio
npx cap open android
```

## 🚢 Deployment

The project is optimized for deployment on **Vercel**.
1. Push your changes to `main`.
2. Connect your repository to Vercel.
3. Configure environment variables in the Vercel dashboard.

## 📄 License

This project is licensed under the **ISC License** (as specified in `package.json`).

---

*For detailed development guidelines, please refer to [.junie/guidelines.md](.junie/guidelines.md).*
