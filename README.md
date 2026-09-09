# BLACK SITE // INCIDENT-17 — Web CTF Challenge

An abandoned government/security incident management website CTF challenge.

## Quick Start (Local Docker)

### 1. Build and Start Container
```bash
docker compose up --build -d
```
Access the application at **http://localhost:8080**

### 2. Player Login Credentials
- **Email**: `agent.rivera@blacksite.gov`
- **Password**: `Recover2019!`

### 3. Check Logs
```bash
docker compose logs -f
```

### 4. Stop Service
```bash
docker compose down
```

### 5. Clean Reset (⚠️ Deletes Containers & Temporary Volumes)
```bash
docker compose down -v --remove-orphans
```

---

## Participant Package Setup (Offline / Image Export)

To export the challenge for offline participant testing:

```bash
# Build image
docker compose build

# Save image archive
docker save blacksite-incident-17:latest -o blacksite-incident-17.tar

# Player startup instructions (on participant machine)
docker load -i blacksite-incident-17.tar
docker compose -f docker-compose.player.yml up -d
```

---

## Challenge Architecture
- **Stateless Express App**: Node.js app serving modern archive portal and legacy lookup endpoints.
- **Port**: Listens on `0.0.0.0:3000` inside container, mapped to host port `8080`.
- **Environment**: Supports `PORT` and `FLAG` environment overrides.
