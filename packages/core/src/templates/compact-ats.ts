import type { TDocumentDefinitions } from "pdfmake/interfaces";
import { applySectionOrder, scalePageMargins } from "../applications/section-order.ts";
import { renderPdfResumeModel } from "../export/pdf-renderer.ts";

import {
  buildHeaderContact,
  buildProjectMetadata,
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

// Compact template (id "compact-ats", kept for saved drafts): single column, dense layout.
// No tables, no images, standard fonts.

const PAGE_MARGINS = [36, 36, 36, 36] as const;

export function buildCompactAtsRenderModel(
  resume: ResumeSchema,
  design: ResumeDesignSettings
): ResumeRenderModel {
  const sections: ResumeSectionModel[] = [];
  const skillsText = formatSkillsText(resume.skills, { groupSeparator: " | " });
  const languagesText = formatLanguagesText(resume.languages, { groupSeparator: " | " });
  const interestsText = formatInterestsText(resume.interests, { groupSeparator: " | " });

  const appendSection = (section: ResumeSectionModel | null) => {
    if (section) {
      sections.push(section);
    }
  };

  appendSection(
    buildTextSection({
      id: "summary",
      title: "Summary",
      text: resume.basics.summary,
      dividerAfter: true,
    })
  );
  appendSection(
    buildWorkSection(resume.work, {
      title: "Professional Experience",
      subtitleMode: "stacked",
      dividerAfter: true,
    })
  );
  appendSection(
    buildVolunteerSection(resume.volunteer, {
      title: "Volunteer Experience",
      subtitleMode: "stacked",
      dividerAfter: true,
    })
  );
  appendSection(
    buildEducationSection(resume.education, {
      title: "Education",
      subtitleMode: "stacked",
      dividerAfter: true,
    })
  );
  appendSection(
    buildAwardsSection(resume.awards, {
      title: "Awards",
      subtitleMode: "stacked",
      dividerAfter: true,
    })
  );
  appendSection(
    buildPublicationsSection(resume.publications, {
      title: "Publications",
      subtitleMode: "stacked",
      dividerAfter: true,
    })
  );
  appendSection(
    buildTextSection({
      id: "skills",
      title: "Technical Skills",
      text: skillsText,
      dividerAfter: true,
    })
  );
  appendSection(
    buildTextSection({
      id: "languages",
      title: "Languages",
      text: languagesText,
      dividerAfter: true,
    })
  );
  appendSection(
    buildTextSection({
      id: "interests",
      title: "Interests",
      text: interestsText,
      dividerAfter: true,
    })
  );
  appendSection(
    buildProjectsSection(resume.projects, {
      title: "Projects",
      dividerAfter: true,
      resolveMeta: (project) => buildProjectMetadata(project),
    })
  );
  appendSection(
    buildReferencesSection(resume.references, {
      title: "References",
      dividerAfter: true,
    })
  );
  appendSection(
    buildCertificatesSection(resume.certificates, {
      title: "Certifications",
      subtitleMode: "stacked",
    })
  );

  return {
    template: "compact-ats",
    design,
    pageMargins: [...PAGE_MARGINS],
    header: {
      name: resume.basics.name,
      dividerAfter: true,
      ...buildHeaderContact(resume.basics, {
        includeEmail: true,
        includeLabel: true,
        includeLocation: true,
        includePhone: true,
        includeProfiles: true,
        includeUrl: true,
        separator: " | ",
      }),
    },
    sections,
  };
}

export function compactAtsTemplate(
  resume: ResumeSchema,
  options: PdfTemplateOptions = {}
): TDocumentDefinitions {
  const design = resolveResumeDesignSettings({
    template: "compact-ats",
    accentColor: options.accentColor,
  });

  return renderPdfResumeModel(
    scalePageMargins(
      applySectionOrder(buildCompactAtsRenderModel(resume, design), options.sectionOrder),
      options.marginScale
    )
  );
}
