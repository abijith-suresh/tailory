import type { ResumeSchema } from "@/types/resume";
import type { TDocumentDefinitions } from "pdfmake/interfaces";

import {
  buildProjectMetadata,
  formatContactLine,
  formatDisplayUrl,
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

const PAGE_MARGINS = [45, 45, 45, 45] as const;

export function buildModernRenderModel(
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

  appendSection(buildTextSection({ id: "summary", title: "Summary", text: resume.basics.summary }));
  appendSection(
    buildWorkSection(resume.work, {
      title: "Experience",
      subtitleMode: "stacked",
      spacerAfter: 6,
    })
  );
  appendSection(
    buildVolunteerSection(resume.volunteer, {
      title: "Volunteer",
      subtitleMode: "stacked",
      spacerAfter: 6,
    })
  );
  appendSection(
    buildEducationSection(resume.education, {
      title: "Education",
      subtitleMode: "stacked",
      spacerAfter: 4,
    })
  );
  appendSection(
    buildAwardsSection(resume.awards, {
      title: "Awards",
      subtitleMode: "stacked",
      spacerAfter: 4,
    })
  );
  appendSection(
    buildPublicationsSection(resume.publications, {
      title: "Publications",
      subtitleMode: "stacked",
      spacerAfter: 4,
      resolveLink: (url) => (url ? (formatDisplayUrl(url) ?? url) : undefined),
    })
  );
  appendSection(buildTextSection({ id: "skills", title: "Skills", text: skillsText }));
  appendSection(buildTextSection({ id: "languages", title: "Languages", text: languagesText }));
  appendSection(buildTextSection({ id: "interests", title: "Interests", text: interestsText }));
  appendSection(
    buildProjectsSection(resume.projects, {
      title: "Projects",
      spacerAfter: 4,
      resolveMeta: (project) => buildProjectMetadata(project),
      resolveLink: (url) => (url ? (formatDisplayUrl(url) ?? url) : undefined),
    })
  );
  appendSection(
    buildReferencesSection(resume.references, {
      title: "References",
      spacerAfter: 4,
    })
  );
  appendSection(
    buildCertificatesSection(resume.certificates, {
      title: "Certifications",
      subtitleMode: "stacked",
    })
  );

  return {
    template: "modern",
    design,
    pageMargins: resolvePageMargins(design, [...PAGE_MARGINS]),
    header: {
      name: resume.basics.name,
      label: resume.basics.label,
      contactLine: formatContactLine(resume.basics, {
        includeEmail: true,
        includeLocation: true,
        includePhone: true,
      }),
      urlLine: formatDisplayUrl(resume.basics.url),
    },
    sections,
  };
}

export function modernTemplate(
  resume: ResumeSchema,
  options: PdfTemplateOptions
): TDocumentDefinitions {
  const design = resolveResumeDesignSettings({
    template: "modern",
    accentColor: options.accentColor,
    pageFormat: options.pageFormat,
    pageMargins: options.pageMargins,
    typography: {
      ...options.typography,
      pdfFontFamily: options.fontFamily,
    },
  });

  return renderPdfResumeModel(buildModernRenderModel(resume, design), {
    fontFamily: options.fontFamily,
  });
}
