"use client";

import { useState } from "react";
import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";

/**
 * Renders CRM workspace using the provided navbar and sidebar components.
 */
export function CrmShell({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#dff6ff_0,_#f3f7ff_38%,_#f8fbff_64%,_#ffffff_100%)] text-slate-900" dir="rtl">
      <div className="relative flex min-h-screen bg-transparent">
        <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

        <div
          className={`min-w-0 flex-1 transition-all duration-500 ${
            isCollapsed ? "md:mr-[88px]" : "md:mr-[280px]"
          }`}
        >
          <Navbar onMenuClick={() => setIsCollapsed((prev) => !prev)} />
          <main className="px-3 py-4 md:px-6 md:py-6">
            <div className="mx-auto w-full max-w-6xl rounded-[2rem] border border-sky-100/80 bg-white/95 p-4 shadow-[0_20px_45px_rgba(15,23,42,0.08)] backdrop-blur md:p-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
