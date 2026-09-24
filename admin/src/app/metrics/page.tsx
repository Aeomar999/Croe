'use client';

import { AdminLayout } from '@/components/layout/AdminLayout';
import { metricsApi } from '@/lib/api';
import { Loader2, Download, RefreshCw, Terminal, AlertTriangle, Copy, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchMetrics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await metricsApi.getMetrics();
      setMetrics(data);
    } catch (err) {
      setError('Failed to fetch metrics. Ensure you have admin role.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const copyMetrics = () => {
    navigator.clipboard.writeText(metrics);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadMetrics = () => {
    const blob = new Blob([metrics], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `croe-metrics-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const headerAction = (
    <div className="flex items-center gap-2">
      <button 
        onClick={fetchMetrics} 
        disabled={isLoading}
        className="px-5 py-2.5 rounded-full bg-white border border-black/10 text-[13px] font-medium text-ink-primary hover:bg-black/5 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
      >
        <RefreshCw className={cn("w-4 h-4 text-ink-secondary", isLoading && "animate-spin")} />
        {isLoading ? 'Polling...' : 'Poll Metrics'}
      </button>
      {metrics && (
        <>
          <button 
            onClick={copyMetrics} 
            className="w-10 h-10 rounded-full bg-white border border-black/10 flex items-center justify-center text-ink-primary hover:bg-black/5 transition-colors shadow-sm relative"
          >
            {copied ? <CheckCircle2 className="w-4 h-4 text-[#2ECA6A]" /> : <Copy className="w-4 h-4 text-ink-secondary" />}
          </button>
          <button 
            onClick={downloadMetrics} 
            className="w-10 h-10 rounded-full bg-ink-primary flex items-center justify-center text-white hover:bg-ink-primary/90 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  );

  return (
    <AdminLayout
      title="Platform Metrics"
      subtitle="Prometheus-format metrics for Grafana monitoring"
      headerAction={headerAction}
    >
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col bg-[#111827] rounded-[32px] p-6 flex-1 min-h-0 shadow-[0_2px_12px_rgba(0,0,0,0.02)] relative overflow-hidden text-white">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#B292FA]/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

        <div className="flex items-center justify-between mb-4 flex-shrink-0 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
              <Terminal className="w-4 h-4 text-[#B292FA]" />
            </div>
            <div>
              <h3 className="text-[18px] font-bold text-white">/admin/metrics</h3>
              <p className="text-[12px] text-white/50 font-medium mt-0.5">Scrape target</p>
            </div>
          </div>
          <div className={cn("px-3 py-1 rounded-full flex items-center gap-1.5 text-[11px] font-bold shadow-sm", metrics ? "bg-[#2ECA6A] text-ink-primary" : "bg-white/10 text-white/50")}>
            <div className={cn("w-1.5 h-1.5 rounded-full", metrics ? "bg-ink-primary" : "bg-white/30")} />
            {metrics ? 'Live' : 'Standby'}
          </div>
        </div>

        <div className="flex-1 bg-black/40 rounded-[24px] border border-white/5 p-4 flex flex-col min-h-0 relative z-10">
          {isLoading && !metrics ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 text-[#B292FA] animate-spin mb-4" />
              <p className="text-[13px] font-medium text-white/50">Polling Prometheus endpoint...</p>
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <AlertTriangle className="w-12 h-12 text-[#F36960] mb-4 opacity-50" />
              <p className="text-[14px] font-bold text-white mb-1">{error}</p>
              <p className="text-[12px] font-medium text-white/50">Check role bindings and API connectivity.</p>
            </div>
          ) : metrics ? (
            <div className="flex-1 overflow-auto custom-scrollbar font-mono text-[11px] text-white/70 leading-relaxed pr-4">
              <pre>{metrics}</pre>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center opacity-30">
              <Terminal className="w-16 h-16 text-white mb-6" strokeWidth={1} />
              <p className="text-[14px] font-bold text-white">No metrics loaded</p>
              <p className="text-[12px] font-medium mt-1">Click "Poll Metrics" to fetch real-time data.</p>
            </div>
          )}
        </div>
      </motion.div>
    </AdminLayout>
  );
}