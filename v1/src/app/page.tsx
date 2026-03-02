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
import type { ScheduleEvent, PersonnelStatus, Project, EventStatus, TransitionStyle } from '@/types/schedule';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
    // Only check today's events
    if (!isToday(parseISO(event.dateStarted))) continue;
    
    // Parse event start time
    const [hours, minutes] = event.timeStart.split(':').map(Number);
    const eventStartTime = new Date(now);
    eventStartTime.setHours(hours, minutes, 0, 0);
    
    const diffMinutes = differenceInMinutes(eventStartTime, now);
    
    // Check if event is starting within the specified minutes and hasn't started yet
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

// Get page display duration based on transition speed (for pagination modes)
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

// Get scroll speed for continuous scroll modes (pixels per second)
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
  itemHeight: number = 32, // Approximate height per item in pixels
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

  // Check for overflow and calculate items per page
  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current) {
        const containerHeight = containerRef.current.clientHeight;
        const calculatedItemsPerPage = Math.floor(containerHeight / itemHeight);
        setItemsPerPage(Math.max(1, calculatedItemsPerPage));
        
        // Measure actual content height instead of estimating
        const contentElement = containerRef.current.querySelector('[data-content-measure]');
        if (contentElement) {
          const actualContentHeight = contentElement.scrollHeight;
          setHasOverflow(actualContentHeight > containerHeight);
        } else {
          // Fallback to estimation if content element not found
          const availableHeight = containerHeight - 12;
          const totalItemHeight = items.length * itemHeight;
          setHasOverflow(totalItemHeight > availableHeight);
        }
      }
    };

    // Use requestAnimationFrame for initial check to ensure DOM is ready
    const rafId = requestAnimationFrame(() => {
      checkOverflow();
    });
    
    // Use ResizeObserver for more reliable container size detection
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        // Small delay to ensure container dimensions are updated
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

  // Calculate total pages
  const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage));

  // Get current page items
  const currentItems = hasOverflow && 
    (settings.transitionStyle === 'fade' || settings.transitionStyle === 'slideUp' || settings.transitionStyle === 'slideLeft')
    ? items.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage)
    : items;

  // Cleanup function for all animations
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

  // Reset scroll and page when transition style changes
  useEffect(() => {
    cleanupAnimations();
    scrollPositionRef.current = 0;
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
    // Use microtask to avoid synchronous setState warning
    queueMicrotask(() => setCurrentPage(0));
  }, [settings.transitionStyle, cleanupAnimations, containerRef]);

  // Pagination for fade/slideUp/slideLeft
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

  // Continuous scroll for verticalAutoScroll and gentleContinuousScroll
  useEffect(() => {
    if (!hasOverflow) return;
    if (settings.transitionStyle !== 'verticalAutoScroll' && settings.transitionStyle !== 'gentleContinuousScroll') return;
    if (!containerRef.current) return;

    cleanupAnimations();
    
    const container = containerRef.current;
    const scrollSpeed = getScrollSpeed(settings.transitionSpeed);
    
    if (settings.transitionStyle === 'gentleContinuousScroll') {
      // Smooth continuous scroll with seamless loop
      isAnimatingRef.current = true;
      lastTimeRef.current = 0;
      
      // Get the height of one set of items (half of the duplicated content)
      const singleSetHeight = container.scrollHeight / 2;
      
      const animate = (timestamp: number) => {
        if (!isAnimatingRef.current) return;
        
        if (!lastTimeRef.current) {
          lastTimeRef.current = timestamp;
        }
        const delta = timestamp - lastTimeRef.current;
        lastTimeRef.current = timestamp;

        scrollPositionRef.current += (scrollSpeed * delta) / 1000;
        
        // When reaching the end of the first set, seamlessly reset to beginning
        // This creates an infinite loop effect
        if (scrollPositionRef.current >= singleSetHeight) {
          scrollPositionRef.current = scrollPositionRef.current - singleSetHeight;
        }
        
        container.scrollTop = scrollPositionRef.current;
        animationRef.current = requestAnimationFrame(animate);
      };

      animationRef.current = requestAnimationFrame(animate);
      
      return () => cleanupAnimations();
    } else if (settings.transitionStyle === 'verticalAutoScroll') {
      // Step-based auto scroll with pause
      const stepSize = itemHeight * 2; // Scroll 2 items at a time
      const pauseDuration = 2000; // 2 second pause
      isAnimatingRef.current = true;
      
      intervalRef.current = setInterval(() => {
        if (!isAnimatingRef.current || !containerRef.current) return;
        
        const currentContainer = containerRef.current;
        const maxScroll = currentContainer.scrollHeight - currentContainer.clientHeight;
        scrollPositionRef.current += stepSize;
        
        if (scrollPositionRef.current >= maxScroll) {
          // Pause at bottom, then reset to top
          const timeoutId = setTimeout(() => {
            if (!isAnimatingRef.current) return;
            scrollPositionRef.current = 0;
            if (containerRef.current) {
              containerRef.current.scrollTop = 0;
            }
          }, pauseDuration / 2);
          
          // Store timeout for cleanup
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

  // Reset scroll position when items change
  useEffect(() => {
    cleanupAnimations();
    scrollPositionRef.current = 0;
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
    // Use microtask to avoid synchronous setState warning
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

// PIN Entry Dialog
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
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const { settings } = useScheduleStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === settings.pin) {
      setPin('');
      setError('');
      onSuccess();
      onClose();
    } else {
      setError('Incorrect PIN');
      setPin('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive text-center">{error}</p>}
          <Input 
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="Enter 4-digit PIN"
            className="text-center text-2xl tracking-[1em]"
            autoFocus
          />
          <DialogFooter className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1" disabled={pin.length !== 4}>Unlock</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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

  // Check if session is already unlocked
  const isSessionUnlocked = () => {
    return sessionStorage.getItem('eustdd-session-auth') === 'unlocked';
  };

  const handleProtectedAction = (action: () => void, type: 'settings' | 'add', addType?: string) => {
    // If PIN is required but session is already unlocked, proceed directly
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

  const handlePinSuccess = () => {
    // Mark session as unlocked
    sessionStorage.setItem('eustdd-session-auth', 'unlocked');
    
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
          {/* Title Row */}
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold tracking-wide text-foreground">
              EUSTDD SCHEDULE
            </h1>
            <div className="flex items-center gap-1">
              {/* View Mode Dropdown - Mobile */}
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
              
              {/* Add Entry Button - Mobile */}
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
              
              {/* Settings Button - Mobile */}
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => handleProtectedAction(onOpenSettings, 'settings')}>
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>
          
          {/* Date & Time Row - Mobile */}
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
          {/* Title - Left Side */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl lg:text-[30px] font-bold tracking-wide text-foreground">
              EUSTDD SCHEDULE
            </h1>
          </div>
          
          {/* Date & Time - Center */}
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
          
          {/* Right Side Controls */}
          <div className="flex-1 flex justify-end items-center gap-1 lg:gap-2">
            {/* View Mode Dropdown */}
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
            
            {/* Add Entry Button */}
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
            
            {/* Settings Button */}
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
        onSuccess={handlePinSuccess}
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
      {/* Mobile Layout: Single column with status dot, title, and time */}
      <div className="flex items-start gap-2 flex-1 min-w-0 sm:hidden">
        <StatusDot color={statusColor} size="sm" className="mt-1.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <span className="font-medium text-sm text-foreground break-words flex-1">{event.title}</span>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              {onEdit && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={onEdit}
                >
                  <Pencil className="h-3 w-3 text-muted-foreground" />
                </Button>
              )}
              {onDelete && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={onDelete}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
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
      
      {/* Desktop Layout: Three columns */}
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
          {isAllDay 
            ? 'All Day' 
            : `${formatTime12Hour(event.timeStart)} - ${formatTime12Hour(event.timeEnd)}`
          }
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
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={onEdit}
            >
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          )}
          {onDelete && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={onDelete}
            >
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
  title, 
  date, 
  events,
  onDeleteEvent,
  onEditEvent,
  showDate = false
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
  
  // Use overflow transition hook (item height: 20px font * 2 lines + padding = ~50px per item)
  const { currentItems, hasOverflow, currentPage, totalPages } = useOverflowTransition(
    events,
    containerRef,
    50,
    settings
  );

  // Determine if we should show paginated or scrolled content
  const isPaginationMode = ['fade', 'slideUp', 'slideLeft'].includes(settings.transitionStyle);
  
  // Page transition variants
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

  // Content to render
  const renderItems = hasOverflow && isPaginationMode ? currentItems : events;
  
  // For gentle continuous scroll, duplicate items for seamless loop
  const isGentleScroll = settings.transitionStyle === 'gentleContinuousScroll';
  const displayItems = hasOverflow && isGentleScroll ? [...events, ...events] : renderItems;
  
  // Use a stable key that changes when page content changes
  // For continuous scroll modes, use a stable key to prevent re-renders
  const contentKey = isGentleScroll 
    ? 'continuous-scroll' 
    : (isPaginationMode && hasOverflow 
      ? `page-${currentPage}-${totalPages}-${currentItems.map(e => e.id).join('-')}` 
      : `all-${events.map(e => e.id).join('-')}`);
  
  // For gentle continuous scroll, don't use AnimatePresence to avoid interrupting the scroll
  const shouldUseAnimatePresence = !isGentleScroll;
  
  return (
    <div className="bg-card border border-border rounded-lg h-full flex flex-col overflow-hidden">
      <div className="px-2 py-1 border-b border-border bg-muted/30 flex items-center justify-between">
        <h2 className="text-base sm:text-lg lg:text-[24px] font-bold text-foreground tracking-wide">{title}</h2>
        <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">{date}</p>
      </div>
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto p-1 sm:p-1.5 scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {events.length === 0 ? (
          <div className="flex items-center justify-center h-16 text-muted-foreground text-sm sm:text-lg">
            —
          </div>
        ) : shouldUseAnimatePresence ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={contentKey}
              initial={currentPageVariant.initial}
              animate={currentPageVariant.animate}
              exit={currentPageVariant.exit}
              className="space-y-0.5"
              data-content-measure
            >
              {displayItems.map((event, index) => (
                <EventRow 
                  key={`${event.id}-${index}`} 
                  event={event} 
                  onDelete={onDeleteEvent ? () => onDeleteEvent(event.id) : undefined}
                  onEdit={onEditEvent ? () => onEditEvent(event) : undefined}
                  transitionStyle="static"
                  transitionSpeed={transitionSpeed}
                  showDate={showDate}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="space-y-0.5" data-content-measure>
            {displayItems.map((event, index) => (
              <EventRow 
                key={`${event.id}-${index}`} 
                event={event} 
                onDelete={onDeleteEvent ? () => onDeleteEvent(event.id) : undefined}
                onEdit={onEditEvent ? () => onEditEvent(event) : undefined}
                transitionStyle="static"
                transitionSpeed={transitionSpeed}
                showDate={showDate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Personnel Status Panel - 3 Column Layout (stacked on mobile)
function PersonnelStatusPanel({ onDeletePersonnel, onEditPersonnel }: { 
  onDeletePersonnel: (id: string) => void;
  onEditPersonnel: (personnel: PersonnelStatus) => void;
}) {
  const { personnelStatuses, settings } = useScheduleStore();
  const today = new Date();
  
  const wfhPersonnel = personnelStatuses.filter(
    (p) => p.type === 'WFH' && isDateInRange(p.dateStart, p.dateEnd, today)
  );
  
  const ctoflPersonnel = personnelStatuses.filter(
    (p) => (p.type === 'CTO' || p.type === 'FL') && isDateInRange(p.dateStart, p.dateEnd, today)
  );
  
  const travelPersonnel = personnelStatuses.filter(
    (p) => p.type === 'TRAVEL' && isDateInRange(p.dateStart, p.dateEnd, today)
  );

  return (
    <div className="bg-card border border-border rounded-lg h-full flex flex-col overflow-hidden">
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border overflow-hidden">
        {/* CTO/FL Column */}
        <PersonnelColumn 
          title="CTO/FL" 
          personnel={ctoflPersonnel} 
          settings={settings}
          onDeletePersonnel={onDeletePersonnel}
          onEditPersonnel={onEditPersonnel}
        />
        
        {/* WFH Column */}
        <PersonnelColumn 
          title="WFH" 
          personnel={wfhPersonnel} 
          settings={settings}
          onDeletePersonnel={onDeletePersonnel}
          onEditPersonnel={onEditPersonnel}
        />
        
        {/* IN TRAVEL Column */}
        <PersonnelColumn 
          title="IN TRAVEL" 
          personnel={travelPersonnel} 
          settings={settings}
          onDeletePersonnel={onDeletePersonnel}
          onEditPersonnel={onEditPersonnel}
        />
      </div>
    </div>
  );
}

// Personnel Column with overflow transition
function PersonnelColumn({ 
  title, 
  personnel, 
  settings,
  onDeletePersonnel,
  onEditPersonnel 
}: { 
  title: string;
  personnel: PersonnelStatus[];
  settings: { transitionStyle: TransitionStyle; transitionSpeed: string; smoothScrollEnabled: boolean; customTransitionSeconds: number };
  onDeletePersonnel: (id: string) => void;
  onEditPersonnel: (personnel: PersonnelStatus) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const transitionSpeed = getTransitionSpeed(settings.transitionSpeed, settings.customTransitionSeconds);
  
  // Personnel item height: 18px name + 12px date + padding = ~48px
  const { currentItems, hasOverflow, currentPage, totalPages } = useOverflowTransition(
    personnel,
    containerRef,
    48,
    settings
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

  const renderItems = hasOverflow && isPaginationMode ? currentItems : personnel;

  // For gentle continuous scroll, duplicate items for seamless loop
  const isGentleScroll = settings.transitionStyle === 'gentleContinuousScroll';
  const displayItems = hasOverflow && isGentleScroll ? [...personnel, ...personnel] : renderItems;

  // Use a stable key that changes when page content changes
  // For continuous scroll modes, use a stable key to prevent re-renders
  const contentKey = isGentleScroll 
    ? 'continuous-scroll' 
    : (isPaginationMode && hasOverflow 
      ? `page-${currentPage}-${totalPages}-${currentItems.map(p => p.id).join('-')}` 
      : `all-${personnel.map(p => p.id).join('-')}`);
  
  // For gentle continuous scroll, don't use AnimatePresence to avoid interrupting the scroll
  const shouldUseAnimatePresence = !isGentleScroll;

  return (
    <div className="flex flex-col overflow-hidden h-full">
      <div className="px-2 py-1 border-b border-border bg-muted/30 flex-shrink-0">
        <h3 className="text-base sm:text-lg lg:text-[24px] font-bold text-foreground tracking-wide text-center">{title}</h3>
      </div>
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto p-1 scrollbar-hide min-h-0"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {personnel.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground text-xs sm:text-sm">—</div>
        ) : shouldUseAnimatePresence ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={contentKey}
              initial={currentPageVariant.initial}
              animate={currentPageVariant.animate}
              exit={currentPageVariant.exit}
              className="space-y-0.5"
              data-content-measure
            >
              {displayItems.map((p, index) => (
                <PersonnelItemCompact key={`${p.id}-${index}`} item={p} onDelete={() => onDeletePersonnel(p.id)} onEdit={() => onEditPersonnel(p)} />
              ))}
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="space-y-0.5" data-content-measure>
            {displayItems.map((p, index) => (
              <PersonnelItemCompact key={`${p.id}-${index}`} item={p} onDelete={() => onDeletePersonnel(p.id)} onEdit={() => onEditPersonnel(p)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Compact Personnel Item for 3-column layout
function PersonnelItemCompact({ 
  item, 
  onDelete,
  onEdit 
}: { 
  item: PersonnelStatus;
  onDelete?: () => void;
  onEdit?: () => void;
}) {
  const formatDateRange = (start: string, end: string) => {
    const startDate = format(parseISO(start), 'MMM d');
    const endDate = format(parseISO(end), 'MMM d');
    return `${startDate} - ${endDate}`;
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex flex-col py-1 px-2 hover:bg-muted/50 rounded group transition-colors"
    >
      <div className="flex items-start justify-between gap-1">
        <span className="font-medium text-sm sm:text-base lg:text-[18px] text-foreground truncate">{item.name}</span>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {onEdit && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={onEdit}
            >
              <Pencil className="h-3 w-3 text-muted-foreground" />
            </Button>
          )}
          {onDelete && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={onDelete}
            >
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          )}
        </div>
      </div>
      <span className="text-[10px] sm:text-xs lg:text-[12px] text-muted-foreground">
        {formatDateRange(item.dateStart, item.dateEnd)}
        {item.location && (
          <span className="block truncate">{item.location}</span>
        )}
      </span>
    </motion.div>
  );
}

// Project Item Component
function ProjectItem({ 
  project, 
  onIncrement, 
  onDecrement,
  onDelete,
  onEdit 
}: { 
  project: Project;
  onIncrement: () => void;
  onDecrement: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const showControls = isHovered || isFocused;

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex items-center justify-between py-2 px-2 sm:px-3 hover:bg-muted/50 rounded group transition-colors"
    >
      <span className="font-medium text-sm sm:text-base lg:text-[20px] text-foreground truncate flex-1">{project.name}</span>
      <div 
        className="flex items-center gap-0.5 sm:gap-1 relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      >
        {/* Decrement button - hidden by default */}
        <Button 
          variant="ghost" 
          size="icon" 
          className={`h-7 w-7 transition-opacity duration-200 ${showControls ? 'opacity-100' : 'opacity-0'}`}
          onClick={onDecrement}
          disabled={project.number === 0}
          tabIndex={showControls ? 0 : -1}
        >
          <Minus className="h-4 w-4" />
        </Button>
        
        {/* Number display - always visible */}
        <span className="w-10 text-center text-lg font-bold text-foreground tabular-nums select-none">
          {project.number}
        </span>
        
        {/* Increment button - hidden by default */}
        <Button 
          variant="ghost" 
          size="icon" 
          className={`h-7 w-7 transition-opacity duration-200 ${showControls ? 'opacity-100' : 'opacity-0'}`}
          onClick={onIncrement}
          tabIndex={showControls ? 0 : -1}
        >
          <Plus className="h-4 w-4" />
        </Button>
        
        {onEdit && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity ml-1"
            onClick={onEdit}
          >
            <Pencil className="h-4 w-4 text-muted-foreground" />
          </Button>
        )}
        {onDelete && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity ml-1"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
      </div>
    </motion.div>
  );
}

// Project Request Panel
function ProjectRequestPanel({ onDeleteProject, onEditProject }: { 
  onDeleteProject: (id: string) => void;
  onEditProject: (project: Project) => void;
}) {
  const { projects, incrementProject, decrementProject, settings } = useScheduleStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const transitionSpeed = getTransitionSpeed(settings.transitionSpeed, settings.customTransitionSeconds);

  // Project item height: 20px font + padding = ~52px
  const { currentItems, hasOverflow, currentPage, totalPages } = useOverflowTransition(
    projects,
    containerRef,
    52,
    settings
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

  const renderItems = hasOverflow && isPaginationMode ? currentItems : projects;

  // For gentle continuous scroll, duplicate items for seamless loop
  const isGentleScroll = settings.transitionStyle === 'gentleContinuousScroll';
  const displayItems = hasOverflow && isGentleScroll ? [...projects, ...projects] : renderItems;

  // Use a stable key that changes when page content changes
  // For continuous scroll modes, use a stable key to prevent re-renders
  const contentKey = isGentleScroll 
    ? 'continuous-scroll' 
    : (isPaginationMode && hasOverflow 
      ? `page-${currentPage}-${totalPages}-${currentItems.map(p => p.id).join('-')}` 
      : `all-${projects.map(p => p.id).join('-')}`);
  
  // For gentle continuous scroll, don't use AnimatePresence to avoid interrupting the scroll
  const shouldUseAnimatePresence = !isGentleScroll;

  return (
    <div className="bg-card border border-border rounded-lg h-full flex flex-col overflow-hidden">
      <div className="px-2 py-1 border-b border-border bg-muted/30">
        <h2 className="text-base sm:text-lg lg:text-[24px] font-bold text-foreground tracking-wide">PROJECT REQUEST</h2>
      </div>
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto p-1 sm:p-1.5 scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {projects.length === 0 ? (
          <div className="flex items-center justify-center h-16 text-muted-foreground text-sm sm:text-lg">
            —
          </div>
        ) : shouldUseAnimatePresence ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={contentKey}
              initial={currentPageVariant.initial}
              animate={currentPageVariant.animate}
              exit={currentPageVariant.exit}
              className="space-y-0.5"
              data-content-measure
            >
              {displayItems.map((project, index) => (
                <ProjectItem 
                  key={`${project.id}-${index}`}
                  project={project}
                  onIncrement={() => incrementProject(project.id)}
                  onDecrement={() => decrementProject(project.id)}
                  onDelete={() => onDeleteProject(project.id)}
                  onEdit={() => onEditProject(project)}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="space-y-0.5" data-content-measure>
            {displayItems.map((project, index) => (
              <ProjectItem 
                key={`${project.id}-${index}`}
                project={project}
                onIncrement={() => incrementProject(project.id)}
                onDecrement={() => decrementProject(project.id)}
                onDelete={() => onDeleteProject(project.id)}
                onEdit={() => onEditProject(project)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Edit Event Modal
function EditEventModal({ 
  open, 
  onClose,
  event
}: { 
  open: boolean; 
  onClose: () => void;
  event: ScheduleEvent | null;
}) {
  const { updateEvent } = useScheduleStore();
  const [title, setTitle] = useState('');
  const [dateStarted, setDateStarted] = useState('');
  const [timeStart, setTimeStart] = useState('');
  const [timeEnd, setTimeEnd] = useState('');
  const [details, setDetails] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Populate form when event changes
  useEffect(() => {
    if (event) {
      queueMicrotask(() => {
        setTitle(event.title);
        setDateStarted(event.dateStarted);
        setTimeStart(event.timeStart);
        setTimeEnd(event.timeEnd);
        setDetails(event.details || '');
        setIsAllDay(event.timeStart === '00:00' && event.timeEnd === '23:59');
      });
    }
  }, [event]);

  const handleAllDayChange = (checked: boolean) => {
    setIsAllDay(checked);
    if (checked) {
      setTimeStart('00:00');
      setTimeEnd('23:59');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;
    
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    setError('');

    if (!title.trim()) {
      setError('Event title is required');
      setIsSubmitting(false);
      return;
    }

    if (!isAllDay && timeEnd <= timeStart) {
      setError('End time must be after start time');
      setIsSubmitting(false);
      return;
    }

    updateEvent(event.id, {
      title: title.trim(),
      dateStarted,
      timeStart,
      timeEnd,
      details: details.trim() || undefined,
    });

    onClose();
    setTimeout(() => setIsSubmitting(false), 500);
  };

  if (!event) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Edit Event</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <p className="text-sm text-destructive">{error}</p>}
          
          <div className="space-y-2">
            <Label htmlFor="edit-event-title" className="text-base">Event Title *</Label>
            <Input 
              id="edit-event-title" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter event title"
              className="text-base"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="edit-event-date" className="text-base">Date Started *</Label>
            <Input 
              id="edit-event-date" 
              type="date" 
              value={dateStarted} 
              onChange={(e) => setDateStarted(e.target.value)}
              className="text-base"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="edit-all-day" 
              checked={isAllDay}
              onCheckedChange={(checked) => handleAllDayChange(checked as boolean)}
            />
            <Label htmlFor="edit-all-day" className="text-base cursor-pointer">All Day Event</Label>
          </div>
          
          {!isAllDay && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-time-start" className="text-base">Time Start *</Label>
                <Input 
                  id="edit-time-start" 
                  type="time" 
                  value={timeStart} 
                  onChange={(e) => setTimeStart(e.target.value)}
                  className="text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-time-end" className="text-base">Time End *</Label>
                <Input 
                  id="edit-time-end" 
                  type="time" 
                  value={timeEnd} 
                  onChange={(e) => setTimeEnd(e.target.value)}
                  className="text-base"
                />
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="edit-event-details" className="text-base">Details (Optional)</Label>
            <Input 
              id="edit-event-details" 
              value={details} 
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Enter event details"
              className="text-base"
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="text-base">Cancel</Button>
            <Button type="submit" className="text-base" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Changes'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Add Event Modal
function AddEventModal({ 
  open, 
  onClose 
}: { 
  open: boolean; 
  onClose: () => void;
}) {
  const { addEvent } = useScheduleStore();
  const [title, setTitle] = useState('');
  const [dateStarted, setDateStarted] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [timeStart, setTimeStart] = useState('09:00');
  const [timeEnd, setTimeEnd] = useState('10:00');
  const [details, setDetails] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handler for all-day toggle
  const handleAllDayChange = (checked: boolean) => {
    setIsAllDay(checked);
    if (checked) {
      setTimeStart('00:00');
      setTimeEnd('23:59');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    setError('');

    if (!title.trim()) {
      setError('Event title is required');
      setIsSubmitting(false);
      return;
    }

    if (!isAllDay && timeEnd <= timeStart) {
      setError('End time must be after start time');
      setIsSubmitting(false);
      return;
    }

    addEvent({
      title: title.trim(),
      dateStarted,
      timeStart,
      timeEnd,
      details: details.trim() || undefined,
    });

    // Reset form but keep modal open
    setTitle('');
    setDateStarted(format(new Date(), 'yyyy-MM-dd'));
    setTimeStart('09:00');
    setTimeEnd('10:00');
    setDetails('');
    setIsAllDay(false);
    
    // Small delay to prevent double submission
    setTimeout(() => setIsSubmitting(false), 500);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Add Event</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <p className="text-sm text-destructive">{error}</p>}
          
          <div className="space-y-2">
            <Label htmlFor="event-title" className="text-base">Event Title *</Label>
            <Input 
              id="event-title" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter event title"
              className="text-base"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="event-date" className="text-base">Date Started *</Label>
            <Input 
              id="event-date" 
              type="date" 
              value={dateStarted} 
              onChange={(e) => setDateStarted(e.target.value)}
              className="text-base"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="all-day" 
              checked={isAllDay}
              onCheckedChange={(checked) => handleAllDayChange(checked as boolean)}
            />
            <Label htmlFor="all-day" className="text-base cursor-pointer">All Day Event</Label>
          </div>
          
          {!isAllDay && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="time-start" className="text-base">Time Start *</Label>
                <Input 
                  id="time-start" 
                  type="time" 
                  value={timeStart} 
                  onChange={(e) => setTimeStart(e.target.value)}
                  className="text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time-end" className="text-base">Time End *</Label>
                <Input 
                  id="time-end" 
                  type="time" 
                  value={timeEnd} 
                  onChange={(e) => setTimeEnd(e.target.value)}
                  className="text-base"
                />
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="event-details" className="text-base">Details (Optional)</Label>
            <Input 
              id="event-details" 
              value={details} 
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Enter event details"
              className="text-base"
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="text-base">Cancel</Button>
            <Button type="submit" className="text-base" disabled={isSubmitting}>{isSubmitting ? 'Adding...' : 'Add Event'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Add Personnel Modal (CTO/FL, WFH, Travel)
function AddPersonnelModal({ 
  open, 
  onClose, 
  type 
}: { 
  open: boolean; 
  onClose: () => void;
  type: 'CTO' | 'FL' | 'WFH' | 'TRAVEL';
}) {
  const { addPersonnelStatus } = useScheduleStore();
  const [name, setName] = useState('');
  const [dateStart, setDateStart] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dateEnd, setDateEnd] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [location, setLocation] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const title = type === 'TRAVEL' ? 'Add In Travel' : `Add ${type === 'CTO' || type === 'FL' ? 'CTO / FL' : 'WFH'}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    setError('');

    if (!name.trim()) {
      setError('Personnel name is required');
      setIsSubmitting(false);
      return;
    }

    if (type === 'TRAVEL' && !location.trim()) {
      setError('Location is required');
      setIsSubmitting(false);
      return;
    }

    addPersonnelStatus({
      name: name.trim(),
      type,
      dateStart,
      dateEnd,
      location: type === 'TRAVEL' ? location.trim() : undefined,
    });

    // Reset form but keep modal open
    setName('');
    setDateStart(format(new Date(), 'yyyy-MM-dd'));
    setDateEnd(format(new Date(), 'yyyy-MM-dd'));
    setLocation('');
    
    // Small delay to prevent double submission
    setTimeout(() => setIsSubmitting(false), 500);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <p className="text-sm text-destructive">{error}</p>}
          
          <div className="space-y-2">
            <Label htmlFor="personnel-name" className="text-base">Personnel Name *</Label>
            <Input 
              id="personnel-name" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter name"
              className="text-base"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date-start" className="text-base">Date Start *</Label>
              <Input 
                id="date-start" 
                type="date" 
                value={dateStart} 
                onChange={(e) => setDateStart(e.target.value)}
                className="text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-end" className="text-base">Date End *</Label>
              <Input 
                id="date-end" 
                type="date" 
                value={dateEnd} 
                onChange={(e) => setDateEnd(e.target.value)}
                className="text-base"
              />
            </div>
          </div>
          
          {type === 'TRAVEL' && (
            <div className="space-y-2">
              <Label htmlFor="location" className="text-base">Location *</Label>
              <Input 
                id="location" 
                value={location} 
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Enter location"
                className="text-base"
              />
            </div>
          )}
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="text-base">Cancel</Button>
            <Button type="submit" className="text-base" disabled={isSubmitting}>{isSubmitting ? 'Adding...' : 'Add'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Add Project Modal
function AddProjectModal({ 
  open, 
  onClose 
}: { 
  open: boolean; 
  onClose: () => void;
}) {
  const { addProject } = useScheduleStore();
  const [name, setName] = useState('');
  const [number, setNumber] = useState('0');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    setError('');

    if (!name.trim()) {
      setError('Project name is required');
      setIsSubmitting(false);
      return;
    }

    const numValue = parseInt(number, 10);
    if (isNaN(numValue) || numValue < 0) {
      setError('Please enter a valid number');
      setIsSubmitting(false);
      return;
    }

    addProject({
      name: name.trim(),
      number: numValue,
    });

    // Reset form but keep modal open
    setName('');
    setNumber('0');
    
    // Small delay to prevent double submission
    setTimeout(() => setIsSubmitting(false), 500);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Add Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <p className="text-sm text-destructive">{error}</p>}
          
          <div className="space-y-2">
            <Label htmlFor="project-name" className="text-base">Project Name *</Label>
            <Input 
              id="project-name" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter project name"
              className="text-base"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="project-number" className="text-base">Number *</Label>
            <Input 
              id="project-number" 
              type="number" 
              min="0"
              value={number} 
              onChange={(e) => setNumber(e.target.value)}
              placeholder="Enter number"
              className="text-base"
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="text-base">Cancel</Button>
            <Button type="submit" className="text-base" disabled={isSubmitting}>{isSubmitting ? 'Adding...' : 'Add Project'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Edit Personnel Modal
function EditPersonnelModal({ 
  open, 
  onClose,
  personnel
}: { 
  open: boolean; 
  onClose: () => void;
  personnel: PersonnelStatus | null;
}) {
  const { updatePersonnelStatus } = useScheduleStore();
  const [name, setName] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Populate form when personnel changes
  useEffect(() => {
    if (personnel) {
      queueMicrotask(() => {
        setName(personnel.name);
        setDateStart(personnel.dateStart);
        setDateEnd(personnel.dateEnd);
        setLocation(personnel.location || '');
      });
    }
  }, [personnel]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personnel) return;
    
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    setError('');

    if (!name.trim()) {
      setError('Personnel name is required');
      setIsSubmitting(false);
      return;
    }

    if (personnel.type === 'TRAVEL' && !location.trim()) {
      setError('Location is required');
      setIsSubmitting(false);
      return;
    }

    updatePersonnelStatus(personnel.id, {
      name: name.trim(),
      dateStart,
      dateEnd,
      location: personnel.type === 'TRAVEL' ? location.trim() : undefined,
    });

    onClose();
    setTimeout(() => setIsSubmitting(false), 500);
  };

  if (!personnel) return null;

  const title = personnel.type === 'TRAVEL' ? 'Edit In Travel' : `Edit ${personnel.type === 'CTO' || personnel.type === 'FL' ? 'CTO / FL' : 'WFH'}`;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <p className="text-sm text-destructive">{error}</p>}
          
          <div className="space-y-2">
            <Label htmlFor="edit-personnel-name" className="text-base">Personnel Name *</Label>
            <Input 
              id="edit-personnel-name" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter name"
              className="text-base"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-date-start" className="text-base">Date Start *</Label>
              <Input 
                id="edit-date-start" 
                type="date" 
                value={dateStart} 
                onChange={(e) => setDateStart(e.target.value)}
                className="text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-date-end" className="text-base">Date End *</Label>
              <Input 
                id="edit-date-end" 
                type="date" 
                value={dateEnd} 
                onChange={(e) => setDateEnd(e.target.value)}
                className="text-base"
              />
            </div>
          </div>
          
          {personnel.type === 'TRAVEL' && (
            <div className="space-y-2">
              <Label htmlFor="edit-location" className="text-base">Location *</Label>
              <Input 
                id="edit-location" 
                value={location} 
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Enter location"
                className="text-base"
              />
            </div>
          )}
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="text-base">Cancel</Button>
            <Button type="submit" className="text-base" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Changes'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Edit Project Modal
function EditProjectModal({ 
  open, 
  onClose,
  project
}: { 
  open: boolean; 
  onClose: () => void;
  project: Project | null;
}) {
  const { updateProject } = useScheduleStore();
  const [name, setName] = useState('');
  const [number, setNumber] = useState('0');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Populate form when project changes
  useEffect(() => {
    if (project) {
      queueMicrotask(() => {
        setName(project.name);
        setNumber(project.number.toString());
      });
    }
  }, [project]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;
    
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    setError('');

    if (!name.trim()) {
      setError('Project name is required');
      setIsSubmitting(false);
      return;
    }

    const numValue = parseInt(number, 10);
    if (isNaN(numValue) || numValue < 0) {
      setError('Please enter a valid number');
      setIsSubmitting(false);
      return;
    }

    updateProject(project.id, {
      name: name.trim(),
      number: numValue,
    });

    onClose();
    setTimeout(() => setIsSubmitting(false), 500);
  };

  if (!project) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Edit Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <p className="text-sm text-destructive">{error}</p>}
          
          <div className="space-y-2">
            <Label htmlFor="edit-project-name" className="text-base">Project Name *</Label>
            <Input 
              id="edit-project-name" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter project name"
              className="text-base"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="edit-project-number" className="text-base">Number *</Label>
            <Input 
              id="edit-project-number" 
              type="number" 
              min="0"
              value={number} 
              onChange={(e) => setNumber(e.target.value)}
              placeholder="Enter number"
              className="text-base"
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="text-base">Cancel</Button>
            <Button type="submit" className="text-base" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Changes'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Settings Modal
function SettingsModal({ 
  open, 
  onClose 
}: { 
  open: boolean; 
  onClose: () => void;
}) {
  const { settings, updateSettings, updateStatusColors, setTheme, setPin, togglePinEnabled } = useScheduleStore();
  const [pinInput, setPinInput] = useState(settings.pin);
  const [customSeconds, setCustomSeconds] = useState(settings.customTransitionSeconds.toString());

  // Use settings.pin directly as initial value, no sync needed

  const handleSave = () => {
    updateSettings({
      customTransitionSeconds: parseInt(customSeconds, 10) || 3,
    });
    if (pinInput.length === 4 || pinInput === '') {
      setPin(pinInput);
    }
    onClose();
  };

  const handleColorChange = (status: keyof typeof settings.statusColors, color: string) => {
    updateStatusColors({ [status]: color });
  };

  const transitionStyles: TransitionStyle[] = [
    'static', 'fade', 'slideUp', 'slideLeft', 'verticalAutoScroll', 'gentleContinuousScroll'
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Settings className="h-5 w-5" />
            Settings
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Theme Mode */}
          <div className="space-y-3">
            <Label className="text-base">Theme Mode</Label>
            <div className="flex items-center gap-4">
              <Button 
                variant={settings.theme === 'light' ? 'default' : 'outline'}
                onClick={() => setTheme('light')}
                className="text-base px-6"
              >
                Light Mode
              </Button>
              <Button 
                variant={settings.theme === 'dark' ? 'default' : 'outline'}
                onClick={() => setTheme('dark')}
                className="text-base px-6"
              >
                Dark Mode
              </Button>
            </div>
          </div>

          <Separator />

          {/* Transition Style */}
          <div className="space-y-3">
            <Label className="text-base">Transition Style</Label>
            <Select 
              value={settings.transitionStyle} 
              onValueChange={(value: TransitionStyle) => updateSettings({ transitionStyle: value })}
            >
              <SelectTrigger className="text-base">
                <SelectValue placeholder="Select transition style" />
              </SelectTrigger>
              <SelectContent>
                {transitionStyles.map((style) => (
                  <SelectItem key={style} value={style} className="text-base">
                    {style.charAt(0).toUpperCase() + style.slice(1).replace(/([A-Z])/g, ' $1')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Transition Speed */}
          <div className="space-y-3">
            <Label className="text-base">Transition Speed</Label>
            <Select 
              value={settings.transitionSpeed} 
              onValueChange={(value: 'verySlow' | 'slow' | 'normal' | 'fast' | 'custom') => 
                updateSettings({ transitionSpeed: value })
              }
            >
              <SelectTrigger className="text-base">
                <SelectValue placeholder="Select speed" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="verySlow" className="text-base">Very Slow</SelectItem>
                <SelectItem value="slow" className="text-base">Slow</SelectItem>
                <SelectItem value="normal" className="text-base">Normal</SelectItem>
                <SelectItem value="fast" className="text-base">Fast</SelectItem>
                <SelectItem value="custom" className="text-base">Custom</SelectItem>
              </SelectContent>
            </Select>
            {settings.transitionSpeed === 'custom' && (
              <div className="flex items-center gap-2">
                <Input 
                  type="number" 
                  min="1" 
                  max="60"
                  value={customSeconds}
                  onChange={(e) => setCustomSeconds(e.target.value)}
                  placeholder="Seconds"
                  className="text-base w-24"
                />
                <span className="text-muted-foreground">seconds</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Status Colors */}
          <div className="space-y-4">
            <Label className="text-base">Status Colors</Label>
            <div className="grid grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Upcoming</Label>
                <Input 
                  type="color" 
                  value={settings.statusColors.upcoming}
                  onChange={(e) => handleColorChange('upcoming', e.target.value)}
                  className="h-12 w-full"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Ongoing</Label>
                <Input 
                  type="color" 
                  value={settings.statusColors.ongoing}
                  onChange={(e) => handleColorChange('ongoing', e.target.value)}
                  className="h-12 w-full"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Completed</Label>
                <Input 
                  type="color" 
                  value={settings.statusColors.completed}
                  onChange={(e) => handleColorChange('completed', e.target.value)}
                  className="h-12 w-full"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Smooth Scroll */}
          <div className="flex items-center justify-between">
            <Label className="text-base">Enable Smooth Scrolling</Label>
            <Switch 
              checked={settings.smoothScrollEnabled}
              onCheckedChange={(checked) => updateSettings({ smoothScrollEnabled: checked })}
            />
          </div>

          <Separator />

          {/* PIN Protection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-base">
                <Lock className="h-4 w-4" />
                PIN Protection
              </Label>
              <Switch 
                checked={settings.pinEnabled}
                onCheckedChange={togglePinEnabled}
              />
            </div>
            {settings.pinEnabled && (
              <div className="space-y-2">
                <Label className="text-sm">4-Digit PIN</Label>
                <Input 
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="Enter 4-digit PIN"
                  className="text-base"
                />
                <p className="text-xs text-muted-foreground">PIN will be saved when you click Save Settings</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="text-base">Cancel</Button>
          <Button onClick={handleSave} className="text-base">Save Settings</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Week View Component
function WeekView({ events, onDeleteEvent, onEditEvent, weekStart }: { 
  events: ScheduleEvent[]; 
  onDeleteEvent: (id: string) => void;
  onEditEvent: (event: ScheduleEvent) => void;
  weekStart: Date;
}) {
  const { settings } = useScheduleStore();
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  const getEventsForDay = (date: Date) => {
    return events.filter((e) => format(parseISO(e.dateStarted), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'))
      .sort((a, b) => a.timeStart.localeCompare(b.timeStart));
  };

  return (
    <div className="bg-card border border-border rounded-lg flex-1 min-h-0 flex flex-col overflow-hidden">
      <div className="px-3 py-2 border-b border-border bg-muted/30">
        <h2 className="text-base lg:text-lg font-bold text-foreground tracking-wide">
          WEEK VIEW: {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
        </h2>
      </div>
      <div className="flex-1 grid grid-cols-7 divide-x divide-border overflow-hidden">
        {days.map((day, index) => {
          const date = addDays(weekStart, index);
          const dayEvents = getEventsForDay(date);
          const isToday = format(new Date(), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
          
          return (
            <div key={day} className="flex flex-col overflow-hidden min-h-0">
              <div className={`px-2 py-2 text-center border-b border-border ${isToday ? 'bg-primary/10' : 'bg-muted/20'}`}>
                <div className="text-sm font-medium text-muted-foreground">{day}</div>
                <div className={`text-lg font-bold ${isToday ? 'text-primary' : 'text-foreground'}`}>
                  {format(date, 'd')}
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden p-1.5 space-y-1">
                {dayEvents.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground text-sm">—</div>
                ) : (
                  dayEvents.map((event) => (
                    <WeekEventRow key={event.id} event={event} onDelete={() => onDeleteEvent(event.id)} onEdit={() => onEditEvent(event)} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Week Event Row (compact)
function WeekEventRow({ event, onDelete, onEdit }: { event: ScheduleEvent; onDelete?: () => void; onEdit?: () => void }) {
  const { settings } = useScheduleStore();
  const status = getEventStatus(event);
  const statusColor = settings.statusColors[status];
  const isAllDay = event.timeStart === '00:00' && event.timeEnd === '23:59';

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      className="flex items-start gap-1 py-1 px-1.5 hover:bg-muted/50 rounded group transition-colors"
    >
      <StatusDot color={statusColor} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-xs text-foreground truncate">{event.title}</div>
        <div className="text-xs text-muted-foreground">
          {isAllDay ? 'All Day' : formatTime12Hour(event.timeStart)}
        </div>
      </div>
      <div className="flex items-center gap-0.5 flex-shrink-0">
        {onEdit && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={onEdit}
          >
            <Pencil className="h-2.5 w-2.5 text-muted-foreground" />
          </Button>
        )}
        {onDelete && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={onDelete}
          >
            <Trash2 className="h-2.5 w-2.5 text-destructive" />
          </Button>
        )}
      </div>
    </motion.div>
  );
}

// Month View Component
function MonthView({ events, onDeleteEvent, onEditEvent, monthStart }: { 
  events: ScheduleEvent[]; 
  onDeleteEvent: (id: string) => void;
  onEditEvent: (event: ScheduleEvent) => void;
  monthStart: Date;
}) {
  const { settings } = useScheduleStore();
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  // Generate all days for the calendar grid
  const calendarDays = useMemo(() => {
    const monthEnd = endOfMonth(monthStart);
    const firstDayOfCalendar = startOfWeek(monthStart, { weekStartsOn: 1 });
    const lastDayOfCalendar = endOfWeek(monthEnd, { weekStartsOn: 1 });
    
    const allDays: Date[] = [];
    let currentDay = firstDayOfCalendar;
    
    // Generate all days (max 42 days = 6 weeks)
    while (currentDay <= lastDayOfCalendar && allDays.length < 42) {
      allDays.push(new Date(currentDay));
      currentDay = addDays(currentDay, 1);
    }
    
    // Ensure we have exactly 42 days for 6 weeks
    while (allDays.length < 42) {
      allDays.push(addDays(allDays[allDays.length - 1], 1));
    }
    
    // Split into weeks
    const result: Date[][] = [];
    for (let i = 0; i < allDays.length; i += 7) {
      result.push(allDays.slice(i, i + 7));
    }
    
    return result;
  }, [monthStart]);

  const getEventsForDay = useCallback((date: Date) => {
    return events.filter((e) => format(parseISO(e.dateStarted), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'))
      .sort((a, b) => a.timeStart.localeCompare(b.timeStart));
  }, [events]);

  const selectedDateEvents = selectedDate ? getEventsForDay(selectedDate) : [];
  const transitionSpeed = getTransitionSpeed(settings.transitionSpeed, settings.customTransitionSeconds);

  return (
    <>
      <div className="bg-card border border-border rounded-lg flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="px-2 py-1 border-b border-border bg-muted/30">
          <h2 className="text-sm lg:text-base font-bold text-foreground tracking-wide">
            MONTH VIEW: {format(monthStart, 'MMMM yyyy')}
          </h2>
        </div>
        
        {/* Day headers */}
        <div className="grid grid-cols-7 divide-x divide-border border-b border-border">
          {days.map((day) => (
            <div key={day} className="px-1 py-1 text-center bg-muted/20">
              <span className="text-xs font-medium text-muted-foreground">{day}</span>
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="flex-1 grid grid-rows-6 divide-y divide-border overflow-hidden">
          {calendarDays.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 divide-x divide-border">
              {week.map((date, dayIndex) => {
                const dayEvents = getEventsForDay(date);
                const isCurrentMonth = format(date, 'M') === format(monthStart, 'M');
                const isToday = format(new Date(), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
                
                return (
                  <div 
                    key={dayIndex} 
                    className={`flex flex-col overflow-hidden cursor-pointer hover:bg-muted/20 transition-colors ${!isCurrentMonth ? 'bg-muted/30' : ''} ${isToday ? 'bg-primary/5' : ''}`}
                    onClick={() => setSelectedDate(date)}
                  >
                    <div className={`px-1 py-0.5 text-right ${isToday ? 'bg-primary text-primary-foreground' : ''}`}>
                      <span className={`text-xs font-medium ${isToday ? '' : isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {format(date, 'd')}
                      </span>
                    </div>
                    <div className="flex-1 overflow-hidden p-0.5 space-y-0.5">
                      {dayEvents.slice(0, 4).map((event) => (
                        <MonthEventRow key={event.id} event={event} onDelete={() => onDeleteEvent(event.id)} onEdit={() => onEditEvent(event)} />
                      ))}
                      {dayEvents.length > 4 && (
                        <div className="text-xs text-muted-foreground text-center">+{dayEvents.length - 4} more</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Day Events Dialog */}
      <Dialog open={!!selectedDate} onOpenChange={() => setSelectedDate(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {selectedDateEvents.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No events on this day</p>
            ) : (
              selectedDateEvents.map((event) => (
                <EventRow 
                  key={event.id}
                  event={event}
                  onDelete={() => onDeleteEvent(event.id)}
                  onEdit={() => { setSelectedDate(null); onEditEvent(event); }}
                  transitionStyle="static"
                  transitionSpeed={transitionSpeed}
                />
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
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

  // Notification state - must be before early return
  const [activeNotifications, setActiveNotifications] = useState<EventNotification[]>([]);
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(new Set());
  const previousNotificationIdsRef = useRef<Set<string>>(new Set());

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Day view: Today and Tomorrow
  const todayEvents = events.filter((e) => isToday(parseISO(e.dateStarted)));
  const tomorrowEvents = events.filter((e) => isTomorrow(parseISO(e.dateStarted)));

  // Stable reference to today events for notification check
  const todayEventsKey = todayEvents.map(e => e.id).join(',');
  const dismissedKey = [...dismissedNotifications].join(',');

  // Load data from server and start auto-sync on mount
  useEffect(() => {
    loadFromServer();
    startAutoSync();
    
    return () => {
      stopAutoSync();
    };
  }, [loadFromServer, startAutoSync, stopAutoSync]);

  // Check session authentication on mount
  useEffect(() => {
    if (!_hasHydrated) return;
    
    // Check if PIN protection is enabled
    const requiresPin = settings.pinEnabled && settings.pin;
    
    if (requiresPin) {
      // Check if session is already unlocked (using sessionStorage)
      const sessionAuth = sessionStorage.getItem('eustdd-session-auth');
      // Use microtask to avoid synchronous setState warning
      queueMicrotask(() => {
        if (sessionAuth === 'unlocked') {
          setIsSessionUnlocked(true);
        } else {
          // Show PIN dialog
          setSessionPinDialogOpen(true);
        }
      });
    } else {
      // No PIN required, unlock immediately
      queueMicrotask(() => setIsSessionUnlocked(true));
    }
  }, [_hasHydrated, settings.pinEnabled, settings.pin]);

  // Apply theme
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  // Check for upcoming events every 10 seconds
  useEffect(() => {
    if (!_hasHydrated) return;
    
    const checkNotifications = () => {
      const upcoming = getUpcomingEvents(todayEvents, 5);
      // Filter out dismissed notifications
      const newNotifications = upcoming.filter(n => !dismissedNotifications.has(n.event.id));
      
      // Check if there are new notifications (not previously shown)
      const newIds = new Set(newNotifications.map(n => n.event.id));
      const hasNewNotifications = [...newIds].some(id => !previousNotificationIdsRef.current.has(id));
      
      if (hasNewNotifications && newNotifications.length > 0) {
        // Play notification sound using Web Audio API
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

    // Check immediately
    checkNotifications();

    // Check every 10 seconds
    const interval = setInterval(checkNotifications, 10000);

    return () => clearInterval(interval);
  }, [todayEventsKey, dismissedKey, _hasHydrated]);

  // Dismiss notification
  const dismissNotification = (eventId: string) => {
    setDismissedNotifications(prev => new Set([...prev, eventId]));
    setActiveNotifications(prev => prev.filter(n => n.event.id !== eventId));
  };

  // Handle session PIN success
  const handleSessionPinSuccess = () => {
    sessionStorage.setItem('eustdd-session-auth', 'unlocked');
    setIsSessionUnlocked(true);
    setSessionPinDialogOpen(false);
  };

  // Show loading until hydrated
  if (!_hasHydrated) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Show PIN lock screen if session is not unlocked
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

  // Week view
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });

  // Month view
  const monthStart = startOfMonth(today);

  const handleAddEntry = (type: string) => {
    setModalType(type);
  };

  const closeModal = () => {
    setModalType(null);
  };

  // Render based on view mode
  const renderMainContent = () => {
    if (viewMode === 'day') {
      return (
        <main className="flex-1 p-1 sm:p-2 grid grid-cols-1 lg:grid-cols-2 grid-rows-[auto_auto_auto_auto] lg:grid-rows-2 gap-1 sm:gap-2 max-w-[1920px] mx-auto w-full min-h-0 overflow-hidden">
          <SchedulePanel 
            title="TODAY'S SCHEDULE"
            date={format(today, 'EEEE, MMMM d, yyyy')}
            events={todayEvents}
            onDeleteEvent={deleteEvent}
            onEditEvent={setEditingEvent}
          />
          
          <SchedulePanel 
            title="TOMORROW'S SCHEDULE"
            date={format(tomorrow, 'EEEE, MMMM d, yyyy')}
            events={tomorrowEvents}
            onDeleteEvent={deleteEvent}
            onEditEvent={setEditingEvent}
          />
          
          <PersonnelStatusPanel onDeletePersonnel={deletePersonnelStatus} onEditPersonnel={setEditingPersonnel} />
          
          <ProjectRequestPanel onDeleteProject={deleteProject} onEditProject={setEditingProject} />
        </main>
      );
    } else if (viewMode === 'week') {
      return (
        <main className="flex-1 p-1 sm:p-2 flex flex-col min-h-0 max-w-[1920px] mx-auto w-full overflow-hidden">
          <WeekView 
            events={events}
            onDeleteEvent={deleteEvent}
            onEditEvent={setEditingEvent}
            weekStart={weekStart}
          />
        </main>
      );
    } else {
      return (
        <main className="flex-1 p-1 sm:p-2 flex flex-col min-h-0 max-w-[1920px] mx-auto w-full overflow-hidden">
          <MonthView 
            events={events}
            onDeleteEvent={deleteEvent}
            onEditEvent={setEditingEvent}
            monthStart={monthStart}
          />
        </main>
      );
    }
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <Header 
        onOpenSettings={() => setSettingsOpen(true)}
        onAddEntry={handleAddEntry}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />
      
      {renderMainContent()}

      {/* Event Notifications */}
      <AnimatePresence>
        {activeNotifications.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -100, scale: 0.9 }}
            className="fixed top-16 sm:top-20 left-1/2 -translate-x-1/2 z-50 px-2 w-full max-w-[400px]"
          >
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg sm:rounded-xl shadow-2xl p-3 sm:p-4">
              <div className="flex items-start gap-2 sm:gap-3">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 0.5 }}
                >
                  <BellRing className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
                </motion.div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-sm sm:text-lg">Event Starting Soon!</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-white/80 hover:text-white hover:bg-white/20"
                      onClick={() => dismissNotification(activeNotifications[0].event.id)}
                    >
                      <X className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                  <p className="font-semibold text-white/90 truncate text-sm sm:text-base">{activeNotifications[0].event.title}</p>
                  <div className="flex items-center gap-1 sm:gap-2 mt-1 text-xs sm:text-sm">
                    <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-white/70" />
                    <span className="text-white/80">
                      Starts in <span className="font-bold text-white">{activeNotifications[0].minutesUntil} min</span>
                    </span>
                    <span className="text-white/70">
                      • {formatTime12Hour(activeNotifications[0].event.timeStart)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      
      <AddEventModal open={modalType === 'event'} onClose={closeModal} />
      
      <AddPersonnelModal 
        open={modalType === 'cto'} 
        onClose={closeModal} 
        type="CTO"
      />
      
      <AddPersonnelModal 
        open={modalType === 'wfh'} 
        onClose={closeModal} 
        type="WFH"
      />
      
      <AddPersonnelModal 
        open={modalType === 'travel'} 
        onClose={closeModal} 
        type="TRAVEL"
      />
      
      <AddProjectModal open={modalType === 'project'} onClose={closeModal} />
      
      {/* Edit Modals */}
      <EditEventModal 
        open={!!editingEvent} 
        onClose={() => setEditingEvent(null)} 
        event={editingEvent}
      />
      
      <EditPersonnelModal 
        open={!!editingPersonnel} 
        onClose={() => setEditingPersonnel(null)} 
        personnel={editingPersonnel}
      />
      
      <EditProjectModal 
        open={!!editingProject} 
        onClose={() => setEditingProject(null)} 
        project={editingProject}
      />
    </div>
  );
}
