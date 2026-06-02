# Deployment Guide

This project is deployed via GitHub Actions + Docker + GitHub Container Registry (GHCR).

## Overview

```
Push to main
  └─ GitHub Actions
       ├─ Build backend image  → ghcr.io/<owner>/notedeck-backend:latest
       ├─ Build frontend image → ghcr.io/<owner>/notedeck-frontend:latest
       └─ SSH into VM
            ├─ docker compose pull
            └─ docker compose up -d
```

---

## 1. Prepare the VM (one-time)

Any Ubuntu 22.04+ VM works. Run as root or with sudo:

```bash
# Install Docker (includes the Compose plugin)
curl -fsSL https://get.docker.com | sh
usermod -aG docker $USER   # allow running docker without sudo
newgrp docker               # apply group change in current session

# Verify
docker --version
docker compose version
```

---

## 2. Create the environment file on the VM

```bash
mkdir -p ~/notedeck
nano ~/notedeck/.env
```

Paste the following and fill in every value:

```dotenv
# --- Docker image source ---
GHCR_OWNER=your-github-username          # lowercase!

# --- MySQL ---
MYSQL_ROOT_PASSWORD=change-me-strong-root-password
MYSQL_PASSWORD=change-me-strong-notedeck-password

# --- App ---
CORS_ORIGIN=http://your-vm-ip-or-domain  # e.g. https://notes.example.com

# --- Firebase Admin (backend) ---
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxx@your-project-id.iam.gserviceaccount.com
# Keep the literal \n in the key value and wrap in double quotes:
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"

# NOTE: OPENAI_API_KEY is injected by CI (GitHub Actions secret) — do NOT add it here.
```

---

## 3. Add GitHub Actions secrets

Go to **GitHub → your repo → Settings → Secrets and variables → Actions → New repository secret**.

| Secret | Value |
|---|---|
| `VM_HOST` | IP address or hostname of your VM |
| `VM_USER` | SSH username (e.g. `ubuntu`) |
| `VM_SSH_KEY` | Private SSH key whose public key is in `~/.ssh/authorized_keys` on the VM |
| `VM_GHCR_TOKEN` | GitHub PAT with **`read:packages`** scope (see below) |
| `VITE_FIREBASE_API_KEY` | Firebase web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | e.g. `your-project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | e.g. `your-project.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Numeric sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |
| `OPENAI_API_KEY` | OpenAI API key — optional; if unset `/api/import` returns 503 (feature disabled) |

### Generate VM_GHCR_TOKEN

1. GitHub → **Settings** (your profile) → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
2. Click **Generate new token (classic)**
3. Select scope: `read:packages`
4. Copy the token and save it as `VM_GHCR_TOKEN`

### Generate VM_SSH_KEY

On your local machine (or wherever you manage the VM's SSH keys):

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/notedeck_deploy
# Add the public key to the VM:
ssh-copy-id -i ~/.ssh/notedeck_deploy.pub user@your-vm-ip
# Copy the PRIVATE key content as VM_SSH_KEY secret:
cat ~/.ssh/notedeck_deploy
```

---

## 4. Make GHCR packages public (optional but simpler)

By default GHCR packages are private. After the first push:

1. Go to **GitHub → your profile → Packages → notedeck-backend** (and `-frontend`)
2. **Package settings → Change visibility → Public**

This means the VM does not need to authenticate to pull images.
You can skip creating `VM_GHCR_TOKEN` in that case and remove the `docker login` line from the workflow.

---

## 5. First deploy

Push anything to `main` (or re-run the workflow manually). The pipeline will:

1. Build both Docker images and push them to GHCR
2. Copy `docker-compose.prod.yml` to `~/notedeck/` on the VM
3. SSH in, pull the new images, and restart the services

The backend container automatically runs `prisma db push` on every start, so the MySQL schema is always in sync.

---

## Day-to-day

Every `git push` to `main` triggers a full rebuild and deploy automatically. No manual steps needed.

To roll back, re-run an older workflow run from the GitHub Actions UI — the previous `:latest` image is also tagged with the commit SHA (`:abc1234`), so you can pin `docker-compose.prod.yml` to a specific SHA temporarily.
