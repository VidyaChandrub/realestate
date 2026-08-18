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
import type { AdvertisementClick } from "@/types";
import { useMasterData } from "@/hooks/useMasterData";
import { getHighestQualifications, getYearsOfPassing } from "@/utils/education";

function truncateEducation(full: string): { display: string; tooltip: string } {
  if (!full || full === "N/A") return { display: full, tooltip: full };
  const idx = full.indexOf(", ");
  if (idx === -1) return { display: full, tooltip: full };
  return { display: `${full.slice(0, idx)}...`, tooltip: full };
}

interface AdvertisementClicksTableProps {
  rows: AdvertisementClick[];
  loading?: boolean;
  search: string;
}

export function AdvertisementClicksTable({
  rows,
  loading,
  search,
}: AdvertisementClicksTableProps) {
  // Fetch all relevant master data for label resolution
  const { data: cities } = useMasterData("LOCATION_CITY");
  const { data: skills } = useMasterData("SKILL");
  const { data: expLevels } = useMasterData("EXPERIENCE_LEVEL");
  const { data: eduLevels } = useMasterData("EDUCATION_LEVEL");

  // Create lookup maps for performance
  const cityMap = useMemo(() => new Map(cities?.map((c: any) => [c.id, c.value])), [cities]);
  const skillMap = useMemo(() => new Map(skills?.map((s: any) => [s.id, s.value])), [skills]);
  const expMap = useMemo(() => new Map(expLevels?.map((e: any) => [e.id, e.value])), [expLevels]);
  const eduMap = useMemo(() => new Map<string, string>(eduLevels?.map((e: any) => [e.id, e.value]) ?? []), [eduLevels]);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.userName.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        (r.mobileNumber && r.mobileNumber.includes(q))
    );
  }, [rows, search]);

  return (
    <div className="overflow-hidden rounded-lg border border-border min-h-[600px]">
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
            <TableHead className="text-[11px] font-semibold uppercase">Date & Time of Click</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 11 }).map((_, j) => (
                  <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                ))}
              </TableRow>
            ))
          ) : filteredRows.length > 0 ? (
            filteredRows.map((row, index) => (
              <TableRow key={row.id}>
                <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                <TableCell className="font-medium text-foreground">{row.userName}</TableCell>
                <TableCell className="text-muted-foreground">{row.email}</TableCell>
                <TableCell className="text-muted-foreground">{row.mobileNumber || "N/A"}</TableCell>
                <TableCell className="text-muted-foreground">
                  {row.locationId ? cityMap.get(row.locationId) || "Unknown" : "N/A"}
                </TableCell>
                <TableCell className="max-w-[200px]">
                  <div className="truncate text-muted-foreground" title={row.skillIds.map(id => skillMap.get(id)).join(", ")}>
                    {row.skillIds.map(id => skillMap.get(id)).filter(Boolean).join(", ") || "N/A"}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {row.experienceLevelId ? expMap.get(row.experienceLevelId) || "N/A" : "N/A"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {(() => { const edu = truncateEducation(getHighestQualifications(row.user, eduMap, "table")); return <span title={edu.tooltip}>{edu.display}</span>; })()}
                </TableCell>
                <TableCell className="max-w-[200px] text-muted-foreground">
                  <div className="truncate" title={(row.user?.education ?? []).map((e: any) => e.specialization).filter(Boolean).join(", ")}>
                    {(row.user?.education ?? []).map((e: any) => e.specialization).filter(Boolean).join(", ") || "N/A"}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {getYearsOfPassing(row.user, "table")}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  <div className="text-xs">
                    <p className="font-medium">{format(new Date(row.clickedAt), "dd/MM/yyyy")}</p>
                    <p>{format(new Date(row.clickedAt), "HH:mm")}</p>
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={11} className="h-24 text-center text-muted-foreground">
                No click records found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
