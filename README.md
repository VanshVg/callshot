# CallShot 🏏

> **Predict Bold. Play Smart.**

CallShot is a cricket prediction tournament web app built for friend groups. Before the IPL season kicks off, every member makes their picks across 10 categories — most runs, most wickets, best economy, and more. Points accumulate as the season unfolds, and the leaderboard settles the debate: who really knows cricket?

---

## Features

- **Group-based competition** — Create a group, share an invite code, play with your friends
- **10 prediction categories** — Most runs, most wickets, best economy, best strike rate, and more
- **Strategy cards** — Use a Swap card to change one pick mid-season, or a Joker card to double down on a prediction for bonus points
- **Points leaderboard** — Live standings update as the admin enters actual results
- **Email verification** — OTP-based email verification on signup
- **Mobile-first UI** — Fully responsive, built for phones

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4 |
| Backend | Node.js, Express 5, TypeScript |
| Database | MongoDB, Mongoose 9 |
| Auth | JWT (access + refresh tokens), bcryptjs |
| Email | Nodemailer (SMTP) |

---

## Project Structure

```
callshot/
├── client/          # React + Vite frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/      # Layout, Navbar, Modal, Button, Input
│   │   │   └── groups/      # GroupCard, CreateGroupModal, JoinGroupModal
│   │   ├── context/         # AuthContext (JWT + user state)
│   │   ├── pages/           # Home, Login, Register, VerifyEmail, Dashboard, GroupDetail
│   │   ├── services/        # axios API calls (api.ts, groups.ts)
│   │   ├── types/           # Shared TypeScript interfaces
│   │   └── constants/       # brand.ts (name, tagline, colors)
│   └── public/logos/        # Brand logo assets
│
└── server/          # Express + TypeScript API
    └── src/
        ├── controllers/     # auth.ts
        ├── models/          # User, Group, Tournament, Category, Prediction, StrategyCard, ActualResult
        ├── routes/          # auth, groups, tournaments, predictions, cards, leaderboard, admin
        ├── middleware/      # JWT auth (protect, adminOnly)
        ├── services/        # email.ts, emailTemplates.ts, pointsCalculator.ts
        ├── seed/            # ipl.ts — seeds IPL 2025 tournament data
        └── constants/       # brand.ts
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- A Gmail account (or any SMTP) for OTP emails

---

### 1. Clone the repo

```bash
git clone https://github.com/your-username/callshot.git
cd callshot
```

### 2. Set up the server

```bash
cd server
npm install
```

Create a `.env` file in `server/`:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/callshot
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=your-email@gmail.com
```

> **Gmail tip:** Use an [App Password](https://myaccount.google.com/apppasswords) — not your regular Gmail password.

Seed the IPL 2025 tournament data:

```bash
npm run seed
```

Start the dev server:

```bash
npm run dev
```

The API will be available at `http://localhost:5000`.

---

### 3. Set up the client

```bash
cd ../client
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

Vite proxies all `/api` requests to `http://localhost:5000`, so no CORS configuration is needed during development.

---

### 4. Access from other devices on the same network

The Vite dev server binds to `0.0.0.0` by default in this setup. When you run `npm run dev`, Vite will print a network URL like:

```
➜  Network: http://192.168.x.x:5173/
```

Open that URL on any phone or device on the same Wi-Fi network.

---

## How the Points System Works

Each group plays within a single IPL tournament. Before the season starts, each member fills in their picks for 10 categories (e.g. "Top 3 run scorers"). Picks are locked once the tournament begins.

### Positional Scoring

For categories with 3 selections (ranked 1st–3rd):

| Position | Points |
|----------|--------|
| 1st pick correct | 10 pts |
| 2nd pick correct | 8 pts |
| 3rd pick correct | 6 pts |
| 4th pick correct | 4 pts |
| 5th pick correct | 2 pts |

### Player of the Tournament

Exact match = **20 points**.

### Strategy Cards

Each member gets 2 cards:

| Card | Effect |
|------|--------|
| **Swap** | Replace one pick with a new player/team (usable once, mid-season) |
| **Joker** | Mark one category — if your pick is exactly right, earn **+30 bonus points** |

Unused cards at the end of the season earn **4 points each**.

---

## Available Scripts

### Server (`/server`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with nodemon |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled production build |
| `npm run seed` | Seed IPL 2025 tournament, categories, and players |

### Client (`/client`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview the production build locally |

---

## API Overview

All API routes are prefixed with `/api`.

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/auth/register` | — | Register (sends OTP) |
| POST | `/auth/verify-email` | — | Verify OTP, receive tokens |
| POST | `/auth/resend-otp` | — | Resend verification OTP |
| POST | `/auth/login` | — | Login |
| POST | `/auth/refresh-token` | — | Refresh access token |
| GET | `/auth/me` | ✓ | Get current user |
| GET | `/groups` | ✓ | List my groups |
| POST | `/groups` | ✓ | Create a group |
| GET | `/groups/:id` | ✓ | Get group detail |
| POST | `/groups/join` | ✓ | Join via invite code |
| DELETE | `/groups/:id/leave` | ✓ | Leave a group |
| GET | `/tournaments` | ✓ | List tournaments |
| GET/POST | `/predictions` | ✓ | Get / submit predictions |
| GET/POST | `/cards` | ✓ | Get / use strategy cards |
| GET | `/leaderboard/:groupId` | ✓ | Group leaderboard |
| POST | `/admin/results` | Admin | Enter actual results |

---

## Environment Variables Reference

### Server `.env`

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: `5000`) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret for access tokens |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens |
| `JWT_EXPIRES_IN` | Access token TTL (e.g. `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token TTL (e.g. `7d`) |
| `CLIENT_URL` | Allowed CORS origin(s), comma-separated |
| `NODE_ENV` | `development` or `production` |
| `SMTP_HOST` | SMTP host (e.g. `smtp.gmail.com`) |
| `SMTP_PORT` | SMTP port (`587` for TLS) |
| `SMTP_USER` | SMTP username / email |
| `SMTP_PASS` | SMTP password or app password |
| `SMTP_FROM` | Sender address shown in emails |

---

## Roadmap

- [x] Phase 1 — Auth (register, OTP verify, login, JWT refresh)
- [x] Phase 2 — Email verification with branded OTP emails
- [x] Phase 3 — Groups (create, join, invite codes, member list)
- [ ] Phase 4 — Predictions (category picker, player/team search, lock on start)
- [ ] Phase 5 — Strategy cards (swap & joker card UI)
- [ ] Phase 6 — Results & leaderboard (admin panel, points calculation)
- [ ] Phase 7 — Polish & deploy

---

## License

MIT
