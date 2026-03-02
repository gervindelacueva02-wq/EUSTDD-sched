// Event status based on current time
export type EventStatus = 'upcoming' | 'ongoing' | 'completed';

// Transition style for overflow content
export type TransitionStyle = 
  | 'static' 
  | 'fade' 
  | 'slideUp' 
  | 'slideLeft' 
  | 'verticalAutoScroll' 
  | 'gentleContinuousScroll';

// Schedule Event
export interface ScheduleEvent {
  id: string;
  title: string;
  dateStarted: string; // ISO date string
  timeStart: string; // HH:mm format
  timeEnd: string; // HH:mm format
  details?: string;
  createdAt: string;
}

// Personnel Status Type
export type PersonnelType = 'CTO' | 'FL' | 'WFH' | 'TRAVEL';

// Personnel Status (CTO, FL, WFH, In Travel)
export interface PersonnelStatus {
  id: string;
  name: string;
  type: PersonnelType;
  dateStart: string; // ISO date string
  dateEnd: string; // ISO date string
  location?: string; // Only for TRAVEL type
  createdAt: string;
}

// Project Request with counter
export interface Project {
  id: string;
  name: string;
  number: number;
  createdAt: string;
}

// Application Settings
export interface AppSettings {
  theme: 'light' | 'dark';
  transitionStyle: TransitionStyle;
  transitionSpeed: 'verySlow' | 'slow' | 'normal' | 'fast' | 'custom';
  customTransitionSeconds: number;
  smoothScrollEnabled: boolean;
  statusColors: {
    upcoming: string;
    ongoing: string;
    completed: string;
  };
  pinEnabled: boolean;
  pin: string;
}

// Store State
export interface ScheduleStoreState {
  events: ScheduleEvent[];
  personnelStatuses: PersonnelStatus[];
  projects: Project[];
  settings: AppSettings;
  _hasHydrated: boolean;
}

// Store Actions
export interface ScheduleStoreActions {
  // Event actions
  addEvent: (event: Omit<ScheduleEvent, 'id' | 'createdAt'>) => void;
  updateEvent: (id: string, event: Partial<ScheduleEvent>) => void;
  deleteEvent: (id: string) => void;
  
  // Personnel Status actions
  addPersonnelStatus: (status: Omit<PersonnelStatus, 'id' | 'createdAt'>) => void;
  updatePersonnelStatus: (id: string, status: Partial<PersonnelStatus>) => void;
  deletePersonnelStatus: (id: string) => void;
  
  // Project actions
  addProject: (project: Omit<Project, 'id' | 'createdAt'>) => void;
  updateProject: (id: string, project: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  incrementProject: (id: string) => void;
  decrementProject: (id: string) => void;
  
  // Settings actions
  updateSettings: (settings: Partial<AppSettings>) => void;
  updateStatusColors: (colors: Partial<AppSettings['statusColors']>) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setPin: (pin: string) => void;
  togglePinEnabled: () => void;
  
  // Server sync
  loadFromServer: () => Promise<void>;
  saveToServer: () => Promise<void>;
  startAutoSync: () => void;
  stopAutoSync: () => void;
  
  // Hydration
  setHasHydrated: (state: boolean) => void;
}

export type ScheduleStore = ScheduleStoreState & ScheduleStoreActions;
