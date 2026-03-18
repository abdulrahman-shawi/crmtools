export type SubscriptionPlanId = "starter" | "growth" | "scale";

export type FeatureKey =
  | "advanced_reports"
  | "api_access"
  | "team_management"
  | "pipeline_automation"
  | "priority_support"
  | "multi_branch";

export interface SubscriptionLimits {
  maxUsers: number;
  maxCustomers: number;
  maxDealsPerMonth: number;
  maxBranches: number;
}

export interface SubscriptionPlan {
  id: SubscriptionPlanId;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: FeatureKey[];
  limits: SubscriptionLimits;
}

export interface TenantSubscription {
  planId: SubscriptionPlanId;
  status: "trial" | "active" | "past_due" | "canceled";
  renewsAt: string;
  startedAt: string;
}

export interface UsageSnapshot {
  users: number;
  customers: number;
  dealsThisMonth: number;
  branches: number;
}

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  industry: string;
  subscription: TenantSubscription;
  usage: UsageSnapshot;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  status: "lead" | "qualified" | "customer";
  annualValue: number;
  createdAt: string;
}

export interface SalesStatusSummary {
  status: string;
  _sum: {
    finalAmount: number;
  };
}
