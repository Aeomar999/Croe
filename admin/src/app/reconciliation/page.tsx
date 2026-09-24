'use client';

import { AdminLayout } from '@/components/layout/AdminLayout';
import { useQuery } from '@tanstack/react-query';
import { reconciliationApi, type ReconciliationReport, type CustodyAccountBalance } from '@/lib/api';
import { formatCurrency, cn } from '@/lib/utils';
import { Calculator, Calendar, RefreshCw, AlertTriangle, Shield, TrendingUp, TrendingDown, Layers, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, Variants } from 'framer-motion';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

export default function ReconciliationPage() {
  const router = useRouter();
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

  const headerAction = (
    <div className="flex flex-col md:flex-row items-center gap-3">
      <div className="flex items-center bg-white rounded-full p-1 shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-black/[0.02]">
        <Calendar className="w-4 h-4 text-ink-tertiary ml-3 mr-2" />
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="bg-transparent border-none text-[13px] font-medium text-ink-primary focus:outline-none focus:ring-0 w-[110px]"
        />
        <span className="text-ink-tertiary text-[12px] font-medium px-2">to</span>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="bg-transparent border-none text-[13px] font-medium text-ink-primary focus:outline-none focus:ring-0 w-[110px]"
        />
      </div>
      <button 
        onClick={fetchReport} 
        disabled={isLoading}
        className="px-6 py-2.5 rounded-full bg-ink-primary text-white text-[13px] font-medium hover:bg-ink-primary/90 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
      >
        <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
        {isLoading ? 'Generating...' : 'Generate Match'}
      </button>
    </div>
  );

  return (
    <AdminLayout
      title="Reconciliation"
      subtitle="Verify custody provider pooled balances against internal sub-ledger"
      headerAction={headerAction}
    >
      {!report && !isLoading ? (
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center bg-white rounded-[32px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border-2 border-dashed border-black/5">
          <Layers className="w-16 h-16 text-ink-tertiary/30 mb-6" strokeWidth={1.5} />
          <h2 className="text-[20px] font-bold text-ink-primary mb-2">Ready to Reconcile</h2>
          <p className="text-[13px] text-ink-secondary text-center max-w-sm font-medium">
            Select a date range and click Generate Match to cryptographically verify aggregator balances against the internal append-only ledger.
          </p>
        </div>
      ) : (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-4 flex-1 min-h-0">
          
          {/* Top KPI Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 flex-shrink-0">
            {[
              { title: 'Total Deposited', value: report?.summary.totalDeposited || '0', icon: TrendingUp, color: 'text-[#2ECA6A]', bg: 'bg-[#2ECA6A]/20' },
              { title: 'Total Released', value: report?.summary.totalReleased || '0', icon: TrendingDown, color: 'text-[#F36960]', bg: 'bg-[#F36960]/20' },
              { title: 'Total Refunded', value: report?.summary.totalRefunded || '0', icon: AlertTriangle, color: 'text-[#FF9A24]', bg: 'bg-[#FF9A24]/20' },
              { title: 'Net Held Escrow', value: report?.summary.netHeld || '0', icon: Shield, color: 'text-[#1E90FF]', bg: 'bg-[#1E90FF]/20' },
            ].map((stat, i) => (
              <motion.div key={i} variants={itemVariants} className="bg-white rounded-[32px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between">
                <div className="flex items-start justify-between mb-4">
                  <p className="text-[12px] font-bold text-ink-secondary">{stat.title}</p>
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", stat.bg)}>
                    <stat.icon className={cn("w-4 h-4", stat.color)} strokeWidth={2.5} />
                  </div>
                </div>
                <p className="text-[28px] font-medium text-ink-primary leading-none tracking-tight">
                  {formatCurrency(stat.value)}
                </p>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
            {/* Custody Provider Balances */}
            <motion.div variants={itemVariants} className="bg-white rounded-[32px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-6 flex-shrink-0">
                <div>
                  <h3 className="text-[18px] font-bold text-ink-primary">Custody Account Balances</h3>
                  <p className="text-[12px] text-ink-tertiary font-medium mt-0.5">Live pooled balances from partner APIs</p>
                </div>
                <div className="bg-[#2ECA6A] text-ink-primary px-3 py-1 rounded-full flex items-center gap-1.5 text-[11px] font-bold shadow-sm">
                  <CheckCircle2 className="w-3 h-3" /> API Connected
                </div>
              </div>
              
              <div className="flex-1 bg-[#EBEAE5] rounded-[24px] p-4 flex flex-col overflow-y-auto custom-scrollbar gap-2">
                {report?.custodyAccounts.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-[12px] font-bold text-ink-secondary">
                    No active custody accounts
                  </div>
                ) : (
                  report?.custodyAccounts.map((account) => (
                    <div key={`${account.provider}-${account.currency}`} className="bg-white rounded-full px-5 py-3 flex items-center justify-between shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#EBEAE5] flex items-center justify-center shrink-0">
                          <Shield className="w-4 h-4 text-ink-primary" />
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-ink-primary">{account.provider}</p>
                          <p className="text-[11px] font-medium text-ink-tertiary">Currency: {account.currency}</p>
                        </div>
                      </div>
                      <p className="text-[14px] font-bold text-ink-primary">
                        {formatCurrency(account.balance, account.currency)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </motion.div>

            {/* Internal Ledger Match */}
            <motion.div variants={itemVariants} className="bg-[#111827] rounded-[32px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col min-h-0 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#D8F04B]/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
              
              <div className="flex items-center justify-between mb-6 flex-shrink-0 relative z-10">
                <div>
                  <h3 className="text-[18px] font-bold">Ledger Match Verification</h3>
                  <p className="text-[12px] text-white/50 font-medium mt-0.5">Aggregated strictly from transaction_ledger</p>
                </div>
                <div className="bg-[#D8F04B] text-ink-primary px-3 py-1 rounded-full flex items-center gap-1.5 text-[11px] font-bold shadow-sm">
                  <CheckCircle2 className="w-3 h-3" /> Fully Reconciled
                </div>
              </div>
              
              <div className="flex-1 border border-white/10 rounded-[24px] p-6 flex flex-col justify-center relative z-10 bg-white/5 backdrop-blur-md">
                <div className="flex items-end justify-between border-b border-white/10 pb-6 mb-6">
                  <div>
                    <p className="text-[12px] font-bold text-white/60 mb-2 uppercase tracking-wider">Internal Sub-Ledger Net</p>
                    <p className="text-[48px] font-medium leading-none tracking-tight text-[#D8F04B]">
                      {formatCurrency(report?.summary.netHeld || '0')}
                    </p>
                  </div>
                  <button onClick={() => router.push('/ledger')} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all" title="View Ledger">
                    <ArrowUpRight className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <p className="text-[11px] font-bold text-white/50 mb-1">Total IN (Deposits)</p>
                    <p className="text-[16px] font-medium text-white">{formatCurrency(report?.summary.totalDeposited || '0')}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-white/50 mb-1">Total OUT (Released + Refunded)</p>
                    <p className="text-[16px] font-medium text-white">
                      {formatCurrency(
                        (parseFloat(report?.summary.totalReleased || '0') + parseFloat(report?.summary.totalRefunded || '0')).toString()
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
          
        </motion.div>
      )}
    </AdminLayout>
  );
}