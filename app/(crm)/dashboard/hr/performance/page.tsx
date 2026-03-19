import DynamicCard from "@/components/ui/dynamicCard";
import { SectionHeader } from "@/components/ui/section-header";
import PerformanceTable from "@/components/hr/performance-table";
import KPIsTable from "@/components/hr/kpis-table";
import { performanceReviews, kpis } from "@/lib/data/mock-hr";

/**
 * Performance review page - displays employee ratings and KPIs.
 */
export default function HrPerformancePage() {
  const avgRating = performanceReviews.length > 0
    ? (performanceReviews.reduce((sum, r) => sum + r.managerRating, 0) / performanceReviews.length).toFixed(2)
    : 0;

  const completedGoals = performanceReviews.reduce((sum, r) => sum + r.achievedGoals, 0);
  const totalGoals = performanceReviews.reduce((sum, r) => sum + r.goals.length, 0);

  return (
    <section className="space-y-6">
      <SectionHeader
        align="right"
        title="تقييم الأداء"
        description="ملخص تقييمات الأداء وكفاءات الموظفين ومؤشرات الأداء الرئيسية."
      />

      {/* Performance Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <DynamicCard className="bg-gradient-to-br from-yellow-50 to-amber-50">
          <DynamicCard.Content className="py-4">
            <div className="space-y-2">
              <p className="text-sm text-slate-600">متوسط التقييم</p>
              <p className="text-3xl font-bold text-amber-600">⭐ {avgRating}</p>
              <p className="text-xs text-slate-500">من 5</p>
            </div>
          </DynamicCard.Content>
        </DynamicCard>

        <DynamicCard className="bg-gradient-to-br from-green-50 to-emerald-50">
          <DynamicCard.Content className="py-4">
            <div className="space-y-2">
              <p className="text-sm text-slate-600">الأهداف المكتملة</p>
              <p className="text-3xl font-bold text-green-600">{completedGoals}</p>
              <p className="text-xs text-slate-500">من {totalGoals}</p>
            </div>
          </DynamicCard.Content>
        </DynamicCard>

        <DynamicCard className="bg-gradient-to-br from-blue-50 to-indigo-50">
          <DynamicCard.Content className="py-4">
            <div className="space-y-2">
              <p className="text-sm text-slate-600">عدد التقييمات</p>
              <p className="text-3xl font-bold text-blue-600">{performanceReviews.length}</p>
              <p className="text-xs text-slate-500">في الربع الحالي</p>
            </div>
          </DynamicCard.Content>
        </DynamicCard>

        <DynamicCard className="bg-gradient-to-br from-purple-50 to-pink-50">
          <DynamicCard.Content className="py-4">
            <div className="space-y-2">
              <p className="text-sm text-slate-600">نسبة الإنجاز</p>
              <p className="text-3xl font-bold text-purple-600">
                {totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0}%
              </p>
              <p className="text-xs text-slate-500">للأهداف المعينة</p>
            </div>
          </DynamicCard.Content>
        </DynamicCard>
      </div>

      {/* Performance Reviews Table */}
      <DynamicCard>
        <DynamicCard.Header
          title="تقييمات الأداء"
          description="تقييمات الإدارة والزملاء لكل موظف"
        />
        <DynamicCard.Content className="pt-4">
          <PerformanceTable data={performanceReviews} />
        </DynamicCard.Content>
      </DynamicCard>

      {/* KPIs Table */}
      <DynamicCard>
        <DynamicCard.Header
          title="مؤشرات الأداء الرئيسية (KPIs)"
          description="تتبع مؤشرات الأداء والتقدم نحو الأهداف"
        />
        <DynamicCard.Content className="pt-4">
          <KPIsTable data={kpis} />
        </DynamicCard.Content>
      </DynamicCard>
    </section>
  );
}
