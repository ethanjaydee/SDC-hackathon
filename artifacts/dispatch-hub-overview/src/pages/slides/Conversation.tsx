export default function Conversation() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text">
      <div aria-hidden="true" className="absolute bottom-0 right-0 top-0 w-[38vw] bg-primary" />
      <div className="relative px-[6vw] pt-[8vh]">
        <h1 className="max-w-[76vw] font-display text-[5vw] font-bold leading-[1.05] tracking-[-0.03em]">Customer conversation stays with the request</h1>
        <div className="mt-[9vh] grid grid-cols-[1.2fr_0.8fr] gap-[3vw]">
          <ul className="space-y-[4vh] pt-[1vh] font-body text-[2vw] font-medium leading-[1.22]">
            <li className="flex gap-[1.2vw]"><span aria-hidden="true" className="mt-[0.8vh] h-[1.4vw] w-[1.4vw] shrink-0 rounded-full bg-primary" /><span>Telegram imports private text and uses pseudonymous customer labels</span></li>
            <li className="flex gap-[1.2vw]"><span aria-hidden="true" className="mt-[0.8vh] h-[1.4vw] w-[1.4vw] shrink-0 rounded-full bg-primary" /><span>Dispatchers send replies only by choosing Send</span></li>
            <li className="flex gap-[1.2vw]"><span aria-hidden="true" className="mt-[0.8vh] h-[1.4vw] w-[1.4vw] shrink-0 rounded-full bg-primary" /><span>Confirmed replies appear in the transcript as Dispatch team</span></li>
            <li className="flex gap-[1.2vw]"><span aria-hidden="true" className="mt-[0.8vh] h-[1.4vw] w-[1.4vw] shrink-0 rounded-full bg-primary" /><span>WhatsApp is not connected</span></li>
          </ul>
          <div aria-hidden="true" className="relative flex h-[56vh] flex-col justify-center gap-[3vh] px-[3vw]">
            <div className="h-[9vh] w-[28vw] rounded-[2vw] rounded-bl-[0.4vw] bg-bg p-[1.3vw]"><div className="h-[1vh] w-[17vw] rounded-full bg-text/15"/><div className="mt-[1.4vh] h-[1vh] w-[22vw] rounded-full bg-text/10"/></div>
            <div className="ml-auto h-[8vh] w-[27vw] rounded-[2vw] rounded-br-[0.4vw] bg-text p-[1.3vw]"><div className="h-[1vh] w-[20vw] rounded-full bg-bg/70"/><div className="mt-[1.4vh] h-[1vh] w-[14vw] rounded-full bg-bg/40"/></div>
            <div className="h-[9vh] w-[30vw] rounded-[2vw] rounded-bl-[0.4vw] bg-bg p-[1.3vw]"><div className="h-[1vh] w-[21vw] rounded-full bg-text/15"/><div className="mt-[1.4vh] h-[1vh] w-[15vw] rounded-full bg-text/10"/></div>
            <div className="ml-auto h-[8vh] w-[24vw] rounded-[2vw] rounded-br-[0.4vw] bg-text p-[1.3vw]"><div className="h-[1vh] w-[18vw] rounded-full bg-bg/70"/><div className="mt-[1.4vh] h-[1vh] w-[10vw] rounded-full bg-bg/40"/></div>
          </div>
        </div>
      </div>
    </div>
  );
}