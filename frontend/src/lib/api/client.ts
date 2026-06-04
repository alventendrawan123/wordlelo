import { GameApiError } from "./errors";

export const USE_REAL_BE = process.env.NEXT_PUBLIC_USE_REAL_BE === "true";
const BASE_URL = process.env.NEXT_PUBLIC_BE_URL ?? "";

export async function fetchJson(
  path: string,
  init?: RequestInit,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new GameApiError("NETWORK", "Network request failed");
  }

  if (!response.ok) {
    throw new GameApiError(
      "BAD_RESPONSE",
      `Request failed (${response.status})`,
    );
  }

  try {
    const data: unknown = await response.json();
    return data;
  } catch {
    throw new GameApiError("BAD_RESPONSE", "Invalid JSON response");
  }
}
