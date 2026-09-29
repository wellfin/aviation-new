import type { Request } from "express";
import { afterEach, describe, expect, it } from "vitest";
import { env } from "../config/env.js";
import { INTERNAL_KEY_HEADER, isInternalRequest } from "./security.js";

const req = (headers: Record<string, string>) => ({ headers }) as unknown as Request;
const KEY = "internal-key-for-tests-0123456789abcdef";

describe("isInternalRequest", () => {
  const saved = env.INTERNAL_API_KEY;
  afterEach(() => {
    env.INTERNAL_API_KEY = saved;
  });

  it("is false when no key is configured, even if a header is sent", () => {
    env.INTERNAL_API_KEY = undefined;
    expect(isInternalRequest(req({ [INTERNAL_KEY_HEADER]: KEY }))).toBe(false);
  });

  it("requires the exact configured key", () => {
    env.INTERNAL_API_KEY = KEY;
    expect(isInternalRequest(req({ [INTERNAL_KEY_HEADER]: KEY }))).toBe(true);
    expect(isInternalRequest(req({ [INTERNAL_KEY_HEADER]: `${KEY}x` }))).toBe(false);
    expect(isInternalRequest(req({}))).toBe(false);
  });
});
