import { execSync } from "node:child_process";
import path from "node:path";
import { adminCredentials, Api } from "./helpers";

interface Page<T> {
  items: T[];
}

const isTestEmail = (email: string) => /^e2e\+.*@example\.com$/i.test(email);

/**
 * Removes what the suite created in the (shared) database: test users, their
 * reviews, and marks test leads/enquiries as spam (those have no delete endpoint).
 * Deleting reviews recalculates provider ratings from real reviews, so the demo
 * seed is re-applied afterwards to restore the demo ratings.
 */
export default async function globalTeardown(): Promise<void> {
  const api = await Api.create();
  try {
    const { email, password } = adminCredentials();
    const login = await api.call("POST", "/admin/auth/login", { email, password });
    if (login.status !== 200) {
      console.error(`[e2e teardown] admin login failed (${login.status}); skipping cleanup`);
      return;
    }

    const reviews = await api.call<Page<{ id: string; title: string }>>("GET", "/admin/reviews?q=E2E&pageSize=100");
    const testReviews = (reviews.body.data?.items ?? []).filter((r) => r.title.startsWith("E2E"));
    for (const r of testReviews) await api.call("DELETE", `/admin/reviews/${r.id}`);

    for (const kind of ["leads", "enquiries"] as const) {
      const list = await api.call<Page<{ id: string; email: string; status: string }>>("GET", `/admin/${kind}?q=e2e&pageSize=100`);
      for (const item of list.body.data?.items ?? []) {
        if (isTestEmail(item.email) && item.status !== "spam") await api.call("PATCH", `/admin/${kind}/${item.id}`, { status: "spam" });
      }
    }

    const users = await api.call<Page<{ id: string; email: string }>>("GET", "/admin/users?q=e2e&pageSize=100");
    for (const u of (users.body.data?.items ?? []).filter((x) => isTestEmail(x.email))) await api.call("DELETE", `/admin/users/${u.id}`);

    if (testReviews.length > 0) {
      execSync("npm run seed", { cwd: path.resolve(__dirname, "../../backend"), stdio: "ignore" });
    }
  } finally {
    await api.dispose();
  }
}
