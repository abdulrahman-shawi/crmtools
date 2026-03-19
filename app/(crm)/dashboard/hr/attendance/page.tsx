import { AttendanceTable } from "@/components/hr/attendance-table";
import { SectionHeader } from "@/components/ui/section-header";
import { hrAttendance } from "@/lib/data/mock-hr";

/**
 * Renders HR attendance tracking page.
 */
export default function HrAttendancePage() {
  return (
    <section className="space-y-6">
      <SectionHeader
        align="right"
        title="الحضور والانصراف"
        description="متابعة حالة الحضور اليومية وساعات العمل لكل موظف."
      />

      <AttendanceTable data={hrAttendance} />
    </section>
  );
}
