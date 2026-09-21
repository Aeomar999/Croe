'use client';

import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { metricsApi } from '@/lib/api';
import { Loader2, Download, RefreshCw, Terminal, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <AdminLayout
      title="Metrics"
      subtitle="Prometheus-format metrics for monitoring"
      headerAction={
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={fetchMetrics} loading={isLoading}>
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          {metrics && (
            <>
              <Button variant="ghost" size="sm" onClick={copyMetrics}>
                <Terminal className="w-4 h-4" />
                Copy
              </Button>
              <Button variant="ghost" size="sm" onClick={downloadMetrics}>
                <Download className="w-4 h-4" />
                Download
              </Button>
            </>
          )}
        </div>
      }
    >
      <Card padding="sheet">
        <CardHeader title="Prometheus Metrics Endpoint" subtitle="Scrape target: /admin/metrics" />
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-ink-primary animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertTriangle className="w-12 h-12 text-state-danger-fill mx-auto mb-4" />
              <p className="text-body text-ink-secondary">{error}</p>
              <p className="text-caption text-ink-tertiary mt-1">Admin role required</p>
            </div>
          ) : metrics ? (
            <div className="bg-sunken rounded-r-2 p-4 font-mono text-[11px] text-ink-secondary max-h-[500px] overflow-auto">
              <pre>{metrics}</pre>
            </div>
          ) : (
            <div className="text-center py-12">
              <Terminal className="w-12 h-12 text-ink-tertiary mx-auto mb-4" />
              <p className="text-body text-ink-secondary">Click Refresh to load metrics</p>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}