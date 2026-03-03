// Matches backend UserInfo struct
export interface User {
  id: string;
  organization_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'editor' | 'viewer';
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  organization_name: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// Matches backend CostSummary struct
export interface CostSummary {
  total_cost: number;
  currency: string;
  start_date: string;
  end_date: string;
  by_service: CostBreakdownItem[];
  previous_period_cost: number | null;
  change_pct: number | null;
}

export interface CostBreakdownItem {
  name: string;
  amount: number;
  percentage: number;
}

// After unwrapping in api.ts, trend data arrives as CostDataPoint[]
export interface CostTrend {
  date: string;
  amount: number;
  provider?: string;
  service?: string;
}

// After unwrapping in api.ts, breakdown data arrives as CostBreakdownItem[]
export interface CostBreakdown {
  name: string;
  amount: number;
  percentage: number;
}

export interface Budget {
  id: string;
  organization_id: string;
  name: string;
  amount: string;
  currency: string;
  period: string;
  filters: Record<string, unknown>;
  thresholds: number[];
  status: string;
  current_spend: string;
  forecasted_spend: string | null;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
}

export interface CreateBudgetRequest {
  name: string;
  amount: number;
  currency: string;
  period: string;
  start_date: string;
  end_date: string;
  filters?: Record<string, unknown>;
  thresholds?: number[];
}

export interface Anomaly {
  id: string;
  organization_id: string;
  date: string;
  actual_amount: string;
  expected_amount: string;
  deviation: string;
  deviation_pct: string;
  score: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: string;
  provider: string;
  service: string;
  account_id: string;
  region: string;
  root_cause: string | null;
  notes: string | null;
  detected_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
}

// Matches backend AnomalySummary struct
export interface AnomalySummary {
  total: number;
  open: number;
  acknowledged: number;
  resolved: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  total_impact: number;
  currency: string;
}

// Matches backend Recommendation struct (rec_type serialized as "type")
export interface Recommendation {
  id: string;
  organization_id: string;
  rec_type: string;
  provider: string;
  account_id: string;
  region: string;
  resource_id: string;
  resource_type: string;
  current_config: Record<string, unknown>;
  recommended_config: Record<string, unknown>;
  estimated_savings: string;
  estimated_savings_pct: string;
  currency: string;
  impact: string;
  effort: string;
  risk: string;
  status: string;
  details: Record<string, unknown>;
  notes: string | null;
  confidence: string | null;
  severity: string | null;
  resource_arn: string | null;
  created_at: string;
}

// Matches backend RecommendationSummary struct
export interface RecommendationSummary {
  total_count: number;
  pending_count: number;
  implemented_count: number;
  dismissed_count: number;
  total_savings: number;
  implemented_savings: number;
  by_type: Record<string, number>;
  by_impact: Record<string, number>;
  currency: string;
}

export interface Forecast {
  id: string;
  organization_id: string;
  generated_at: string;
  model_version: string;
  granularity: string;
  predictions: ForecastPrediction[];
  total_forecasted: string;
  confidence_level: string;
  currency: string;
}

export interface ForecastPrediction {
  date: string;
  predicted: number;
  lower_bound: number;
  upper_bound: number;
}

export interface CloudProvider {
  id: string;
  organization_id: string;
  provider_type: 'aws' | 'azure' | 'gcp';
  name: string;
  enabled: boolean;
  status: string;
  status_message: string | null;
  last_sync_at: string | null;
  created_at: string;
}

export interface CreateProviderRequest {
  provider_type: 'aws' | 'azure' | 'gcp';
  name: string;
  credentials: Record<string, string>;
}

export interface RemediationAction {
  id: string;
  organization_id: string;
  recommendation_id: string | null;
  action_type: string;
  status: string;
  provider: string;
  account_id: string;
  region: string;
  resource_id: string;
  resource_type: string;
  description: string;
  current_state: Record<string, unknown>;
  desired_state: Record<string, unknown>;
  estimated_savings: string;
  currency: string;
  risk: string;
  auto_approved: boolean;
  requested_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  executed_at: string | null;
  completed_at: string | null;
  failure_reason: string | null;
  created_at: string;
}

// Matches backend RemediationSummary struct
export interface RemediationSummary {
  total: number;
  pending_approval: number;
  approved: number;
  executing: number;
  completed: number;
  failed: number;
  total_estimated_savings: number;
  total_realized_savings: number;
  currency: string;
}

export interface Policy {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  policy_type: string;
  enforcement_mode: string;
  enabled: boolean;
  conditions: Record<string, unknown>;
  providers: string[];
  environments: string[];
  violation_count: number;
  last_evaluated_at: string | null;
  created_at: string;
}

export interface PolicyViolation {
  id: string;
  policy_id: string;
  policy_name: string;
  status: string;
  provider: string;
  account_id: string;
  region: string;
  resource_id: string;
  resource_type: string;
  description: string;
  severity: string;
  detected_at: string;
}

export interface ExecutiveSummary {
  total_cost: number;
  cost_change_pct: number;
  total_savings_identified: number;
  total_savings_realized: number;
  active_anomalies: number;
  budget_utilization: number;
  top_services: Array<{ service: string; amount: number }>;
  cost_by_provider: Record<string, number>;
}

export interface CostComparison {
  current_period: { start: string; end: string; total: number };
  previous_period: { start: string; end: string; total: number };
  change_amount: number;
  change_pct: number;
  by_service: Array<{
    service: string;
    current: number;
    previous: number;
    change_pct: number;
  }>;
}

export interface OrgSettings {
  id: string;
  name: string;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AutoApprovalRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: {
    max_savings?: number;
    allowed_types?: string[];
    allowed_risks?: string[];
  };
  created_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
  };
}

export interface WsMessage {
  type: string;
  org_id: string;
  data: unknown;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  response: string;
  intent: string;
  data?: unknown;
}

export interface AiCostSummary {
  total_ai_spend: number;
  currency: string;
  start_date: string;
  end_date: string;
  by_service: CostBreakdown[];
  trend: Array<{ date: string; amount: number }>;
  ai_share_pct: number;
}

export interface RegionCarbon {
  region: string;
  spend: number;
  kwh: number;
  co2_kg: number;
  coefficient: number;
}

export interface CarbonTrendPoint {
  month: string;
  co2_kg: number;
  spend: number;
}

export interface CarbonReport {
  total_co2_kg: number;
  total_kwh: number;
  total_spend: number;
  currency: string;
  start_date: string;
  end_date: string;
  by_region: RegionCarbon[];
  trend: CarbonTrendPoint[];
}
