export default function Workspace() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text">
      <div aria-hidden="true" className="absolute bottom-0 right-0 h-[26vh] w-[32vw] bg-accent" />
      <div className="relative px-[6vw] pt-[8vh]">
        <h1 className="max-w-[76vw] font-display text-[5vw] font-bold leading-[1.02] tracking-[-0.03em]">One workspace for dispatch decisions</h1>
        <div className="mt-[12vh] grid grid-cols-4 gap-[2vw]">
          <div className="min-h-[35vh] border-t-[0.65vh] border-primary pt-[3vh]">
            <svg aria-hidden="true" viewBox="0 0 64 64" className="mb-[4vh] h-[4.5vw] w-[4.5vw] text-primary" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10h20l10 10v34H14V10h6Z"/><path d="M40 10v12h12M22 32h16M22 42h20"/></svg>
            <p className="font-body text-[2.05vw] font-medium leading-[1.2]">Customer repair intake and conversation history</p>
          </div>
          <div className="min-h-[35vh] border-t-[0.65vh] border-text/20 pt-[3vh]">
            <svg aria-hidden="true" viewBox="0 0 64 64" className="mb-[4vh] h-[4.5vw] w-[4.5vw] text-text" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M32 56s18-18 18-32a18 18 0 1 0-36 0c0 14 18 32 18 32Z"/><circle cx="32" cy="24" r="6"/></svg>
            <p className="font-body text-[2.05vw] font-medium leading-[1.2]">Technician availability and location view</p>
          </div>
          <div className="min-h-[35vh] rounded-[1.5vw] bg-primary p-[2.5vw] text-bg">
            <svg aria-hidden="true" viewBox="0 0 64 64" className="mb-[4vh] h-[4.5vw] w-[4.5vw]" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 20 32 8l24 12-24 12L8 20Z"/><path d="M8 20v26l24 12 24-12V20M32 32v26"/></svg>
            <p className="font-body text-[2.05vw] font-medium leading-[1.2]">Van parts inventory</p>
          </div>
          <div className="min-h-[35vh] border-t-[0.65vh] border-text/20 pt-[3vh]">
            <svg aria-hidden="true" viewBox="0 0 64 64" className="mb-[4vh] h-[4.5vw] w-[4.5vw] text-primary" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 12h40v40H12zM22 24h20M22 32h20M22 40h12"/><path d="m40 42 4 4 8-9"/></svg>
            <p className="font-body text-[2.05vw] font-medium leading-[1.2]">Dispatch activity history</p>
          </div>
        </div>
      </div>
    </div>
  );
}