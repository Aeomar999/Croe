'use client';

import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Table, TableRow, TableRowMain, TableRowFoot, TableNote } from '@/components/ui/Table';
import { Pill } from '@/components/ui/Pill';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useQuery } from '@tanstack/react-query';
import { reconciliationApi, type ReconciliationReport, type CustodyAccountBalance } from '@/lib/api';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { Calculator, Loader2, Calendar, Download, RefreshCw, AlertTriangle, Shield, TrendingUp, TrendingDown } from 'lucide-react';
import { useState } from 'react';

export default function ReconciliationPage() {
  const [from, setFrom] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0];
  });
  const [to, setTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [report, setReport] = useState<ReconciliationReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      const data = await reconciliationApi.getReport(
        new Date(from).toISOString(),
        new Date(to).getTime() === new Date().setHours(0,0,0,0) ? new Date().toISOString() : new Date(to).toISOString()
      );
      setReport(data);
    } catch (err) {
      console.error('Failed to fetch reconciliation report:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const summaryCards = report ? [
    { title: 'Total Deposited', value: formatCurrency(report.summary.totalDeposited), icon: TrendingUp, color: 'text-state-secure-deep', bg: 'bg-state-secure-wash' },
    { title: 'Total Released', value: formatCurrency(report.summary.totalReleased), icon: TrendingDown, color: 'text-ink-primary', bg: 'bg-state-pending-wash' },
    { title: 'Total Refunded', value: formatCurrency(report.summary.totalRefunded), icon: AlertTriangle, color: 'text-state-caution-deep', bg: 'bg-state-caution-wash' },
    { title: 'Net Held', value: formatCurrency(report.summary.netHeld), icon: Shield, color: 'text-state-secure-deep', bg: 'bg-state-secure-wash' },
  ] : [];

  return (
    <AdminLayout
      title="Reconciliation"
      subtitle="Daily reconciliation of pooled balances vs sub-ledger"
      headerAction={
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-ink-tertiary" />
            <Input
              type="date"
              value={from}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFrom(e.target.value)}
              className="w-40"
            />
            <span className="text-ink-tertiary">to</span>
            <Input
              type="date"
              value={to}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTo(e.target.value)}
              className="w-40"
            />
          </div>
          <Button onClick={fetchReport} loading={isLoading}>
            <RefreshCw className="w-4 h-4" />
            Generate
          </Button>
        </div>
      }
    >
      {!report && !isLoading ? (
        <Card padding="sheet" className="text-center">
          <Calculator className="w-16 h-16 text-ink-tertiary mx-auto mb-4" />
          <p className="text-body text-ink-secondary">Select a date range and click Generate</p>
          <p className="text-caption text-ink-tertiary mt-1">Reconciliation compares pooled balances against the transaction ledger</p>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            {summaryCards.map((stat) => (
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

          {/* Custody Accounts */}
          <Card padding="sheet">
            <CardHeader title="Custody Account Balances" subtitle="Current balances from custody providers" />
            <CardContent>
              {report?.custodyAccounts.length === 0 ? (
                <p className="text-body text-ink-secondary text-center py-8">No active custody accounts</p>
              ) : (
                <Table className="max-h-[400px] overflow-y-auto scrollbar-thin">
                  {report?.custodyAccounts.map((account: CustodyAccountBalance) => (
                    <TableRow key={`${account.provider}-${account.currency}`}>
                      <TableRowMain
                        mark={<Shield className="w-5 h-5" />}
                        title={account.provider}
                        subtitle={`Currency: ${account.currency}`}
                        value={formatCurrency(account.balance, account.currency)}
                        meta="Live balance"
                      />
                      <TableRowFoot>
                        <Badge variant="success">Active</Badge>
                      </TableRowFoot>
                    </TableRow>
                  ))}
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Ledger Summary */}
          <Card padding="sheet">
            <CardHeader title="Ledger Summary (Selected Period)" subtitle="Aggregated from transaction_ledger" />
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { label: 'Deposited', value: formatCurrency(report?.summary.totalDeposited || '0'), color: 'text-state-secure-deep' },
                  { label: 'Released', value: formatCurrency(report?.summary.totalReleased || '0'), color: 'text-ink-primary' },
                  { label: 'Refunded', value: formatCurrency(report?.summary.totalRefunded || '0'), color: 'text-state-caution-deep' },
                ].map((item) => (
                  <div key={item.label} className="p-4 bg-sunken rounded-r-2 text-center">
                    <p className="text-caption text-ink-tertiary">{item.label}</p>
                    <p className={cn('text-heading font-bold mt-1', item.color)}>{item.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </AdminLayout>
  );
}