/**
 * Falls back to the full `description` when `descriptionPreview` hasn't been
 * populated yet (e.g. jobs created before this field existed, or manually
 * created jobs that never set one), so callers always have a value to show
 * on the Job Card without a backfill script. For imported/external jobs,
 * `descriptionPreview` is normally populated by the scraper import pipeline
 * (a separate service) rather than set here.
 */
export function resolveDescriptionPreview(job: {
    description: string | null;
    descriptionPreview: string | null;
}): string | null {
    return job.descriptionPreview ?? job.description;
}
