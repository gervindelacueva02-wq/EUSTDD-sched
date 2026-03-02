'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { format, isToday, isTomorrow, isWithinInterval, parseISO, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, differenceInMinutes } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, 
  Plus, 
  Minus,
  Calendar as CalendarIcon, 
  Clock, 
  Lock,
  Trash2,
  X,
  BellRing,
  Pencil
} from 'lucide-react';
import { useScheduleStore } from '@/store/schedule-store';
import type { ScheduleEvent, PersonnelStatus, Project, Settings as SettingsType, EventStatus, TransitionStyle, TransitionSpeed } from '@/types/schedule';
import { Button } from '@/components/ui/button';import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';

// Utility function to format time to 12-hour format
const formatTime12Hour = (time: string): string => {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
};

// Get event status based on current time
const getEventStatus = (event: ScheduleEvent): EventStatus => {
  const now = new Date();
  const today = format(now, 'yyyy-MM-dd');
  
  if (event.dateStarted !== today) {
    return 'upcoming';
  }

  const currentTime = format(now, 'HH:mm');
  
  if (currentTime < event.timeStart) {
    return 'upcoming';
  } else if (currentTime >= event.timeStart && currentTime <= event.timeEnd) {
    return 'ongoing';
  } else {
    return 'completed';
  }
};

// Check if a date is within a range
const isDateInRange = (dateStart: string, dateEnd: string, checkDate: Date): boolean => {
  const start = startOfDay(parseISO(dateStart));
  const end = endOfDay(parseISO(dateEnd));
  return isWithinInterval(checkDate, { start, end });
};

// Notification interface
interface EventNotification {
  event: ScheduleEvent;
  minutesUntil: number;
}

// Check if event is starting within 5 minutes
const getUpcomingEvents = (events: ScheduleEvent[], minutesBefore: number = 5): EventNotification[] => {
  const now = new Date();
  const notifications: EventNotification[] = [];
  
  for (const event of events) {
    if (!isToday(parseISO(event.dateStarted))) continue;
    
    const [hours, minutes] = event.timeStart.split(':').map(Number);
    const eventStartTime = new Date(now);
    eventStartTime.setHours(hours, minutes, 0, 0);
    
    const diffMinutes = differenceInMinutes(eventStartTime, now);
    
    if (diffMinutes > 0 && diffMinutes <= minutesBefore) {
      notifications.push({
        event,
        minutesUntil: diffMinutes
      });
    }
  }
  
  return notifications.sort((a, b) => a.minutesUntil - b.minutesUntil);
};

// Get transition speed in seconds
const getTransitionSpeed = (speed: string, customSeconds: number): number => {
  switch (speed) {
    case 'verySlow': return 1.5;
    case 'slow': return 1;
    case 'normal': return 0.5;
    case 'fast': return 0.25;
    case 'custom': return customSeconds;
    default: return 0.5;
  }
};

// Get page display duration based on transition speed
const getPageDisplayDuration = (speed: string): number => {
  switch (speed) {
    case 'verySlow': return 8000;
    case 'slow': return 5000;
    case 'normal': return 3000;
    case 'fast': return 1500;
    case 'custom': return 3000;
    default: return 3000;
  }
};

// Get scroll speed for continuous scroll modes
const getScrollSpeed = (speed: string): number => {
  switch (speed) {
    case 'verySlow': return 15;
    case 'slow': return 25;
    case 'normal': return 40;
    case 'fast': return 60;
    case 'custom': return 40;
    default: return 40;
  }
};

// Custom hook for overflow transition management
function useOverflowTransition<T>(
  items: T[],
  containerRef: React.RefObject<HTMLDivElement | null>,
  itemHeight: number = 32,
  settings: { transitionStyle: TransitionStyle; transitionSpeed: string; smoothScrollEnabled: boolean; customTransitionSeconds: number }
) {
  const [currentPage, setCurrentPage] = useState(0);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const scrollPositionRef = useRef(0);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isAnimatingRef = useRef(false);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current) {
        const containerHeight = containerRef.current.clientHeight;
        const calculatedItemsPerPage = Math.floor(containerHeight / itemHeight);
        setItemsPerPage(Math.max(1, calculatedItemsPerPage));
        
        const contentElement = containerRef.current.querySelector('[data-content-measure]');
        if (contentElement) {
          const actualContentHeight = contentElement.scrollHeight;
          setHasOverflow(actualContentHeight > containerHeight);
        } else {
          const availableHeight = containerHeight - 12;
          const totalItemHeight = items.length * itemHeight;
          setHasOverflow(totalItemHeight > availableHeight);
        }
      }
    };

    const rafId = requestAnimationFrame(() => {
      checkOverflow();
    });
    
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(checkOverflow);
      });
      resizeObserver.observe(containerRef.current);
    }
    
    window.addEventListener('resize', checkOverflow);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', checkOverflow);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [items.length, itemHeight, containerRef]);

  const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage));

  const currentItems = hasOverflow && 
    (settings.transitionStyle === 'fade' || settings.transitionStyle === 'slideUp' || settings.transitionStyle === 'slideLeft')
    ? items.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage)
    : items;

  const cleanupAnimations = useCallback(() => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    isAnimatingRef.current = false;
    lastTimeRef.current = 0;
  }, []);

  useEffect(() => {
    cleanupAnimations();
    scrollPositionRef.current = 0;
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
    queueMicrotask(() => setCurrentPage(0));
  }, [settings.transitionStyle, cleanupAnimations, containerRef]);

  useEffect(() => {
    if (!hasOverflow) return;
    if (settings.transitionStyle !== 'fade' && settings.transitionStyle !== 'slideUp' && settings.transitionStyle !== 'slideLeft') return;
    if (totalPages <= 1) return;

    cleanupAnimations();
    
    const duration = getPageDisplayDuration(settings.transitionSpeed);
    isAnimatingRef.current = true;
    
    intervalRef.current = setInterval(() => {
      if (!isAnimatingRef.current) return;
      setCurrentPage((prev) => (prev + 1) % totalPages);
    }, duration);

    return () => cleanupAnimations();
  }, [hasOverflow, settings.transitionStyle, settings.transitionSpeed, totalPages, itemsPerPage, cleanupAnimations]);

  useEffect(() => {
    if (!hasOverflow) return;
    if (settings.transitionStyle !== 'verticalAutoScroll' && settings.transitionStyle !== 'gentleContinuousScroll') return;
    if (!containerRef.current) return;

    cleanupAnimations();
    
    const container = containerRef.current;
    const scrollSpeed = getScrollSpeed(settings.transitionSpeed);
    
    if (settings.transitionStyle === 'gentleContinuousScroll') {
      isAnimatingRef.current = true;
      lastTimeRef.current = 0;
      
      const singleSetHeight = container.scrollHeight / 2;
      
      const animate = (timestamp: number) => {
        if (!isAnimatingRef.current) return;
        
        if (!lastTimeRef.current) {
          lastTimeRef.current = timestamp;
        }
        const delta = timestamp - lastTimeRef.current;
        lastTimeRef.current = timestamp;

        scrollPositionRef.current += (scrollSpeed * delta) / 1000;
        
        if (scrollPositionRef.current >= singleSetHeight) {
          scrollPositionRef.current = scrollPositionRef.current - singleSetHeight;
        }
        
        container.scrollTop = scrollPositionRef.current;
        animationRef.current = requestAnimationFrame(animate);
      };

      animationRef.current = requestAnimationFrame(animate);
      
      return () => cleanupAnimations();
    } else if (settings.transitionStyle === 'verticalAutoScroll') {
      const stepSize = itemHeight * 2;
      const pauseDuration = 2000;
      isAnimatingRef.current = true;
      
      intervalRef.current = setInterval(() => {
        if (!isAnimatingRef.current || !containerRef.current) return;
        
        const currentContainer = containerRef.current;
        const maxScroll = currentContainer.scrollHeight - currentContainer.clientHeight;
        scrollPositionRef.current += stepSize;
        
        if (scrollPositionRef.current >= maxScroll) {
          const timeoutId = setTimeout(() => {
            if (!isAnimatingRef.current) return;
            scrollPositionRef.current = 0;
            if (containerRef.current) {
              containerRef.current.scrollTop = 0;
            }
          }, pauseDuration / 2);
          
          return () => clearTimeout(timeoutId);
        } else {
          currentContainer.scrollTo({
            top: scrollPositionRef.current,
            behavior: settings.smoothScrollEnabled ? 'smooth' : 'auto'
          });
        }
      }, pauseDuration);

      return () => cleanupAnimations();
    }
  }, [hasOverflow, settings.transitionStyle, settings.transitionSpeed, settings.smoothScrollEnabled, itemHeight, cleanupAnimations]);

  useEffect(() => {
    cleanupAnimations();
    scrollPositionRef.current = 0;
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
    queueMicrotask(() => setCurrentPage(0));
  }, [items.length, cleanupAnimations, containerRef]);

  return {
    currentItems,
    hasOverflow,
    currentPage,
    totalPages,
    itemsPerPage
  };
}

// Animation variants for different transition styles
const getTransitionVariants = (style: TransitionStyle, speed: number) => {
  const duration = speed;
  
  switch (style) {
    case 'fade':
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { duration } },
        exit: { opacity: 0, transition: { duration: duration / 2 } },
      };
    case 'slideUp':
      return {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0, transition: { duration } },
        exit: { opacity: 0, y: -20, transition: { duration: duration / 2 } },
      };
    case 'slideLeft':
      return {
        initial: { opacity: 0, x: 20 },
        animate: { opacity: 1, x: 0, transition: { duration } },
        exit: { opacity: 0, x: -20, transition: { duration: duration / 2 } },
      };
    case 'static':
    default:
      return {
        initial: { opacity: 1 },
        animate: { opacity: 1 },
        exit: { opacity: 1 },
      };
  }
};

// Password Entry Dialog
function PasswordDialog({ 
  open, 
  onClose, 
  onSuccess,
  title = "Enter Password"
}: { 
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
}) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoverySent, setRecoverySent] = useState(false);
  const [lockoutRemaining, setLockoutRemaining] = useState<number | null>(null);
  
  const { settings, incrementFailedAttempts, resetFailedAttempts, setLockoutUntil } = useScheduleStore();

  const isLockedOut = settings.lockoutUntil && new Date(settings.lockoutUntil) > new Date();
  const shouldShowHint = settings.failedAttempts >= 3 && !!settings.passwordHint;

  useEffect(() => {
    if (!isLockedOut || !settings.lockoutUntil) {
      return;
    }
    
    const updateRemaining = () => {
      const remaining = Math.max(0, Math.ceil((new Date(settings.lockoutUntil!).getTime() - Date.now()) / 1000));
      setLockoutRemaining(remaining);
      if (remaining === 0) {
        setLockoutUntil(null);
        resetFailedAttempts();
      }
    };
    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);
    return () => clearInterval(interval);
  }, [isLockedOut, settings.lockoutUntil, setLockoutUntil, resetFailedAttempts]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowHint(shouldShowHint);
    }, 0);
    return () => clearTimeout(timer);
  }, [shouldShowHint]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLockedOut) {
      setError(`Account locked. Please wait ${lockoutRemaining} seconds.`);
      return;
    }

    if (password === settings.password) {
      setPassword('');
      setError('');
      setShowHint(false);
      resetFailedAttempts();
      onSuccess();
      onClose();
    } else {
      incrementFailedAttempts();
      setPassword('');
      
      if (settings.failedAttempts + 1 >= 5) {
        const lockoutTime = new Date(Date.now() + 5 * 60 * 1000);
        setLockoutUntil(lockoutTime.toISOString());
        setError('Too many failed attempts. Account locked for 5 minutes.');
        
        if (settings.recoveryEmail) {
          try {
            await fetch('/api/email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: settings.recoveryEmail,
                subject: `⚠️ Account Locked - EUSTDD Schedule`,
                body: `Your account has been locked due to 5 failed password attempts.\n\nFor security reasons, access has been temporarily restricted for 5 minutes.\n\nIf this was not you, please contact your administrator immediately.`,
                type: 'lockout'
              })
            });
          } catch (err) {
            console.error('Failed to send lockout notification:', err);
          }
        }
      } else {
        setError(`Incorrect password. ${5 - settings.failedAttempts - 1} attempts remaining.`);
      }
    }
  };

  const handleSendRecovery = async () => {
    if (!recoveryEmail) {
      return;
    }
    
    try {
      const response = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recoveryEmail,
          subject: '🔐 Password Recovery - EUSTDD Schedule',
          body: `You have requested to reset your password for EUSTDD Schedule.\n\nPlease contact your administrator to reset your password.\n\nIf you did not request this, please ignore this email.`,
          type: 'recovery'
        })
      });
      
      if (response.ok) {
        setRecoverySent(true);
        if (settings.passwordHint) {
          await fetch('/api/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: recoveryEmail,
              subject: '💡 Password Hint - EUSTDD Schedule',
              body: `Your password hint: "${settings.passwordHint}"\n\nIf you did not request this, someone may be trying to access your account.`,
              type: 'hint'
            })
          });
        }
      }
    } catch (err) {
      console.error('Failed to send recovery email:', err);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            {title}
          </DialogTitle>
        </DialogHeader>
        
        {!showRecovery ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="text-sm text-destructive text-center bg-destructive/10 p-2 rounded">
                {error}
              </div>
            )}
            
            {isLockedOut && lockoutRemaining !== null && (
              <div className="text-center bg-amber-100 dark:bg-amber-900/20 p-3 rounded">
                <p className="text-amber-800 dark:text-amber-200 font-medium">
                  🔒 Account Locked
                </p>
                <p className="text-2xl font-mono mt-1">
                  {formatTime(lockoutRemaining)}
                </p>
              </div>
            )}
            
            {showHint && settings.passwordHint && !isLockedOut && (
              <div className="text-sm bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                <p className="text-blue-800 dark:text-blue-200 font-medium">💡 Hint:</p>
                <p className="text-blue-700 dark:text-blue-300">{settings.passwordHint}</p>
              </div>
            )}
            
            <div className="space-y-2">
              <Input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="text-lg"
                autoFocus
                disabled={!!(isLockedOut !== null && isLockedOut)}
              />
            </div>
            
            <DialogFooter className="flex flex-col gap-2">
              <div className="flex gap-2 w-full">
                <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1" 
                  disabled={!password || !!(isLockedOut !== null && isLockedOut)}
                >
                  Unlock
                </Button>
              </div>
              
              {settings.recoveryEmail && (
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="w-full text-sm text-muted-foreground"
                  onClick={() => setShowRecovery(true)}
                >
                  Forgot password? Request recovery
                </Button>
              )}
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter your recovery email to receive password assistance.
            </p>
            
            {recoverySent ? (
              <div className="text-center bg-green-50 dark:bg-green-900/20 p-4 rounded">
                <p className="text-green-800 dark:text-green-200">
                  ✅ Recovery email sent! Check your inbox.
                </p>
              </div>
            ) : (
              <>
                <Input 
                  type="email"
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  placeholder="Enter your recovery email"
                  className="text-lg"
                />
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowRecovery(false)}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button 
                    type="button"
                    onClick={handleSendRecovery}
                    disabled={!recoveryEmail.includes('@')}
                    className="flex-1"
                  >
                    Send Recovery Email
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// PIN Dialog Component
function PinDialog({ 
  open, 
  onClose, 
  onSuccess,
  title = "Enter PIN"
}: { 
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
}) {
  return (
    <PasswordDialog 
      open={open} 
      onClose={onClose} 
      onSuccess={onSuccess}
      title={title}
    />
  );
}
// Header Component
function Header({ 
  onOpenSettings, 
  onAddEntry,
  viewMode,
  onViewModeChange
}: { 
  onOpenSettings: () => void;
  onAddEntry: (type: string) => void;
  viewMode: 'day' | 'week' | 'month';
  onViewModeChange: (mode: 'day' | 'week' | 'month') => void;
}) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<'settings' | 'add' | null>(null);
  const [pendingAddType, setPendingAddType] = useState<string>('');
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const { settings } = useScheduleStore();
  const requiresPin = settings.pinEnabled && settings.pin;

  const isSessionUnlocked = () => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('eustdd-session-auth') === 'unlocked';
  };

  const handleProtectedAction = (action: () => void, type: 'settings' | 'add', addType?: string) => {
    if (requiresPin && isSessionUnlocked()) {
      action();
      return;
    }
    
    if (requiresPin) {
      setPendingAction(type);
      if (addType) setPendingAddType(addType);
      setPinDialogOpen(true);
    } else {
      action();
    }
  };

  const handlePasswordSuccess = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('eustdd-session-auth', 'unlocked');
    }
    
    if (pendingAction === 'settings') {
      onOpenSettings();
    } else if (pendingAction === 'add' && pendingAddType) {
      onAddEntry(pendingAddType);
    }
    setPendingAction(null);
    setPendingAddType('');
  };

  const getViewModeLabel = () => {
    switch (viewMode) {
      case 'day': return 'Day';
      case 'week': return 'Week';
      case 'month': return 'Month';
    }
  };

  return (
    <>
      <header className="w-full bg-card border-b border-border px-2 sm:px-4 py-2 relative">
        {/* Mobile Layout */}
        <div className="flex flex-col gap-2 sm:hidden">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold tracking-wide text-foreground">
              EUSTDD SCHEDULE
            </h1>
            <div className="flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 w-9">
                    <CalendarIcon className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-28">
                  <DropdownMenuItem onClick={() => onViewModeChange('day')}>Day</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onViewModeChange('week')}>Week</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onViewModeChange('month')}>Month</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Plus className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={() => handleProtectedAction(() => onAddEntry('event'), 'add', 'event')}>Add Event</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleProtectedAction(() => onAddEntry('cto'), 'add', 'cto')}>Add CTO / FL</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleProtectedAction(() => onAddEntry('wfh'), 'add', 'wfh')}>Add WFH</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleProtectedAction(() => onAddEntry('travel'), 'add', 'travel')}>Add In Travel</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleProtectedAction(() => onAddEntry('project'), 'add', 'project')}>Add Project</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => handleProtectedAction(onOpenSettings, 'settings')}>
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarIcon className="h-3.5 w-3.5" />
              {format(currentTime, 'MMM d, yyyy')}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span className="font-mono tabular-nums">{format(currentTime, 'hh:mm:ss aa')}</span>
            </span>
          </div>
        </div>
        
        {/* Desktop/Tablet Layout */}
        <div className="hidden sm:flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl lg:text-[30px] font-bold tracking-wide text-foreground">
              EUSTDD SCHEDULE
            </h1>
          </div>
          
          <div className="flex-1 flex justify-center">
            <div className="flex flex-wrap items-center justify-center gap-2 lg:gap-3 text-sm lg:text-[18px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CalendarIcon className="h-4 w-4 lg:h-5 lg:w-5" />
                {format(currentTime, 'MMMM d, yyyy')}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 lg:h-5 lg:w-5" />
                <span className="font-mono tabular-nums">{format(currentTime, 'hh:mm:ss aa')}</span>
              </span>
            </div>
          </div>
          
          <div className="flex-1 flex justify-end items-center gap-1 lg:gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-9 px-2 lg:px-3 gap-1.5">
                  <CalendarIcon className="h-4 w-4" />
                  <span className="text-sm hidden lg:inline">{getViewModeLabel()}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-28">
                <DropdownMenuItem className="text-sm py-2" onClick={() => onViewModeChange('day')}>Day</DropdownMenuItem>
                <DropdownMenuItem className="text-sm py-2" onClick={() => onViewModeChange('week')}>Week</DropdownMenuItem>
                <DropdownMenuItem className="text-sm py-2" onClick={() => onViewModeChange('month')}>Month</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 lg:h-12 lg:w-12">
                  <Plus className="h-5 w-5 lg:h-6 lg:w-6" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem className="text-sm py-2" onClick={() => handleProtectedAction(() => onAddEntry('event'), 'add', 'event')}>Add Event</DropdownMenuItem>
                <DropdownMenuItem className="text-sm py-2" onClick={() => handleProtectedAction(() => onAddEntry('cto'), 'add', 'cto')}>Add CTO / FL</DropdownMenuItem>
                <DropdownMenuItem className="text-sm py-2" onClick={() => handleProtectedAction(() => onAddEntry('wfh'), 'add', 'wfh')}>Add WFH</DropdownMenuItem>
                <DropdownMenuItem className="text-sm py-2" onClick={() => handleProtectedAction(() => onAddEntry('travel'), 'add', 'travel')}>Add In Travel</DropdownMenuItem>
                <DropdownMenuItem className="text-sm py-2" onClick={() => handleProtectedAction(() => onAddEntry('project'), 'add', 'project')}>Add Project</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button variant="ghost" size="icon" onClick={() => handleProtectedAction(onOpenSettings, 'settings')} className="h-10 w-10 lg:h-12 lg:w-12">
              <Settings className="h-5 w-5 lg:h-6 lg:w-6" />
            </Button>
          </div>
        </div>
      </header>

      <PinDialog 
        open={pinDialogOpen}
        onClose={() => {
          setPinDialogOpen(false);
          setPendingAction(null);
          setPendingAddType('');
        }}
        onSuccess={handlePasswordSuccess}
      />
    </>
  );
}

// Status indicator dot
function StatusDot({ color, size = 'md', className = '' }: { color: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizeClasses = {
    sm: 'w-2.5 h-2.5',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };
  
  return (
    <span 
      className={`inline-block rounded-full flex-shrink-0 ${sizeClasses[size]} ${className}`} 
      style={{ backgroundColor: color }}
    />
  );
}

// Event Row Component
function EventRow({ event, onDelete, onEdit, transitionStyle, transitionSpeed, showDate }: { 
  event: ScheduleEvent; 
  onDelete?: () => void;
  onEdit?: () => void;
  transitionStyle: TransitionStyle;
  transitionSpeed: number;
  showDate?: boolean;
}) {
  const { settings } = useScheduleStore();
  const status = getEventStatus(event);
  const statusColor = settings.statusColors[status];
  const isAllDay = event.timeStart === '00:00' && event.timeEnd === '23:59';
  
  const variants = getTransitionVariants(transitionStyle, transitionSpeed);
  
  return (
    <motion.div 
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      layout
      className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-2 px-2 sm:px-3 hover:bg-muted/50 rounded group transition-colors"
    >
      {/* Mobile Layout */}
      <div className="flex items-start gap-2 flex-1 min-w-0 sm:hidden">
        <StatusDot color={statusColor} size="sm" className="mt-1.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <span className="font-medium text-sm text-foreground break-words flex-1">{event.title}</span>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              {onEdit && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              )}
              {onDelete && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              )}
            </div>
          </div>
          <div className="text-muted-foreground text-xs whitespace-nowrap mt-0.5">
            {showDate && <span>{format(parseISO(event.dateStarted), 'MMM d')} • </span>}
            {isAllDay ? 'All Day' : `${formatTime12Hour(event.timeStart)} - ${formatTime12Hour(event.timeEnd)}`}
          </div>
          {event.details && (
            <div className="text-muted-foreground text-xs mt-0.5 truncate">{event.details}</div>
          )}
        </div>
      </div>
      
      {/* Desktop Layout */}
      <div className="hidden sm:flex items-start gap-2 w-[50%] min-w-0">
        <StatusDot color={statusColor} size="md" className="mt-2" />
        <span className="font-medium text-base lg:text-[20px] text-foreground break-words">{event.title}</span>
      </div>
      
      <div className="hidden sm:block flex-shrink-0 w-[20%] text-center pt-1">
        {showDate && (
          <div className="text-muted-foreground text-xs whitespace-nowrap mb-0.5">
            {format(parseISO(event.dateStarted), 'MMM d')}
          </div>
        )}
        <div className="text-muted-foreground text-sm lg:text-[16px] whitespace-nowrap">
          {isAllDay ? 'All Day' : `${formatTime12Hour(event.timeStart)} - ${formatTime12Hour(event.timeEnd)}`}
        </div>
      </div>
      
      <div className="hidden sm:flex items-start gap-2 w-[30%] justify-end">
        {event.details && (
          <div className="text-muted-foreground text-xs lg:text-[14px] text-right flex-1 break-words">
            {event.details}
          </div>
        )}
        <div className="flex items-center gap-0.5 flex-shrink-0 mt-1">
          {onEdit && (
            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          )}
          {onDelete && (
            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Schedule Panel Component
function SchedulePanel({ 
  title, date, events, onDeleteEvent, onEditEvent, showDate = false
}: { 
  title: string;
  date: string;
  events: ScheduleEvent[];
  onDeleteEvent?: (id: string) => void;
  onEditEvent?: (event: ScheduleEvent) => void;
  showDate?: boolean;
}) {
  const { settings } = useScheduleStore();
  const transitionSpeed = getTransitionSpeed(settings.transitionSpeed, settings.customTransitionSeconds);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { currentItems, hasOverflow, currentPage, totalPages } = useOverflowTransition(
    events, containerRef, 50, settings
  );

  const isPaginationMode = ['fade', 'slideUp', 'slideLeft'].includes(settings.transitionStyle);
  
  const pageVariants = {
    fade: {
      initial: { opacity: 0 },
      animate: { opacity: 1, transition: { duration: transitionSpeed } },
      exit: { opacity: 0, transition: { duration: transitionSpeed / 2 } },
    },
    slideUp: {
      initial: { opacity: 0, y: 30 },
      animate: { opacity: 1, y: 0, transition: { duration: transitionSpeed } },
      exit: { opacity: 0, y: -30, transition: { duration: transitionSpeed / 2 } },
    },
    slideLeft: {
      initial: { opacity: 0, x: 30 },
      animate: { opacity: 1, x: 0, transition: { duration: transitionSpeed } },
      exit: { opacity: 0, x: -30, transition: { duration: transitionSpeed / 2 } },
    },
    static: {
      initial: { opacity: 1 },
      animate: { opacity: 1 },
      exit: { opacity: 1 },
    },
  };
  
  const currentPageVariant = isPaginationMode && hasOverflow
    ? pageVariants[settings.transitionStyle as 'fade' | 'slideUp' | 'slideLeft']
    : pageVariants.static;

  const renderItems = hasOverflow && isPaginationMode ? currentItems : events;
  const isGentleScroll = settings.transitionStyle === 'gentleContinuousScroll';
  const displayItems = hasOverflow && isGentleScroll ? [...events, ...events] : renderItems;
  
  const contentKey = isGentleScroll 
    ? 'continuous-scroll' 
    : (isPaginationMode && hasOverflow 
      ? `page-${currentPage}-${totalPages}-${currentItems.map(e => e.id).join('-')}` 
      : `all-${events.map(e => e.id).join('-')}`);

  return (
    <div className="bg-card rounded-lg border border-border shadow-sm flex flex-col min-h-0">
      <div className="px-3 py-2 border-b border-border flex-shrink-0">
        <h2 className="text-sm font-bold text-foreground tracking-wide">{title}</h2>
        <p className="text-xs text-muted-foreground">{date}</p>
      </div>
      
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden min-h-0"
        style={{ scrollBehavior: settings.smoothScrollEnabled ? 'smooth' : 'auto' }}
      >
        {events.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-4">
            No events scheduled
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={contentKey}
              variants={currentPageVariant}
              initial="initial"
              animate="animate"
              exit="exit"
              data-content-measure
            >
              {displayItems.map((event) => (
                <EventRow
                  key={event.id}
                  event={event}
                  onDelete={onDeleteEvent ? () => onDeleteEvent(event.id) : undefined}
                  onEdit={onEditEvent ? () => onEditEvent(event) : undefined}
                  transitionStyle={settings.transitionStyle}
                  transitionSpeed={transitionSpeed}
                  showDate={showDate}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
      
      {hasOverflow && isPaginationMode && totalPages > 1 && (
        <div className="px-3 py-1 border-t border-border flex-shrink-0 flex justify-center gap-1">
          {Array.from({ length: totalPages }).map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i === currentPage ? 'bg-primary' : 'bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Personnel Item Component
function PersonnelItemCompact({ 
  item, onDelete, onEdit 
}: { 
  item: PersonnelStatus; 
  onDelete?: () => void;
  onEdit?: () => void;
}) {
  const getStatusColor = (type: string) => {
    switch (type) {
      case 'CTO':
      case 'FL': return 'bg-green-500';
      case 'WFH': return 'bg-blue-500';
      case 'TRAVEL': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusLabel = (type: string) => {
    switch (type) {
      case 'CTO': return 'CTO';
      case 'FL': return 'FL';
      case 'WFH': return 'WFH';
      case 'TRAVEL': return 'TRAVEL';
      default: return type;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className="flex items-center gap-2 py-1.5 px-2 hover:bg-muted/50 rounded group"
    >
      <span className={`px-2 py-0.5 text-xs font-medium text-white rounded ${getStatusColor(item.type)}`}>
        {getStatusLabel(item.type)}
      </span>
      <span className="font-medium text-sm text-foreground flex-1 truncate">{item.name}</span>
      <span className="text-xs text-muted-foreground">
        {format(parseISO(item.dateStart), 'MMM d')}
        {item.dateEnd !== item.dateStart && ` - ${format(parseISO(item.dateEnd), 'MMM d')}`}
      </span>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {onEdit && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onEdit}>
            <Pencil className="h-3 w-3 text-muted-foreground" />
          </Button>
        )}
        {onDelete && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onDelete}>
            <Trash2 className="h-3 w-3 text-destructive" />
          </Button>
        )}
      </div>
    </motion.div>
  );
}

// Personnel Status Panel Component
function PersonnelStatusPanel({ onDeletePersonnel, onEditPersonnel }: { 
  onDeletePersonnel?: (id: string) => void;
  onEditPersonnel?: (personnel: PersonnelStatus) => void;
}) {
  const { personnel, settings } = useScheduleStore();
  const today = new Date();
  
  const activePersonnel = personnel.filter(p => isDateInRange(p.dateStart, p.dateEnd, today));
  const ctoPersonnel = activePersonnel.filter(p => p.type === 'CTO' || p.type === 'FL');
  const wfhPersonnel = activePersonnel.filter(p => p.type === 'WFH');
  const travelPersonnel = activePersonnel.filter(p => p.type === 'TRAVEL');

  return (
    <div className="bg-card rounded-lg border border-border shadow-sm flex flex-col min-h-0">
      <div className="px-3 py-2 border-b border-border flex-shrink-0">
        <h2 className="text-sm font-bold text-foreground tracking-wide">PERSONNEL STATUS</h2>
        <p className="text-xs text-muted-foreground">Active Today</p>
      </div>
      
      <div className="flex-1 overflow-y-auto min-h-0 p-2 space-y-3">
        {ctoPersonnel.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <StatusDot color="#22c55e" size="sm" />
              <span className="text-xs font-semibold text-muted-foreground">CTO / FL</span>
            </div>
            {ctoPersonnel.map((item) => (
              <PersonnelItemCompact
                key={item.id}
                item={item}
                onDelete={onDeletePersonnel ? () => onDeletePersonnel(item.id) : undefined}
                onEdit={onEditPersonnel ? () => onEditPersonnel(item) : undefined}
              />
            ))}
          </div>
        )}
        
        {wfhPersonnel.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <StatusDot color="#3b82f6" size="sm" />
              <span className="text-xs font-semibold text-muted-foreground">WFH</span>
            </div>
            {wfhPersonnel.map((item) => (
              <PersonnelItemCompact
                key={item.id}
                item={item}
                onDelete={onDeletePersonnel ? () => onDeletePersonnel(item.id) : undefined}
                onEdit={onEditPersonnel ? () => onEditPersonnel(item) : undefined}
              />
            ))}
          </div>
        )}
        
        {travelPersonnel.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <StatusDot color="#a855f7" size="sm" />
              <span className="text-xs font-semibold text-muted-foreground">IN TRAVEL</span>
            </div>
            {travelPersonnel.map((item) => (
              <PersonnelItemCompact
                key={item.id}
                item={item}
                onDelete={onDeletePersonnel ? () => onDeletePersonnel(item.id) : undefined}
                onEdit={onEditPersonnel ? () => onEditPersonnel(item) : undefined}
              />
            ))}
          </div>
        )}
        
        {activePersonnel.length === 0 && (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            No personnel status
          </div>
        )}
      </div>
    </div>
  );
}

// Project Item Component
function ProjectItem({ 
  project, onIncrement, onDecrement, onDelete, onEdit 
}: { 
  project: Project;
  onIncrement: () => void;
  onDecrement: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex items-center gap-2 py-2 px-2 hover:bg-muted/50 rounded group"
    >
      <span className="font-medium text-sm text-foreground flex-1 truncate">{project.name}</span>
      
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="h-6 w-6" onClick={onDecrement}>
          <Minus className="h-3 w-3" />
        </Button>
        <span className="w-8 text-center font-bold text-lg">{project.count}</span>
        <Button variant="outline" size="icon" className="h-6 w-6" onClick={onIncrement}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>
      
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {onEdit && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onEdit}>
            <Pencil className="h-3 w-3 text-muted-foreground" />
          </Button>
        )}
        {onDelete && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onDelete}>
            <Trash2 className="h-3 w-3 text-destructive" />
          </Button>
        )}
      </div>
    </motion.div>
  );
}

// Project Request Panel Component
function ProjectRequestPanel({ onDeleteProject, onEditProject }: { 
  onDeleteProject?: (id: string) => void;
  onEditProject?: (project: Project) => void;
}) {
  const { projects, incrementProjectCount, decrementProjectCount } = useScheduleStore();

  return (
    <div className="bg-card rounded-lg border border-border shadow-sm flex flex-col min-h-0">
      <div className="px-3 py-2 border-b border-border flex-shrink-0">
        <h2 className="text-sm font-bold text-foreground tracking-wide">PROJECT REQUESTS</h2>
        <p className="text-xs text-muted-foreground">Track project requests</p>
      </div>
      
      <div className="flex-1 overflow-y-auto min-h-0">
        {projects.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-4">
            No projects
          </div>
        ) : (
          <AnimatePresence>
            {projects.map((project) => (
              <ProjectItem
                key={project.id}
                project={project}
                onIncrement={() => incrementProjectCount(project.id)}
                onDecrement={() => decrementProjectCount(project.id)}
                onDelete={onDeleteProject ? () => onDeleteProject(project.id) : undefined}
                onEdit={onEditProject ? () => onEditProject(project) : undefined}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
// Edit Event Modal
function EditEventModal({ 
  open, onClose, event 
}: { 
  open: boolean; 
  onClose: () => void; 
  event: ScheduleEvent | null;
}) {
  const { updateEvent } = useScheduleStore();
  const [title, setTitle] = useState('');
  const [dateStarted, setDateStarted] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [timeStart, setTimeStart] = useState('');
  const [timeEnd, setTimeEnd] = useState('');
  const [details, setDetails] = useState('');

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDateStarted(event.dateStarted);
      setDateEnd(event.dateEnd);
      setTimeStart(event.timeStart);
      setTimeEnd(event.timeEnd);
      setDetails(event.details || '');
    }
  }, [event]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!event || !title || !dateStarted || !timeStart || !timeEnd) return;
    
    updateEvent({
      ...event,
      title,
      dateStarted,
      dateEnd: dateEnd || dateStarted,
      timeStart,
      timeEnd,
      details
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Event</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Event Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateStarted">Start Date</Label>
              <Input id="dateStarted" type="date" value={dateStarted} onChange={(e) => setDateStarted(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateEnd">End Date</Label>
              <Input id="dateEnd" type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="timeStart">Start Time</Label>
              <Input id="timeStart" type="time" value={timeStart} onChange={(e) => setTimeStart(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timeEnd">End Time</Label>
              <Input id="timeEnd" type="time" value={timeEnd} onChange={(e) => setTimeEnd(e.target.value)} required />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="details">Details (Optional)</Label>
            <Input id="details" value={details} onChange={(e) => setDetails(e.target.value)} />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Add Event Modal
function AddEventModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addEvent } = useScheduleStore();
  const [title, setTitle] = useState('');
  const [dateStarted, setDateStarted] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dateEnd, setDateEnd] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [timeStart, setTimeStart] = useState('09:00');
  const [timeEnd, setTimeEnd] = useState('10:00');
  const [details, setDetails] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !dateStarted || !timeStart || !timeEnd) return;
    
    addEvent({
      id: Date.now().toString(),
      title,
      dateStarted,
      dateEnd: dateEnd || dateStarted,
      timeStart,
      timeEnd,
      details
    });
    
    setTitle('');
    setDetails('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Event</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Event Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter event title" required />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateStarted">Start Date</Label>
              <Input id="dateStarted" type="date" value={dateStarted} onChange={(e) => setDateStarted(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateEnd">End Date</Label>
              <Input id="dateEnd" type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="timeStart">Start Time</Label>
              <Input id="timeStart" type="time" value={timeStart} onChange={(e) => setTimeStart(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timeEnd">End Time</Label>
              <Input id="timeEnd" type="time" value={timeEnd} onChange={(e) => setTimeEnd(e.target.value)} required />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="details">Details (Optional)</Label>
            <Input id="details" value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Additional details" />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Add Event</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Add Personnel Modal
function AddPersonnelModal({ open, onClose, type }: { open: boolean; onClose: () => void; type: string }) {
  const { addPersonnelStatus } = useScheduleStore();
  const [name, setName] = useState('');
  const [dateStart, setDateStart] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dateEnd, setDateEnd] = useState(format(new Date(), 'yyyy-MM-dd'));

  const getTypeLabel = () => {
    switch (type) {
      case 'CTO': return 'CTO / FL';
      case 'WFH': return 'WFH';
      case 'TRAVEL': return 'In Travel';
      default: return type;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !dateStart) return;
    
    addPersonnelStatus({
      id: Date.now().toString(),
      name,
      type: type as 'CTO' | 'FL' | 'WFH' | 'TRAVEL',
      dateStart,
      dateEnd: dateEnd || dateStart
    });
    
    setName('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add {getTypeLabel()}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter name" required />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateStart">Start Date</Label>
              <Input id="dateStart" type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateEnd">End Date</Label>
              <Input id="dateEnd" type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Add</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Add Project Modal
function AddProjectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addProject } = useScheduleStore();
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    
    addProject({
      id: Date.now().toString(),
      name,
      count: 0
    });
    
    setName('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Project Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter project name" required />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Add Project</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Edit Personnel Modal
function EditPersonnelModal({ open, onClose, personnel }: { open: boolean; onClose: () => void; personnel: PersonnelStatus | null }) {
  const { updatePersonnelStatus } = useScheduleStore();
  const [name, setName] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');

  useEffect(() => {
    if (personnel) {
      setName(personnel.name);
      setDateStart(personnel.dateStart);
      setDateEnd(personnel.dateEnd);
    }
  }, [personnel]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!personnel || !name || !dateStart) return;
    
    updatePersonnelStatus({
      ...personnel,
      name,
      dateStart,
      dateEnd: dateEnd || dateStart
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Personnel</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateStart">Start Date</Label>
              <Input id="dateStart" type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateEnd">End Date</Label>
              <Input id="dateEnd" type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Edit Project Modal
function EditProjectModal({ open, onClose, project }: { open: boolean; onClose: () => void; project: Project | null }) {
  const { updateProject } = useScheduleStore();
  const [name, setName] = useState('');

  useEffect(() => {
    if (project) {
      setName(project.name);
    }
  }, [project]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !name) return;
    
    updateProject({
      ...project,
      name
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Project Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
// Settings Modal
function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings, updateSettings, resetSettings } = useScheduleStore();
  const [localSettings, setLocalSettings] = useState(settings);
  const [showPassword, setShowPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings, open]);

  const handleSave = () => {
    updateSettings(localSettings);
    onClose();
  };

  const handleReset = () => {
    resetSettings();
    setLocalSettings({
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
      statusColors: {
        upcoming: '#3b82f6',
        ongoing: '#22c55e',
        completed: '#6b7280'
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Theme Settings */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Theme</h3>
            <div className="flex items-center gap-4">
              <Select 
                value={localSettings.theme} 
                onValueChange={(value) => setLocalSettings({ ...localSettings, theme: value as 'light' | 'dark' | 'system' })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* PIN Protection */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">PIN Protection</h3>
            <div className="flex items-center justify-between">
              <Label htmlFor="pin-enabled">Enable PIN</Label>
              <Switch 
                id="pin-enabled"
                checked={localSettings.pinEnabled} 
                onCheckedChange={(checked) => setLocalSettings({ ...localSettings, pinEnabled: checked })} 
              />
            </div>
            {localSettings.pinEnabled && (
              <div className="space-y-2">
                <Label htmlFor="pin">4-Digit PIN</Label>
                <div className="relative">
                  <Input 
                    id="pin" 
                    type={showPin ? "text" : "password"}
                    value={localSettings.pin || ''} 
                    onChange={(e) => setLocalSettings({ ...localSettings, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                    placeholder="Enter 4-digit PIN"
                    maxLength={4}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowPin(!showPin)}
                  >
                    {showPin ? <X className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Password Protection */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Password Protection</h3>
            <div className="flex items-center justify-between">
              <Label htmlFor="password-enabled">Enable Password</Label>
              <Switch 
                id="password-enabled"
                checked={localSettings.passwordEnabled} 
                onCheckedChange={(checked) => setLocalSettings({ ...localSettings, passwordEnabled: checked })} 
              />
            </div>
            {localSettings.passwordEnabled && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input 
                      id="password" 
                      type={showPassword ? "text" : "password"}
                      value={localSettings.password || ''} 
                      onChange={(e) => setLocalSettings({ ...localSettings, password: e.target.value })}
                      placeholder="Enter password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <X className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-hint">Password Hint</Label>
                  <Input 
                    id="password-hint" 
                    value={localSettings.passwordHint || ''} 
                    onChange={(e) => setLocalSettings({ ...localSettings, passwordHint: e.target.value })}
                    placeholder="Enter a hint"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recovery-email">Recovery Email</Label>
                  <Input 
                    id="recovery-email" 
                    type="email"
                    value={localSettings.recoveryEmail || ''} 
                    onChange={(e) => setLocalSettings({ ...localSettings, recoveryEmail: e.target.value })}
                    placeholder="Enter recovery email"
                  />
                </div>
              </>
            )}
          </div>

          <Separator />

          {/* Transition Settings */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Transition Effects</h3>
            <div className="space-y-2">
              <Label htmlFor="transition-style">Transition Style</Label>
              <Select 
                value={localSettings.transitionStyle} 
                onValueChange={(value) => setLocalSettings({ ...localSettings, transitionStyle: value as TransitionStyle })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="static">Static</SelectItem>
                  <SelectItem value="fade">Fade</SelectItem>
                  <SelectItem value="slideUp">Slide Up</SelectItem>
                  <SelectItem value="slideLeft">Slide Left</SelectItem>
                  <SelectItem value="verticalAutoScroll">Vertical Auto Scroll</SelectItem>
                  <SelectItem value="gentleContinuousScroll">Gentle Continuous Scroll</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="transition-speed">Transition Speed</Label>
              <Select 
                value={localSettings.transitionSpeed} 
               onValueChange={(value) => 
  updateSettings({ transitionSpeed: value as TransitionSpeed })
}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="verySlow">Very Slow</SelectItem>
                  <SelectItem value="slow">Slow</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="fast">Fast</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {localSettings.transitionSpeed === 'custom' && (
              <div className="space-y-2">
                <Label htmlFor="custom-seconds">Custom Speed (seconds)</Label>
                <Input 
                  id="custom-seconds" 
                  type="number"
                  min={0.5}
                  max={10}
                  step={0.5}
                  value={localSettings.customTransitionSeconds} 
                  onChange={(e) => setLocalSettings({ ...localSettings, customTransitionSeconds: parseFloat(e.target.value) || 3 })}
                />
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <Label htmlFor="smooth-scroll">Smooth Scroll</Label>
              <Switch 
                id="smooth-scroll"
                checked={localSettings.smoothScrollEnabled} 
                onCheckedChange={(checked) => setLocalSettings({ ...localSettings, smoothScrollEnabled: checked })} 
              />
            </div>
          </div>

          <Separator />

          {/* Status Colors */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Status Colors</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="upcoming-color">Upcoming</Label>
                <Input 
                  id="upcoming-color" 
                  type="color"
                  value={localSettings.statusColors?.upcoming || '#3b82f6'} 
                  onChange={(e) => setLocalSettings({ 
                    ...localSettings, 
                    statusColors: { ...localSettings.statusColors, upcoming: e.target.value }
                  })}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ongoing-color">Ongoing</Label>
                <Input 
                  id="ongoing-color" 
                  type="color"
                  value={localSettings.statusColors?.ongoing || '#22c55e'} 
                  onChange={(e) => setLocalSettings({ 
                    ...localSettings, 
                    statusColors: { ...localSettings.statusColors, ongoing: e.target.value }
                  })}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="completed-color">Completed</Label>
                <Input 
                  id="completed-color" 
                  type="color"
                  value={localSettings.statusColors?.completed || '#6b7280'} 
                  onChange={(e) => setLocalSettings({ 
                    ...localSettings, 
                    statusColors: { ...localSettings.statusColors, completed: e.target.value }
                  })}
                  className="h-10"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button type="button" variant="outline" onClick={handleReset}>Reset</Button>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Week View Component
function WeekView({ events, onDeleteEvent, onEditEvent, weekStart }: { 
  events: ScheduleEvent[]; 
  onDeleteEvent?: (id: string) => void;
  onEditEvent?: (event: ScheduleEvent) => void;
  weekStart: Date;
}) {
  const { settings } = useScheduleStore();
  const transitionSpeed = getTransitionSpeed(settings.transitionSpeed, settings.customTransitionSeconds);
  
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="text-center mb-2">
        <h2 className="text-lg font-bold text-foreground">
          {format(weekStart, 'MMMM d')} - {format(addDays(weekStart, 6), 'MMMM d, yyyy')}
        </h2>
      </div>
      
      <div className="flex-1 grid grid-cols-7 gap-1 min-h-0">
        {days.map((day) => {
          const dayEvents = events.filter(e => format(parseISO(e.dateStarted), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd'));
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
          
          return (
            <div key={day.toISOString()} className={`flex flex-col min-h-0 rounded border ${isWeekend ? 'bg-muted/30' : 'bg-card'}`}>
              <div className={`p-2 text-center border-b ${isToday(day) ? 'bg-primary text-primary-foreground' : ''}`}>
                <div className="text-xs font-medium">{format(day, 'EEE')}</div>
                <div className="text-lg font-bold">{format(day, 'd')}</div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-1 space-y-1 min-h-0">
                {dayEvents.map((event) => (
                  <WeekEventRow
                    key={event.id}
                    event={event}
                    onDelete={onDeleteEvent ? () => onDeleteEvent(event.id) : undefined}
                    onEdit={onEditEvent ? () => onEditEvent(event) : undefined}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Week Event Row
function WeekEventRow({ event, onDelete, onEdit }: { event: ScheduleEvent; onDelete?: () => void; onEdit?: () => void }) {
  const { settings } = useScheduleStore();
  const status = getEventStatus(event);
  const statusColor = settings.statusColors[status];

  return (
    <div className="group relative p-1 rounded text-xs bg-muted/50 hover:bg-muted">
      <div className="flex items-center gap-1">
        <StatusDot color={statusColor} size="sm" />
        <span className="font-medium truncate flex-1">{event.title}</span>
      </div>
      <div className="text-muted-foreground">
        {formatTime12Hour(event.timeStart)}
      </div>
      <div className="absolute right-1 top-1 hidden group-hover:flex gap-0.5">
        {onEdit && (
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onEdit}>
            <Pencil className="h-2.5 w-2.5" />
          </Button>
        )}
        {onDelete && (
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onDelete}>
            <Trash2 className="h-2.5 w-2.5 text-destructive" />
          </Button>
        )}
      </div>
    </div>
  );
}

// Month View Component
function MonthView({ events, onDeleteEvent, onEditEvent, monthStart }: { 
  events: ScheduleEvent[]; 
  onDeleteEvent?: (id: string) => void;
  onEditEvent?: (event: ScheduleEvent) => void;
  monthStart: Date;
}) {
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  
  const days: Date[] = [];
  let day = startDate;
  while (day <= endDate) {
    days.push(day);
    day = addDays(day, 1);
  }
  
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="text-center mb-2">
        <h2 className="text-lg font-bold text-foreground">
          {format(monthStart, 'MMMM yyyy')}
        </h2>
      </div>
      
      <div className="flex-1 flex flex-col min-h-0">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
              {d}
            </div>
          ))}
        </div>
        
        {/* Weeks */}
        <div className="flex-1 grid grid-rows-6 gap-1 min-h-0">
          {weeks.map((week, weekIdx) => (
            <div key={weekIdx} className="grid grid-cols-7 gap-1">
              {week.map((day) => {
                const dayEvents = events.filter(e => format(parseISO(e.dateStarted), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd'));
                const isCurrentMonth = format(day, 'M') === format(monthStart, 'M');
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                
                return (
                  <div 
                    key={day.toISOString()} 
                    className={`flex flex-col rounded border p-1 min-h-0 ${
                      !isCurrentMonth ? 'bg-muted/20 opacity-50' : isWeekend ? 'bg-muted/30' : 'bg-card'
                    } ${isToday(day) ? 'ring-2 ring-primary' : ''}`}
                  >
                    <div className={`text-xs font-medium mb-1 ${isToday(day) ? 'text-primary font-bold' : ''}`}>
                      {format(day, 'd')}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      {dayEvents.slice(0, 3).map((event) => (
                        <MonthEventRow key={event.id} event={event} />
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-muted-foreground">+{dayEvents.length - 3} more</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


// Month Event Row (very compact)
function MonthEventRow({ event, onDelete, onEdit }: { event: ScheduleEvent; onDelete?: () => void; onEdit?: () => void }) {
  const { settings } = useScheduleStore();
  const status = getEventStatus(event);
  const statusColor = settings.statusColors[status];

  return (
    <motion.div 
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex items-center gap-0.5 py-0.5 px-1 hover:bg-muted/50 rounded group transition-colors cursor-pointer"
      title={`${event.title} - ${formatTime12Hour(event.timeStart)}`}
    >
      <StatusDot color={statusColor} size="sm" />
      <span className="text-xs text-foreground truncate flex-1">{event.title}</span>
      {onEdit && (
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
        >
          <Pencil className="h-2 w-2 text-muted-foreground" />
        </Button>
      )}
    </motion.div>
  );
}

// Main Page Component
export default function EUSTDDSchedule() {
  const { events, settings, deleteEvent, deletePersonnelStatus, deleteProject, _hasHydrated, loadFromServer, startAutoSync, stopAutoSync } = useScheduleStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [modalType, setModalType] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
  
  // Edit state
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);
  const [editingPersonnel, setEditingPersonnel] = useState<PersonnelStatus | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  
  // Session-based PIN protection
  const [isSessionUnlocked, setIsSessionUnlocked] = useState(false);
  const [sessionPinDialogOpen, setSessionPinDialogOpen] = useState(false);

  // Notification state
  const [activeNotifications, setActiveNotifications] = useState<EventNotification[]>([]);
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(new Set());
  const previousNotificationIdsRef = useRef<Set<string>>(new Set());

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayEvents = events.filter((e) => isToday(parseISO(e.dateStarted)));
  const tomorrowEvents = events.filter((e) => isTomorrow(parseISO(e.dateStarted)));

  const todayEventsKey = todayEvents.map(e => e.id).join(',');
  const dismissedKey = [...dismissedNotifications].join(',');

  useEffect(() => {
    loadFromServer();
    startAutoSync();
    return () => stopAutoSync();
  }, [loadFromServer, startAutoSync, stopAutoSync]);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (typeof window === 'undefined') return;
    const requiresPassword = settings.passwordEnabled && settings.password;
    if (requiresPassword) {
      const sessionAuth = sessionStorage.getItem('eustdd-session-auth');
      queueMicrotask(() => {
        if (sessionAuth === 'unlocked') {
          setIsSessionUnlocked(true);
        } else {
          setSessionPinDialogOpen(true);
        }
      });
    } else {
      queueMicrotask(() => setIsSessionUnlocked(true));
    }
  }, [_hasHydrated, settings.passwordEnabled, settings.password]);

  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  useEffect(() => {
    if (!_hasHydrated) return;
    const checkNotifications = () => {
      const upcoming = getUpcomingEvents(todayEvents, 5);
      const newNotifications = upcoming.filter(n => !dismissedNotifications.has(n.event.id));
      const newIds = new Set(newNotifications.map(n => n.event.id));
      const hasNewNotifications = [...newIds].some(id => !previousNotificationIdsRef.current.has(id));
      
      if (hasNewNotifications && newNotifications.length > 0) {
        try {
          if (typeof window !== 'undefined') {
            const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            if (AudioContextClass) {
              const audioContext = new AudioContextClass();
              const playTone = (frequency: number, startTime: number, duration: number, volume: number = 0.3) => {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                oscillator.frequency.value = frequency;
                oscillator.type = 'sine';
                gainNode.gain.setValueAtTime(0, startTime);
                gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01);
                gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
                oscillator.start(startTime);
                oscillator.stop(startTime + duration);
              };
              const now = audioContext.currentTime;
              playTone(523.25, now, 0.15, 0.25);
              playTone(659.25, now + 0.15, 0.15, 0.25);
              playTone(783.99, now + 0.3, 0.3, 0.25);
            }
          }
        } catch {
          console.log('Audio not supported');
        }
      }
      previousNotificationIdsRef.current = newIds;
      setActiveNotifications(newNotifications);
    };
    checkNotifications();
    const interval = setInterval(checkNotifications, 10000);
    return () => clearInterval(interval);
  }, [todayEventsKey, dismissedKey, _hasHydrated]);

  const dismissNotification = (eventId: string) => {
    setDismissedNotifications(prev => new Set([...prev, eventId]));
    setActiveNotifications(prev => prev.filter(n => n.event.id !== eventId));
  };

  const handleSessionPinSuccess = () => {
    sessionStorage.setItem('eustdd-session-auth', 'unlocked');
    setIsSessionUnlocked(true);
    setSessionPinDialogOpen(false);
  };

  if (!_hasHydrated) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isSessionUnlocked) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Lock className="h-16 w-16 mx-auto text-muted-foreground" />
          <h1 className="text-2xl font-bold text-foreground">EUSTDD SCHEDULE</h1>
          <p className="text-muted-foreground">Enter PIN to access</p>
        </div>
        <PinDialog 
          open={sessionPinDialogOpen}
          onClose={() => setSessionPinDialogOpen(true)}
          onSuccess={handleSessionPinSuccess}
          title="Enter PIN to Unlock"
        />
      </div>
    );
  }

  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const monthStart = startOfMonth(today);

  const handleAddEntry = (type: string) => setModalType(type);
  const closeModal = () => setModalType(null);

  const renderMainContent = () => {
    if (viewMode === 'day') {
      return (
        <main className="flex-1 p-1 sm:p-2 grid grid-cols-1 lg:grid-cols-2 grid-rows-[auto_auto_auto_auto] lg:grid-rows-2 gap-1 sm:gap-2 max-w-[1920px] mx-auto w-full min-h-0 overflow-hidden">
          <SchedulePanel title="TODAY'S SCHEDULE" date={format(today, 'EEEE, MMMM d, yyyy')} events={todayEvents} onDeleteEvent={deleteEvent} onEditEvent={setEditingEvent} />
          <SchedulePanel title="TOMORROW'S SCHEDULE" date={format(tomorrow, 'EEEE, MMMM d, yyyy')} events={tomorrowEvents} onDeleteEvent={deleteEvent} onEditEvent={setEditingEvent} />
          <PersonnelStatusPanel onDeletePersonnel={deletePersonnelStatus} onEditPersonnel={setEditingPersonnel} />
          <ProjectRequestPanel onDeleteProject={deleteProject} onEditProject={setEditingProject} />
        </main>
      );
    } else if (viewMode === 'week') {
      return (
        <main className="flex-1 p-1 sm:p-2 flex flex-col min-h-0 max-w-[1920px] mx-auto w-full overflow-hidden">
          <WeekView events={events} onDeleteEvent={deleteEvent} onEditEvent={setEditingEvent} weekStart={weekStart} />
        </main>
      );
    } else {
      return (
        <main className="flex-1 p-1 sm:p-2 flex flex-col min-h-0 max-w-[1920px] mx-auto w-full overflow-hidden">
          <MonthView events={events} onDeleteEvent={deleteEvent} onEditEvent={setEditingEvent} monthStart={monthStart} />
        </main>
      );
    }
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <Header onOpenSettings={() => setSettingsOpen(true)} onAddEntry={handleAddEntry} viewMode={viewMode} onViewModeChange={setViewMode} />
      {renderMainContent()}
      <AnimatePresence>
        {activeNotifications.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -100, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -100, scale: 0.9 }} className="fixed top-16 sm:top-20 left-1/2 -translate-x-1/2 z-50 px-2 w-full max-w-[400px]">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg sm:rounded-xl shadow-2xl p-3 sm:p-4">
              <div className="flex items-start gap-2 sm:gap-3">
                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 0.5 }}>
                  <BellRing className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
                </motion.div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-sm sm:text-lg">Event Starting Soon!</p>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-white/80 hover:text-white hover:bg-white/20" onClick={() => dismissNotification(activeNotifications[0].event.id)}>
                      <X className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                  <p className="font-semibold text-white/90 truncate text-sm sm:text-base">{activeNotifications[0].event.title}</p>
                  <div className="flex items-center gap-1 sm:gap-2 mt-1 text-xs sm:text-sm">
                    <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-white/70" />
                    <span className="text-white/80">Starts in <span className="font-bold text-white">{activeNotifications[0].minutesUntil} min</span></span>
                    <span className="text-white/70">• {formatTime12Hour(activeNotifications[0].event.timeStart)}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <AddEventModal open={modalType === 'event'} onClose={closeModal} />
      <AddPersonnelModal open={modalType === 'cto'} onClose={closeModal} type="CTO" />
      <AddPersonnelModal open={modalType === 'wfh'} onClose={closeModal} type="WFH" />
      <AddPersonnelModal open={modalType === 'travel'} onClose={closeModal} type="TRAVEL" />
      <AddProjectModal open={modalType === 'project'} onClose={closeModal} />
      <EditEventModal open={!!editingEvent} onClose={() => setEditingEvent(null)} event={editingEvent} />
      <EditPersonnelModal open={!!editingPersonnel} onClose={() => setEditingPersonnel(null)} personnel={editingPersonnel} />
      <EditProjectModal open={!!editingProject} onClose={() => setEditingProject(null)} project={editingProject} />
    </div>
  );
}