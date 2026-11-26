import type { Client } from "@modelcontextprotocol/client";
import { desc } from "drizzle-orm";
import { expect } from "vitest";

import { schema } from "../db";
import { callTool } from "./mcp-client";
import type { TestServer } from "./server";

// The user flow from #186, driven over MCP the way an agent would: set up the profile, start an
// application, tailor it to one page (overflow first, then fitted), move it along, list it, and
// download the PDF. Shared by the server-mode and local-mode tests.

export const RESUME_TOOLS = [
  "get_profile",
  "update_profile",
  "list_applications",
  "create_application",
  "get_application",
  "tailor_application",
  "update_application",
  "export_resume",
];

const LINE =
  "Led a cross-team migration of the billing pipeline to an event-driven design, cutting failed charges and on-call pages while keeping every invoice reconciled";

/** A career long enough to run past one page. */
const longResume = () => ({
  basics: { name: "Ada Example", label: "Backend engineer", email: "ada@example.com" },
  work: Array.from({ length: 7 }, (_, index) => ({
    name: `Company ${index + 1}`,
    position: "Senior Engineer",
    startDate: `${2010 + index}-01`,
    endDate: `${2011 + index}-01`,
    highlights: Array.from({ length: 5 }, (_, bullet) => `${LINE} (${index + 1}.${bullet + 1}).`),
  })),
  skills: [{ name: "Languages", keywords: ["TypeScript", "Go", "SQL"] }],
});

type Options = { actorClient: string };

/** Runs the flow and returns the application it made and a download link for it. */
export const driveResumeFlow = async (client: Client, server: TestServer, options: Options) => {
  const call = async (name: string, args: Record<string, unknown> = {}) => {
    const answer = await callTool(client, name, args);
    expect(answer.isError, `${name}: ${answer.text}`).toBe(false);
    return answer;
  };

  // 1. Set up the profile from an old resume, then add a line to it by id.
  const imported = await call("update_profile", { replace: longResume() });
  expect(imported.data).toMatchObject({ entries: 8, bullets: 35, url: `${server.url}/profile` });
  const { profile } = (await call("get_profile")).data;
  const [first, second, ...older] = profile.work;
  const added = await call("update_profile", {
    add: [{ entryId: first.id, bullet: "Mentored four engineers." }],
    change: [{ id: first.id, fields: { position: "Staff Engineer" } }],
  });
  expect(added.data.added).toHaveLength(1);
  const refused = await callTool(client, "update_profile", { remove: ["no-such-id"] });
  expect(refused.isError).toBe(true);
  expect(refused.text).toContain("get_profile");

  // 2. Start an application for a job.
  const created = await call("create_application", {
    company: "Stripe",
    role: "Backend Engineer",
    postingUrl: "https://example.com/jobs/1",
    jobDescription: "Build payment systems.",
  });
  const id: string = created.data.application.id;
  const url = `${server.url}/applications/${id}`;
  expect(created.data.url).toBe(url);
  expect(created.text).toContain(url);
  expect(created.data.application.status).toBe("drafting");
  expect(created.data.page.pageCount).toBeGreaterThan(1);

  // 3. Aim for one page with tightening off: the page result says how far over it runs.
  const over = await call("tailor_application", { id, pageTarget: 1, autoFit: false });
  expect(over.data.page).toMatchObject({ pageTarget: 1, fits: false });
  expect(over.data.page.linesOver).toBeGreaterThan(0);
  expect(over.data.page.message).toMatch(/over 1 page; tightening is off/);
  expect(over.data.url).toBe(url);

  // 4. Leave out the older jobs and reword a line: now it fits.
  const bullet = first.highlights[0];
  const fitted = await call("tailor_application", {
    id,
    exclude: older.map((entry: { id: string }) => entry.id),
    reword: [{ itemId: bullet.id, field: "text", text: "Moved billing to events." }],
    autoFit: true,
    sectionOrder: ["skills", "work"],
  });
  expect(fitted.data.page).toMatchObject({ pageCount: 1, fits: true });
  expect(fitted.text).toContain("fits");

  const badField = await callTool(client, "tailor_application", {
    id,
    reword: [{ itemId: bullet.id, field: "title", text: "x" }],
  });
  expect(badField.isError).toBe(true);
  expect(badField.text).toContain("its fields are: text");

  // The application prints the rewording and leaves out the older jobs.
  const read = (await call("get_application", { id })).data;
  expect(read.application).toMatchObject({
    company: "Stripe",
    jobDescription: "Build payment systems.",
  });
  expect(read.resume.work.map((entry: { name: string }) => entry.name)).toEqual([
    first.name,
    second.name,
  ]);
  expect(read.resume.work[0].highlights[0].text).toBe("Moved billing to events.");
  expect(read.tailoring.sectionOrder.slice(0, 2)).toEqual(["skills", "work"]);
  expect(read.page.fits).toBe(true);

  // A profile change under a rewording shows up as stale.
  await call("update_profile", {
    change: [{ id: bullet.id, fields: { text: "Rewrote billing." } }],
  });
  const stale = (await call("get_application", { id })).data.staleRewordings;
  expect(stale).toEqual([
    {
      itemId: bullet.id,
      field: "text",
      text: "Moved billing to events.",
      profileText: "Rewrote billing.",
    },
  ]);

  // 5. Move it along, then find it again.
  const applied = await call("update_application", { id, status: "applied", notes: "Referred" });
  expect(applied.data.application.status).toBe("applied");
  expect(applied.data.application.appliedAt).toEqual(expect.any(String));
  expect(applied.data.page.fits).toBe(true);

  const waiting = await call("list_applications", { status: ["applied", "interviewing"] });
  expect(waiting.data.applications).toEqual([
    expect.objectContaining({ id, company: "Stripe", status: "applied", url }),
  ]);
  expect((await call("list_applications", { query: "stri" })).data.applications).toHaveLength(1);

  await call("update_application", { id, status: "rejected", archived: true });
  expect((await call("list_applications")).data.applications).toEqual([]);
  const archived = await call("list_applications", { archived: "only" });
  expect(archived.data.applications[0]).toMatchObject({ id, status: "rejected", archived: true });

  // 6. Export: the links open in a browser with no session.
  const pdfLink = await call("export_resume", { applicationId: id });
  const pdf = await fetch(pdfLink.data.url);
  expect(pdf.status).toBe(200);
  expect(pdf.headers.get("content-type")).toBe("application/pdf");
  expect(pdf.headers.get("content-disposition")).toContain(
    "ada-example-stripe-backend-engineer.pdf"
  );
  expect(
    Buffer.from(await pdf.arrayBuffer())
      .subarray(0, 5)
      .toString()
  ).toBe("%PDF-");

  const jsonLink = await call("export_resume", { format: "json" });
  const json = await (await fetch(jsonLink.data.url)).json();
  expect(json.basics.name).toBe("Ada Example");
  expect(json.work).toHaveLength(7);

  const missing = await callTool(client, "get_application", { id: "no-such-application" });
  expect(missing).toMatchObject({ isError: true });
  expect(missing.text).toContain("list_applications");

  // Every write was logged as the agent, by its client name.
  const changes = await server.database.db
    .select({ kind: schema.change.actorKind, client: schema.change.actorClient })
    .from(schema.change)
    .orderBy(desc(schema.change.seq))
    .limit(1);
  expect(changes[0]).toEqual({ kind: "agent", client: options.actorClient });

  return { applicationId: id, downloadUrl: pdfLink.data.url as string };
};
