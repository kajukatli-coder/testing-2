# BLACKSITE // INCIDENT-17 — CTF App

## Run
```
npm install
npm start
```
Visit http://localhost:3000

## Player login (give this to competitors separately, not on the login page)
- email: `agent.rivera@blacksite.gov`
- password: `Recover2019!`

## Deploying for a real event
This is a stateless Express app — deploy as-is to any Node host (Render, Railway, Fly.io, a VPS, etc).
Set `PORT` env var if needed. No database required (in-memory data, resets on restart).
For a multi-team event, either give every team the same shared instance (fine, since there's
no per-team state beyond session) or spin up one instance per team if you want full isolation.

## Structure
- `server.js` — all routes, data, and the intentional vulnerability
- `public/css/modern.css` — modern archive UI
- `public/css/legacy.css` — legacy terminal UI
- `robots.txt` route — discovery hint pointing at `/legacy`

## The vulnerability (for organizers)
`/incident/:id` (modern) checks `req.session.user.clearance` before showing restricted
records. `/legacy/api/records` and `/legacy/api/evidence` only check `requireLogin` —
they never check clearance. That's the broken access control: same backend data,
inconsistent authorization between the modern and legacy surfaces.
