// Starts a local single-node MongoDB replica set for development (transactions need a replica set).
// Data lives in ./.mongo-data; the system-wide MongoDB service is left untouched.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { MongoClient } from "mongodb";

const PORT = Number(process.env.DEV_MONGO_PORT ?? 27018);
const DBPATH = ".mongo-data";
const BIN =
  process.env.MONGOD_BIN ??
  (process.platform === "win32" && existsSync("C:\\Program Files\\MongoDB\\Server\\8.0\\bin\\mongod.exe")
    ? "C:\\Program Files\\MongoDB\\Server\\8.0\\bin\\mongod.exe"
    : "mongod");

mkdirSync(DBPATH, { recursive: true });
const mongod = spawn(BIN, ["--replSet", "rs0", "--port", String(PORT), "--bind_ip", "127.0.0.1", "--dbpath", DBPATH, "--quiet"], {
  stdio: ["ignore", "ignore", "inherit"],
});
mongod.on("exit", (code) => {
  console.error(`mongod exited with code ${code}`);
  process.exit(code ?? 1);
});

async function initiate() {
  const client = new MongoClient(`mongodb://127.0.0.1:${PORT}/?directConnection=true`);
  for (let i = 0; i < 30; i++) {
    try {
      await client.connect();
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  const admin = client.db("admin");
  try {
    await admin.command({ replSetGetStatus: 1 });
  } catch {
    await admin.command({ replSetInitiate: { _id: "rs0", members: [{ _id: 0, host: `127.0.0.1:${PORT}` }] } });
  }
  await client.close();
  console.error(`MongoDB replica set ready: mongodb://127.0.0.1:${PORT}/global_aviation?replicaSet=rs0  (Ctrl+C to stop)`);
}

initiate().catch((err) => {
  console.error(err);
  mongod.kill();
});

for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => mongod.kill(sig));
