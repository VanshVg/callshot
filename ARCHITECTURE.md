# CallShot - Architecture & System Design

## Overview
A cricket prediction tournament platform where users create/join groups, predict player and team performances for IPL (and future tournaments), and compete with friends based on a points system.

---

## Brand Identity
- **App Name:** CallShot
- **Colors:** Charcoal Black `#C1400K` · Bright Orange `#FF6800` · White
- **Logo files:** `Logos/call_shot_combined.png`, `call_shot_app_icon.png`, `call_shot_logo.png`, `call_shot_white_bg.png`
- **Note:** Name and logo may change in future — keep all branding in one place (config/constants file) so it can be swapped without touching component code

---

## Tech Stack
- **Frontend:** React (TypeScript) + Vite
- **Backend:** Node.js + Express (TypeScript)
- **Database:** MongoDB + Mongoose
- **Auth:** JWT (access + refresh tokens)
- **Real-time:** Socket.io (for live leaderboard updates, optional Phase 2)

---

## Core Entities

### User
- name, username, email, password (hashed)
- role: user | admin
- createdAt

### Group
- name, description, createdBy (User ref)
- inviteCode (unique, shareable)
- members[] (User refs)
- tournament (Tournament ref)
- status: draft | active | completed

### Tournament
- name (e.g., "IPL 2025")
- sport: "cricket"
- type (e.g., "ipl")
- season/year
- totalMatches
- startDate, endDate
- status: upcoming | live | completed
- categories[] (embedded or ref)

### Category
- name (e.g., "Purple Cap", "Orange Cap", "Most Fours", etc.)
- type: player_stat | team_position | single_player
- selectionCount (how many picks a user must make, e.g., 3 players or 4 teams)
- scoringType: positional | exact_match
- description

### Prediction
- user (User ref)
- group (Group ref)
- tournament (Tournament ref)
- picks[] — array of:
  - category (Category ref)
  - selections[] (player names or team names)
- submittedAt
- locked: boolean

### StrategyCard
- user (User ref)
- group (Group ref)
- tournament (Tournament ref)
- cards[] — array of:
  - type: swap | joker
  - used: boolean
  - usedAt: Date | null
  - details: { category, originalPick, newPick } (for swap) or { category, player, predictedPosition } (for joker)
- unusedCount (computed) — each unused card = 4 points

### Leaderboard (computed/cached)
- group (Group ref)
- tournament (Tournament ref)
- standings[] — { user, totalPoints, categoryBreakdown }

### ActualResult (admin-managed)
- tournament (Tournament ref)
- category (Category ref)
- rankings[] — ordered list of top 5 players/teams with positions

---

## API Structure

```
/api
  /auth
    POST   /register
    POST   /login
    POST   /refresh-token
    GET    /me

  /groups
    POST   /                    — create group
    GET    /                    — list my groups
    GET    /:id                 — group details
    POST   /:id/join            — join via invite code
    DELETE /:id/leave           — leave group

  /tournaments
    GET    /                    — list available tournaments
    GET    /:id                 — tournament details + categories

  /predictions
    POST   /                    — submit predictions for a group+tournament
    GET    /:groupId/:tournamentId  — get my predictions
    GET    /:groupId/:tournamentId/all — get all predictions (only after tournament starts)

  /cards
    GET    /:groupId/:tournamentId  — get my cards status
    POST   /swap                — use swap card
    POST   /joker               — use joker card

  /leaderboard
    GET    /:groupId/:tournamentId  — get leaderboard

  /admin
    POST   /results             — enter/update actual results
    PUT    /tournaments/:id     — update tournament status
```

---

## Folder Structure

```
predictionn_tournament/
├── client/                     # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/         # Button, Input, Modal, Card, etc.
│   │   │   ├── auth/           # Login, Register forms
│   │   │   ├── groups/         # GroupCard, GroupList, CreateGroup, JoinGroup
│   │   │   ├── predictions/    # PredictionForm, CategoryPicker, PlayerSelector
│   │   │   ├── cards/          # SwapCard, JokerCard, CardManager
│   │   │   └── leaderboard/    # LeaderboardTable, PointsBreakdown
│   │   ├── pages/
│   │   │   ├── Home.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── Dashboard.tsx       # My groups overview
│   │   │   ├── GroupDetail.tsx      # Single group view
│   │   │   ├── Predictions.tsx     # Submit/view predictions
│   │   │   ├── Leaderboard.tsx
│   │   │   └── Admin.tsx           # Enter results
│   │   ├── hooks/
│   │   ├── services/           # API call functions
│   │   ├── context/            # AuthContext, etc.
│   │   ├── types/              # TypeScript interfaces
│   │   ├── utils/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── tsconfig.json
│
├── server/                     # Node.js backend
│   ├── src/
│   │   ├── config/
│   │   │   └── db.ts
│   │   ├── models/
│   │   │   ├── User.ts
│   │   │   ├── Group.ts
│   │   │   ├── Tournament.ts
│   │   │   ├── Category.ts
│   │   │   ├── Prediction.ts
│   │   │   ├── StrategyCard.ts
│   │   │   ├── ActualResult.ts
│   │   │   └── index.ts
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── groups.ts
│   │   │   ├── tournaments.ts
│   │   │   ├── predictions.ts
│   │   │   ├── cards.ts
│   │   │   ├── leaderboard.ts
│   │   │   └── admin.ts
│   │   ├── controllers/
│   │   │   └── (mirrors routes)
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   └── validation.ts
│   │   ├── services/
│   │   │   ├── pointsCalculator.ts
│   │   │   └── leaderboard.ts
│   │   ├── utils/
│   │   ├── types/
│   │   └── app.ts
│   ├── package.json
│   └── tsconfig.json
│
├── ARCHITECTURE.md
└── EXECUTION_PLAN.md
```

---

## Points Calculation Logic

```
For each category:
  For each user's selected players/teams:
    Check if the selection appears in the actual top 5
    If position 1 → 10 pts
    If position 2 → 8 pts
    If position 3 → 6 pts
    If position 4 → 4 pts
    If position 5 → 2 pts

Player of the Tournament:
  If correct pick among selections → 20 pts

Joker Card:
  If predicted player + exact position is correct → +30 pts bonus

Unused Cards:
  Each unused card → 4 pts
```

---

## Key Business Rules

1. **Predictions lock** before the tournament starts — no edits after that
2. **Strategy cards (4 total)** — each can be used as either Swap or Joker
3. **Cards must be used before halfway** (e.g., before match 40 of 80)
4. **Predictions visible to group** only after tournament starts
5. **Group creator acts as group admin** — can manage the group
6. **Tournament admin** (app-level, role: admin) enters actual results as the season progresses

---

## My Suggestions (keeping it minimal for v1)

1. **Seed data for IPL teams and popular players** — so users pick from a list instead of typing names (reduces errors)
2. **Simple invite link** — group creator shares a code/link, friends join with one click
3. **Dashboard** — clean view of all your groups, upcoming deadlines, and current standings
4. **Mobile-responsive** — most users will access from phones in a group chat context
5. **Export/share leaderboard** — simple image or text export to share in WhatsApp groups

Things intentionally **deferred** for later:
- Real-time notifications
- Multiple sport support
- Live match data API integration
- Payment/wallet system
- Chat within groups
- Advanced analytics
