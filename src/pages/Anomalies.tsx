import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Eye, Loader2, X, Filter } from 'lucide-react';
import { getAnomalies, getAnomalySummary, acknowledgeAnomaly, resolveAnomaly } from '../lib/api';
import type { Anomaly, AnomalySummary } from '../types/api';
import { formatCurrency, formatDate, severityColor, statusColor, cn } from '../lib/utils';

const SEVERITY_OPTIONS = ['all', 'critical', 'high', 'medium', 'low'] as const;
const STATUS_OPTIONS = ['all', 'open', 'acknowledged', 'resolved'] as const;

export default function Anomalies() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [summary, setSummary] = useState<AnomalySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [actionLoading, setActionLoading] = useState<Record<string, string>>({});

  const fetchData = async () => {
    try {
      setError('');
      const params: Record<string, string> = {};
      if (severityFilter !== 'all') params.severity = severityFilter;
      if (statusFilter !== 'all') params.status = statusFilter;

      const [anomalyRes, summaryRes] = await Promise.all([
        getAnomalies(params),
        getAnomalySummary(),
      ]);

      setAnomalies(anomalyRes.data);
      setSummary(summaryRes.data);
    } catch {
      setError('Failed to load anomaly data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [severityFilter, statusFilter]);

  const handleAcknowledge = async (id: string) => {
    setActionLoading((prev) => ({ ...prev, [id]: 'acknowledge' }));
    try {
      await acknowledgeAnomaly(id);
      setAnomalies((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, status: 'acknowledged', acknowledged_at: new Date().toISOString() } : a
        )
      );
      // Refresh summary counts
      const summaryRes = await getAnomalySummary();
      setSummary(summaryRes.data);
    } catch {
      setError('Failed to acknowledge anomaly. Please try again.');
    } finally {
      setActionLoading((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const handleResolve = async (id: string) => {
    setActionLoading((prev) => ({ ...prev, [id]: 'resolve' }));
    try {
      await resolveAnomaly(id);
      setAnomalies((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, status: 'resolved', resolved_at: new Date().toISOString() } : a
        )
      );
      const summaryRes = await getAnomalySummary();
      setSummary(summaryRes.data);
    } catch {
      setError('Failed to resolve anomaly. Please try again.');
    } finally {
      setActionLoading((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const severityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'medium':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-blue-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
          <p className="text-sm text-gray-500">Loading anomalies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Anomalies</h2>
        <p className="text-sm text-gray-500 mt-1">
          Detect and respond to unusual cloud spending patterns
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Total */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-gray-600" />
              </div>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
          </div>

          {/* Critical */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Critical</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{summary.critical}</p>
          </div>

          {/* High */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-orange-50 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
              </div>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">High</span>
            </div>
            <p className="text-2xl font-bold text-orange-600">{summary.high}</p>
          </div>

          {/* Medium */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-yellow-50 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
              </div>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Medium</span>
            </div>
            <p className="text-2xl font-bold text-yellow-600">{summary.medium}</p>
          </div>

          {/* Low */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-blue-500" />
              </div>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Low</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{summary.low}</p>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-gray-500">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">Filters</span>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="severity-filter" className="text-sm text-gray-600">
            Severity:
          </label>
          <select
            id="severity-filter"
            value={severityFilter}
            onChange={(e) => {
              setLoading(true);
              setSeverityFilter(e.target.value);
            }}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            {SEVERITY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt === 'all' ? 'All Severities' : opt.charAt(0).toUpperCase() + opt.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="status-filter" className="text-sm text-gray-600">
            Status:
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => {
              setLoading(true);
              setStatusFilter(e.target.value);
            }}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt === 'all' ? 'All Statuses' : opt.charAt(0).toUpperCase() + opt.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {(severityFilter !== 'all' || statusFilter !== 'all') && (
          <button
            onClick={() => {
              setLoading(true);
              setSeverityFilter('all');
              setStatusFilter('all');
            }}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium ml-auto"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Empty State */}
      {anomalies.length === 0 && !error && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No anomalies found</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            {severityFilter !== 'all' || statusFilter !== 'all'
              ? 'No anomalies match the current filters. Try adjusting your filter criteria.'
              : 'Your cloud spending looks healthy. Anomalies will appear here when unusual patterns are detected.'}
          </p>
        </div>
      )}

      {/* Anomalies Table */}
      {anomalies.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3.5">
                    Date
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3.5">
                    Service
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3.5">
                    Provider
                  </th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3.5">
                    Actual
                  </th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3.5">
                    Expected
                  </th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3.5">
                    Deviation
                  </th>
                  <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3.5">
                    Severity
                  </th>
                  <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3.5">
                    Status
                  </th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3.5">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {anomalies.map((anomaly) => {
                  const deviationPct = parseFloat(anomaly.deviation_pct) || 0;
                  const isActioning = !!actionLoading[anomaly.id];

                  return (
                    <tr
                      key={anomaly.id}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      {/* Date */}
                      <td className="px-5 py-4">
                        <span className="text-sm text-gray-900 font-medium whitespace-nowrap">
                          {formatDate(anomaly.date)}
                        </span>
                      </td>

                      {/* Service */}
                      <td className="px-5 py-4">
                        <span className="text-sm text-gray-700">
                          {anomaly.service || '--'}
                        </span>
                      </td>

                      {/* Provider */}
                      <td className="px-5 py-4">
                        <span className="text-sm text-gray-700 capitalize">
                          {anomaly.provider || '--'}
                        </span>
                      </td>

                      {/* Actual */}
                      <td className="px-5 py-4 text-right">
                        <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                          {formatCurrency(anomaly.actual_amount)}
                        </span>
                      </td>

                      {/* Expected */}
                      <td className="px-5 py-4 text-right">
                        <span className="text-sm text-gray-500 whitespace-nowrap">
                          {formatCurrency(anomaly.expected_amount)}
                        </span>
                      </td>

                      {/* Deviation */}
                      <td className="px-5 py-4 text-right">
                        <span
                          className={cn(
                            'text-sm font-semibold whitespace-nowrap',
                            deviationPct > 0 ? 'text-red-600' : 'text-green-600'
                          )}
                        >
                          {deviationPct > 0 ? '+' : ''}{deviationPct.toFixed(1)}%
                        </span>
                      </td>

                      {/* Severity Badge */}
                      <td className="px-5 py-4 text-center">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border capitalize',
                            severityColor(anomaly.severity)
                          )}
                        >
                          {severityIcon(anomaly.severity)}
                          {anomaly.severity}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="px-5 py-4 text-center">
                        <span
                          className={cn(
                            'inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full border capitalize',
                            statusColor(anomaly.status)
                          )}
                        >
                          {anomaly.status.replace(/_/g, ' ')}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {anomaly.status === 'open' && (
                            <button
                              onClick={() => handleAcknowledge(anomaly.id)}
                              disabled={isActioning}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                              title="Acknowledge anomaly"
                            >
                              {actionLoading[anomaly.id] === 'acknowledge' ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                              Acknowledge
                            </button>
                          )}
                          {(anomaly.status === 'open' || anomaly.status === 'acknowledged') && (
                            <button
                              onClick={() => handleResolve(anomaly.id)}
                              disabled={isActioning}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                              title="Resolve anomaly"
                            >
                              {actionLoading[anomaly.id] === 'resolve' ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CheckCircle className="w-3.5 h-3.5" />
                              )}
                              Resolve
                            </button>
                          )}
                          {anomaly.status === 'resolved' && (
                            <span className="text-xs text-gray-400 italic">Resolved</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="bg-gray-50 border-t border-gray-200 px-5 py-3 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing <span className="font-medium text-gray-700">{anomalies.length}</span> anomal{anomalies.length === 1 ? 'y' : 'ies'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
