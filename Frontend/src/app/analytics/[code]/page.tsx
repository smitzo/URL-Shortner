import type { Metadata } from "next";
import { AnalyticsDashboard } from "@/features/analytics/analytics-dashboard";

type AnalyticsPageProps = {
  params: Promise<{
    code: string;
  }>;
};

export async function generateMetadata({ params }: AnalyticsPageProps): Promise<Metadata> {
  const { code } = await params;

  return {
    title: `Analytics for ${code}`
  };
}

export default async function AnalyticsPage({ params }: AnalyticsPageProps) {
  const { code } = await params;

  return <AnalyticsDashboard code={code} />;
}
