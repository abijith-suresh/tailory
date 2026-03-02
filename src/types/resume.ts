// JSON Resume schema — https://jsonresume.org/schema/
// Extended with additional fields for Tailory

export interface ResumeLocation {
  address?: string;
  postalCode?: string;
  city?: string;
  countryCode?: string;
  region?: string;
}

export interface ResumeProfile {
  network: string;
  username: string;
  url: string;
}

export interface ResumeBasics {
  name: string;
  label?: string;
  image?: string;
  email?: string;
  phone?: string;
  url?: string;
  summary?: string;
  location?: ResumeLocation;
  profiles?: ResumeProfile[];
}

export interface ResumeWork {
  id: string;
  name: string;
  position: string;
  url?: string;
  startDate?: string;
  endDate?: string;
  summary?: string;
  highlights?: string[];
}

export interface ResumeVolunteer {
  id: string;
  organization: string;
  position: string;
  url?: string;
  startDate?: string;
  endDate?: string;
  summary?: string;
  highlights?: string[];
}

export interface ResumeEducation {
  id: string;
  institution: string;
  url?: string;
  area?: string;
  studyType?: string;
  startDate?: string;
  endDate?: string;
  score?: string;
  courses?: string[];
}

export interface ResumeAward {
  id: string;
  title: string;
  date?: string;
  awarder?: string;
  summary?: string;
}

export interface ResumeCertificate {
  id: string;
  name: string;
  date?: string;
  issuer?: string;
  url?: string;
}

export interface ResumePublication {
  id: string;
  name: string;
  publisher?: string;
  releaseDate?: string;
  url?: string;
  summary?: string;
}

export interface ResumeSkill {
  id: string;
  name: string;
  level?: string;
  keywords?: string[];
}

export interface ResumeLanguage {
  id: string;
  language: string;
  fluency?: string;
}

export interface ResumeInterest {
  id: string;
  name: string;
  keywords?: string[];
}

export interface ResumeReference {
  id: string;
  name: string;
  reference?: string;
}

export interface ResumeProject {
  id: string;
  name: string;
  description?: string;
  highlights?: string[];
  keywords?: string[];
  startDate?: string;
  endDate?: string;
  url?: string;
  roles?: string[];
  entity?: string;
  type?: string;
}

export interface ResumeSchema {
  basics: ResumeBasics;
  work?: ResumeWork[];
  volunteer?: ResumeVolunteer[];
  education?: ResumeEducation[];
  awards?: ResumeAward[];
  certificates?: ResumeCertificate[];
  publications?: ResumePublication[];
  skills?: ResumeSkill[];
  languages?: ResumeLanguage[];
  interests?: ResumeInterest[];
  references?: ResumeReference[];
  projects?: ResumeProject[];
}

export type TemplateId = "modern" | "minimal" | "compact-ats";

export type SectionId =
  | "basics"
  | "summary"
  | "work"
  | "education"
  | "skills"
  | "projects"
  | "certs";

export const EMPTY_RESUME: ResumeSchema = {
  basics: {
    name: "",
    label: "",
    email: "",
    phone: "",
    url: "",
    summary: "",
    location: {
      city: "",
      region: "",
      countryCode: "",
    },
    profiles: [],
  },
  work: [],
  education: [],
  skills: [],
  projects: [],
  certificates: [],
};
