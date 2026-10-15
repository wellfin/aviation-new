# Updating the live server

Build **on your PC**, then upload the result. Never build on the server: it runs out of memory and disk.

- Server: `13.204.83.21`
- Key: `C:\parveen\aviation.pem`
- Connect: `ssh -i C:\parveen\aviation.pem ubuntu@13.204.83.21`

| You changed code in | Build on your PC | Upload |
|---|---|---|
| `website` | `npm run pack:server` | `website-server.tar.gz` |
| `admin-frontend` | `npm run pack:server` | `admin-frontend-server.tar.gz` |
| `backend` | `npm run build` | the `dist` folder |

Uploading `.next` on its own does not work. The website and admin panel need the whole package that `pack:server` creates.

---

## Website changed

**On your PC (PowerShell):**

```powershell
cd C:\parveen\aviation\website
npm run pack:server
scp -i C:\parveen\aviation.pem website-server.tar.gz ubuntu@13.204.83.21:~/
```

**On the server:**

```bash
rm -rf ~/aviation/website-app/* ~/aviation/website-app/.next
tar -xzf ~/website-server.tar.gz -C ~/aviation/website-app
rm ~/website-server.tar.gz
pm2 restart aviation-website
```

---

## Admin panel changed

**On your PC (PowerShell):**

```powershell
cd C:\parveen\aviation\admin-frontend
npm run pack:server
scp -i C:\parveen\aviation.pem admin-frontend-server.tar.gz ubuntu@13.204.83.21:~/
```

**On the server:**

```bash
rm -rf ~/aviation/admin-app/* ~/aviation/admin-app/.next
tar -xzf ~/admin-frontend-server.tar.gz -C ~/aviation/admin-app
rm ~/admin-frontend-server.tar.gz
pm2 restart aviation-admin
```

---

## Backend changed

**On your PC (PowerShell):**

```powershell
cd C:\parveen\aviation\backend
npm run build
scp -i C:\parveen\aviation.pem -r dist ubuntu@13.204.83.21:~/aviation/backend/
```

**On the server:**

```bash
pm2 restart aviation-api
```

If you added or changed a package in `backend/package.json`, run this on the server before the restart. It is an install, not a build:

```bash
cd ~/aviation/backend && npm ci --omit=dev
```

---

## Save your code to GitHub

Uploading a build does not save your code. GitHub is your backup. On your PC:

```powershell
cd C:\parveen\aviation
git add . ; git commit -m "describe the change" ; git push origin main
```

The server does not need `git pull` for code updates. The uploaded build is what runs.

---

## First-time setup on the server (once only)

Only needed the first time you switch from building on the server to uploading packages.

```bash
pm2 delete aviation-website aviation-admin
rm -rf ~/aviation/website/node_modules ~/aviation/website/.next
rm -rf ~/aviation/admin-frontend/node_modules ~/aviation/admin-frontend/.next
npm cache clean --force
mkdir -p ~/aviation/website-app ~/aviation/admin-app
```

Upload both packages from your PC (see above), then:

```bash
tar -xzf ~/website-server.tar.gz        -C ~/aviation/website-app
tar -xzf ~/admin-frontend-server.tar.gz -C ~/aviation/admin-app
rm ~/website-server.tar.gz ~/admin-frontend-server.tar.gz

cd ~/aviation/website-app && PORT=3100 HOSTNAME=127.0.0.1 pm2 start server.js --name aviation-website --node-args="--env-file=/home/ubuntu/aviation/website/.env.local"
cd ~/aviation/admin-app   && PORT=3200 HOSTNAME=127.0.0.1 pm2 start server.js --name aviation-admin   --node-args="--env-file=/home/ubuntu/aviation/admin-frontend/.env.local"
pm2 restart aviation-api
pm2 save
pm2 status
```

All three apps should show **online**.

---

## If something goes wrong

| Problem | Fix |
|---|---|
| `Permission denied (publickey)` | Use the key `C:\parveen\aviation.pem` in the `scp` / `ssh` command. |
| `No space left on device` / `ENOSPC` | Run `df -h /`. Free space with `npm cache clean --force` and `pm2 flush`, or grow the disk in **EC2 → Volumes → Modify volume** (20 GB). |
| An app shows `errored` in `pm2 status` | Run `pm2 logs aviation-website --lines 30` (or `aviation-admin`, `aviation-api`) and read the error. |
| The same app appears twice in `pm2 status` | Delete the extra one: `pm2 delete <id>`, then `pm2 save`. |
| Site shows 502 | The apps are not running. Run `pm2 status` and start any that are missing (see the first-time setup). |
| Apps are missing after a server reboot | Run `pm2 startup` once and run the `sudo env PATH=...` line it prints, then `pm2 save`. |

## If the server IP changes

1. On your PC, update the IP in `website\.env.server` and `admin-frontend\.env.server`.
2. On the server, update it in the three env files:
   ```bash
   sed -i 's/OLD_IP/NEW_IP/g' ~/aviation/backend/.env ~/aviation/website/.env.local ~/aviation/admin-frontend/.env.local
   ```
3. Run `npm run pack:server` again for the website and the admin panel, upload both, and restart all apps (`pm2 restart all`).
4. Add the new IP in **MongoDB Atlas → Network Access**.
