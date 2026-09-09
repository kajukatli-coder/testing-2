# BLACK SITE // INCIDENT-17 — Player Package

Welcome to **BLACK SITE // INCIDENT-17**.

## Story
A classified security incident was recorded years ago. The archive contains incident files, but INCIDENT-017 is missing. Official records claim it was deleted, but remnants remain. Investigate the system to discover the truth.

## Player Credentials
- **Email**: `agent.rivera@blacksite.gov`
- **Password**: `Recover2019!`

## Challenge Setup

### 1. Load Docker Image Archive
```bash
docker load -i blacksite-incident-17.tar
```

### 2. Start Application
```bash
docker compose -f docker-compose.player.yml up -d
```

### 3. Access Challenge
Open your browser and navigate to:
**http://localhost:8080**

### 4. Stop Challenge
```bash
docker compose -f docker-compose.player.yml down
```
