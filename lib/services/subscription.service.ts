import { SUBSCRIPTION_PLANS } from "@/lib/config/subscription-plans";
import type { FeatureKey, SubscriptionPlan, Tenant, UsageSnapshot } from "@/lib/types/crm";

/**
 * Finds plan by id and returns undefined when not found.
 */
export function getPlanById(planId: SubscriptionPlan["id"]): SubscriptionPlan | undefined {
  return SUBSCRIPTION_PLANS.find((plan) => plan.id === planId);
}

/**
 * Resolves current tenant plan. Throws for invalid configuration.
 */
export function getTenantPlan(tenant: Tenant): SubscriptionPlan {
  const plan = getPlanById(tenant.subscription.planId);
  if (!plan) {
    throw new Error(`Invalid plan id: ${tenant.subscription.planId}`);
  }
  return plan;
}

/**
 * Returns true if tenant plan includes a feature flag.
 */
export function hasFeature(tenant: Tenant, feature: FeatureKey): boolean {
  const plan = getTenantPlan(tenant);
  return plan.features.includes(feature);
}

/**
 * Returns percentage usage for each tracked metric.
 */
export function getUsageProgress(tenant: Tenant): Record<keyof UsageSnapshot, number> {
  const plan = getTenantPlan(tenant);

  return {
    users: Math.round((tenant.usage.users / plan.limits.maxUsers) * 100),
    customers: Math.round((tenant.usage.customers / plan.limits.maxCustomers) * 100),
    dealsThisMonth: Math.round((tenant.usage.dealsThisMonth / plan.limits.maxDealsPerMonth) * 100),
    branches: Math.round((tenant.usage.branches / plan.limits.maxBranches) * 100),
  };
}

/**
 * Determines whether tenant can add a new customer under current plan limits.
 */
export function canAddCustomer(tenant: Tenant): boolean {
  const plan = getTenantPlan(tenant);
  return tenant.usage.customers < plan.limits.maxCustomers;
}
