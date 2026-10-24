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
  roles: { title: 'Enter Technician view', filePath: 'src/components/video/video_scenes/Scene01.tsx' },
  identity: { title: 'Choose technician identity', filePath: 'src/components/video/video_scenes/Scene02.tsx' },
  technician: { title: 'Technician home', filePath: 'src/components/video/video_scenes/Scene03.tsx' },
  inbox: { title: 'Open a Work Order', filePath: 'src/components/video/video_scenes/Scene04.tsx' },
  brief: { title: 'AI brief + Google Maps', filePath: 'src/components/video/video_scenes/Scene05.tsx' },
  accept: { title: 'Slide to accept', filePath: 'src/components/video/video_scenes/Scene06.tsx' },
  active: { title: 'Finish the job', filePath: 'src/components/video/video_scenes/Scene07.tsx' },
  complete: { title: 'Completed status', filePath: 'src/components/video/video_scenes/Scene08.tsx' },
};
