import { homedir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { ConfigError, DEFAULT_PORT, parseCommand, resolveConfig } from "./config";

const secret = "s".repeat(32);
/** The least server mode starts with. */
const server = {
  TAILORY_MODE: "server",
  TAILORY_AUTH_SECRET: secret,
  TAILORY_PUBLIC_URL: "https://tailory.example.com",
  TAILORY_AUTH_EMAIL_PASSWORD: "true",
};

describe("resolveConfig", () => {
  it("defaults to local mode on loopback with the data dir in the home folder", () => {
    expect(resolveConfig({})).toEqual({
      mode: "local",
      host: "127.0.0.1",
      port: DEFAULT_PORT,
      dataDir: path.join(homedir(), ".tailory"),
      databaseUrl: undefined,
      trustProxy: false,
      auth: undefined,
    });
  });

  it("reads every setting from the environment", () => {
    expect(
      resolveConfig({
        ...server,
        TAILORY_HOST: "::",
        PORT: "8080",
        TAILORY_DATA_DIR: "/srv/tailory",
        DATABASE_URL: "postgres://u:p@db:5432/tailory",
        TAILORY_TRUST_PROXY: "true",
        TAILORY_GITHUB_CLIENT_ID: "gh-id",
        TAILORY_GITHUB_CLIENT_SECRET: "gh-secret",
        TAILORY_GOOGLE_CLIENT_ID: "g-id",
        TAILORY_GOOGLE_CLIENT_SECRET: "g-secret",
      })
    ).toEqual({
      mode: "server",
      host: "::",
      port: 8080,
      dataDir: "/srv/tailory",
      databaseUrl: "postgres://u:p@db:5432/tailory",
      trustProxy: true,
      auth: {
        secret,
        publicUrl: "https://tailory.example.com",
        github: { clientId: "gh-id", clientSecret: "gh-secret" },
        google: { clientId: "g-id", clientSecret: "g-secret" },
        emailPassword: true,
      },
    });
  });

  it("binds server mode to every interface by default", () => {
    expect(resolveConfig(server).host).toBe("0.0.0.0");
  });

  it("lets flags override the environment and resolves relative data dirs", () => {
    const config = resolveConfig(
      { PORT: "1", TAILORY_DATA_DIR: "/a" },
      { port: "4500", dataDir: "rel" }
    );
    expect(config.port).toBe(4500);
    expect(config.dataDir).toBe(path.resolve("rel"));
  });

  it("treats blank values as unset", () => {
    const config = resolveConfig({ TAILORY_MODE: "", PORT: " ", DATABASE_URL: "" });
    expect(config).toMatchObject({ mode: "local", port: DEFAULT_PORT, databaseUrl: undefined });
  });

  it.each(["127.0.0.1", "127.8.9.10", "::1", "localhost"])("accepts %s in local mode", (host) => {
    expect(resolveConfig({ TAILORY_HOST: host }).host).toBe(host);
  });

  it.each(["0.0.0.0", "::", "192.168.1.5", "example.com"])(
    "refuses to bind local mode to %s",
    (host) => {
      expect(() => resolveConfig({ TAILORY_HOST: host })).toThrow(/only listens on loopback/);
    }
  );

  it("names each invalid setting", () => {
    let error: unknown;
    try {
      resolveConfig({
        TAILORY_MODE: "cloud",
        PORT: "70000",
        DATABASE_URL: "mysql://x",
        TAILORY_TRUST_PROXY: "yes",
      });
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(ConfigError);
    const message = (error as Error).message;
    expect(message).toContain("TAILORY_MODE: must be local or server");
    expect(message).toContain("--port / PORT: must be between 0 and 65535");
    expect(message).toContain("DATABASE_URL: must start with postgres://");
    expect(message).toContain("TAILORY_TRUST_PROXY: must be true or false");
  });

  it.each(["abc", "1.5", "-1"])("rejects port %s", (port) => {
    expect(() => resolveConfig({ PORT: port })).toThrow(ConfigError);
  });
});

describe("server mode sign-in settings", () => {
  const base = { TAILORY_MODE: "server", TAILORY_AUTH_SECRET: secret };
  const problems = (env: Record<string, string>) => {
    try {
      resolveConfig(env);
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      return (error as Error).message;
    }
    return "";
  };

  it("enables only the providers whose id and secret are both set", () => {
    const { auth } = resolveConfig({
      ...base,
      TAILORY_PUBLIC_URL: "https://tailory.example.com/",
      TAILORY_GOOGLE_CLIENT_ID: "g-id",
      TAILORY_GOOGLE_CLIENT_SECRET: "g-secret",
    });
    expect(auth).toEqual({
      secret,
      publicUrl: "https://tailory.example.com",
      github: undefined,
      google: { clientId: "g-id", clientSecret: "g-secret" },
      emailPassword: false,
    });
  });

  it("refuses to start with no sign-in method", () => {
    expect(problems({ ...base, TAILORY_PUBLIC_URL: "https://t.example" })).toContain(
      "Sign-in: server mode needs a sign-in method"
    );
    expect(
      problems({
        ...base,
        TAILORY_PUBLIC_URL: "https://t.example",
        TAILORY_AUTH_EMAIL_PASSWORD: "false",
      })
    ).toContain("needs a sign-in method");
  });

  it("needs a long enough secret and a public URL", () => {
    const message = problems({ TAILORY_MODE: "server", TAILORY_AUTH_EMAIL_PASSWORD: "true" });
    expect(message).toContain("TAILORY_AUTH_SECRET: server mode needs a secret");
    expect(message).toContain("TAILORY_PUBLIC_URL: server mode needs the URL");
    expect(problems({ ...server, TAILORY_AUTH_SECRET: "short" })).toContain(
      "TAILORY_AUTH_SECRET: must be at least 32 characters"
    );
  });

  it("names a provider with only half its keys", () => {
    expect(problems({ ...server, TAILORY_GITHUB_CLIENT_ID: "gh-id" })).toContain(
      "TAILORY_GITHUB_CLIENT_ID / TAILORY_GITHUB_CLIENT_SECRET: set both"
    );
    expect(problems({ ...server, TAILORY_GOOGLE_CLIENT_SECRET: "g" })).toContain(
      "TAILORY_GOOGLE_CLIENT_ID / TAILORY_GOOGLE_CLIENT_SECRET: set both"
    );
  });

  it.each([
    ["not a url", "must be a URL"],
    ["http://tailory.example.com", "must use https"],
    ["ftp://tailory.example.com", "must use https"],
    ["https://tailory.example.com/app", "with no path"],
    ["https://tailory.example.com/?x=1", "with no path"],
  ])("refuses the public URL %s", (url, message) => {
    expect(problems({ ...server, TAILORY_PUBLIC_URL: url })).toContain(message);
  });

  it.each(["http://localhost:4413", "http://127.0.0.1:4413", "https://tailory.example.com"])(
    "accepts the public URL %s",
    (url) => {
      expect(resolveConfig({ ...server, TAILORY_PUBLIC_URL: url }).auth?.publicUrl).toBe(url);
    }
  );

  it("ignores sign-in settings in local mode", () => {
    expect(resolveConfig({ TAILORY_AUTH_EMAIL_PASSWORD: "true" }).auth).toBeUndefined();
  });
});

describe("parseCommand", () => {
  it("runs with the parsed config by default", () => {
    expect(parseCommand(["--port", "4500", "--data-dir", "/d"], {})).toMatchObject({
      kind: "run",
      config: { mode: "local", port: 4500, dataDir: "/d" },
    });
  });

  it("accepts short flags", () => {
    expect(parseCommand(["-p", "4501", "-d", "/e"], {})).toMatchObject({
      config: { port: 4501, dataDir: "/e" },
    });
  });

  it("answers --help and --version before validating settings", () => {
    expect(parseCommand(["--help"], { PORT: "nope" })).toEqual({ kind: "help" });
    expect(parseCommand(["-v"], { PORT: "nope" })).toEqual({ kind: "version" });
  });

  it("rejects unknown flags and positional arguments", () => {
    expect(() => parseCommand(["--open"], {})).toThrow(ConfigError);
    expect(() => parseCommand(["serve"], {})).toThrow(ConfigError);
  });
});
