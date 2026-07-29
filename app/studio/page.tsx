import { SiteNav } from "@/components/site-nav";
import { StudioDashboard } from "@/components/studio-dashboard";

export const metadata = { title: "卡片工坊" };

export default function StudioPage() {
  return (
    <>
      <SiteNav />
      <main>
        <StudioDashboard />
      </main>
    </>
  );
}
