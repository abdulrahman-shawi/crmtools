import { LeavesManager } from "@/components/hr/leaves-manager";
import { leaveRequests, leaveBalances } from "@/lib/data/mock-hr";

/**
 * Leaves management page - displays leave requests and balances.
 */
export default function HrLeavesPage() {
  return <LeavesManager initialRequests={leaveRequests} initialBalances={leaveBalances} />;
}
