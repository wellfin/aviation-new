import { Types } from "mongoose";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { seedAirports } from "../src/modules/airports/airports.seed.js";
import { favoritesRouter } from "../src/modules/favorites/favorites.routes.js";
import { MAX_FAVORITES } from "../src/modules/favorites/favorites.service.js";
import { Provider } from "../src/modules/providers/provider.model.js";
import { seedProviders } from "../src/modules/providers/providers.seed.js";
import { User } from "../src/modules/users/user.model.js";
import { appWith, signedInAgent } from "./helpers.js";

const app = appWith(["/me/favorites", favoritesRouter]);
const fav = (p = "") => `/api/v1/me/favorites${p}`;

async function idOf(slug: string): Promise<string> {
  return (await Provider.findOne({ slug }))!.id as string;
}

describe("favourites", () => {
  beforeEach(async () => {
    await seedAirports();
    await seedProviders();
  });

  it("requires authentication", async () => {
    expect((await request(app).get(fav())).status).toBe(401);
    expect((await request(app).put(fav(`/${await idOf("dnata")}`))).status).toBe(401);
  });

  it("is available to every website role (staff have no website session)", async () => {
    for (const role of ["USER", "PROVIDER"] as const) {
      const { agent } = await signedInAgent(role, app);
      expect((await agent.get(fav())).status).toBe(200);
    }
  });

  it("starts empty, adds idempotently and lists most recent first as provider DTOs", async () => {
    const { agent, user } = await signedInAgent("USER", app);
    expect((await agent.get(fav())).body.data).toEqual([]);
    const [a, b] = [await idOf("dnata"), await idOf("jetex")];
    expect((await agent.put(fav(`/${a}`))).status).toBe(204);
    expect((await agent.put(fav(`/${b}`))).status).toBe(204);
    expect((await agent.put(fav(`/${a}`))).status).toBe(204);
    expect((await User.findById(user._id))!.favorites).toHaveLength(2);

    const list = await agent.get(fav());
    expect(list.body.data.map((p: { slug: string }) => p.slug)).toEqual(["jetex", "dnata"]);
    expect(list.body.data[0].airports[0]).toHaveProperty("icao");
  });

  it("removes favourites (idempotently)", async () => {
    const { agent } = await signedInAgent("USER", app);
    const id = await idOf("dnata");
    await agent.put(fav(`/${id}`));
    expect((await agent.delete(fav(`/${id}`))).status).toBe(204);
    expect((await agent.delete(fav(`/${id}`))).status).toBe(204);
    expect((await agent.get(fav())).body.data).toEqual([]);
  });

  it("404s unknown or unpublished providers and hides listings unpublished later", async () => {
    const { agent } = await signedInAgent("USER", app);
    expect((await agent.put(fav(`/${new Types.ObjectId().toString()}`))).status).toBe(404);
    const id = await idOf("dnata");
    await agent.put(fav(`/${id}`));
    await Provider.updateOne({ _id: id }, { status: "suspended" });
    expect((await agent.get(fav())).body.data).toEqual([]);
    expect((await agent.put(fav(`/${id}`))).status).toBe(404);
    expect((await agent.put(fav("/not-an-id"))).status).toBe(422);
  });

  it("keeps each user's favourites separate", async () => {
    const a = await signedInAgent("USER", app);
    const b = await signedInAgent("USER", app);
    await a.agent.put(fav(`/${await idOf("dnata")}`));
    expect((await b.agent.get(fav())).body.data).toEqual([]);
  });

  it(`caps the list at ${MAX_FAVORITES}`, async () => {
    const { agent, user } = await signedInAgent("USER", app);
    const filler = Array.from({ length: MAX_FAVORITES }, () => new Types.ObjectId());
    await User.updateOne({ _id: user._id }, { $set: { favorites: filler } });
    const r = await agent.put(fav(`/${await idOf("dnata")}`));
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("FAVORITES_LIMIT");
    // Re-adding an existing favourite at the cap is still a no-op success.
    await User.updateOne({ _id: user._id }, { $set: { favorites: [...filler.slice(1), new Types.ObjectId(await idOf("dnata"))] } });
    expect((await agent.put(fav(`/${await idOf("dnata")}`))).status).toBe(204);
  });
});
