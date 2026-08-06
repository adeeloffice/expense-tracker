const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, PageNumber, AlignmentType, HeadingLevel, WidthType,
  BorderStyle, ShadingType, PageBreak, TableOfContents,
} = require("docx");
const fs = require("fs");

// Dawn Mist Tech palette
const P = {
  primary: "#0A1628",
  body: "#1A2B40",
  secondary: "#6878A0",
  accent: "#5B8DB8",
  surface: "#F4F8FC",
};
const c = (hex) => hex.replace("#", "");

const FONT = "Calibri";

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 200, line: 312 },
    children: [new TextRun({ text, bold: true, size: 32, font: { ascii: FONT, eastAsia: FONT }, color: c(P.primary) })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 140, line: 312 },
    children: [new TextRun({ text, bold: true, size: 28, font: { ascii: FONT, eastAsia: FONT }, color: c(P.primary) })],
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100, line: 312 },
    children: [new TextRun({ text, bold: true, size: 24, font: { ascii: FONT, eastAsia: FONT }, color: c(P.accent) })],
  });
}

function body(text) {
  return new Paragraph({
    spacing: { after: 100, line: 312 },
    children: [new TextRun({ text, size: 22, font: { ascii: FONT, eastAsia: FONT }, color: c(P.body) })],
  });
}

function bullet(text) {
  return new Paragraph({
    spacing: { after: 60, line: 312 },
    indent: { left: 420, hanging: 210 },
    children: [
      new TextRun({ text: "\u2022  ", size: 22, font: { ascii: FONT, eastAsia: FONT }, color: c(P.accent) }),
      new TextRun({ text, size: 22, font: { ascii: FONT, eastAsia: FONT }, color: c(P.body) }),
    ],
  });
}

function emptyLine() {
  return new Paragraph({ spacing: { after: 60 }, children: [] });
}

function makeTableRow(cells, isHeader = false) {
  return new TableRow({
    tableHeader: isHeader,
    cantSplit: true,
    children: cells.map((text) =>
      new TableCell({
        shading: isHeader ? { fill: c(P.accent), type: ShadingType.CLEAR } : undefined,
        margins: { top: 60, bottom: 60, left: 120, right: 120 },
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text,
                bold: isHeader,
                size: 20,
                font: { ascii: FONT, eastAsia: FONT },
                color: isHeader ? "FFFFFF" : c(P.body),
              }),
            ],
          }),
        ],
      })
    ),
  });
}

function makeTable(headers, rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: c(P.accent) },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: c(P.accent) },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "D0D0D0" },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [makeTableRow(headers, true), ...rows.map((r) => makeTableRow(r))],
  });
}

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: { ascii: FONT, eastAsia: FONT }, size: 22, color: c(P.body) },
        paragraph: { spacing: { line: 312 } },
      },
    },
  },
  sections: [
    // COVER PAGE
    {
      properties: {
        page: { size: { width: 11906, height: 16838 }, margin: { top: 0, bottom: 0, left: 0, right: 0 } },
      },
      children: [
        new Paragraph({ spacing: { before: 4800 }, children: [] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [
          new TextRun({ text: "Expense Tracker", bold: true, size: 72, font: { ascii: FONT, eastAsia: FONT }, color: c(P.accent) }),
        ]}),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [
          new TextRun({ text: "Technical Architecture & Deployment Guide", size: 28, font: { ascii: FONT, eastAsia: FONT }, color: c(P.secondary) }),
        ]}),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 600 }, children: [
          new TextRun({ text: "A Cloud-Synced Progressive Web Application", size: 22, font: { ascii: FONT, eastAsia: FONT }, color: c(P.secondary) }),
        ]}),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 300 }, children: [
          new TextRun({ text: "Built with Next.js 16 | Firebase Auth & Firestore | TypeScript | Tailwind CSS", size: 18, font: { ascii: FONT, eastAsia: FONT }, color: c(P.secondary) }),
        ]}),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 2400 }, children: [
          new TextRun({ text: "Version 1.0  |  August 2026", size: 20, font: { ascii: FONT, eastAsia: FONT }, color: c(P.secondary) }),
        ]}),
      ],
    },
    // BODY
    {
      properties: {
        page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 } },
      },
      headers: {
        default: new Header({ children: [
          new Paragraph({ alignment: AlignmentType.RIGHT, children: [
            new TextRun({ text: "Expense Tracker \u2014 Technical Guide", size: 16, font: { ascii: FONT, eastAsia: FONT }, color: c(P.secondary), italics: true }),
          ]}),
        ]}),
      },
      footers: {
        default: new Footer({ children: [
          new Paragraph({ alignment: AlignmentType.CENTER, children: [
            new TextRun({ children: [PageNumber.CURRENT], size: 18, font: { ascii: FONT, eastAsia: FONT }, color: c(P.secondary) }),
          ]}),
        ]}),
      },
      children: [
        new Paragraph({ spacing: { before: 200, after: 200 }, children: [
          new TextRun({ text: "Table of Contents", bold: true, size: 32, font: { ascii: FONT, eastAsia: FONT }, color: c(P.primary) }),
        ]}),
        new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-3" }),
        new Paragraph({ children: [
          new TextRun({ text: "(Right-click the Table of Contents and select \"Update Field\" to refresh page numbers after opening in Word.)", italics: true, size: 18, font: { ascii: FONT, eastAsia: FONT }, color: c(P.secondary) }),
        ], spacing: { before: 120, after: 120 } }),
        new Paragraph({ children: [new PageBreak()] }),

        // SECTION 1
        h1("1. Project Overview"),
        body("Expense Tracker is a cloud-synced Progressive Web Application designed for tracking daily expenses, setting monthly budgets, and visualizing spending patterns through interactive charts. Users can create an account with just a username and password, then add expenses categorized by type (Food, Transport, Shopping, etc.), set per-month budgets, and analyze their spending trends over time."),
        body("The application is built as a single-page application (SPA) using Next.js 16 with the App Router architecture. It uses Firebase Authentication for user management and Cloud Firestore as the real-time NoSQL database. The entire frontend is written in TypeScript with Tailwind CSS for styling and shadcn/ui as the component library. State management is handled by Zustand, providing a lightweight and reactive store pattern that syncs seamlessly with Firebase's real-time listeners."),
        body("The app is designed to work on all devices (desktop, tablet, mobile) with a responsive layout. Data syncs in real-time across devices, so a user can add an expense on their phone and immediately see it on their laptop. The application is currently live and accessible via a Vercel deployment URL."),

        // SECTION 2
        h1("2. Technology Stack"),
        h2("2.1 Frontend Framework"),
        body("The application is built on Next.js 16.1 (the latest version), which provides server-side rendering capabilities, file-based routing, and an optimized build system powered by Turbopack. Although Next.js supports server components, this application primarily uses client-side rendering (\"use client\" directives) because the real-time Firebase listeners and authentication state require a persistent browser-side environment. The App Router is used for the page structure, with the main entry point at src/app/page.tsx."),
        h2("2.2 Language & Styling"),
        body("TypeScript (version 5) is used throughout the project for type safety and better developer experience. Tailwind CSS 4 provides utility-first styling with a responsive design system. The UI component library is shadcn/ui, which is built on top of Radix UI primitives and provides accessible, customizable components such as dialogs, dropdowns, tabs, progress bars, and form inputs. Icons are provided by the lucide-react package."),
        h2("2.3 State Management"),
        body("Zustand (version 5) manages three separate stores: the Auth Store handles user authentication state (current user, UID, email, lock status), the Expense Store manages the list of expenses with real-time Firestore synchronization via onSnapshot listeners, and the Settings Store manages currency preferences and per-month budgets with its own real-time listener. Each store provides both the reactive state and the action methods (login, signup, addExpense, saveBudget, etc.) in a single cohesive pattern."),
        h2("2.4 Charts & Visualization"),
        body("Data visualization is handled by Recharts (version 2.15), which provides responsive, SVG-based charts. The app uses two chart types: a Donut/Pie chart for spending by category breakdown, and a Bar chart for monthly spending overview with trend analysis. Charts are wrapped in shadcn/ui's ChartContainer component for consistent theming and tooltip styling."),

        // SECTION 3
        h1("3. Platforms & Services"),
        h2("3.1 GitHub (Source Code Repository)"),
        body("The complete source code is hosted on GitHub at the repository adeeloffice/expense-tracker. GitHub serves as the version control system and the integration point for deployment. Every code change is committed with descriptive messages and pushed to the main branch, which automatically triggers a Vercel deployment. The repository contains all application source files, configuration files, and environment variable templates."),
        h2("3.2 Vercel (Hosting & Deployment)"),
        body("Vercel is the hosting platform that deploys the Next.js application to the live URL. The deployment is fully automatic: whenever code is pushed to the main branch on GitHub, Vercel detects the change, builds the application using its optimized Next.js build pipeline, and deploys it to a global edge network. The live URL is: https://expense-tracker-five-alpha-69.vercel.app/. Vercel provides SSL certificates, a global CDN for fast loading, and automatic preview deployments for pull requests. No server configuration is needed because Vercel handles the entire deployment infrastructure."),
        h2("3.3 Firebase (Authentication & Database)"),
        body("Google Firebase provides two critical backend services. Firebase Authentication manages user accounts with email/password authentication, including sign-up, sign-in, sign-out, session persistence, email verification, password reset, account deletion, and re-authentication for sensitive operations. Firebase Cloud Firestore is the real-time NoSQL database that stores all user data including expense records, user settings (currency preferences, per-month budgets), and username-to-UID mappings. Firestore uses a document-based structure with real-time synchronization through onSnapshot listeners, meaning any data change on one device is instantly reflected on all other logged-in devices."),
        makeTable(
          ["Service", "Provider", "Purpose", "Plan"],
          [
            ["Frontend Hosting", "Vercel", "Serves the Next.js app globally", "Free (Hobby)"],
            ["Authentication", "Firebase Auth", "User signup, login, session", "Free (Spark)"],
            ["Database", "Cloud Firestore", "Expenses, settings, budgets", "Free (Spark)"],
            ["Version Control", "GitHub", "Source code management", "Free"],
            ["Framework", "Next.js 16", "React-based UI framework", "Open Source"],
            ["Styling", "Tailwind CSS 4", "Utility-first CSS framework", "Open Source"],
            ["UI Components", "shadcn/ui + Radix", "Accessible UI primitives", "Open Source"],
            ["State Management", "Zustand 5", "Lightweight reactive stores", "Open Source"],
            ["Charts", "Recharts 2.15", "SVG-based data visualization", "Open Source"],
          ]
        ),
        emptyLine(),

        // SECTION 4
        h1("4. Data Storage Architecture"),
        h2("4.1 Firestore Data Structure"),
        body("All data is stored in Google Cloud Firestore under the project associated with the Firebase configuration. Firestore organizes data into collections and documents. The Expense Tracker uses the following structure:"),
        h3("Collection: usernames/{username}"),
        body("Each registered username gets a document in the usernames collection. This document maps the username to the user's Firebase Auth UID and stores email information. It contains the following fields: uid (the Firebase Auth user ID), authEmail (the email address currently used in Firebase Auth for login - may be the username@et.app placeholder or a real email), recoveryEmail (the user's real email for password recovery), and email (a legacy field kept for backward compatibility with older accounts)."),
        h3("Collection: users/{uid}/expenses"),
        body("Each user's expense records are stored as sub-documents under their UID. Every expense document contains: title (the expense description), amount (the monetary value), category (one of 10 predefined categories like Food & Drinks, Transport, Shopping, Bills & Utilities, Entertainment, Health, Education, Travel, Groceries, or Other), date (the date of the expense in YYYY-MM-DD format), note (an optional text note), and createdAt (an ISO timestamp for ordering)."),
        h3("Collection: users/{uid}/settings/config"),
        body("A single configuration document per user stores their preferences. It contains: currencyCode (one of 8 supported currencies: BHD, USD, EUR, GBP, SAR, AED, KWD, or INR with their respective symbols and decimal places), and monthlyBudgets (a map/dictionary where keys are month strings like \"2026-08\" and values are the budget amount for that month, enabling per-month budget tracking)."),
        makeTable(
          ["Location", "Content", "Access Pattern"],
          [
            ["usernames/{username}", "uid, authEmail, recoveryEmail, email", "Read on login, update on email change"],
            ["users/{uid}/expenses/*", "title, amount, category, date, note", "Real-time sync via onSnapshot"],
            ["users/{uid}/settings/config", "currencyCode, monthlyBudgets", "Real-time sync via onSnapshot"],
          ]
        ),
        emptyLine(),
        h2("4.2 Authentication Flow"),
        body("The application uses a username-based authentication system built on top of Firebase Auth's email/password provider. During signup, if the user provides a real email address, the Firebase Auth account is created with that email. If no email is provided, the system generates a placeholder email in the format username@et.app (this domain is not a real email domain, it simply serves as a unique identifier). The user can add or change their recovery email later from the user menu."),
        body("During login, the system looks up the username document in Firestore, retrieves the authEmail field, and uses it to call Firebase's signInWithEmailAndPassword. If the authEmail is a real email but Firebase Auth still has the old email (because the user has not clicked the email verification link yet), the system automatically falls back to trying the @et.app placeholder email. This dual-attempt login ensures users can always log in even during the email verification transition period."),
        body("Email changes use Firebase's verifyBeforeUpdateEmail function, which sends a verification link to the new email address. The recovery email is saved in Firestore immediately for UI display, while the Firebase Auth email updates only after the user clicks the verification link. The onAuthStateChanged listener automatically syncs the authEmail field in Firestore when it detects the Firebase Auth email has changed."),

        // SECTION 5
        h1("5. Key Features"),
        h2("5.1 Expense Management"),
        bullet("Add, edit, and delete expenses with title, amount, category, date, and optional notes"),
        bullet("10 predefined expense categories with color-coded visual indicators"),
        bullet("Month-by-month expense filtering with navigation between months"),
        bullet("\"All Months\" view to see aggregated data across all time periods"),
        bullet("CSV export functionality for downloading expense data"),
        h2("5.2 Budget Tracking"),
        bullet("Per-month budget setting (different budget for each month)"),
        bullet("Visual budget progress bar showing percentage used and amount remaining"),
        bullet("Over-budget warning with red indicators when spending exceeds the limit"),
        bullet("\"All Months\" view shows the total budget across all months with individual month counts"),
        bullet("Optimistic local state updates for instant UI feedback"),
        h2("5.3 Data Visualization"),
        bullet("Spending by Category donut chart showing breakdown for the selected month"),
        bullet("Monthly Overview bar chart showing 6-month spending trends with the selected month highlighted"),
        bullet("Charts adapt to the selected month filter for contextual data display"),
        h2("5.4 User Account & Security"),
        bullet("Username-based authentication with optional email at signup"),
        bullet("Recovery email can be added or changed after login with password verification"),
        bullet("Email verification flow for secure email changes (verifyBeforeUpdateEmail)"),
        bullet("App lock screen to prevent unauthorized access"),
        bullet("Account deletion with password confirmation and full data cleanup"),
        bullet("Automatic orphaned data cleanup when Firebase Auth users are deleted"),
        bullet("Dark/light theme toggle with system preference detection"),
        bullet("8 supported currencies with correct decimal formatting (BHD=3, USD/EUR=2, etc.)"),

        // SECTION 6
        h1("6. File Structure"),
        body("The application follows Next.js conventions with a clean separation of concerns. All application code lives under the src/ directory:"),
        makeTable(
          ["Path", "Purpose"],
          [
            ["src/app/page.tsx", "Main page - renders LoginScreen or Dashboard based on auth state"],
            ["src/app/layout.tsx", "Root layout with theme provider and metadata"],
            ["src/app/globals.css", "Global styles including Tailwind directives"],
            ["src/lib/firebase.ts", "Firebase initialization, config, and re-exports"],
            ["src/lib/store.ts", "Zustand stores: AuthStore, ExpenseStore, SettingsStore"],
            ["src/lib/utils.ts", "Utility functions (cn helper for Tailwind)"],
            ["src/components/dashboard.tsx", "Main dashboard with month selector, summary, tabs, dialogs"],
            ["src/components/login-screen.tsx", "Login and signup form with tabs"],
            ["src/components/lock-screen.tsx", "App lock screen with password re-entry"],
            ["src/components/expense-form.tsx", "Add/edit expense dialog with category selector"],
            ["src/components/expense-list.tsx", "Filterable expense list with month navigation"],
            ["src/components/expense-chart.tsx", "Category donut chart using Recharts"],
            ["src/components/summary-cards.tsx", "Budget progress, total spent, transaction count cards"],
            ["src/components/settings-dialog.tsx", "Currency selection and per-month budget input"],
            ["src/components/delete-account-dialog.tsx", "Account deletion confirmation with password"],
            ["src/components/ui/*", "shadcn/ui component library (30+ components)"],
            [".env.local", "Environment variables (Firebase config, NOT committed to Git)"],
          ]
        ),
        emptyLine(),

        // SECTION 7
        h1("7. Requirements to Go Live"),
        h2("7.1 Required Accounts (All Free)"),
        body("To deploy this application from scratch, you need accounts on three platforms. All of them offer free tiers that are sufficient for a personal or small-scale expense tracker:"),
        bullet("GitHub Account (free): For hosting the source code repository. Create a new repository and push the code."),
        bullet("Vercel Account (free Hobby plan): Connect to your GitHub repository. Vercel automatically deploys on every push to the main branch. Add environment variables in the Vercel project settings."),
        bullet("Firebase Project (free Spark plan): Create a new project in the Firebase Console. Enable Email/Password authentication in the Authentication section. Create a Cloud Firestore database. Copy the Firebase configuration values (API Key, Auth Domain, Project ID, etc.) into the Vercel environment variables."),
        h2("7.2 Required Environment Variables"),
        body("The following environment variables must be set in both the local .env.local file and the Vercel project settings. These are obtained from the Firebase Console under Project Settings > General > Your Apps > Web App:"),
        makeTable(
          ["Variable", "Description", "Example"],
          [
            ["NEXT_PUBLIC_FIREBASE_API_KEY", "Firebase API key", "AIzaSy..."],
            ["NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", "Firebase Auth domain", "project-id.firebaseapp.com"],
            ["NEXT_PUBLIC_FIREBASE_PROJECT_ID", "Firebase project ID", "my-expense-tracker"],
            ["NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", "Firebase Storage bucket (optional)", "project-id.appspot.com"],
            ["NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", "Firebase Cloud Messaging sender ID", "123456789"],
            ["NEXT_PUBLIC_FIREBASE_APP_ID", "Firebase App ID", "1:123456789:web:abc..."],
          ]
        ),
        emptyLine(),
        h2("7.3 Firebase Configuration Steps"),
        body("After creating a Firebase project, follow these steps in the Firebase Console:"),
        bullet("Go to Authentication > Sign-in method and enable the Email/Password provider. Optionally enable email enumeration protection for enhanced security."),
        bullet("Go to Firestore Database and click Create Database. Start in test mode for development, then configure security rules for production. The recommended security rules allow users to only read/write their own data based on their authenticated UID."),
        bullet("Go to Authentication > Settings and configure the authorized domains. Add your Vercel deployment URL (e.g., expense-tracker-five-alpha-69.vercel.app) to the allowed list so Firebase Auth works correctly on the deployed app."),
        bullet("If using email verification for email changes (verifyBeforeUpdateEmail), ensure the email template is configured under Authentication > Templates > Email address verification."),
        h2("7.4 Deployment Steps"),
        body("The complete deployment process from a fresh machine is as follows:"),
        bullet("Clone the GitHub repository: git clone https://github.com/adeeloffice/expense-tracker.git"),
        bullet("Install dependencies: npm install (or bun install)"),
        bullet("Create a .env.local file with the Firebase configuration variables from the Firebase Console"),
        bullet("Test locally: npm run dev and verify the app works at http://localhost:3000"),
        bullet("Push to GitHub: git add . && git commit -m \"Initial deployment\" && git push origin main"),
        bullet("Connect the GitHub repository to Vercel (if not already connected) through the Vercel dashboard"),
        bullet("Add the same environment variables in Vercel > Project Settings > Environment Variables"),
        bullet("Vercel will automatically build and deploy. The app will be live at the Vercel-assigned URL within 1-2 minutes."),
        h2("7.5 Firestore Security Rules (Production)"),
        body("For production deployment, Firestore security rules should be configured to ensure users can only access their own data. The recommended rules allow authenticated users to read and write documents under their own UID, read and write their own username document, and read the usernames collection for lookup purposes. These rules should be set in the Firebase Console under Firestore > Rules before making the app publicly available."),
      ],
    },
  ],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync("/home/z/my-project/download/Expense-Tracker-Technical-Guide.docx", buf);
  console.log("Document saved successfully!");
});
