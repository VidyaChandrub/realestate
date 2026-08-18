import { useMemo } from "react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import type { Application } from "@/types";
import { useMasterData } from "@/hooks/useMasterData";
import { getHighestQualifications, getYearsOfPassing } from "@/utils/education";

function truncateEducation(full: string): { display: string; tooltip: string } {
  if (!full || full === "N/A") return { display: full, tooltip: full };
  const idx = full.indexOf(", ");
  if (idx === -1) return { display: full, tooltip: full };
  return { display: `${full.slice(0, idx)}...`, tooltip: full };
}

interface JobApplicationsTableProps {
  rows: Application[];
  loading?: boolean;
  search: string;
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function JobApplicationsTable({
  rows,
  loading,
  search,
  page,
  limit,
  total,
  onPageChange,
}: JobApplicationsTableProps) {
  const { data: cities } = useMasterData("LOCATION_CITY");
  const { data: skills } = useMasterData("SKILL");
  const { data: expLevels } = useMasterData("EXPERIENCE_LEVEL");
  const { data: eduLevels } = useMasterData("EDUCATION_LEVEL");

  const cityMap = useMemo(() => new Map(cities?.map((c: any) => [c.id, c.value])), [cities]);
  const skillMap = useMemo(() => new Map(skills?.map((s: any) => [s.id, s.value])), [skills]);
  const expMap = useMemo(() => new Map(expLevels?.map((e: any) => [e.id, e.value])), [expLevels]);
  const eduMap = useMemo(() => new Map<string, string>(eduLevels?.map((e: any) => [e.id, e.value]) ?? []), [eduLevels]);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        (r.user?.fullName?.toLowerCase().includes(q)) ||
        (r.user?.email?.toLowerCase().includes(q)) ||
        (r.user?.mobileNumber && r.user.mobileNumber.includes(q))
    );
  }, [rows, search]);

  const totalPages = Math.ceil(total / limit);
  const startIndex = (page - 1) * limit;

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-border min-h-[600px]">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-muted/50">
              <TableHead className="w-12 text-[11px] font-semibold uppercase">#</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase">User Name</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase">Email ID</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase">Mobile Number</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase">Location</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase">Skills</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase">Experience Level</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase">Education</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase">Specialization</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase">Year of Passing</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase">Status</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase">Applied At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 12 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredRows.length > 0 ? (
              filteredRows.map((row, index) => {
                const skillIds = (row.user?.skills ?? []).map((s) => s.masterDataId).filter(Boolean) as string[];
                const yearOfPassing = getYearsOfPassing(row.user, "table");
                const edu = truncateEducation(getHighestQualifications(row.user, eduMap, "table"));
                return (
                  <TableRow key={row.id}>
                    <TableCell className="text-muted-foreground">{startIndex + index + 1}</TableCell>
                    <TableCell className="font-medium text-foreground">
                      {row.user?.fullName || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{row.user?.email || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{row.user?.mobileNumber || "N/A"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.user?.currentCityId ? cityMap.get(row.user.currentCityId) || "Unknown" : "N/A"}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <div className="truncate text-muted-foreground" title={skillIds.map((id) => skillMap.get(id)).join(", ")}>
                        {skillIds.map((id) => skillMap.get(id)).filter(Boolean).join(", ") || "N/A"}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.user?.experienceLevelId ? expMap.get(row.user.experienceLevelId) || "N/A" : "N/A"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <span title={edu.tooltip}>{edu.display}</span>
                    </TableCell>
                    <TableCell className="max-w-[200px] text-muted-foreground">
                      <div className="truncate" title={(row.user?.education ?? []).map((e: any) => e.specialization).filter(Boolean).join(", ")}>
                        {(row.user?.education ?? []).map((e: any) => e.specialization).filter(Boolean).join(", ") || "N/A"}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {yearOfPassing}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={row.status.toLowerCase()} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <div className="text-xs">
                        <p className="font-medium">{format(new Date(row.appliedAt), "dd/MM/yyyy")}</p>
                        <p>{format(new Date(row.appliedAt), "HH:mm")}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={12} className="h-24 text-center text-muted-foreground">
                  No applicants found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {startIndex + 1}–{Math.min(startIndex + limit, total)} of {total}
          </span>
          <div className="flex gap-2">
            <button
              className="rounded border px-3 py-1 hover:bg-muted disabled:opacity-40"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
            >
              Previous
            </button>
            <button
              className="rounded border px-3 py-1 hover:bg-muted disabled:opacity-40"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
