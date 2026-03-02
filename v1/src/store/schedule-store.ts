import { create } from 'zustand';
import type { ScheduleStore, ScheduleEvent, PersonnelStatus, Project, AppSettings, TransitionStyle } from '@/types/schedule';

// Generate unique ID
const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Default settings
const defaultSettings: AppSettings = {
  theme: 'light',
  transitionStyle: 'static' as TransitionStyle,
  transitionSpeed: 'normal',
  customTransitionSeconds: 3,
  smoothScrollEnabled: true,
  statusColors: {
    upcoming: '#3b82f6',
    ongoing: '#22c55e',
    completed: '#9ca3af',
  },
  // Password protection system
  passwordEnabled: false,
  password: '',
  passwordHint: '',
  recoveryEmail: '',
  failedAttempts: 0,
  lockoutUntil: null,
  // Legacy support
  pinEnabled: false,
  pin: '',
};

// Demo data for initial state (will be replaced by server data)
const demoEvents: ScheduleEvent[] = [
  {
    id: generateId(),
    title: 'Team Stand-up Meeting',
    dateStarted: new Date().toISOString().split('T')[0],
    timeStart: '09:00',
    timeEnd: '09:30',
    details: 'Conference Room A',
    createdAt: new Date().toISOString(),
  },
  {
    id: generateId(),
    title: 'Project Review',
    dateStarted: new Date().toISOString().split('T')[0],
    timeStart: '14:00',
    timeEnd: '15:30',
    details: 'Review Q4 deliverables',
    createdAt: new Date().toISOString(),
  },
  {
    id: generateId(),
    title: 'Client Presentation',
    dateStarted: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    timeStart: '10:00',
    timeEnd: '11:30',
    details: 'Present new features',
    createdAt: new Date().toISOString(),
  },
];

const demoPersonnel: PersonnelStatus[] = [
  {
    id: generateId(),
    name: 'John Smith',
    type: 'WFH',
    dateStart: new Date().toISOString().split('T')[0],
    dateEnd: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
  },
  {
    id: generateId(),
    name: 'Jane Doe',
    type: 'CTO',
    dateStart: new Date().toISOString().split('T')[0],
    dateEnd: new Date(Date.now() + 172800000).toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
  },
  {
    id: generateId(),
    name: 'Mike Johnson',
    type: 'TRAVEL',
    dateStart: new Date().toISOString().split('T')[0],
    dateEnd: new Date(Date.now() + 259200000).toISOString().split('T')[0],
    location: 'New York',
    createdAt: new Date().toISOString(),
  },
  {
    id: generateId(),
    name: 'Sarah Wilson',
    type: 'FL',
    dateStart: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    dateEnd: new Date(Date.now() + 172800000).toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
  },
];

const demoProjects: Project[] = [
  {
    id: generateId(),
    name: 'Website Redesign',
    number: 5,
    createdAt: new Date().toISOString(),
  },
  {
    id: generateId(),
    name: 'Mobile App Development',
    number: 3,
    createdAt: new Date().toISOString(),
  },
  {
    id: generateId(),
    name: 'API Integration',
    number: 2,
    createdAt: new Date().toISOString(),
  },
];

// Debounce helper
let saveTimeout: NodeJS.Timeout | null = null;
let syncInterval: NodeJS.Timeout | null = null;
let lastServerUpdate: string = '';

export const useScheduleStore = create<ScheduleStore>()((set, get) => ({
  // Initial state
  events: demoEvents,
  personnelStatuses: demoPersonnel,
  projects: demoProjects,
  settings: defaultSettings,
  _hasHydrated: false,

  // Load data from server
  loadFromServer: async () => {
    try {
      const response = await fetch('/api/schedule');
      if (response.ok) {
        const data = await response.json();
        lastServerUpdate = JSON.stringify(data);
        set({
          events: data.events || demoEvents,
          personnelStatuses: data.personnelStatuses || demoPersonnel,
          projects: data.projects || demoProjects,
          settings: { ...defaultSettings, ...data.settings },
          _hasHydrated: true,
        });
      } else {
        set({ _hasHydrated: true });
      }
    } catch (error) {
      console.error('Failed to load from server:', error);
      set({ _hasHydrated: true });
    }
  },

  // Start auto-sync (polling every 3 seconds)
  startAutoSync: () => {
    if (syncInterval) return; // Already running
    
    syncInterval = setInterval(async () => {
      try {
        const response = await fetch('/api/schedule');
        if (response.ok) {
          const data = await response.json();
          const serverUpdate = JSON.stringify(data);
          
          // Only update if data changed
          if (serverUpdate !== lastServerUpdate) {
            lastServerUpdate = serverUpdate;
            set({
              events: data.events || [],
              personnelStatuses: data.personnelStatuses || [],
              projects: data.projects || [],
              settings: { ...defaultSettings, ...data.settings },
            });
          }
        }
      } catch (error) {
        console.error('Auto-sync failed:', error);
      }
    }, 3000); // Sync every 3 seconds
  },

  // Stop auto-sync
  stopAutoSync: () => {
    if (syncInterval) {
      clearInterval(syncInterval);
      syncInterval = null;
    }
  },

  // Save data to server (debounced)
  saveToServer: async () => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    
    saveTimeout = setTimeout(async () => {
      try {
        const state = get();
        const dataToSend = {
          events: state.events,
          personnelStatuses: state.personnelStatuses,
          projects: state.projects,
          settings: state.settings,
        };
        
        const response = await fetch('/api/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSend),
        });
        
        if (response.ok) {
          lastServerUpdate = JSON.stringify(dataToSend);
        }
      } catch (error) {
        console.error('Failed to save to server:', error);
      }
    }, 500); // 500ms debounce
  },

  // Event actions
  addEvent: (eventData) => {
    const newEvent: ScheduleEvent = {
      ...eventData,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      events: [...state.events, newEvent],
    }));
    get().saveToServer();
  },

  updateEvent: (id, eventData) => {
    set((state) => ({
      events: state.events.map((event) =>
        event.id === id ? { ...event, ...eventData } : event
      ),
    }));
    get().saveToServer();
  },

  deleteEvent: (id) => {
    set((state) => ({
      events: state.events.filter((event) => event.id !== id),
    }));
    get().saveToServer();
  },

  // Personnel Status actions
  addPersonnelStatus: (statusData) => {
    const newStatus: PersonnelStatus = {
      ...statusData,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      personnelStatuses: [...state.personnelStatuses, newStatus],
    }));
    get().saveToServer();
  },

  updatePersonnelStatus: (id, statusData) => {
    set((state) => ({
      personnelStatuses: state.personnelStatuses.map((status) =>
        status.id === id ? { ...status, ...statusData } : status
      ),
    }));
    get().saveToServer();
  },

  deletePersonnelStatus: (id) => {
    set((state) => ({
      personnelStatuses: state.personnelStatuses.filter((status) => status.id !== id),
    }));
    get().saveToServer();
  },

  // Project actions
  addProject: (projectData) => {
    const newProject: Project = {
      ...projectData,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      projects: [...state.projects, newProject],
    }));
    get().saveToServer();
  },

  updateProject: (id, projectData) => {
    set((state) => ({
      projects: state.projects.map((project) =>
        project.id === id ? { ...project, ...projectData } : project
      ),
    }));
    get().saveToServer();
  },

  deleteProject: (id) => {
    set((state) => ({
      projects: state.projects.filter((project) => project.id !== id),
    }));
    get().saveToServer();
  },

  incrementProject: (id) => {
    set((state) => ({
      projects: state.projects.map((project) =>
        project.id === id ? { ...project, number: project.number + 1 } : project
      ),
    }));
    get().saveToServer();
  },

  decrementProject: (id) => {
    set((state) => ({
      projects: state.projects.map((project) =>
        project.id === id ? { ...project, number: Math.max(0, project.number - 1) } : project
      ),
    }));
    get().saveToServer();
  },

  // Settings actions
  updateSettings: (newSettings) => {
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    }));
    get().saveToServer();
  },

  updateStatusColors: (colors) => {
    set((state) => ({
      settings: {
        ...state.settings,
        statusColors: { ...state.settings.statusColors, ...colors },
      },
    }));
    get().saveToServer();
  },

  setTheme: (theme) => {
    set((state) => ({
      settings: { ...state.settings, theme },
    }));
    get().saveToServer();
  },

  setPin: (pin) => {
    set((state) => ({
      settings: { ...state.settings, pin },
    }));
    get().saveToServer();
  },

  togglePinEnabled: () => {
    set((state) => ({
      settings: { ...state.settings, pinEnabled: !state.settings.pinEnabled },
    }));
    get().saveToServer();
  },

  // Password actions
  setPassword: (password) => {
    set((state) => ({
      settings: { ...state.settings, password },
    }));
    get().saveToServer();
  },

  setPasswordHint: (passwordHint) => {
    set((state) => ({
      settings: { ...state.settings, passwordHint },
    }));
    get().saveToServer();
  },

  setRecoveryEmail: (recoveryEmail) => {
    set((state) => ({
      settings: { ...state.settings, recoveryEmail },
    }));
    get().saveToServer();
  },

  togglePasswordEnabled: () => {
    set((state) => ({
      settings: { ...state.settings, passwordEnabled: !state.settings.passwordEnabled },
    }));
    get().saveToServer();
  },

  incrementFailedAttempts: () => {
    set((state) => ({
      settings: { ...state.settings, failedAttempts: state.settings.failedAttempts + 1 },
    }));
    get().saveToServer();
  },

  resetFailedAttempts: () => {
    set((state) => ({
      settings: { ...state.settings, failedAttempts: 0, lockoutUntil: null },
    }));
    get().saveToServer();
  },

  setLockoutUntil: (timestamp) => {
    set((state) => ({
      settings: { ...state.settings, lockoutUntil: timestamp },
    }));
    get().saveToServer();
  },

  // Hydration
  setHasHydrated: (hasHydrated) => {
    set({ _hasHydrated: hasHydrated });
  },
}));