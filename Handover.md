# 🤝 Legacy Ledger - Asset Handover Document

This document outlines all third-party services, accounts, and digital assets associated with the Legacy Ledger application that require transfer to the new owner.

## 1. Codebase & Version Control
* **GitHub Repository:** The complete source code (Frontend & Backend monorepo).
  * *Action:* Transfer repository ownership via GitHub settings.

## 2. Infrastructure & Hosting
* **Frontend Hosting (Vercel):** Hosts the React application.
  * *Action:* Transfer project to the buyer's Vercel team/account.
* **Backend Hosting (Render):** Hosts the Node.js/Express API.
  * *Action:* Provide access to the Render web service or assist in re-deploying on the buyer's Render account.

## 3. Database
* **PostgreSQL Database (Supabase):** Contains user data, transaction logs, and AI strategy logs.
  * *Action:* Transfer the Supabase project organization to the buyer's email address.

## 4. Third-Party APIs & Integrations
The following API keys are currently tied to the developer's personal accounts and must be replaced by the buyer's own keys post-transfer:
* **Groq API:** Powers the LLM features (`/smart-entry`, `/discover`, `/analyze`).
* **TwelveData API:** Powers the market research fallback queries.
* **UptimeRobot:** Monitors the Render backend to prevent sleep states.

## 5. Environment Variables List
The buyer will need to configure the following secrets on their own hosting environments:
* `DATABASE_URL` (From their newly transferred Supabase instance)
* `JWT_SECRET` (A newly generated random string)
* `GROQ_API_KEY` (From their own Groq account)
* `TWELVEDATA_API_KEY` (From their own TwelveData account)

## Post-Handover Support
*(Optional: Define the terms of your support here, e.g., "Developer will provide 7 days of email support to ensure successful deployment.")*