"use client";

import { useMemo, useState } from "react";
import { Plus, StepBack, StepForward } from "lucide-react";
import toast from "react-hot-toast";
import DynamicCard from "@/components/ui/dynamicCard";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { hrCandidates } from "@/lib/data/mock-hr";
import type { HrCandidate } from "@/lib/types/hr";

const columns: Array<{ key: HrCandidate["stage"]; title: string }> = [
  { key: "new", title: "طلبات جديدة" },
  { key: "screening", title: "فرز أولي" },
  { key: "interview", title: "مقابلات" },
  { key: "offer", title: "عروض" },
];

const stageOrder: HrCandidate["stage"][] = ["new", "screening", "interview", "offer"];

interface CandidateFormState {
  fullName: string;
  role: string;
  score: string;
}

const initialFormState: CandidateFormState = {
  fullName: "",
  role: "",
  score: "70",
};

/**
 * Renders recruitment pipeline board for candidates.
 */
export default function HrRecruitmentPage() {
  const [candidates, setCandidates] = useState<HrCandidate[]>(hrCandidates);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formState, setFormState] = useState<CandidateFormState>(initialFormState);

  /**
   * Moves candidate to previous or next recruitment stage.
   */
  const moveStage = (candidateId: string, direction: "prev" | "next") => {
    setCandidates((prev) =>
      prev.map((candidate) => {
        if (candidate.id !== candidateId) {
          return candidate;
        }

        const currentIndex = stageOrder.indexOf(candidate.stage);
        const targetIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;

        if (targetIndex < 0 || targetIndex >= stageOrder.length) {
          return candidate;
        }

        return { ...candidate, stage: stageOrder[targetIndex] };
      })
    );
    toast.success("تم نقل المرشح بين المراحل");
  };

  /**
   * Adds new candidate to recruitment pipeline.
   */
  const addCandidate = () => {
    if (!formState.fullName.trim() || !formState.role.trim()) {
      toast.error("يرجى إدخال اسم المرشح والوظيفة");
      return;
    }

    const score = Number(formState.score);
    if (Number.isNaN(score) || score < 0 || score > 100) {
      toast.error("الدرجة يجب أن تكون بين 0 و100");
      return;
    }

    const newCandidate: HrCandidate = {
      id: `can_${Date.now()}`,
      fullName: formState.fullName.trim(),
      role: formState.role.trim(),
      stage: "new",
      score,
      appliedAt: new Date().toISOString().slice(0, 10),
    };

    setCandidates((prev) => [newCandidate, ...prev]);
    setFormState(initialFormState);
    setIsModalOpen(false);
    toast.success("تمت إضافة المرشح");
  };

  const countsByStage = useMemo(() => {
    return columns.reduce<Record<HrCandidate["stage"], number>>(
      (acc, column) => {
        acc[column.key] = candidates.filter((candidate) => candidate.stage === column.key).length;
        return acc;
      },
      { new: 0, screening: 0, interview: 0, offer: 0 }
    );
  }, [candidates]);

  return (
    <section className="space-y-6">
      <SectionHeader
        align="right"
        title="التوظيف"
        description="لوحة مبسطة لمتابعة المتقدمين حسب مرحلة التوظيف."
      >
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setIsModalOpen(true)}>
          إضافة مرشح
        </Button>
      </SectionHeader>

      <div className="grid gap-4 lg:grid-cols-4">
        {columns.map((column) => {
          const items = candidates.filter((candidate) => candidate.stage === column.key);

          return (
            <DynamicCard key={column.key} className="bg-slate-50/80">
              <DynamicCard.Header
                title={column.title}
                description={`${countsByStage[column.key]} مرشح`}
              />
              <DynamicCard.Content className="space-y-3">
                {items.map((candidate) => (
                  <div key={candidate.id} className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-slate-900">{candidate.fullName}</p>
                      <div className="flex items-center gap-1">
                        <button
                          className="rounded-md border border-slate-200 p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                          disabled={candidate.stage === "new"}
                          onClick={() => moveStage(candidate.id, "prev")}
                          title="المرحلة السابقة"
                        >
                          <StepBack className="h-4 w-4" />
                        </button>
                        <button
                          className="rounded-md border border-slate-200 p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                          disabled={candidate.stage === "offer"}
                          onClick={() => moveStage(candidate.id, "next")}
                          title="المرحلة التالية"
                        >
                          <StepForward className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500">{candidate.role}</p>
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className="rounded-full bg-blue-50 px-2 py-1 font-semibold text-blue-700">
                        Score: {candidate.score}
                      </span>
                      <span className="text-slate-400">{candidate.appliedAt}</span>
                    </div>
                  </div>
                ))}

                {items.length === 0 && (
                  <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-400">
                    لا يوجد مرشحين
                  </p>
                )}
              </DynamicCard.Content>
            </DynamicCard>
          );
        })}
      </div>

      <AppModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="إضافة مرشح"
        size="md"
        footer={
          <>
            <Button onClick={addCandidate}>إضافة</Button>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              إلغاء
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-3">
          <input
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            placeholder="اسم المرشح"
            value={formState.fullName}
            onChange={(e) => setFormState((prev) => ({ ...prev, fullName: e.target.value }))}
          />
          <input
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            placeholder="الوظيفة"
            value={formState.role}
            onChange={(e) => setFormState((prev) => ({ ...prev, role: e.target.value }))}
          />
          <input
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            placeholder="الدرجة (0-100)"
            value={formState.score}
            onChange={(e) => setFormState((prev) => ({ ...prev, score: e.target.value }))}
          />
        </div>
      </AppModal>
    </section>
  );
}
