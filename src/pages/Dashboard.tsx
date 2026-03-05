import { useState, useEffect } from 'react';
import {
  DollarSign, AlertTriangle, PiggyBank, Gauge,
  TrendingUp, TrendingDown, ArrowRight, Cpu
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  BarChart, Bar, LineChart, Line,
} from 'recharts';
import { Link } from 'react-router-dom';
import { getCostSummary, getCostTrend, getAnomalies, getRecommendationSummary, getBudgets, getAiCosts } from '../lib/api';
import { formatCurrency, formatPercent, severityColor, formatDateShort, cn } from '../lib/utils';
import type { CostSummary, CostTrend, Anomaly, RecommendationSummary, Budget, AiCostSummary } from '../types/api';

// --- Provider colors ---
const PROVIDER_COLORS: Record<string, string> = {
  aws: '#F97316',
  azure: '#3B82F6',
  gcp: '#EF4444',
};

const PROVIDER_LABELS: Record<string, string> = {
  aws: 'AWS',
  azure: 'Azure',
  gcp: 'GCP',
};

// --- Skeleton block for loading states ---
function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-gray-200 rounded', className)} />;
}

// --- Custom tooltip for the area chart ---
function CostTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-gray-200 text-sm">
      <p className="text-gray-500 mb-0.5">{label}</p>
      <p className="font-semibold text-gray-900">{formatCurrency(payload[0].value)}</p>
    </div>
  );
}

// --- Stat card component ---
interface StatCardProps {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  change?: number;
  changeLabel?: string;
  loading?: boolean;
}

function StatCard({ icon: Icon, iconBg, iconColor, label, value, change, changeLabel, loading }: StatCardProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-3">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-4 w-20" />
      </div>
    );
  }

  const isPositiveChange = change !== undefined && change > 0;
  const isNegativeChange = change !== undefined && change < 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-3">
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', iconBg)}>
          <Icon className={cn('w-5 h-5', iconColor)} />
        </div>
        <span className="text-sm font-medium text-gray-500">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
      {change !== undefined && (
        <div className="flex items-center gap-1.5">
          <span className={cn(
            'inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full',
            isPositiveChange && 'bg-red-50 text-red-700',
            isNegativeChange && 'bg-emerald-50 text-emerald-700',
            change === 0 && 'bg-gray-50 text-gray-600',
          )}>
            {isPositiveChange && <TrendingUp className="w-3 h-3" />}
            {isNegativeChange && <TrendingDown className="w-3 h-3" />}
            {formatPercent(change)}
          </span>
          {changeLabel && <span className="text-xs text-gray-400">{changeLabel}</span>}
        </div>
      )}
    </div>
  );
}

// --- Main Dashboard ---
export default function Dashboard() {
  const [costSummary, setCostSummary] = useState<CostSummary | null>(null);
  const [costTrend, setCostTrend] = useState<CostTrend[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [recSummary, setRecSummary] = useState<RecommendationSummary | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [aiCosts, setAiCosts] = useState<AiCostSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [summaryRes, trendRes, anomalyRes, recRes, budgetRes, aiRes] = await Promise.all([
          getCostSummary(),
          getCostTrend({ granularity: 'daily' }),
          getAnomalies({ per_page: '5' }),
          getRecommendationSummary(),
          getBudgets(),
          getAiCosts().catch(() => ({ data: null })),
        ]);
        setCostSummary(summaryRes.data);
        setCostTrend(trendRes.data);
        setAnomalies(anomalyRes.data);
        setRecSummary(recRes.data);
        setBudgets(budgetRes.data);
        if (aiRes.data) setAiCosts(aiRes.data);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // --- Derived data ---
  const activeAnomalyCount = anomalies.filter(a => a.status === 'active' || a.status === 'open').length;

  const budgetUtilization = budgets.length > 0
    ? budgets.reduce((sum, b) => {
        const spend = parseFloat(b.current_spend) || 0;
        const amount = parseFloat(b.amount) || 1;
        return sum + (spend / amount) * 100;
      }, 0) / budgets.length
    : 0;

  const providerData: { name: string; value: number; color: string }[] = costSummary
    ? costSummary.by_provider.map((item) => ({
        name: PROVIDER_LABELS[item.name] ?? item.name,
        value: item.amount,
        color: PROVIDER_COLORS[item.name] ?? '#6B7280',
      }))
    : [];

  const serviceData = costSummary
    ? costSummary.by_service
        .slice(0, 8)
        .map((item) => ({ name: item.name, amount: item.amount }))
    : [];

  const trendData = costTrend.map(item => ({
    date: formatDateShort(item.date),
    amount: item.amount,
  }));

  return (
    <div className="space-y-6">
      {/* --- Stats cards row --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={DollarSign}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          label="Total Cost"
          value={costSummary ? formatCurrency(costSummary.total_cost, costSummary.currency) : '$--'}
          change={costSummary?.change_pct ?? undefined}
          changeLabel="vs last period"
          loading={loading}
        />
        <StatCard
          icon={AlertTriangle}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          label="Active Anomalies"
          value={loading ? '--' : String(activeAnomalyCount)}
          loading={loading}
        />
        <StatCard
          icon={PiggyBank}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          label="Potential Savings"
          value={recSummary ? formatCurrency(recSummary.total_savings) : '$--'}
          loading={loading}
        />
        <StatCard
          icon={Gauge}
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
          label="Budget Utilization"
          value={loading ? '--' : `${budgetUtilization.toFixed(0)}%`}
          loading={loading}
        />
      </div>

      {/* --- AI Costs card --- */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">AI / GPU Spend</span>
              {loading ? (
                <Skeleton className="h-7 w-28 mt-1" />
              ) : aiCosts && aiCosts.total_ai_spend > 0 ? (
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(aiCosts.total_ai_spend, aiCosts.currency)}
                  <span className="ml-2 text-xs font-normal text-gray-400">
                    ({aiCosts.ai_share_pct.toFixed(1)}% of total)
                  </span>
                </p>
              ) : (
                <p className="text-sm text-gray-400 mt-1">No AI workloads detected</p>
              )}
            </div>
          </div>
          {!loading && aiCosts && aiCosts.trend.length > 1 && (
            <div className="w-32 h-10">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={aiCosts.trend.map(p => ({ d: formatDateShort(p.date), v: p.amount }))}>
                  <Line type="monotone" dataKey="v" stroke="#7C3AED" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        {!loading && aiCosts && aiCosts.by_service.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {aiCosts.by_service.slice(0, 5).map(s => (
              <span key={s.name} className="inline-flex items-center gap-1 text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                {s.name}
                <span className="text-purple-400">{formatCurrency(s.amount)}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* --- Charts row --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cost Trend (takes 2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Cost Trend</h2>
            <span className="text-xs text-gray-400">Daily</span>
          </div>
          {loading ? (
            <Skeleton className="w-full h-64" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => formatCurrency(v)}
                />
                <RechartsTooltip content={<CostTooltip />} />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fill="url(#costGradient)"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Cost by Provider (pie chart) */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Cost by Provider</h2>
          {loading ? (
            <Skeleton className="w-full h-64" />
          ) : providerData.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-sm text-gray-400">
              No provider data
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={providerData}
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {providerData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={8}
                  formatter={(value: string) => (
                    <span className="text-xs text-gray-600">{value}</span>
                  )}
                />
                <RechartsTooltip
                  formatter={(value: number | undefined) => [formatCurrency(value ?? 0), 'Cost']}
                  contentStyle={{
                    borderRadius: '0.5rem',
                    border: '1px solid #E2E8F0',
                    fontSize: '0.75rem',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* --- Bottom row: Service breakdown + Recent anomalies --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost by Service */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Top Services by Cost</h2>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          ) : serviceData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-sm text-gray-400">
              No service data
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={serviceData}
                layout="vertical"
                margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => formatCurrency(v)}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  axisLine={false}
                  tickLine={false}
                  width={120}
                />
                <RechartsTooltip
                  formatter={(value: number | undefined) => [formatCurrency(value ?? 0), 'Cost']}
                  contentStyle={{
                    borderRadius: '0.5rem',
                    border: '1px solid #E2E8F0',
                    fontSize: '0.75rem',
                  }}
                />
                <Bar
                  dataKey="amount"
                  fill="#3B82F6"
                  radius={[0, 4, 4, 0]}
                  barSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Recent Anomalies */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Recent Anomalies</h2>
            <Link
              to="/anomalies"
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : anomalies.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-sm text-gray-400">
              No anomalies detected
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 pr-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="text-left py-2 pr-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Service</th>
                    <th className="text-left py-2 pr-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Severity</th>
                    <th className="text-right py-2 text-xs font-medium text-gray-400 uppercase tracking-wider">Deviation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {anomalies.map((anomaly) => (
                    <tr key={anomaly.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-2.5 pr-3 text-gray-600 whitespace-nowrap">
                        {formatDateShort(anomaly.detected_at)}
                      </td>
                      <td className="py-2.5 pr-3 text-gray-900 font-medium whitespace-nowrap">
                        {anomaly.service || anomaly.provider || '--'}
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border',
                          severityColor(anomaly.severity),
                        )}>
                          {anomaly.severity}
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-mono text-gray-900 whitespace-nowrap">
                        {formatCurrency(anomaly.actual_amount)}
                        <span className="text-gray-400 font-normal ml-1">
                          ({anomaly.deviation_pct}%)
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
