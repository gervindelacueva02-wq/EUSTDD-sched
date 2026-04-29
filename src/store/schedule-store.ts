import { create } from 'zustand';
import type { ScheduleStore, ScheduleEvent, PersonnelStatus, Project, TickerMessage, AppSettings, TransitionStyle, UrgentConcern } from '@/types/schedule';

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

const demoUrgentConcerns: UrgentConcern[] = [
  {
    id: generateId(),
    title: 'Server Downtime',
    description: 'Production server experiencing intermittent issues',
    createdAt: new Date().toISOString(),
  },
  {
    id: generateId(),
    title: 'Database Migration',
    description: 'Need to migrate legacy data to new schema',
    createdAt: new Date().toISOString(),
  },
];

// Debounce helper
let saveTimeout: NodeJS.Timeout | null = null;
let syncInterval: NodeJS.Timeout | null = null;

// Cache for tracking resource changes
const resourceCache = {
  events: '',
  personnel: '',
  projects: '',
  tickerMessages: '',
  urgentConcerns: '',
  settings: '',
};

// Global sync frequency setting (can be modified at runtime)
let syncFrequencyMs = 30000; // Default: 30 seconds (down from 3 seconds)

// Helper function to fetch single resource
async function fetchResource(endpoint: string): Promise<any> {
  try {
    const response = await fetch(endpoint);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error(`Failed to fetch ${endpoint}:`, error);
  }
  return null;
}

// Helper function to save single resource
async function saveResource(endpoint: string, data: any): Promise<boolean> {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.ok;
  } catch (error) {
    console.error(`Failed to save ${endpoint}:`, error);
    return false;
  }
}

export const useScheduleStore = create<ScheduleStore>()((set, get) => ({
  // Initial state
  events: demoEvents,
  personnelStatuses: demoPersonnel,
  projects: demoProjects,
  urgentConcerns: demoUrgentConcerns,
  tickerMessages: [],
  settings: defaultSettings,
  _hasHydrated: false,
  _syncFrequency: 30, // Configurable sync frequency in seconds

  // Load data from server (initial load - fetches all resources in parallel)
  loadFromServer: async () => {
    try {
      const [events, personnel, projects, concerns, ticker, settings] = await Promise.all([
        fetchResource('/api/schedule/events'),
        fetchResource('/api/schedule/personnel'),
        fetchResource('/api/schedule/projects'),
        fetchResource('/api/schedule/concerns'),
        fetchResource('/api/schedule/ticker'),
        fetchResource('/api/schedule/settings'),
      ]);

      // Update cache
      resourceCache.events = JSON.stringify(events || []);
      resourceCache.personnel = JSON.stringify(personnel || []);
      resourceCache.projects = JSON.stringify(projects || []);
      resourceCache.urgentConcerns = JSON.stringify(concerns || []);
      resourceCache.tickerMessages = JSON.stringify(ticker || []);
      resourceCache.settings = JSON.stringify(settings || {});

      set({
        events: events || demoEvents,
        personnelStatuses: personnel || demoPersonnel,
        projects: projects || demoProjects,
        urgentConcerns: concerns || demoUrgentConcerns,
        tickerMessages: ticker || [],
        settings: { ...defaultSettings, ...settings },
        _hasHydrated: true,
      });
    } catch (error) {
      console.error('Failed to load from server:', error);
      set({ _hasHydrated: true });
    }
  },

  // Start auto-sync with configurable frequency (default 30 seconds instead of 3)
  startAutoSync: () => {
    if (syncInterval) return; // Already running
    
    syncInterval = setInterval(async () => {
      try {
        const [events, personnel, projects, concerns, ticker, settings] = await Promise.all([
          fetchResource('/api/schedule/events'),
          fetchResource('/api/schedule/personnel'),
          fetchResource('/api/schedule/projects'),
          fetchResource('/api/schedule/concerns'),
          fetchResource('/api/schedule/ticker'),
          fetchResource('/api/schedule/settings'),
        ]);

        // Only update changed resources
        const updates: any = {};
        const eventsStr = JSON.stringify(events || []);
        if (eventsStr !== resourceCache.events) {
          resourceCache.events = eventsStr;
          updates.events = events || [];
        }

        const personnelStr = JSON.stringify(personnel || []);
        if (personnelStr !== resourceCache.personnel) {
          resourceCache.personnel = personnelStr;
          updates.personnelStatuses = personnel || [];
        }

        const projectsStr = JSON.stringify(projects || []);
        if (projectsStr !== resourceCache.projects) {
          resourceCache.projects = projectsStr;
          updates.projects = projects || [];
        }

        const concernsStr = JSON.stringify(concerns || []);
        if (concernsStr !== resourceCache.urgentConcerns) {
          resourceCache.urgentConcerns = concernsStr;
          updates.urgentConcerns = concerns || [];
        }

        const tickerStr = JSON.stringify(ticker || []);
        if (tickerStr !== resourceCache.tickerMessages) {
          resourceCache.tickerMessages = tickerStr;
          updates.tickerMessages = ticker || [];
        }

        const settingsStr = JSON.stringify(settings || {});
        if (settingsStr !== resourceCache.settings) {
          resourceCache.settings = settingsStr;
          updates.settings = { ...defaultSettings, ...settings };
        }

        if (Object.keys(updates).length > 0) {
          set(updates);
        }
      } catch (error) {
        console.error('Auto-sync failed:', error);
      }
    }, syncFrequencyMs); // Configurable sync frequency
  },

  // Stop auto-sync
  stopAutoSync: () => {
    if (syncInterval) {
      clearInterval(syncInterval);
      syncInterval = null;
    }
  },

  // Set sync frequency (in seconds)
  setSyncFrequency: (seconds: number) => {
    syncFrequencyMs = Math.max(10, seconds * 1000); // Minimum 10 seconds
    get().stopAutoSync();
    get().startAutoSync();
  },

  // Save data to server (debounced with optimized endpoint calls)
  saveToServer: async () => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    
    saveTimeout = setTimeout(async () => {
      try {
        const state = get();
        
        // Save only changed resources in parallel
        await Promise.all([
          saveResource('/api/schedule/events', state.events),
          saveResource('/api/schedule/personnel', state.personnelStatuses),
          saveResource('/api/schedule/projects', state.projects),
          saveResource('/api/schedule/concerns', state.urgentConcerns),
          saveResource('/api/schedule/ticker', state.tickerMessages),
          saveResource('/api/schedule/settings', state.settings),
        ]);
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

  // Urgent Concern actions
  addUrgentConcern: (concernData) => {
    const newConcern: UrgentConcern = {
      ...concernData,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      urgentConcerns: [...state.urgentConcerns, newConcern],
    }));
    get().saveToServer();
  },

  updateUrgentConcern: (id, concernData) => {
    set((state) => ({
      urgentConcerns: state.urgentConcerns.map((concern) =>
        concern.id === id ? { ...concern, ...concernData } : concern
      ),
    }));
    get().saveToServer();
  },

  deleteUrgentConcern: (id) => {
    set((state) => ({
      urgentConcerns: state.urgentConcerns.filter((concern) => concern.id !== id),
    }));
    get().saveToServer();
  },

  // Ticker Message actions
  addTickerMessage: (messageData) => {
    const newMessage: TickerMessage = {
      ...messageData,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      tickerMessages: [...state.tickerMessages, newMessage],
    }));
    get().saveToServer();
  },

  updateTickerMessage: (id, messageData) => {
    set((state) => ({
      tickerMessages: state.tickerMessages.map((msg) =>
        msg.id === id ? { ...msg, ...messageData } : msg
      ),
    }));
    get().saveToServer();
  },

  deleteTickerMessage: (id) => {
    set((state) => ({
      tickerMessages: state.tickerMessages.filter((msg) => msg.id !== id),
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

  // Hydration
  setHasHydrated: (hasHydrated) => {
    set({ _hasHydrated: hasHydrated });
  },
}));
