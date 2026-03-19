import { SelfServiceManager } from "@/components/hr/self-service-manager";
import { payslips, employeeDocuments, internalAnnouncements } from "@/lib/data/mock-hr";

/**
 * Employee self-service page - payslips, documents, and announcements.
 */
export default function HrSelfServicePage() {
  return (
    <SelfServiceManager
      initialPayslips={payslips}
      initialDocuments={employeeDocuments}
      initialAnnouncements={internalAnnouncements}
    />
  );
}
