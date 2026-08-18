import { MultiSelectDropdown } from "@/components/MultiSelectDropdown";
import { MultiSelect } from "@/components/ui/multi-select";
import type { UseBroadcastTargeting } from "../hooks/useBroadcastTargeting";

interface BroadcastTargetingFieldsProps {
  targeting: UseBroadcastTargeting;
  disabled?: boolean;
}

export function BroadcastTargetingFields({ targeting, disabled = false }: BroadcastTargetingFieldsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <MultiSelectDropdown
        label="Country"
        placeholder="Select countries..."
        options={targeting.country.options}
        selected={targeting.country.selected}
        onChange={targeting.country.onChange}
        disabled={disabled}
        isLoading={targeting.country.isLoading}
        onSearch={targeting.country.onSearch}
      />
      <MultiSelectDropdown
        label="State"
        placeholder="Select states..."
        options={targeting.state.options}
        selected={targeting.state.selected}
        onChange={targeting.state.onChange}
        disabled={disabled || targeting.state.disabled}
        isLoading={targeting.state.isLoading}
        onSearch={targeting.state.onSearch}
      />
      <MultiSelectDropdown
        label="City"
        placeholder="Select cities..."
        options={targeting.city.options}
        selected={targeting.city.selected}
        onChange={targeting.city.onChange}
        disabled={disabled || targeting.city.disabled}
        isLoading={targeting.city.isLoading}
        onSearch={targeting.city.onSearch}
      />
      <MultiSelectDropdown
        label="Skills"
        placeholder="Type to search skills..."
        options={targeting.skills.options}
        selected={targeting.skills.selected}
        onChange={targeting.skills.onChange}
        disabled={disabled}
        isLoading={targeting.skills.isLoading}
        onSearch={targeting.skills.onSearch}
      />
      <MultiSelectDropdown
        label="Experience Level"
        placeholder="Type to search experience levels..."
        options={targeting.experience.options}
        selected={targeting.experience.selected}
        onChange={targeting.experience.onChange}
        disabled={disabled}
        isLoading={targeting.experience.isLoading}
        onSearch={targeting.experience.onSearch}
      />
      <MultiSelectDropdown
        label="Education"
        placeholder="Type to search qualifications..."
        options={targeting.education.options}
        selected={targeting.education.selected}
        onChange={targeting.education.onChange}
        disabled={disabled}
        isLoading={targeting.education.isLoading}
        onSearch={targeting.education.onSearch}
      />
      <MultiSelectDropdown
        label="Specialization"
        placeholder={targeting.education.selected.length ? "Type to search specializations..." : "Select education first"}
        options={targeting.specialization.options}
        selected={targeting.specialization.selected}
        onChange={targeting.specialization.onChange}
        disabled={disabled || targeting.specialization.disabled}
        isLoading={targeting.specialization.isLoading}
        onSearch={targeting.specialization.onSearch}
      />
      <MultiSelect
        label="Year of Passing"
        placeholder="Select years"
        items={targeting.yearOfPassing.items}
        selectedIds={targeting.yearOfPassing.selected}
        onChange={targeting.yearOfPassing.onChange}
        disabled={disabled}
      />
    </div>
  );
}
