export default function Readiness() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text">
      <div className="relative px-[6vw] pt-[8vh]">
        <h1 className="max-w-[78vw] font-display text-[5vw] font-bold leading-[1.02] tracking-[-0.03em]">Check technician and van readiness</h1>
        <div aria-hidden="true" className="absolute bottom-0 right-0 h-[22vh] w-[34vw] bg-accent" />
        <div className="relative mt-[9vh] grid grid-cols-2 gap-x-[7vw] gap-y-[6vh]">
          <div className="border-t border-text/15 pt-[2.2vh]">
            <svg aria-hidden="true" viewBox="0 0 64 64" className="mb-[2.6vh] h-[4.2vw] w-[4.2vw] text-primary" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M32 56s18-18 18-32a18 18 0 1 0-36 0c0 14 18 32 18 32Z"/><circle cx="32" cy="24" r="6"/></svg>
            <p className="font-body text-[2.05vw] font-medium leading-[1.2]">Review technician availability and the map</p>
          </div>
          <div className="border-t border-text/15 pt-[2.2vh]">
            <svg aria-hidden="true" viewBox="0 0 64 64" className="mb-[2.6vh] h-[4.2vw] w-[4.2vw] text-primary" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 20 32 8l24 12-24 12L8 20Z"/><path d="M8 20v26l24 12 24-12V20M32 32v26"/></svg>
            <p className="font-body text-[2.05vw] font-medium leading-[1.2]">Check van stock for required parts</p>
          </div>
          <div className="border-t border-text/15 pt-[2.2vh]">
            <svg aria-hidden="true" viewBox="0 0 64 64" className="mb-[2.6vh] h-[4.2vw] w-[4.2vw] text-primary" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="25" cy="24" r="13"/><circle cx="44" cy="39" r="10"/><path d="M35 25 42 31M16 53h19M11 44h12"/></svg>
            <p className="font-body text-[2.05vw] font-medium leading-[1.2]">Compare qualified technicians before assigning</p>
          </div>
          <div className="border-t border-text/15 pt-[2.2vh]">
            <svg aria-hidden="true" viewBox="0 0 64 64" className="mb-[2.6vh] h-[4.2vw] w-[4.2vw] text-primary" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 20h38v31H13zM20 13h24v14H20zM22 39l7 7 14-16"/></svg>
            <p className="font-body text-[2.05vw] font-medium leading-[1.2]">Keep the final dispatch decision with the dispatcher</p>
          </div>
        </div>
      </div>
    </div>
  );
}