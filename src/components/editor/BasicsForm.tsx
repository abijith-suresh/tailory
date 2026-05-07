import { type Component, createSignal } from "solid-js";

import { validateOptionalPhone, validateRequiredName } from "@/lib/editor/validation";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import { resume, setResume } from "@/store/resume";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(value: string): string {
  if (!value) return "";
  return EMAIL_RE.test(value) ? "" : "Enter a valid email address.";
}

function validateUrl(value: string): string {
  if (!value) return "";
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:"
      ? ""
      : "URL must start with http:// or https://.";
  } catch {
    return "Enter a valid URL (e.g. https://example.com).";
  }
}

const BasicsForm: Component = () => {
  const [nameError, setNameError] = createSignal("");
  const [emailError, setEmailError] = createSignal("");
  const [phoneError, setPhoneError] = createSignal("");
  const [urlError, setUrlError] = createSignal("");

  return (
    <div class="space-y-4">
      <FormField label="Full Name" id="basics-name" required error={nameError()}>
        <Input
          id="basics-name"
          value={resume.basics.name}
          onInput={(v) => {
            setResume("basics", "name", v);
            if (nameError()) setNameError(validateRequiredName(v));
          }}
          onBlur={() => setNameError(validateRequiredName(resume.basics.name))}
          error={!!nameError()}
          aria-describedby={nameError() ? "basics-name-error" : undefined}
          placeholder="Jane Doe"
        />
      </FormField>

      <FormField label="Title / Label" id="basics-label">
        <Input
          id="basics-label"
          value={resume.basics.label ?? ""}
          onInput={(v) => setResume("basics", "label", v)}
          placeholder="Software Engineer"
        />
      </FormField>

      <div class="grid grid-cols-2 gap-4">
        <FormField label="Email" id="basics-email" error={emailError()}>
          <Input
            id="basics-email"
            type="email"
            value={resume.basics.email ?? ""}
            onInput={(v) => {
              setResume("basics", "email", v);
              if (emailError()) setEmailError(validateEmail(v));
            }}
            onBlur={() => setEmailError(validateEmail(resume.basics.email ?? ""))}
            error={!!emailError()}
            aria-describedby={emailError() ? "basics-email-error" : undefined}
            placeholder="jane@example.com"
          />
        </FormField>

        <FormField label="Phone" id="basics-phone" error={phoneError()}>
          <Input
            id="basics-phone"
            type="tel"
            value={resume.basics.phone ?? ""}
            onInput={(v) => {
              setResume("basics", "phone", v);
              if (phoneError()) setPhoneError(validateOptionalPhone(v));
            }}
            onBlur={() => setPhoneError(validateOptionalPhone(resume.basics.phone ?? ""))}
            error={!!phoneError()}
            aria-describedby={phoneError() ? "basics-phone-error" : undefined}
            placeholder="+1 555-123-4567"
          />
        </FormField>
      </div>

      <FormField label="Website / URL" id="basics-url" error={urlError()}>
        <Input
          id="basics-url"
          type="url"
          value={resume.basics.url ?? ""}
          onInput={(v) => {
            setResume("basics", "url", v);
            if (urlError()) setUrlError(validateUrl(v));
          }}
          onBlur={() => setUrlError(validateUrl(resume.basics.url ?? ""))}
          error={!!urlError()}
          aria-describedby={urlError() ? "basics-url-error" : undefined}
          placeholder="https://janedoe.dev"
        />
      </FormField>

      <div class="grid grid-cols-2 gap-4">
        <FormField label="City" id="basics-city">
          <Input
            id="basics-city"
            value={resume.basics.location?.city ?? ""}
            onInput={(v) => setResume("basics", "location", "city", v)}
            placeholder="San Francisco"
          />
        </FormField>

        <FormField label="Region / State" id="basics-region">
          <Input
            id="basics-region"
            value={resume.basics.location?.region ?? ""}
            onInput={(v) => setResume("basics", "location", "region", v)}
            placeholder="CA"
          />
        </FormField>
      </div>

      <FormField label="Country Code" id="basics-country">
        <Input
          id="basics-country"
          value={resume.basics.location?.countryCode ?? ""}
          onInput={(v) => setResume("basics", "location", "countryCode", v)}
          placeholder="US"
        />
      </FormField>
    </div>
  );
};

export default BasicsForm;
