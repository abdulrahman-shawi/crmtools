import { Activity, BadgeCheck, Gauge, UsersRound } from "lucide-react";
import DynamicCard from "@/components/ui/dynamicCard";
import { SectionHeader } from "@/components/ui/section-header";
import { demoTenant } from "@/lib/data/mock-crm";
import { getTenantPlan, getUsageProgress } from "@/lib/services/subscription.service";

/**
 * CRM dashboard entry page with subscription-aware overview.
 */
export default function DashboardPage() {
  const plan = getTenantPlan(demoTenant);
  const usageProgress = getUsageProgress(demoTenant);

  return (
    <section className="space-y-6">
      <SectionHeader
        align="right"
        title="لوحة التحكم"
        description="نظرة سريعة على الخطة الحالية، استخدام النظام، وحدود الاشتراك بشكل واضح وقابل للإدارة."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DynamicCard>
          <DynamicCard.Header title="الخطة الحالية" icon={<BadgeCheck className="h-5 w-5" />} />
          <DynamicCard.Content>
            <p className="text-2xl font-bold">{plan.name}</p>
            <p className="text-sm text-slate-500">الحالة: {demoTenant.subscription.status}</p>
          </DynamicCard.Content>
        </DynamicCard>

        <DynamicCard>
          <DynamicCard.Header title="المستخدمون" icon={<UsersRound className="h-5 w-5" />} />
          <DynamicCard.Content>
            <p className="text-2xl font-bold">{demoTenant.usage.users}</p>
            <p className="text-sm text-slate-500">الحد الأقصى: {plan.limits.maxUsers}</p>
          </DynamicCard.Content>
        </DynamicCard>

        <DynamicCard>
          <DynamicCard.Header title="العملاء" icon={<Activity className="h-5 w-5" />} />
          <DynamicCard.Content>
            <p className="text-2xl font-bold">{demoTenant.usage.customers.toLocaleString()}</p>
            <p className="text-sm text-slate-500">الحد الأقصى: {plan.limits.maxCustomers.toLocaleString()}</p>
          </DynamicCard.Content>
        </DynamicCard>

        <DynamicCard>
          <DynamicCard.Header title="الصفقات الشهرية" icon={<Gauge className="h-5 w-5" />} />
          <DynamicCard.Content>
            <p className="text-2xl font-bold">{demoTenant.usage.dealsThisMonth.toLocaleString()}</p>
            <p className="text-sm text-slate-500">الحد الأقصى: {plan.limits.maxDealsPerMonth.toLocaleString()}</p>
          </DynamicCard.Content>
        </DynamicCard>
      </div>

      <DynamicCard>
        <DynamicCard.Header
          title="نسب الاستخدام"
          description="مؤشر سريع لمعرفة اقترابك من حدود الاشتراك الحالية"
        />
        <DynamicCard.Content>
          <div className="space-y-4">
            {Object.entries(usageProgress).map(([metric, percent]) => (
              <div key={metric}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium capitalize">{metric}</span>
                  <span className="text-slate-500">{percent}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-500"
                    style={{ width: `${Math.min(percent, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </DynamicCard.Content>
      </DynamicCard>
    </section>
  );
}
