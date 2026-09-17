import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ContractAnalysisResult } from '@/types/change';
import { FileSearch, Gauge, Scale, Sparkles } from 'lucide-react';

interface AIAnalysisPanelProps {
  analysis: ContractAnalysisResult | null;
}

export const AIAnalysisPanel: React.FC<AIAnalysisPanelProps> = ({ analysis }) => {
  if (!analysis) {
    return (
      <Card className="border-slate-200 bg-slate-50/60">
        <CardContent className="flex items-center gap-3 p-5">
          <Sparkles className="h-5 w-5 text-amber-500" />
          <div>
            <p className="text-sm font-bold text-slate-800">AI analysis has not been run in this session</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Run the compliance scan to extract document evidence, compare semantic scope, and calculate risk.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const similarity = analysis.drift.scope_similarity;
  const similarityPercent = similarity === null || similarity === undefined ? null : Math.round(similarity * 100);

  return (
    <Card className="border-blue-200 bg-blue-50/30 shadow-sm">
      <CardHeader className="flex items-start justify-between gap-3 border-b border-blue-100">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-600" />
            Latest AI Compliance Analysis
          </CardTitle>
          <p className="mt-1 text-xs text-slate-500">Calculated by the server-side document and risk pipeline.</p>
        </div>
        <span className="rounded-full border border-blue-200 bg-white px-2 py-1 text-[10px] font-bold uppercase text-blue-700">
          {analysis.risk.level} · {Math.round(analysis.risk.score)}/100
        </span>
      </CardHeader>
      <CardContent className="grid gap-3 p-4 sm:grid-cols-3">
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="flex items-center gap-2 text-slate-500">
            <Scale className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-wide">Semantic scope</span>
          </div>
          <p className="mt-2 text-xl font-black text-slate-900">
            {similarityPercent === null ? '—' : `${similarityPercent}%`}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">Baseline-to-amendment similarity</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="flex items-center gap-2 text-slate-500">
            <Gauge className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-wide">Risk factors</span>
          </div>
          <p className="mt-2 text-xl font-black text-slate-900">{analysis.risk_factors.length}</p>
          <p className="mt-1 text-[11px] text-slate-500">Weighted signals included</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="flex items-center gap-2 text-slate-500">
            <FileSearch className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-wide">Evidence</span>
          </div>
          <p className="mt-2 text-xl font-black text-slate-900">{analysis.evidence.length}</p>
          <p className="mt-1 text-[11px] text-slate-500">Citations returned by extraction</p>
        </div>
      </CardContent>
    </Card>
  );
};