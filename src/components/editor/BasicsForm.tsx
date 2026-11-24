import { type Component, createSignal } from "solid-js";

import { BASICS_ITEM_ID } from "@/lib/versions/items";
import { findRewording } from "@/lib/versions/resolve";
import { activeVersion } from "@/store/editor";
import { resume, setResume } from "@/store/resume";
import VersionedField from "./VersionedField";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(value: string): string {
  if (!value) return "";
  return EMAIL_RE.test(value) ? "" : "Enter an email address, like jane@example.com.";
}

function validateUrl(value: string): string {
  if (!value) return "";
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:"
      ? ""
      : "Start the address with http:// or https://.";
  } catch {
    return "Enter a full address, like https://example.com.";
  }
}

type BasicsText = "name" | "label" | "email" | "phone" | "url";

/** The text a field shows: the open version's wording, or the master's. */
function shownText(field: BasicsText): string {
  const version = activeVersion();
  const rewording = version && findRewording(version, BASICS_ITEM_ID, field);
  return rewording?.text ?? resume.basics[field] ?? "";
}

const BasicsForm: Component = () => {
  const [emailError, setEmailError] = createSignal("");
  const [urlError, setUrlError] = createSignal("");

  const field = (key: BasicsText) => ({
    value: resume.basics[key] ?? "",
    onInput: (value: string) => setResume("basics", key, value),
    reword: { itemId: BASICS_ITEM_ID, field: key },
    name: key,
  });

  const location = (key: "city" | "region" | "countryCode") => ({
    value: resume.basics.location?.[key] ?? "",
    onInput: (value: string) => setResume("basics", "location", key, value),
    name: key,
  });

  return (
    <div class="space-y-4">
      <VersionedField
        id="basics-name"
        label="Full name"
        required
        autocomplete="name"
        placeholder="Jane Doe"
        {...field("name")}
      />
      <VersionedField
        id="basics-label"
        label="Headline"
        autocomplete="organization-title"
        placeholder="Software engineer"
        hint="A short line under your name, such as your role."
        {...field("label")}
      />
      <div class="grid gap-4 @md:grid-cols-2">
        <VersionedField
          id="basics-email"
          label="Email"
          type="email"
          autocomplete="email"
          placeholder="jane@example.com"
          error={emailError()}
          onBlur={() => setEmailError(validateEmail(shownText("email")))}
          {...field("email")}
          onInput={(value) => {
            setResume("basics", "email", value);
            if (emailError()) setEmailError(validateEmail(value));
          }}
        />
        <VersionedField
          id="basics-phone"
          label="Phone"
          type="tel"
          autocomplete="tel"
          placeholder="+1 555-123-4567"
          {...field("phone")}
        />
      </div>
      <VersionedField
        id="basics-url"
        label="Website"
        type="url"
        autocomplete="url"
        placeholder="https://janedoe.dev"
        error={urlError()}
        onBlur={() => setUrlError(validateUrl(shownText("url")))}
        {...field("url")}
        onInput={(value) => {
          setResume("basics", "url", value);
          if (urlError()) setUrlError(validateUrl(value));
        }}
      />
      <div class="grid gap-4 @md:grid-cols-2">
        <VersionedField
          id="basics-city"
          label="City"
          autocomplete="address-level2"
          placeholder="San Francisco"
          {...location("city")}
        />
        <VersionedField
          id="basics-region"
          label="Region or state"
          autocomplete="address-level1"
          placeholder="CA"
          {...location("region")}
        />
      </div>
      <VersionedField
        id="basics-country"
        label="Country code"
        autocomplete="country"
        placeholder="US"
        {...location("countryCode")}
      />
    </div>
  );
};

export default BasicsForm;
