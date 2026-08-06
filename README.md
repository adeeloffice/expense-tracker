# Personal Expense Tracker

A beautiful, full-featured expense tracking web application built with Next.js, Firebase, and shadcn/ui. Track your daily spending, set monthly budgets, visualize expenses with interactive charts, and export data — all secured with username/password authentication.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![Firebase](https://img.shields.io/badge/Firebase-13-FFCA28?logo=firebase)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)
![License](https://img.shields.io/badge/License-MIT-green)

---

## Features

- **User Authentication** — Secure signup/login with username & password via Firebase Auth
- **Recovery Email** — Add or change a recovery email at any time (verification link sent via Firebase)
- **Add Expenses** — Log expenses with amount, category, description, and date
- **Edit & Delete** — Full CRUD operations on all expense entries
- **Monthly Budgets** — Set a different budget for each month; see remaining vs. spent at a glance
- **Summary Cards** — Real-time totals for spending, budget, and remaining balance
- **Interactive Charts** — Pie/Donut chart for category breakdown + Bar chart for monthly overview (Recharts)
- **Month Filter** — Filter expenses and charts by specific month or view all months
- **Dark Mode** — System-aware dark/light theme toggle
- **CSV Export** — Download your expense data as a CSV file
- **Delete Account** — Fully remove account from both Firebase Auth and Firestore
- **Responsive Design** — Works on desktop and mobile devices
- **Lock Screen** — Quick-lock with PIN re-authentication

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Framework** | Next.js 16 (App Router) | React framework with server/client components |
| **Language** | TypeScript 5 | Type-safe development |
| **Styling** | Tailwind CSS 4 + shadcn/ui | Utility-first CSS + pre-built accessible components |
| **State Management** | Zustand 5 | Lightweight client-side state (auth, expenses, settings) |
| **Authentication** | Firebase Auth | Email/Password authentication |
| **Database** | Firebase Firestore | NoSQL cloud database for user data, expenses, budgets |
| **Charts** | Recharts 2 | Pie/Donut & Bar chart visualizations |
| **Icons** | Lucide React | Beautiful open-source icon set |
| **Date Handling** | date-fns 4 | Lightweight date formatting & manipulation |

---

## Architecture Overview

```
User's Browser (React App)
  |
  |-- Zustand Stores (client-side state)
  |     |-- useAuthStore   (login, signup, logout, user info)
  |     |-- useExpenseStore (expenses CRUD, fetch, filter)
  |     |-- useSettingsStore (budgets, email, theme, Firestore listener)
  |
  |-- Firebase Client SDK
        |-- Firebase Auth   -->  Google Firebase Authentication
        |-- Firestore DB    -->  Google Cloud Firestore Database
```

### Where Data Lives

| Data | Storage Location | Details |
|---|---|---|
| User accounts | **Firebase Authentication** | Email/Password provider with `username@et.app` format |
| Usernames mapping | **Firestore** - `usernames/{username}` | Maps username to auth data, recovery email, budgets |
| Expenses | **Firestore** - `users/{uid}/expenses/` | Each expense as a document with amount, category, date, description |
| Monthly budgets | **Firestore** - `usernames/{username}` | Stored as `monthlyBudgets: { "2025-07": 5000, ... }` |
| App state (temp) | **Zustand** (browser memory) | Cleared on refresh; re-fetched from Firestore |

---

## Authentication Flow

This app uses a unique username-based auth system on top of Firebase Auth:

1. **Signup**: User picks a username + password. A Firebase Auth account is created with email `{username}@et.app` (a virtual domain). The username is stored in Firestore `usernames/{username}`.

2. **Login**: User enters username + password. The app looks up the username in Firestore, retrieves the `authEmail`, and signs in via `signInWithEmailAndPassword`. A dual-attempt strategy handles Firebase's email enumeration protection.

3. **Recovery Email**: Users can optionally add a real email address. This is stored in Firestore as `recoveryEmail` and (after verification) updated in Firebase Auth for password reset functionality. The `verifyBeforeUpdateEmail` flow is used to comply with email verification enforcement.

---

## Screenshots

> Add your own screenshots here after running the app:
>
> `![Dashboard](./screenshots/dashboard.png)`

---

## Prerequisites

Before you begin, make sure you have:

- **Node.js** 18+ or **Bun** installed
- A **Firebase project** with:
  - Authentication enabled (Email/Password provider)
  - Firestore Database created
  - A web app registered (to get API keys)

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/expense-tracker.git
cd expense-tracker
```

### 2. Install dependencies

```bash
npm install
# or
bun install
```

### 3. Set up Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use an existing one)
3. Enable **Authentication** > **Email/Password** sign-in method
4. Create a **Firestore Database** (start in test mode, then update rules)
5. Register a **Web App** in Project Settings and copy the Firebase config

### 4. Create environment file

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

> Replace the values with your actual Firebase config from Project Settings.

### 5. Configure Firestore Security Rules

In Firebase Console > Firestore > Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Usernames collection - allow read/write for authenticated users
    match /usernames/{username} {
      allow read, write: if request.auth != null;
    }
    
    // Users collection - only allow access to own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 6. Run the development server

```bash
npm run dev
# or
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Project Structure

```
expense-tracker/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout with theme provider
│   │   ├── page.tsx            # Main page (login/dashboard router)
│   │   └── globals.css         # Global styles + Tailwind
│   ├── components/
│   │   ├── dashboard.tsx        # Main dashboard with tabs
│   │   ├── login-screen.tsx     # Login & signup form
│   │   ├── lock-screen.tsx      # PIN lock screen
│   │   ├── expense-form.tsx     # Add/edit expense form
│   │   ├── expense-list.tsx     # Expense list with edit/delete
│   │   ├── expense-chart.tsx    # Charts (pie + bar)
│   │   ├── summary-cards.tsx    # Budget/spending/remaining cards
│   │   ├── settings-dialog.tsx  # Settings (budget, email, delete)
│   │   ├── delete-account-dialog.tsx
│   │   └── ui/                 # shadcn/ui components
│   ├── lib/
│   │   ├── firebase.ts          # Firebase init & re-exports
│   │   ├── store.ts            # Zustand stores (auth, expenses, settings)
│   │   ├── db.ts               # Prisma DB (not used for main app)
│   │   └── utils.ts            # Utility functions
│   └── hooks/
│       ├── use-mobile.ts       # Mobile detection hook
│       └── use-toast.ts        # Toast notification hook
├── public/
│   ├── logo.svg
│   └── robots.txt
├── .gitignore
├── package.json
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

---

## Deployment (Making It Live)

### Recommended: Vercel (Free Tier)

1. Push your code to **GitHub**
2. Go to [Vercel.com](https://vercel.com/) and sign in with GitHub
3. Click **"New Project"** > Import your GitHub repository
4. Add your environment variables (all the `NEXT_PUBLIC_FIREBASE_*` values)
5. Click **Deploy**

Vercel will automatically build and deploy your app. Every push to `main` triggers a new deployment.

### Environment Variables on Vercel

In Vercel Dashboard > Settings > Environment Variables, add all 6 Firebase config variables:

| Variable | Example |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `AIzaSyB...` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `my-app.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `my-expense-tracker` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `my-app.appspot.com` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `123456789` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `1:123:web:abc...` |

### Custom Domain (Optional)

In Vercel Dashboard > Settings > Domains, add your custom domain and update DNS records as instructed.

---

## Sharing the Project

### Can someone install this from GitHub?

**Yes!** Once you push this code to GitHub, anyone can:

1. Clone the repository
2. Run `npm install`
3. Add their own Firebase config in `.env.local`
4. Run `npm run dev`

They will have their own fully working instance with their own Firebase project and their own user data.

### What you should NOT share

- **`.env.local`** file — Contains your Firebase API keys. It's already in `.gitignore`, so it won't be pushed to GitHub.
- **`node_modules/`** — Also in `.gitignore`. Others will install their own via `npm install`.

### What IS included in the repo (safe to share)

All source code, components, configuration files, and the README. No secrets, no API keys, no user data.

---

## Recommendations & Future Improvements

Here are some suggestions to take this project further:

### Priority Improvements
- **Add `.env.example` file** — Create a template env file (with placeholder values) so other developers know what variables to set
- **Add screenshots** — Add real screenshots to the README and a `screenshots/` folder
- **Input validation** — Add Zod validation on the expense form for better error messages
- **Loading states** — Add skeleton loaders while data is being fetched from Firestore

### Feature Ideas
- **Recurring expenses** — Auto-add monthly subscriptions/rent
- **Expense categories management** — Let users create custom categories with icons and colors
- **Multi-currency support** — Track expenses in different currencies with conversion
- **Photo receipts** — Attach receipt photos to expenses (using Firebase Storage)
- **Data backup/restore** — Export/import JSON backup of all data
- **Notifications** — Browser notifications when budget threshold is reached (e.g., 80% spent)
- **PWA support** — Add a service worker and manifest.json for installable mobile app experience
- **Google/Apple login** — Add OAuth providers alongside username/password

### Code Quality
- **Add unit tests** — Use Vitest or Jest for testing Zustand stores and utility functions
- **Add E2E tests** — Use Playwright for testing login/signup/expense flows
- **Error boundary** — Add React error boundaries for graceful error handling
- **Firestore indexes** — Review and optimize Firestore queries for better performance at scale

---

## Services Used (Quick Reference)

| Service | Purpose | Cost |
|---|---|---|
| **GitHub** | Code hosting & version control | Free (public repos) |
| **Vercel** | Web hosting & deployment | Free tier available |
| **Firebase Auth** | User authentication | Free tier: 50k MAU |
| **Firestore** | Cloud database | Free tier: 1GB stored, 50k reads/day |

---

## License

This project is open source and available under the [MIT License](LICENSE).

---

## Support

If you run into any issues:

1. Make sure all Firebase config values are correct in `.env.local`
2. Ensure Email/Password auth is enabled in Firebase Console
3. Ensure Firestore rules allow read/write for authenticated users
4. Check the browser console for any error messages
