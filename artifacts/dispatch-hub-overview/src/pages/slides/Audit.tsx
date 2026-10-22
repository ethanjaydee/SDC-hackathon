export default function Audit() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text">
      <div aria-hidden="true" className="absolute right-0 top-0 h-full w-[25vw] bg-accent" />
      <div className="relative px-[6vw] pt-[8vh]">
        <h1 className="max-w-[74vw] font-display text-[5vw] font-bold leading-[1.02] tracking-[-0.03em]">Keep the audit record clear</h1>
        <div className="mt-[9vh] grid grid-cols-[0.95fr_1.05fr] items-center gap-[5vw]">
          <div aria-hidden="true" className="relative flex h-[54vh] items-center justify-center">
            <div className="absolute left-[8vw] top-[3vh] h-[47vh] w-[0.5vw] bg-primary/30" />
            <div className="relative z-10 flex h-[48vh] w-[31vw] flex-col justify-center gap-[3vh] rounded-[1.5vw] bg-text p-[3vw]">
              <div className="flex items-center gap-[1.5vw]"><span className="h-[2.2vw] w-[2.2vw] rounded-full bg-primary ring-[0.5vw] ring-text"/><span className="h-[1.3vh] w-[20vw] rounded-full bg-bg/75"/></div>
              <div className="ml-[1vw] h-[5vh] border-l-[0.25vw] border-bg/30"/>
              <div className="flex items-center gap-[1.5vw]"><span className="h-[2.2vw] w-[2.2vw] rounded-full bg-bg ring-[0.5vw] ring-text"/><span className="h-[1.3vh] w-[17vw] rounded-full bg-bg/45"/></div>
              <div className="ml-[1vw] h-[5vh] border-l-[0.25vw] border-bg/30"/>
              <div className="flex items-center gap-[1.5vw]"><span className="h-[2.2vw] w-[2.2vw] rounded-full bg-bg/55 ring-[0.5vw] ring-text"/><span className="h-[1.3vh] w-[22vw] rounded-full bg-bg/45"/></div>
            </div>
          </div>
          <ul className="space-y-[4vh] font-body text-[2.05vw] font-medium leading-[1.22]">
            <li className="flex gap-[1.2vw]"><span aria-hidden="true" className="mt-[0.8vh] h-[1.4vw] w-[1.4vw] shrink-0 rounded-full bg-primary"/><span>Dispatch history is append-only</span></li>
            <li className="flex gap-[1.2vw]"><span aria-hidden="true" className="mt-[0.8vh] h-[1.4vw] w-[1.4vw] shrink-0 rounded-full bg-primary"/><span>Completion-proof examples show an illustrative photo and synthetic signature</span></li>
            <li className="flex gap-[1.2vw]"><span aria-hidden="true" className="mt-[0.8vh] h-[1.4vw] w-[1.4vw] shrink-0 rounded-full bg-primary"/><span>Sample proof is separate from audit records and never proves a real job</span></li>
          </ul>
        </div>
      </div>
    </div>
  );
}