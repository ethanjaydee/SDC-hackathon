export default function Flow() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text">
      <div aria-hidden="true" className="absolute bottom-0 left-0 h-[24vh] w-full bg-accent" />
      <div className="relative px-[6vw] pt-[8vh]">
        <h1 className="max-w-[82vw] font-display text-[5vw] font-bold leading-[1.05] tracking-[-0.03em]">A controlled flow from request to job</h1>
        <div className="relative mt-[7vh] space-y-[2.8vh]">
          <div aria-hidden="true" className="absolute bottom-[3vw] left-[2.15vw] top-[3vw] w-[0.35vw] bg-primary/35" />
          <div className="relative flex min-h-[8vh] items-center gap-[2.2vw]">
            <div className="relative z-10 flex h-[4.6vw] w-[4.6vw] shrink-0 items-center justify-center rounded-full border-[0.35vw] border-primary bg-bg text-primary"><svg aria-hidden="true" viewBox="0 0 64 64" className="h-[2.4vw] w-[2.4vw]" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M16 17h32v34H16zM23 11h18v12H23zM23 32h18M23 41h13"/></svg></div>
            <p className="font-body text-[2.05vw] font-medium leading-[1.18]">Receive a repair request through intake or Telegram</p>
          </div>
          <div className="relative flex min-h-[8vh] items-center gap-[2.2vw]">
            <div className="relative z-10 flex h-[4.6vw] w-[4.6vw] shrink-0 items-center justify-center rounded-full border-[0.35vw] border-primary bg-primary text-bg"><svg aria-hidden="true" viewBox="0 0 64 64" className="h-[2.4vw] w-[2.4vw]" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="28" cy="28" r="16"/><path d="m40 40 13 13M20 28h16M28 20v16"/></svg></div>
            <p className="font-body text-[2.05vw] font-medium leading-[1.18]">Review the mock analysis and customer conversation</p>
          </div>
          <div className="relative flex min-h-[8vh] items-center gap-[2.2vw]">
            <div className="relative z-10 flex h-[4.6vw] w-[4.6vw] shrink-0 items-center justify-center rounded-full border-[0.35vw] border-primary bg-bg text-primary"><svg aria-hidden="true" viewBox="0 0 64 64" className="h-[2.4vw] w-[2.4vw]" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M32 56s18-18 18-32a18 18 0 1 0-36 0c0 14 18 32 18 32Z"/><circle cx="32" cy="24" r="6"/></svg></div>
            <p className="font-body text-[2.05vw] font-medium leading-[1.18]">For Telegram requests, choose a sample customer site explicitly</p>
          </div>
          <div className="relative flex min-h-[8vh] items-center gap-[2.2vw]">
            <div className="relative z-10 flex h-[4.6vw] w-[4.6vw] shrink-0 items-center justify-center rounded-full border-[0.35vw] border-primary bg-bg text-primary"><svg aria-hidden="true" viewBox="0 0 64 64" className="h-[2.4vw] w-[2.4vw]" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M8 20 32 8l24 12-24 12L8 20Z"/><path d="M8 20v26l24 12 24-12V20M32 32v26"/></svg></div>
            <p className="font-body text-[2.05vw] font-medium leading-[1.18]">Review qualified technician and van readiness</p>
          </div>
          <div className="relative flex min-h-[8vh] items-center gap-[2.2vw]">
            <div className="relative z-10 flex h-[4.6vw] w-[4.6vw] shrink-0 items-center justify-center rounded-full border-[0.35vw] border-primary bg-text text-bg"><svg aria-hidden="true" viewBox="0 0 64 64" className="h-[2.4vw] w-[2.4vw]" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 33 11 11 24-26"/></svg></div>
            <p className="font-body text-[2.05vw] font-medium leading-[1.18]">Approve the dispatch manually</p>
          </div>
        </div>
      </div>
    </div>
  );
}