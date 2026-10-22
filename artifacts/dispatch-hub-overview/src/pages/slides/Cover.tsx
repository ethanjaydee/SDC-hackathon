const base = import.meta.env.BASE_URL;

export default function Cover() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text">
      <div className="absolute inset-y-0 right-0 w-[55vw]">
        <img src={base + 'field-service-cover.jpg'} crossOrigin="anonymous" alt="Illustrative field service technician inspecting an air-conditioning unit" className="h-full w-full object-cover" />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-bg/70 via-bg/10 to-transparent" />
      </div>
      <div aria-hidden="true" className="absolute left-0 top-0 h-[1.4vh] w-[32vw] bg-primary" />
      <div className="relative z-10 flex h-full w-[58vw] flex-col justify-center px-[6vw]">
        <div aria-hidden="true" className="mb-[4vh] h-[1.2vh] w-[8vw] bg-primary" />
        <h1 className="max-w-[46vw] font-display text-[7vw] font-bold leading-[0.92] tracking-[-0.04em]">Dispatch Hub</h1>
        <p className="mt-[4vh] max-w-[40vw] font-body text-[2.5vw] font-medium leading-[1.3] text-muted">A clear path from customer repair request to technician-ready dispatch.</p>
      </div>
      <div aria-hidden="true" className="absolute bottom-0 right-0 h-[1.2vh] w-[24vw] bg-primary" />
    </div>
  );
}