import React, { useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contractsService } from '@/services/contracts.service';
import { documentsService } from '@/services/documents.service';
import { DocumentType } from '@/types/document';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { DOCUMENT_TYPES } from '@/lib/constants';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

const ANALYSIS_STEPS = [
  'Document uploaded & validated',
  'Extracting clauses & terms',
  'Comparing against baseline specs',
  'Updating cumulative drift models',
  'Calculating risk factors & weights',
  'Analysis complete & persisted',
];

export const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialContract = searchParams.get('contract') || 'PWD-2026-014';

  const [selectedContract, setSelectedContract] = useState(initialContract);
  const [documentType, setDocumentType] = useState<DocumentType>('AMENDMENT');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Processing pipeline states
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: contractsData } = useQuery({
    queryKey: ['contracts', { page_size: 50 }],
    queryFn: () => contractsService.getContracts({ page_size: 50 }),
  });

  const contracts = contractsData?.items || [];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUploadAndAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setErrorMessage('Please attach a contract document or addendum PDF.');
      return;
    }
    if (!selectedContract) {
      setErrorMessage('Please select a target contract.');
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMessage(null);
      setCurrentStepIndex(0);

      // Step 1: Upload document to storage & API
      await documentsService.uploadDocument(
        selectedContract,
        file,
        documentType
      );

      // Step 2-5: Progression indicators simulating engine processing pipeline
      for (let i = 1; i <= 4; i++) {
        setCurrentStepIndex(i);
        await new Promise((r) => setTimeout(r, 600));
      }

      // Step 6: Trigger AI compliance scan
      await contractsService.triggerAnalysis(selectedContract);
      setCurrentStepIndex(5);
      setIsComplete(true);

      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contract', selectedContract] });
      queryClient.invalidateQueries({ queryKey: ['contract-documents', selectedContract] });
      queryClient.invalidateQueries({ queryKey: ['contract-risk', selectedContract] });
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to complete document ingestion and analysis.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Document Ingestion & AI Compliance Analysis
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Upload tenders, amendments, progress reports, or invoices to detect scope and cost drift.
        </p>
      </div>

      {isComplete ? (
        <Card className="border-emerald-200 bg-emerald-50/40 p-8 text-center space-y-4">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Ingestion & Analysis Successfully Completed!
            </h3>
            <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
              Document <strong>{file?.name}</strong> has been registered into the contract chain,
              ground-truth citations extracted, and compliance risk updated.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFile(null);
                setIsComplete(false);
                setCurrentStepIndex(-1);
              }}
            >
              Upload Another Document
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate(`/contracts/${selectedContract}`)}
            >
              <span>Inspect Updated Contract</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </div>
        </Card>
      ) : (
        <form onSubmit={handleUploadAndAnalyze} className="space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>1. Document Classification & Contract Association</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Select Target Contract
                  </label>
                  <select
                    value={selectedContract}
                    onChange={(e) => setSelectedContract(e.target.value)}
                    disabled={isProcessing}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-800"
                    required
                  >
                    {contracts.map((c) => {
                      const num = c.contractNumber || c.contract_number;
                      return (
                        <option key={c.id} value={num}>
                          {num} — {c.title.substring(0, 45)}...
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Document Type
                  </label>
                  <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value as DocumentType)}
                    disabled={isProcessing}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-800"
                  >
                    {DOCUMENT_TYPES.map((dt) => (
                      <option key={dt.value} value={dt.value}>
                        {dt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <p className="text-[11px] text-slate-500">
                The backend assigns the next revision number automatically for this contract.
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>2. File Attachment</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-slate-800 bg-slate-100'
                    : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.png,.jpg"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isProcessing}
                />

                <div className="w-12 h-12 rounded-full bg-slate-200/80 text-slate-600 mx-auto flex items-center justify-center mb-3">
                  <UploadCloud className="w-6 h-6" />
                </div>

                {file ? (
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-900">{file.name}</p>
                    <p className="text-[11px] text-slate-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB • Ready for ingestion
                    </p>
                    <span className="inline-block mt-2 text-[11px] text-blue-600 font-semibold hover:underline">
                      Click to choose a different file
                    </span>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-semibold text-slate-700">
                      Drag and drop contract PDF here, or click to browse
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Supports PDF, scanned documents, and official addenda packets
                    </p>
                  </div>
                )}
              </div>

              {errorMessage && (
                <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Real-time Analysis Processing UI */}
          {isProcessing && (
            <Card className="border-slate-200 bg-slate-50/80 p-5">
              <CardTitle className="text-xs font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-slate-800" />
                <span>AI Ingestion & Compliance Analysis Pipeline</span>
              </CardTitle>

              <div className="space-y-3">
                {ANALYSIS_STEPS.map((step, idx) => {
                  const isDone = idx < currentStepIndex;
                  const isCurrent = idx === currentStepIndex;

                  return (
                    <div key={step} className="flex items-center gap-3 text-xs">
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : isCurrent ? (
                        <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                      )}
                      <span
                        className={`${
                          isDone
                            ? 'text-slate-900 font-medium'
                            : isCurrent
                            ? 'text-blue-700 font-semibold'
                            : 'text-slate-400'
                        }`}
                      >
                        {step}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => navigate('/contracts')}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={!file || isProcessing}
              isLoading={isProcessing}
            >
              Upload & Trigger AI Analysis
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};
