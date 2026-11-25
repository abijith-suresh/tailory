import type { TDocumentDefinitions } from "pdfmake/interfaces";
import { renderPdfResumeModel } from "../export/pdf-renderer.ts";

import {
  formatContactLine,
  formatDisplayUrl,
  formatInterestsText,
  formatLanguagesText,
  formatSkillsText,
} from "../export/template-helpers.ts";
import type { PdfTemplateOptions } from "../export/template-types.ts";
import { type ResumeDesignSettings, resolveResumeDesignSettings } from "../resume/design.ts";
import type { ResumeSchema } from "../types/resume.ts";
import type { ResumeRenderModel, ResumeSectionModel } from "./render-model.ts";
import {
  buildAwardsSection,
  buildCertificatesSection,
  buildEducationSection,
  buildProjectsSection,
  buildPublicationsSection,
  buildReferencesSection,
  buildTextSection,
  buildVolunteerSection,
  buildWorkSection,
} from "./section-builders.ts";

const PAGE_MARGINS = [50, 50, 50, 50] as const;

export function buildMinimalRenderModel(
  resume: ResumeSchema,
  design: ResumeDesignSettings
): ResumeRenderModel {
  const skillsText = formatSkillsText(resume.skills, { groupSeparator: ", " });
  const languagesText = formatLanguagesText(resume.languages, { groupSeparator: ", " });
  const interestsText = formatInterestsText(resume.interests, { groupSeparator: ", " });
  const sections: ResumeSectionModel[] = [];

  const appendSection = (section: ResumeSectionModel | null) => {
    if (section) {
      sections.push(section);
    }
  };

  appendSection(buildTextSection({ id: "summary", title: "Summary", text: resume.basics.summary }));
  appendSection(buildWorkSection(resume.work, { title: "Experience", subtitleMode: "inline" }));
  appendSection(
    buildVolunteerSection(resume.volunteer, { title: "Volunteer", subtitleMode: "inline" })
  );
  appendSection(
    buildEducationSection(resume.education, { title: "Education", subtitleMode: "inline" })
  );
  appendSection(buildAwardsSection(resume.awards, { title: "Awards", subtitleMode: "inline" }));
  appendSection(
    buildPublicationsSection(resume.publications, {
      title: "Publications",
      subtitleMode: "inline",
      resolveLink: (url) => formatDisplayUrl(url),
    })
  );
  appendSection(buildTextSection({ id: "skills", title: "Skills", text: skillsText }));
  appendSection(buildTextSection({ id: "languages", title: "Languages", text: languagesText }));
  appendSection(buildTextSection({ id: "interests", title: "Interests", text: interestsText }));
  appendSection(
    buildProjectsSection(resume.projects, {
      title: "Projects",
      resolveMeta: (project) => formatDisplayUrl(project.url),
    })
  );
  appendSection(buildReferencesSection(resume.references, { title: "References" }));
  appendSection(
    buildCertificatesSection(resume.certificates, {
      title: "Certifications",
      subtitleMode: "inline",
    })
  );

  return {
    template: "minimal",
    design,
    pageMargins: [...PAGE_MARGINS],
    header: {
      name: resume.basics.name,
      label: resume.basics.label,
      contactLine: formatContactLine(resume.basics),
      urlLine: formatDisplayUrl(resume.basics.url),
    },
    sections,
  };
}

export function minimalTemplate(
  resume: ResumeSchema,
  options: PdfTemplateOptions = {}
): TDocumentDefinitions {
  const design = resolveResumeDesignSettings({
    template: "minimal",
    accentColor: options.accentColor,
  });

  return renderPdfResumeModel(buildMinimalRenderModel(resume, design));
}
