import { motion } from 'framer-motion';
import { Activity, BarChart3, BriefcaseBusiness, Check, HardHat, Inbox, MapPin, MessageSquareText, Radio, Route, Star, Truck, Wrench } from 'lucide-react';

const EASE = [0.2, 0.72, 0.18, 1] as const;
const shell = {
  initial: { opacity: 0, scale: 1.035, clipPath: 'inset(0 0 0 8%)', rotateY: -1.2 },
  animate: { opacity: 1, scale: 1, clipPath: 'inset(0 0 0 0%)', rotateY: 0 },
  exit: { opacity: 0, scale: 1.025, clipPath: 'inset(0 0 0 100%)', rotateY: 1.5 },
  transition: { duration: .58, ease: EASE },
};

function Stage({ children, dark = false, rust = false }: { children: React.ReactNode; dark?: boolean; rust?: boolean }) {
  return <motion.section className={`film ${dark ? 'film-ink' : rust ? 'film-rust' : 'film-paper'}`} {...shell}>{children}</motion.section>;
}
function BrandMark({ light = false }: { light?: boolean }) {
  return <span className="inline-flex items-center gap-1.2" style={{ color: light ? 'var(--paper-bright)' : 'var(--ink)' }}>
    <span className="grid place-items-center rounded-[.55vmin] bg-[var(--orange)] text-[var(--paper-bright)]" style={{ width: '3.2vmin', height: '3.2vmin' }}><Radio size="1.8vmin" strokeWidth={2.6} /></span>
    <span style={{ font: '700 2.1vmin var(--font-display)', letterSpacing: '-.04em' }}>Dispatch Hub</span>
  </span>;
}
function Overline({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return <div className="film-mono" style={{ color: light ? '#adb4ab' : 'var(--muted)' }}>{children}</div>;
}
function Bubble({ children, right = false }: { children: React.ReactNode; right?: boolean }) {
  return <motion.div className={`message ${right ? 'message-out' : ''}`} initial={{ opacity: 0, y: 12, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: right ? .9 : .55, duration: .48, ease: EASE }}>{children}</motion.div>;
}
function Stat({ label, value, color = 'var(--ink)' }: { label: string; value: string; color?: string }) {
  return <div><div className="tiny-label">{label}</div><div style={{ marginTop: '.5vmin', color, font: '700 3.15vmin var(--font-display)', letterSpacing: '-.05em' }}>{value}</div></div>;
}
function Status({ children, tone = 'green' }: { children: React.ReactNode; tone?: 'green' | 'orange' | 'quiet' }) {
  const colors = tone === 'green' ? { color: '#347657', bg: 'rgba(91,156,126,.13)' } : tone === 'orange' ? { color: '#a9321c', bg: 'rgba(214,75,42,.10)' } : { color: '#777b72', bg: 'rgba(75,79,72,.08)' };
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.55vmin', borderRadius: '99px', background: colors.bg, color: colors.color, padding: '.55vmin .9vmin', font: '600 1.28vmin var(--font-mono)' }}><span style={{ width: '.7vmin', height: '.7vmin', borderRadius: '50%', background: 'currentColor' }} />{children}</span>;
}
function TicketToken({ left, right, top, bottom }: { left?: string; right?: string; top?: string; bottom?: string }) {
  return <motion.div
    layoutId="dispatch-work-order-token"
    transition={{ layout: { duration: .56, ease: EASE } }}
    style={{ position: 'absolute', left, right, top, bottom, zIndex: 25, display: 'flex', alignItems: 'center', gap: '.7vmin', width: '9vmin', height: '3.5vmin', padding: '.5vmin .75vmin', borderRadius: '.7vmin', color: 'var(--paper-bright)', background: 'var(--orange)', boxShadow: '0 .8vmin 2vmin #a9321c44' }}
  >
    <Inbox size="1.5vmin" />
    <span style={{ font: '600 1.05vmin var(--font-mono)', letterSpacing: '.04em' }}>DEMO WO</span>
  </motion.div>;
}

export function IntroScene() {
  return <Stage>
    <div style={{ position: 'absolute', inset: '5.5% 6%', display: 'grid', gridTemplateRows: 'auto 1fr auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><BrandMark /><span className="film-tag">Operations / demo film</span></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.04fr', alignItems: 'center', gap: '4.2vmin' }}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <Overline>One hub. Two demo views.</Overline>
          <motion.h1 className="film-headline" style={{ fontSize: '10.5vmin', marginTop: '1.5vmin', maxWidth: '53vmin' }} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .2, duration: .62, ease: EASE }}>THE<br /><span style={{ color: 'var(--orange)' }}>HANDOFF</span><br />IN VIEW.</motion.h1>
          <motion.p style={{ fontSize: '2.05vmin', lineHeight: 1.45, color: '#72756c', maxWidth: '39vmin', marginTop: '2vmin' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .6 }}>From first customer message to completed field work.</motion.p>
        </div>
        <motion.div className="frame" style={{ padding: '1.3vmin', transformOrigin: 'center' }} initial={{ scale: .86, rotate: 2, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ delay: .32, duration: .72, ease: EASE }}>
          <div className="frame-top"><i className="dot dot-orange" /><i className="dot" /><i className="dot" /><span className="tiny-label" style={{ marginLeft: 'auto' }}>Role selection · switch role</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.15vmin', padding: '1.2vmin 0 0' }}>
            <motion.div style={{ padding: '2vmin', borderRadius: '1vmin', background: '#ede6d9', minHeight: '19vmin' }} animate={{ x: [0, -2, 0] }} transition={{ delay: 1.5, duration: .65 }}>
              <BriefcaseBusiness size="2.8vmin" color="var(--orange)" />
              <div style={{ font: '700 3.2vmin var(--font-display)', marginTop: '2.1vmin' }}>Boss</div><div className="muted-copy" style={{ fontSize: '1.55vmin' }}>Dispatch CEO</div>
              <div style={{ marginTop: '1.6vmin' }}><Status tone="orange">Dispatch + analysis</Status></div>
            </motion.div>
            <motion.div style={{ padding: '2vmin', borderRadius: '1vmin', background: '#e5ede6', minHeight: '19vmin' }} animate={{ x: [0, 2, 0] }} transition={{ delay: 1.7, duration: .65 }}>
              <HardHat size="2.8vmin" color="#4b896b" />
              <div style={{ font: '700 3.2vmin var(--font-display)', marginTop: '2.1vmin' }}>Technician</div><div className="muted-copy" style={{ fontSize: '1.55vmin' }}>Field view</div>
              <div style={{ marginTop: '1.6vmin' }}><Status>Jobs + work history</Status></div>
            </motion.div>
          </div>
          <div style={{ display: 'flex', gap: '1vmin', alignItems: 'center', padding: '1.4vmin 1vmin .4vmin', color: '#8c6f42', font: '1.24vmin var(--font-mono)' }}>
            <span style={{ color: 'var(--orange)' }}>◆</span> DEMO ROLE SELECTION · NOT REAL ACCOUNT SECURITY
          </div>
        </motion.div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '1vmin', borderTop: '1px solid var(--line)', color: 'var(--muted)', font: '1.22vmin var(--font-mono)', letterSpacing: '.08em' }}>
        <span>SYNTHETIC JOB DATA</span><span>THEMES · LIGHT / NIGHT / CYBERPUNK / COMFORT-READING</span><span>NO PASSWORD · NO REAL ACCOUNT</span>
      </div>
    </div>
    <TicketToken left="47.5%" top="48%" />
  </Stage>;
}

export function OverviewScene() {
  return <Stage>
    <div style={{ position: 'absolute', inset: '6% 6%', display: 'grid', gridTemplateRows: 'auto 1fr auto', gap: '2vmin' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div><Overline>BOSS OVERVIEW / SYNTHETIC DATA</Overline><div style={{ font: '700 4vmin var(--font-display)', letterSpacing: '-.055em', marginTop: '.5vmin' }}>Readiness, at a glance.</div></div><BrandMark /></header>
      <div style={{ display: 'grid', gridTemplateColumns: '1.04fr 1fr 1.14fr', gap: '1.5vmin', alignItems: 'stretch' }}>
        <motion.div className="frame" style={{ display: 'grid', placeItems: 'center', position: 'relative' }} initial={{ scale: .8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: .18, duration: .6, ease: EASE }}>
          <svg viewBox="0 0 220 220" style={{ width: '28vmin', overflow: 'visible', transform: 'rotate(-90deg)' }}>
            <circle cx="110" cy="110" r="94" fill="none" stroke="#e5dfd5" strokeWidth="9" />
            <motion.circle cx="110" cy="110" r="94" fill="none" stroke="var(--orange)" strokeWidth="9" strokeLinecap="round" strokeDasharray="591" initial={{ strokeDashoffset: 591 }} animate={{ strokeDashoffset: 197 }} transition={{ delay: .4, duration: 1.15, ease: EASE }} />
            <circle cx="110" cy="110" r="77" fill="none" stroke="#e8e2d8" strokeWidth="1" strokeDasharray="2 7" />
          </svg>
          <div style={{ position: 'absolute', textAlign: 'center' }}><div className="tiny-label">Ready to roll</div><div style={{ font: '800 8.1vmin/.92 var(--font-display)', letterSpacing: '-.08em', marginTop: '.8vmin' }}>4<span style={{ fontSize: '3.2vmin', color: 'var(--muted)', fontWeight: 500 }}> / 6</span></div><div className="muted-copy" style={{ fontSize: '1.45vmin', marginTop: '.8vmin' }}>technicians available</div></div>
          <div className="tiny-label" style={{ position: 'absolute', left: '2vmin', top: '2vmin' }}>Readiness</div>
        </motion.div>
        <motion.div className="frame" style={{ padding: '2.2vmin' }} initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: .38, duration: .55 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div><div className="tiny-label">On the roster</div><div style={{ font: '700 2.7vmin var(--font-display)', marginTop: '.7vmin' }}>Technicians</div></div><span className="film-tag">6 profiles</span></div>
          <div style={{ marginTop: '2.1vmin', display: 'grid', gap: '1.05vmin' }}>
            {[
              ['01', 'Technician 01', 'Available', 'green'],
              ['02', 'Technician 02', 'Available', 'green'],
              ['03', 'Technician 03', 'On job', 'orange'],
              ['04', 'Technician 04', 'Available', 'green'],
            ].map(([initials, name, status, tone], i) => <motion.div key={name} style={{ display: 'flex', alignItems: 'center', gap: '1.15vmin', borderBottom: '1px solid #e9e4da', padding: '.65vmin 0' }} initial={{ x: 16, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: .5 + i * .12 }}><span style={{ width: '3.7vmin', height: '3.7vmin', display: 'grid', placeItems: 'center', borderRadius: '50%', background: i % 2 ? '#e4ebe3' : '#f2e4dc', color: i % 2 ? '#4a8064' : 'var(--orange)', font: '600 1.45vmin var(--font-mono)' }}>{initials}</span><span style={{ flex: 1, fontWeight: 600, fontSize: '1.65vmin' }}>{name}</span><Status tone={tone as 'green' | 'orange'}>{status}</Status></motion.div>)}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.48vmin', marginTop: '1.05vmin' }}>
            {['Map', 'Technicians', 'Transport', 'History', 'Reviews', 'Analysis'].map((item) => <span key={item} style={{ borderRadius: '99px', padding: '.45vmin .72vmin', color: '#62675e', background: '#f0ece3', font: '1.02vmin var(--font-mono)' }}>{item}</span>)}
          </div>
        </motion.div>
        <motion.div className="frame frame-dark" style={{ overflow: 'hidden' }} initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: .62, duration: .55 }}>
          <div className="frame-top"><Activity size="1.55vmin" color="var(--orange)" /><span className="tiny-label">Dispatch activity</span><span className="film-tag" style={{ marginLeft: 'auto' }}>Today</span></div>
          <div style={{ padding: '2vmin' }}>
            <div style={{ display: 'flex', alignItems: 'end', justifyContent: 'space-between' }}><Stat label="Open work orders" value="08" color="#f8f5ec" /><Stat label="Restock flags" value="03" color="#e39b79" /></div>
            <svg viewBox="0 0 390 120" style={{ width: '100%', height: '14vmin', marginTop: '2vmin' }}>
              <path d="M0 92 C42 92 45 78 82 82 S126 44 164 57 S210 70 242 34 S287 50 314 26 S357 35 390 8" fill="none" stroke="#d64b2a" strokeWidth="4" className="draw-line" />
              <path d="M0 92 C42 92 45 78 82 82 S126 44 164 57 S210 70 242 34 S287 50 314 26 S357 35 390 8 L390 120 L0 120Z" fill="rgba(214,75,42,.12)" />
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1vmin' }}><span className="tiny-label">Dispatch recorded · 10:42</span><span style={{ color: '#b9d8c6', font: '1.3vmin var(--font-mono)' }}>SAMPLE</span></div>
          </div>
        </motion.div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--muted)', font: '1.25vmin var(--font-mono)' }}><span>HUB OVERVIEW · READINESS · ACTIVITY</span><span>ILLUSTRATIVE SYNTHETIC VALUES</span></div>
    </div>
    <TicketToken right="7%" bottom="6%" />
  </Stage>;
}

export function WorkOrderScene() {
  return <Stage>
    <div style={{ position: 'absolute', inset: '5.5% 6%', display: 'grid', gridTemplateRows: 'auto 1fr auto', gap: '2vmin' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end' }}><div><Overline>WORK ORDER / CUSTOMER CONVERSATION</Overline><h2 className="film-headline" style={{ fontSize: '5.5vmin', marginTop: '.7vmin' }}>From message to job brief.</h2></div><span className="film-tag">DEMO REQUEST · #4821</span></header>
      <div style={{ display: 'grid', gridTemplateColumns: '1.13fr .87fr', gap: '2vmin', minHeight: 0 }}>
        <motion.div className="frame" initial={{ x: -24, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: .12, duration: .55 }}>
          <div className="frame-top"><MessageSquareText size="1.6vmin" color="var(--orange)" /><span className="tiny-label">Customer conversation</span><span className="chip" style={{ marginLeft: 'auto', fontSize: '1.15vmin' }}>Demo request</span></div>
          <div style={{ padding: '1.8vmin 2vmin', display: 'grid', gap: '1.1vmin' }}>
            <div className="tiny-label">Cedar Court · sample site</div>
            <Bubble>The AC is blowing warm air.</Bubble>
            <Bubble right>When did you last change the filter?</Bubble>
            <Bubble>Filter changed last month. It still isn't cooling.</Bubble>
            <div style={{ marginTop: '.5vmin', padding: '1vmin 1.3vmin', borderRadius: '.7vmin', background: '#f5f0e7', color: '#7a7d74', font: '1.15vmin var(--font-mono)', lineHeight: 1.5 }}>SYNTHETIC MESSAGES · TELEGRAM REPLY ONLY WHEN CONNECTED + CUSTOMER-INITIATED</div>
          </div>
        </motion.div>
        <motion.div className="frame" style={{ borderTop: '.55vmin solid var(--orange)' }} initial={{ x: 22, opacity: 0, rotateY: 4 }} animate={{ x: 0, opacity: 1, rotateY: 0 }} transition={{ delay: .48, duration: .65, ease: EASE }}>
          <div style={{ padding: '2vmin 2.2vmin' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><Overline>Suggested issue</Overline><Status tone="orange">Normal urgency</Status></div>
            <div style={{ font: '700 3.7vmin/1 var(--font-display)', letterSpacing: '-.055em', marginTop: '1.4vmin' }}>AC cooling fault</div>
            <div style={{ marginTop: '2vmin', padding: '1.4vmin', borderRadius: '.8vmin', background: '#f2eee5' }}>
              <div className="tiny-label">Required parts</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.7vmin', marginTop: '1vmin' }}><span className="chip">Capacitor</span><span className="chip">Air filter</span></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1.7vmin' }}><span className="tiny-label">Analysis source</span><span className="chip chip-orange">Rule-based analysis</span></div>
            <div style={{ marginTop: '1.6vmin', paddingTop: '1.2vmin', borderTop: '1px solid var(--line)', color: '#8a6a43', fontSize: '1.35vmin' }}>Suggestions need your review before dispatch.</div>
          </div>
        </motion.div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)', font: '1.22vmin var(--font-mono)' }}><span>INBOX → ANALYSIS</span><span>EXAMPLE USES RULE-BASED SUGGESTION</span></div>
    </div>
    <TicketToken right="7%" bottom="8%" />
  </Stage>;
}

export function DispatchScene() {
  return <Stage dark>
    <div style={{ position: 'absolute', inset: '5.5% 6%', display: 'grid', gridTemplateRows: 'auto 1fr auto', gap: '1.7vmin' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end' }}><div><Overline light>ELIGIBILITY · ROUTE · APPROVAL</Overline><h2 className="film-headline" style={{ fontSize: '5.4vmin', marginTop: '.65vmin' }}>Qualified. Routed. Approved.</h2></div><span className="film-tag" style={{ color: '#b6c8bb' }}>DEMO MAP · NOT LIVE GPS</span></header>
      <div style={{ display: 'grid', gridTemplateColumns: '1.27fr .73fr', gap: '1.6vmin', minHeight: 0 }}>
        <motion.div className="frame-dark" style={{ position: 'relative', overflow: 'hidden', borderRadius: '1.35vmin', border: '1px solid rgba(255,255,255,.12)' }} initial={{ scale: 1.08, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: .1, duration: .72, ease: EASE }}>
          <div style={{ position: 'absolute', inset: 0, opacity: .18, backgroundSize: '7vmin 7vmin', backgroundImage: 'linear-gradient(to right, #c4cabe 1px, transparent 1px),linear-gradient(to bottom, #c4cabe 1px, transparent 1px)' }} />
          <svg viewBox="0 0 700 400" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
            <path d="M-10 300 C80 240 120 285 205 218 S340 230 385 145 S520 135 720 45" fill="none" stroke="#59665d" strokeWidth="35" opacity=".48" />
            <path d="M-10 300 C80 240 120 285 205 218 S340 230 385 145 S520 135 720 45" fill="none" stroke="#d5a756" strokeWidth="4" className="route-dash" />
            <path d="M70 50 L620 360 M260 0 L220 400 M500 0 L450 400" stroke="#9eaa9f" strokeWidth="2" opacity=".32" />
          </svg>
          <div style={{ position: 'absolute', left: '8%', top: '62%', display: 'grid', placeItems: 'center' }}><span className="soft-pulse" style={{ position: 'absolute', width: '5vmin', height: '5vmin', borderRadius: '50%', background: '#d64b2a44' }} /><span style={{ display: 'grid', placeItems: 'center', width: '3.3vmin', height: '3.3vmin', borderRadius: '50% 50% 50% 0', background: 'var(--orange)', transform: 'rotate(-45deg)', color: 'white' }}><MapPin size="1.6vmin" style={{ transform: 'rotate(45deg)' }} /></span><span className="film-tag" style={{ marginTop: '1vmin' }}>Workshop</span></div>
          <div style={{ position: 'absolute', right: '9%', top: '12%', display: 'grid', placeItems: 'center' }}><span style={{ display: 'grid', placeItems: 'center', width: '3.3vmin', height: '3.3vmin', borderRadius: '50% 50% 50% 0', background: '#82b395', transform: 'rotate(-45deg)', color: 'var(--ink)' }}><MapPin size="1.6vmin" style={{ transform: 'rotate(45deg)' }} /></span><span className="film-tag" style={{ marginTop: '1vmin' }}>Customer site</span></div>
          <div style={{ position: 'absolute', left: '2vmin', top: '2vmin', display: 'flex', gap: '.7vmin', alignItems: 'center' }}><Route size="1.6vmin" color="#d5a756" /><span className="tiny-label">Schematic route · no distance / ETA</span></div>
        </motion.div>
        <motion.div className="frame" style={{ padding: '2vmin', display: 'grid', gridTemplateRows: 'auto 1fr auto' }} initial={{ x: 22, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: .45, duration: .55 }}>
          <div><Overline>Dispatch plan</Overline><div style={{ font: '700 2.8vmin var(--font-display)', marginTop: '.6vmin' }}>Qualified match</div></div>
          <div style={{ display: 'grid', alignContent: 'center', gap: '1vmin' }}>
            <div style={{ padding: '1.25vmin', borderRadius: '.8vmin', background: '#f1ede4' }}><div className="tiny-label">Qualified technician · Level 2+</div><div style={{ marginTop: '.55vmin', font: '600 2vmin var(--font-display)' }}>Available for the job</div></div>
            <div style={{ padding: '1.25vmin', borderRadius: '.8vmin', background: '#f1ede4' }}><div className="tiny-label">Shared van</div><div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '.55vmin', font: '600 2vmin var(--font-display)' }}>Eligible stock <Status>Parts available</Status></div></div>
            <div className="tiny-label" style={{ lineHeight: 1.6 }}>Availability + stock rechecked at approval.</div>
          </div>
          <div>
            <div style={{ position: 'relative', height: '4.8vmin', padding: '.55vmin', border: '1px solid #ded7cb', borderRadius: '99px', background: '#ede8df' }}>
              <motion.div style={{ width: '3.7vmin', height: '3.7vmin', borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'var(--orange)', color: 'white' }} animate={{ x: ['0%', '39vmin'] }} transition={{ delay: 1.9, duration: .9, ease: EASE }}><Check size="1.8vmin" /></motion.div>
            </div>
            <motion.div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.1vmin' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.85 }}><Status>DISPATCH RECORDED</Status><span className="tiny-label">Parts reserved</span></motion.div>
          </div>
        </motion.div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#adb4ab', font: '1.2vmin var(--font-mono)' }}><span>ROUTE IS SCHEMATIC · NOT LIVE GPS</span><span>ALLOCATION + RESERVATION ARE DEMO STATE</span></div>
    </div>
    <TicketToken left="53%" top="55%" />
  </Stage>;
}

export function FieldScene() {
  return <Stage>
    <div style={{ position: 'absolute', inset: '6% 8%', display: 'grid', gridTemplateColumns: '.92fr 1fr', alignItems: 'center', gap: '5vmin' }}>
      <div><Overline>TECHNICIAN VIEW / DEMO IDENTITY</Overline><h2 className="film-headline" style={{ fontSize: '9vmin', marginTop: '1.4vmin' }}>YOUR<br />DAY.</h2><p style={{ color: '#73766e', fontSize: '2vmin', lineHeight: 1.5, maxWidth: '35vmin', marginTop: '2vmin' }}>A focused view of active jobs, proof of completion, and your own service record.</p><div style={{ marginTop: '2.2vmin' }}><Status tone="orange">Technician · demo identity</Status></div></div>
      <motion.div className="frame" style={{ width: '50vmin', justifySelf: 'center', padding: '1.15vmin', borderRadius: '2vmin', transform: 'rotate(1deg)' }} initial={{ y: 35, rotate: 4, scale: .88, opacity: 0 }} animate={{ y: 0, rotate: 1, scale: 1, opacity: 1 }} transition={{ delay: .18, duration: .72, ease: EASE }}>
        <div style={{ borderRadius: '1.35vmin', overflow: 'hidden', background: '#f6f2e9' }}>
          <div className="frame-top"><span className="dot dot-orange" /><span className="tiny-label">Your day</span><span className="chip" style={{ marginLeft: 'auto' }}>1 active</span></div>
          <div style={{ padding: '1.7vmin' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div><div className="tiny-label">Active job · demo</div><div style={{ font: '700 2.75vmin var(--font-display)', marginTop: '.5vmin' }}>Demo customer · Puchong</div></div><Status tone="orange">In progress</Status></div>
            <div className="rule" style={{ margin: '1.3vmin 0' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '.7vmin' }}><Wrench size="1.45vmin" color="var(--orange)" /><span className="tiny-label">Parts reserved</span></div>
            <div style={{ display: 'flex', gap: '.7vmin', marginTop: '.8vmin' }}><span className="chip">Capacitor</span><span className="chip">Air filter</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5vmin' }}><span className="tiny-label">Completion proof</span><span className="tiny-label">SAMPLE</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.8vmin', marginTop: '.75vmin' }}>
              {['Before', 'After'].map((label, i) => <div key={label} style={{ height: '7vmin', borderRadius: '.7vmin', position: 'relative', overflow: 'hidden', background: i ? 'linear-gradient(135deg,#d6e3d8,#9cbaa6)' : 'linear-gradient(135deg,#ded6ca,#aaa69a)' }}><div style={{ position: 'absolute', inset: '15%', border: '1px solid #fff8', borderRadius: '.4vmin', display: 'grid', placeItems: 'center' }}><span className="tiny-label" style={{ color: '#4c564c' }}>{label}</span></div></div>)}
            </div>
            <motion.div style={{ marginTop: '1.15vmin', padding: '1vmin 1.2vmin', borderRadius: '.7vmin', background: '#e4eee6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#397253', font: '600 1.45vmin var(--font-mono)' }} initial={{ scaleX: .2, opacity: 0, transformOrigin: 'left' }} animate={{ scaleX: 1, opacity: 1 }} transition={{ delay: 2.95, duration: .7 }}>JOB COMPLETED <Check size="1.8vmin" /></motion.div>
            <div style={{ marginTop: '1.15vmin', display: 'flex', justifyContent: 'space-between', color: '#797c73', font: '1.2vmin var(--font-mono)' }}><span>Sample record · illustrative only</span><span>03 / history</span></div>
          </div>
        </div>
      </motion.div>
    </div>
    <TicketToken left="47%" bottom="6%" />
  </Stage>;
}

export function TransportScene() {
  const bars = [42, 67, 31, 78, 56, 88, 48, 72, 38, 63, 91, 52];
  return <Stage>
    <div style={{ position: 'absolute', inset: '6% 6%', display: 'grid', gridTemplateRows: 'auto 1fr auto', gap: '1.8vmin' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div><Overline>TRANSPORT / INVENTORY</Overline><h2 className="film-headline" style={{ fontSize: '6.3vmin', marginTop: '.7vmin' }}>Parts move with the plan.</h2></div><span className="film-tag">SHARED WORKSHOP DATA</span></header>
      <div style={{ display: 'grid', gridTemplateColumns: '.82fr 1.3fr', gap: '1.5vmin' }}>
        <motion.div className="frame frame-dark" style={{ padding: '2vmin' }} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: .18, duration: .55 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span className="tiny-label">Shared transport</span><Truck size="1.8vmin" color="var(--orange)" /></div>
          <div style={{ display: 'grid', gap: '1vmin', marginTop: '1.4vmin' }}>
            {[
              ['Van 02', 'Available', 'green'],
              ['Van 04', 'Allocated', 'orange'],
              ['Van 07', 'Busy', 'quiet'],
            ].map(([name, status, tone], i) => <motion.div key={name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25vmin', borderRadius: '.75vmin', background: 'rgba(255,255,255,.055)', border: '1px solid rgba(255,255,255,.1)' }} initial={{ z: -25, opacity: 0, rotateY: 8 }} animate={{ z: 0, opacity: 1, rotateY: 0 }} transition={{ delay: .38 + i * .18 }}><div style={{ display: 'flex', alignItems: 'center', gap: '1vmin' }}><Truck size="1.7vmin" color={i === 1 ? '#e78362' : '#a5c4b2'} /><span style={{ font: '600 1.8vmin var(--font-display)' }}>{name}</span></div><Status tone={tone as 'green' | 'orange' | 'quiet'}>{status}</Status></motion.div>)}
          </div>
          <div className="tiny-label" style={{ marginTop: '1.5vmin', lineHeight: 1.55 }}>Available vans checked against required parts at approval.</div>
        </motion.div>
        <motion.div className="frame" style={{ padding: '1.9vmin 2.2vmin', position: 'relative', overflow: 'hidden' }} initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: .38, duration: .58 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div><div className="tiny-label">Stock on hand</div><div style={{ font: '700 2.8vmin var(--font-display)', marginTop: '.5vmin' }}>Parts inventory</div></div><span className="chip chip-orange">3 restock flags</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '1.2vmin', padding: '1.1vmin 0', marginTop: '1.1vmin', borderBottom: '1px solid var(--line)', color: 'var(--muted)', font: '1.15vmin var(--font-mono)' }}><span>PART</span><span>ON HAND</span><span>STATUS</span></div>
          {[
            ['Capacitor', '2', 'Reserved'],
            ['Air filter', '6', 'In stock'],
            ['Drain hose', '1', 'Low stock'],
          ].map(([part, quantity, status], i) => <motion.div key={part} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '1.2vmin', alignItems: 'center', padding: '1.25vmin .8vmin', borderBottom: '1px solid #ebe5db', background: status === 'Low stock' ? 'rgba(214,75,42,.07)' : 'transparent', borderRadius: '.45vmin' }} initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: .65 + i * .22 }}><span style={{ fontSize: '1.65vmin', fontWeight: 600 }}>{part}</span><span style={{ font: '600 1.7vmin var(--font-mono)' }}>{quantity}</span><Status tone={status === 'Low stock' ? 'orange' : status === 'Reserved' ? 'quiet' : 'green'}>{status}</Status></motion.div>)}
          <div style={{ display: 'flex', alignItems: 'end', justifyContent: 'space-between', marginTop: '1.1vmin' }}><div className="tiny-label">Parts usage · sample profile</div><div style={{ display: 'flex', height: '6.5vmin', alignItems: 'end', gap: '.47vmin' }}>{bars.map((h, i) => <span key={i} className="bar-fill" style={{ width: '1.25vmin', height: `${h}%`, background: i === 10 ? 'var(--orange)' : '#72aa8d', animationDelay: `${.5 + i * .05}s`, borderRadius: '.3vmin .3vmin 0 0' }} />)}</div></div>
        </motion.div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)', font: '1.2vmin var(--font-mono)' }}><span>APPROVAL RESERVES PARTS IN THE DEMO INVENTORY</span><span>ILLUSTRATIVE STOCK · NOT LIVE WAREHOUSE DATA</span></div>
    </div>
    <TicketToken left="46%" bottom="6%" />
  </Stage>;
}

export function HistoryScene() {
  const items = [['#4790', 'Filter service', 'Completed · Tue 14'], ['#4812', 'Drain flush', 'Completed · Wed 15'], ['#4821', 'Cooling fault', 'Completed · Today']];
  return <Stage>
    <div style={{ position: 'absolute', inset: '6% 6%', display: 'grid', gridTemplateRows: 'auto 1fr auto', gap: '2vmin' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end' }}><div><Overline>LOG / REVIEWS</Overline><h2 className="film-headline" style={{ fontSize: '5.9vmin', marginTop: '.65vmin' }}>A record that follows the work.</h2></div><span className="film-tag">TECHNICIAN HISTORY IS SCOPED</span></header>
      <div style={{ display: 'grid', gridTemplateColumns: '1.12fr .88fr', gap: '1.6vmin' }}>
        <motion.div className="frame" style={{ padding: '2.2vmin' }} initial={{ x: -18, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: .15, duration: .58 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div><div className="tiny-label">Service History</div><div style={{ font: '700 2.7vmin var(--font-display)', marginTop: '.5vmin' }}>Completed jobs</div></div><span className="chip">Selected demo profile</span></div>
          <div style={{ position: 'relative', marginTop: '2vmin', paddingLeft: '2.2vmin' }}>
            <motion.div style={{ position: 'absolute', top: '.5vmin', bottom: '.8vmin', left: '.55vmin', width: '.22vmin', background: 'var(--orange)', transformOrigin: 'top' }} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: .4, duration: 1.2 }} />
            {items.map(([id, title, date], i) => <motion.div key={id} style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: '1.3vmin', padding: '1.25vmin 0' }} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .55 + i * .34 }}><span style={{ position: 'absolute', left: '-2.2vmin', width: '1.2vmin', height: '1.2vmin', borderRadius: '50%', border: '2px solid var(--paper-bright)', background: i === 2 ? 'var(--green)' : 'var(--orange)' }} /><span className="film-mono" style={{ color: 'var(--orange)' }}>{id}</span><span style={{ fontWeight: 600, fontSize: '1.65vmin' }}>{title}</span><span className="tiny-label">{date}</span></motion.div>)}
          </div>
          <div style={{ paddingTop: '1vmin', borderTop: '1px solid var(--line)', color: 'var(--muted)', fontSize: '1.28vmin' }}>Technicians see their own completed-job history.</div>
        </motion.div>
        <motion.div className="frame frame-dark" style={{ position: 'relative', overflow: 'hidden', padding: '2.2vmin' }} initial={{ x: 20, opacity: 0, rotateY: -3 }} animate={{ x: 0, opacity: 1, rotateY: 0 }} transition={{ delay: .4, duration: .58 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div><div className="tiny-label">Voice of the customer</div><div style={{ font: '700 2.7vmin var(--font-display)', marginTop: '.55vmin' }}>Sample review</div></div><span className="film-tag">ILLUSTRATIVE ONLY</span></div>
          <motion.div style={{ display: 'flex', alignItems: 'center', gap: '.5vmin', marginTop: '2vmin', color: 'var(--gold)' }} initial={{ scale: .65, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 1.05, duration: .55 }}>{Array.from({ length: 5 }, (_, i) => <Star key={i} size="2.35vmin" fill="currentColor" />)}<span style={{ color: '#f4f1e9', marginLeft: '.8vmin', font: '600 2.5vmin var(--font-mono)' }}>5.0<span style={{ fontSize: '1.4vmin', color: '#adb4ab' }}> / 5</span></span></motion.div>
          <motion.p style={{ font: '500 2.6vmin/1.35 var(--font-display)', letterSpacing: '-.03em', maxWidth: '42vmin', marginTop: '2.2vmin' }} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5, duration: .5 }}>“The expert explained the capacitor issue before replacing it.”</motion.p>
          <div style={{ position: 'absolute', left: '2.2vmin', right: '2.2vmin', bottom: '2vmin', paddingTop: '1vmin', borderTop: '1px solid rgba(255,255,255,.14)', color: '#aab2a9', fontSize: '1.23vmin', lineHeight: 1.4 }}>Fictional sample comment · not feedback saved for this work order.</div>
          <motion.div style={{ position: 'absolute', right: '-3vmin', bottom: '-5vmin', width: '18vmin', height: '18vmin', border: '1px solid rgba(215,173,87,.28)', borderRadius: '50%' }} animate={{ scale: [1, 1.18], opacity: [.25, .04] }} transition={{ delay: 2.1, duration: .8 }} />
        </motion.div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)', font: '1.2vmin var(--font-mono)' }}><span>SERVICE HISTORY · SAMPLE REVIEWS</span><span>FICTIONAL DEMO PROFILE + COMMENTS</span></div>
    </div>
    <TicketToken left="46%" bottom="6%" />
  </Stage>;
}

export function InsightScene() {
  const bars = [37, 58, 46, 82, 62, 95, 53, 74, 45, 84, 65, 92];
  return <Stage dark>
    <div style={{ position: 'absolute', inset: '6% 6%', display: 'grid', gridTemplateRows: 'auto 1fr auto', gap: '1.55vmin' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div><Overline light>WORKSHOP ANALYSIS / DEMO FIGURES</Overline><h2 className="film-headline" style={{ fontSize: '5.4vmin', marginTop: '.65vmin' }}>See the whole workshop.</h2></div><BrandMark light /></header>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5vmin' }}>
        <div className="frame" style={{ padding: '1.8vmin 2vmin' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div><div className="tiny-label">Monthly sales revenue</div><div style={{ font: '700 2.65vmin var(--font-display)', marginTop: '.45vmin' }}>MYR · sample</div></div><BarChart3 size="1.9vmin" color="var(--orange)" /></div>
          <svg viewBox="0 0 520 210" style={{ width: '100%', height: '20vmin', marginTop: '1vmin' }}>
            {[35, 85, 135, 185].map((y) => <line key={y} x1="0" y1={y} x2="510" y2={y} stroke="#d9d3c9" strokeDasharray="4 7" />)}
            <motion.path d="M8 175 C58 150 66 144 103 154 S170 118 203 130 S270 78 310 103 S375 45 408 76 S470 25 512 36 L512 200 L8 200Z" fill="rgba(91,156,126,.2)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .7 }} />
            <path d="M8 175 C58 150 66 144 103 154 S170 118 203 130 S270 78 310 103 S375 45 408 76 S470 25 512 36" fill="none" stroke="#5b9c7e" strokeWidth="4" className="draw-line" />
            <circle cx="408" cy="76" r="6" fill="var(--orange)" />
          </svg>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="tiny-label">JAN</span><span className="tiny-label">APR</span><span className="tiny-label">AUG</span><span className="tiny-label">DEC</span></div>
        </div>
        <div className="frame" style={{ padding: '1.8vmin 2vmin' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div><div className="tiny-label">Accessory usage</div><div style={{ font: '700 2.65vmin var(--font-display)', marginTop: '.45vmin' }}>Monthly units · sample</div></div><Wrench size="1.8vmin" color="var(--orange)" /></div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'end', gap: '.72vmin', height: '21vmin', marginTop: '1vmin', borderBottom: '1px solid #d9d3c9', padding: '0 .3vmin' }}>
            {bars.map((height, i) => <div key={i} style={{ flex: 1, height: `${height}%`, borderRadius: '.35vmin .35vmin 0 0', background: i === 9 ? 'var(--orange)' : '#69a184', transformOrigin: 'bottom' }} className="bar-fill" />)}
            <motion.div style={{ position: 'absolute', left: 0, right: 0, top: '40%', borderTop: '1.2px dashed #c29843' }} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 1.4, duration: .65 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '.8vmin' }}><span className="tiny-label">Parts usage + average</span><span className="tiny-label">2025 / sample year</span></div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#aeb6ac', font: '1.15vmin var(--font-mono)' }}><span>FICTIONAL WORKSHOP FIGURES · NOT ACCOUNTING RECORDS</span><span>NOTHING HERE CHANGES INVENTORY</span></div>
    </div>
    <div style={{ position: 'absolute', left: '7%', bottom: '6%', width: '86%', height: '1px', background: 'rgba(214,75,42,.5)' }}>
      <motion.div style={{ position: 'absolute', height: '2px', width: '0%', background: 'var(--orange)', top: '-1px' }} animate={{ width: ['0%', '100%'] }} transition={{ delay: 2.4, duration: .8 }} />
    </div>
    <motion.div style={{ position: 'absolute', left: '10%', right: '10%', top: '18%', bottom: '12%', zIndex: 2, display: 'grid', placeContent: 'center', textAlign: 'center', background: 'var(--paper)', color: 'var(--ink)', clipPath: 'inset(100% 0 0 0)' }} animate={{ clipPath: ['inset(100% 0 0 0)', 'inset(0% 0 0 0)'] }} transition={{ delay: 3.0, duration: .6, ease: EASE }}>
      <div className="tiny-label">Conversation → diagnosis → dispatch → field work → insight</div>
      <div style={{ marginTop: '2vmin' }}><BrandMark /></div>
      <div className="film-mono" style={{ color: 'var(--muted)', marginTop: '1.2vmin', fontSize: '1.2vmin' }}>SYNTHETIC DEMO DATA · NO LIVE GPS</div>
    </motion.div>
    <TicketToken right="7%" bottom="6%" />
  </Stage>;
}
