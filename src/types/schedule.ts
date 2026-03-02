export type EventStatus = 'upcoming' | 'ongoing' | 'completed';

export type TransitionStyle = 'static' | 'fade' | 'slideUp' | 'slideLeft' | 'verticalAutoScroll' | 'gentleContinuousScroll';

export type TransitionSpeed = 'verySlow' | 'slow' | 'normal' | 'fast' | 'custom';

export interface ScheduleEvent {
  id: string;
  title: string;
  dateStarted: string;
  dateEnd: string;
  timeStart: string;
  timeEnd: string;
  details?: string;
}

export interface PersonnelStatus {
  id: string;
  name: string;
  type: 'CTO' | 'FL' | 'WFH' | 'TRAVEL';
  dateStart: string;
  dateEnd: string;
}

export interface Project {
  id: string;
  name: string;
  count: number;
}

export interface StatusColors {
  upcoming: string;
  ongoing: string;
  completed: string;
}

export interface Settings {
  pinEnabled: boolean;
  pin: string;
  passwordEnabled: boolean;
  password: string;
  passwordHint: string;
  recoveryEmail: string;
  failedAttempts: number;
  lockoutUntil: string | null;
  theme: 'light' | 'dark' | 'system';
  transitionStyle: TransitionStyle;
  transitionSpeed: TransitionSpeed;
  smoothScrollEnabled: boolean;
  customTransitionSeconds: number;
  statusColors: StatusColors;
}

export interface ScheduleData {
  events: ScheduleEvent[];
  personnel: PersonnelStatus[];
  projects: Project[];
  settings: Settings;
}