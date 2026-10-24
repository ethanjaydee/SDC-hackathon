import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Pause, Play, Repeat, Volume2, VolumeX } from 'lucide-react';
import VideoTemplate, { SCENE_DURATIONS } from './VideoTemplate';
import { useSceneControls } from './useSceneControls';
import { SCENE_DETAILS } from './sceneMeta';

const PROGRESS_TICK_MS = 60;

export default function VideoWithControls() {
  const isIframed = typeof window !== 'undefined' && window.self !== window.top;
  const controls = useSceneControls(SCENE_DURATIONS);
  const [muted, setMuted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [tapPinned, setTapPinned] = useState(false);
  const sensorRef = useRef<HTMLDivElement | null>(null);
  const handleJumpTo = useCallback((index: number) => {
    controls.jumpTo(index);
    const details = SCENE_DETAILS[controls.sceneKeys[index]];
    if (details?.filePath) {
      window.parent.postMessage({
        type: 'REPLIT_VIDEO_SCENE_SELECTED',
        payload: { sceneIndex: index, sceneCount: controls.sceneKeys.length, sceneTitle: details.title, filePath: details.filePath, lineNumber: 1 },
      }, '*');
    }
  }, [controls, controls.sceneKeys]);
  useEffect(() => {
    if (!(collapsed && tapPinned)) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' && sensorRef.current && !sensorRef.current.contains(event.target as Node)) setTapPinned(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [collapsed, tapPinned]);
  useEffect(() => {
    if (!controls.paused) return;
    const running = document.getAnimations().filter((animation) => animation.playState === 'running');
    running.forEach((animation) => animation.pause());
    return () => running.forEach((animation) => animation.play());
  }, [controls.paused]);
  if (!isIframed) return <VideoTemplate />;

  const visible = !collapsed || hovering || tapPinned;
  return <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
    <VideoTemplate
      key={controls.mountKey}
      durations={controls.durations}
      loop
      paused={controls.paused}
      muted={muted}
      onSceneChange={controls.onSceneChange}
    />
    <div
      ref={sensorRef}
      className="controls-sensor"
      onPointerEnter={(event) => { if (event.pointerType === 'mouse') setHovering(true); }}
      onPointerLeave={(event) => { if (event.pointerType === 'mouse') setHovering(false); }}
      onPointerDown={(event) => { if (event.pointerType !== 'mouse' && collapsed) setTapPinned(true); }}
    >
      <div style={{ flex: 1 }} aria-hidden="true" />
      <ControlBar
        {...controls}
        muted={muted}
        collapsed={collapsed}
        visible={visible}
        onToggleMute={() => setMuted((value) => !value)}
        onToggleCollapsed={() => setCollapsed((value) => { if (!value) { setHovering(false); setTapPinned(false); } return !value; })}
        onJumpTo={handleJumpTo}
      />
    </div>
  </div>;
}

type Controls = ReturnType<typeof useSceneControls>;
function ControlBar(props: Controls & {
  muted: boolean;
  collapsed: boolean;
  visible: boolean;
  onToggleMute: () => void;
  onToggleCollapsed: () => void;
  onJumpTo: (index: number) => void;
}) {
  const { sceneKeys, activeIndex, activeDuration, activeStartTime, totalDuration, tick, paused, locked, muted, collapsed, visible, togglePause, toggleLock, onToggleMute, onToggleCollapsed, onJumpTo } = props;
  const [elapsed, setElapsed] = useState(0);
  const elapsedBaseRef = useRef(0);
  useEffect(() => { setElapsed(0); elapsedBaseRef.current = 0; }, [tick]);
  useEffect(() => {
    if (paused) return;
    const startedAt = performance.now();
    const id = window.setInterval(() => setElapsed(elapsedBaseRef.current + performance.now() - startedAt), PROGRESS_TICK_MS);
    return () => {
      window.clearInterval(id);
      elapsedBaseRef.current += performance.now() - startedAt;
    };
  }, [tick, paused]);
  const progress = activeDuration ? Math.min(1, elapsed / activeDuration) : 0;
  const totalElapsed = Math.min(totalDuration, activeStartTime + Math.min(elapsed, activeDuration));
  const time = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;
  return <div className="control-bar" style={{ transform: visible ? 'translateY(0)' : 'translateY(100%)', opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none' }} aria-hidden={!visible}>
    <button type="button" className="control-button" onClick={togglePause} aria-label={paused ? 'Play' : 'Pause'} title={paused ? 'Play' : 'Pause'}>{paused ? <Play /> : <Pause />}</button>
    <button type="button" className="control-button" onClick={toggleLock} aria-pressed={locked} aria-label={locked ? 'Loop current scene: on' : 'Loop current scene: off'} title="Loop current scene"><Repeat /></button>
    <button type="button" className="control-button" onClick={onToggleMute} aria-label={muted ? 'Unmute audio' : 'Mute audio'} title={muted ? 'Unmute audio' : 'Mute audio'}>{muted ? <VolumeX /> : <Volume2 />}</button>
    <div className="control-divider" />
    <div className="control-progress">
      {sceneKeys.map((key, index) => <button type="button" key={key} className="control-segment" onClick={() => onJumpTo(index)} aria-label={`Jump to scene ${index + 1}`} aria-current={activeIndex === index ? 'true' : undefined}>
        <span className="control-segment-fill" style={{ width: `${activeIndex === index ? progress * 100 : activeIndex > index ? 100 : 0}%` }} />
      </button>)}
    </div>
    <span className="control-readout">{activeIndex + 1}/{sceneKeys.length}</span>
    <span className="control-readout" role="timer">{time(totalElapsed)} / {time(totalDuration)}</span>
    <button type="button" className="control-button" onClick={onToggleCollapsed} aria-label={collapsed ? 'Show controls' : 'Hide controls'} aria-expanded={!collapsed}>{collapsed ? <ChevronUp /> : <ChevronDown />}</button>
  </div>;
}
