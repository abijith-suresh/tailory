import type { Component } from "solid-js";
import { resume, setResume } from "@/store/resume";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";

const BasicsForm: Component = () => (
  <div class="space-y-4">
    <FormField label="Full Name" id="basics-name">
      <Input
        id="basics-name"
        value={resume.basics.name}
        onInput={(v) => setResume("basics", "name", v)}
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
      <FormField label="Email" id="basics-email">
        <Input
          id="basics-email"
          type="email"
          value={resume.basics.email ?? ""}
          onInput={(v) => setResume("basics", "email", v)}
          placeholder="jane@example.com"
        />
      </FormField>

      <FormField label="Phone" id="basics-phone">
        <Input
          id="basics-phone"
          type="tel"
          value={resume.basics.phone ?? ""}
          onInput={(v) => setResume("basics", "phone", v)}
          placeholder="+1 555-123-4567"
        />
      </FormField>
    </div>

    <FormField label="Website / URL" id="basics-url">
      <Input
        id="basics-url"
        type="url"
        value={resume.basics.url ?? ""}
        onInput={(v) => setResume("basics", "url", v)}
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

export default BasicsForm;
