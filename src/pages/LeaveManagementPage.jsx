import ComingSoonPage from "../components/ComingSoonPage";

export default function LeaveManagementPage() {
  return (
    <ComingSoonPage
      icon="🏖"
      title="Leave Management"
      description="Manage employee leave requests, balances, and approvals with a clear audit trail. Automatically reflect approved leave in attendance and payroll."
      features={[
        "Leave request & approval workflow",
        "Annual, sick, and emergency leave types",
        "Leave balance tracking per employee",
        "Calendar view of team leave",
        "Integration with payroll (auto deduct)",
        "Manager approval / rejection with notes",
      ]}
    />
  );
}
