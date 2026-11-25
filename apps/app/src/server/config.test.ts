import { homedir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { ConfigError, DEFAULT_PORT, parseCommand, resolveConfig } from "./config";

describe("resolveConfig", () => {
  it("defaults to local mode on loopback with the data dir in the home folder", () => {
    expect(resolveConfig({})).toEqual({
      mode: "local",
      host: "127.0.0.1",
      port: DEFAULT_PORT,
      dataDir: path.join(homedir(), ".tailory"),
      databaseUrl: undefined,
      trustProxy: false,
    });
  });

  it("reads every setting from the environment", () => {
    expect(
      resolveConfig({
        TAILORY_MODE: "server",
        TAILORY_HOST: "::",
        PORT: "8080",
        TAILORY_DATA_DIR: "/srv/tailory",
        DATABASE_URL: "postgres://u:p@db:5432/tailory",
        TAILORY_TRUST_PROXY: "true",
      })
    ).toEqual({
      mode: "server",
      host: "::",
      port: 8080,
      dataDir: "/srv/tailory",
      databaseUrl: "postgres://u:p@db:5432/tailory",
      trustProxy: true,
    });
  });

  it("binds server mode to every interface by default", () => {
    expect(resolveConfig({ TAILORY_MODE: "server" }).host).toBe("0.0.0.0");
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
