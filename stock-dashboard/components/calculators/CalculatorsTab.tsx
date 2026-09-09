"use client";

import PositionSizing from "@/components/calculators/PositionSizing";
import CostBasis from "@/components/calculators/CostBasis";
import CopyTrade from "@/components/calculators/CopyTrade";
import RetirementRollover from "@/components/calculators/RetirementRollover";
import type { InsiderTrade } from "@/lib/types";

export default function CalculatorsTab({
  prefill,
  onConsumePrefill,
}: {
  prefill: InsiderTrade | null;
  onConsumePrefill: () => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6">
      <RetirementRollover />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PositionSizing />
        <CostBasis />
      </div>
      <CopyTrade prefill={prefill} onConsumePrefill={onConsumePrefill} />
    </div>
  );
}