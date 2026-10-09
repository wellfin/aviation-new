// Builds this app on your own computer and packs it for the server, so the server never runs
// `npm install` or `next build` (no out-of-memory / out-of-disk on a small instance).
//
//   1. Create .env.server next to package.json with the SERVER's public values, e.g.
//        NEXT_PUBLIC_SITE_URL=http://13.204.83.21
//        NEXT_PUBLIC_API_BASE_URL=http://13.204.83.21
//      (see DEPLOY.md for the full list). They are baked into the build.
//   2. npm run pack:server   →  <app>-server.tar.gz
//   3. Upload it and start it with `node server.js` (DEPLOY.md, "Build on your PC").
//
// Runtime secrets stay in the server's .env.local and are passed with `node --env-file`.
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const root = path.resolve();
const app = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")).name;
const envFile = path.join(root, ".env.server");
if (!existsSync(envFile)) {
  console.error("Missing .env.server — create it with the server's NEXT_PUBLIC_* values (see the comment at the top of this script).");
  process.exit(1);
}

// .env.server wins over .env.local: Next.js never overrides variables that are already set.
const serverEnv = {};
for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m) serverEnv[m[1]] = m[2].replace(/^(["'])(.*)\1$/, "$2");
}
console.log(`Building ${app} for ${serverEnv.NEXT_PUBLIC_SITE_URL ?? serverEnv.NEXT_PUBLIC_API_BASE_URL ?? "the server"} …`);

const run = (cmd, args, opts = {}) => {
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: process.platform === "win32", ...opts });
  if (r.status !== 0) process.exit(r.status ?? 1);
};
rmSync(path.join(root, ".next"), { recursive: true, force: true });
run(process.execPath, [path.join(root, "node_modules", "next", "dist", "bin", "next"), "build"], { env: { ...process.env, ...serverEnv, NODE_ENV: "production" }, shell: false });

// Assemble: standalone server + static assets + public files.
const out = path.join(root, ".server-build");
rmSync(out, { recursive: true, force: true });
cpSync(path.join(root, ".next", "standalone"), out, { recursive: true });
cpSync(path.join(root, ".next", "static"), path.join(out, ".next", "static"), { recursive: true });
if (existsSync(path.join(root, "public"))) cpSync(path.join(root, "public"), path.join(out, "public"), { recursive: true });
// Never ship local env files; the server passes its own with --env-file.
for (const f of readdirSync(out)) if (f.startsWith(".env")) rmSync(path.join(out, f), { force: true });

// Image optimisation needs sharp's Linux binary on the (Linux x64) server.
const sharpPkg = path.join(out, "node_modules", "sharp", "package.json");
if (existsSync(sharpPkg)) {
  const version = JSON.parse(readFileSync(sharpPkg, "utf8")).version;
  const tmp = mkdtempSync(path.join(os.tmpdir(), "sharp-linux-"));
  writeFileSync(path.join(tmp, "package.json"), "{}");
  run("npm", ["install", "--no-save", "--no-package-lock", "--no-audit", "--no-fund", "--os=linux", "--cpu=x64", "--libc=glibc", `sharp@${version}`], { cwd: tmp });
  const img = path.join(tmp, "node_modules", "@img");
  for (const d of readdirSync(img)) if (d.includes("linux-x64")) cpSync(path.join(img, d), path.join(out, "node_modules", "@img", d), { recursive: true });
  rmSync(tmp, { recursive: true, force: true });
}

const tarball = path.join(root, `${app}-server.tar.gz`);
rmSync(tarball, { force: true });
// Relative paths: GNU tar would read "C:\…" as a remote host.
run("tar", ["-czf", path.basename(tarball), "-C", ".server-build", "."], { cwd: root });
const mb = (statSync(tarball).size / 1024 / 1024).toFixed(1);
console.log(`\nReady: ${path.basename(tarball)} (${mb} MB). Upload it and start it as described in DEPLOY.md.`);
