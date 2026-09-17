import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Contract } from '@/types/contract';
import { DEPARTMENTS, CONTRACT_STATUSES } from '@/lib/constants';
import { FileText, UploadCloud } from 'lucide-react';

const contractSchema = z.object({
  contract_number: z.string().min(3, 'Contract number is required'),
  title: z.string().min(5, 'Title must be at least 5 characters'),
  department: z.string().min(2, 'Department is required'),
  contractor: z.string().optional(),
  baseline_value: z.coerce.number().positive('Baseline value must be positive'),
  current_value: z.coerce.number().optional(),
  baseline_start_date: z.string().min(1, 'Start date is required'),
  baseline_completion_date: z.string().min(1, 'Completion date is required'),
  status: z.string().default('ACTIVE'),
  description: z.string().optional(),
});

export type ContractFormData = z.infer<typeof contractSchema>;

export interface ContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ContractFormData, file?: File) => Promise<void>;
  contract?: Contract | null;
  isLoading?: boolean;
}

export const ContractModal: React.FC<ContractModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  contract,
  isLoading = false,
}) => {
  const isEdit = Boolean(contract);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContractFormData>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      contract_number: '',
      title: '',
      department: DEPARTMENTS[0],
      contractor: '',
      baseline_value: 10000000,
      current_value: 10000000,
      baseline_start_date: new Date().toISOString().split('T')[0],
      baseline_completion_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
      status: 'ACTIVE',
      description: '',
    },
  });

  useEffect(() => {
    setFile(null);
    if (contract) {
      reset({
        contract_number: contract.contractNumber || contract.contract_number || '',
        title: contract.title || '',
        department: contract.department || DEPARTMENTS[0],
        contractor: contract.contractor || '',
        baseline_value: Number(contract.baselineValue ?? contract.baseline_value ?? 0),
        current_value: Number(contract.currentValue ?? contract.current_value ?? contract.baselineValue ?? 0),
        baseline_start_date: (contract.baselineStartDate || contract.baseline_start_date || '').split('T')[0],
        baseline_completion_date: (contract.baselineCompletionDate || contract.baseline_completion_date || '').split('T')[0],
        status: contract.status || 'ACTIVE',
        description: contract.description || '',
      });
    } else {
      reset({
        contract_number: '',
        title: '',
        department: DEPARTMENTS[0],
        contractor: '',
        baseline_value: 10000000,
        current_value: 10000000,
        baseline_start_date: new Date().toISOString().split('T')[0],
        baseline_completion_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        status: 'ACTIVE',
        description: '',
      });
    }
  }, [contract, reset, isOpen]);

  const onFormSubmit = async (data: ContractFormData) => {
    await onSubmit(data, file || undefined);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Edit Contract — ${contract?.contractNumber || contract?.contract_number}` : 'Register New Contract for Oversight'}
      size="lg"
    >
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Contract Reference ID"
            placeholder="e.g. PWD-2026-099"
            error={errors.contract_number?.message}
            disabled={isEdit}
            {...register('contract_number')}
          />
          <Select
            label="Procuring Department"
            options={DEPARTMENTS.map((d) => ({ value: d, label: d }))}
            error={errors.department?.message}
            {...register('department')}
          />
        </div>

        <Input
          label="Contract Title"
          placeholder="e.g. Construction of Arterial Link Bridge"
          error={errors.title?.message}
          {...register('title')}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Awarded Contractor / Consortium"
            placeholder="e.g. Apex Civil Enterprises"
            error={errors.contractor?.message}
            {...register('contractor')}
          />
          <Select
            label="Lifecycle Status"
            options={CONTRACT_STATUSES}
            error={errors.status?.message}
            {...register('status')}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Baseline Award Value (INR ₹)"
            type="number"
            step="100000"
            error={errors.baseline_value?.message}
            {...register('baseline_value')}
          />
          <Input
            label="Current Valuation (INR ₹)"
            type="number"
            step="100000"
            error={errors.current_value?.message}
            {...register('current_value')}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Baseline Award Date"
            type="date"
            error={errors.baseline_start_date?.message}
            {...register('baseline_start_date')}
          />
          <Input
            label="Target Completion Date"
            type="date"
            error={errors.baseline_completion_date?.message}
            {...register('baseline_completion_date')}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Description & Scope Summary
          </label>
          <textarea
            rows={2}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
            placeholder="Provide brief contract scope context..."
            {...register('description')}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Contract Document (Optional)
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.png,.jpg"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
            className="hidden"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-md border-2 border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-left hover:border-slate-500"
            disabled={isLoading}
          >
            <span className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              {file ? <FileText className="h-4 w-4" /> : <UploadCloud className="h-4 w-4" />}
              {file ? file.name : 'Choose a contract file or addendum'}
            </span>
            <span className="mt-1 block text-[11px] text-slate-500">
              The backend assigns the next document revision automatically.
            </span>
          </button>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" isLoading={isLoading}>
            {isEdit ? 'Save Contract Modifications' : 'Register Contract'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
