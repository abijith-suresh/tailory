import type { ResumeSchema } from "@/types/resume";
import type { TDocumentDefinitions } from "pdfmake/interfaces";

import {
  buildProjectMetadata,
  formatContactLine,
  formatInterestsText,
  formatLanguagesText,
  formatSkillsText,
} from "@/lib/export/template-helpers";
import { renderPdfResumeModel } from "@/lib/export/pdf-renderer";
import type { PdfTemplateOptions } from "@/lib/export/template-types";
import {
  resolvePageMargins,
  resolveResumeDesignSettings,
  type ResumeDesignSettings,
} from "@/lib/resume/design";
import type { ResumeRenderModel, ResumeSectionModel } from "@/lib/templates/render-model";
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
} from "@/lib/templates/section-builders";

// Compact ATS template: single column, dense layout, maximum keyword density.
// Optimized for Applicant Tracking Systems: no tables, no images, standard fonts.

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
    pageMargins: resolvePageMargins(design, [...PAGE_MARGINS]),
    header: {
      name: resume.basics.name,
      dividerAfter: true,
      contactLine: formatContactLine(resume.basics, {
        includeEmail: true,
        includeLabel: true,
        includeLocation: true,
        includePhone: true,
        includeUrl: true,
        separator: " | ",
      }),
    },
    sections,
  };
}

export function compactAtsTemplate(
  resume: ResumeSchema,
  options: PdfTemplateOptions
): TDocumentDefinitions {
  const design = resolveResumeDesignSettings({
    template: "compact-ats",
    accentColor: options.accentColor,
    pageFormat: options.pageFormat,
    pageMargins: options.pageMargins,
    typography: {
      ...options.typography,
      pdfFontFamily: options.fontFamily,
    },
  });

  return renderPdfResumeModel(buildCompactAtsRenderModel(resume, design), {
    fontFamily: options.fontFamily,
  });
}
