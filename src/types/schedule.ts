// Event status based on current time
export type EventStatus = 'upcoming' | 'ongoing' | 'completed';

// Event category type
export type EventCategory = 'water' | 'construction' | 'energy' | 'disaster-mitigation' | 'human-security' | 'transport' | 'admin' | 'division-chief' | 'pcieerd-officials' | 'general' | 'others';

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
  category?: EventCategory; // Keep for backward compatibility
  categories?: EventCategory[]; // New array for multiple sectors
  createdAt: string;
}

// Personnel Status Type
export type PersonnelType = 'CTO' | 'FL' | 'WFH' | 'TRAVEL' | 'OTHER';

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

// Urgent Concern
export interface UrgentConcern {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
}

// Ticker Message
export interface TickerMessage {
  id: string;
  message: string;
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
  urgentConcerns: UrgentConcern[];
  tickerMessages: TickerMessage[];
  settings: AppSettings;
  _hasHydrated: boolean;
  _syncFrequency: number; // Sync frequency in seconds
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
  
  // Urgent Concern actions
  addUrgentConcern: (concern: Omit<UrgentConcern, 'id' | 'createdAt'>) => void;
  updateUrgentConcern: (id: string, concern: Partial<UrgentConcern>) => void;
  deleteUrgentConcern: (id: string) => void;
  
  // Ticker Message actions
  addTickerMessage: (message: Omit<TickerMessage, 'id' | 'createdAt'>) => void;
  updateTickerMessage: (id: string, message: Partial<Omit<TickerMessage, 'id' | 'createdAt'>>) => void;
  deleteTickerMessage: (id: string) => void;
  
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
  setSyncFrequency: (seconds: number) => void;
  
  // Hydration
  setHasHydrated: (state: boolean) => void;
}

export type ScheduleStore = ScheduleStoreState & ScheduleStoreActions;
