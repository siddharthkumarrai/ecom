import dynamic from "next/dynamic";

const AnalyticsDashboardClient = dynamic(
  () => import("@/components/admin/AnalyticsDashboardClient").then((mod) => mod.AnalyticsDashboardClient),
  {
    loading: () => (
      <section className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500">
        Loading analytics...
      </section>
    ),
    ssr: false,
  },
);

export default function AdminDashboardPage() {
  return <AnalyticsDashboardClient />;
}
