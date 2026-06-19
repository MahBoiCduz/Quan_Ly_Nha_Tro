const ZALO_MESSAGE_URL = "https://openapi.zalo.me/v3.0/oa/message/cs";

export async function sendZaloMessage(
  userId: string,
  text: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.ZALO_OA_ACCESS_TOKEN;
  if (!token) return { ok: false, error: "Thiếu ZALO_OA_ACCESS_TOKEN" };

  const res = await fetchImpl(ZALO_MESSAGE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", access_token: token },
    body: JSON.stringify({ recipient: { user_id: userId }, message: { text } }),
  });

  const data = (await res.json()) as { error?: number; message?: string };
  if (!res.ok || (data.error !== undefined && data.error !== 0)) {
    return { ok: false, error: data.message ?? `HTTP ${res.status}` };
  }
  return { ok: true };
}
