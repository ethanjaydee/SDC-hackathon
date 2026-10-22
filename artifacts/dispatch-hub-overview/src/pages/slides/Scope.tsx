export default function Scope() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text">
      <div aria-hidden="true" className="absolute inset-y-0 left-0 w-[34vw] bg-primary" />
      <div className="relative grid h-full grid-cols-[0.62fr_1.38fr] gap-[5vw] px-[6vw] py-[8vh]">
        <div className="flex items-center pr-[2vw]">
          <h1 className="font-display text-[5vw] font-bold leading-[1.02] tracking-[-0.03em] text-bg">Current scope and what live use still needs</h1>
        </div>
        <ul className="flex flex-col justify-center gap-[4vh] font-body text-[2.05vw] font-medium leading-[1.22]">
          <li className="flex gap-[1.2vw]"><span aria-hidden="true" className="mt-[0.8vh] h-[1.4vw] w-[1.4vw] shrink-0 rounded-full bg-primary"/><span>Clerk sign-in; accounts currently share the demo workspace</span></li>
          <li className="flex gap-[1.2vw]"><span aria-hidden="true" className="mt-[0.8vh] h-[1.4vw] w-[1.4vw] shrink-0 rounded-full bg-primary"/><span>Local SQLite storage needs a durability plan before production</span></li>
          <li className="flex gap-[1.2vw]"><span aria-hidden="true" className="mt-[0.8vh] h-[1.4vw] w-[1.4vw] shrink-0 rounded-full bg-primary"/><span>Customer access boundaries are not yet per account or team</span></li>
          <li className="flex gap-[1.2vw]"><span aria-hidden="true" className="mt-[0.8vh] h-[1.4vw] w-[1.4vw] shrink-0 rounded-full bg-primary"/><span>Reliable recovery for uncertain Telegram delivery remains a live-use safeguard</span></li>
        </ul>
      </div>
    </div>
  );
}