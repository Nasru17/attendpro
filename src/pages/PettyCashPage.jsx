import ComingSoonPage from "../components/ComingSoonPage";

export default function PettyCashPage() {
  return (
    <ComingSoonPage
      icon="💵"
      title="Petty Cash"
      description="Track petty cash requests, disbursements, and replenishments across all sites. Keep a clear record of every expense with receipts and approvals."
      features={[
        "Cash request & approval workflow",
        "Per-site petty cash float tracking",
        "Expense categorisation",
        "Receipt attachment support",
        "Replenishment requests",
        "Monthly expense summary & reports",
      ]}
    />
  );
}
