'use client';

import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Table, TableRow, TableRowMain, TableRowRail, TableRowFoot, TableNote } from '@/components/ui/Table';
import { Pill } from '@/components/ui/Pill';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useQuery } from '@tanstack/react-query';
import { disputesApi, type DisputeQueueItem } from '@/lib/api';
import { formatCurrency, formatRelativeTime, getReasonCodeLabel, getPriorityLabel, cn } from '@/lib/utils';
import { Gavel, AlertTriangle, Clock, TrendingUp, DollarSign, Users, Shield, Loader2 } from 'lucide-react';

const STAT_CARDS = [
  { title: 'Awaiting Review', value: '12', icon: Gavel, color: 'text-state-caution-deep', bg: 'bg-state-caution-wash' },
  { title: 'Resolved Today', value: '8', icon: Shield, color: 'text-state-secure-deep', bg: 'bg-state-secure-wash' },
  { title: 'Total in Queue', value: '24', icon: AlertTriangle, color: 'text-ink-primary', bg: 'bg-state-pending-wash' },
  { title: 'Avg Resolution', value: '2.3h', icon: Clock, color: 'text-ink-secondary', bg: 'bg-sunken' },
];

export default function DashboardPage() {
  const { data: disputes = [], isLoading } = useQuery({
    queryKey: ['disputes-queue'],
    queryFn: () => disputesApi.getQueue(10),
  });

  return (
    <AdminLayout title="Dashboard" subtitle="Overview of dispute review queue and key metrics">
      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {STAT_CARDS.map((stat) => (
          <Card key={stat.title} padding="sheet" className="flex items-start gap-4">
            <div className={cn('w-12 h-12 rounded-r-3 flex items-center justify-center flex-shrink-0', stat.bg, stat.color)}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-caption text-ink-tertiary">{stat.title}</p>
              <p className="text-display font-bold text-ink-primary mt-1">{stat.value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Recent Disputes */}
      <Card padding="sheet">
        <CardHeader title="Recent Disputes" subtitle={`${disputes.length} most recent cases requiring attention`} />
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-ink-primary animate-spin" />
            </div>
          ) : disputes.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="w-12 h-12 text-ink-tertiary mx-auto mb-4" />
              <p className="text-body text-ink-secondary">No disputes in queue</p>
              <p className="text-caption text-ink-tertiary mt-1">All caught up!</p>
            </div>
          ) : (
            <Table className="max-h-[500px] overflow-y-auto scrollbar-thin">
              {disputes.map((dispute) => (
                <TableRow
                  key={dispute.disputeId}
                  state={dispute.priority > 1000 ? 'danger' : dispute.priority > 500 ? 'caution' : 'pending'}
                  onClick={() => window.location.href = `/disputes/${dispute.disputeId}`}
                >
                  <TableRowMain
                    mark={<Gavel className="w-5 h-5" />}
                    title={`Dispute ${dispute.disputeId.slice(0, 8)}`}
                    subtitle={getReasonCodeLabel(dispute.reasonCode)}
                    value={formatCurrency(dispute.amount, dispute.currency)}
                    meta={formatRelativeTime(dispute.createdAt)}
                  />
                  <TableRowFoot>
                    <div className="flex items-center gap-3">
                      <Pill variant="caution" size="trace">{getPriorityLabel(dispute.priority)}</Pill>
                      <Pill variant={dispute.status === 'UNDER_HUMAN_REVIEW' ? 'caution' : 'pending'} size="trace">
                        {dispute.status.replace('_', ' ')}
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