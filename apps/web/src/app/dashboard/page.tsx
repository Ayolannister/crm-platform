import { Suspense } from "react";
import DashboardContent from "./dashboard-content";

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center bg-[#090909]">
        <div className="text-center">
          <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-3 border-[#b9ff45] border-t-transparent" />
          <p className="text-sm text-zinc-500">Loading your Infiniti workspace...</p>
        </div>
      </main>
    }>
      <DashboardContent />
    </Suspense>
  );
}
