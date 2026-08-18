import { useQuery } from '@tanstack/react-query';
import { StatsCard } from '@/components/StatsCard';
import { Users, Briefcase, Calendar, Megaphone, Building2, FileText } from 'lucide-react';
import { dashboardApi } from '@/api/services';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store/authStore';

const COLORS = [
  'hsl(217, 91%, 60%)',
  'hsl(142, 71%, 45%)',
  'hsl(38, 92%, 50%)',
  'hsl(280, 67%, 55%)',
];

export default function DashboardPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const { data: overview, isLoading } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: dashboardApi.getOverview,
    enabled: isAuthenticated && !authLoading
  });

  const jobPieData = overview ? [
    { name: 'Active', value: overview.jobs.active },
    { name: 'Draft', value: overview.jobs.draft },
    { name: 'Closed', value: overview.jobs.closed },
  ] : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Welcome back</h2>
        <p className="text-sm text-muted-foreground">Here's what's happening across RealEstate today.</p>
      </div>

      {/* Stats Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : overview ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatsCard title="Total Users" value={overview.users.total.toString()} change={0} icon={<Users className="h-5 w-5" />} />
          <StatsCard title="Active Properties" value={overview.jobs.active.toString()} change={0} icon={<Briefcase className="h-5 w-5" />} />
          <StatsCard title="Active Events" value={overview.events.active.toString()} change={0} icon={<Calendar className="h-5 w-5" />} />
          <StatsCard title="Campaigns" value={overview.campaigns.total.toString()} change={0} icon={<Megaphone className="h-5 w-5" />} />
          <StatsCard title="Organizations" value={overview.organizations.total.toString()} change={0} icon={<Building2 className="h-5 w-5" />} />
          <StatsCard title="Inquiries" value={overview.applications.total.toString()} change={0} icon={<FileText className="h-5 w-5" />} />
        </div>
      ) : null}

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Org Breakdown */}
        {overview && (
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold text-card-foreground mb-4">Organizations Overview</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-muted/30 p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{overview.organizations.approved}</p>
                <p className="text-xs text-muted-foreground">Approved</p>
              </div>
              <div className="rounded-lg bg-muted/30 p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{overview.organizations.pendingApproval}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
              <div className="rounded-lg bg-muted/30 p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{overview.organizations.suspended}</p>
                <p className="text-xs text-muted-foreground">Suspended</p>
              </div>
              <div className="rounded-lg bg-muted/30 p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{overview.users.newThisMonth}</p>
                <p className="text-xs text-muted-foreground">New Users (Month)</p>
              </div>
            </div>
          </div>
        )}

        {/* Jobs Pie */}
        {overview && jobPieData.some(d => d.value > 0) && (
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold text-card-foreground mb-4">Properties by Status</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={jobPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                  {jobPieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              {jobPieData.map((entry, i) => (
                <div key={entry.name} className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  <span className="text-[11px] text-muted-foreground">{entry.name} ({entry.value})</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Summary cards */}
      {overview && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold text-card-foreground mb-3">Events Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Total</span><span className="font-mono text-sm">{overview.events.total}</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Active</span><span className="font-mono text-sm">{overview.events.active}</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Cancelled</span><span className="font-mono text-sm">{overview.events.cancelled}</span></div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold text-card-foreground mb-3">Campaigns Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Total</span><span className="font-mono text-sm">{overview.campaigns.total}</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Active</span><span className="font-mono text-sm">{overview.campaigns.active}</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Pending</span><span className="font-mono text-sm">{overview.campaigns.pendingApproval}</span></div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold text-card-foreground mb-3">Inquiries Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Total</span><span className="font-mono text-sm">{overview.applications.total}</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">This Month</span><span className="font-mono text-sm">{overview.applications.thisMonth}</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
