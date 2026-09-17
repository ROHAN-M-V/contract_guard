import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { contractsService, ContractFilterParams } from '@/services/contracts.service';
import { documentsService } from '@/services/documents.service';
import { Contract } from '@/types/contract';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { ContractModal, ContractFormData } from '@/components/contracts/ContractModal';
import { formatCurrency, formatDate, getRiskBadgeClasses, getStatusBadgeClasses } from '@/lib/utils';
import { DEPARTMENTS, CONTRACT_STATUSES, RISK_LEVELS } from '@/lib/constants';
import { Search, Plus, Eye, Edit2, Trash2, ArrowUpDown, RefreshCw, AlertTriangle } from 'lucide-react';

export const ContractsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [riskLevel, setRiskLevel] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [sortBy, setSortBy] = useState('risk_score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [contractToDelete, setContractToDelete] = useState<Contract | null>(null);

  const queryParams: ContractFilterParams = {
    search: search || undefined,
    department: department || undefined,
    risk_level: riskLevel || undefined,
    status: status || undefined,
    sort_by: sortBy,
    sort_order: sortOrder,
    page,
    page_size: pageSize,
  };

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['contracts', queryParams],
    queryFn: () => contractsService.getContracts(queryParams),
  });

  const contracts = data?.items || [];
  const totalPages = data?.total_pages || 1;
  const totalItems = data?.total || 0;

  // Mutations
  const createMutation = useMutation({
    mutationFn: (formData: ContractFormData) => contractsService.createContract(formData as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Contract> }) =>
      contractsService.updateContract(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => contractsService.deleteContract(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      setContractToDelete(null);
    },
  });

  const handleCreateOrUpdate = async (formData: ContractFormData, file?: File) => {
    if (editingContract) {
      const updatedContract = await updateMutation.mutateAsync({
        id: editingContract.id,
        data: formData as any,
      });
      if (file) {
        await documentsService.uploadDocument(updatedContract.id, file, 'AMENDMENT');
      }
      setEditingContract(null);
    } else {
      const createdContract = await createMutation.mutateAsync(formData);
      if (file) {
        await documentsService.uploadDocument(createdContract.id, file, 'BASELINE');
      }
    }
    queryClient.invalidateQueries({ queryKey: ['contracts'] });
  };

  const handleConfirmDelete = async () => {
    if (contractToDelete) {
      await deleteMutation.mutateAsync(contractToDelete.id);
    }
  };

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Government Contract Repository
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Registered procurement agreements under ongoing post-award compliance tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditingContract(null);
              setIsCreateModalOpen(true);
            }}
            className="text-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Register Contract
          </Button>
        </div>
      </div>

      {/* Filters Card */}
      <Card className="border-slate-200 shadow-xs">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="relative">
              <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Search
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="ID, title, contractor..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-md border border-slate-300 pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Department
              </label>
              <select
                value={department}
                onChange={(e) => {
                  setDepartment(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-800"
              >
                <option value="">All Departments</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Risk Classification
              </label>
              <select
                value={riskLevel}
                onChange={(e) => {
                  setRiskLevel(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-800"
              >
                <option value="">All Risk Tiers</option>
                {RISK_LEVELS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Audit Status
              </label>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-800"
              >
                <option value="">All Statuses</option>
                {CONTRACT_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table Card */}
      <Card className="border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                <th
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100"
                  onClick={() => toggleSort('contract_number')}
                >
                  <div className="flex items-center gap-1">
                    <span>Contract Number</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4">Title & Details</th>
                <th className="py-3 px-4">Department</th>
                <th
                  className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100"
                  onClick={() => toggleSort('baseline_value')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Baseline</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100"
                  onClick={() => toggleSort('current_value')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Current</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  className="py-3 px-4 text-center cursor-pointer hover:bg-slate-100"
                  onClick={() => toggleSort('risk_score')}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Risk</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    Loading contract data...
                  </td>
                </tr>
              ) : contracts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    No contracts matched the selected search criteria.
                  </td>
                </tr>
              ) : (
                contracts.map((c) => {
                  const num = c.contractNumber || c.contract_number;
                  const baseVal = c.baselineValue ?? c.baseline_value;
                  const currVal = c.currentValue ?? c.current_value;
                  const riskLevel = c.riskLevel || c.risk_level || 'LOW';
                  const riskScore = Math.round(c.riskScore ?? c.risk_score ?? 0);

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">
                        {num}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="font-semibold text-slate-900 truncate">{c.title}</p>
                        <p className="text-[11px] text-slate-500 truncate">
                          Contractor: {c.contractor || 'Consortium'}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-[160px] truncate">
                        {c.department}
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-700 font-medium">
                        {formatCurrency(baseVal)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-900 font-bold">
                        {formatCurrency(currVal)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getRiskBadgeClasses(
                            riskLevel
                          )}`}
                        >
                          {riskLevel} ({riskScore})
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${getStatusBadgeClasses(
                            c.status
                          )}`}
                        >
                          {c.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/contracts/${num}`)}
                            title="Inspect Contract"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingContract(c);
                              setIsCreateModalOpen(true);
                            }}
                            title="Edit Contract Details"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setContractToDelete(c)}
                            title="Archive / Remove Contract"
                            className="text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <span className="font-semibold text-slate-700">{contracts.length}</span> of{' '}
            <span className="font-semibold text-slate-700">{totalItems}</span> contracts
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <span className="font-medium px-2">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      {/* Contract Create / Edit Modal */}
      <ContractModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingContract(null);
        }}
        contract={editingContract}
        onSubmit={handleCreateOrUpdate}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(contractToDelete)}
        onClose={() => setContractToDelete(null)}
        title="Confirm Contract Removal"
        size="sm"
      >
        <div className="space-y-4 text-xs text-slate-600">
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded text-amber-900">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Oversight Retention Policy</p>
              <p className="mt-0.5 leading-relaxed">
                If contract <strong>{contractToDelete?.contractNumber || contractToDelete?.contract_number}</strong>{' '}
                possesses registered historical addenda or vouchers, it will be safely archived and marked as{' '}
                <strong>CLOSED</strong> to preserve audit trails.
              </p>
            </div>
          </div>
          <p>
            Are you sure you wish to proceed with de-registering this contract from active surveillance?
          </p>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setContractToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleConfirmDelete}
              isLoading={deleteMutation.isPending}
            >
              Confirm Action
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
