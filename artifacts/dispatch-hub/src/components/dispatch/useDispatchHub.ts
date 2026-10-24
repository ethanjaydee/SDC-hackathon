import { useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetConversationThreadQueryKey, getGetHubDataQueryKey, getListConversationsQueryKey,
  useAnalyzeRequest, useApproveDispatch, useCompleteDispatch,
  useGetHubData,
  useResetTechnicianAvailability,
  type Analysis, type HubData, type Technician,
} from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';
import { DEFAULT_SHOP, DEMO_CUSTOMER_SITES } from './demoLocations';
import { rankQualifiedTechnicians } from './matching';
import { canAutoRefresh, pollInterval } from '@/lib/reliability';
import { intakeSchema, positiveIdSchema } from '@/lib/validation';
import { WriteGate, performHubWrite, optimisticAvailable, optimisticDispatch } from '@/lib/hub-write';

export const APPROVER = 'Demo Dispatcher';

function allocatedVan(updated: HubData, techId: number) {
  const latest = [...updated.activity_log].filter((e) => e.dispatch?.tech_id === techId && e.dispatch.status === 'Active').sort((a, b) => b.id - a.id)[0];
  const id = latest?.dispatch?.van_id;
  return id == null ? null : updated.vans?.find((v) => v.id === id)?.name ?? `Van ${id}`;
}

function message(error: unknown) {
  const e = error as { data?: { error?: string }; message?: string };
  return e?.data?.error || e?.message || 'The request could not be completed.';
}

export function useDispatchHub() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const gate = useRef(new WriteGate());
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const writePending = pendingAction !== null;
  const hubQ = useGetHubData({
    query: {
      queryKey: getGetHubDataQueryKey(),
      enabled: !writePending,
      refetchInterval: pollInterval(),
      refetchOnWindowFocus: canAutoRefresh,
    },
  });
  const analyze = useAnalyzeRequest();
  const approve = useApproveDispatch();
  const complete = useCompleteDispatch();
  const reset = useResetTechnicianAvailability();
  const [completionError, setCompletionError] = useState('');
  const [resetError, setResetError] = useState('');
  const [notes, setNotes] = useState('');
  const [customerSiteId, setCustomerSiteId] = useState(DEMO_CUSTOMER_SITES[0].id);
  const [analysis, setAnalysis] = useState<{ result: Analysis; forText: string } | null>(null);
  const [analysisError, setAnalysisError] = useState('');
  const [approveError, setApproveError] = useState('');
  const requestId = useRef(0);
  const hub = hubQ.data;
  const shop = hub?.shop ?? DEFAULT_SHOP;
  const connectionLost = hubQ.isError || hubQ.failureCount > 0 || hubQ.fetchStatus === 'paused';
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
  const lowStockCount = inventory.filter((item) => item.quantity < 5).length;
  const dispatchedToday = activity.filter((entry) =>
    entry.completion_dispatch_id == null &&
    entry.action_details.startsWith('Dispatch approved:') &&
    new Date(entry.timestamp).toDateString() === new Date().toDateString(),
  ).length;

  const writeHub = async (
    action: string,
    optimistic: (current: HubData) => HubData,
    request: () => Promise<HubData>,
  ): Promise<HubData | null> => {
    if (connectionLost || !hubQ.data) return null;
    const key = getGetHubDataQueryKey();
    return performHubWrite(gate.current, {
      cancel: () => qc.cancelQueries({ queryKey: key }),
      read: () => qc.getQueryData<HubData>(key),
      write: (value) => { qc.setQueryData(key, value); },
      optimistic, request,
      pending: (value) => setPendingAction(value ? action : null),
      markStale: () => qc.invalidateQueries({ queryKey: key, refetchType: 'none' }),
    });
  };

  const completeJob = async (dispatchId: number, completedBy = APPROVER) => {
    if (!positiveIdSchema.safeParse(dispatchId).success || gate.current.busy) return false;
    setCompletionError('');
    try {
      const techId = activity.find((entry) => entry.id === dispatchId)?.dispatch?.tech_id;
      const updated = await writeHub('Completing job', (current) => techId ? optimisticAvailable(current, techId) : current,
        () => complete.mutateAsync({ data: { dispatch_id: dispatchId, completed_by: completedBy.trim() || APPROVER } }));
      if (!updated) return false;
      toast({ title: 'Job completed', description: `Dispatch #${dispatchId} completed. Technician available again; consumed stock unchanged.` });
      return true;
    } catch (error) {
      void qc.invalidateQueries({ queryKey: getGetHubDataQueryKey() });
      const detail = message(error);
      setCompletionError(detail);
      toast({ title: 'Completion failed', description: detail, variant: 'destructive' });
      return false;
    }
  };

  const resetTechnician = async (technicianId: number) => {
    if (!positiveIdSchema.safeParse(technicianId).success || gate.current.busy) return false;
    setResetError('');
    try {
      const updated = await writeHub('Resetting technician', (current) => optimisticAvailable(current, technicianId),
        () => reset.mutateAsync({ data: { technician_id: technicianId, reset_by: APPROVER } }));
      if (!updated) return false;
      const technician = updated.technicians.find((item) => item.id === technicianId);
      toast({
        title: 'Technician reset',
        description: `${technician?.name || 'Technician'} is available. Dispatch history and van stock are unchanged.`,
      });
      return true;
    } catch (error) {
      void qc.invalidateQueries({ queryKey: getGetHubDataQueryKey() });
      const detail = message(error);
      setResetError(detail);
      toast({ title: 'Reset failed', description: detail, variant: 'destructive' });
      return false;
    }
  };

  const updateNotes = (value: string) => {
    if (gate.current.busy) return;
    requestId.current += 1;
    setNotes(value);
    if (analysis && analysis.forText !== value.trim()) setAnalysis(null);
    setAnalysisError('');
    setApproveError('');
  };

  const updateCustomerSite = (id: string) => {
    const site = DEMO_CUSTOMER_SITES.find((site) => site.id === id);
    if (gate.current.busy || !site) return;
    requestId.current += 1;
    setCustomerSiteId(site.id);
    setAnalysis(null);
    setAnalysisError('');
    setApproveError('');
  };

  const runAnalysis = async () => {
    const text = notes.trim();
    if (analyze.isPending || gate.current.busy) return false;
    const parsed = intakeSchema.safeParse({ text, customer_site_id: customerSiteId });
    if (!parsed.success) {
      setAnalysisError(parsed.error.issues[0]?.message || 'Check the intake fields.');
      return false;
    }
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
    if (!analysis || analysis.forText !== notes.trim() || !match || gate.current.busy || connectionLost) return false;
    const snapshot = { tech: match, parts: analysis.result.parts, customerSite };
    setApproveError('');
    try {
      const updated = await writeHub('Dispatching job',
        (current) => optimisticDispatch(current, snapshot.tech.id, snapshot.tech.van_id, snapshot.parts),
        () => approve.mutateAsync({
        data: {
          tech_id: snapshot.tech.id, van_id: snapshot.tech.van_id,
          parts: snapshot.parts, approved_by: APPROVER,
          customer_site_id: snapshot.customerSite.id,
        },
      }));
      if (!updated) return false;
      setAnalysis(null);
      setNotes('');
      requestId.current += 1;
      toast({
        title: 'Job dispatched',
        description: `${snapshot.tech.name} · ${allocatedVan(updated, snapshot.tech.id) ?? 'Shared van'} allocated. ${snapshot.parts.length} parts reserved.`,
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

  const approveConversationDispatch = async (
    conversationId: number,
    result: Analysis,
    siteId: string,
    technician: Technician,
    approvedBy: string = APPROVER,
  ) => {
    const site = DEMO_CUSTOMER_SITES.find((item) => item.id === siteId);
    if (!site || !positiveIdSchema.safeParse(conversationId).success ||
        !hubQ.data || !rankQualifiedTechnicians(hubQ.data, result.parts, site, result.complexity).some((item) => item.id === technician.id) ||
        gate.current.busy || connectionLost) return false;
    const snapshot = { conversationId, site, technician, parts: result.parts };
    setApproveError('');
    try {
      const updated = await writeHub('Dispatching job',
        (current) => optimisticDispatch(current, snapshot.technician.id, snapshot.technician.van_id, snapshot.parts),
        () => approve.mutateAsync({
          data: {
            conversation_id: snapshot.conversationId,
            customer_site_id: snapshot.site.id,
            tech_id: snapshot.technician.id,
            van_id: snapshot.technician.van_id,
            parts: snapshot.parts,
            approved_by: approvedBy,
          },
        }));
      if (!updated) return false;
      setAnalysis(null);
      requestId.current += 1;
      void qc.invalidateQueries({ queryKey: getGetConversationThreadQueryKey(conversationId) });
      void qc.invalidateQueries({ queryKey: getListConversationsQueryKey() });
      toast({
        title: 'Job dispatched',
        description: `${snapshot.technician.name} · ${allocatedVan(updated, snapshot.technician.id) ?? 'Shared van'} allocated from chat #${conversationId}.`,
      });
      return true;
    } catch (error) {
      void qc.invalidateQueries({ queryKey: getGetHubDataQueryKey() });
      const conflict = (error as { status?: number })?.status === 409;
      const detail = conflict
        ? 'Hub state or conversation changed before approval. Refresh the chat and review the current stock and technician match.'
        : message(error);
      setApproveError(detail);
      toast({ title: conflict ? 'Dispatch conflict' : 'Dispatch failed', description: detail, variant: 'destructive' });
      return false;
    }
  };

  return {
    hubQ, shop, analyze, approve, notes, analysis, analysisError, approveError,
    matches, match, technicians, inventory, activity,
    availableCount, lowStockCount, dispatchedToday,
    customerSiteId, customerSite, updateCustomerSite,
    updateNotes, runAnalysis, approveDispatch, approveConversationDispatch,
    complete, completeJob, completionError,
    reset, resetTechnician, resetError,
    writePending, pendingAction, connectionLost,
  };
}

export type DispatchState = ReturnType<typeof useDispatchHub>;
