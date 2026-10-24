import { motion } from 'framer-motion';
import { Check, CheckCircle2, MousePointer2 } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';

const BASE = `${import.meta.env.BASE_URL}website-screens/`;
const EASE = [0.2, 0.72, 0.18, 1] as const;

const transition = {
  duration: 0.36,
  ease: EASE,
};

function Stage({
  scene,
  image,
  alt,
  children,
  imageScale = 1,
}: {
  scene: string;
  image: string;
  alt: string;
  children?: ReactNode;
  imageScale?: number;
}) {
  return (
    <motion.section
      className="film site-film"
      data-film-scene={scene}
      initial={{ opacity: 0, clipPath: 'inset(0 0 0 4%)', scale: 1.01 }}
      animate={{ opacity: 1, clipPath: 'inset(0)', scale: 1 }}
      exit={{ opacity: 0, clipPath: 'inset(0 100% 0 0)', scale: 1.008 }}
      transition={transition}
      style={{ background: '#f4f3ef' }}
    >
      <motion.img
        className="site-film-screen"
        src={`${BASE}${image}`}
        alt={alt}
        draggable={false}
        initial={{ scale: imageScale + 0.018 }}
        animate={{ scale: imageScale }}
        transition={{ duration: 0.52, ease: EASE }}
      />
      {children}
    </motion.section>
  );
}

function Target({
  style,
  delay = 0.18,
  fade = false,
}: {
  style: CSSProperties;
  delay?: number;
  fade?: boolean;
}) {
  return (
    <motion.div
      aria-hidden="true"
      className="site-film-target"
      style={style}
      initial={{ opacity: 0, scale: 0.975 }}
      animate={{
        opacity: fade ? [0, 0.96, 0.72, 0] : [0, 0.96, 0.74, 0.74],
        scale: [0.975, 1, 1, 1],
      }}
      transition={{ delay, duration: fade ? 1.35 : 0.72, times: [0, 0.18, 0.5, 1], ease: EASE }}
    />
  );
}

function Pointer({
  style,
  delay = 0.3,
  travelX = 0,
  travelY = 0,
  hold = 0.18,
}: {
  style: CSSProperties;
  delay?: number;
  travelX?: number;
  travelY?: number;
  hold?: number;
}) {
  return (
    <motion.div
      aria-hidden="true"
      className="site-film-pointer"
      style={style}
      initial={{ opacity: 0, x: -10, y: -8, scale: 0.92 }}
      animate={{
        opacity: [0, 1, 1, 0],
        x: [-10, 0, travelX, travelX],
        y: [-8, 0, travelY, travelY],
        scale: [0.92, 1, 0.9, 1],
      }}
      transition={{ delay, duration: 0.96 + hold, times: [0, 0.2, 0.77, 1], ease: EASE }}
    >
      <MousePointer2 aria-hidden="true" />
      <motion.i
        className="site-film-click"
        initial={{ scale: 0.3, opacity: 0 }}
        animate={{ scale: [0.3, 1.2, 0.3], opacity: [0, 0.8, 0] }}
        transition={{ delay: delay + 0.55, duration: 0.42, ease: EASE }}
      />
    </motion.div>
  );
}

function CompletedStatus({ className = '' }: { className?: string }) {
  return (
    <motion.div
      aria-hidden="true"
      className={`site-film-completed ${className}`}
      initial={{ opacity: 0, scale: 0.9, y: 5 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
    >
      <Check size="1.45vmin" strokeWidth={2.7} />
      Completed
    </motion.div>
  );
}

export function TechnicianRoleScene() {
  return (
    <Stage
      scene="technician-role"
      image="01-role-chooser.png"
      alt="Dispatch Hub demo role chooser from the website, with the Technician option visible."
    >
      <Target style={{ left: '50.5%', top: '55.2%', width: '20.6%', height: '18.4%' }} />
      <Pointer style={{ left: '55%', top: '59%' }} delay={0.34} travelX={8} travelY={6} />
    </Stage>
  );
}

export function TechnicianIdentityScene() {
  return (
    <Stage
      scene="technician-identity"
      image="02-technician-identity.png"
      alt="The Dispatch Hub synthetic technician identity chooser."
    >
      <Target style={{ left: '28.5%', top: '49%', width: '21.5%', height: '7.6%' }} />
      <Pointer style={{ left: '31%', top: '50.7%' }} delay={0.24} travelX={7} travelY={2} />
    </Stage>
  );
}

export function TechnicianOverviewScene() {
  return (
    <Stage
      scene="technician-overview"
      image="03-technician-overview.png"
      alt="Dispatch Hub technician overview for Ravi, with the Work Order navigation visible."
      imageScale={1.018}
    >
      <Target style={{ left: '0.5%', top: '14.2%', width: '11%', height: '5.4%' }} delay={0.14} />
      <Pointer style={{ left: '4.2%', top: '14.7%' }} delay={0.26} travelX={10} travelY={1} />
    </Stage>
  );
}

export function WorkOrdersScene() {
  return (
    <Stage
      scene="work-order-trigger"
      image="04-work-orders.png"
      alt="Technician Work Order inbox showing demo request number 2, Oil filter housing is seeping."
      imageScale={1.025}
    >
      <Target style={{ left: '18.5%', top: '59%', width: '39.5%', height: '26.2%' }} delay={0.12} />
      <Pointer style={{ left: '47%', top: '76.3%' }} delay={0.28} travelX={5} travelY={1} />
    </Stage>
  );
}

export function WorkOrderBriefScene() {
  return (
    <Stage
      scene="ai-and-maps"
      image="05-work-order-brief.png"
      alt="Technician Work Order number 2 with the original customer conversation, AI job brief, eligibility and Google Maps directions link."
      imageScale={1.025}
    >
      <Target style={{ left: '63.3%', top: '23%', width: '34.5%', height: '30.6%' }} delay={0.16} fade />
      <Target style={{ left: '79.8%', top: '70.3%', width: '17.6%', height: '7.5%' }} delay={1.58} />
      <Pointer style={{ left: '82.5%', top: '72%' }} delay={1.76} travelX={5} travelY={1} />
    </Stage>
  );
}

export function AcceptWorkOrderScene() {
  return (
    <Stage
      scene="slide-to-accept"
      image="05-work-order-brief.png"
      alt="The real slide-to-accept work order control in the technician interface."
      imageScale={1.01}
    >
      <Target style={{ left: '64.2%', top: '80.5%', width: '34.2%', height: '5.4%' }} delay={0.2} />
      <motion.div
        aria-hidden="true"
        className="site-film-drag"
        style={{ left: '66.2%', top: '81.1%' }}
        initial={{ opacity: 0, x: 0 }}
        animate={{ opacity: [0, 1, 1, 0], x: [0, 0, '30vmin', '30vmin'] }}
        transition={{ delay: 0.42, duration: 1.45, times: [0, 0.1, 0.82, 1], ease: EASE }}
      >
        <MousePointer2 aria-hidden="true" />
        <motion.i
          className="site-film-click"
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: [0.3, 1.25, 0.3], opacity: [0, 0.85, 0] }}
          transition={{ delay: 1.48, duration: 0.4, ease: EASE }}
        />
      </motion.div>
      <motion.div
        aria-hidden="true"
        className="site-film-accept-cover"
        initial={{ opacity: 0, scale: 0.9, y: 7 }}
        animate={{ opacity: [0, 0, 1, 1], scale: [0.9, 0.9, 1, 1], y: [7, 7, 0, 0] }}
        transition={{ delay: 1.76, duration: 0.52, times: [0, 0.25, 0.75, 1], ease: EASE }}
      >
        <span className="site-film-accepted site-film-accepted-message">
          <CheckCircle2 size="1.55vmin" />
          Work order accepted
        </span>
      </motion.div>
    </Stage>
  );
}

export function ActiveWorkOrderScene() {
  return (
    <Stage
      scene="active-work-order"
      image="05-work-order-brief.png"
      alt="The same technician work order, now accepted and ready for completion."
      imageScale={1.012}
    >
      <motion.div
        aria-hidden="true"
        className="site-film-card-state"
        style={{ left: '63.8%', top: '55.2%', width: '34.8%', height: '38.4%' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.34, ease: EASE }}
      />
      <motion.div
        aria-hidden="true"
        className="site-film-accepted site-film-accepted-badge"
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: EASE }}
      >
        <CheckCircle2 size="1.45vmin" />
        Accepted
      </motion.div>
      <motion.div
        aria-hidden="true"
        className="site-film-brief-state"
        initial={{ opacity: 0, y: 3 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.25, ease: EASE }}
      >
        Assigned to Ravi Kumar · active work order.
      </motion.div>
      <motion.div
        aria-hidden="true"
        className="site-film-action-cover"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.22, ease: EASE }}
      />
      <motion.div
        aria-hidden="true"
        className="site-film-complete-button"
        initial={{ opacity: 0, y: 5, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.16, duration: 0.28, ease: EASE }}
      >
        <CheckCircle2 size="1.6vmin" />
        Complete job
      </motion.div>
      <Pointer style={{ left: '68%', top: '81.3%' }} delay={0.46} travelX={5} travelY={1} />
    </Stage>
  );
}

export function CompletedWorkOrderScene() {
  return (
    <Stage
      scene="work-order-completed"
      image="05-work-order-brief.png"
      alt="Work Order number 2 completed in the technician interface, shown with the site's green completion status."
      imageScale={1.018}
    >
      <motion.div
        aria-hidden="true"
        className="site-film-card-state"
        style={{ left: '14%', top: '23.2%', width: '47.7%', height: '60%' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: EASE }}
      />
      <motion.div
        aria-hidden="true"
        className="site-film-accepted site-film-completed-badge"
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.28, ease: EASE }}
      >
        <CheckCircle2 size="1.45vmin" />
        Completed
      </motion.div>
      <motion.div
        aria-hidden="true"
        className="site-film-brief-state"
        initial={{ opacity: 0, y: 3 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14, duration: 0.26, ease: EASE }}
      >
        Work completed by Ravi Kumar.
      </motion.div>
      <div className="site-film-action-cover" aria-hidden="true" />
      <CompletedStatus />
      <motion.div
        aria-hidden="true"
        className="site-film-loop-line"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 2.35, duration: 0.58, ease: EASE }}
      />
    </Stage>
  );
}
