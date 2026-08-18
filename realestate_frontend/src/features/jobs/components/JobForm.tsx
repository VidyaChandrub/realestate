import { useMemo, type Dispatch, type SetStateAction } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelectDropdown } from '@/components/MultiSelectDropdown';
import { SearchableSelect } from '@/components/SearchableSelect';
import { RichTextEditor } from '@/components/RichTextEditor';
import { ArrowLeft, Loader2 } from 'lucide-react';
import type { Employer } from '@/types';

export interface JobFormProps {
  isEdit: boolean;
  employerId?: string;
  selectedOrganizationId: string | null;
  selectedOrganization: Employer | { id: string; name: string } | null;
  organizations: Employer[];
  organizationLoading: boolean;
  onOrganizationChange: (organizationId: string | null) => void;
  jobType: 'EXTERNAL' | 'INTERNAL';
  setJobType: (value: 'EXTERNAL' | 'INTERNAL') => void;
  form: {
    title: string;
    summary: string;
    description: string;
    city: string;
    experienceLevel: string;
    educationLevel: string;
    salaryMin: string;
    salaryMax: string;
    employmentType: string;
    backgroundImageUrl: string;
    externalUrl: string;
  };
  setForm: Dispatch<SetStateAction<JobFormProps['form']>>;
  selectedSkillIds: string[];
  setSelectedSkillIds: (values: string[]) => void;
  selectedEducationIds: string[];
  setSelectedEducationIds: (values: string[]) => void;
  selectedSkillLabels: Record<string, string>;
  setSelectedSkillLabels: Dispatch<SetStateAction<Record<string, string>>>;
  selectedEducationLabels: Record<string, string>;
  setSelectedEducationLabels: Dispatch<SetStateAction<Record<string, string>>>;
  selectedLabels: {
    city: string;
    experienceLevel: string;
    educationLevel: string;
    employmentType: string;
  };
  setSelectedLabels: Dispatch<SetStateAction<{
    city: string;
    experienceLevel: string;
    educationLevel: string;
    employmentType: string;
  }>>;
  searchableCityOptions: { id: string; value: string }[];
  searchableExperienceLevelOptions: { id: string; value: string }[];
  searchableEducationLevelOptions: { id: string; value: string }[];
  searchableEmploymentTypeOptions: { id: string; value: string }[];
  displaySkillOptions: { id: string; value: string }[];
  displaySpecializationOptions: { id: string; value: string }[];
  onSearchCity: (value: string) => void;
  onSearchExperience: (value: string) => void;
  onSearchEducation: (value: string) => void;
  onSearchEmployment: (value: string) => void;
  onSearchSkill: (value: string) => void;
  onSearchSpecialization: (value: string) => void;
  selectedSpecializationIds: string[];
  setSelectedSpecializationIds: (values: string[]) => void;
  selectedSpecializationLabels: Record<string, string>;
  setSelectedSpecializationLabels: Dispatch<SetStateAction<Record<string, string>>>;
  isLoadingCities: boolean;
  isLoadingExperience: boolean;
  isLoadingEducation: boolean;
  isLoadingEmployment: boolean;
  isLoadingSkills: boolean;
  imagePreview: string | null;
  setImagePreview: (value: string | null) => void;
  isAnyMutationPending: boolean;
  activeAction: 'draft' | 'publish' | null;
  onSaveDraft: () => void;
  onSavePublish: () => void;
}

export function JobForm({
  isEdit,
  employerId,
  selectedOrganizationId,
  selectedOrganization,
  organizations,
  organizationLoading,
  onOrganizationChange,
  jobType,
  setJobType,
  form,
  setForm,
  selectedSkillIds,
  setSelectedSkillIds,
  selectedEducationIds,
  setSelectedEducationIds,
  selectedSkillLabels,
  setSelectedSkillLabels,
  selectedEducationLabels,
  setSelectedEducationLabels,
  selectedLabels,
  setSelectedLabels,
  selectedSpecializationIds,
  setSelectedSpecializationIds,
  selectedSpecializationLabels,
  setSelectedSpecializationLabels,
  searchableCityOptions,
  searchableExperienceLevelOptions,
  searchableEducationLevelOptions,
  searchableEmploymentTypeOptions,
  displaySkillOptions,
  displaySpecializationOptions,
  onSearchCity,
  onSearchExperience,
  onSearchEducation,
  onSearchEmployment,
  onSearchSkill,
  onSearchSpecialization,
  isLoadingCities,
  isLoadingExperience,
  isLoadingEducation,
  isLoadingEmployment,
  isLoadingSkills,
  imagePreview,
  setImagePreview,
  isAnyMutationPending,
  activeAction,
  onSaveDraft,
  onSavePublish,
}: JobFormProps) {
  const navigate = useNavigate();

  const organizationLabel = selectedOrganization?.name ?? 'Not available';
  const showOrganizationSelect = !isEdit && !employerId;
  const pageTitle = isEdit ? 'Edit Job' : 'Post New Job';

  const organizationItems = useMemo(
    () => organizations.map((organization) => ({
      id: organization.id,
      value: organization.name,
    })),
    [organizations]
  );

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex gap-4 lg:flex-row items-start justify-start">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            className="w-fit flex items-center gap-2 px-0 text-sm text-muted-foreground hover:text-foreground"
            onClick={() =>
              navigate(
                employerId ? `/employers/${employerId}` : '/jobs'
              )
            }
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-foreground">{pageTitle}</h1>
          <p className="text-sm text-muted-foreground">Fill in the details for your job listing</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <CardTitle className="text-base">Job Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Organization</Label>
            {showOrganizationSelect ? (
              <Select
                value={selectedOrganizationId ?? ''}
                onValueChange={(value) => onOrganizationChange(value || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizationItems.map((organization) => (
                    <SelectItem key={organization.id} value={organization.id}>
                      {organization.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm">
                {organizationLabel}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Title *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
                  placeholder="Senior Software Engineer"
                />
              </div>

              <div className="space-y-2">
                <Label>Summary</Label>
                <Input
                  value={form.summary}
                  onChange={(e) => setForm((current) => ({ ...current, summary: e.target.value }))}
                  placeholder="Short one-liner about the role"
                />
              </div>

              <div className="space-y-2">
                <Label>Description *</Label>
                <RichTextEditor
                  value={form.description}
                  onChange={(description) => setForm((current) => ({ ...current, description }))}
                  placeholder="Detailed job description..."
                />
              </div>

              <div className="space-y-2">
                <Label>Job Type *</Label>
                <Select value={jobType} onValueChange={(value) => setJobType(value as 'EXTERNAL' | 'INTERNAL')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INTERNAL">Internal</SelectItem>
                    <SelectItem value="EXTERNAL">External</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {jobType === 'EXTERNAL' && (
                <div className="space-y-2">
                  <Label>External Job URL</Label>
                  <Input
                    type="url"
                    value={form.externalUrl}
                    onChange={(e) => setForm((current) => ({ ...current, externalUrl: e.target.value }))}
                    placeholder="https://example.com/careers/job-title"
                  />
                  <p className="text-xs text-muted-foreground">Link candidates will be directed to when applying.</p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Work Location *</Label>
                <SearchableSelect
                  value={form.city}
                  onChange={(value) => {
                    const selectedOption = searchableCityOptions.find((option) => option.id === value);
                    setSelectedLabels((current) => ({
                      ...current,
                      city: selectedOption?.value || '',
                    }));
                    setForm((current) => ({ ...current, city: value }));
                  }}
                  options={searchableCityOptions}
                  placeholder="Type to search cities."
                  isLoading={isLoadingCities && searchableCityOptions.length === 0}
                  onSearch={onSearchCity}
                />
              </div>

              <div className="space-y-2">
                <Label>Experience Level *</Label>
                <SearchableSelect
                  value={form.experienceLevel}
                  onChange={(value) => {
                    const selectedOption = searchableExperienceLevelOptions.find((option) => option.id === value);
                    setSelectedLabels((current) => ({
                      ...current,
                      experienceLevel: selectedOption?.value || '',
                    }));
                    setForm((current) => ({ ...current, experienceLevel: value }));
                  }}
                  options={searchableExperienceLevelOptions}
                  placeholder="Type to search experience levels."
                  isLoading={isLoadingExperience && searchableExperienceLevelOptions.length === 0}
                  onSearch={onSearchExperience}
                />
              </div>

              <div className="space-y-2">
                <MultiSelectDropdown
                  label="Qualification *"
                  options={searchableEducationLevelOptions}
                  selected={selectedEducationIds}
                  onChange={(values) => {
                    const nextValues = Array.from(new Set(values));
                    const nextLabels = { ...selectedEducationLabels };
                    nextValues.forEach((value) => {
                      const option = searchableEducationLevelOptions.find((option) => option.id === value);
                      if (option) {
                        nextLabels[value] = option.value;
                      }
                    });
                    setSelectedEducationIds(nextValues);
                    setSelectedEducationLabels(nextLabels);
                    setForm((current) => ({ ...current, educationLevel: nextValues[0] || '' }));
                  }}
                  onOpenChange={(open) => open && onSearchEducation('')}
                  isLoading={isLoadingEducation && searchableEducationLevelOptions.length === 0}
                  placeholder="Type to search qualifications."
                  onSearch={onSearchEducation}
                />
              </div>

              <div className="space-y-2">
                <MultiSelectDropdown
                  label="Specialization"
                  options={displaySpecializationOptions}
                  selected={selectedSpecializationIds}
                  onChange={(values) => {
                    const nextValues = Array.from(new Set(values));
                    const nextLabels = { ...selectedSpecializationLabels };
                    nextValues.forEach((value) => {
                      const option = displaySpecializationOptions.find((option) => option.id === value);
                      if (option) {
                        nextLabels[value] = option.value;
                      }
                    });
                    setSelectedSpecializationIds(nextValues);
                    setSelectedSpecializationLabels(nextLabels);
                  }}
                  disabled={selectedEducationIds.length === 0}
                  isLoading={false}
                  placeholder={selectedEducationIds.length > 0 ? 'Type to search specializations.' : 'Select qualification first'}
                  onSearch={onSearchSpecialization}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Salary Min (₹)</Label>
                  <Input
                    type="number"
                    value={form.salaryMin}
                    onChange={(e) => setForm((current) => ({ ...current, salaryMin: e.target.value }))}
                    placeholder="1200000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Salary Max (₹)</Label>
                  <Input
                    type="number"
                    value={form.salaryMax}
                    onChange={(e) => setForm((current) => ({ ...current, salaryMax: e.target.value }))}
                    placeholder="1800000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Employment Type</Label>
                <SearchableSelect
                  value={form.employmentType}
                  onChange={(value) => setForm((current) => ({ ...current, employmentType: value }))}
                  options={searchableEmploymentTypeOptions}
                  placeholder="Select employment type"
                  isLoading={isLoadingEmployment && searchableEmploymentTypeOptions.length === 0}
                  onSearch={onSearchEmployment}
                />
              </div>

              <MultiSelectDropdown
                label="Skills *"
                options={displaySkillOptions}
                selected={selectedSkillIds}
                onChange={(values) => {
                  const nextValues = Array.from(new Set(values));
                  const nextLabels = { ...selectedSkillLabels };
                  nextValues.forEach((value) => {
                    const option = displaySkillOptions.find((option) => option.id === value);
                    if (option) {
                      nextLabels[value] = option.value;
                    }
                  });
                  setSelectedSkillIds(nextValues);
                  setSelectedSkillLabels(nextLabels);
                }}
                onOpenChange={(open) => open && onSearchSkill('')}
                isLoading={isLoadingSkills}
                placeholder="Type to search skills."
                onSearch={onSearchSkill}
              />

              <div className="space-y-2">
                <Label>Background Image URL</Label>
                <Input
                  value={form.backgroundImageUrl}
                  onChange={(e) => {
                    setForm((current) => ({ ...current, backgroundImageUrl: e.target.value }));
                    setImagePreview(e.target.value || null);
                  }}
                  placeholder="https://images.unsplash.com/..."
                />
                {imagePreview && (
                  <div className="flex items-center gap-3 mt-2">
                    <img src={imagePreview} alt="preview" className="w-32 h-20 object-cover rounded border" />
                    <Button variant="ghost" size="sm" onClick={() => {
                      setImagePreview(null);
                      setForm((current) => ({ ...current, backgroundImageUrl: '' }));
                    }}>
                      Remove
                    </Button>
                  </div>
                )}
              </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end pb-8">
          <Button
            variant="outline"
            onClick={() => navigate(employerId ? `/employers/${employerId}` : '/jobs')}
            disabled={isAnyMutationPending}
          >
            Cancel
          </Button>
          <Button variant="secondary" onClick={onSaveDraft} disabled={isAnyMutationPending}>
            {activeAction === 'draft' && isAnyMutationPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Save as Draft
          </Button>
          <Button onClick={onSavePublish} disabled={isAnyMutationPending}>
            {activeAction === 'publish' && isAnyMutationPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Save & Publish
          </Button>
      </div>
    </div>
  );
}
