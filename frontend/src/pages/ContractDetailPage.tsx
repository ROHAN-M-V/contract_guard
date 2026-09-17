import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contractsService } from '@/services/contracts.service';
import { documentsService } from '@/services/documents.service';
import { reviewsService } from '@/services/reviews.service';
import { reportsService } from '@/services/reports.service';
import { RiskScoreCard } from '@/components/risk/RiskScoreCard';
import { RiskFactorsList } from '@/components/risk/RiskFactorsList';
import { AIAnalysisPanel } from '@/components/risk/AIAnalysisPanel';
import { ContractTimeline } from '@/components/timeline/ContractTimeline';
import { DocumentList } from '@/components/documents/DocumentList';
import { EvidencePanel } from '@/components/evidence/EvidencePanel';
import { ReviewModal } from '@/components/contracts/ReviewModal';
import { Tabs } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { AlertBanner } from '@/components/ui/Alert';
import {
  FileText,
  Clock,
  FileCheck2,
  FolderOpen,
  Sparkles,
  Download,
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  CheckCircle,
} from 'lucide-react';
import { ReviewDecisionType } from '@/types/review';
import { getStatusBadgeClasses, formatDate } from '@/lib/utils';

export const ContractDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('overview');
  const [selectedFactor, setSelectedFactor] = useState<string | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [analysisStatusMessage, setAnalysisStatusMessage] = useState<string | null>(null);
  const [latestAnalysis, setLatestAnalysis] = useState<import('@/types/change').ContractAnalysisResult | null>(null);

  // Queries
  const { data: contract, isLoading: isContractLoading } = useQuery({
    queryKey: ['contract', id],
    queryFn: () => contractsService.getContract(id!),
    enabled: Boolean(id),
  });

  const contractNum = contract?.contractNumber || contract?.contract_number || id || '';

  const { data: riskData } = useQuery({
    queryKey: ['contract-risk', contractNum],
    queryFn: () => contractsService.getRisk(contractNum),
    enabled: Boolean(contractNum),
  });

  const { data: versions = [] } = useQuery({
    queryKey: ['contract-versions', contractNum],
    queryFn: () => contractsService.getVersions(contractNum),
    enabled: Boolean(contractNum),
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['contract-documents', contractNum],
    queryFn: () => documentsService.getDocuments(contractNum),
    enabled: Boolean(contractNum),
  });

  const { data: evidence = [] } = useQuery({
    queryKey: ['contract-evidence', contractNum],
    queryFn: () => contractsService.getEvidence(contractNum),
    enabled: Boolean(contractNum),
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['contract-reviews', contractNum],
    queryFn: () => reviewsService.getReviews(contractNum),
    enabled: Boolean(contractNum),
  });

  // Mutations
  const reviewMutation = useMutation({
    mutationFn: (payload: { decision: ReviewDecisionType; notes: string }) =>
      reviewsService.createReview(contractNum, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract', id] });
      queryClient.invalidateQueries({ queryKey: ['contract-reviews', contractNum] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: () => contractsService.triggerAnalysis(contractNum),
    onSuccess: (res) => {
      setLatestAnalysis(res);
      setAnalysisStatusMessage(
        `AI Compliance Analysis Complete: Evaluated risk score at ${res.risk.score}/100 (${res.risk.level}).`
      );
      queryClient.invalidateQueries({ queryKey: ['contract', id] });
      queryClient.invalidateQueries({ queryKey: ['contract-risk', contractNum] });
      queryClient.invalidateQueries({ queryKey: ['contract-versions', contractNum] });
      queryClient.invalidateQueries({ queryKey: ['contract-evidence', contractNum] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
  });

  const [isDownloadingReport, setIsDownloadingReport] = useState(false);
  const handleDownloadReport = async () => {
    try {
      setIsDownloadingReport(true);
      await reportsService.downloadReport(contractNum, contractNum);
    } catch (e) {
      alert('Failed to generate PDF report.');
    } finally {
      setIsDownloadingReport(false);
    }
  };

  const handleSelectFactor = (factorName: string) => {
    setSelectedFactor(factorName);
    setActiveTab('evidence');
  };

  if (isContractLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-slate-200 rounded w-1/3 animate-pulse" />
        <div className="h-48 bg-slate-200 rounded animate-pulse" />
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-sm font-semibold text-slate-700">Contract Not Found</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/contracts')}>
          Return to Contract Registry
        </Button>
      </div>
    );
  }

  const baseVal = contract.baselineValue ?? contract.baseline_value ?? 0;
  const currVal = contract.currentValue ?? contract.current_value ?? baseVal;
  const rScore = contract.riskScore ?? contract.risk_score ?? riskData?.overall_score ?? 0;
  const rLevel = contract.riskLevel ?? contract.risk_level ?? riskData?.risk_level ?? 'LOW';

  const tabs = [
    { id: 'overview', label: 'Overview & Signals', icon: <FileCheck2 className="w-4 h-4" /> },
    {
      id: 'timeline',
      label: 'Version Timeline & Drift',
      icon: <Clock className="w-4 h-4" />,
      count: versions.length,
    },
    {
      id: 'evidence',
      label: 'Ground-Truth Evidence',
      icon: <FileText className="w-4 h-4" />,
      count: evidence.length,
    },
    {
      id: 'documents',
      label: 'Registered Documents',
      icon: <FolderOpen className="w-4 h-4" />,
      count: documents.length,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Back Button & Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/contracts')}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Contracts</span>
        </button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadReport}
            isLoading={isDownloadingReport}
            className="text-xs"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Generate PDF Report
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => analyzeMutation.mutate()}
            isLoading={analyzeMutation.isPending}
            className="text-xs"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
            Run AI Compliance Scan
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsReviewModalOpen(true)}
            className="text-xs"
          >
            Submit Determination
          </Button>
        </div>
      </div>

      {analysisStatusMessage && (
        <AlertBanner
          type="success"
          title="Engine Update"
          onClose={() => setAnalysisStatusMessage(null)}
        >
          {analysisStatusMessage}
        </AlertBanner>
      )}

      {/* Header Info Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="font-mono font-bold text-sm bg-slate-100 text-slate-800 px-2.5 py-1 rounded border border-slate-200">
              {contractNum}
            </span>
            <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${getStatusBadgeClasses(contract.status)}`}>
              {contract.status.replace('_', ' ')}
            </span>
          </div>

          <h1 className="text-lg font-bold text-slate-900 mt-2 tracking-tight">
            {contract.title}
          </h1>

          <p className="text-xs text-slate-500 mt-0.5">
            Procuring Department: <strong>{contract.department}</strong> • Awardee Consortium:{' '}
            <strong>{contract.contractor || 'Consortium'}</strong>
          </p>
        </div>

        <div className="flex md:flex-col items-end justify-between border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 text-right">
          <div>
            <p className="text-[11px] text-slate-400 uppercase font-semibold">Current Determination</p>
            <p className="text-sm font-bold text-slate-800">
              {reviews.length > 0 ? reviews[0].decision.replace('_', ' ') : 'PENDING AUDITOR REVIEW'}
            </p>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Last updated: {formatDate(contract.updatedAt || contract.updated_at)}
          </p>
        </div>
      </div>

      {/* Primary Risk & Drift Scorecard */}
      <RiskScoreCard
        contractNumber={contractNum}
        riskScore={rScore}
        riskLevel={rLevel}
        baselineValue={baseVal}
        currentValue={currVal}
        baselineCompletionDate={contract.baselineCompletionDate || contract.baseline_completion_date || null}
        currentCompletionDate={contract.currentCompletionDate || contract.current_completion_date || null}
      />

      {/* Detail Navigation Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={(t) => setActiveTab(t)} />

      {/* Tab Panels */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <AIAnalysisPanel analysis={latestAnalysis} />
          <RiskFactorsList
            factors={latestAnalysis?.risk_factors || riskData?.factors || []}
            onSelectFactor={handleSelectFactor}
          />

          {/* Quick Summary Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle>Tender Specifications Baseline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 text-xs text-slate-700">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Baseline Award Date:</span>
                  <span className="font-semibold">{formatDate(contract.baselineStartDate || contract.baseline_start_date)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Baseline Target Completion:</span>
                  <span className="font-semibold">{formatDate(contract.baselineCompletionDate || contract.baseline_completion_date)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Award Consideration:</span>
                  <span className="font-semibold">{baseVal ? `₹${(baseVal / 10000000).toFixed(2)} Cr` : '—'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Registered Addenda:</span>
                  <span className="font-semibold">{versions.length > 0 ? versions.length - 1 : 0} amendments</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle>Auditor Oversight Guidance</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-600 space-y-2.5 leading-relaxed">
                <p>
                  Review the evidence citations extracted for the signaled risk factors before finalizing
                  determination. If subcontractor novation or scope variance exceed tolerance, submit an{' '}
                  <strong>ESCALATED</strong> or <strong>NEEDS EVIDENCE</strong> notice.
                </p>
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsReviewModalOpen(true)}
                    className="w-full text-xs"
                  >
                    Open Auditor Review Workflow
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'timeline' && (
        <ContractTimeline versions={versions} baselineValue={baseVal} />
      )}

      {activeTab === 'evidence' && (
        <EvidencePanel evidence={evidence} selectedFactor={selectedFactor} />
      )}

      {activeTab === 'documents' && (
        <Card className="border-slate-200">
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Contract Governance Documents</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/upload?contract=${contractNum}`)}
              className="text-xs"
            >
              Upload Additional Document
            </Button>
          </CardHeader>
          <DocumentList documents={documents} />
        </Card>
      )}

      {/* Review Modal */}
      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        contractNumber={contractNum}
        currentStatus={contract.status}
        reviews={reviews}
        onSubmitReview={async (decision, notes) => {
          await reviewMutation.mutateAsync({ decision, notes });
        }}
        isLoading={reviewMutation.isPending}
      />
    </div>
  );
};
