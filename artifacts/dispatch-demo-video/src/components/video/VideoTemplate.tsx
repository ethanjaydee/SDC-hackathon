import { useEffect, useRef, type ComponentType } from 'react';
import { AnimatePresence } from 'framer-motion';
import { VideoCanvas, VideoPausedContext, useVideoPlayer, type VideoAspectRatio } from '@/lib/video';
import { Scene01 } from './video_scenes/Scene01';
import { Scene02 } from './video_scenes/Scene02';
import { Scene03 } from './video_scenes/Scene03';
import { Scene04 } from './video_scenes/Scene04';
import { Scene05 } from './video_scenes/Scene05';
import { Scene06 } from './video_scenes/Scene06';
import { Scene07 } from './video_scenes/Scene07';
import { Scene08 } from './video_scenes/Scene08';

export const SCENE_DURATIONS: Record<string, number> = {
  roles: 2000,
  identity: 1600,
  technician: 1800,
  inbox: 2400,
  brief: 4400,
  accept: 2600,
  active: 2100,
  complete: 3100,
};

export const VIDEO_ASPECT_RATIO: VideoAspectRatio = '16:9';

const SCENE_START_SEC: Record<string, number> = (() => {
  const out: Record<string, number> = {};
  let cumulativeMs = 0;
  for (const [key, ms] of Object.entries(SCENE_DURATIONS)) {
    out[key] = cumulativeMs / 1000;
    cumulativeMs += ms;
  }
  return out;
})();

const SCENES = [Scene01, Scene02, Scene03, Scene04, Scene05, Scene06, Scene07, Scene08];
const SCENE_COMPONENTS: Record<string, ComponentType> = {
  roles: Scene01,
  identity: Scene02,
  technician: Scene03,
  inbox: Scene04,
  brief: Scene05,
  accept: Scene06,
  active: Scene07,
  complete: Scene08,
};
const AUDIO_SEEK_EPSILON_SEC = 0.18;

export default function VideoTemplate({
  durations = SCENE_DURATIONS,
  loop = true,
  paused = false,
  muted = false,
  onSceneChange,
}: {
  durations?: Record<string, number>;
  loop?: boolean;
  paused?: boolean;
  muted?: boolean;
  onSceneChange?: (sceneKey: string) => void;
} = {}) {
  const { currentSceneKey } = useVideoPlayer({ durations, loop, paused });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastSceneKeyRef = useRef<string | null>(null);
  const baseSceneKey = currentSceneKey.replace(/_r[12]$/, '');
  const Scene = SCENE_COMPONENTS[baseSceneKey] ?? SCENES[0];

  useEffect(() => {
    onSceneChange?.(currentSceneKey);
  }, [currentSceneKey, onSceneChange]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.44;
    if (paused) {
      audio.pause();
      return;
    }
    if (lastSceneKeyRef.current !== currentSceneKey) {
      lastSceneKeyRef.current = currentSceneKey;
      const targetTime = SCENE_START_SEC[baseSceneKey] ?? 0;
      if (Math.abs(audio.currentTime - targetTime) > AUDIO_SEEK_EPSILON_SEC) {
        audio.currentTime = targetTime;
      }
    }
    audio.play().catch(() => {});
  }, [currentSceneKey, baseSceneKey, paused]);

  return (
    <VideoPausedContext.Provider value={paused}>
      <VideoCanvas
        aspectRatio={VIDEO_ASPECT_RATIO}
        className="video-root"
        style={{ backgroundColor: 'var(--paper)' }}
      >
        <AnimatePresence mode="sync" initial={false}>
          <Scene key={currentSceneKey} />
        </AnimatePresence>
        <audio
          ref={audioRef}
          src={`${import.meta.env.BASE_URL}audio/bg_music.mp3`}
          preload="auto"
          autoPlay
          muted={muted}
        />
      </VideoCanvas>
    </VideoPausedContext.Provider>
  );
}
