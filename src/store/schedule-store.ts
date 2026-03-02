import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ScheduleEvent, PersonnelStatus, Project, Settings, TransitionStyle, StatusColors } from '@/types/schedule';

const defaultStatusColors: StatusColors = {
  upcoming: '#3b82f6',
  ongoing: '#22c55e',
  completed: '#6b7280'
};

const defaultSettings: Settings = {
  pinEnabled: false,
  pin: '',
  passwordEnabled: false,
  password: '',
  passwordHint: '',
  recoveryEmail: '',
  failedAttempts: 0,
  lockoutUntil: null,
  theme: 'system',
  transitionStyle: 'static',
  transitionSpeed: 'normal',
  smoothScrollEnabled: true,
  customTransitionSeconds: 3,
  statusColors: defaultStatusColors
};

interface ScheduleStore {
  events: ScheduleEvent[];
  personnel: PersonnelStatus[];
  projects: Project[];
  settings: Settings;
  _hasHydrated: boolean;
  
  // Event actions
  addEvent: (event: ScheduleEvent) => void;
  updateEvent: (event: ScheduleEvent) => void;
  deleteEvent: (id: string) => void;
  
  // Personnel actions
  addPersonnelStatus: (status: PersonnelStatus) => void;
  updatePersonnelStatus: (status: PersonnelStatus) => void;
  deletePersonnelStatus: (id: string) => void;
  
  // Project actions
  addProject: (project: Project) => void;
  updateProject: (project: Project) => void;
  deleteProject: (id: string) => void;
  incrementProjectCount: (id: string) => void;
  decrementProjectCount: (id: string) => void;
  
  // Settings actions
  updateSettings: (settings: Partial<Settings>) => void;
  resetSettings: () => void;
  incrementFailedAttempts: () => void;
  resetFailedAttempts: () => void;
  setLockoutUntil: (date: string | null) => void;
  
  // Server sync
  loadFromServer: () => Promise<void>;
  saveToServer: () => Promise<void>;
  startAutoSync: () => void;
  stopAutoSync: () => void;
  
  // Hydration
  setHasHydrated: (state: boolean) => void;
}

let syncInterval: NodeJS.Timeout | null = null;

export const useScheduleStore = create<ScheduleStore>()(
  persist(
    (set, get) => ({
      events: [],
      personnel: [],
      projects: [],
      settings: defaultSettings,
      _hasHydrated: false,
      
      // Event actions
      addEvent: (event) => {
        set((state) => ({
          events: [...state.events, event]
        }));
        get().saveToServer();
      },
      
      updateEvent: (event) => {
        set((state) => ({
          events: state.events.map((e) => e.id === event.id ? event : e)
        }));
        get().saveToServer();
      },
      
      deleteEvent: (id) => {
        set((state) => ({
          events: state.events.filter((e) => e.id !== id)
        }));
        get().saveToServer();
      },
      
      // Personnel actions
      addPersonnelStatus: (status) => {
        set((state) => ({
          personnel: [...state.personnel, status]
        }));
        get().saveToServer();
      },
      
      updatePersonnelStatus: (status) => {
        set((state) => ({
          personnel: state.personnel.map((p) => p.id === status.id ? status : p)
        }));
        get().saveToServer();
      },
      
      deletePersonnelStatus: (id) => {
        set((state) => ({
          personnel: state.personnel.filter((p) => p.id !== id)
        }));
        get().saveToServer();
      },
      
      // Project actions
      addProject: (project) => {
        set((state) => ({
          projects: [...state.projects, project]
        }));
        get().saveToServer();
      },
      
      updateProject: (project) => {
        set((state) => ({
          projects: state.projects.map((p) => p.id === project.id ? project : p)
        }));
        get().saveToServer();
      },
      
      deleteProject: (id) => {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id)
        }));
        get().saveToServer();
      },
      
      incrementProjectCount: (id) => {
        set((state) => ({
          projects: state.projects.map((p) => 
            p.id === id ? { ...p, count: p.count + 1 } : p
          )
        }));
        get().saveToServer();
      },
      
      decrementProjectCount: (id) => {
        set((state) => ({
          projects: state.projects.map((p) => 
            p.id === id ? { ...p, count: Math.max(0, p.count - 1) } : p
          )
        }));
        get().saveToServer();
      },
      
      // Settings actions
      updateSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings }
        }));
        get().saveToServer();
      },
      
      resetSettings: () => {
        set({ settings: defaultSettings });
        get().saveToServer();
      },
      
      incrementFailedAttempts: () => {
        set((state) => ({
          settings: { ...state.settings, failedAttempts: state.settings.failedAttempts + 1 }
        }));
      },
      
      resetFailedAttempts: () => {
        set((state) => ({
          settings: { ...state.settings, failedAttempts: 0 }
        }));
      },
      
      setLockoutUntil: (date) => {
        set((state) => ({
          settings: { ...state.settings, lockoutUntil: date }
        }));
      },
      
      // Server sync
      loadFromServer: async () => {
        try {
          const response = await fetch('/api/schedule');
          if (response.ok) {
            const data = await response.json();
            if (data) {
              set({
                events: data.events || [],
                personnel: data.personnel || [],
                projects: data.projects || [],
                settings: data.settings || defaultSettings
              });
            }
          }
        } catch (error) {
          console.error('Failed to load from server:', error);
        }
      },
      
      saveToServer: async () => {
        try {
          const state = get();
          await fetch('/api/schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              events: state.events,
              personnel: state.personnel,
              projects: state.projects,
              settings: state.settings
            })
          });
        } catch (error) {
          console.error('Failed to save to server:', error);
        }
      },
      
      startAutoSync: () => {
        if (syncInterval) return;
        syncInterval = setInterval(() => {
          get().loadFromServer();
        }, 30000); // Sync every 30 seconds
      },
      
      stopAutoSync: () => {
        if (syncInterval) {
          clearInterval(syncInterval);
          syncInterval = null;
        }
      },
      
      setHasHydrated: (state) => set({ _hasHydrated: state })
    }),
    {
      name: 'eustdd-schedule-storage',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        events: state.events,
        personnel: state.personnel,
        projects: state.projects,
        settings: state.settings
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      }
    }
  )
);