import { useState, useEffect, useCallback } from 'react';
import { Lightbulb, Check, X, ArrowRight } from 'lucide-react';
import {
  getRecommendations,
  getRecommendationSummary,
  updateRecommendationStatus,
  dismissRecommendation,
} from '../lib/api';
import type { Recommendation, RecommendationSummary } from '../types/api';
import { formatCurrency, statusColor, providerIcon, cn } from '../lib/utils';

const RECOMMENDATION_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'rightsizing', label: 'Rightsizing' },
  { value: 'unused_resource', label: 'Unused Resource' },
  { value: 'reserved_instance', label: 'Reserved Instance' },
  { value: 'savings_plan', label: 'Savings Plan' },
  { value: 'storage_optimization', label: 'Storage Optimization' },
  { value: 'scheduling', label: 'Scheduling' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'dismissed', label: 'Dismissed' },
  { value: 'implemented', label: 'Implemented' },
];

function typeBadgeColor(type: string): string {
  switch (type) {
    case 'rightsizing':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'unused_resource':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'reserved_instance':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'savings_plan':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case 'storage_optimization':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'scheduling':
      return 'bg-teal-50 text-teal-700 border-teal-200';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
}

function indicatorLevel(level: string): { color: string; label: string } {
  switch (level?.toLowerCase()) {
    case 'high':
      return { color: 'bg-red-500', label: 'High' };
    case 'medium':
      return { color: 'bg-yellow-500', label: 'Medium' };
    case 'low':
      return { color: 'bg-green-500', label: 'Low' };
    default:
      return { color: 'bg-gray-400', label: level || 'N/A' };
  }
}

function formatTypeLabel(type: string): string {
  return type
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function Recommendations() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [summary, setSummary] = useState<RecommendationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterStatus) params.status = filterStatus;
      if (filterType) params.type = filterType;

      const [recsRes, summaryRes] = await Promise.all([
        getRecommendations(params),
        getRecommendationSummary(),
      ]);
      setRecommendations(recsRes.data);
      setSummary(summaryRes.data);
    } catch (err) {
      console.error('Failed to fetch recommendations:', err);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterType]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAccept = async (id: string) => {
    setActionLoading(id);
    try {
      await updateRecommendationStatus(id, { status: 'accepted' });
      await fetchData();
    } catch (err) {
      console.error('Failed to accept recommendation:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDismiss = async (id: string) => {
    setActionLoading(id);
    try {
      await dismissRecommendation(id, { notes: '' });
      await fetchData();
    } catch (err) {
      console.error('Failed to dismiss recommendation:', err);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-100 rounded-xl">
            <Lightbulb className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Recommendations</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Cost optimization opportunities across your cloud infrastructure
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {loading && !summary ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
              <div className="h-8 bg-gray-200 rounded w-20" />
            </div>
          ))}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm font-medium text-gray-500">Total Recommendations</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{summary.total_count}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm font-medium text-gray-500">Potential Savings</p>
            <p className="text-3xl font-bold text-green-600 mt-1">
              {formatCurrency(summary.total_savings)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm font-medium text-gray-500">Pending</p>
            <p className="text-3xl font-bold text-amber-600 mt-1">
              {summary.pending_count}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm font-medium text-gray-500">Implemented</p>
            <p className="text-3xl font-bold text-green-600 mt-1">
              {summary.implemented_count}
            </p>
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-gray-400" />
                Dismissed: {summary.dismissed_count}
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="filter-status" className="text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              id="filter-status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="filter-type" className="text-sm font-medium text-gray-700">
              Type
            </label>
            <select
              id="filter-type"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {RECOMMENDATION_TYPES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          {(filterStatus || filterType) && (
            <button
              onClick={() => {
                setFilterStatus('');
                setFilterType('');
              }}
              className="text-sm text-primary-600 hover:text-primary-700 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Recommendations List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse"
            >
              <div className="flex items-start gap-4">
                <div className="h-6 bg-gray-200 rounded-full w-28" />
                <div className="flex-1 space-y-3">
                  <div className="h-5 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : recommendations.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Lightbulb className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No recommendations found</h3>
          <p className="text-sm text-gray-500">
            {filterStatus || filterType
              ? 'Try adjusting your filters to see more results.'
              : 'Recommendations will appear here once your cloud data is analyzed.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {recommendations.map((rec) => {
            const impact = indicatorLevel(rec.impact);
            const effort = indicatorLevel(rec.effort);
            const risk = indicatorLevel(rec.risk);
            const isActioning = actionLoading === rec.id;
            const isActionable = rec.status === 'pending';

            return (
              <div
                key={rec.id}
                className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Details */}
                    <div className="flex-1 min-w-0">
                      {/* Badges Row */}
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span
                          className={cn(
                            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
                            typeBadgeColor(rec.rec_type)
                          )}
                        >
                          {formatTypeLabel(rec.rec_type)}
                        </span>
                        <span
                          className={cn(
                            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
                            statusColor(rec.status)
                          )}
                        >
                          {rec.status.charAt(0).toUpperCase() + rec.status.slice(1)}
                        </span>
                      </div>

                      {/* Resource Info */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg" title={rec.provider}>
                          {providerIcon(rec.provider)}
                        </span>
                        <div className="min-w-0">
                          {rec.resource_id && (
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {rec.resource_id}
                            </p>
                          )}
                          {rec.resource_type && (
                            <p className="text-xs text-gray-500 truncate">{rec.resource_type}</p>
                          )}
                        </div>
                      </div>

                      {/* Region / Account */}
                      {(rec.region || rec.account_id) && (
                        <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                          {rec.region && <span>Region: {rec.region}</span>}
                          {rec.account_id && <span>Account: {rec.account_id}</span>}
                        </div>
                      )}

                      {/* Savings */}
                      <div className="flex items-baseline gap-2 mb-4">
                        <span className="text-xl font-bold text-green-600">
                          {formatCurrency(rec.estimated_savings, rec.currency)}
                        </span>
                        <span className="text-sm text-green-600 font-medium">
                          ({parseFloat(rec.estimated_savings_pct).toFixed(1)}% savings)
                        </span>
                        <span className="text-xs text-gray-400">/month est.</span>
                      </div>

                      {/* Impact / Effort / Risk */}
                      <div className="flex items-center gap-5">
                        <div className="flex items-center gap-1.5">
                          <span className={cn('w-2 h-2 rounded-full', impact.color)} />
                          <span className="text-xs text-gray-600">
                            Impact: <span className="font-medium">{impact.label}</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={cn('w-2 h-2 rounded-full', effort.color)} />
                          <span className="text-xs text-gray-600">
                            Effort: <span className="font-medium">{effort.label}</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={cn('w-2 h-2 rounded-full', risk.color)} />
                          <span className="text-xs text-gray-600">
                            Risk: <span className="font-medium">{risk.label}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      {isActionable && (
                        <>
                          <button
                            onClick={() => handleAccept(rec.id)}
                            disabled={isActioning}
                            className={cn(
                              'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                              'bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed'
                            )}
                          >
                            <Check className="w-4 h-4" />
                            Accept
                          </button>
                          <button
                            onClick={() => handleDismiss(rec.id)}
                            disabled={isActioning}
                            className={cn(
                              'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                              'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed'
                            )}
                          >
                            <X className="w-4 h-4" />
                            Dismiss
                          </button>
                        </>
                      )}
                      {rec.status === 'accepted' && (
                        <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-green-50 text-green-700">
                          <Check className="w-4 h-4" />
                          Accepted
                        </span>
                      )}
                      {rec.status === 'dismissed' && (
                        <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-gray-50 text-gray-500">
                          <X className="w-4 h-4" />
                          Dismissed
                        </span>
                      )}
                      {rec.status === 'implemented' && (
                        <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-blue-50 text-blue-700">
                          <ArrowRight className="w-4 h-4" />
                          Implemented
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
