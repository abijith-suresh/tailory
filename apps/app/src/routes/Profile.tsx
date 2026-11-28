import { Title } from "@solidjs/meta";
import { createMemo, Loading } from "solid-js";

import { ProfileEditor } from "../components/profile/ProfileEditor";
import { getProfileState } from "../server/profile-functions";

export default function Profile() {
  const state = createMemo(() => getProfileState());
  return (
    <>
      <Title>Profile · Tailory</Title>
      <div class="page-head">
        <div>
          <h1 class="page-title">Profile</h1>
          <p class="page-lede">
            Your whole career history. Every application starts from it and leaves out what doesn't
            fit the job. Changes save as you type.
          </p>
        </div>
      </div>
      <Loading fallback={<p class="loading-note">Loading your profile…</p>}>
        <ProfileEditor initial={state()} />
      </Loading>
    </>
  );
}
