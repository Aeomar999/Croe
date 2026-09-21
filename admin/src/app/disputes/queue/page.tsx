'use client';

import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Table, TableRow, TableRowMain, TableRowRail, TableRowFoot, TableNote } from '@/components/ui/Table';
import { Pill } from '@/components/ui/Pill';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useQuery } from '@tanstack/react-query';
import { disputesApi, type DisputeQueueItem } from '@/lib/api';
import { formatCurrency, formatRelativeTime, getReasonCodeLabel, getPriorityLabel, getDisputeStatusLabel } from '@/lib/utils';
import { Search, Filter, ChevronDown, Gavel, AlertTriangle, Clock, Loader2, MoreHorizontal } from 'lucide-react';
import { useState } from 'react';

export default function DisputesQueuePage() {
  const { data: disputes = [], isLoading } = useQuery({
    queryKey: ['disputes-queue'],
    queryFn: () => disputesApi.getQueue(200),
  });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'priority' | 'date' | 'amount'>('priority');

  const filteredDisputes = disputes
    .filter((d) => {
      if (search && !d.disputeId.toLowerCase().includes(search.toLowerCase())) return false;
      if (search && !d.transactionId.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== 'all' && d.status !== statusFilter) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'priority') return b.priority - a.priority;
      if (sortBy === 'date') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'amount') return parseFloat(b.amount) - parseFloat(a.amount);
      return 0;
    });

  return (
    <AdminLayout
      title="Dispute Queue"
      subtitle={`${filteredDisputes.length} disputes requiring review`}
      headerAction={
        <div className="flex items-center gap-3">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'UNDER_HUMAN_REVIEW', label: 'Human Review' },
              { value: 'AI_PROCESSING', label: 'AI Processing' },
              { value: 'OPENED', label: 'Opened' },
            ]}
            className="w-48"
          />
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            options={[
              { value: 'priority', label: 'Priority' },
              { value: 'date', label: 'Newest First' },
              { value: 'amount', label: 'Amount (High)' },
            ]}
            className="w-40"
          />
        </div>
      }
    >
      <Card padding="sheet">
        <CardContent className="space-y-0">
          {/* Search bar */}
          <div className="mb-4 flex gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-tertiary" />
              <Input
                placeholder="Search by dispute ID, transaction ID..."
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2 text-caption text-ink-tertiary">
              <span>{filteredDisputes.length} results</span>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-ink-primary animate-spin" />
            </div>
          ) : filteredDisputes.length === 0 ? (
            <div className="text-center py-12">
              <Gavel className="w-12 h-12 text-ink-tertiary mx-auto mb-4" />
              <p className="text-body text-ink-secondary">No disputes match your filters</p>
            </div>
          ) : (
            <Table className="max-h-[600px] overflow-y-auto scrollbar-thin">
              {filteredDisputes.map((dispute) => (
                <TableRow
                  key={dispute.disputeId}
                  state={
                    dispute.priority > 1000
                      ? 'danger'
                      : dispute.priority > 500
                      ? 'caution'
                      : dispute.status === 'UNDER_HUMAN_REVIEW'
                      ? 'caution'
                      : 'pending'
                  }
                  onClick={() => window.location.href = `/disputes/${dispute.disputeId}`}
                >
                  <TableRowMain
                    mark={<Gavel className="w-5 h-5" />}
                    title={`Dispute ${dispute.disputeId.slice(0, 8)}`}
                    subtitle={`${getReasonCodeLabel(dispute.reasonCode)} • TX: ${dispute.transactionId.slice(0, 8)}`}
                    value={formatCurrency(dispute.amount, dispute.currency)}
                    meta={formatRelativeTime(dispute.createdAt)}
                  />
                  <TableRowFoot>
                    <div className="flex items-center gap-2">
                      <Pill
                        variant={
                          dispute.priority > 1000
                            ? 'danger'
                            : dispute.priority > 500
                            ? 'caution'
                            : 'pending'
                        }
                        size="trace"
                      >
                        {getPriorityLabel(dispute.priority)}
                      </Pill>
                      <Pill
                        variant={
                          dispute.status === 'UNDER_HUMAN_REVIEW'
                            ? 'caution'
                            : dispute.status === 'AI_PROCESSING'
                            ? 'caution'
                            : 'pending'
                        }
                        size="trace"
                      >
                        {getDisputeStatusLabel(dispute.status)}
                      </Pill>
                    </div>
                    <TableNote>
                      <Clock className="w-3.5 h-3.5" />
                      {formatRelativeTime(dispute.createdAt)}
                    </TableNote>
                  </TableRowFoot>
                </TableRow>
              ))}
            </Table>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}