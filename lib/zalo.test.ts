import { describe, it, expect, vi } from "vitest";
import { sendZaloMessage } from "@/lib/zalo";

describe("sendZaloMessage", () => {
  it("posts the message and returns ok on success", async () => {
    const mock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ error: 0 }),
    });
    process.env.ZALO_OA_ACCESS_TOKEN = "token123";

    const res = await sendZaloMessage("user1", "Xin chào", mock as unknown as typeof fetch);
    expect(res.ok).toBe(true);
    expect(mock).toHaveBeenCalledOnce();
    const init = mock.mock.calls[0][1] as RequestInit & { headers: Record<string, string> };
    expect(init.headers["access_token"]).toBe("token123");
    expect(JSON.parse(init.body as string).recipient.user_id).toBe("user1");
  });

  it("returns an error when the API reports a non-zero error code", async () => {
    const mock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ error: -32, message: "invalid user" }),
    });
    process.env.ZALO_OA_ACCESS_TOKEN = "token123";

    const res = await sendZaloMessage("bad", "x", mock as unknown as typeof fetch);
    expect(res.ok).toBe(false);
    expect(res.error).toContain("invalid user");
  });
});
