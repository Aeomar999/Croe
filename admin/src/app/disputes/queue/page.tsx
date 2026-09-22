'use client';

import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Table, TableRow, TableRowMain, TableRowFoot, TableNote } from '@/components/ui/Table';
import { Pill } from '@/components/ui/Pill';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useQuery } from '@tanstack/react-query';
import { disputesApi } from '@/lib/api';
import { compareDecimalStrings, formatCurrency, formatRelativeTime, getReasonCodeLabel, getPriorityLabel, getDisputeStatusLabel } from '@/lib/utils';
import { Search, Gavel, Clock } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

function QueueSkeleton() {
  return (
    <div className="space-y-3" aria-label="Loading disputes" aria-busy="true">
      {Array.from({ length: 7 }, (_, index) => (
        <div key={index} className="flex items-center gap-3 rounded-r-2 border border-line-primary/70 bg-surface p-3.5">
          <div className="h-10 w-10 animate-pulse rounded-r-1 bg-sunken" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-1/3 animate-pulse rounded bg-sunken" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-sunken" />
          </div>
          <div className="h-5 w-20 animate-pulse rounded bg-sunken" />
        </div>
      ))}
    </div>
  );
}

export default function DisputesQueuePage() {
  const router = useRouter();
  const { data: disputes = [], isLoading } = useQuery({
    queryKey: ['disputes-queue'],
    queryFn: () => disputesApi.getQueue(200),
  });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'priority' | 'date' | 'amount'>('priority');

  const filteredDisputes = disputes
    .filter((d) => {
      const query = search.trim().toLowerCase();
      if (query && !d.disputeId.toLowerCase().includes(query) && !d.transactionId.toLowerCase().includes(query)) return false;
      if (statusFilter !== 'all' && d.status !== statusFilter) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'priority') return b.priority - a.priority;
      if (sortBy === 'date') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'amount') return compareDecimalStrings(b.amount, a.amount);
      return 0;
    });

  return (
    <AdminLayout
      title="Dispute Queue"
      subtitle={`${filteredDisputes.length} disputes requiring review`}
      headerAction={
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter queue by status"
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'UNDER_HUMAN_REVIEW', label: 'Human Review' },
              { value: 'AI_PROCESSING', label: 'AI Processing' },
              { value: 'FRAUD_LOCKOUT', label: 'Restricted' },
            ]}
            className="w-full sm:w-48"
          />
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            aria-label="Sort disputes"
            options={[
              { value: 'priority', label: 'Priority' },
              { value: 'date', label: 'Newest First' },
              { value: 'amount', label: 'Amount (High)' },
            ]}
            className="w-full sm:w-40"
          />
        </div>
      }
    >
      <Card padding="sheet">
        <CardContent className="space-y-0">
          {/* Search bar */}
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-tertiary" />
              <Input
                placeholder="Search by dispute ID, transaction ID..."
                aria-label="Search disputes by dispute or transaction ID"
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
            <QueueSkeleton />
          ) : filteredDisputes.length === 0 ? (
            <div className="rounded-r-2 bg-sunken px-6 py-12 text-center">
              <Gavel className="mx-auto mb-4 h-12 w-12 text-ink-tertiary" strokeWidth={1.6} />
              <p className="text-body font-semibold text-ink-primary">No cases match these filters</p>
              <p className="mt-1 text-caption text-ink-secondary">Try clearing your search or choosing a different status.</p>
            </div>
          ) : (
            <Table className="max-h-[650px] overflow-y-auto pr-1 scrollbar-thin">
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
                  onClick={() => router.push(`/disputes/${dispute.disputeId}`)}
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
