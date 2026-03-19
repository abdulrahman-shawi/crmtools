import Link from "next/link";
import { Building2, Boxes, ClipboardList, PackageSearch } from "lucide-react";
import DynamicCard from "@/components/ui/dynamicCard";
import { SectionHeader } from "@/components/ui/section-header";
import { crmEnterpriseNavigation } from "@/lib/data/mock-crm-enterprise";

const iconBySlug: Record<string, React.ReactNode> = {
  customers: <Building2 className="h-5 w-5" />,
  products: <Boxes className="h-5 w-5" />,
  orders: <ClipboardList className="h-5 w-5" />,
};

/**
 * CRM enterprise modules index page.
 */
export default function CrmEnterprisePage() {
  return (
    <section className="space-y-6" dir="rtl">
      <SectionHeader
        align="right"
        title="CRM للشركات المتوسطة والكبيرة"
        description="منصة تشغيل متكاملة: عملاء، منتجات، تواصل، حالات، تصنيفات، طلبات، مصاريف، حركة صندوق، مخازن، شحن والمزيد."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {crmEnterpriseNavigation.map((module) => (
          <Link key={module.slug} href={`/dashboard/crm-enterprise/${module.slug}`}>
            <DynamicCard className="h-full border border-slate-200 transition hover:-translate-y-0.5 hover:shadow-md">
              <DynamicCard.Content className="space-y-3">
                <div className="flex items-center gap-2 text-blue-700">
                  {iconBySlug[module.slug] ?? <PackageSearch className="h-5 w-5" />}
                  <p className="font-semibold text-slate-900">{module.title}</p>
                </div>
                <p className="text-sm text-slate-600">{module.description}</p>
              </DynamicCard.Content>
            </DynamicCard>
          </Link>
        ))}
      </div>
    </section>
  );
}
