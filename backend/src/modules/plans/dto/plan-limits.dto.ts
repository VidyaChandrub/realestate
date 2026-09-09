import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Numeric plan quotas. `null` (or omitted) means unlimited — this matches the
 * historic effective behaviour where "All" / "Unlimited" / "—" / unparseable
 * all resolved to Infinity. `@IsOptional()` deliberately permits `null` so the
 * admin can explicitly choose "Unlimited".
 */
export class PlanLimitsDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  projects?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  users?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  templates?: number | null;
}
