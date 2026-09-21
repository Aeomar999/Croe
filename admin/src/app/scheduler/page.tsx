'use client';

import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Table, TableRow, TableRowMain, TableRowFoot } from '@/components/ui/Table';
import { Pill } from '@/components/ui/Pill';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useQuery } from '@tanstack/react-query';
import { schedulerApi, type SchedulerStatus, type JobStatus } from '@/lib/api';
import { formatDate, cn } from '@/lib/utils';
import { Activity, Loader2, Play, Pause, Clock, CheckCircle, AlertCircle, RefreshCw, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';

const JOB_DESCRIPTIONS: Record<string, string> = {
  reconciliation: 'Daily reconciliation of pooled balances vs sub-ledger vs partner statement',
  'ledger-integrity': 'Append-only ledger integrity check with checksums',
  retention: 'Data retention/deletion scheduling (90-day sessions, 1-year notifications)',
};

export default function SchedulerPage() {
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchStatus = async () => {
    try {
      const data = await schedulerApi.getStatus();
      setSchedulerStatus(data);
    } catch (err) {
      console.error('Failed to fetch scheduler status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    if (!autoRefresh) return;
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  return (
    <AdminLayout
      title="Scheduler Status"
      subtitle="Background job scheduler monitoring"
      headerAction={
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={fetchStatus} loading={isLoading}>
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <label className="flex items-center gap-2 text-caption text-ink-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 rounded border-line-primary text-ink-primary focus:ring-ink-primary"
            />
            Auto-refresh (30s)
          </label>
        </div>
      }
    >
      {/* Scheduler Overview */}
      <Card padding="sheet" className="mb-6">
        <CardContent className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={cn('w-12 h-12 rounded-r-3 flex items-center justify-center', schedulerStatus?.isRunning ? 'bg-state-secure-wash text-state-secure-deep' : 'bg-state-pending-wash text-state-pending-deep')}>
              {schedulerStatus?.isRunning ? (
                <Activity className="w-6 h-6 animate-spin" />
              ) : (
                <Pause className="w-6 h-6" />
              )}
            </div>
            <div>
              <p className="text-caption text-ink-tertiary">Scheduler Status</p>
              <p className={cn('text-heading font-bold', schedulerStatus?.isRunning ? 'text-state-secure-deep' : 'text-state-pending-deep')}>
                {schedulerStatus?.isRunning ? 'Running' : 'Idle'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-caption text-ink-tertiary">Active Jobs</p>
            <p className="text-display font-bold text-ink-primary">{schedulerStatus?.jobs?.length || 0}</p>
          </div>
        </CardContent>
      </Card>

      {/* Jobs Table */}
      <Card padding="sheet">
        <CardHeader title="Scheduled Jobs" subtitle={schedulerStatus?.jobs?.length ? `${schedulerStatus?.jobs.length} jobs configured` : 'No jobs configured'} />
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-ink-primary animate-spin" />
            </div>
          ) : schedulerStatus?.jobs?.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-12 h-12 text-ink-tertiary mx-auto mb-4" />
              <p className="text-body text-ink-secondary">No jobs configured</p>
            </div>
          ) : (
            <Table className="max-h-[500px] overflow-y-auto scrollbar-thin">
              {schedulerStatus?.jobs?.map((job: JobStatus) => (
                <TableRow key={job.name} state={job.status === 'error' ? 'danger' : job.status === 'running' ? 'caution' : 'pending'}>
                  <TableRowMain
                    mark={
                      job.status === 'running' ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : job.status === 'error' ? (
                        <AlertCircle className="w-5 h-5 text-state-danger-fill" />
                      ) : (
                        <CheckCircle className="w-5 h-5 text-state-secure-deep" />
                      )
                    }
                    title={job.name}
                    subtitle={JOB_DESCRIPTIONS[job.name] || 'Background job'}
                    value={
                      job.status === 'running'
                        ? 'Running...'
                        : job.status === 'error'
                        ? 'Error'
                        : 'Idle'
                    }
                    meta={job.lastRun ? `Last: ${formatDate(job.lastRun)}` : 'Never run'}
                  />
                  <TableRowFoot>
                    <div className="flex items-center gap-2">
                      <Pill
                        variant={
                          job.status === 'running' ? 'caution'
                          : job.status === 'error' ? 'danger'
                          : 'pending'
                        }
                        size="trace"
                      >
                        {job.status}
                      </Pill>
                      {job.nextRun && (
                        <Badge variant="info">
                          <Clock className="w-3 h-3 mr-1" />
                          Next: {formatDate(job.nextRun)}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" disabled={job.status === 'running'}>
                        <Settings className="w-4 h-4" />
                        Config
                      </Button>
                      {job.lastError && (
                        <Button variant="ghost" size="sm">
                          <AlertCircle className="w-4 h-4" />
                          View Error
                        </Button>
                      )}
                    </div>
                  </TableRowFoot>
                </TableRow>
              ))}
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Job Details - Error Modal would go here */}
    </AdminLayout>
  );
}