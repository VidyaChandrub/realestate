import { Injectable } from '@nestjs/common';
import { FeedJobCandidate, FeedUserProfile } from '../interfaces/feed-candidate.interface';

// Common degree-abbreviation aliases, keyed on the normalized (lowercased,
// dot-stripped) first token of a qualification string. Lets "B.Sc" match
// "B.S. in Biological Sciences" the same way it already matches "B.Sc.",
// without treating unrelated abbreviations as equivalent.
const DEGREE_ALIASES: Record<string, string> = {
  bsc: 'bs',
  btech: 'be',
  msc: 'ms',
  mtech: 'me',
};

// Cosine similarity is only computed for candidates already above the 0.25 floor
// used as the SQL cutoff in JobsService.getRelevantJobs. Rescaling against a
// floor/ceiling (rather than raw similarity * 100) spreads scores out instead of
// compressing every candidate into a narrow band. Calibrated against the real
// skills-only embedding distribution across every embedded profile's top 20
// closest jobs (i.e. what actually shows up on a real feed page): p90=0.674,
// p95=0.693, p99=0.779 (excluding one duplicate-text 1.0 outlier). The previous
// ceiling (0.65) sat below p90, so the top ~10% of real results were clamping
// together; 0.75 sits just under p99, letting only genuinely exceptional matches
// saturate while the common "good match" range gets real spread.
const SEMANTIC_SIMILARITY_FLOOR = 0.25;
const SEMANTIC_SIMILARITY_CEILING = 0.75;

// Location and experience eligibility are enforced as hard filters upstream in
// JobsService.getRelevantJobs; skill fit is folded into the embedding itself
// (job/profile embeddings are built from skills alone — see buildEmbeddingText /
// buildProfileEmbeddingText). Qualification is deliberately NOT folded into the
// embedding: doing so let a shared degree title (e.g. "MCA"/"Computer Science")
// pull unrelated jobs up for a candidate whose actual tagged skills didn't
// overlap at all, since embedding similarity can't distinguish "matched on real
// skill overlap" from "matched only on a shared qualification". Qualification's
// exact/parent-ID/alias-aware text matching also doesn't translate cleanly into
// a SQL filter, so it stays a separate, low-weight scored component here instead.
// Category, employment type, and work mode preferences are not currently
// factored in anywhere.
@Injectable()
export class JobMatcher {
  score(job: FeedJobCandidate, profile: FeedUserProfile): number {
    const semantic = this.semanticScore(job);
    const qualification = this.qualificationScore(job, profile);

    const weighted = (semantic * 0.90) + (qualification * 0.10);

    return Number(weighted.toFixed(2));
  }

  // Embedding-similarity component. `similarityScore` is a raw cosine similarity
  // (0-1, already floored at 0.25 upstream by the candidate-selection query).
  // Rescale against the observed floor/ceiling so it spreads across 0-100
  // instead of every real candidate clustering in a ~25-70 band.
  private semanticScore(job: FeedJobCandidate): number {
    const similarity = job.similarityScore;
    if (similarity == null) {
      return 0;
    }
    const range = SEMANTIC_SIMILARITY_CEILING - SEMANTIC_SIMILARITY_FLOOR;
    const normalized = (similarity - SEMANTIC_SIMILARITY_FLOOR) / range;
    return Math.round(Math.min(1, Math.max(0, normalized)) * 100);
  }

  private qualificationScore(job: FeedJobCandidate, profile: FeedUserProfile): number {
    // No requirements on job — no penalty
    if (!job.educationLevelIds || job.educationLevelIds.length === 0) {
      return 100;
    }
    // User hasn't set a qualification — don't penalise an incomplete profile
    if (!profile.highestQualificationId) {
      return 100;
    }
    const id = profile.highestQualificationId;
    // Direct ID match
    if (job.educationLevelIds.includes(id)) {
      return 100;
    }
    // Parent ID match: user holds a general degree whose ID is the parentId
    // of a specific job requirement (works after scraper sets parentId)
    if (job.educationLevelParentIds?.includes(id)) {
      return 100;
    }
    // Text-based fallback: handles cases where the user's qualification and the
    // scraped job's qualification share the same degree name but differ in ID
    // (e.g. user profile has "B.E." = d78baa8f, job has "B.E./B.Tech in CSE")
    if (profile.highestQualificationValue && job.educationLevelValues?.length) {
      if (this.qualificationTextMatch(profile.highestQualificationValue, job.educationLevelValues)) {
        return 100;
      }
    }
    return 0;
  }

  // Normalize by stripping dots and collapsing whitespace, canonicalize common
  // degree-abbreviation variants (B.Sc <-> B.S., B.Tech <-> B.E.) via
  // DEGREE_ALIASES, then check whether one value is a prefix of the other at a
  // word boundary (/, space, end). "B.Sc" now matches "B.S. in Biological
  // Sciences" the same way "B.E." matches "B.E./B.Tech in CSE", but still NOT
  // "B.Ed." or "MBBS".
  //
  // The first token itself may be a "/"-joined list of alternatives (e.g. "BA/BS
  // Degree" means "BA Degree" OR "BS Degree", "MS/PhD/PharmD" means any of the
  // three) — each side of the "/" is expanded into its own candidate and
  // aliased independently, so e.g. "B.Sc" (-> "bs") matches "BA/BS Degree" via
  // its "bs degree" alternative, not just the literal glued token "ba/bs".
  private qualificationTextMatch(userValue: string, jobValues: string[]): boolean {
    const canonicalizeAll = (s: string): string[] => {
      const norm = s.toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim();
      const spaceIdx = norm.indexOf(' ');
      const firstToken = spaceIdx === -1 ? norm : norm.slice(0, spaceIdx);
      const rest = spaceIdx === -1 ? '' : norm.slice(spaceIdx);
      return firstToken
        .split('/')
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => (DEGREE_ALIASES[part] ?? part) + rest);
    };
    const userNorms = canonicalizeAll(userValue);
    if (userNorms.length === 0) return false;

    const isBoundary = (ch: string | undefined) =>
      ch === undefined || ch === '/' || ch === ' ' || ch === '-';

    return jobValues.some((jv) => {
      const jobNorms = canonicalizeAll(jv);
      return jobNorms.some((jobNorm) =>
        userNorms.some((userNorm) => {
          if (jobNorm === userNorm) return true;
          // Job is a specialisation of user's degree: "be/btech in cse" starts with "be"
          if (jobNorm.startsWith(userNorm) && isBoundary(jobNorm[userNorm.length])) return true;
          // User is a specialisation of job's degree (job is less specific than user)
          if (userNorm.startsWith(jobNorm) && isBoundary(userNorm[jobNorm.length])) return true;
          return false;
        }),
      );
    });
  }
}
