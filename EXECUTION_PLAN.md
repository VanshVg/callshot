# Execution Plan

## Phase 1: Project Setup & Foundation
- [ ] Initialize monorepo structure (client/ + server/)
- [ ] Server: Express + TypeScript setup, MongoDB connection, env config
- [ ] Client: Vite + React + TypeScript setup, routing (react-router-dom)
- [ ] Define all Mongoose models (User, Group, Tournament, Category, Prediction, StrategyCard, ActualResult)
- [ ] Seed script for IPL 2025 tournament data (teams, categories, player list)

## Phase 2: Auth & User Management
- [ ] Register & Login endpoints (bcrypt + JWT)
- [ ] Auth middleware (protect routes)
- [ ] Frontend: Login & Register pages
- [ ] AuthContext + protected routes on frontend
- [ ] Basic user profile (view/edit name)

## Phase 3: Groups
- [ ] Create group endpoint (generates unique invite code)
- [ ] Join group via invite code
- [ ] List my groups, group detail page
- [ ] Leave group
- [ ] Frontend: Dashboard with group cards, Create/Join group modals

## Phase 4: Predictions
- [ ] Submit predictions endpoint (validate category rules — correct number of picks per category)
- [ ] Lock predictions when tournament starts
- [ ] View own predictions
- [ ] View all predictions in group (only after tournament starts)
- [ ] Frontend: Prediction form — category-by-category picker with player/team search

## Phase 5: Strategy Cards
- [ ] Initialize 4 cards per user per group-tournament on prediction submission
- [ ] Swap card endpoint (replace a pick, validate before halfway)
- [ ] Joker card endpoint (lock a pick to a position, validate before halfway)
- [ ] Frontend: Card management UI within group view

## Phase 6: Results & Leaderboard
- [ ] Admin panel: enter/update actual results per category
- [ ] Points calculation service
- [ ] Leaderboard endpoint (calculate and return standings)
- [ ] Frontend: Leaderboard table with points breakdown
- [ ] Handle partial results (update as season progresses)

## Phase 7: Polish & Deploy
- [ ] Mobile-responsive styling
- [ ] Error handling & loading states
- [ ] Input validation (frontend + backend)
- [ ] Basic admin role check
- [ ] Deploy (e.g., Railway/Render for backend, Vercel for frontend)

---

## Build Order (recommended)

We build backend endpoint + frontend page together per feature, so each phase produces a working vertical slice:

```
Phase 1 (Setup)          ~1 session
Phase 2 (Auth)           ~1-2 sessions
Phase 3 (Groups)         ~1-2 sessions
Phase 4 (Predictions)    ~2-3 sessions  ← core feature, most complex
Phase 5 (Strategy Cards) ~1-2 sessions
Phase 6 (Results)        ~1-2 sessions
Phase 7 (Polish)         ~1-2 sessions
```

Total: ~8-14 focused sessions

---

## Notes

- No payment integration — entry amount is informational only
- IPL-only for now — Tournament model supports adding others later
- Group creator = group admin (no separate role system needed for v1)
- Player/team data seeded manually (no live API dependency for v1)
