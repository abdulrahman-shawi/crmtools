import Link from "next/link";
import { CalendarCheck2, ReceiptText, ShieldCheck, UserRoundPlus, Users } from "lucide-react";
import DynamicCard from "@/components/ui/dynamicCard";
import { SectionHeader } from "@/components/ui/section-header";
import { hrSummary } from "@/lib/data/mock-hr";

/**
 * Renders HR overview dashboard with quick module navigation.
 */
export default function HrDashboardPage() {
  const quickLinks = [
    { title: "الموظفون", href: "/dashboard/hr/employees", icon: Users },
    { title: "الحضور", href: "/dashboard/hr/attendance", icon: CalendarCheck2 },
    { title: "الرواتب", href: "/dashboard/hr/payroll", icon: ReceiptText },
    { title: "التوظيف", href: "/dashboard/hr/recruitment", icon: UserRoundPlus },
    { title: "صلاحيات الفريق", href: "/dashboard/hr/team-permissions", icon: ShieldCheck },
  ];

  return (
    <section className="space-y-6">
      <SectionHeader
        align="right"
        title="وحدة الموارد البشرية"
        description="إدارة الموظفين والحضور والرواتب والتوظيف من مكان واحد داخل نظام الـ CRM."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DynamicCard>
          <DynamicCard.Header title="عدد الموظفين" icon={<Users className="h-5 w-5" />} />
          <DynamicCard.Content>
            <p className="text-3xl font-black">{hrSummary.employeesCount}</p>
          </DynamicCard.Content>
        </DynamicCard>

        <DynamicCard>
          <DynamicCard.Header title="الوظائف المفتوحة" icon={<UserRoundPlus className="h-5 w-5" />} />
          <DynamicCard.Content>
            <p className="text-3xl font-black">{hrSummary.openPositions}</p>
          </DynamicCard.Content>
        </DynamicCard>

        <DynamicCard>
          <DynamicCard.Header title="الحضور اليوم" icon={<CalendarCheck2 className="h-5 w-5" />} />
          <DynamicCard.Content>
            <p className="text-3xl font-black">{hrSummary.presentToday}</p>
          </DynamicCard.Content>
        </DynamicCard>

        <DynamicCard>
          <DynamicCard.Header title="رواتب معلقة" icon={<ReceiptText className="h-5 w-5" />} />
          <DynamicCard.Content>
            <p className="text-3xl font-black">{hrSummary.pendingPayroll}</p>
          </DynamicCard.Content>
        </DynamicCard>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group rounded-2xl border border-slate-200 bg-white px-4 py-5 transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg"
          >
            <div className="mb-3 inline-flex rounded-xl bg-blue-50 p-2 text-blue-600">
              <link.icon className="h-5 w-5" />
            </div>
            <p className="font-bold text-slate-900">{link.title}</p>
            <p className="mt-1 text-xs text-slate-500">عرض وإدارة البيانات</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
