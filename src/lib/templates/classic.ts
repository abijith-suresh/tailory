import type { ResumeSchema } from "@/types/resume";
import type { TDocumentDefinitions } from "pdfmake/interfaces";

import {
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

const PAGE_MARGINS = [52, 52, 52, 52] as const;

export function buildClassicRenderModel(
  resume: ResumeSchema,
  design: ResumeDesignSettings
): ResumeRenderModel {
  const sections: ResumeSectionModel[] = [];
  const skillsText = formatSkillsText(resume.skills, { groupSeparator: ", " });
  const languagesText = formatLanguagesText(resume.languages, { groupSeparator: ", " });
  const interestsText = formatInterestsText(resume.interests, { groupSeparator: ", " });

  const appendSection = (section: ResumeSectionModel | null) => {
    if (section) sections.push(section);
  };

  appendSection(
    buildTextSection({ id: "summary", title: "Professional Summary", text: resume.basics.summary })
  );
  appendSection(
    buildWorkSection(resume.work, { title: "Professional Experience", subtitleMode: "inline" })
  );
  appendSection(
    buildEducationSection(resume.education, { title: "Education", subtitleMode: "inline" })
  );
  appendSection(
    buildCertificatesSection(resume.certificates, {
      title: "Certifications",
      subtitleMode: "inline",
    })
  );
  appendSection(buildTextSection({ id: "skills", title: "Skills", text: skillsText }));
  appendSection(buildProjectsSection(resume.projects, { title: "Selected Projects" }));
  appendSection(
    buildVolunteerSection(resume.volunteer, {
      title: "Volunteer Experience",
      subtitleMode: "inline",
    })
  );
  appendSection(buildAwardsSection(resume.awards, { title: "Awards", subtitleMode: "inline" }));
  appendSection(
    buildPublicationsSection(resume.publications, {
      title: "Publications",
      subtitleMode: "inline",
      resolveLink: (url) => formatDisplayUrl(url),
    })
  );
  appendSection(buildTextSection({ id: "languages", title: "Languages", text: languagesText }));
  appendSection(buildTextSection({ id: "interests", title: "Interests", text: interestsText }));
  appendSection(buildReferencesSection(resume.references, { title: "References" }));

  return {
    template: "classic",
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

export function classicTemplate(
  resume: ResumeSchema,
  options: PdfTemplateOptions
): TDocumentDefinitions {
  const design = resolveResumeDesignSettings({
    template: "classic",
    accentColor: options.accentColor,
    pageFormat: options.pageFormat,
    pageMargins: options.pageMargins,
    typography: {
      ...options.typography,
      pdfFontFamily: options.fontFamily,
    },
  });

  return renderPdfResumeModel(buildClassicRenderModel(resume, design), {
    fontFamily: options.fontFamily,
  });
}
