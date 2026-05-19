import { useState, useEffect } from 'react';
import { BookOpen, FileCode, Copy, CheckCheck, X, ChevronDown, ChevronUp } from 'lucide-react';
import { getRecommendations, getRecommendationTerraform } from '../lib/api';
import type { Recommendation } from '../types/api';
import { formatCurrency, cn } from '../lib/utils';

interface GroupedRule {
  rec_type: string;
  label: string;
  description: string;
  count: number;
  avg_saving: number;
  recommendations: Recommendation[];
}

function formatTypeLabel(type: string): string {
  return type
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function getRuleDescription(rec_type: string): string {
  const descriptions: Record<string, string> = {
    idle_resource: 'Identifies idle or underutilised resources that can be terminated or stopped.',
    serverless_migration: 'Recommends migrating low-utilisation EC2 instances to serverless (Lambda/Fargate/Cloud Run).',
    graviton_migration: 'Recommends migrating x86 instances to ARM-based Graviton processors for 20% cost savings.',
    os_licence_optimization: 'Identifies Windows EC2 instances that could be migrated to Linux to eliminate licence costs.',
    scheduled_shutdown: 'Identifies instances idle during off-hours that can be scheduled for automatic stop/start.',
    autoscaling_candidate: 'Identifies bursty workloads that would benefit from Auto Scaling Groups.',
    rightsizing: 'Recommends right-sizing resources based on actual utilisation metrics.',
    trusted_advisor: 'Surfaces cost optimisation findings from AWS Trusted Advisor.',
    cur_enablement: 'Recommends enabling Cost and Usage Reports for detailed cost visibility.',
    database_migration: 'Identifies commercial database engines that could migrate to open-source alternatives.',
    unattached_disk: 'Identifies unattached persistent disks incurring unnecessary storage costs.',
    committed_use_discount: 'Recommends Committed Use Discounts for stable, long-running workloads.',
    oversized_rds: 'Identifies oversized RDS instances that can be downsized.',
    unused_resource: 'Finds unused resources like unattached EBS volumes and idle load balancers.',
    reserved_instance: 'Recommends Reserved Instance purchases for steady-state workloads.',
    storage_optimization: 'Suggests S3 lifecycle policies and storage class optimisations.',
  };
  return descriptions[rec_type] || 'Cost optimisation recommendation.';
}

export default function PatternLibrary() {
  const [groups, setGroups] = useState<GroupedRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  // Terraform modal
  const [terraformCode, setTerraformCode] = useState('');
  const [terraformLoading, setTerraformLoading] = useState(false);
  const [terraformOpen, setTerraformOpen] = useState(false);
  const [terraformTitle, setTerraformTitle] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await getRecommendations({ include_terraform: 'true' });
        const recs = res.data;

        // Group by rec_type
        const grouped: Record<string, Recommendation[]> = {};
        for (const rec of recs) {
          const key = rec.rec_type;
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(rec);
        }

        const result: GroupedRule[] = Object.entries(grouped)
          .map(([rec_type, items]) => {
            const totalSaving = items.reduce(
              (sum, r) => sum + parseFloat(r.estimated_savings || '0'),
              0
            );
            return {
              rec_type,
              label: formatTypeLabel(rec_type),
              description: getRuleDescription(rec_type),
              count: items.length,
              avg_saving: items.length > 0 ? totalSaving / items.length : 0,
              recommendations: items,
            };
          })
          .sort((a, b) => b.count - a.count);

        setGroups(result);
      } catch (err) {
        console.error('Failed to fetch recommendations:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openTerraform = async (rec: Recommendation) => {
    setTerraformOpen(true);
    setTerraformCode('');
    setTerraformLoading(true);
    setTerraformTitle(`${rec.resource_id || rec.resource_type} — ${formatTypeLabel(rec.rec_type)}`);
    setCopied(false);
    try {
      const res = await getRecommendationTerraform(rec.id);
      setTerraformCode(res.data.hcl);
    } catch {
      setTerraformCode('# Failed to load Terraform code.');
    } finally {
      setTerraformLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(terraformCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-violet-100 rounded-xl">
          <BookOpen className="w-6 h-6 text-violet-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pattern Library</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Reusable cost optimisation patterns with Terraform templates
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-1/3 mb-3" />
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-4" />
              <div className="flex gap-4">
                <div className="h-8 bg-gray-200 rounded w-20" />
                <div className="h-8 bg-gray-200 rounded w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No patterns yet</h3>
          <p className="text-sm text-gray-500">
            Patterns will appear here once recommendations are generated.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => {
            const isExpanded = expandedGroup === group.rec_type;
            return (
              <div
                key={group.rec_type}
                className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-all"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{group.label}</h3>
                      <p className="text-sm text-gray-500 mt-1">{group.description}</p>
                      <div className="flex items-center gap-6 mt-4">
                        <div>
                          <span className="text-2xl font-bold text-gray-900">{group.count}</span>
                          <span className="text-sm text-gray-500 ml-1">
                            {group.count === 1 ? 'instance' : 'instances'}
                          </span>
                        </div>
                        <div>
                          <span className="text-2xl font-bold text-green-600">
                            {formatCurrency(group.avg_saving)}
                          </span>
                          <span className="text-sm text-gray-500 ml-1">avg saving/month</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setExpandedGroup(isExpanded ? null : group.rec_type)}
                      className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>
                  </div>

                  {/* Expanded: show individual recs with terraform buttons */}
                  {isExpanded && (
                    <div className="mt-6 border-t border-gray-100 pt-4 space-y-3">
                      {group.recommendations.map((rec) => (
                        <div
                          key={rec.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {rec.resource_id}
                            </p>
                            <p className="text-xs text-gray-500">
                              {rec.resource_type} — {rec.region || 'Unknown region'}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="text-sm font-semibold text-green-600">
                              {formatCurrency(rec.estimated_savings, rec.currency)}
                            </span>
                            <button
                              onClick={() => openTerraform(rec)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200 transition-colors"
                            >
                              <FileCode className="w-3.5 h-3.5" />
                              View Terraform
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Terraform Modal */}
      {terraformOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setTerraformOpen(false)}
          />
          <div className="relative bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
              <div className="flex items-center gap-3">
                <FileCode className="w-5 h-5 text-violet-400" />
                <div>
                  <h3 className="text-sm font-semibold text-white">Terraform Template</h3>
                  <p className="text-xs text-gray-400 truncate max-w-md">{terraformTitle}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  disabled={terraformLoading || !terraformCode}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-600 transition-colors disabled:opacity-50"
                >
                  {copied ? (
                    <>
                      <CheckCheck className="w-3.5 h-3.5 text-green-400" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy
                    </>
                  )}
                </button>
                <button
                  onClick={() => setTerraformOpen(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-6">
              {terraformLoading ? (
                <div className="flex items-center justify-center h-48">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-6 h-6 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
                    <span className="text-sm text-gray-400">Loading HCL...</span>
                  </div>
                </div>
              ) : (
                <pre className="text-sm text-gray-200 font-mono whitespace-pre-wrap break-words leading-relaxed">
                  {terraformCode}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
