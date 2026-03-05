import { useState, useEffect } from 'react';
import { Tag } from 'lucide-react';
import { getAllocations, getUntaggedResources } from '../lib/api';
import { formatCurrency, cn } from '../lib/utils';

interface AllocationItem {
  name: string;
  amount: number;
  percentage: number;
}

interface UntaggedResource {
  resource_id: string;
  resource_type: string;
  provider: string;
  region: string;
  estimated_cost: number;
  currency: string;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-gray-200 rounded', className)} />;
}

export default function Allocations() {
  const [allocations, setAllocations] = useState<AllocationItem[]>([]);
  const [totalSpend, setTotalSpend] = useState(0);
  const [currency, setCurrency] = useState('USD');
  const [period, setPeriod] = useState<{ start: string; end: string } | null>(null);
  const [untagged, setUntagged] = useState<UntaggedResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError('');
      try {
        const [allocRes, untaggedRes] = await Promise.all([
          getAllocations(),
          getUntaggedResources(),
        ]);

        console.log('[Allocations] raw allocRes.data:', allocRes.data);
        console.log('[Allocations] raw untaggedRes.data:', untaggedRes.data);

        const raw = allocRes.data ?? {};
        setAllocations((raw.allocations ?? []) as AllocationItem[]);
        setTotalSpend(raw.total ?? 0);
        setCurrency(raw.currency ?? 'USD');
        setPeriod(raw.period ?? null);

        const untaggedRaw = untaggedRes.data ?? {};
        const untaggedArray = Array.isArray(untaggedRaw)
          ? untaggedRaw
          : ((untaggedRaw.items ?? untaggedRaw.data ?? untaggedRaw.resources ?? []) as UntaggedResource[]);
        setUntagged(untaggedArray);
      } catch (err) {
        console.error('[Allocations] fetch error:', err);
        setError('Failed to load allocation data. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Cost by Tag */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Tag className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Cost by Tag</h2>
              {!loading && period && (
                <p className="text-xs text-gray-400">{period.start} to {period.end}</p>
              )}
            </div>
          </div>
          {!loading && totalSpend > 0 && (
            <div className="text-right">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Total Spend</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(totalSpend, currency)}</p>
            </div>
          )}
        </div>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : (allocations ?? []).length === 0 ? (
          <div className="flex items-center justify-center h-48 text-sm text-gray-400">
            No allocation data available
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 pr-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="text-right py-2 pr-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Amount</th>
                  <th className="text-right py-2 text-xs font-medium text-gray-400 uppercase tracking-wider">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(allocations ?? []).map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-2.5 pr-3 font-medium text-gray-900">{item?.name ?? ''}</td>
                    <td className="py-2.5 pr-3 text-right font-mono text-gray-900">
                      {formatCurrency(item?.amount ?? 0, currency)}
                    </td>
                    <td className="py-2.5 text-right text-gray-500">{(item?.percentage ?? 0).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Untagged Resources */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
            <Tag className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Untagged Resources</h2>
            {!loading && (untagged ?? []).length > 0 && (
              <p className="text-xs text-gray-400">{(untagged ?? []).length} resource{(untagged ?? []).length !== 1 ? 's' : ''} missing tags</p>
            )}
          </div>
        </div>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : (untagged ?? []).length === 0 ? (
          <div className="flex items-center justify-center h-48 text-sm text-gray-400">
            All resources are properly tagged
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 pr-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Resource ID</th>
                  <th className="text-left py-2 pr-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="text-left py-2 pr-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Provider</th>
                  <th className="text-left py-2 pr-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Region</th>
                  <th className="text-right py-2 text-xs font-medium text-gray-400 uppercase tracking-wider">Est. Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(untagged ?? []).map((res, idx) => (
                  <tr key={res?.resource_id ?? idx} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-2.5 pr-3 font-mono text-xs text-gray-900 truncate max-w-[200px]">{res?.resource_id ?? ''}</td>
                    <td className="py-2.5 pr-3 text-gray-600">{res?.resource_type ?? ''}</td>
                    <td className="py-2.5 pr-3 text-gray-600 uppercase">{res?.provider ?? ''}</td>
                    <td className="py-2.5 pr-3 text-gray-600">{res?.region ?? ''}</td>
                    <td className="py-2.5 text-right font-mono text-gray-900">
                      {formatCurrency(res?.estimated_cost ?? 0, res?.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
