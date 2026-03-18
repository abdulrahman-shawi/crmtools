import { Check } from "lucide-react";
import DynamicCard from "@/components/ui/dynamicCard";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { SUBSCRIPTION_PLANS } from "@/lib/config/subscription-plans";
import { demoTenant } from "@/lib/data/mock-crm";
import { getTenantPlan, hasFeature } from "@/lib/services/subscription.service";
import type { FeatureKey } from "@/lib/types/crm";

const featureLabels: Record<FeatureKey, string> = {
  advanced_reports: "Advanced Reports",
  api_access: "API Access",
  team_management: "Team Management",
  pipeline_automation: "Pipeline Automation",
  priority_support: "Priority Support",
  multi_branch: "Multi-Branch",
};

/**
 * Subscriptions page for plan comparison and feature gating visibility.
 */
export default function SubscriptionsPage() {
  const activePlan = getTenantPlan(demoTenant);

  return (
    <section className="space-y-6">
      <SectionHeader
        align="right"
        title="الاشتراكات والفوترة"
        description="إدارة الباقات والحدود والميزات المفعلة لكل عميل أو شركة داخل النظام."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {SUBSCRIPTION_PLANS.map((plan) => {
          const isCurrent = plan.id === activePlan.id;
          return (
            <DynamicCard
              key={plan.id}
              className={isCurrent ? "ring-2 ring-sky-500" : undefined}
              variant={isCurrent ? "glass" : "default"}
            >
              <DynamicCard.Header
                title={plan.name}
                description={isCurrent ? "Current Plan" : "Available Plan"}
              />
              <DynamicCard.Content className="space-y-4">
                <p className="text-3xl font-black">${plan.monthlyPrice}</p>
                <p className="text-sm text-slate-500">Billed monthly · ${plan.yearlyPrice}/year</p>

                <ul className="space-y-2 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-600" />
                      <span>{featureLabels[feature]}</span>
                    </li>
                  ))}
                </ul>

                <div className="rounded-xl bg-slate-50 p-3 text-sm">
                  <p>Users: {plan.limits.maxUsers}</p>
                  <p>Customers: {plan.limits.maxCustomers.toLocaleString()}</p>
                  <p>Deals/Month: {plan.limits.maxDealsPerMonth.toLocaleString()}</p>
                  <p>Branches: {plan.limits.maxBranches}</p>
                </div>

                <Button variant={isCurrent ? "secondary" : "primary"} className="w-full">
                  {isCurrent ? "Current" : "Upgrade"}
                </Button>
              </DynamicCard.Content>
            </DynamicCard>
          );
        })}
      </div>

      <DynamicCard>
        <DynamicCard.Header title="Feature Access Snapshot" />
        <DynamicCard.Content>
          <div className="grid gap-2 md:grid-cols-2">
            {(Object.keys(featureLabels) as FeatureKey[]).map((feature) => (
              <div key={feature} className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
                <span className="text-sm">{featureLabels[feature]}</span>
                <span className={hasFeature(demoTenant, feature) ? "text-emerald-600" : "text-slate-400"}>
                  {hasFeature(demoTenant, feature) ? "Enabled" : "Not Enabled"}
                </span>
              </div>
            ))}
          </div>
        </DynamicCard.Content>
      </DynamicCard>
    </section>
  );
}
