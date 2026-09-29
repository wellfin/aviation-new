import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import path from "node:path";
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { env } from "../src/config/env.js";
import { Upload } from "../src/modules/uploads/upload.model.js";
import { filesRouter, myUploadsRouter, uploadsRouter } from "../src/modules/uploads/uploads.routes.js";
import { MAX_UPLOADS_PER_USER, sanitizeFileName } from "../src/modules/uploads/uploads.service.js";
import { appWith, ORIGIN, signedInAgent } from "./helpers.js";

const app = appWith(["/uploads", uploadsRouter], ["/files", filesRouter], ["/me/uploads", myUploadsRouter]);
const UPLOAD_ROOT = path.resolve(env.UPLOAD_DIR);

afterAll(async () => {
  await rm(UPLOAD_ROOT, { recursive: true, force: true });
});

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]), Buffer.from("JFIF\0"), Buffer.alloc(64)]);
const WEBP = Buffer.concat([Buffer.from("RIFF"), Buffer.from([0x24, 0, 0, 0]), Buffer.from("WEBPVP8 "), Buffer.alloc(40)]);
const PDF = Buffer.from("%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << >>\n%%EOF\n");
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
const HTML = Buffer.from("<!doctype html><html><body><script>alert(1)</script></body></html>");

type Agent = Awaited<ReturnType<typeof signedInAgent>>["agent"];

function upload(agent: Agent, kind: string, data: Buffer, filename: string, contentType = "application/octet-stream") {
  return agent.post("/api/v1/uploads").set("Origin", ORIGIN).field("kind", kind).attach("file", data, { filename, contentType });
}

describe("uploads", () => {
  it("requires authentication and the uploads permission", async () => {
    expect((await request(app).post("/api/v1/uploads").field("kind", "image")).status).toBe(401);
    const { agent } = await signedInAgent("USER", app);
    expect((await upload(agent, "image", PNG, "a.png")).status).toBe(403);
    expect((await agent.get("/api/v1/me/uploads")).status).toBe(403);
  });

  it("stores a PNG, returns its public URL and serves it with safe headers", async () => {
    const { agent, user } = await signedInAgent("PROVIDER", app);
    const r = await upload(agent, "image", PNG, "../../etc/My Logo<script>.png", "text/html");
    expect(r.status).toBe(201);
    expect(r.body.data).toMatchObject({ kind: "image", mime: "image/png", size: PNG.length });
    expect(r.body.data.url).toMatch(/^http:\/\/localhost:4000\/api\/v1\/files\/\d{4}\/\d{2}\/[a-f0-9]{32}\.png$/);

    const doc = await Upload.findById(r.body.data.id);
    expect(String(doc?.owner)).toBe(user.id);
    expect(doc?.originalName).toBe("My Logo_script_.png");
    expect(existsSync(path.join(UPLOAD_ROOT, doc!.key))).toBe(true);

    const file = await request(app).get(`/api/v1/files/${doc!.key}`);
    expect(file.status).toBe(200);
    expect(file.headers["content-type"]).toBe("image/png");
    expect(file.headers["x-content-type-options"]).toBe("nosniff");
    expect(file.headers["content-disposition"]).toBe("inline");
    expect(file.headers["cache-control"]).toContain("max-age=31536000");
    expect(Buffer.compare(file.body as Buffer, PNG)).toBe(0);
  });

  it("accepts JPEG, WebP and PDF by magic bytes; PDFs download as attachments", async () => {
    const { agent } = await signedInAgent("PROVIDER", app);
    expect((await upload(agent, "image", JPEG, "photo.bin")).body.data.mime).toBe("image/jpeg");
    expect((await upload(agent, "image", WEBP, "photo")).body.data.mime).toBe("image/webp");
    const pdf = await upload(agent, "document", PDF, 'brochure "2026".pdf');
    expect(pdf.status).toBe(201);
    expect(pdf.body.data.mime).toBe("application/pdf");
    const key = String(pdf.body.data.url).split("/files/")[1];
    const file = await request(app).get(`/api/v1/files/${key}`);
    expect(file.headers["content-type"]).toBe("application/pdf");
    expect(file.headers["content-disposition"]).toBe('attachment; filename="brochure _2026_.pdf"');
  });

  it("rejects SVG, HTML, spoofed extensions and kind mismatches", async () => {
    const { agent } = await signedInAgent("PROVIDER", app);
    for (const [kind, data, name, type] of [
      ["image", SVG, "logo.svg", "image/svg+xml"],
      ["image", HTML, "logo.png", "image/png"],
      ["document", HTML, "doc.pdf", "application/pdf"],
      ["document", PNG, "doc.pdf", "application/pdf"],
      ["image", PDF, "img.png", "image/png"],
    ] as const) {
      const r = await upload(agent, kind, data, name, type);
      expect(r.status).toBe(422);
      expect(r.body.error.fieldErrors.file).toMatch(/Unsupported file type/);
    }
    expect(await Upload.countDocuments()).toBe(0);
  });

  it("validates kind, a missing file, empty files, extra files and size limits", async () => {
    const { agent } = await signedInAgent("PROVIDER", app);
    const badKind = await upload(agent, "video", PNG, "a.png");
    expect(badKind.status).toBe(422);
    expect(badKind.body.error.fieldErrors.kind).toBeDefined();

    const noFile = await agent.post("/api/v1/uploads").field("kind", "image");
    expect(noFile.status).toBe(422);
    expect(noFile.body.error.fieldErrors.file).toBeDefined();

    expect((await upload(agent, "image", Buffer.alloc(0), "empty.png")).status).toBe(422);

    const wrongField = await agent.post("/api/v1/uploads").field("kind", "image").attach("other", PNG, "a.png");
    expect(wrongField.status).toBe(400);

    // Image limit (5 MB default) is stricter than the document limit (15 MB).
    const big = Buffer.concat([PNG, Buffer.alloc(env.UPLOAD_MAX_IMAGE_MB * 1024 * 1024)]);
    expect((await upload(agent, "image", big, "big.png")).status).toBe(413);
    const huge = Buffer.concat([PDF, Buffer.alloc(env.UPLOAD_MAX_DOCUMENT_MB * 1024 * 1024)]);
    expect((await upload(agent, "document", huge, "huge.pdf")).status).toBe(413);
  });

  it("enforces the per-user quota", async () => {
    const { agent, user } = await signedInAgent("PROVIDER", app);
    await Upload.insertMany(
      Array.from({ length: MAX_UPLOADS_PER_USER }, (_, i) => ({
        owner: user._id,
        key: `2026/01/${i.toString(16).padStart(32, "0")}.png`,
        url: "http://x",
        kind: "image",
        mime: "image/png",
        size: 1,
      })),
    );
    const r = await upload(agent, "image", PNG, "a.png");
    expect(r.status).toBe(403);
    expect(r.body.error.code).toBe("UPLOAD_QUOTA_EXCEEDED");
  });

  it("lists only the caller's uploads with pagination and kind filter", async () => {
    const { agent: a } = await signedInAgent("PROVIDER", app);
    const { agent: b } = await signedInAgent("PROVIDER", app);
    expect((await a.get("/api/v1/me/uploads")).body.data).toMatchObject({ items: [], total: 0 });
    await upload(a, "image", PNG, "1.png");
    await upload(a, "image", PNG, "2.png");
    await upload(a, "document", PDF, "3.pdf");
    await upload(b, "image", PNG, "b.png");

    const all = await a.get("/api/v1/me/uploads?pageSize=2");
    expect(all.body.data).toMatchObject({ total: 3, pageSize: 2, totalPages: 2 });
    expect(all.body.data.items[0].originalName).toBe("3.pdf");
    const docs = await a.get("/api/v1/me/uploads?kind=document");
    expect(docs.body.data.total).toBe(1);
    expect((await a.get("/api/v1/me/uploads?kind=exe")).status).toBe(422);
  });

  it("lets owners and staff delete (removing the file) but not other providers", async () => {
    const { agent: owner } = await signedInAgent("PROVIDER", app);
    const { agent: other } = await signedInAgent("PROVIDER", app);
    const { agent: manager } = await signedInAgent("MANAGER", app);

    const first = (await upload(owner, "image", PNG, "a.png")).body.data;
    const second = (await upload(owner, "image", PNG, "b.png")).body.data;
    const firstKey = String(first.url).split("/files/")[1]!;

    expect((await other.delete(`/api/v1/uploads/${first.id}`)).status).toBe(404);
    expect((await owner.delete("/api/v1/uploads/not-an-id")).status).toBe(422);
    expect((await owner.delete(`/api/v1/uploads/${first.id}`)).status).toBe(204);
    expect(existsSync(path.join(UPLOAD_ROOT, firstKey))).toBe(false);
    expect((await request(app).get(`/api/v1/files/${firstKey}`)).status).toBe(404);
    expect((await owner.delete(`/api/v1/uploads/${first.id}`)).status).toBe(404);

    expect((await manager.delete(`/api/v1/uploads/${second.id}`)).status).toBe(401);
    expect((await manager.delete(`/api/v1/admin/uploads/${second.id}`)).status).toBe(204);
  });

  it("never serves anything outside the upload directory", async () => {
    for (const p of [
      "../package.json",
      "..%2F..%2Fpackage.json",
      "2026/01/..%2F..%2F..%2Fpackage.json",
      "2026/01/%2e%2e/%2e%2e/package.json",
      "2026/13/0123456789abcdef0123456789abcdef.png",
      "2026/01/0123456789abcdef0123456789abcdef.svg",
      "2026/01/0123456789abcdef0123456789abcdef.png",
    ]) {
      const r = await request(app).get(`/api/v1/files/${p}`);
      expect(r.status, p).toBe(404);
    }
  });

  it("sanitises display names", () => {
    expect(sanitizeFileName("C:\\Users\\x\\évil\u0000name.pdf")).toBe("_vil_name.pdf");
    expect(sanitizeFileName("..hidden.png")).toBe("hidden.png");
  });
});
