export default function Analysis() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text">
      <div className="px-[6vw] pt-[8vh]">
        <h1 className="max-w-[80vw] font-display text-[5vw] font-bold leading-[1.05] tracking-[-0.03em]">Analysis supports review; it does not dispatch</h1>
        <div className="relative mt-[7vh] space-y-[2.4vh]">
          <div aria-hidden="true" className="absolute bottom-[2vw] left-[2.1vw] top-[2vw] w-[0.35vw] bg-primary/35" />
          <div className="relative flex min-h-[10.5vh] items-center gap-[2.2vw] border-b border-text/10 pb-[1.2vh]">
            <span aria-hidden="true" className="relative z-10 flex h-[4.4vw] w-[4.4vw] shrink-0 items-center justify-center rounded-full bg-primary text-bg"><svg viewBox="0 0 64 64" className="h-[2.4vw] w-[2.4vw]" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="28" cy="28" r="16"/><path d="m40 40 13 13M20 28h16M28 20v16"/></svg></span>
            <p className="font-body text-[2.05vw] font-medium leading-[1.2]">Deterministic mock analysis highlights issue, urgency, and parts</p>
          </div>
          <div className="relative flex min-h-[10.5vh] items-center gap-[2.2vw] border-b border-text/10 pb-[1.2vh]">
            <span aria-hidden="true" className="relative z-10 flex h-[4.4vw] w-[4.4vw] shrink-0 items-center justify-center rounded-full border-[0.3vw] border-primary bg-bg text-primary"><svg viewBox="0 0 64 64" className="h-[2.4vw] w-[2.4vw]" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 12h40v40H12zM21 23h22M21 32h22M21 41h12"/></svg></span>
            <p className="font-body text-[2.05vw] font-medium leading-[1.2]">Dispatchers review the result and customer messages</p>
          </div>
          <div className="relative flex min-h-[10.5vh] items-center gap-[2.2vw] border-b border-text/10 pb-[1.2vh]">
            <span aria-hidden="true" className="relative z-10 flex h-[4.4vw] w-[4.4vw] shrink-0 items-center justify-center rounded-full border-[0.3vw] border-primary bg-bg text-primary"><svg viewBox="0 0 64 64" className="h-[2.4vw] w-[2.4vw]" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M14 18h36M14 32h26M14 46h18"/><path d="m42 39 5 5 9-11"/></svg></span>
            <p className="font-body text-[2.05vw] font-medium leading-[1.2]">New customer messages can make the analysis stale</p>
          </div>
          <div className="relative flex min-h-[10.5vh] items-center gap-[2.2vw] pb-[1.2vh]">
            <span aria-hidden="true" className="relative z-10 flex h-[4.4vw] w-[4.4vw] shrink-0 items-center justify-center rounded-full bg-text text-bg"><svg viewBox="0 0 64 64" className="h-[2.4vw] w-[2.4vw]" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="m16 16 32 32M48 16 16 48"/></svg></span>
            <p className="font-body text-[2.05vw] font-medium leading-[1.2]">No message or analysis automatically approves a job</p>
          </div>
        </div>
      </div>
    </div>
  );
}