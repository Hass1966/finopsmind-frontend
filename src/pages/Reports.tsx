import { useState, useEffect } from 'react';
import { FileText, Download, BarChart3, PieChart as PieChartIcon, AlertTriangle, Calendar } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { getExecutiveSummary, getCostComparison, exportReportCsv, exportReportJson } from '../lib/api';
import { downloadBlob } from '../lib/utils';
import type { ExecutiveSummary, CostComparison } from '../types/api';
import { formatCurrency, formatPercent } from '../lib/utils';

type Tab = 'executive' | 'comparison' | 'export';

const PIE_COLORS = ['#3b82f6', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6', '#ec4899'];

export default function Reports() {
  const [activeTab, setActiveTab] = useState<Tab>('executive');
  const [executiveSummary, setExecutiveSummary] = useState<ExecutiveSummary | null>(null);
  const [comparison, setComparison] = useState<CostComparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState<'csv' | 'json' | null>(null);

  const [currentStart, setCurrentStart] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [currentEnd, setCurrentEnd] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [previousStart, setPreviousStart] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [previousEnd, setPreviousEnd] = useState(() => {
    const d = new Date();
    d.setDate(0);
    return d.toISOString().split('T')[0];
  });

  useEffect(() => {
    const fetchExecutive = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await getExecutiveSummary();
        setExecutiveSummary(res.data);
      } catch {
        setError('Failed to load executive summary.');
      } finally {
        setLoading(false);
      }
    };
    fetchExecutive();
  }, []);

  const fetchComparison = async () => {
    setComparisonLoading(true);
    setError('');
    try {
      const res = await getCostComparison({
        current_start: currentStart,
        current_end: currentEnd,
        previous_start: previousStart,
        previous_end: previousEnd,
      });
      setComparison(res.data);
    } catch {
      setError('Failed to load cost comparison.');
    } finally {
      setComparisonLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'comparison' && !comparison) {
      fetchComparison();
    }
  }, [activeTab]);

  const handleExport = async (format: 'csv' | 'json') => {
    setExporting(format);
    try {
      const res = format === 'csv' ? await exportReportCsv() : await exportReportJson();
      const ext = format === 'csv' ? 'csv' : 'json';
      downloadBlob(res.data, `finopsmind-report-${new Date().toISOString().split('T')[0]}.${ext}`);
    } catch {
      setError(`Failed to export ${format.toUpperCase()} report.`);
    } finally {
      setExporting(null);
    }
  };

  const tabs = [
    { key: 'executive' as Tab, label: 'Executive Summary', icon: BarChart3 },
    { key: 'comparison' as Tab, label: 'Cost Comparison', icon: Calendar },
    { key: 'export' as Tab, label: 'Export', icon: Download },
  ];

  const topServicesData = executiveSummary?.top_services?.map((s) => ({
    name: s.service,
    amount: s.amount,
  })) || [];

  const providerPieData = executiveSummary
    ? Object.entries(executiveSummary.cost_by_provider).map(([name, value]) => ({
        name: name.toUpperCase(),
        value,
      }))
    : [];

  if (loading && activeTab === 'executive') {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <FileText className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="text-sm text-slate-500">Executive summaries, comparisons, and data exports</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Executive Summary Tab */}
      {activeTab === 'executive' && executiveSummary && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Cost</p>
              <p className="text-xl font-bold text-slate-900 mt-1">{formatCurrency(executiveSummary.total_cost)}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Change</p>
              <p className={`text-xl font-bold mt-1 ${executiveSummary.cost_change_pct >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatPercent(executiveSummary.cost_change_pct)}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Savings Identified</p>
              <p className="text-xl font-bold text-blue-600 mt-1">{formatCurrency(executiveSummary.total_savings_identified)}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Savings Realized</p>
              <p className="text-xl font-bold text-green-600 mt-1">{formatCurrency(executiveSummary.total_savings_realized)}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Anomalies</p>
              <p className={`text-xl font-bold mt-1 ${executiveSummary.active_anomalies > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                {executiveSummary.active_anomalies}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Budget Utilization</p>
              <p className={`text-xl font-bold mt-1 ${
                executiveSummary.budget_utilization > 90 ? 'text-red-600'
                  : executiveSummary.budget_utilization > 75 ? 'text-amber-600'
                  : 'text-green-600'
              }`}>
                {executiveSummary.budget_utilization.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Services Bar Chart */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-semibold text-slate-900">Top Services by Cost</h3>
              </div>
              {topServicesData.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={topServicesData} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(v) => formatCurrency(v)} />
                    <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <Tooltip
                      formatter={(value: number | undefined) => [formatCurrency(value ?? 0), 'Cost']}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="amount" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-80 text-sm text-slate-500">
                  No service data available
                </div>
              )}
            </div>

            {/* Cost by Provider Pie Chart */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <PieChartIcon className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-semibold text-slate-900">Cost by Provider</h3>
              </div>
              {providerPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={providerPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={110}
                      dataKey="value"
                      nameKey="name"
                      paddingAngle={3}
                      stroke="none"
                    >
                      {providerPieData.map((_, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number | undefined) => [formatCurrency(value ?? 0), 'Cost']}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      formatter={(value: string) => <span className="text-sm text-slate-700">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-80 text-sm text-slate-500">
                  No provider data available
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cost Comparison Tab */}
      {activeTab === 'comparison' && (
        <div className="space-y-6">
          {/* Date Pickers */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Select Comparison Periods</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Current Period</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="current-start" className="block text-xs text-slate-500 mb-1">Start</label>
                    <input
                      id="current-start"
                      type="date"
                      value={currentStart}
                      onChange={(e) => setCurrentStart(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label htmlFor="current-end" className="block text-xs text-slate-500 mb-1">End</label>
                    <input
                      id="current-end"
                      type="date"
                      value={currentEnd}
                      onChange={(e) => setCurrentEnd(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Previous Period</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="previous-start" className="block text-xs text-slate-500 mb-1">Start</label>
                    <input
                      id="previous-start"
                      type="date"
                      value={previousStart}
                      onChange={(e) => setPreviousStart(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label htmlFor="previous-end" className="block text-xs text-slate-500 mb-1">End</label>
                    <input
                      id="previous-end"
                      type="date"
                      value={previousEnd}
                      onChange={(e) => setPreviousEnd(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={fetchComparison}
                disabled={comparisonLoading}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {comparisonLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <BarChart3 className="w-4 h-4" />
                )}
                Compare
              </button>
            </div>
          </div>

          {/* Comparison Results */}
          {comparisonLoading && (
            <div className="flex items-center justify-center h-48">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-slate-500">Comparing periods...</p>
              </div>
            </div>
          )}

          {!comparisonLoading && comparison && (
            <div className="space-y-4">
              {/* Period Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Current Period</p>
                  <p className="text-xl font-bold text-slate-900 mt-1">{formatCurrency(comparison.current_period.total)}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{comparison.current_period.start} to {comparison.current_period.end}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Previous Period</p>
                  <p className="text-xl font-bold text-slate-900 mt-1">{formatCurrency(comparison.previous_period.total)}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{comparison.previous_period.start} to {comparison.previous_period.end}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Change</p>
                  <p className={`text-xl font-bold mt-1 ${comparison.change_pct >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatPercent(comparison.change_pct)}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{formatCurrency(comparison.change_amount)} difference</p>
                </div>
              </div>

              {/* Service Comparison Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="px-6 py-4 border-b border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-900">Cost by Service</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">Service</th>
                        <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">Current Period</th>
                        <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">Previous Period</th>
                        <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">Change</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {comparison.by_service.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-sm text-slate-500">
                            No service data available for the selected periods.
                          </td>
                        </tr>
                      ) : (
                        comparison.by_service.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-3 text-sm font-medium text-slate-900">{row.service}</td>
                            <td className="px-6 py-3 text-sm text-slate-700 text-right font-mono">{formatCurrency(row.current)}</td>
                            <td className="px-6 py-3 text-sm text-slate-700 text-right font-mono">{formatCurrency(row.previous)}</td>
                            <td className="px-6 py-3 text-right">
                              <span className={`text-sm font-medium ${row.change_pct >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {formatPercent(row.change_pct)}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Export Tab */}
      {activeTab === 'export' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Export Reports</h3>
          <p className="text-sm text-slate-500 mb-6">
            Download your cost and optimization data in your preferred format for further analysis or sharing.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
            <button
              onClick={() => handleExport('csv')}
              disabled={exporting !== null}
              className="flex items-center justify-center gap-3 px-6 py-4 border-2 border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting === 'csv' ? (
                <div className="w-5 h-5 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
              ) : (
                <Download className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
              )}
              <div className="text-left">
                <p className="text-sm font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">Export CSV</p>
                <p className="text-xs text-slate-500">Spreadsheet-compatible format</p>
              </div>
            </button>
            <button
              onClick={() => handleExport('json')}
              disabled={exporting !== null}
              className="flex items-center justify-center gap-3 px-6 py-4 border-2 border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting === 'json' ? (
                <div className="w-5 h-5 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
              ) : (
                <Download className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
              )}
              <div className="text-left">
                <p className="text-sm font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">Export JSON</p>
                <p className="text-xs text-slate-500">Machine-readable format</p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
