import { useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetHubDataQueryKey, useAnalyzeRequest, useApproveDispatch, useCompleteDispatch, useGetHubData,
  type Analysis,
} from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';
import { DEMO_CUSTOMER_SITES } from './demoLocations';
import { rankQualifiedTechnicians } from './matching';

export const APPROVER = 'Demo Dispatcher';

function message(error: unknown) {
  const e = error as { data?: { error?: string }; message?: string };
  return e?.data?.error || e?.message || 'The request could not be completed.';
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
  const complete = useCompleteDispatch();
  const completionLock = useRef(false);
  const [completionError, setCompletionError] = useState('');
  const [notes, setNotes] = useState('');
  const [customerSiteId, setCustomerSiteId] = useState(DEMO_CUSTOMER_SITES[0].id);
  const [analysis, setAnalysis] = useState<{ result: Analysis; forText: string } | null>(null);
  const [analysisError, setAnalysisError] = useState('');
  const [approveError, setApproveError] = useState('');
  const requestId = useRef(0);
  const hub = hubQ.data;
  const customerSite = DEMO_CUSTOMER_SITES.find((site) => site.id === customerSiteId)!;
  const matches = useMemo(
    () => rankQualifiedTechnicians(hub, analysis?.result.parts || [], customerSite),
    [hub, analysis, customerSite],
  );
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
    entry.completion_dispatch_id == null &&
    new Date(entry.timestamp).toDateString() === new Date().toDateString(),
  ).length;

  const completeJob = async (dispatchId: number) => {
    if (completionLock.current || approve.isPending || hubQ.isError) return false;
    completionLock.current = true;
    setCompletionError('');
    try {
      const updated = await complete.mutateAsync({ data: { dispatch_id: dispatchId, completed_by: APPROVER } });
      await qc.cancelQueries({ queryKey: getGetHubDataQueryKey() });
      qc.setQueryData(getGetHubDataQueryKey(), updated);
      void qc.invalidateQueries({ queryKey: getGetHubDataQueryKey() });
      toast({ title: 'Job completed', description: `Dispatch #${dispatchId} completed. Technician available again; consumed stock unchanged.` });
      return true;
    } catch (error) {
      void qc.invalidateQueries({ queryKey: getGetHubDataQueryKey() });
      const detail = message(error);
      setCompletionError(detail);
      toast({ title: 'Completion failed', description: detail, variant: 'destructive' });
      return false;
    } finally {
      completionLock.current = false;
    }
  };

  const updateNotes = (value: string) => {
    if (approve.isPending) return;
    requestId.current += 1;
    setNotes(value);
    if (analysis && analysis.forText !== value.trim()) setAnalysis(null);
    setAnalysisError('');
    setApproveError('');
  };

  const updateCustomerSite = (id: string) => {
    const site = DEMO_CUSTOMER_SITES.find((site) => site.id === id);
    if (approve.isPending || !site) return;
    requestId.current += 1;
    setCustomerSiteId(site.id);
    setAnalysis(null);
    setAnalysisError('');
    setApproveError('');
  };

  const runAnalysis = async () => {
    const text = notes.trim();
    if (!text || analyze.isPending || approve.isPending) return false;
    const id = ++requestId.current;
    setAnalysis(null);
    setAnalysisError('');
    setApproveError('');
    try {
      const result = await analyze.mutateAsync({ data: { text } });
      if (id !== requestId.current) return false;
      setAnalysis({ result, forText: text });
      return true;
    } catch (error) {
      if (id === requestId.current) setAnalysisError(message(error));
      return false;
    }
  };

  const approveDispatch = async () => {
    if (!analysis || analysis.forText !== notes.trim() || !match || approve.isPending || completionLock.current || hubQ.isError) return false;
    const snapshot = { tech: match, parts: analysis.result.parts, customerSite };
    setApproveError('');
    try {
      const updated = await approve.mutateAsync({
        data: {
          tech_id: snapshot.tech.id, van_id: snapshot.tech.van_id,
          parts: snapshot.parts, approved_by: APPROVER,
          customer_site_id: snapshot.customerSite.id,
        },
      });
      await qc.cancelQueries({ queryKey: getGetHubDataQueryKey() });
      qc.setQueryData(getGetHubDataQueryKey(), updated);
      setAnalysis(null);
      setNotes('');
      requestId.current += 1;
      void qc.invalidateQueries({ queryKey: getGetHubDataQueryKey() });
      toast({
        title: 'Job dispatched',
        description: `${snapshot.tech.name} · Van ${snapshot.tech.van_id} assigned. ${snapshot.parts.length} parts reserved.`,
      });
      return true;
    } catch (error) {
      void qc.invalidateQueries({ queryKey: getGetHubDataQueryKey() });
      const conflict = (error as { status?: number })?.status === 409;
      const detail = conflict
        ? 'Hub state changed before approval. Data refreshed; review technician availability and stock before trying again.'
        : message(error);
      setApproveError(detail);
      toast({ title: conflict ? 'Dispatch conflict' : 'Dispatch failed', description: detail, variant: 'destructive' });
      return false;
    }
  };

  return {
    hubQ, analyze, approve, notes, analysis, analysisError, approveError,
    matches, match, technicians, inventory, activity,
    availableCount, lowStockCount, dispatchedToday,
    customerSiteId, customerSite, updateCustomerSite,
    updateNotes, runAnalysis, approveDispatch,
    complete, completeJob, completionError,
  };
}

export type DispatchState = ReturnType<typeof useDispatchHub>;
