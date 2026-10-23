import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { ArrowLeft, Bot, CheckCircle2, ChevronDown, ExternalLink, FlaskConical, Loader2, MapPin, MessageSquareText, RefreshCw, Route as RouteIcon, Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  getGetConversationThreadQueryKey, getListConversationsQueryKey,
  recommendTechnicians, useAnalyzeConversation, useGetConversationThread, useSendTelegramReply, useGetTelegramStatus, getGetTelegramStatusQueryKey, useSetConversationSite,
  type Technician, type DemoSiteId,
} from '@workspace/api-client-react';
import { DEMO_CUSTOMER_SITES, getTechnicianLocation } from './demoLocations';
import { LevelBadge, ratingText } from './techMeta';
import { MiniRouteMap } from './MiniRouteMap';
import { SlideToApprove } from './SlideToApprove';
import { rankQualifiedTechnicians } from './matching';
import { APPROVER, type DispatchState } from './useDispatchHub';
import { Card, InlineError, Mono, PageHead, PartChips, StatusBadge, dateTime, errorText, initials, fieldClass } from './shared';
import { MessagingConnectionNotice } from './MessagingConnectionNotice';

const urgencyTone = { High: 'err', Med: 'pending', Medium: 'pending', Low: 'idle' } as const;
type Props = { hub: DispatchState; conversationId: number; onApprove: (tech: Technician) => void };

export default function AnalysisPage({ hub, conversationId, onApprove }: Props) {
  const qc = useQueryClient();
  const validId = Number.isSafeInteger(conversationId) && conversationId > 0;
  const threadQ = useGetConversationThread(conversationId, {
    query: {
      queryKey: getGetConversationThreadQueryKey(conversationId),
      enabled: validId,
      refetchInterval: 5_000,
      refetchOnWindowFocus: true,
    },
  });
  const analyze = useAnalyzeConversation();
  const tgQ = useGetTelegramStatus({ query: { queryKey: getGetTelegramStatusQueryKey(), refetchInterval: 15_000 } });
  const [replyText, setReplyText] = useState('');
  const sendReply = useSendTelegramReply({
    mutation: {
      onSuccess: async (updated) => {
        await qc.cancelQueries({ queryKey: getGetConversationThreadQueryKey(conversationId) });
        qc.setQueryData(getGetConversationThreadQueryKey(conversationId), updated);
        void qc.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        setReplyText('');
      },
    },
  });
  const setSite = useSetConversationSite({
    mutation: {
      onSuccess: async (updated) => {
        await qc.cancelQueries({ queryKey: getGetConversationThreadQueryKey(conversationId) });
        qc.setQueryData(getGetConversationThreadQueryKey(conversationId), updated);
        void qc.invalidateQueries({ queryKey: getListConversationsQueryKey() });
      },
    },
  });
  const [newMessagesSinceOpen, setNewMessagesSinceOpen] = useState(0);
  const lastObservedMessage = useRef<{ conversationId: number; messageId: number } | null>(null);
  const autoAnalyzeAttempted = useRef(new Set<number>());

  useEffect(() => {
    setReplyText('');
    sendReply.reset();
  }, [conversationId]);

  useEffect(() => {
    const thread = threadQ.data;
    const latestMessageId = thread?.latest_message_id;
    if (!thread || latestMessageId == null) return;

    const previous = lastObservedMessage.current;
    if (!previous || previous.conversationId !== conversationId) {
      lastObservedMessage.current = { conversationId, messageId: latestMessageId };
      setNewMessagesSinceOpen(0);
      return;
    }
    if (latestMessageId > previous.messageId) {
      const addedCustomerMessages = thread.messages.filter(
        (message) => message.id > previous.messageId && message.sender_role === 'Customer',
      ).length;
      if (addedCustomerMessages > 0) {
        setNewMessagesSinceOpen((count) => count + addedCustomerMessages);
      }
      lastObservedMessage.current = { conversationId, messageId: latestMessageId };
    }
  }, [conversationId, threadQ.data]);

  useEffect(() => {
    const thread = threadQ.data;
    if (!thread || autoAnalyzeAttempted.current.has(conversationId)) return;
    autoAnalyzeAttempted.current.add(conversationId);
    const analysisIsCurrent = thread.analysis != null &&
      thread.analyzed_through_message_id === thread.latest_message_id;
    if (analysisIsCurrent || thread.dispatch_activity_id != null) return;
    analyze.mutate({ id: conversationId }, {
      onSuccess: (updated) => {
        qc.setQueryData(getGetConversationThreadQueryKey(conversationId), updated);
        void qc.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        if (updated.analysis && updated.analyzed_through_message_id === updated.latest_message_id) {
          setNewMessagesSinceOpen(0);
        }
      },
    });
  }, [analyze, conversationId, qc, threadQ.data]);

  const thread = threadQ.data;
  const orderedMessages = [...(thread?.messages ?? [])].sort((a, b) => a.id - b.id);
  // Saved assignments retain their historical site; never reinterpret an old ID
  // using today's relocated demo-site catalog.
  const site = thread?.dispatch_activity_id != null
    ? hub.hubQ.data?.activity_log.find((entry) => entry.id === thread.dispatch_activity_id)?.dispatch?.customer_site ?? undefined
    : DEMO_CUSTOMER_SITES.find((item) => item.id === thread?.customer_site_id);
  const analysis = thread?.analysis ?? null;
  const analysisIsCurrent = !!thread && !!analysis &&
    thread.analyzed_through_message_id === thread.latest_message_id;
  const complexity = analysis?.complexity ?? thread?.complexity ?? 'Normal';
  const matches = useMemo(
    () => site ? rankQualifiedTechnicians(hub.hubQ.data, analysis?.parts ?? [], site, complexity) : [],
    [hub.hubQ.data, analysis, site, complexity],
  );
  const dispatchSaved = thread?.dispatch_activity_id != null;
  const analyzedId = thread?.analyzed_through_message_id ?? null;
  const siteId = thread?.customer_site_id ?? null;
  const analysisSignature = JSON.stringify([analysis?.issue, analysis?.parts, complexity, analysis?.analysis_source]);
  const recKey = ['technician-recommendations', conversationId, analyzedId, siteId, analysisSignature] as const;
  const recQ = useQuery({
    queryKey: recKey,
    queryFn: ({ signal }) => recommendTechnicians(conversationId, { signal }),
    enabled: validId && analysisIsCurrent && !dispatchSaved && !!siteId,
    staleTime: (query) => query.state.data?.source === 'AI' ? 5 * 60_000 : 0,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    refetchInterval: false,
    retry: false,
  });
  const recs = recQ.data && recQ.data.analysis_message_id === analyzedId ? recQ.data : null;
  const eligibleIds = useMemo(() => new Set(matches.map((m) => m.id)), [matches]);
  const recommendedId = recs?.recommended_technician_id != null && eligibleIds.has(recs.recommended_technician_id) ? recs.recommended_technician_id : null;
  const selectedId = recommendedId ?? matches[0]?.id ?? null;
  const match = matches.find((m) => m.id === selectedId) ?? null;
  const minLevel = complexity === 'Hard' ? 3 : complexity === 'Normal' ? 2 : 1;
  const selectedCandidate = match ? recs?.candidates.find((c) => c.technician_id === match.id) : undefined;
  const keyStr = recKey.join('|');

  const runAnalysis = () => {
    if (!validId || analyze.isPending) return;
    analyze.mutate({ id: conversationId }, {
      onSuccess: (updated) => {
        qc.setQueryData(getGetConversationThreadQueryKey(conversationId), updated);
        void qc.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        if (updated.analysis && updated.analyzed_through_message_id === updated.latest_message_id) {
          setNewMessagesSinceOpen(0);
        }
      },
    });
  };

  const approve = async () => {
    if (!thread || !thread.customer_site_id || !analysis || !analysisIsCurrent || !match || dispatchSaved || !eligibleIds.has(match.id)) return false;
    const ok = await hub.approveConversationDispatch(conversationId, analysis, thread.customer_site_id, match);
    if (ok) onApprove(match);
    return ok;
  };

  if (!validId) {
    return <InlineError><Link href="/intake" className="underline">Choose a saved conversation</Link> to review.</InlineError>;
  }
  if (threadQ.isLoading) return <div className="w-full space-y-4"><Skeleton className="h-24" /><Skeleton className="h-72" /></div>;
  if (!thread) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <InlineError onRetry={() => void threadQ.refetch()} retrying={threadQ.isFetching}>This conversation could not be loaded.</InlineError>
        <Button asChild variant="outline"><Link href="/intake"><ArrowLeft size={14} /> Back to inbox</Link></Button>
      </div>
    );
  }

  const posOf = (t: Technician) => (t.lat != null && t.lng != null ? { lat: t.lat, lng: t.lng } : getTechnicianLocation(t.id));
  const matchPos = match ? posOf(match) : undefined;
  const mapPoints = match && matchPos ? [{ id: match.id, name: match.name, lat: matchPos.lat, lng: matchPos.lng, selected: true, eligible: true }] : [];
  const directionsUrl = matchPos && site
    ? `https://www.google.com/maps/dir/?api=1&origin=${matchPos.lat},${matchPos.lng}&destination=${site.lat},${site.lng}&travelmode=driving` : null;
  const fmtKm = (m: number) => `${(m / 1000).toFixed(1)} km`;
  const fmtMin = (s: number) => `${Math.max(1, Math.round(s / 60))} min`;
  const earlierMessages = orderedMessages.slice(0, -2);
  const recentMessages = orderedMessages.slice(-2);
  const isTelegram = thread.source === 'Telegram';
  const tg = tgQ.data;
  const tgLive = !tgQ.isError && !!tg?.connected;
  const canSend = isTelegram && thread.can_send_telegram_reply && tgLive;
  const sendNote = !isTelegram
    ? 'Demo request: it did not come from Telegram, so nothing can be delivered to this customer. Messages are never faked.'
    : tgQ.isLoading ? 'Checking Telegram connection…'
    : !tgLive ? `Telegram is not connected${tg?.error ? ` (${tg.error})` : ''}. Sending is unavailable until the bot reconnects.`
    : !thread.can_send_telegram_reply ? 'Telegram only lets the bot reply after the customer messages first. Ask the customer to send one more message.'
    : 'Delivered through Telegram only when you press Send.';
  const routeReady = recs?.routing_status === 'ready' || recs?.routing_status === 'partial';
  return (
    <div className="w-full space-y-5">
      <header className="flex flex-col gap-4 pb-1 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary">Service request · #{thread.id}</p>
          <h1 className="mt-1.5 break-words text-[32px] font-semibold leading-[1.04] tracking-tight md:text-[46px]" data-testid="request-title">{thread.subject}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{thread.customer_name} · {site?.label ?? 'Customer site not assigned'} · Analysis and dispatch review</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline"><Link href="/intake"><ArrowLeft size={14} /> Back to inbox</Link></Button>
          {dispatchSaved && <Button asChild variant="outline"><Link href="/log">View dispatch log</Link></Button>}
        </div>
      </header>

      <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(420px,.9fr)] 2xl:gap-7">
        <div className="min-w-0 space-y-4">
          <Card className={dispatchSaved ? 'dh-dispatched-glass border-emerald-300/70 shadow-emerald-950/5' : ''}
            title={<><MessageSquareText size={15} /> Customer conversation</>} aside={
            <span className="flex flex-wrap items-center justify-end gap-2">
              <StatusBadge tone={isTelegram ? (tgLive ? 'ok' : 'pending') : 'idle'}>{isTelegram ? (tgLive ? 'Telegram connected' : 'Telegram offline') : 'Demo request'}</StatusBadge>
              <Mono>{thread.message_count} messages</Mono>
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <RefreshCw size={10} className={threadQ.isFetching ? 'animate-spin' : ''} /> Auto-updating
              </span>
            </span>
          }>
            {threadQ.isError && (
              <p role="status" className="mb-3 rounded-md border border-pending/30 bg-pending/[0.07] p-3 text-xs">
                New replies could not be checked. Refresh before dispatching.
                <button type="button" className="ml-1 underline" onClick={() => void threadQ.refetch()}>Refresh</button>
              </p>
            )}
            {newMessagesSinceOpen > 0 && (
              <p role="status" className="mb-3 rounded-md border border-pending/30 bg-pending/[0.07] p-3 text-xs">
                {newMessagesSinceOpen} new {newMessagesSinceOpen === 1 ? 'message' : 'messages'} · re-analyze before dispatching.
              </p>
            )}
            <ol className="space-y-3" aria-label="Most recent conversation messages" data-testid="conversation-transcript">
              {recentMessages.map((message) => {
                const customer = message.sender_role === 'Customer';
                return (
                  <li key={message.id} data-testid={`message-${message.id}`}
                    className={`max-w-[96%] rounded-xl border p-3 sm:max-w-[92%] ${customer ? 'mr-auto border-card-border bg-secondary/50' : 'ml-auto border-primary/20 bg-primary/[0.06]'}`}>
                    <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-semibold">{message.sender_role}</span>
                      <time className="font-mono tabular text-[10px] text-muted-foreground" dateTime={message.created_at}>{dateTime(message.created_at)}</time>
                    </div>
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.text}</p>
                  </li>
                );
              })}
            </ol>
            {earlierMessages.length > 0 && (
              <details className="group mt-3 rounded-lg border border-card-border bg-card">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-sm font-medium [&::-webkit-details-marker]:hidden">
                  <span>Earlier messages <Mono className="ml-1 text-muted-foreground">({earlierMessages.length})</Mono></span>
                  <ChevronDown size={15} className="text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <ol className="max-h-[320px] space-y-2 overflow-y-auto border-t border-card-border p-3" aria-label="Earlier conversation messages">
                  {earlierMessages.map((message) => {
                    const customer = message.sender_role === 'Customer';
                    return (
                      <li key={message.id} data-testid={`message-${message.id}`}
                        className={`rounded-lg border p-3 ${customer ? 'border-card-border bg-secondary/50' : 'border-primary/20 bg-primary/[0.06]'}`}>
                        <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span className="font-semibold">{message.sender_role}</span>
                          <time className="font-mono tabular text-[10px] text-muted-foreground" dateTime={message.created_at}>{dateTime(message.created_at)}</time>
                        </div>
                        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.text}</p>
                      </li>
                    );
                  })}
                </ol>
              </details>
            )}
            <details className="group mt-3 rounded-lg border border-card-border bg-card">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-sm font-medium [&::-webkit-details-marker]:hidden">
                <span className="inline-flex items-center gap-2"><FlaskConical size={13} className="text-primary" /> Conversation summary</span>
                <ChevronDown size={15} className="text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <p className="border-t border-card-border px-3 py-3 text-sm leading-relaxed">{thread.mock_summary}</p>
            </details>
            <form className="mt-4 border-t border-card-border pt-4" data-testid="telegram-reply-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (canSend && replyText.trim() && !sendReply.isPending) {
                  sendReply.mutate({ id: conversationId, data: { text: replyText.trim() } });
                }
              }}>
              <label htmlFor="telegram-customer-reply" className="mb-2 block text-xs font-medium">Contact customer via Telegram</label>
              <textarea id="telegram-customer-reply" rows={2} maxLength={4096} className={fieldClass}
                value={replyText}
                disabled={!canSend || sendReply.isPending}
                placeholder={canSend ? 'Write a reply…' : 'Sending unavailable for this request'}
                aria-describedby="telegram-reply-help"
                onChange={(event) => {
                  if (sendReply.error) sendReply.reset();
                  setReplyText(event.target.value);
                }} />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <p id="telegram-reply-help" className="min-w-0 flex-1 text-[11px] text-muted-foreground">
                  {sendNote}
                  {canSend && <span className="ml-2 font-mono">{replyText.length}/4096</span>}
                </p>
                <Button type="submit" disabled={!canSend || !replyText.trim() || sendReply.isPending} data-testid="button-send-telegram-reply">
                  {sendReply.isPending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  {sendReply.isPending ? 'Sending…' : 'Send via Telegram'}
                </Button>
              </div>
              {sendReply.error && <p role="alert" className="mt-2 text-xs text-err">{errorText(sendReply.error)}</p>}
            </form>
            <details className="group mt-4 border-t border-card-border pt-3">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-medium text-muted-foreground [&::-webkit-details-marker]:hidden">
                <span>Telegram connection details</span>
                <ChevronDown size={14} className="transition-transform group-open:rotate-180" />
              </summary>
              <div className="mt-3"><MessagingConnectionNotice /></div>
            </details>
          </Card>

          {isTelegram && (
            <Card title={<><MapPin size={15} /> Customer sample site</>}>
              <label htmlFor="conversation-site" className="mb-2 block text-xs text-muted-foreground">No location is inferred from Telegram. Choose a synthetic site before dispatching.</label>
              <select id="conversation-site" data-testid="select-conversation-site" className={fieldClass} value={thread.customer_site_id ?? ''}
                disabled={setSite.isPending || dispatchSaved}
                onChange={(event) => setSite.mutate({ id: conversationId, data: { customer_site_id: event.target.value as DemoSiteId } })}>
                <option value="" disabled>Choose a sample site…</option>
                {DEMO_CUSTOMER_SITES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
              {setSite.error && <p role="alert" className="mt-2 text-xs text-err">{errorText(setSite.error)}</p>}
            </Card>
          )}

          <Card title="AI analysis" aside={
            analysisIsCurrent ? <StatusBadge tone="ok"><CheckCircle2 size={10} /> Current</StatusBadge>
              : <StatusBadge tone="pending">{analyze.isPending ? 'Analyzing' : 'Re-analysis needed'}</StatusBadge>
          }>
            {analyze.error && <InlineError onRetry={runAnalysis} retrying={analyze.isPending} retryLabel="Retry analysis">{errorText(analyze.error)}</InlineError>}
            {analysis ? (
              <div className="space-y-4">
                {!analysisIsCurrent && <p role="status" className="rounded-md border border-pending/30 bg-pending/[0.07] p-3 text-xs">The chat changed after this result. Re-analyze it before dispatching.</p>}
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Suggested issue · {analysis.is_fallback === false || analysis.analysis_source === 'AI' ? 'AI analysis' : 'Rule-based analysis'}</p>
                  <div className="mt-1 flex flex-wrap items-start justify-between gap-2">
                    <h2 className="text-lg font-semibold">{analysis.issue}</h2>
                    <StatusBadge tone={urgencyTone[analysis.urgency]}>{analysis.urgency} urgency</StatusBadge>
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Required parts</p>
                  <PartChips parts={analysis.parts} />
                </div>
                {!analysisIsCurrent && (
                  <Button type="button" variant="outline" onClick={runAnalysis} disabled={analyze.isPending} data-testid="button-reanalyze-conversation">
                    <RefreshCw size={13} className={analyze.isPending ? 'animate-spin' : ''} />
                    {analyze.isPending ? 'Analyzing latest messages…' : 'Analyze updated chat'}
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p role="status" className="rounded-md border border-pending/30 bg-pending/[0.07] p-3 text-sm">
                  This conversation has messages that have not been analyzed yet. Analyze the latest chat before dispatching.
                </p>
                <Button type="button" onClick={runAnalysis} disabled={analyze.isPending} data-testid="button-analyze-conversation">
                  {analyze.isPending ? <Loader2 size={14} className="animate-spin" /> : <FlaskConical size={14} />}
                  {analyze.isPending ? 'Analyzing selected chat…' : 'Analyze this conversation'}
                </Button>
              </div>
            )}
          </Card>
        </div>

        <div className="min-w-0 space-y-4">
          {dispatchSaved && <Card title="Dispatch already recorded"><p className="text-sm text-muted-foreground">This request is assigned and remains here for review. It cannot be approved again. Use Service History to check completion status.</p></Card>}
          {!dispatchSaved && !(analysis && analysisIsCurrent) && (
            <Card title={<><Sparkles size={15} /> Recommended technician</>}>
              <p role="status" className="text-sm text-muted-foreground">A recommendation appears once the analysis is current for the latest messages.</p>
            </Card>
          )}
          {analysis && analysisIsCurrent && !dispatchSaved && (
            <>
              <Card title={<><Sparkles size={15} /> Recommended technician</>} aside={<StatusBadge tone={complexity === 'Hard' ? 'err' : complexity === 'Normal' ? 'pending' : 'ok'}>{complexity}</StatusBadge>}>
                {hub.hubQ.isLoading ? <Skeleton className="h-24" />
                  : !hub.hubQ.data ? <InlineError onRetry={() => void hub.hubQ.refetch()} retrying={hub.hubQ.isFetching}>Reconnect to the hub to match a technician.</InlineError>
                    : !site ? <div role="status" className="rounded-lg border border-pending/30 bg-pending/[0.07] p-4 text-sm"><b>Customer site is not assigned.</b> Choose a sample site first.</div>
                      : !match ? (
                        <div role="status" className="rounded-lg border border-pending/30 bg-pending/[0.07] p-4 text-sm">
                          <b>No qualified technician.</b> {complexity} jobs need Level {minLevel}+, an available tech, and a van with every required part.
                        </div>
                      ) : (
                        <div className="space-y-3" data-testid="recommendation-summary" aria-live="polite">
                          <div className="flex items-center gap-3 rounded-xl border border-ok/40 bg-ok/[0.07] p-3.5" data-testid="recommended-technician">
                            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-secondary font-mono text-sm font-semibold">{initials(match.name)}</span>
                            <span className="min-w-0 flex-1">
                              <span className="flex flex-wrap items-center gap-x-2 gap-y-1"><span className="truncate text-base font-semibold">{match.name}</span><LevelBadge tech={match} /></span>
                              <span className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                                <span>Rating {ratingText(match)}</span><span>{match.zone}</span><Mono>Van {match.van_id}</Mono>
                              </span>
                            </span>
                            <span className="shrink-0 text-right text-xs">
                              {selectedCandidate?.distance_meters != null && selectedCandidate.duration_seconds != null
                                ? <><b className="font-mono text-lg tabular">{fmtMin(selectedCandidate.duration_seconds)}</b><span className="block text-muted-foreground">{fmtKm(selectedCandidate.distance_meters)} · Google</span></>
                                : <span className="text-muted-foreground">Distance and ETA unavailable</span>}
                            </span>
                          </div>
                          {recQ.isLoading || (recQ.isFetching && !recs) ? <div className="space-y-2" role="status" aria-label="Loading recommendation"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" /></div>
                            : recs ? (
                              <div>
                                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                                  <StatusBadge tone={recs.source === 'AI' ? 'ok' : 'idle'}>{recs.source === 'AI' ? <><Bot size={10} /> AI recommendation</> : 'Rule-based fallback, not AI'}</StatusBadge>
                                  <Button type="button" size="sm" variant="ghost" onClick={() => void recQ.refetch()} disabled={recQ.isFetching} data-testid="button-refresh-recommendations">
                                    <RefreshCw size={12} className={recQ.isFetching ? 'animate-spin' : ''} /> Refresh
                                  </Button>
                                </div>
                                <p className="text-sm leading-relaxed">{recs.summary}</p>
                                {selectedCandidate?.reason && <p className="mt-1.5 text-xs text-muted-foreground">{selectedCandidate.reason}</p>}
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">{recQ.isError ? 'AI recommendation could not be loaded. This technician is the top rule-based match from current hub data, not AI.' : 'AI recommendation is not available. This is the top rule-based match, not AI.'}</p>
                                <Button type="button" size="sm" variant="outline" onClick={() => void recQ.refetch()} disabled={recQ.isFetching} data-testid="button-refresh-recommendations"><RefreshCw size={12} /> Try again</Button>
                              </div>
                            )}
                          {recs && (
                            <p className={`flex items-start gap-1.5 text-xs ${recs.routing_status === 'ready' ? 'text-muted-foreground' : 'text-pending'}`} data-testid="routing-status">
                              <RouteIcon size={12} className="mt-0.5 shrink-0" />
                              <span>{recs.routing_status === 'ready' ? 'Drive time from Google Routes.' : recs.routing_status === 'partial' ? 'Drive time may be missing.' : 'Drive time unavailable.'} {recs.routing_message}</span>
                            </p>
                          )}
                        </div>
                      )}
              </Card>

              {site && match && mapPoints.length > 0 && (
                <Card title={<><MapPin size={15} /> Route</>} aside={directionsUrl ? (
                  <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-primary" data-testid="link-google-directions">
                    Open directions in Google Maps <ExternalLink size={11} />
                  </a>) : undefined}>
                  <MiniRouteMap customer={site} technicians={mapPoints}
                    polyline={routeReady && selectedCandidate ? selectedCandidate.polyline : null} />
                  {!recs && (
                    <p className="mt-2 text-xs text-muted-foreground" role="status" data-testid="route-loading">
                      {recQ.isFetching ? 'Loading the Google route for this recommendation…' : 'Route information is not available yet. Refresh the recommendation to try again.'}
                    </p>
                  )}
                  {recs && !selectedCandidate?.polyline && (
                    <p className="mt-2 text-xs text-pending" role="status" data-testid="route-unavailable">
                      {recs.routing_status === 'not_configured'
                        ? 'Google Routes is not configured on the server. No route line, distance, or ETA is shown.'
                        : 'Google did not return a route for this recommended technician. No route line, distance, or ETA is shown.'}
                    </p>
                  )}
                </Card>
              )}

              {match && (
                <Card title={<><CheckCircle2 size={15} /> Approve dispatch</>} aside={<span className="truncate text-xs">{match.name} · Van {match.van_id}</span>}>
                  <div className="space-y-3">
                    {hub.approveError && <InlineError>{hub.approveError}</InlineError>}
                    <p className="text-xs text-muted-foreground">Approved by <b className="text-foreground">{APPROVER}</b> · saved in the immutable dispatch log</p>
                    <SlideToApprove onConfirm={approve}
                      resetKey={`${keyStr}|${match.id}`}
                      disabled={dispatchSaved || !analysisIsCurrent || threadQ.isError || hub.writePending || hub.connectionLost || hub.approve.isPending || recQ.isFetching}
                      disabledLabel={dispatchSaved ? 'Already dispatched' : hub.connectionLost ? 'Hub offline' : recQ.isFetching ? 'Finding best technician…' : 'Approval unavailable'}
                      testId="slide-approve" />
                  </div>
                </Card>
              )}
            </>
          )}
          <p className="text-xs text-muted-foreground">Only this saved conversation is analyzed. Dispatch approval is a separate action and rechecks current technician and stock data.</p>
        </div>
      </div>
    </div>
  );
}
