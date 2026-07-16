import type { TDocumentDefinitions } from "pdfmake/interfaces";
import { renderPdfResumeModel } from "@/lib/export/pdf-renderer";

import {
  formatContactLine,
  formatDisplayUrl,
  formatInterestsText,
  formatLanguagesText,
  formatSkillsText,
} from "@/lib/export/template-helpers";
import type { PdfTemplateOptions } from "@/lib/export/template-types";
import {
  type ResumeDesignSettings,
  resolvePageMargins,
  resolveResumeDesignSettings,
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
import type { ResumeSchema } from "@/types/resume";

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
    pageMargins: resolvePageMargins(design, [...PAGE_MARGINS]),
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
  options: PdfTemplateOptions
): TDocumentDefinitions {
  const design = resolveResumeDesignSettings({
    template: "minimal",
    accentColor: options.accentColor,
    pageFormat: options.pageFormat,
    pageMargins: options.pageMargins,
    typography: {
      ...options.typography,
      pdfFontFamily: options.fontFamily,
    },
  });

  return renderPdfResumeModel(buildMinimalRenderModel(resume, design), {
    fontFamily: options.fontFamily,
  });
}
