# Deploy on AWS EC2 using Git

This guide puts all three apps on one EC2 server. The server pulls the code from GitHub.

| App | Folder | Port on the server | Public address |
| --- | --- | --- | --- |
| Website | `website/` | 3100 | `https://example.com` |
| Admin panel | `admin-frontend/` | 3200 | `https://admin.example.com` |
| API | `backend/` | 4000 | `https://api.example.com` |

The database stays on **MongoDB Atlas**. Replace `example.com` everywhere with your real domain.

---

## Step 1 — Push the code to GitHub (on your PC)

> **Do this once.** The `website/` folder has its own `.git` folder. Unless you remove it, GitHub stores only a pointer, and the server receives an **empty** `website/` folder.

Open PowerShell in `C:\parveen\aviation`:

```powershell
Move-Item website\.git ..\website-git-backup   # remove the inner repo (backup kept)
git rm --cached website
git add .
git status          # make sure NO .env or .env.local file is listed
git commit -m "Add all apps"
git push origin main
```

`.env` files are git-ignored, so your passwords never go to GitHub. You create them on the server in Step 5.

For later updates, only the last three commands are needed: `git add .`, `git commit -m "..."` and `git push origin main`.

---

## Step 2 — Create the EC2 server (AWS console)

1. Open **EC2 → Launch instance**.
   - Name: `aviation`
   - Image: **Ubuntu Server 24.04 LTS**
   - Instance type: **t3.medium** (4 GB RAM). A t3.small works if you add swap in Step 3.
   - Key pair: **Create new key pair**, then download the `.pem` file and keep it safe.
   - Storage: **30 GB**.
   - Security group, allow:
     - **SSH (22)** from *My IP*
     - **HTTP (80)** from *Anywhere*
     - **HTTPS (443)** from *Anywhere*
2. Open **EC2 → Elastic IPs → Allocate**, then **Associate** it with the instance. This gives you a fixed IP.
3. At your domain provider, create 4 **A records** pointing to that Elastic IP:
   - `example.com`
   - `www.example.com`
   - `admin.example.com`
   - `api.example.com`
4. Open **MongoDB Atlas → Network Access → Add IP Address** and add the Elastic IP.

---

## Step 3 — Connect and install the software

From PowerShell on your PC:

```powershell
ssh -i C:\path\to\your-key.pem ubuntu@<ELASTIC_IP>
```

Then, on the server:

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs git nginx certbot python3-certbot-nginx
sudo npm install -g pm2

# Only on small instances (t3.small): add 2 GB swap so builds don't run out of memory
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## Step 4 — Clone the code with Git

The repo is private, so give the server a **deploy key**:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/github_deploy -N ""
cat ~/.ssh/github_deploy.pub          # copy the line it prints
```

1. In GitHub, open the repo, then **Settings → Deploy keys → Add deploy key**.
2. Paste the key and save. Keep "Allow write access" **unticked**.

Then, on the server:

```bash
printf 'Host github.com\n  IdentityFile ~/.ssh/github_deploy\n  IdentitiesOnly yes\n' >> ~/.ssh/config

git clone git@github.com:wellfin/aviation-new.git ~/aviation
ls ~/aviation            # should show: admin-frontend  backend  website ...
```

---

## Step 5 — Create the .env files on the server

Each app needs its own env file. You create them with the **nano** editor.

### How to use nano

| Action | Keys |
| --- | --- |
| Open or create a file | `nano path/to/file` |
| Paste text | right-click, or `Ctrl+Shift+V` |
| **Save** | `Ctrl+O`, then `Enter` |
| **Exit** | `Ctrl+X` |
| Exit without saving | `Ctrl+X`, then `N` |

### 5.1 Generate two secrets first

```bash
openssl rand -hex 48     # → use as JWT_ACCESS_SECRET
openssl rand -hex 32     # → use as INTERNAL_API_KEY
```

Copy both values somewhere temporarily. `INTERNAL_API_KEY` must be the **same** in the backend and website files.

### 5.2 Backend: `~/aviation/backend/.env`

```bash
nano ~/aviation/backend/.env
```

Paste the block below, change every `<...>` value and `example.com`, then save (`Ctrl+O`, `Enter`, `Ctrl+X`):

```ini
NODE_ENV=production
PORT=4000
LOG_LEVEL=info
TRUST_PROXY=1

MONGODB_URI=<your Atlas URI, e.g. mongodb+srv://user:pass@cluster0.xxxx.mongodb.net/aviation?retryWrites=true&w=majority>

CORS_ORIGINS=https://example.com,https://www.example.com,https://admin.example.com
FRONTEND_URL=https://example.com
PUBLIC_API_URL=https://api.example.com

JWT_ACCESS_SECRET=<first secret from 5.1>
JWT_ACCESS_TTL_SECONDS=900
REFRESH_TTL_DAYS=30
REFRESH_SHORT_TTL_HOURS=24

OTP_TTL_MINUTES=10
OTP_MAX_ATTEMPTS=5
LOGIN_MAX_FAILED_ATTEMPTS=8
LOGIN_LOCK_MINUTES=15

MAIL_TRANSPORT=smtp
MAIL_FROM="Global Aviation <parveen@marioxsoftware.com>"
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=parveen@marioxsoftware.com
SMTP_PASS="<gmail app password>"
SMTP_SECURE=false

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=

RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

UPLOAD_DIR=/home/ubuntu/aviation-uploads
UPLOAD_MAX_IMAGE_MB=5
UPLOAD_MAX_DOCUMENT_MB=15

RATE_LIMIT_WINDOW_MINUTES=15
RATE_LIMIT_MAX=600
AUTH_RATE_LIMIT_MAX=30
INTERNAL_API_KEY=<second secret from 5.1>
SESSION_RATE_LIMIT_MAX=300
OTP_RATE_LIMIT_MAX=30
```

### 5.3 Website: `~/aviation/website/.env.local`

```bash
nano ~/aviation/website/.env.local
```

```ini
NEXT_PUBLIC_SITE_URL=https://example.com
DATA_SOURCE=api
NEXT_PUBLIC_DATA_SOURCE=api
API_BASE_URL=http://127.0.0.1:4000
NEXT_PUBLIC_API_BASE_URL=https://api.example.com
NEXT_PUBLIC_ADMIN_URL=https://admin.example.com
INTERNAL_API_KEY=<same second secret as the backend>

WEATHER_PROVIDER=aviationweather
CHECKWX_API_KEY=
NOTAM_PROVIDER=faa-search
FAA_NOTAM_CLIENT_ID=
FAA_NOTAM_CLIENT_SECRET=
AIRPORT_DATA_PROVIDER=openaip
OPENAIP_API_KEY=<your OpenAIP key>
AIRPORTDB_API_TOKEN=
NEXT_PUBLIC_OPENAIP_API_KEY=<your OpenAIP key>
INTEGRATION_TIMEOUT_MS=8000
```

Save with `Ctrl+O`, `Enter`, `Ctrl+X`.

### 5.4 Admin panel: `~/aviation/admin-frontend/.env.local`

```bash
nano ~/aviation/admin-frontend/.env.local
```

```ini
NEXT_PUBLIC_DATA_SOURCE=api
NEXT_PUBLIC_API_BASE_URL=https://api.example.com
NEXT_PUBLIC_SITE_URL=https://example.com
```

Save with `Ctrl+O`, `Enter`, `Ctrl+X`.

### 5.5 Protect the files and check them

```bash
chmod 600 ~/aviation/backend/.env ~/aviation/website/.env.local ~/aviation/admin-frontend/.env.local
mkdir -p ~/aviation-uploads
cat ~/aviation/admin-frontend/.env.local     # quick check that the file was saved
```

**Rules for .env values:**
- Write one `KEY=value` per line, with no spaces around `=`.
- Put values that contain spaces in quotes, for example `SMTP_PASS="abcd efgh ijkl mnop"`.
- `.env` files never go into Git. If you change one later, see Step 9.

---

## Step 6 — Build and start the apps

```bash
cd ~/aviation/backend        && npm ci && npm run build
cd ~/aviation/website        && npm ci && npm run build
cd ~/aviation/admin-frontend && npm ci && npm run build

cd ~/aviation/backend        && pm2 start dist/server.js --name aviation-api --node-args="--env-file=.env"
cd ~/aviation/website        && pm2 start npm --name aviation-website -- start -- -p 3100
cd ~/aviation/admin-frontend && pm2 start npm --name aviation-admin -- start -- -p 3200

pm2 save
pm2 startup           # copy and run the "sudo env PATH=..." line it prints (auto-start after reboot)

pm2 status            # all three should be "online"
curl localhost:4000/health
```

On a new, empty database, add the demo data and create your admin login:

```bash
cd ~/aviation/backend
npm run seed
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='<strong password>' npm run create-admin
```

---

## Step 7 — Nginx (domain → app)

```bash
sudo nano /etc/nginx/sites-available/aviation
```

Paste the block below, replace `example.com`, then save:

```nginx
server {
  listen 80;
  server_name example.com www.example.com;
  location / {
    proxy_pass http://127.0.0.1:3100;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}

server {
  listen 80;
  server_name admin.example.com;
  location / {
    proxy_pass http://127.0.0.1:3200;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}

server {
  listen 80;
  server_name api.example.com;
  client_max_body_size 20m;
  location / {
    proxy_pass http://127.0.0.1:4000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Enable it:

```bash
sudo ln -s /etc/nginx/sites-available/aviation /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

## Step 8 — HTTPS (free SSL)

```bash
sudo certbot --nginx -d example.com -d www.example.com -d admin.example.com -d api.example.com
```

The site is now live:
- https://example.com (website)
- https://admin.example.com (admin panel)

---

## Step 9 — Deploy updates with Git

On your PC:

```powershell
git add . ; git commit -m "describe the change" ; git push origin main
```

On the server:

```bash
cd ~/aviation && git pull origin main

cd ~/aviation/backend        && npm ci && npm run build
cd ~/aviation/website        && npm ci && npm run build
cd ~/aviation/admin-frontend && npm ci && npm run build

pm2 restart all
```

**After changing a .env file on the server:**
- Backend `.env`: run `pm2 restart aviation-api`.
- Website or admin `.env.local`: run `npm run build` in that folder, then `pm2 restart aviation-website` or `pm2 restart aviation-admin`. `NEXT_PUBLIC_*` values are built into the pages, so a restart alone is not enough.

---

## Useful commands and fixes

```bash
pm2 status                          # are the apps running?
pm2 logs aviation-api --lines 100   # see API errors
pm2 restart all
```

| Problem | Fix |
| --- | --- |
| API stops with "Invalid environment configuration" | The log names the wrong value. For example, `JWT_ACCESS_SECRET` must be 48+ characters, and `MAIL_TRANSPORT` must be `smtp`. |
| `MongoServerSelectionError` | The Elastic IP is missing from Atlas Network Access. |
| Login fails / CORS error in the browser | `CORS_ORIGINS` must contain the exact `https://` addresses, with no trailing `/`. |
| Pages still call `localhost:4000` | Fix `NEXT_PUBLIC_API_BASE_URL`, then rebuild that app. |
| Build killed / out of memory | Add swap (Step 3) or use a bigger instance. |
| `website/` folder empty on the server | Step 1 was skipped. |

**Point these services at the live API when you use them:**
- **Razorpay webhook:** `https://api.example.com/api/v1/billing/webhooks/razorpay`
- **Google login redirect:** `https://api.example.com/api/v1/auth/oauth/google/callback`
- **LinkedIn login redirect:** `https://api.example.com/api/v1/auth/oauth/linkedin/callback`
