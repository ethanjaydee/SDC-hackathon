// Optional scene metadata for Replit workspace integrations. When the
// workspace's scene controls are enabled for this project, a viewer's click on
// a scene segment scopes their next chat request to that scene's source file.
// Fill one entry per SCENE_DURATIONS key in VideoTemplate.tsx only when a
// skill reference asks for it; otherwise leave the map empty. Scenes missing
// from the map still play and can be jumped to.
//
// Example:
//   export const SCENE_DETAILS: Record<string, SceneDetails> = {
//     open: { title: 'Intro', filePath: 'src/components/video/video_scenes/Scene1.tsx' },
//   };

export interface SceneDetails {
  title: string;
  filePath: string;
}

export const SCENE_DETAILS: Record<string, SceneDetails> = {
  roles: { title: 'Demo roles', filePath: 'src/components/video/video_scenes/Scene01.tsx' },
  overview: { title: 'Boss overview', filePath: 'src/components/video/video_scenes/Scene02.tsx' },
  workorder: { title: 'Work order and analysis', filePath: 'src/components/video/video_scenes/Scene03.tsx' },
  dispatch: { title: 'Route and dispatch', filePath: 'src/components/video/video_scenes/Scene04.tsx' },
  field: { title: 'Technician field view', filePath: 'src/components/video/video_scenes/Scene05.tsx' },
  transport: { title: 'Transport and inventory', filePath: 'src/components/video/video_scenes/Scene06.tsx' },
  history: { title: 'Service history and reviews', filePath: 'src/components/video/video_scenes/Scene07.tsx' },
  insight: { title: 'Workshop analysis', filePath: 'src/components/video/video_scenes/Scene08.tsx' },
};
