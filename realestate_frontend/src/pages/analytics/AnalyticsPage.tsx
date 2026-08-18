import { StatsCard } from '@/components/StatsCard';
import { BarChart3, TrendingUp, Users, Briefcase } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts';

const engagementData = [
  { name: 'Mon', applications: 120, registrations: 80 },
  { name: 'Tue', applications: 150, registrations: 95 },
  { name: 'Wed', applications: 180, registrations: 110 },
  { name: 'Thu', applications: 140, registrations: 88 },
  { name: 'Fri', applications: 200, registrations: 130 },
  { name: 'Sat', applications: 90, registrations: 60 },
  { name: 'Sun', applications: 70, registrations: 45 },
];

const conversionData = [
  { name: 'Week 1', rate: 12.5 },
  { name: 'Week 2', rate: 14.2 },
  { name: 'Week 3', rate: 13.8 },
  { name: 'Week 4', rate: 16.1 },
];

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Analytics</h2>
        <p className="text-sm text-muted-foreground">Platform-wide performance metrics and insights.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Engagement Rate" value="68.4%" change={4.2} icon={<TrendingUp className="h-5 w-5" />} />
        <StatsCard title="Avg. Inquiries/Property" value="12.3" change={-1.8} icon={<BarChart3 className="h-5 w-5" />} />
        <StatsCard title="New Users (7d)" value="847" change={9.5} icon={<Users className="h-5 w-5" />} />
        <StatsCard title="Properties Filled (30d)" value="234" change={18.2} icon={<Briefcase className="h-5 w-5" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-card-foreground mb-4">Daily Engagement</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={engagementData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(215, 16%, 47%)" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(215, 16%, 47%)" />
              <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
              <Bar dataKey="applications" fill="hsl(217, 91%, 60%)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="registrations" fill="hsl(142, 71%, 45%)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-card-foreground mb-4">Conversion Rate Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={conversionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(215, 16%, 47%)" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(215, 16%, 47%)" unit="%" />
              <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
              <Line type="monotone" dataKey="rate" stroke="hsl(217, 91%, 60%)" strokeWidth={2} dot={{ r: 4, fill: 'hsl(217, 91%, 60%)' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
