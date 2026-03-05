import { useState, useEffect } from 'react';
import { Wrench, Check, X, RotateCcw, Ban, GitBranch, ExternalLink } from 'lucide-react';
import {
  getRemediations,
  getRemediationSummary,
  approveRemediation,
  rejectRemediation,
  cancelRemediation,
  rollbackRemediation,
  pushRemediationToPipeline,
} from '../lib/api';
import type { RemediationAction, RemediationSummary } from '../types/api';
import { formatCurrency, statusColor, cn } from '../lib/utils';

const riskBadge: Record<string, string> = {
  low: 'bg-green-50 text-green-700 border-green-200',
  medium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  critical: 'bg-red-50 text-red-700 border-red-200',
};

const statusLabels: Record<string, string> = {
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  executing: 'Executing',
  completed: 'Completed',
  failed: 'Failed',
  rolled_back: 'Rolled Back',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

const providerEmoji: Record<string, string> = {
  aws: '\uD83D\uDFE0',
  azure: '\uD83D\uDD35',
  gcp: '\uD83D\uDD34',
};

export default function Remediations() {
  const [remediations, setRemediations] = useState<RemediationAction[]>([]);
  const [summary, setSummary] = useState<RemediationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  // Reject modal state
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);

  // Pipeline modal state
  const [pipelineTarget, setPipelineTarget] = useState<string | null>(null);
  const [pipelineForm, setPipelineForm] = useState({
    github_token: '',
    repo_owner: '',
    repo_name: '',
    base_branch: 'main',
  });
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [pipelineResult, setPipelineResult] = useState<string | null>(null);
  const [pipelineError, setPipelineError] = useState('');

  const fetchData = async () => {
    try {
      const [remRes, sumRes] = await Promise.all([getRemediations(), getRemediationSummary()]);
      setRemediations(remRes.data);
      setSummary(sumRes.data);
    } catch {
      setError('Failed to load remediation data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApprove = async (id: string) => {
    setActionLoading((prev) => ({ ...prev, [id]: true }));
    try {
      await approveRemediation(id);
      await fetchData();
    } catch {
      // Refresh to show latest state
      await fetchData();
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const openRejectModal = (id: string) => {
    setRejectTarget(id);
    setRejectReason('');
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setRejectLoading(true);
    try {
      await rejectRemediation(rejectTarget, { reason: rejectReason.trim() || 'No reason provided' });
      setRejectTarget(null);
      setRejectReason('');
      await fetchData();
    } catch {
      await fetchData();
    } finally {
      setRejectLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    setActionLoading((prev) => ({ ...prev, [id]: true }));
    try {
      await cancelRemediation(id);
      await fetchData();
    } catch {
      await fetchData();
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleRollback = async (id: string) => {
    if (!window.confirm('Are you sure you want to rollback this remediation? The resource will be reverted to its previous state.')) {
      return;
    }
    setActionLoading((prev) => ({ ...prev, [id]: true }));
    try {
      await rollbackRemediation(id);
      await fetchData();
    } catch {
      await fetchData();
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const openPipelineModal = (id: string) => {
    setPipelineTarget(id);
    setPipelineForm({ github_token: '', repo_owner: '', repo_name: '', base_branch: 'main' });
    setPipelineResult(null);
    setPipelineError('');
  };

  const handlePushToPipeline = async () => {
    if (!pipelineTarget) return;
    setPipelineLoading(true);
    setPipelineError('');
    try {
      const res = await pushRemediationToPipeline(pipelineTarget, pipelineForm);
      setPipelineResult(res.data.pr_url);
    } catch {
      setPipelineError('Failed to push to pipeline. Please check your credentials and try again.');
    } finally {
      setPipelineLoading(false);
    }
  };

  const pendingCount = summary?.pending_approval ?? 0;
  const completedCount = summary?.completed ?? 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Loading remediations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Remediations</h2>
        <p className="text-sm text-slate-500 mt-1">Review, approve, and manage automated remediation actions</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <SummaryCard
          label="Total Actions"
          value={String(summary?.total ?? 0)}
          icon={<Wrench className="w-5 h-5 text-slate-600" />}
          accent="bg-slate-100"
        />
        <SummaryCard
          label="Pending Approval"
          value={String(pendingCount)}
          icon={
            <div className="relative">
              <Wrench className="w-5 h-5 text-yellow-600" />
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-yellow-500 rounded-full animate-pulse" />
              )}
            </div>
          }
          accent="bg-yellow-50"
          highlight={pendingCount > 0}
        />
        <SummaryCard
          label="Completed"
          value={String(completedCount)}
          icon={<Check className="w-5 h-5 text-green-600" />}
          accent="bg-green-50"
        />
        <SummaryCard
          label="Estimated Savings"
          value={formatCurrency(summary?.total_estimated_savings ?? 0)}
          icon={
            <span className="text-lg leading-none">$</span>
          }
          accent="bg-blue-50"
        />
      </div>

      {/* Remediations Table */}
      {remediations.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Wrench className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No remediation actions</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Remediation actions are created from recommendations. Once the system identifies optimization opportunities, actions will appear here for approval.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-slate-50">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">
                    Description
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">
                    Type
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">
                    Provider
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">
                    Resource
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">
                    Status
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">
                    Risk
                  </th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">
                    Savings
                  </th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {remediations.map((rem) => (
                  <tr key={rem.id} className="hover:bg-slate-50 transition-colors">
                    {/* Description */}
                    <td className="px-5 py-4 max-w-xs">
                      <p className="text-sm font-medium text-slate-900 truncate" title={rem.description}>
                        {rem.description}
                      </p>
                      {rem.resource_type && (
                        <p className="text-xs text-slate-400 mt-0.5">{rem.resource_type}</p>
                      )}
                    </td>

                    {/* Type */}
                    <td className="px-5 py-4">
                      <span className="text-sm text-slate-700 capitalize">
                        {rem.action_type.replace(/_/g, ' ')}
                      </span>
                    </td>

                    {/* Provider */}
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 text-sm text-slate-700">
                        <span>{providerEmoji[rem.provider?.toLowerCase()] || '\u2601\uFE0F'}</span>
                        <span className="uppercase text-xs font-medium">{rem.provider}</span>
                      </span>
                    </td>

                    {/* Resource ID */}
                    <td className="px-5 py-4">
                      <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded max-w-[160px] truncate inline-block" title={rem.resource_id || 'N/A'}>
                        {rem.resource_id || 'N/A'}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <span className={cn('inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full border', statusColor(rem.status))}>
                        {statusLabels[rem.status] || rem.status}
                      </span>
                    </td>

                    {/* Risk */}
                    <td className="px-5 py-4">
                      <span className={cn('inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full border capitalize', riskBadge[rem.risk] || 'bg-gray-50 text-gray-700 border-gray-200')}>
                        {rem.risk}
                      </span>
                    </td>

                    {/* Savings */}
                    <td className="px-5 py-4 text-right">
                      <span className="text-sm font-semibold text-green-700">
                        {formatCurrency(rem.estimated_savings, rem.currency)}
                      </span>
                      <span className="text-xs text-slate-400 block">/month</span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {rem.status === 'pending_approval' && (
                          <>
                            <button
                              onClick={() => handleApprove(rem.id)}
                              disabled={!!actionLoading[rem.id]}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              title="Approve"
                            >
                              {actionLoading[rem.id] ? (
                                <div className="w-3.5 h-3.5 border-2 border-green-300 border-t-green-600 rounded-full animate-spin" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                              Approve
                            </button>
                            <button
                              onClick={() => openRejectModal(rem.id)}
                              disabled={!!actionLoading[rem.id]}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              title="Reject"
                            >
                              <X className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          </>
                        )}
                        {rem.status === 'executing' && (
                          <button
                            onClick={() => handleCancel(rem.id)}
                            disabled={!!actionLoading[rem.id]}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            title="Cancel"
                          >
                            {actionLoading[rem.id] ? (
                              <div className="w-3.5 h-3.5 border-2 border-orange-300 border-t-orange-600 rounded-full animate-spin" />
                            ) : (
                              <Ban className="w-3.5 h-3.5" />
                            )}
                            Cancel
                          </button>
                        )}
                        {rem.status === 'completed' && (
                          <button
                            onClick={() => handleRollback(rem.id)}
                            disabled={!!actionLoading[rem.id]}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            title="Rollback"
                          >
                            {actionLoading[rem.id] ? (
                              <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                            ) : (
                              <RotateCcw className="w-3.5 h-3.5" />
                            )}
                            Rollback
                          </button>
                        )}
                        <button
                          onClick={() => openPipelineModal(rem.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100 transition-colors"
                          title="Push to Pipeline"
                        >
                          <GitBranch className="w-3.5 h-3.5" />
                          Pipeline
                        </button>
                        {!['pending_approval', 'executing', 'completed'].includes(rem.status) && (
                          <span className="text-xs text-slate-400 italic">No actions</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Push to Pipeline Modal */}
      {pipelineTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setPipelineTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                  <GitBranch className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Push to Pipeline</h3>
                  <p className="text-xs text-slate-500">Create a PR with this remediation</p>
                </div>
              </div>
              <button
                onClick={() => setPipelineTarget(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5">
              {pipelineResult ? (
                <div className="text-center py-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Check className="w-6 h-6 text-green-600" />
                  </div>
                  <h4 className="text-base font-semibold text-slate-900 mb-2">Pull Request Created</h4>
                  <a
                    href={pipelineResult}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-violet-600 hover:text-violet-800 hover:underline break-all"
                  >
                    <ExternalLink className="w-4 h-4 flex-shrink-0" />
                    {pipelineResult}
                  </a>
                  <div className="mt-5">
                    <button
                      onClick={() => setPipelineTarget(null)}
                      className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {pipelineError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
                      {pipelineError}
                    </div>
                  )}
                  <div>
                    <label htmlFor="pipeline-token" className="block text-sm font-medium text-slate-700 mb-1.5">
                      GitHub Token
                    </label>
                    <input
                      id="pipeline-token"
                      type="password"
                      value={pipelineForm.github_token}
                      onChange={(e) => setPipelineForm((f) => ({ ...f, github_token: e.target.value }))}
                      placeholder="ghp_..."
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="pipeline-owner" className="block text-sm font-medium text-slate-700 mb-1.5">
                        Repo Owner
                      </label>
                      <input
                        id="pipeline-owner"
                        type="text"
                        value={pipelineForm.repo_owner}
                        onChange={(e) => setPipelineForm((f) => ({ ...f, repo_owner: e.target.value }))}
                        placeholder="my-org"
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="pipeline-repo" className="block text-sm font-medium text-slate-700 mb-1.5">
                        Repo Name
                      </label>
                      <input
                        id="pipeline-repo"
                        type="text"
                        value={pipelineForm.repo_name}
                        onChange={(e) => setPipelineForm((f) => ({ ...f, repo_name: e.target.value }))}
                        placeholder="infra"
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="pipeline-branch" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Base Branch
                    </label>
                    <input
                      id="pipeline-branch"
                      type="text"
                      value={pipelineForm.base_branch}
                      onChange={(e) => setPipelineForm((f) => ({ ...f, base_branch: e.target.value }))}
                      placeholder="main"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setPipelineTarget(null)}
                      className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handlePushToPipeline}
                      disabled={pipelineLoading || !pipelineForm.github_token || !pipelineForm.repo_owner || !pipelineForm.repo_name}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {pipelineLoading ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <GitBranch className="w-4 h-4" />
                      )}
                      {pipelineLoading ? 'Pushing...' : 'Push'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setRejectTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <X className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Reject Remediation</h3>
                  <p className="text-xs text-slate-500">Provide a reason for rejection</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label htmlFor="reject-reason" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Reason
                </label>
                <textarea
                  id="reject-reason"
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Why is this remediation being rejected?"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-shadow text-sm resize-none"
                  autoFocus
                />
              </div>
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setRejectTarget(null)}
                  className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={rejectLoading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {rejectLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                  {rejectLoading ? 'Rejecting...' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Summary Card Sub-component                                         */
/* ------------------------------------------------------------------ */

function SummaryCard({
  label,
  value,
  icon,
  accent,
  highlight = false,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: string;
  highlight?: boolean;
}) {
  return (
    <div className={cn(
      'bg-white rounded-xl border px-5 py-4 flex items-center gap-4 transition-shadow',
      highlight ? 'border-yellow-300 shadow-sm shadow-yellow-100' : 'border-gray-200'
    )}>
      <div className={cn('w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0', accent)}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
        <p className="text-xl font-bold text-slate-900 mt-0.5">{value}</p>
      </div>
    </div>
  );
}
