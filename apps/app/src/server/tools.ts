import type { McpServer } from "@modelcontextprotocol/server";
import {
  APPLICATION_STATUSES,
  type Application,
  ENTRY_SECTIONS,
  type ItemKind,
  indexProfileItems,
  isExcludable,
  RESUME_SECTION_KEYS,
  REWORDABLE_FIELDS,
  type ResumeSchema,
  type Rewording,
  readProfileText,
  resolveApplication,
  sameText,
  TEMPLATE_IDS,
  validateResumeForExport,
} from "@tailory/core";
import { z } from "zod";

import {
  type Actor,
  type ApplicationChanges,
  type ApplicationRecord,
  createApplication,
  type DataContext,
  DataError,
  getApplication,
  getProfile,
  listApplications,
  updateApplication,
  updateProfile,
} from "./data";
import { createDownloadLink } from "./downloads";
import { countItems, editProfile, ProfileEditError } from "./profile-edit";
import { fitApplicationResult, fitProfileResult } from "./render";
import { getDatabase } from "./runtime";

// The resume tools an agent gets over MCP (#186). Every write acts as the agent, is logged with
// its client name, and answers with the page result and the link to open in the web app.

export type ToolContext = {
  userId: string;
  /** Where the web app is, without a trailing slash: the public URL, or the loopback address. */
  origin: string;
  /** The agent's name, read when a write happens. */
  clientName: () => string | null;
};

const READ = { readOnlyHint: true, openWorldHint: false } as const;

/** A tool's answer: a short line for the agent to read, and the same facts as structured data. */
const reply = (text: string, structured: Record<string, unknown>) => ({
  content: [{ type: "text" as const, text: `${text}\n${JSON.stringify(structured)}` }],
  structuredContent: structured,
});

/** An error the agent can act on. The SDK turns a thrown error into an `isError` result. */
class ToolError extends Error {}

const run = async <T>(work: () => Promise<T>): Promise<T> => {
  try {
    return await work();
  } catch (error) {
    if (error instanceof DataError) {
      throw new ToolError(
        error.code === "not_found"
          ? `${error.message}. Call list_applications for the ids you can use.`
          : `${error.message}.`
      );
    }
    if (error instanceof ProfileEditError) throw new ToolError(error.message);
    throw error;
  }
};

const label = (application: Pick<Application, "company" | "role">) =>
  [application.company, application.role].filter(Boolean).join(", ") || "the application";

const ENTRY_SECTION = z.enum(ENTRY_SECTIONS);
const STATUS = z.enum(APPLICATION_STATUSES);
const TEMPLATE = z.enum(TEMPLATE_IDS);
const PAGE_TARGET = z.number().int().min(1).nullable();
const DATE = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), "must be a date such as 2026-11-26")
  .nullable();
const FIELDS = z.record(z.string(), z.unknown());

const describeItemFields = (kind: ItemKind) =>
  (REWORDABLE_FIELDS[kind] as readonly string[]).join(", ");

export const registerResumeTools = (server: McpServer, tool: ToolContext) => {
  const data = async (): Promise<DataContext> => {
    const { db } = await getDatabase();
    const actor: Actor = { kind: "agent", client: tool.clientName() };
    return { db, userId: tool.userId, actor };
  };
  const applicationUrl = (id: string) => `${tool.origin}/applications/${id}`;
  const profileUrl = `${tool.origin}/profile`;

  const summary = (application: ApplicationRecord) => ({
    id: application.id,
    company: application.company,
    role: application.role,
    status: application.status,
    archived: application.archived,
    postingUrl: application.postingUrl,
    createdAt: application.createdAt,
    appliedAt: application.appliedAt,
    closedAt: application.closedAt,
    updatedAt: application.updatedAt,
    url: applicationUrl(application.id),
  });

  /** The answer to every application write: what it is now, and how it prints. */
  const afterWrite = async (done: string, application: ApplicationRecord) => {
    const { resume } = await getProfile(await data());
    const fitted = await fitApplicationResult(resume, application);
    const url = applicationUrl(application.id);
    return reply(`${done}: ${fitted.page.message}. ${url}`, {
      application: summary(application),
      page: fitted.page,
      staleRewordings: fitted.staleRewordings.length,
      url,
    });
  };

  server.registerTool(
    "get_profile",
    {
      description:
        "The user's profile: their whole career history in JSON Resume shape. Every entry and bullet has an id; use the ids with update_profile and tailor_application.",
      inputSchema: z.object({}),
      annotations: READ,
    },
    () =>
      run(async () => {
        const { resume, updatedAt } = await getProfile(await data());
        const { entries, bullets } = countItems(resume);
        return reply(`Profile: ${entries} entries, ${bullets} bullets.`, {
          profile: resume,
          updatedAt,
        });
      })
  );

  server.registerTool(
    "update_profile",
    {
      description: [
        "Edits the profile. All edits apply together, in this order, or none do:",
        "replace: a whole JSON Resume (bullets as strings), e.g. on first import;",
        "basics: fields merged into basics (name, label, email, phone, url, summary, location, profiles);",
        "add: new entries { section, entry } or new bullets { entryId, bullet };",
        "change: { id, fields } merges fields into an entry, or { id, fields: { text } } rewords a bullet;",
        "remove: entry or bullet ids.",
        "Returns the ids of what was added. Applications follow the profile: removed items leave them too.",
      ].join(" "),
      inputSchema: z.object({
        replace: FIELDS.optional().describe("A whole JSON Resume document"),
        basics: FIELDS.optional(),
        add: z
          .array(
            z.union([
              z.object({ section: ENTRY_SECTION, entry: FIELDS }),
              z.object({ entryId: z.string(), bullet: z.string() }),
            ])
          )
          .optional(),
        change: z.array(z.object({ id: z.string(), fields: FIELDS })).optional(),
        remove: z.array(z.string()).optional(),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    (input) =>
      run(async () => {
        const ctx = await data();
        let added: string[] = [];
        const record = await updateProfile(
          ctx,
          (current) => {
            const edited = editProfile(current, input);
            added = edited.added;
            return edited.resume;
          },
          input.replace ? "Replaced the profile" : "Updated the profile"
        );
        const fitted = await fitProfileResult(record.resume);
        const { entries, bullets } = countItems(record.resume);
        return reply(
          `Profile saved, ${entries} entries and ${bullets} bullets: ${fitted.page.message}. ${profileUrl}`,
          {
            added,
            entries,
            bullets,
            page: fitted.page,
            updatedAt: record.updatedAt,
            url: profileUrl,
          }
        );
      })
  );

  server.registerTool(
    "list_applications",
    {
      description:
        "The user's applications, most recently changed first. Archived ones are left out unless archived is include or only.",
      inputSchema: z.object({
        status: z.array(STATUS).optional().describe("Only these statuses"),
        archived: z.enum(["exclude", "include", "only"]).default("exclude"),
        query: z.string().optional().describe("Text the company or role contains"),
      }),
      annotations: READ,
    },
    ({ status, archived, query }) =>
      run(async () => {
        const applications = await listApplications(await data(), {
          status,
          archived: archived === "include" ? undefined : archived === "only",
          search: query,
        });
        const count = applications.length;
        return reply(`${count} application${count === 1 ? "" : "s"}.`, {
          applications: applications.map(summary),
        });
      })
  );

  server.registerTool(
    "create_application",
    {
      description:
        "Starts an application for a job, drafting, with a resume that keeps the whole profile. Then cut it down with tailor_application.",
      inputSchema: z.object({
        company: z.string().min(1),
        role: z.string().min(1),
        postingUrl: z.string().url().optional(),
        jobDescription: z
          .string()
          .optional()
          .describe("The posting's text, kept with the application"),
        pageTarget: PAGE_TARGET.optional().describe("Pages the resume should fit on"),
        template: TEMPLATE.optional(),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    ({ template, ...details }) =>
      run(async () => {
        const record = await createApplication(await data(), { ...details, templateId: template });
        return afterWrite(`Created ${label(record)} (${record.id})`, record);
      })
  );

  server.registerTool(
    "get_application",
    {
      description:
        "One application: the job details, the tailoring, the resume as it will print, rewordings whose profile text changed since, and the page result.",
      inputSchema: z.object({ id: z.string() }),
      annotations: READ,
    },
    ({ id }) =>
      run(async () => {
        const ctx = await data();
        const application = await getApplication(ctx, id);
        const { resume: profile } = await getProfile(ctx);
        const fitted = await fitApplicationResult(profile, application);
        const items = indexProfileItems(profile);
        const url = applicationUrl(id);
        return reply(
          `${label(application)}, ${application.status}: ${fitted.page.message}. ${url}`,
          {
            application: {
              ...summary(application),
              jobDescription: application.jobDescription,
              notes: application.notes,
            },
            tailoring: {
              excluded: application.excluded,
              rewordings: application.rewordings.map(({ itemId, field, text }) => ({
                itemId,
                field,
                text,
              })),
              sectionOrder: application.sectionOrder,
              template: application.templateId,
              pageTarget: application.pageTarget,
              autoFit: application.autoFit,
            },
            resume: fitted.resume,
            staleRewordings: fitted.staleRewordings.map((rewording) => ({
              itemId: rewording.itemId,
              field: rewording.field,
              text: rewording.text,
              profileText: readProfileText(items, rewording.itemId, rewording.field),
            })),
            page: fitted.page,
            url,
          }
        );
      })
  );

  server.registerTool(
    "tailor_application",
    {
      description: [
        "Tailors an application's resume. exclude/include take profile entry or bullet ids.",
        "reword sets this application's wording for one field of an item (a bullet's field is text; 'basics' is the item for summary and label); rewording to the profile's own text drops the rewording.",
        "sectionOrder lists sections first to last; the rest follow.",
        "pageTarget is pages to fit on (null for none); autoFit lets Tailory tighten spacing to meet it.",
        "Answers with the page result: fix overflow by leaving out or shortening lines.",
      ].join(" "),
      inputSchema: z.object({
        id: z.string(),
        exclude: z.array(z.string()).optional(),
        include: z.array(z.string()).optional(),
        reword: z
          .array(z.object({ itemId: z.string(), field: z.string(), text: z.string() }))
          .optional(),
        sectionOrder: z.array(z.enum(RESUME_SECTION_KEYS)).optional(),
        template: TEMPLATE.optional(),
        pageTarget: PAGE_TARGET.optional(),
        autoFit: z.boolean().optional(),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    (input) =>
      run(async () => {
        const ctx = await data();
        const current = await getApplication(ctx, input.id);
        const { resume: profile } = await getProfile(ctx);
        const changes = tailoringChanges(profile, current, input);
        const record = await updateApplication(ctx, input.id, changes);
        return afterWrite(`Tailored ${label(record)}`, record);
      })
  );

  server.registerTool(
    "update_application",
    {
      description:
        "Changes an application's status, notes, dates, job details, or archives it. Moving status keeps appliedAt and closedAt in step unless you give them.",
      inputSchema: z.object({
        id: z.string(),
        status: STATUS.optional(),
        notes: z.string().optional(),
        appliedAt: DATE.optional(),
        closedAt: DATE.optional(),
        archived: z.boolean().optional(),
        company: z.string().min(1).optional(),
        role: z.string().min(1).optional(),
        postingUrl: z.string().url().nullable().optional(),
        jobDescription: z.string().nullable().optional(),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    ({ id, ...changes }) =>
      run(async () => {
        const record = await updateApplication(await data(), id, changes);
        const state = record.archived ? `${record.status}, archived` : record.status;
        return afterWrite(`${label(record)} is ${state}`, record);
      })
  );

  server.registerTool(
    "export_resume",
    {
      description:
        "A download link for an application's resume, or the profile's when applicationId is left out, as a PDF or a JSON Resume file. The link works in any browser for an hour; give it to the user.",
      inputSchema: z.object({
        applicationId: z.string().optional(),
        format: z.enum(["pdf", "json"]).default("pdf"),
      }),
      annotations: READ,
    },
    ({ applicationId, format }) =>
      run(async () => {
        const ctx = await data();
        const application = applicationId ? await getApplication(ctx, applicationId) : null;
        const { resume: profile } = await getProfile(ctx);
        const printed = resolveApplication(
          profile,
          application ?? { excluded: [], rewordings: [] }
        );
        const validation = validateResumeForExport(printed.resume);
        if (!validation.ok) throw new ToolError(validation.message ?? "Nothing to export yet.");
        const link = createDownloadLink(tool.origin, {
          userId: tool.userId,
          applicationId: application?.id ?? null,
          format,
        });
        const what = application ? label(application) : "the profile";
        return reply(`${format.toUpperCase()} of ${what}: ${link.url}`, {
          ...link,
          format,
          applicationId: application?.id ?? null,
        });
      })
  );
};

type TailorInput = {
  exclude?: string[];
  include?: string[];
  reword?: { itemId: string; field: string; text: string }[];
  sectionOrder?: ApplicationChanges["sectionOrder"];
  template?: ApplicationChanges["templateId"];
  pageTarget?: number | null;
  autoFit?: boolean;
};

/** Turns tailor_application's input into application changes, refusing ids the profile lacks. */
export const tailoringChanges = (
  profile: ResumeSchema,
  current: Application,
  input: TailorInput
): ApplicationChanges => {
  const items = indexProfileItems(profile);
  const changes: ApplicationChanges = {};

  if (input.exclude || input.include) {
    const unknown = [...(input.exclude ?? []), ...(input.include ?? [])].filter(
      (id) => !isExcludable(items.get(id))
    );
    if (unknown.length) {
      throw new ToolError(
        `Not profile entry or bullet ids: ${unknown.join(", ")}. Call get_profile for the ids.`
      );
    }
    const both = (input.exclude ?? []).filter((id) => input.include?.includes(id));
    if (both.length) throw new ToolError(`Both excluded and included: ${both.join(", ")}.`);
    const excluded = new Set(current.excluded);
    for (const id of input.exclude ?? []) excluded.add(id);
    for (const id of input.include ?? []) excluded.delete(id);
    changes.excluded = [...excluded];
  }

  if (input.reword) {
    const rewordings = new Map<string, Rewording>(
      current.rewordings.map((rewording) => [
        `${rewording.itemId}\u0000${rewording.field}`,
        rewording,
      ])
    );
    for (const { itemId, field, text } of input.reword) {
      const item = items.get(itemId);
      if (!item)
        throw new ToolError(`No profile item has id "${itemId}". Call get_profile for the ids.`);
      const profileText = readProfileText(items, itemId, field);
      if (profileText === null) {
        throw new ToolError(
          `"${field}" can't be reworded on "${itemId}"; its fields are: ${describeItemFields(item.kind)}.`
        );
      }
      const key = `${itemId}\u0000${field}`;
      if (sameText(text, profileText)) rewordings.delete(key);
      else rewordings.set(key, { itemId, field, text, baseText: profileText });
    }
    changes.rewordings = [...rewordings.values()];
  }

  if (input.sectionOrder) changes.sectionOrder = input.sectionOrder;
  if (input.template) changes.templateId = input.template;
  if (input.pageTarget !== undefined) changes.pageTarget = input.pageTarget;
  if (input.autoFit !== undefined) changes.autoFit = input.autoFit;
  return changes;
};
