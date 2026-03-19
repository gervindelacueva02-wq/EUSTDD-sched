// Event status based on current time
export type EventStatus = 'upcoming' | 'ongoing' | 'completed';

// Event category type
export type EventCategory = 'water' | 'construction' | 'energy' | 'disaster-mitigation' | 'human-security' | 'transport' | 'others';

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
}

// Store Actions
export interface ScheduleStoreActions {
  // Event actions
  addEvent: (event: Omit<ScheduleEvent, 'id' | 'createdAt'>) => Promise<void>;
  updateEvent: (id: string, event: Partial<ScheduleEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  
  // Personnel Status actions
  addPersonnelStatus: (status: Omit<PersonnelStatus, 'id' | 'createdAt'>) => Promise<void>;
  updatePersonnelStatus: (id: string, status: Partial<PersonnelStatus>) => Promise<void>;
  deletePersonnelStatus: (id: string) => Promise<void>;
  
  // Project actions
  addProject: (project: Omit<Project, 'id' | 'createdAt'>) => Promise<void>;
  updateProject: (id: string, project: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  incrementProject: (id: string) => Promise<void>;
  decrementProject: (id: string) => Promise<void>;
  
  // Urgent Concern actions
  addUrgentConcern: (concern: Omit<UrgentConcern, 'id' | 'createdAt'>) => Promise<void>;
  updateUrgentConcern: (id: string, concern: Partial<UrgentConcern>) => Promise<void>;
  deleteUrgentConcern: (id: string) => Promise<void>;
  
  // Ticker Message actions
  addTickerMessage: (message: Omit<TickerMessage, 'id' | 'createdAt'>) => Promise<void>;
  updateTickerMessage: (id: string, message: Partial<Omit<TickerMessage, 'id' | 'createdAt'>>) => Promise<void>;
  deleteTickerMessage: (id: string) => Promise<void>;
  
  // Settings actions
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  updateStatusColors: (colors: Partial<AppSettings['statusColors']>) => Promise<void>;
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
