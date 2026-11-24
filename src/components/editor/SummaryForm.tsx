import type { Component } from "solid-js";

import { BASICS_ITEM_ID } from "@/lib/versions/items";
import { resume, setResume } from "@/store/resume";
import VersionedField from "./VersionedField";

const SummaryForm: Component = () => (
  <VersionedField
    id="summary"
    label="Summary"
    multiline
    rows={6}
    hint="Two to four sentences on what you do and what you're looking for."
    placeholder="Software engineer with five years of experience in…"
    value={resume.basics.summary ?? ""}
    onInput={(value) => setResume("basics", "summary", value)}
    reword={{ itemId: BASICS_ITEM_ID, field: "summary" }}
    name="summary"
  />
);

export default SummaryForm;
