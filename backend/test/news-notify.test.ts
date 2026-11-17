import request from "supertest";
import { describe, expect, it } from "vitest";
import { env } from "../src/config/env.js";
import { News } from "../src/modules/news/news.model.js";
import { adminNewsRouter } from "../src/modules/news/news.routes.js";
import { newsNotificationsSettled, sendDueNewsNotifications } from "../src/modules/newsletter/news-notify.js";
import { newsletterRouter } from "../src/modules/newsletter/newsletter.routes.js";
import { Subscriber } from "../src/modules/newsletter/subscriber.model.js";
import { testOutbox } from "../src/modules/notifications/mailer.js";
import { appWith, signedInAgent } from "./helpers.js";

const app = appWith(["/admin/news", adminNewsRouter], ["/newsletter", newsletterRouter]);
const admin = (p = "") => `/api/v1/admin/news${p}`;
const article = (over: object = {}) => ({
  title: "New Fuel Rules",
  excerpt: "What changes for operators this winter.",
  category: "Fuel",
  image: "/images/news/fuel-trends.png",
  body: ["Some text."],
  author: "Mark Ellison",
  ...over,
});
const mailTo = (to: string) => testOutbox.filter((m) => m.to === to && m.subject.startsWith("New on Global Aviation"));

describe("new article emails to newsletter subscribers", () => {
  it("emails confirmed subscribers once when an article is published, with a working unsubscribe link", async () => {
    await Subscriber.create([
      { email: "reader@jetco.aero", status: "subscribed", confirmedAt: new Date() },
      { email: "left@jetco.aero", status: "unsubscribed", unsubscribedAt: new Date() },
      { email: "waiting@jetco.aero", status: "pending" },
    ]);
    const { agent } = await signedInAgent("ADMIN", app);

    const draft = await agent.post(admin()).send(article());
    await newsNotificationsSettled();
    expect(mailTo("reader@jetco.aero")).toHaveLength(0);

    await agent.post(admin(`/${draft.body.data.id}/publish`));
    await newsNotificationsSettled();
    const [mail] = mailTo("reader@jetco.aero");
    expect(mail).toBeDefined();
    expect(mail!.subject).toBe("New on Global Aviation: New Fuel Rules");
    expect(mail!.text).toContain(`${env.FRONTEND_URL}/news/${draft.body.data.slug}`);
    expect(mailTo("left@jetco.aero")).toHaveLength(0);
    expect(mailTo("waiting@jetco.aero")).toHaveLength(0);

    // Unpublishing and publishing again doesn't send a second email.
    await agent.post(admin(`/${draft.body.data.id}/unpublish`));
    await agent.post(admin(`/${draft.body.data.id}/publish`));
    await newsNotificationsSettled();
    expect(mailTo("reader@jetco.aero")).toHaveLength(1);

    // The signed unsubscribe link works; a tampered one doesn't.
    const url = new URL(mail!.unsubscribeUrl!);
    const bad = await request(app).get(url.pathname + url.search.replace(/.$/, (c) => (c === "0" ? "1" : "0")));
    expect(bad.headers.location).toBe(`${env.FRONTEND_URL}/?newsletter=invalid`);
    const ok = await request(app).get(url.pathname + url.search);
    expect(ok.headers.location).toBe(`${env.FRONTEND_URL}/?newsletter=unsubscribed`);
    expect((await Subscriber.findOne({ email: "reader@jetco.aero" }).lean())?.status).toBe("unsubscribed");
  });

  it("waits for a scheduled article's publish time, and never emails about old articles", async () => {
    await Subscriber.create({ email: "reader2@jetco.aero", status: "subscribed", confirmedAt: new Date() });
    // An article that existed before this feature (no notify flag) is never sent.
    await News.create({ ...article({ slug: "old-one", title: "Old" }), status: "published", publishedAt: new Date("2025-01-01") });
    const { agent } = await signedInAgent("ADMIN", app);

    const later = new Date(Date.now() + 60 * 60_000).toISOString();
    const r = await agent.post(admin()).send({ ...article({ title: "Scheduled Story" }), status: "published", publishedAt: later });
    expect(r.status).toBe(201);
    await newsNotificationsSettled();
    expect(mailTo("reader2@jetco.aero")).toHaveLength(0);

    await News.updateOne({ _id: r.body.data.id }, { $set: { publishedAt: new Date(Date.now() - 1000) } });
    await sendDueNewsNotifications();
    expect(mailTo("reader2@jetco.aero").map((m) => m.subject)).toEqual(["New on Global Aviation: Scheduled Story"]);
  });
});
