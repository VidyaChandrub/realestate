import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { jobsApi } from '@/api/services';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { JobDescriptionHtml } from '@/components/JobDescriptionHtml';
import { Loader2, ArrowLeft, ExternalLink } from 'lucide-react';

interface NamedValue {
  id?: string;
  value?: string;
  name?: string;
  label?: string;
  title?: string;
}

function displayName(value: unknown, fallback = '-') {
  if (!value) return fallback;
  if (typeof value === 'string') return value || fallback;
  if (typeof value === 'object') {
    const namedValue = value as NamedValue;
    return namedValue.value || namedValue.name || namedValue.label || namedValue.title || namedValue.id || fallback;
  }
  return fallback;
}

function readTagLabel(value: unknown) {
  if (!value || typeof value !== 'object') return '';
  const tag = value as Record<string, unknown>;
  const label = tag.tagName || tag.skillName || tag.value || tag.name || tag.label;
  if (typeof label === 'string') return label;
  return displayName(tag.masterData, '');
}

function extractSkillTagLabels(value: unknown) {
  if (!Array.isArray(value)) return [];

  return Array.from(new Set(value.flatMap((tagValue) => {
    const tag = tagValue as Record<string, unknown>;
    if ((tag.type || tag.tagType || 'SKILL') !== 'SKILL') return [];

    if (Array.isArray(tag.labels)) {
      return tag.labels.filter((label): label is string => typeof label === 'string' && Boolean(label));
    }

    if (Array.isArray(tag.values)) {
      return tag.values.filter((id): id is string => typeof id === 'string' && Boolean(id));
    }

    const label = readTagLabel(tag);
    if (label) return [label];

    const id = tag.tagValue || tag.masterDataId || tag.id;
    return typeof id === 'string' && id ? [id] : [];
  })));
}

export default function JobViewPage() {
  const { id, employerId } = useParams<{ id: string; employerId?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: jobData, isLoading } = useQuery({
    queryKey: ['job', id],
    queryFn: () => (id ? jobsApi.getOne(id) : Promise.reject(new Error('Missing job id'))),
    enabled: Boolean(id),
  });

  const job = jobData?.data || jobData;
  const cachedSkills = (queryClient.getQueryData(['master-data', 'by-type', 'SKILL']) || []) as NamedValue[];
  const cachedSkillLabels = new Map(cachedSkills.map((skill) => [skill.id, displayName(skill, '')]));
  
  // Get skills from either job.skills (direct array) or job.tags (tag objects)
  let skillTags: string[] = [];
  if (Array.isArray(job?.skills)) {
    // Skills are returned as array of strings
    skillTags = job.skills.filter((skill): skill is string => typeof skill === 'string' && Boolean(skill));
  } else {
    // Fall back to extracting from tags
    skillTags = extractSkillTagLabels(job?.tags).map((tag) => cachedSkillLabels.get(tag) || tag);
  }
  const getJobFieldName = (...values: unknown[]) => {
    for (const value of values) {
      const name = displayName(value, '');
      if (name) return name;
    }
    return '-';
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              navigate(
                employerId ? `/employers/${employerId}` : '/jobs'
              )
            }
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">View Job</h1>
            <p className="text-sm text-muted-foreground">Review details for this job posting.</p>
          </div>
        </div>
        <Button
          onClick={() =>
            navigate(
              employerId
                ? `/employers/${employerId}/jobs/${id}/edit`
                : `/jobs/${id}/edit`
            )
          }
          disabled={!id}
        >
          Edit
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Job Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Title</Label>
            <p className="mt-1 text-sm text-foreground">{job?.title || '-'}</p>
          </div>

          <div>
            <Label>Summary</Label>
            <p className="mt-1 text-sm text-foreground">{job?.summary || '-'}</p>
          </div>

          <div>
            <Label>Description</Label>
            <JobDescriptionHtml description={job?.description} emptyText="-" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Job Type</Label>
              <p className="mt-1 text-sm font-medium text-foreground">
                {job?.jobType ? (
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${job.jobType === 'EXTERNAL' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                    {job.jobType}
                  </span>
                ) : '-'}
              </p>
            </div>
            <div />
          </div>

          {job?.jobType === 'EXTERNAL' && (
            <div>
              <Label>External URL</Label>
              {job?.externalUrl ? (
                <button
                  onClick={async () => {
                    const url = job.externalUrl!;
                    if (id) {
                      try {
                        await jobsApi.trackExternalClick(id);
                        queryClient.invalidateQueries({ queryKey: ['jobs'] });
                      } catch (err) {
                        console.error('External click tracking failed:', err);
                      }
                    }
                    window.open(url, '_blank', 'noopener,noreferrer');
                  }}
                  className="mt-1 flex items-center gap-1.5 text-sm text-primary underline underline-offset-2 hover:text-primary/80 break-all text-left"
                >
                  {job.externalUrl}
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                </button>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">No external URL set</p>
              )}
            </div>
          )}

          <div>
            <Label>City</Label>
            <p className="mt-1 text-sm text-foreground">
              {getJobFieldName(job?.city, job?.cityName, job?.location, job?.locationName, job?.cityId, job?.locationId)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Experience Level</Label>
              <p className="mt-1 text-sm text-foreground">
                {getJobFieldName(job?.experienceLevel, job?.experienceLevelName, job?.experienceLevelId)}
              </p>
            </div>
            <div>
              <Label>Employment Type</Label>
              <p className="mt-1 text-sm text-foreground">
                {getJobFieldName(job?.employmentType, job?.employmentTypeName, job?.employmentTypeId)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Qualification</Label>

              {Array.isArray(job?.educationQualifications) &&
              job.educationQualifications.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {job.educationQualifications.map(
                    (q: string, index: number) => (
                      <Badge key={index} variant="secondary">
                        {q}
                      </Badge>
                    ),
                  )}
                </div>
              ) : (
                <p className="mt-1 text-sm text-foreground">
                  {getJobFieldName(
                    job?.educationLevel,
                    job?.educationLevelName,
                    job?.educationLevelId,
                  )}
                </p>
              )}
            </div>
            <div />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Specialization</Label>

              {Array.isArray(job?.specializations) &&
              job.specializations.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {job.specializations.map((specialization, index) => (
                    <Badge key={index} variant="secondary">
                      {displayName(specialization)}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-sm text-foreground">-</p>
              )}
            </div>
            <div />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Salary Min</Label>
              <p className="mt-1 text-sm text-foreground">
                {job?.salaryMin ? `Rs. ${(job.salaryMin / 100000).toFixed(1)}L` : '-'}
              </p>
            </div>
            <div>
              <Label>Salary Max</Label>
              <p className="mt-1 text-sm text-foreground">
                {job?.salaryMax ? `Rs. ${(job.salaryMax / 100000).toFixed(1)}L` : '-'}
              </p>
            </div>
          </div>

          {job?.backgroundImage && (
            <div>
              <Label>Background image</Label>
              <img
                src={job.backgroundImage}
                alt="Job background"
                className="mt-2 w-full max-h-52 object-cover rounded"
              />
            </div>
          )}

          <div>
            <Label>Skills</Label>
            {skillTags.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {skillTags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-sm text-foreground">-</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
