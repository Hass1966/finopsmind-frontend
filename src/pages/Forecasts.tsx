import { useState, useEffect } from 'react';
import { TrendingUp } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { getLatestForecast } from '../lib/api';
import type { Forecast, ForecastPrediction } from '../types/api';
import { formatCurrency, formatDate, cn } from '../lib/utils';

interface ChartDataPoint {
  date: string;
  dateFormatted: string;
  predicted: number;
  lower_bound: number;
  upper_bound: number;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload || !payload.length) return null;

  const data = payload.reduce<Record<string, number>>((acc, p) => {
    acc[p.dataKey] = p.value;
    return acc;
  }, {});

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 min-w-[200px]">
      <p className="text-sm font-semibold text-gray-900 mb-2">{label}</p>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            Predicted
          </span>
          <span className="text-xs font-semibold text-gray-900">
            {formatCurrency(data.predicted ?? 0)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-300 border border-dashed border-blue-400" />
            Upper Bound
          </span>
          <span className="text-xs font-medium text-gray-700">
            {formatCurrency(data.upper_bound ?? 0)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-200 border border-dashed border-blue-300" />
            Lower Bound
          </span>
          <span className="text-xs font-medium text-gray-700">
            {formatCurrency(data.lower_bound ?? 0)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Forecasts() {
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchForecast() {
      setLoading(true);
      setError(null);
      try {
        const res = await getLatestForecast();
        setForecast(res.data);
      } catch (err) {
        console.error('Failed to fetch forecast:', err);
        setError('Failed to load forecast data. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    fetchForecast();
  }, []);

  const chartData: ChartDataPoint[] =
    forecast?.predictions?.map((p: ForecastPrediction) => ({
      date: p.date,
      dateFormatted: formatDate(p.date),
      predicted: p.predicted,
      lower_bound: p.lower_bound,
      upper_bound: p.upper_bound,
    })) ?? [];

  const avgPredicted =
    chartData.length > 0
      ? chartData.reduce((sum, d) => sum + d.predicted, 0) / chartData.length
      : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-100 rounded-xl">
            <TrendingUp className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <div className="h-7 bg-gray-200 rounded w-40 mb-1 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-64 animate-pulse" />
          </div>
        </div>

        {/* Summary cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-28 mb-3" />
              <div className="h-8 bg-gray-200 rounded w-24" />
            </div>
          ))}
        </div>

        {/* Chart skeleton */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
          <div className="h-5 bg-gray-200 rounded w-44 mb-6" />
          <div className="h-80 bg-gray-100 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-100 rounded-xl">
            <TrendingUp className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cost Forecasts</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Predicted cloud spending based on historical trends
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-12 text-center">
          <TrendingUp className="w-12 h-12 text-red-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Unable to Load Forecast</h3>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!forecast) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-100 rounded-xl">
            <TrendingUp className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cost Forecasts</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Predicted cloud spending based on historical trends
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No Forecast Available</h3>
          <p className="text-sm text-gray-500">
            Forecasts will appear once enough historical cost data has been collected and analyzed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-100 rounded-xl">
            <TrendingUp className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cost Forecasts</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Predicted cloud spending based on historical trends
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Generated</p>
          <p className="text-sm font-medium text-gray-600">{formatDate(forecast.generated_at)}</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm font-medium text-gray-500">Total Forecasted Cost</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {formatCurrency(forecast.total_forecasted, forecast.currency)}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {forecast.granularity} granularity
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm font-medium text-gray-500">Confidence Level</p>
          <div className="flex items-baseline gap-2 mt-1">
            <p className="text-3xl font-bold text-blue-600">
              {(parseFloat(forecast.confidence_level) * 100).toFixed(0)}%
            </p>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 mt-3">
            <div
              className="bg-blue-500 h-1.5 rounded-full transition-all"
              style={{ width: `${parseFloat(forecast.confidence_level) * 100}%` }}
            />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm font-medium text-gray-500">Model Version</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{forecast.model_version}</p>
          <p className="text-xs text-gray-400 mt-1">
            {forecast.predictions?.length ?? 0} prediction points
          </p>
        </div>
      </div>

      {/* Forecast Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-6">Cost Prediction Trend</h2>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="predictionGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="boundsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#93C5FD" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#93C5FD" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis
                dataKey="dateFormatted"
                tick={{ fontSize: 12, fill: '#6B7280' }}
                tickLine={false}
                axisLine={{ stroke: '#E5E7EB' }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#6B7280' }}
                tickLine={false}
                axisLine={{ stroke: '#E5E7EB' }}
                tickFormatter={(value: number) => formatCurrency(value)}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                y={avgPredicted}
                stroke="#9CA3AF"
                strokeDasharray="4 4"
                strokeWidth={1}
              />
              <Area
                type="monotone"
                dataKey="upper_bound"
                stroke="#93C5FD"
                strokeWidth={1.5}
                strokeDasharray="6 3"
                fill="url(#boundsGradient)"
                dot={false}
                activeDot={false}
              />
              <Area
                type="monotone"
                dataKey="lower_bound"
                stroke="#93C5FD"
                strokeWidth={1.5}
                strokeDasharray="6 3"
                fill="none"
                dot={false}
                activeDot={false}
              />
              <Area
                type="monotone"
                dataKey="predicted"
                stroke="#3B82F6"
                strokeWidth={2.5}
                fill="url(#predictionGradient)"
                dot={{ r: 3, fill: '#3B82F6', stroke: '#fff', strokeWidth: 2 }}
                activeDot={{ r: 5, fill: '#3B82F6', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-80 flex items-center justify-center text-gray-400 text-sm">
            No prediction data to chart.
          </div>
        )}
      </div>

      {/* Prediction Details Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Prediction Details</h2>
        </div>
        {forecast.predictions && forecast.predictions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Predicted Cost
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Lower Bound
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Upper Bound
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Range
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {forecast.predictions.map((p: ForecastPrediction, index: number) => {
                  const range = p.upper_bound - p.lower_bound;
                  return (
                    <tr
                      key={p.date}
                      className={cn(
                        'hover:bg-gray-50 transition-colors',
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                      )}
                    >
                      <td className="px-6 py-3.5 text-sm font-medium text-gray-900">
                        {formatDate(p.date)}
                      </td>
                      <td className="px-6 py-3.5 text-sm text-right font-semibold text-gray-900">
                        {formatCurrency(p.predicted, forecast.currency)}
                      </td>
                      <td className="px-6 py-3.5 text-sm text-right text-gray-600">
                        {formatCurrency(p.lower_bound, forecast.currency)}
                      </td>
                      <td className="px-6 py-3.5 text-sm text-right text-gray-600">
                        {formatCurrency(p.upper_bound, forecast.currency)}
                      </td>
                      <td className="px-6 py-3.5 text-sm text-right text-gray-500">
                        <span className="inline-flex items-center gap-1">
                          +/- {formatCurrency(range / 2, forecast.currency)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-sm text-gray-400">
            No prediction details available.
          </div>
        )}
      </div>
    </div>
  );
}
