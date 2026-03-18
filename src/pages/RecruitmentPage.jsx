import ComingSoonPage from "../components/ComingSoonPage";

export default function RecruitmentPage() {
  return (
    <ComingSoonPage
      icon="👔"
      title="Recruitment"
      description="Streamline your hiring process from job posting to onboarding. Track candidates, schedule interviews, and manage offers all in one place."
      features={[
        "Job posting management",
        "Application & candidate tracking",
        "Interview scheduling",
        "Offer letter generation",
        "Onboarding checklist & document collection",
        "Headcount planning",
      ]}
    />
  );
}
