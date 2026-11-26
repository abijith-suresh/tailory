import { Title } from "@solidjs/meta";

import { EmptyState } from "../components/EmptyState";

export default function Profile() {
  return (
    <>
      <Title>Profile · Tailory</Title>
      <div class="page-head">
        <div>
          <h1 class="page-title">Profile</h1>
          <p class="page-lede">
            Your whole career history. Every application starts from it and leaves out what doesn't
            fit the job.
          </p>
        </div>
      </div>
      <EmptyState title="Profile editing is on its way">
        <p>
          You'll edit your work history, education and skills here, or import them from a PDF, DOCX
          or JSON Resume file.
        </p>
      </EmptyState>
    </>
  );
}
