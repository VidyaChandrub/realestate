const PROVIDERS: Array<{ match: (host: string) => boolean; name: string }> = [
    { match: (host) => host.includes('linkedin.com'), name: 'LinkedIn' },
    { match: (host) => host.includes('indeed.'), name: 'Indeed' },
    { match: (host) => host.includes('naukri.com'), name: 'Naukri' },
    { match: (host) => host.includes('glassdoor.'), name: 'Glassdoor' },
    { match: (host) => host.includes('careers.google.com'), name: 'Google' },
];

export function resolveSourceName(
    url?: string | null,
    organizationName?: string | null,
): string {
    const fallback = organizationName ?? '';

    if (!url) {
        return fallback;
    }

    let hostname: string;
    try {
        hostname = new URL(url).hostname.toLowerCase();
    } catch {
        return fallback;
    }

    return PROVIDERS.find((provider) => provider.match(hostname))?.name ?? fallback;
}
