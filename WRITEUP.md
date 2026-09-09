# BLACKSITE // INCIDENT-17 — Writeup

**Flag:** `BREACH{017_nEVERR_dELetEs}`

## Steps
1. Log in as the normal user (`/login`).
2. Browse the archive — INC-014,015,016,018,019 exist, INC-017 doesn't. Note the gap.
3. Open INC-016 and INC-018 — both reference INC-017. Clicking it → 404.
4. Search `017` in the archive search bar → returns a stub result, confirms the record still exists in the index even though it 404s.
5. Check `/robots.txt` → disallows `/legacy` and `/legacy/api`. Visit `/legacy`.
6. On the legacy terminal, query the archive lookup for `017` (`GET /legacy/api/records?id=017`). Unlike the modern `/incident/:id` route, this endpoint never checks the user's clearance — broken access control. Returns INC-017's metadata: TOP SECRET, PURGED, PARTIAL recovery, and 3 fragment IDs.
7. Pull each fragment via `GET /legacy/api/evidence?fragment=FRAG-7A/B/C`:
   - **FRAG-7A** — the XOR key: `SHADOWNODE`
   - **FRAG-7B** — the method: XOR the FRAG-7C hex bytes with the key, repeating, read as ASCII
   - **FRAG-7C** — the ciphertext (hex)
8. XOR-decode FRAG-7C with the key from FRAG-7A → `INCIDENT017NEVERDELETED`
9. Submit that code at `/legacy/vault` (`POST /legacy/api/recovery`) → recovery verified.
10. Hit "Access Final Evidence" (`GET /legacy/api/final-evidence`) → flag.

## Root cause
Two endpoints serve the same incident data, but only the modern one enforces clearance
(`session.user.clearance === 'restricted'`). The legacy endpoints only check that a
session exists, not what it's allowed to see — classic inconsistent/broken access control
between a modern and a legacy interface.
