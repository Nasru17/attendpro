import ComingSoonPage from "../components/ComingSoonPage";

export default function PermitTrackingPage() {
  return (
    <ComingSoonPage
      icon="📋"
      title="Permit Tracking"
      description="Stay on top of work permits, visas, and compliance documents for all employees. Get alerts before expiry dates so nothing lapses unnoticed."
      features={[
        "Work permit & visa record management",
        "Expiry date alerts & reminders",
        "Document upload & storage",
        "Renewal workflow tracking",
        "Per-employee permit history",
        "Compliance status dashboard",
      ]}
    />
  );
}
