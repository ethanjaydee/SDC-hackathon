import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { ArrowLeft, CheckCircle2, ChevronDown, ExternalLink, FlaskConical, Loader2, MapPin, MessageSquareText, RefreshCw, Route as RouteIcon, Send, Sparkles, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  getGetConversationThreadQueryKey, getListConversationsQueryKey,
  recommendTechnicians, useAnalyzeConversation, useGetConversationThread, useSendTelegramReply, useGetTelegramStatus, getGetTelegramStatusQueryKey, useSetConversationSite,
  type Technician, type DemoSiteId,
} from '@workspace/api-client-react';
import { DEMO_CUSTOMER_SITES, DEMO_CUSTOMER_VISIT_DETAILS } from './demoLocations';
import { MiniRouteMap } from './MiniRouteMap';
import { SlideToApprove } from './SlideToApprove';
import { CompletionControl } from './CompletionControl';
import { rankQualifiedTechnicians } from './matching';
import { APPROVER, type DispatchState } from './useDispatchHub';
import { Card, InlineError, Mono, PageHead, PartChips, StatusBadge, dateTime, errorText, fieldClass } from './shared';
import { useDemoSession } from './session';
import { MessagingConnectionNotice } from './MessagingConnectionNotice';
import { getDemoReviewsForTechnician } from './demoReviewSamples';

const urgencyTone = { High: 'err', Med: 'pending', Medium: 'pending', Low: 'idle' } as const;
type Props = { hub: DispatchState; conversationId: number; onApprove: (tech: Technician) => void };

export default function AnalysisPage({ hub, conversationId, onApprove }: Props) {
  const qc = useQueryClient();
  const { technicianId, isTechnician: isTech } = useDemoSession();
  const selfTech = hub.technicians.find((t) => t.id === technicianId) ?? null;
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
  const matches = useMemo(() => {
    const ranked = site ? rankQualifiedTechnicians(hub.hubQ.data, analysis?.parts ?? [], site, complexity) : [];
    // Technicians can only ever approve for themselves.
    return isTech ? ranked.filter((t) => t.id === technicianId) : ranked;
  }, [hub.hubQ.data, analysis, site, complexity, isTech, technicianId]);
  const dispatchSaved = thread?.dispatch_activity_id != null;
  const savedDispatchEntry = dispatchSaved
    ? hub.hubQ.data?.activity_log.find((entry) => entry.id === thread?.dispatch_activity_id)
    : undefined;
  const savedDispatch = savedDispatchEntry?.dispatch ?? null;
  const assignedTechnician = savedDispatch
    ? hub.technicians.find((technician) => technician.id === savedDispatch.tech_id) ?? null
    : null;
  const technicianReviews = assignedTechnician
    ? getDemoReviewsForTechnician(assignedTechnician.id, assignedTechnician.level)
    : [];
  const customerReview = technicianReviews.length
    ? technicianReviews[(conversationId + 1) % technicianReviews.length]
    : null;
  const analyzedId = thread?.analyzed_through_message_id ?? null;
  const siteId = thread?.customer_site_id ?? null;
  const analysisSignature = JSON.stringify([analysis?.issue, analysis?.parts, complexity, analysis?.analysis_source]);
  const recKey = ['technician-recommendations', conversationId, analyzedId, siteId, analysisSignature] as const;
  const recQ = useQuery({
    queryKey: recKey,
    queryFn: ({ signal }) => recommendTechnicians(conversationId, { signal }),
    enabled: validId && analysisIsCurrent && !dispatchSaved && !!siteId && !isTech,
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
    const ok = await hub.approveConversationDispatch(conversationId, analysis, thread.customer_site_id, match, isTech && selfTech ? selfTech.name : undefined);
    if (ok) onApprove(match);
    return ok;
  };

  if (isTech && thread && thread.technician_id != null && thread.technician_id !== technicianId) {
    return (
      <div className="mx-auto max-w-3xl space-y-4" data-testid="request-restricted">
        <InlineError>This request is assigned to another technician and is not available in your view.</InlineError>
        <Button asChild variant="outline"><Link href="/intake"><ArrowLeft size={14} /> Back to requests</Link></Button>
      </div>
    );
  }
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

  const shop = hub.shop;
  const shopDirectionsUrl = site
    ? `https://www.google.com/maps/dir/?api=1&origin=${shop.lat},${shop.lng}&destination=${site.lat},${site.lng}&travelmode=driving` : null;
  const customerDirectionsUrl = site
    ? `https://www.google.com/maps/dir/?api=1&destination=${site.lat},${site.lng}&travelmode=driving` : null;
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
  const needLevel = complexity === 'Hard' ? 3 : complexity === 'Normal' ? 2 : 1;
  const whyNot = !selfTech ? 'Your technician profile is not loaded.'
    : selfTech.status !== 'Available' ? 'You are busy with another job. Complete it first.'
    : (selfTech.level ?? 0) < needLevel ? `This ${complexity} job needs Level ${needLevel}+. You are Level ${selfTech.level ?? 1}.`
    : 'No available shared van currently carries every required part.';
  const JobBrief = () => (
    <Card title={<><CheckCircle2 size={15} /> AI diagnosis & job brief</>} aside={<StatusBadge tone={complexity === 'Hard' ? 'err' : complexity === 'Normal' ? 'pending' : 'ok'}>{analysis?.urgency ?? complexity} urgency</StatusBadge>}>
      <div className="space-y-3" data-testid="job-brief">
        {analysis ? (
          <>
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Suggested issue · {analysis.is_fallback === false || analysis.analysis_source === 'AI' ? 'AI analysis' : 'Rule-based analysis'}
            </p>
            <p className="text-sm font-medium">{analysis.issue}</p>
            <div><p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Required parts</p><PartChips parts={analysis.parts} /></div>
          </>
        ) : <p role="status" className="text-sm text-muted-foreground">Job requirements are being prepared.</p>}
        {analysis && analysisIsCurrent && !dispatchSaved && (
          <p role="status" data-testid="eligibility" className={`rounded-lg border p-3 text-sm ${match ? 'border-ok/40 bg-ok/[0.07]' : 'border-pending/30 bg-pending/[0.07]'}`}>
            {match ? 'You are eligible: qualified, available, and an available van has the parts. Slide below to take this job.' : whyNot}
          </p>
        )}
      </div>
    </Card>
  );
  const routeReady = recs?.routing_status === 'ready' || recs?.routing_status === 'partial';
  return (
    <div className="w-full space-y-5">
      <header className="flex flex-col gap-4 pb-1 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary">Work Order · #{thread.id}</p>
          <h1 className="mt-1.5 break-words text-[32px] font-semibold leading-[1.04] tracking-tight md:text-[46px]" data-testid="request-title">{thread.subject}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline"><Link href="/intake"><ArrowLeft size={14} /> Back to inbox</Link></Button>
          {dispatchSaved && !isTech && <Button asChild variant="outline"><Link href="/log">View dispatch log</Link></Button>}
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

          {!isTech && !dispatchSaved && <Card title="AI analysis" aside={
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
          </Card>}
        </div>

        <div className="min-w-0 space-y-4">
          {dispatchSaved && (
            <Card title={assignedTechnician ? `Customer review · ${assignedTechnician.name}` : 'Customer review'} aside={<StatusBadge tone="pending">Sample review</StatusBadge>}>
              {assignedTechnician && customerReview ? (
                <article className="space-y-2" data-testid="assigned-technician-review">
                  <div className="flex items-center gap-2" aria-label={`${customerReview.rating} out of 5 stars`}>
                    {Array.from({ length: 5 }, (_, index) => <Star key={index} size={15} className={index < customerReview.rating ? 'fill-amber-400 text-amber-500' : 'text-muted-foreground/35'} aria-hidden="true" />)}
                    <span className="font-mono text-xs">{customerReview.rating}/5</span>
                  </div>
                  <p className="text-sm leading-6">“{customerReview.comment}”</p>
                  <p className="text-[11px] text-muted-foreground">Fictional sample review for {assignedTechnician.name}; not feedback saved for this work order.</p>
                </article>
              ) : <p className="text-sm text-muted-foreground">No technician review sample is available for this assignment.</p>}
            </Card>
          )}
          {analysis && analysisIsCurrent && !dispatchSaved && (
            <>
              {isTech && <JobBrief />}

              {!isTech && site && match && (
                <Card title={<><MapPin size={15} /> Route</>} aside={shopDirectionsUrl ? (
                  <a href={shopDirectionsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-primary" data-testid="link-google-directions">
                    Open directions in Google Maps <ExternalLink size={11} />
                  </a>) : undefined}>
                  <MiniRouteMap customer={site} shop={shop}
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

              {!isTech && (
                <Card title="Dispatch plan" aside={
                  <StatusBadge tone={match ? 'ok' : 'pending'}>{match ? 'Ready to dispatch' : 'Plan unavailable'}</StatusBadge>
                }>
                  {hub.hubQ.isLoading ? <Skeleton className="h-24" />
                    : !hub.hubQ.data ? <InlineError onRetry={() => void hub.hubQ.refetch()} retrying={hub.hubQ.isFetching}>Reconnect to the hub to prepare a dispatch plan.</InlineError>
                      : !site ? <p role="status" className="rounded-lg border border-pending/30 bg-pending/[0.07] p-3 text-sm">Choose a customer site before preparing a dispatch plan.</p>
                        : !match ? <p role="status" className="rounded-lg border border-pending/30 bg-pending/[0.07] p-3 text-sm">No available technician and stocked van currently match this job.</p>
                          : (
                            <div className="space-y-3" data-testid="dispatch-plan-panel">
                              <dl className="grid gap-3 sm:grid-cols-2">
                                <div className="rounded-lg border bg-muted/30 p-3">
                                  <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Technician</dt>
                                  <dd className="mt-1 font-semibold">{match.name}</dd>
                                </div>
                                <div className="rounded-lg border bg-muted/30 p-3">
                                  <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Van</dt>
                                  <dd className="mt-1 font-semibold">{hub.hubQ.data.vans?.find((van) => van.id === match.van_id)?.name ?? `Van ${match.van_id}`}</dd>
                                </div>
                              </dl>
                              <p className="text-xs text-muted-foreground">The server rechecks technician availability and van stock when you dispatch.</p>
                              {hub.approveError && <InlineError>{hub.approveError}</InlineError>}
                              <SlideToApprove onConfirm={approve}
                                resetKey={`${keyStr}|${match.id}`}
                                idleLabel="Slide to dispatch job"
                                pendingLabel="Allocating technician and van…"
                                successLabel="Dispatch recorded"
                                sliderLabel="Slide right to dispatch this job"
                                disabled={dispatchSaved || !analysisIsCurrent || threadQ.isError || hub.writePending || hub.connectionLost || hub.approve.isPending || recQ.isFetching}
                                disabledLabel={dispatchSaved ? 'Already dispatched' : hub.connectionLost ? 'Hub offline' : recQ.isFetching ? 'Checking dispatch assignment…' : 'Dispatch unavailable'}
                                testId="slide-approve" />
                            </div>
                          )}
                </Card>
              )}
            </>
          )}
          {isTech && (
            <Card title={<><MapPin size={15} /> Customer visit</>} aside={
              <StatusBadge tone={!dispatchSaved ? 'pending' : savedDispatch?.status === 'Completed' ? 'ok' : 'busy'}>
                {!dispatchSaved ? 'Sample details' : savedDispatch?.status === 'Completed' ? 'Completed' : savedDispatch ? 'Accepted' : 'Syncing assignment'}
              </StatusBadge>
            }>
              {site ? (
                <>
                  <dl className="grid gap-3 rounded-lg border border-card-border bg-muted/20 p-3 text-sm sm:grid-cols-2">
                    <div className="min-w-0 sm:col-span-2">
                      <dt className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Customer address · sample</dt>
                      <dd className="mt-1 break-words font-medium">{DEMO_CUSTOMER_VISIT_DETAILS[site.id]?.address ?? `${site.label}, ${site.area}, Selangor, Malaysia`}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Contact number · sample</dt>
                      <dd className="mt-1 font-medium">{DEMO_CUSTOMER_VISIT_DETAILS[site.id]?.contact ?? '0000-000-000 (sample only)'}</dd>
                    </div>
                    <div className="flex items-end">
                      {customerDirectionsUrl ? (
                        <a href={customerDirectionsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline" data-testid="link-customer-directions">
                          Open customer directions in Google Maps <ExternalLink size={13} />
                        </a>
                      ) : <span className="text-xs text-muted-foreground">Directions unavailable until a site is selected.</span>}
                    </div>
                  </dl>
                  {!dispatchSaved && <p className="mt-3 text-xs leading-5 text-muted-foreground">Sliding assigns this job to you, reserves the required parts and allocates an available van.</p>}
                </>
              ) : (
                <p className="rounded-lg border border-pending/30 bg-pending/[0.06] p-3 text-sm text-muted-foreground">
                  {dispatchSaved ? hub.hubQ.isLoading ? 'Loading the saved customer site…' : 'The saved customer site is not available.' : 'A sample customer site must be selected before you can accept this job.'}
                </p>
              )}
              {!dispatchSaved && hub.approveError && <div className="mt-3"><InlineError>{hub.approveError}</InlineError></div>}
              <div className="mt-4">
                {dispatchSaved ? (
                  savedDispatchEntry?.dispatch ? (
                    <CompletionControl entry={savedDispatchEntry} hub={hub} completedBy={selfTech?.name} buttonLabel="Complete job" />
                  ) : <p role="status" className="text-xs text-muted-foreground">Syncing the accepted work order…</p>
                ) : (
                  <SlideToApprove
                    onConfirm={approve}
                    resetKey={`accept|${conversationId}|${siteId ?? 'none'}|${match?.id ?? 'none'}|${analyzedId ?? 'none'}`}
                    idleLabel="Slide to accept this work order"
                    pendingLabel="Allocating your van and parts…"
                    successLabel="Work order accepted"
                    sliderLabel="Slide right to accept this work order"
                    disabled={!site || !analysisIsCurrent || !match || threadQ.isError || hub.writePending || hub.connectionLost || hub.approve.isPending}
                    disabledLabel={hub.connectionLost ? 'Hub offline' : !site ? 'Customer site required' : !analysisIsCurrent ? 'Preparing job analysis' : !match ? whyNot : 'Acceptance unavailable'}
                    testId="slide-accept-work-order"
                  />
                )}
              </div>
            </Card>
          )}
          {!dispatchSaved && !isTech && <p className="text-xs text-muted-foreground">Only this saved conversation is analyzed. Dispatch approval is a separate action and rechecks current technician and stock data.</p>}
        </div>
      </div>
    </div>
  );
}
