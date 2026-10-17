# EventOps Backend

Express + MongoDB API for EventOps.

## Run locally
```bash
npm install
cp .env.example .env   # fill in your values
npm start
```

## Deploy (Render / Railway / Koyeb / Fly.io)
- Build command: `npm install`
- Start command: `npm start`
- Set these environment variables (see `.env.example`):
  `MONGO_URI`, `JWT_SECRET`, `EMAIL_HOST`, `EMAIL_USER`, `EMAIL_PASS`, `BASE_URL`, `FRONTEND_URL`

> Do NOT commit `.env` - set the variables in your hosting dashboard instead.
