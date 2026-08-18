/**
 * Resolves the logo shown on a Job at response time, without ever writing
 * back to the Job record: a job's own `companyLogo` (e.g. an imported
 * LinkedIn logo) always wins, falling back to the owning organization's
 * `logoUrl` so internal/admin-created jobs pick up branding added to the
 * organization after the job was created. Returns null (default Building
 * icon) when neither is set.
 */
export function resolveCompanyLogo(
    companyLogo: string | null | undefined,
    organizationLogoUrl: string | null | undefined,
): string | null {
    if (companyLogo && companyLogo.trim().length > 0) {
        return companyLogo;
    }

    return organizationLogoUrl && organizationLogoUrl.trim().length > 0
        ? organizationLogoUrl
        : null;
}
