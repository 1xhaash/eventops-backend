# EventOps Backend

Express + MongoDB API for EventOps. Runs as a normal server locally and as a
Vercel Serverless Function in production.

## Run locally
```bash
npm install
cp .env.example .env   # fill in your values
npm start
```

## Deploy on Vercel (free, no card)
1. Go to https://vercel.com/new and import this repository (`eventops-backend`).
2. Vercel auto-detects Express (no build settings needed).
3. Add these Environment Variables in the project settings:
   `MONGO_URI`, `JWT_SECRET`, `EMAIL_HOST`, `EMAIL_USER`, `EMAIL_PASS`, `BASE_URL`, `FRONTEND_URL`
4. Deploy. Copy the deployment URL (e.g. `https://eventops-backend.vercel.app`).

Notes:
- `BASE_URL` must be this backend's public URL.
- `FRONTEND_URL` must be the frontend URL (used after email verification).
- MongoDB Atlas must allow access from anywhere (`0.0.0.0/0`).

## Deploy on Render / Railway (alternative)
- Build command: `npm install`
- Start command: `npm start`
- Set the same environment variables (see `.env.example`).

> Do NOT commit `.env` - set the variables in your hosting dashboard instead.
