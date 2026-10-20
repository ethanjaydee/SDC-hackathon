import { useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetHubDataQueryKey, useAnalyzeRequest, useApproveDispatch, useGetHubData,
  type Analysis, type HubData,
} from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';

export const APPROVER = 'Demo Dispatcher';

function message(error: unknown) {
  const e = error as { data?: { error?: string }; message?: string };
  return e?.data?.error || e?.message || 'The request could not be completed.';
}

function findMatches(hub: HubData | undefined, parts: string[]) {
  if (!hub || !parts.length) return [];
  const required = new Map<string, number>();
  for (const part of parts) {
    const key = part.toLowerCase();
    required.set(key, (required.get(key) || 0) + 1);
  }
  return hub.technicians.filter((tech) =>
    tech.status === 'Available' && [...required].every(([part, quantity]) =>
      hub.inventory.some((item) =>
        item.van_id === tech.van_id &&
        item.part_name.toLowerCase() === part &&
        item.quantity >= quantity,
      ),
    ),
  );
}

export function useDispatchHub() {
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
  const [analysis, setAnalysis] = useState<{ result: Analysis; forText: string } | null>(null);
  const [analysisError, setAnalysisError] = useState('');
  const [approveError, setApproveError] = useState('');
  const requestId = useRef(0);
  const hub = hubQ.data;
  const matches = useMemo(() => findMatches(hub, analysis?.result.parts || []), [hub, analysis]);
  const match = matches[0] || null;
  const technicians = hub?.technicians || [];
  const inventory = useMemo(() =>
    [...(hub?.inventory || [])].sort((a, b) => a.van_id - b.van_id || a.part_name.localeCompare(b.part_name)),
  [hub]);
  const activity = useMemo(() =>
    [...(hub?.activity_log || [])].sort((a, b) => b.id - a.id),
  [hub]);
  const availableCount = technicians.filter((tech) => tech.status === 'Available').length;
  const lowStockCount = inventory.filter((item) => item.quantity <= 2).length;
  const dispatchedToday = activity.filter((entry) =>
    new Date(entry.timestamp).toDateString() === new Date().toDateString(),
  ).length;

  const updateNotes = (value: string) => {
    if (approve.isPending) return;
    requestId.current += 1;
    setNotes(value);
    if (analysis && analysis.forText !== value.trim()) setAnalysis(null);
    setAnalysisError('');
    setApproveError('');
  };

  const runAnalysis = async () => {
    const text = notes.trim();
    if (!text || analyze.isPending || approve.isPending) return;
    const id = ++requestId.current;
    setAnalysis(null);
    setAnalysisError('');
    setApproveError('');
    try {
      const result = await analyze.mutateAsync({ data: { text } });
      if (id === requestId.current) setAnalysis({ result, forText: text });
    } catch (error) {
      if (id === requestId.current) setAnalysisError(message(error));
    }
  };

  const approveDispatch = async () => {
    if (!analysis || analysis.forText !== notes.trim() || !match || approve.isPending || hubQ.isError) return;
    const snapshot = { tech: match, parts: analysis.result.parts };
    setApproveError('');
    try {
      const updated = await approve.mutateAsync({
        data: {
          tech_id: snapshot.tech.id, van_id: snapshot.tech.van_id,
          parts: snapshot.parts, approved_by: APPROVER,
        },
      });
      await qc.cancelQueries({ queryKey: getGetHubDataQueryKey() });
      qc.setQueryData(getGetHubDataQueryKey(), updated);
      setAnalysis(null);
      requestId.current += 1;
      void qc.invalidateQueries({ queryKey: getGetHubDataQueryKey() });
      toast({
        title: 'Job dispatched',
        description: `${snapshot.tech.name} · Van ${snapshot.tech.van_id} assigned. ${snapshot.parts.length} parts reserved.`,
      });
    } catch (error) {
      void qc.invalidateQueries({ queryKey: getGetHubDataQueryKey() });
      const conflict = (error as { status?: number })?.status === 409;
      const detail = conflict
        ? 'Hub state changed before approval. Data refreshed; review technician availability and stock before trying again.'
        : message(error);
      setApproveError(detail);
      toast({ title: conflict ? 'Dispatch conflict' : 'Dispatch failed', description: detail, variant: 'destructive' });
    }
  };

  return {
    hubQ, analyze, approve, notes, analysis, analysisError, approveError,
    matches, match, technicians, inventory, activity,
    availableCount, lowStockCount, dispatchedToday,
    updateNotes, runAnalysis, approveDispatch,
  };
}
