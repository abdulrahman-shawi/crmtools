import DynamicCard from "@/components/ui/dynamicCard";
import dynamic from "next/dynamic";
import { SectionHeader } from "@/components/ui/section-header";
import { salesStatusSummary } from "@/lib/data/mock-crm";

const SalesChart = dynamic(() => import("@/components/SalesChart"), {
  ssr: false,
});

/**
 * Sales analytics page showing status distribution chart.
 */
export default function SalesPage() {
  return (
    <section className="space-y-6">
      <SectionHeader
        align="right"
        title="تحليلات المبيعات"
        description="توزيع الإيرادات حسب حالة الطلبات داخل دورة البيع."
      />

      <DynamicCard>
        <DynamicCard.Content>
          <SalesChart data={salesStatusSummary} />
        </DynamicCard.Content>
      </DynamicCard>
    </section>
  );
}
