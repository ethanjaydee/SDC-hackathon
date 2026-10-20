// @ts-nocheck
import { useMemo, useRef, useState } from 'react';
import { useQueryClient } from './_api';
import {
  useGetHubData,
  getGetHubDataQueryKey,
  useAnalyzeRequest,
  useApproveDispatch,
} from './_api';
import { Radio, WifiOff, RefreshCw, FlaskConical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge, Dot } from './ui';
import IntakePanel from './IntakePanel';
import AnalysisPanel from './AnalysisPanel';
import StatusPanel from './StatusPanel';

const APPROVER = 'Demo Dispatcher';

function errMsg(e) {
  return e?.data?.error || e?.message || 'Unexpected error';
}

export function findMatches(hub, parts) {
  if (!hub || !parts?.length) return [];
  return hub.technicians
    .filter((t) => t.status === 'Available')
    .filter((t) =>
      parts.every((p) =>
        hub.inventory.some(
          (i) => i.van_id === t.van_id && i.part_name.toLowerCase() === p.toLowerCase() && i.quantity > 0,
        ),
      ),
    );
}

export default function Dashboard() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const hubQ = useGetHubData({
    query: {
      queryKey: getGetHubDataQueryKey(),
      refetchInterval: 10000,
      refetchOnWindowFocus: true,
    },
  });
  const analyze = useAnalyzeRequest();
  const approve = useApproveDispatch();

  const [notes, setNotes] = useState('');
  const [analysis, setAnalysis] = useState(null); // { result, forText }
  const [analyzeError, setAnalyzeError] = useState(null);
  const [approveError, setApproveError] = useState(null);
  const reqId = useRef(0);

  const hub = hubQ.data;
  const matches = useMemo(() => findMatches(hub, analysis?.result.parts), [hub, analysis]);
  const match = matches[0] || null;

  const onNotesChange = (v) => {
    reqId.current++; // invalidate results even when the first analysis is still in flight
    setNotes(v);
    if (analysis && analysis.forText !== v.trim()) {
      setAnalysis(null);
    }
    setAnalyzeError(null);
    setApproveError(null);
  };

  const runAnalyze = async () => {
    const text = notes.trim();
    if (!text || analyze.isPending) return;
    const id = ++reqId.current;
    setAnalysis(null);
    setAnalyzeError(null);
    setApproveError(null);
    try {
      const result = await analyze.mutateAsync({ data: { text } });
      if (id !== reqId.current) return;
      setAnalysis({ result, forText: text });
    } catch (e) {
      if (id !== reqId.current) return;
      setAnalyzeError(errMsg(e));
    }
  };

  const runApprove = async () => {
    if (!analysis || analysis.forText !== notes.trim() || !match || approve.isPending || hubQ.isError) return;
    const snapshot = { tech: match, parts: analysis.result.parts, forText: analysis.forText };
    setApproveError(null);
    try {
      const updated = await approve.mutateAsync({
        data: { tech_id: snapshot.tech.id, van_id: snapshot.tech.van_id, parts: snapshot.parts, approved_by: APPROVER },
      });
      await qc.cancelQueries({ queryKey: getGetHubDataQueryKey() });
      qc.setQueryData(getGetHubDataQueryKey(), updated);
      setAnalysis(null);
      reqId.current++;
      qc.invalidateQueries({ queryKey: getGetHubDataQueryKey() });
      toast({
        title: 'Job dispatched',
        description: `${snapshot.tech.name} (Van ${snapshot.tech.van_id}) assigned. ${snapshot.parts.length} parts reserved.`,
      });
    } catch (e) {
      const conflict = e?.status === 409;
      qc.invalidateQueries({ queryKey: getGetHubDataQueryKey() });
      const msg = conflict
        ? 'Hub state changed before approval (technician or stock no longer valid). Data refreshed; review the new match.'
        : errMsg(e);
      setApproveError(msg);
      toast({ title: conflict ? 'Dispatch conflict' : 'Dispatch failed', description: msg, variant: 'destructive' });
    }
  };

  const offline = hubQ.isError && !!hub;
  const updatedAt = hubQ.dataUpdatedAt ? new Date(hubQ.dataUpdatedAt) : null;

  return (
    <div className="grid-bg min-h-[100dvh] bg-[hsl(222_22%_6%)] text-slate-200">
      <div className="mx-auto flex min-h-[100dvh] max-w-[1600px] flex-col px-4 pb-6 lg:px-6">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-400 text-slate-950">
              <Radio className="h-4 w-4" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-[15px] font-semibold tracking-tight text-slate-50">Dispatch Hub</h1>
              <p className="text-xs text-slate-500">Fault notes in. Accountable technician-and-parts dispatch out.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="violet" data-testid="badge-demo">
              <FlaskConical className="h-3 w-3" /> Synthetic demo data · Mock AI
            </Badge>
            {hubQ.isError ? (
              <button
                onClick={() => hubQ.refetch()}
                data-testid="button-reconnect"
                className="inline-flex items-center gap-1.5 rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-[11px] font-medium text-red-300 transition hover:bg-red-500/20"
              >
                <WifiOff className="h-3 w-3" /> {offline ? 'Connection lost, showing last data' : 'Hub offline'}
                <RefreshCw className={`h-3 w-3 ${hubQ.isFetching ? 'animate-spin' : ''}`} />
              </button>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-md border border-slate-800 bg-slate-900/60 px-2 py-1 text-[11px] text-slate-400" data-testid="status-connection">
                <Dot tone={hub ? 'green' : 'slate'} pulse={!!hub} />
                {hub ? 'Live' : 'Connecting'}
                {updatedAt && <span className="font-mono text-slate-500">{updatedAt.toLocaleTimeString([], { hour12: false })}</span>}
              </span>
            )}
          </div>
        </header>

        <main className="mt-5 grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1.25fr)]">
          <IntakePanel
            notes={notes}
            onChange={onNotesChange}
            onAnalyze={runAnalyze}
            pending={analyze.isPending}
            error={analyzeError}
          />
          <AnalysisPanel
            analysis={analysis?.result}
            pending={analyze.isPending}
            error={analyzeError}
            onRetry={runAnalyze}
            hub={hub}
            hubLoading={hubQ.isLoading}
            matches={matches}
            match={match}
            approving={approve.isPending}
            onApprove={runApprove}
            approveError={approveError}
            approver={APPROVER}
            hubFetching={hubQ.isFetching}
          />
          <StatusPanel hubQ={hubQ} highlightVan={match?.van_id} highlightParts={analysis?.result.parts} />
        </main>
      </div>
    </div>
  );
}
