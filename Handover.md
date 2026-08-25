# 🤝 Legacy Ledger - Asset Handover Document

This document outlines all third-party services, accounts, and digital assets associated with the Legacy Ledger application that require transfer to the new owner, alongside deployment instructions.

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

## 5. Environment Variables & Credential Rotation
The buyer must rotate credentials immediately upon handover and configure these secrets in their hosting environments (and local `.env` files):

* `DATABASE_URL`: (From their newly transferred Supabase instance)
* `JWT_SECRET`: (MUST rotate: Generate a newly randomized cryptographic string)
* `GROQ_API_KEY`: (From their own Groq account)
* `TWELVEDATA_API_KEY`: (From their own TwelveData account)
* **`GROQ_MODEL`**: Set the target AI model here (e.g., `openai/gpt-oss-20b` or `llama-3.3-70b-versatile`). Update this if a model is deprecated.
* **`DEMO_MODE`**: Set to `true` (alongside `NODE_ENV=development`) to allow guest access bypassing strict authentication. Ensure this is `false` or removed in a live production environment.

## 6. Step-by-Step Deploy/Run Checklist
Follow these steps to deploy and run the application locally from scratch:

1. **Clone the Repository:**
   ```bash
   git clone [https://github.com/Namith2006/legacy-ledger.git](https://github.com/Namith2006/legacy-ledger.git)
   cd legacy-ledger
## 7. Third-Party Provider Usage Rights & Licensing Compliance

Before deploying this application commercially or in production, the new owner must review and accept the terms of service and license agreements for the following third-party services:

### A. AI Inference & Model Licensing (Groq & Meta Llama)
* **Meta Llama Models (`llama-3.3-70b-versatile`, etc.):** 
  * Meta requires explicit acceptance of the **Meta Llama 3 Community License Agreement**.
  * When generating a new Groq API key, the buyer **must** log into the [Groq Console](https://console.groq.com/) and accept Meta's licensing terms before sending requests to any `llama-3.*` model. Failure to do so will result in an upstream `404 (model_not_found)` error.
* **Open-Weights Fallbacks (`openai/gpt-oss-20b`, etc.):**
  * Subject to their respective open-source licenses (e.g., Apache 2.0 / MIT). Ensure compliance with attribution clauses if modified.

### B. Financial Market Data Providers
* **TwelveData API:**
  * Free-tier API keys are subject to TwelveData’s standard rate limits (8 API credits per minute, 800 per day). For high-volume production, purchase a commercial tier license.
* **Yahoo Finance (`query1.finance.yahoo.com` / `yahoo-finance2`):**
  * Financial feeds fetched from Yahoo Finance are intended for personal, informational, and non-commercial educational use. 
  * If the buyer plans to offer this platform as a paid commercial service, they must replace the Yahoo scraping endpoints with a licensed commercial real-time data provider (such as Polygon.io, Alpha Vantage, or TwelveData Pro).