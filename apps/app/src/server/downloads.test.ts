import { afterEach, describe, expect, it } from "vitest";

import { resolveConfig } from "./config";
import {
  createDownloadLink,
  createDownloadToken,
  DOWNLOAD_TTL_SECONDS,
  handleDownload,
  readDownloadToken,
} from "./downloads";
import { resetRuntime, setRuntime } from "./runtime";

const claims = { userId: "u1", applicationId: "a1", format: "pdf" as const };

describe("download tokens", () => {
  afterEach(() => resetRuntime());

  it("round-trips its claims until it expires", () => {
    const now = Date.parse("2026-11-26T12:00:00Z");
    const link = createDownloadLink("http://127.0.0.1:4413", claims, now);
    expect(link.expiresAt).toBe(new Date(now + DOWNLOAD_TTL_SECONDS * 1000).toISOString());
    const token = link.url.split("/download/")[1] ?? "";
    expect(readDownloadToken(token, now)).toMatchObject(claims);
    expect(readDownloadToken(token, now + DOWNLOAD_TTL_SECONDS * 1000)).toBeNull();
  });

  it("refuses tokens it didn't sign or can't read", () => {
    const token = createDownloadToken({ ...claims, expiresAt: Date.now() / 1000 + 60 });
    const [body, signature] = token.split(".");
    expect(readDownloadToken(`${body}.${signature}x`)).toBeNull();
    expect(readDownloadToken(`${body}x.${signature}`)).toBeNull();
    expect(readDownloadToken(`${token}.extra`)).toBeNull();
    expect(readDownloadToken("")).toBeNull();
  });

  it("signs with the server secret in server mode, so other secrets can't forge links", () => {
    const configure = (secret: string) =>
      setRuntime(
        resolveConfig({
          TAILORY_MODE: "server",
          TAILORY_AUTH_SECRET: secret,
          TAILORY_PUBLIC_URL: "https://tailory.example.com",
          TAILORY_AUTH_EMAIL_PASSWORD: "true",
        }),
        {} as never
      );
    configure("a".repeat(32));
    const token = createDownloadToken({ ...claims, expiresAt: Date.now() / 1000 + 60 });
    expect(readDownloadToken(token)).toMatchObject(claims);
    configure("b".repeat(32));
    expect(readDownloadToken(token)).toBeNull();
  });

  it("answers bad methods and bad links without touching the database", async () => {
    expect(
      (await handleDownload(new Request("http://x/download/t", { method: "POST" }))).status
    ).toBe(405);
    expect((await handleDownload(new Request("http://x/download/nope"))).status).toBe(404);
  });
});
