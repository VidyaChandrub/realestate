import { IsOptional, IsUUID } from 'class-validator';

export class ListOrgActivityQueryDto {
  // Scopes the feed to one entity (e.g. a single LandingPage) instead of
  // the whole org — omit for the org-wide feed.
  @IsOptional()
  @IsUUID()
  entityId?: string;
}
