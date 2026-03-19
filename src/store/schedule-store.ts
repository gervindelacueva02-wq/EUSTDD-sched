import { create } from 'zustand';
import type { ScheduleStore, ScheduleEvent, PersonnelStatus, Project, TickerMessage, AppSettings, TransitionStyle, UrgentConcern } from '@/types/schedule';

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

// Sync interval
let syncInterval: NodeJS.Timeout | null = null;
let lastServerUpdate: string = '';

export const useScheduleStore = create<ScheduleStore>()((set, get) => ({
  // Initial state
  events: [],
  personnelStatuses: [],
  projects: [],
  urgentConcerns: [],
  tickerMessages: [],
  settings: defaultSettings,
  _hasHydrated: false,

  // Load data from server
  loadFromServer: async () => {
    try {
      const response = await fetch('/api/data');
      if (response.ok) {
        const data = await response.json();
        lastServerUpdate = JSON.stringify(data);
        set({
          events: data.events || [],
          personnelStatuses: data.personnelStatuses || [],
          projects: data.projects || [],
          urgentConcerns: data.urgentConcerns || [],
          tickerMessages: data.tickerMessages || [],
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
        const response = await fetch('/api/data');
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
              urgentConcerns: data.urgentConcerns || [],
              tickerMessages: data.tickerMessages || [],
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

  // Save data to server (no-op, using individual API calls now)
  saveToServer: async () => {
    // This is kept for backward compatibility but is now a no-op
    // Individual API calls are made for each action
  },

  // Event actions
  addEvent: async (eventData) => {
    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      });
      if (response.ok) {
        const data = await response.json();
        set((state) => ({
          events: [...state.events, data.event],
        }));
      }
    } catch (error) {
      console.error('Failed to add event:', error);
    }
  },

  updateEvent: async (id, eventData) => {
    try {
      const response = await fetch(`/api/events/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      });
      if (response.ok) {
        const data = await response.json();
        set((state) => ({
          events: state.events.map((event) =>
            event.id === id ? data.event : event
          ),
        }));
      }
    } catch (error) {
      console.error('Failed to update event:', error);
    }
  },

  deleteEvent: async (id) => {
    try {
      const response = await fetch(`/api/events/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        set((state) => ({
          events: state.events.filter((event) => event.id !== id),
        }));
      }
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  },

  // Personnel Status actions
  addPersonnelStatus: async (statusData) => {
    try {
      const response = await fetch('/api/personnel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(statusData),
      });
      if (response.ok) {
        const data = await response.json();
        set((state) => ({
          personnelStatuses: [...state.personnelStatuses, data.personnel],
        }));
      }
    } catch (error) {
      console.error('Failed to add personnel:', error);
    }
  },

  updatePersonnelStatus: async (id, statusData) => {
    try {
      const response = await fetch(`/api/personnel/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(statusData),
      });
      if (response.ok) {
        const data = await response.json();
        set((state) => ({
          personnelStatuses: state.personnelStatuses.map((status) =>
            status.id === id ? data.personnel : status
          ),
        }));
      }
    } catch (error) {
      console.error('Failed to update personnel:', error);
    }
  },

  deletePersonnelStatus: async (id) => {
    try {
      const response = await fetch(`/api/personnel/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        set((state) => ({
          personnelStatuses: state.personnelStatuses.filter((status) => status.id !== id),
        }));
      }
    } catch (error) {
      console.error('Failed to delete personnel:', error);
    }
  },

  // Project actions
  addProject: async (projectData) => {
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData),
      });
      if (response.ok) {
        const data = await response.json();
        set((state) => ({
          projects: [...state.projects, data.project],
        }));
      }
    } catch (error) {
      console.error('Failed to add project:', error);
    }
  },

  updateProject: async (id, projectData) => {
    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData),
      });
      if (response.ok) {
        const data = await response.json();
        set((state) => ({
          projects: state.projects.map((project) =>
            project.id === id ? data.project : project
          ),
        }));
      }
    } catch (error) {
      console.error('Failed to update project:', error);
    }
  },

  deleteProject: async (id) => {
    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        set((state) => ({
          projects: state.projects.filter((project) => project.id !== id),
        }));
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  },

  incrementProject: async (id) => {
    const state = get();
    const project = state.projects.find(p => p.id === id);
    if (project) {
      try {
        const response = await fetch(`/api/projects/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ number: project.number + 1 }),
        });
        if (response.ok) {
          const data = await response.json();
          set((state) => ({
            projects: state.projects.map((p) =>
              p.id === id ? data.project : p
            ),
          }));
        }
      } catch (error) {
        console.error('Failed to increment project:', error);
      }
    }
  },

  decrementProject: async (id) => {
    const state = get();
    const project = state.projects.find(p => p.id === id);
    if (project && project.number > 0) {
      try {
        const response = await fetch(`/api/projects/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ number: project.number - 1 }),
        });
        if (response.ok) {
          const data = await response.json();
          set((state) => ({
            projects: state.projects.map((p) =>
              p.id === id ? data.project : p
            ),
          }));
        }
      } catch (error) {
        console.error('Failed to decrement project:', error);
      }
    }
  },

  // Urgent Concern actions
  addUrgentConcern: async (concernData) => {
    try {
      const response = await fetch('/api/urgent-concerns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(concernData),
      });
      if (response.ok) {
        const data = await response.json();
        set((state) => ({
          urgentConcerns: [...state.urgentConcerns, data.urgentConcern],
        }));
      }
    } catch (error) {
      console.error('Failed to add urgent concern:', error);
    }
  },

  updateUrgentConcern: async (id, concernData) => {
    try {
      const response = await fetch(`/api/urgent-concerns/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(concernData),
      });
      if (response.ok) {
        const data = await response.json();
        set((state) => ({
          urgentConcerns: state.urgentConcerns.map((concern) =>
            concern.id === id ? data.urgentConcern : concern
          ),
        }));
      }
    } catch (error) {
      console.error('Failed to update urgent concern:', error);
    }
  },

  deleteUrgentConcern: async (id) => {
    try {
      const response = await fetch(`/api/urgent-concerns/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        set((state) => ({
          urgentConcerns: state.urgentConcerns.filter((concern) => concern.id !== id),
        }));
      }
    } catch (error) {
      console.error('Failed to delete urgent concern:', error);
    }
  },

  // Ticker Message actions
  addTickerMessage: async (messageData) => {
    try {
      const response = await fetch('/api/ticker-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData),
      });
      if (response.ok) {
        const data = await response.json();
        set((state) => ({
          tickerMessages: [...state.tickerMessages, data.tickerMessage],
        }));
      }
    } catch (error) {
      console.error('Failed to add ticker message:', error);
    }
  },

  updateTickerMessage: async (id, messageData) => {
    try {
      const response = await fetch(`/api/ticker-messages/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData),
      });
      if (response.ok) {
        const data = await response.json();
        set((state) => ({
          tickerMessages: state.tickerMessages.map((msg) =>
            msg.id === id ? data.tickerMessage : msg
          ),
        }));
      }
    } catch (error) {
      console.error('Failed to update ticker message:', error);
    }
  },

  deleteTickerMessage: async (id) => {
    try {
      const response = await fetch(`/api/ticker-messages/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        set((state) => ({
          tickerMessages: state.tickerMessages.filter((msg) => msg.id !== id),
        }));
      }
    } catch (error) {
      console.error('Failed to delete ticker message:', error);
    }
  },

  // Settings actions
  updateSettings: async (newSettings) => {
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...get().settings, ...newSettings }),
      });
      if (response.ok) {
        const data = await response.json();
        set({ settings: data.settings });
      }
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  },

  updateStatusColors: async (colors) => {
    const newSettings = {
      ...get().settings,
      statusColors: { ...get().settings.statusColors, ...colors },
    };
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
      if (response.ok) {
        const data = await response.json();
        set({ settings: data.settings });
      }
    } catch (error) {
      console.error('Failed to update status colors:', error);
    }
  },

  setTheme: (theme) => {
    get().updateSettings({ theme });
  },

  setPin: (pin) => {
    get().updateSettings({ pin });
  },

  togglePinEnabled: () => {
    const current = get().settings.pinEnabled;
    get().updateSettings({ pinEnabled: !current });
  },

  // Hydration
  setHasHydrated: (hasHydrated) => {
    set({ _hasHydrated: hasHydrated });
  },
}));
