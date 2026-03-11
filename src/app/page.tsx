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
  Pencil,
  Check,
  Droplets,
  Building2,
  Zap,
  ShieldAlert,
  Users,
  Car,
  MoreHorizontal,
  CloudSun,
  Thermometer,
  MapPin,
  Sun,
  Moon,
  Cloud,
  CloudRain,
  CloudFog,
  CloudLightning,
  CloudSnow,
  Wind,
  Umbrella
} from 'lucide-react';
import Image from 'next/image';
import { useScheduleStore } from '@/store/schedule-store';
import type { ScheduleEvent, PersonnelStatus, Project, TickerMessage, EventStatus, TransitionStyle, UrgentConcern, EventCategory } from '@/types/schedule';
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
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ChevronDown } from 'lucide-react';

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

// Event category configuration with icons
const EVENT_CATEGORIES: { value: EventCategory; label: string; color: string; icon: React.ReactNode }[] = [
  { value: 'water', label: 'Water', color: '#3b82f6', icon: <Droplets className="h-3 w-3" /> }, // blue
  { value: 'construction', label: 'Construction', color: '#6b7280', icon: <Building2 className="h-3 w-3" /> }, // gray
  { value: 'energy', label: 'Energy', color: '#eab308', icon: <Zap className="h-3 w-3" /> }, // yellow
  { value: 'disaster-mitigation', label: 'Disaster\nMitigation', color: '#a855f7', icon: <ShieldAlert className="h-3 w-3" /> }, // purple
  { value: 'human-security', label: 'Human\nSecurity', color: '#22c55e', icon: <Users className="h-3 w-3" /> }, // green
  { value: 'transport', label: 'Transport', color: '#f97316', icon: <Car className="h-3 w-3" /> }, // orange
  { value: 'others', label: 'Others', color: '#ef4444', icon: <MoreHorizontal className="h-3 w-3" /> }, // red
];

// Get sector color
const getSectorColor = (category?: EventCategory): string => {
  if (!category) return '#6b7280'; // default gray
  const cat = EVENT_CATEGORIES.find(c => c.value === category);
  return cat ? cat.color : '#6b7280';
};

// Get sector label
const getSectorLabel = (category?: EventCategory): string => {
  if (!category) return '';
  const cat = EVENT_CATEGORIES.find(c => c.value === category);
  return cat ? cat.label : '';
};

// Get sector icon
const getSectorIcon = (category?: EventCategory): React.ReactNode => {
  if (!category) return null;
  const cat = EVENT_CATEGORIES.find(c => c.value === category);
  return cat ? cat.icon : null;
};

// Get primary category for event (for border color)
const getPrimaryCategory = (event: ScheduleEvent): EventCategory | undefined => {
  const categories = getEventCategories(event);
  return categories.length > 0 ? categories[0] : undefined;
};

// Get all categories from an event (handles both old and new format)
const getEventCategories = (event: ScheduleEvent): EventCategory[] => {
  // If new categories array exists and has items, use it
  if (event.categories && event.categories.length > 0) {
    return event.categories;
  }
  // Fall back to old single category for backward compatibility
  if (event.category) {
    return [event.category];
  }
  return [];
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
  const [containerHeight, setContainerHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const scrollPositionRef = useRef(0);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isAnimatingRef = useRef(false);
  const contentResizeObserverRef = useRef<ResizeObserver | null>(null);

  // Check for overflow based on actual measured heights
  const checkOverflow = useCallback(() => {
    if (!containerRef.current) return;
    
    const containerHeightValue = containerRef.current.clientHeight;
    setContainerHeight(containerHeightValue);
    const calculatedItemsPerPage = Math.floor(containerHeightValue / itemHeight);
    setItemsPerPage(Math.max(1, calculatedItemsPerPage));
    
    // First try to measure original content (for gentle scroll mode with spacer/duplicates)
    let actualContentHeight = 0;
    const originalContentElement = containerRef.current.querySelector('[data-original-content]');
    
    if (originalContentElement) {
      // For gentle continuous scroll - measure only original items
      actualContentHeight = originalContentElement.scrollHeight;
    } else {
      // For other modes - measure the full content element
      const contentElement = containerRef.current.querySelector('[data-content-measure]');
      if (contentElement) {
        actualContentHeight = contentElement.scrollHeight;
      }
    }
    
    if (actualContentHeight > 0) {
      setContentHeight(actualContentHeight);
      
      // ONLY trigger transition if content actually exceeds container height
      // This handles cases where 2 items with long text overflow, 
      // or 7 short items don't overflow
      const contentExceedsContainer = actualContentHeight > containerHeightValue;
      setHasOverflow(contentExceedsContainer);
      
      // If no overflow, reset scroll position
      if (!contentExceedsContainer && containerRef.current) {
        containerRef.current.scrollTop = 0;
        scrollPositionRef.current = 0;
      }
    }
  }, [containerRef, itemHeight]);

  // Setup observers for container and content size changes
  useEffect(() => {
    // Initial check after DOM is ready
    const rafId = requestAnimationFrame(() => {
      checkOverflow();
    });
    
    // Observe container size changes
    let containerResizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      containerResizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(checkOverflow);
      });
      containerResizeObserver.observe(containerRef.current);
    }
    
    // Observe content size changes (handles text wrapping, dynamic content)
    const setupContentObserver = () => {
      if (contentResizeObserverRef.current) {
        contentResizeObserverRef.current.disconnect();
      }
      
      // Try to observe original content first (for gentle scroll mode)
      const originalContentElement = containerRef.current?.querySelector('[data-original-content]');
      const contentElement = containerRef.current?.querySelector('[data-content-measure]');
      
      if (typeof ResizeObserver !== 'undefined') {
        contentResizeObserverRef.current = new ResizeObserver(() => {
          requestAnimationFrame(checkOverflow);
        });
        
        // Observe whichever element exists
        if (originalContentElement) {
          contentResizeObserverRef.current.observe(originalContentElement);
        }
        if (contentElement && contentElement !== originalContentElement) {
          contentResizeObserverRef.current.observe(contentElement);
        }
      }
    };
    
    // Setup content observer after a short delay to ensure content is rendered
    const contentObserverTimeout = setTimeout(setupContentObserver, 100);
    
    window.addEventListener('resize', checkOverflow);
    
    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(contentObserverTimeout);
      window.removeEventListener('resize', checkOverflow);
      if (containerResizeObserver) {
        containerResizeObserver.disconnect();
      }
      if (contentResizeObserverRef.current) {
        contentResizeObserverRef.current.disconnect();
      }
    };
  }, [items.length, checkOverflow]);

  // Re-check overflow when items change (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      requestAnimationFrame(checkOverflow);
    }, 50);
    
    return () => clearTimeout(timeoutId);
  }, [items, checkOverflow]);

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
    // Only animate if content actually overflows the container
    if (!hasOverflow) {
      cleanupAnimations();
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
        scrollPositionRef.current = 0;
      }
      queueMicrotask(() => setCurrentPage(0));
      return;
    }
    if (settings.transitionStyle !== 'fade' && settings.transitionStyle !== 'slideUp' && settings.transitionStyle !== 'slideLeft') return;
    if (totalPages <= 1) return;

    cleanupAnimations();
    
    const duration = getPageDisplayDuration(settings.transitionSpeed);
    isAnimatingRef.current = true;
    
    intervalRef.current = setInterval(() => {
      if (!isAnimatingRef.current) return;
      // Check if overflow still exists before paginating
      if (containerRef.current) {
        // Try original content first, then fall back to content measure
        const originalContent = containerRef.current.querySelector('[data-original-content]');
        const contentElement = originalContent || containerRef.current.querySelector('[data-content-measure]');
        if (contentElement && contentElement.scrollHeight <= containerRef.current.clientHeight) {
          // Content no longer overflows, stop pagination
          queueMicrotask(() => setCurrentPage(0));
          return;
        }
      }
      setCurrentPage((prev) => (prev + 1) % totalPages);
    }, duration);

    return () => cleanupAnimations();
  }, [hasOverflow, settings.transitionStyle, settings.transitionSpeed, totalPages, itemsPerPage, cleanupAnimations]);

  // Continuous scroll for verticalAutoScroll and gentleContinuousScroll
  useEffect(() => {
    // Only start animation if content actually overflows
    if (!hasOverflow) {
      // Stop any running animation and reset scroll
      cleanupAnimations();
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
        scrollPositionRef.current = 0;
      }
      return;
    }
    if (settings.transitionStyle !== 'verticalAutoScroll' && settings.transitionStyle !== 'gentleContinuousScroll') return;
    if (!containerRef.current) return;

    cleanupAnimations();
    
    const container = containerRef.current;
    const scrollSpeed = getScrollSpeed(settings.transitionSpeed);
    
    if (settings.transitionStyle === 'gentleContinuousScroll') {
      // Smooth continuous scroll with seamless loop using spacer
      isAnimatingRef.current = true;
      lastTimeRef.current = 0;
      
      // Use measured content height from state (updated dynamically)
      // The reset point is content height + container height (spacer allows last item to fully exit)
      // Content structure: [items] + [spacer of containerHeight] + [items]
      // We reset when scroll reaches contentHeight + containerHeight (spacer has fully scrolled)
      const resetPoint = contentHeight + containerHeight;
      
      const animate = (timestamp: number) => {
        if (!isAnimatingRef.current) return;
        
        // Check if we still have overflow using original content (not spacer/duplicates)
        const originalContent = container.querySelector('[data-original-content]');
        const currentContentHeight = originalContent?.scrollHeight || 0;
        if (currentContentHeight > 0 && currentContentHeight <= container.clientHeight) {
          // Content no longer overflows, stop animation
          container.scrollTop = 0;
          scrollPositionRef.current = 0;
          return;
        }
        
        if (!lastTimeRef.current) {
          lastTimeRef.current = timestamp;
        }
        const delta = timestamp - lastTimeRef.current;
        lastTimeRef.current = timestamp;

        scrollPositionRef.current += (scrollSpeed * delta) / 1000;
        
        // When reaching the reset point, seamlessly reset to beginning
        // This allows the last item to fully exit before the first item appears
        if (scrollPositionRef.current >= resetPoint) {
          scrollPositionRef.current = 0;
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
        
        // Check if overflow still exists using original content
        const originalContent = currentContainer.querySelector('[data-original-content]');
        const contentElement = originalContent || currentContainer.querySelector('[data-content-measure]');
        if (contentElement && contentElement.scrollHeight <= currentContainer.clientHeight) {
          // Content no longer overflows, stop animation
          currentContainer.scrollTop = 0;
          scrollPositionRef.current = 0;
          return;
        }
        
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
  }, [hasOverflow, contentHeight, containerHeight, settings.transitionStyle, settings.transitionSpeed, settings.smoothScrollEnabled, itemHeight, cleanupAnimations]);

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
    itemsPerPage,
    containerHeight,
    contentHeight
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

// Weather Widget Component
interface WeatherData {
  temp: number;
  condition: string;
  location: string;
  humidity: number;
  windSpeed: number;
}

function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData>({
    temp: 28,
    condition: 'Loading...',
    location: 'Manila, PH',
    humidity: 0,
    windSpeed: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        // You can change lat/lon to your specific location
        // Manila: lat=14.5995, lon=120.9842
        const response = await fetch('/api/weather?lat=14.5995&lon=120.9842&location=Manila, PH');
        const data = await response.json();
        setWeather(data);
      } catch (error) {
        console.error('Failed to fetch weather:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
    
    // Refresh weather every 5 minutes
    const interval = setInterval(fetchWeather, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Get weather icon based on condition - Google style
  const getWeatherIcon = () => {
    const condition = weather.condition.toLowerCase();
    
    // Clear / Sunny
    if (condition.includes('clear') || condition === 'sunny') {
      return <Sun className="h-5 w-5 text-yellow-500" />;
    }
    
    // Mostly Sunny
    if (condition.includes('mostly sunny')) {
      return <CloudSun className="h-5 w-5 text-yellow-400" />;
    }
    
    // Partly Cloudy
    if (condition.includes('partly cloudy')) {
      return <CloudSun className="h-5 w-5 text-gray-400" />;
    }
    
    // Cloudy / Overcast
    if (condition.includes('cloudy') || condition.includes('overcast')) {
      return <Cloud className="h-5 w-5 text-gray-500" />;
    }
    
    // Fog
    if (condition.includes('fog')) {
      return <CloudFog className="h-5 w-5 text-gray-400" />;
    }
    
    // Rain / Showers / Drizzle
    if (condition.includes('rain') || condition.includes('shower') || condition.includes('drizzle')) {
      return <CloudRain className="h-5 w-5 text-blue-500" />;
    }
    
    // Thunderstorm
    if (condition.includes('thunder') || condition.includes('storm')) {
      return <CloudLightning className="h-5 w-5 text-yellow-600" />;
    }
    
    // Snow
    if (condition.includes('snow')) {
      return <CloudSnow className="h-5 w-5 text-blue-300" />;
    }
    
    // Default
    return <Sun className="h-5 w-5 text-yellow-500" />;
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border border-blue-100 dark:border-blue-800">
      {loading ? (
        <div className="h-5 w-5 animate-pulse bg-muted rounded-full" />
      ) : (
        getWeatherIcon()
      )}
      <div className="flex items-center gap-1.5 text-xs">
        <span className="font-bold text-foreground">{weather.temp}°</span>
        <span className="text-muted-foreground hidden sm:inline">{weather.condition}</span>
      </div>
    </div>
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
      <header className="w-full bg-card border-b border-border relative overflow-hidden">
        <div className="relative px-2 sm:px-4 py-2">
          {/* Mobile Layout */}
          <div className="flex flex-col gap-1 sm:hidden">
            {/* Title Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Image 
                  src="/pcieerd-icon.png" 
                  alt="PCIEERD Logo" 
                  width={32}
                  height={32}
                  className="rounded"
                />
                <div>
                  <h1 className="text-base font-black tracking-wide leading-tight
                    bg-gradient-to-r from-[#0033A0] to-[#0047D2]
                    dark:from-blue-400 dark:to-blue-300
                    bg-clip-text text-transparent">
                    EUSTDD SCHEDULE
                  </h1>
                  <p className="text-[10px] text-muted-foreground font-medium">Department of Science & Technology</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {/* View Mode Dropdown - Mobile */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="h-7 w-7">
                      <CalendarIcon className="h-3.5 w-3.5" />
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
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onClick={() => handleProtectedAction(() => onAddEntry('event'), 'add', 'event')}>Add Event</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleProtectedAction(() => onAddEntry('ctoWfh'), 'add', 'ctoWfh')}>Add CTO/Leave & WFH</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleProtectedAction(() => onAddEntry('travel'), 'add', 'travel')}>Add In Travel</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleProtectedAction(() => onAddEntry('otherDivision'), 'add', 'otherDivision')}>Add Other Division Request</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleProtectedAction(() => onAddEntry('urgentConcern'), 'add', 'urgentConcern')}>Add Urgent Concern</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleProtectedAction(() => onAddEntry('project'), 'add', 'project')}>Add Project</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleProtectedAction(() => onAddEntry('ticker'), 'add', 'ticker')}>Add Renewing Project</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                {/* Settings Button - Mobile */}
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleProtectedAction(onOpenSettings, 'settings')}>
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Date & Time Row - Mobile */}
            <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <CalendarIcon className="h-3 w-3" />
                {format(currentTime, 'MMM d, yyyy')}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span className="font-mono tabular-nums">{format(currentTime, 'hh:mm:ss aa')}</span>
              </span>
            </div>
          </div>
          
          {/* Desktop/Tablet Layout */}
          <div className="hidden sm:flex items-center justify-between gap-4 relative">
            {/* Logo & Title - Left Side */}
            <div className="flex items-center gap-3 flex-shrink-0 z-10">
              <Image 
                src="/pcieerd-icon.png" 
                alt="PCIEERD Logo" 
                width={48}
                height={48}
                className="rounded-lg shadow-sm"
              />
              <div>
                <h1 className="text-xl lg:text-2xl font-black tracking-wide leading-tight
                  bg-gradient-to-r from-[#0033A0] via-[#0047D2] to-[#0033A0] 
                  dark:from-blue-400 dark:via-blue-300 dark:to-blue-400
                  bg-clip-text text-transparent drop-shadow-sm">
                  EUSTDD SCHEDULE
                </h1>
                <p className="text-xs text-muted-foreground hidden sm:block font-medium tracking-wide">
                  Energy and Utilities Systems Technology Development Division
                </p>
              </div>
            </div>
            
            {/* Date & Time & Weather - Center (absolute positioned for true center) */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center gap-0.5">
              {/* Time */}
              <div className="flex items-center gap-1 text-sm lg:text-base text-muted-foreground">
                <Clock className="h-4 w-4 text-red-600" />
                <span className="font-mono tabular-nums font-semibold text-foreground">{format(currentTime, 'hh:mm:ss aa')}</span>
              </div>
              {/* Date and Weather side by side */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <CalendarIcon className="h-3 w-3 text-blue-600" />
                  <span className="font-medium text-foreground">{format(currentTime, 'EEE, MMM d, yyyy')}</span>
                </div>
                <WeatherWidget />
              </div>
            </div>
            
            {/* Right Side Controls */}
            <div className="flex items-center gap-2 flex-shrink-0 z-10 ml-auto">
              {/* View Mode Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-8 px-3 gap-1.5 shadow-sm">
                    <CalendarIcon className="h-4 w-4" />
                    <span className="text-sm">{getViewModeLabel()}</span>
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
                  <Button className="h-8 px-3 gap-1.5 shadow-sm bg-gradient-to-r from-[#0033A0] to-[#0047D2] hover:from-[#002880] hover:to-[#0033A0]">
                    <Plus className="h-4 w-4" />
                    <span className="text-sm">Add</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem className="text-sm py-2" onClick={() => handleProtectedAction(() => onAddEntry('event'), 'add', 'event')}>Add Event</DropdownMenuItem>
                  <DropdownMenuItem className="text-sm py-2" onClick={() => handleProtectedAction(() => onAddEntry('ctoWfh'), 'add', 'ctoWfh')}>Add CTO/Leave & WFH</DropdownMenuItem>
                  <DropdownMenuItem className="text-sm py-2" onClick={() => handleProtectedAction(() => onAddEntry('travel'), 'add', 'travel')}>Add In Travel</DropdownMenuItem>
                  <DropdownMenuItem className="text-sm py-2" onClick={() => handleProtectedAction(() => onAddEntry('otherDivision'), 'add', 'otherDivision')}>Add Other Division Request</DropdownMenuItem>
                  <DropdownMenuItem className="text-sm py-2" onClick={() => handleProtectedAction(() => onAddEntry('urgentConcern'), 'add', 'urgentConcern')}>Add Urgent Concern</DropdownMenuItem>
                  <DropdownMenuItem className="text-sm py-2" onClick={() => handleProtectedAction(() => onAddEntry('project'), 'add', 'project')}>Add Project</DropdownMenuItem>
                  <DropdownMenuItem className="text-sm py-2" onClick={() => handleProtectedAction(() => onAddEntry('ticker'), 'add', 'ticker')}>Add Renewing Project</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* Settings Button */}
              <Button variant="outline" size="icon" onClick={() => handleProtectedAction(onOpenSettings, 'settings')} className="h-8 w-8 shadow-sm">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
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

// Status indicator with icons and animations
function StatusIndicator({ status, size = 'md', className = '' }: { status: EventStatus; size?: 'xs' | 'sm' | 'md' | 'lg'; className?: string }) {
  const { settings } = useScheduleStore();
  const colors = settings.statusColors;
  
  const sizeClasses = {
    xs: 'w-4 h-4',
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-7 h-7',
  };
  
  const iconSizeClasses = {
    xs: 'h-2.5 w-2.5',
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
  };

  if (status === 'completed') {
    return (
      <span 
        className={`inline-flex items-center justify-center rounded-full shadow-md ${sizeClasses[size]} ${className}`}
        style={{ backgroundColor: colors.completed, boxShadow: `0 4px 6px -1px ${colors.completed}40` }}
      >
        <Check className={`${iconSizeClasses[size]} text-white`} />
      </span>
    );
  }
  
  if (status === 'ongoing') {
    return (
      <span 
        className={`inline-flex items-center justify-center rounded-full ${sizeClasses[size]} ${className} relative shadow-lg`}
        style={{ backgroundColor: colors.ongoing, boxShadow: `0 4px 6px -1px ${colors.ongoing}40` }}
      >
        <span className="absolute inset-0 rounded-full animate-ping opacity-80" style={{ backgroundColor: colors.ongoing }} />
        <span className="absolute inset-0 rounded-full animate-pulse opacity-50" style={{ backgroundColor: colors.ongoing }} />
        <span className={`${iconSizeClasses[size]} rounded-full bg-white relative z-10 shadow-sm`} />
      </span>
    );
  }
  
  // upcoming
  return (
    <span 
      className={`inline-flex items-center justify-center rounded-full shadow-md ${sizeClasses[size]} ${className}`}
      style={{ backgroundColor: colors.upcoming, boxShadow: `0 4px 6px -1px ${colors.upcoming}40` }}
    >
      <Clock className={`${iconSizeClasses[size]} text-white`} />
    </span>
  );
}

// Legacy StatusDot for backward compatibility
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
  const eventCategories = getEventCategories(event);
  const isAllDay = event.timeStart === '00:00' && event.timeEnd === '23:59';
  
  const variants = getTransitionVariants(transitionStyle, transitionSpeed);

  const content = (
    <motion.div 
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      layout
      whileHover={{ scale: 1.01, y: -1 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 py-2.5 px-3 sm:px-4 rounded-xl group transition-all duration-300 overflow-hidden relative
        bg-gradient-to-r from-gray-50/80 to-gray-100/40 dark:from-gray-900/80 dark:to-gray-900/40
        border border-gray-200/40 dark:border-gray-700/50
        hover:shadow-lg hover:shadow-gray-200/10 dark:hover:shadow-gray-900/30
        hover:border-gray-300/50 dark:hover:border-gray-600/50
        backdrop-blur-sm"
    >
      {/* Mobile Layout */}
      <div className="flex items-start gap-2 flex-1 min-w-0 sm:hidden">
        <div className="flex-1 min-w-0 w-full">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                {eventCategories.length > 0 && eventCategories.map((cat) => (
                  <span 
                    key={cat}
                    className="text-[10px] px-2 py-0.5 rounded-full text-white font-medium flex-shrink-0 min-w-[70px] text-center"
                    style={{ backgroundColor: getSectorColor(cat) }}
                  >
                    {getSectorLabel(cat)}
                  </span>
                ))}
              </div>
              <span className="font-medium text-sm text-foreground break-words">{event.title}</span>
            </div>
            <div className="flex flex-col gap-0.5 flex-shrink-0">
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
          <div className="flex items-center gap-2 text-muted-foreground text-xs mt-1">
            <StatusIndicator status={status} size="sm" />
            {showDate && <span>{format(parseISO(event.dateStarted), 'MMM d')}</span>}
            <div className="flex flex-col items-start">
              {isAllDay ? (
                <span>All Day</span>
              ) : (
                <>
                  <span>{formatTime12Hour(event.timeStart)}</span>
                  <span>{formatTime12Hour(event.timeEnd)}</span>
                </>
              )}
            </div>
          </div>
          {event.details && (
            <div className="text-muted-foreground text-xs mt-1 break-words">{event.details}</div>
          )}
        </div>
      </div>
      
      {/* Desktop Layout: Sector | Title | Status+Time | Details */}
      {/* Sector Column - 10% */}
      <div className="hidden sm:flex items-center justify-center flex-[0_0_10%] overflow-hidden flex-wrap gap-0.5">
        {eventCategories.length > 0 && eventCategories.map((cat) => (
          <span 
            key={cat}
            className="text-[10px] px-1 py-0.5 rounded-full text-white font-medium whitespace-pre-line text-center leading-tight min-w-[70px]"
            style={{ backgroundColor: getSectorColor(cat) }}
          >
            {getSectorLabel(cat)}
          </span>
        ))}
      </div>
      
      {/* Title Column - 45% */}
      <div className="hidden sm:flex items-center flex-[0_0_45%] min-w-0">
        <span className="font-medium text-base lg:text-lg text-foreground break-words">{event.title}</span>
      </div>
      
      {/* Time Column with Status Indicator - 11% - Right Aligned, Vertical Time */}
      <div className="hidden sm:flex items-center gap-1.5 flex-[0_0_11%] justify-end overflow-hidden">
        <StatusIndicator status={status} size="xs" />
        <div className="flex flex-col items-end text-right min-w-0">
          {showDate && (
            <span className="text-muted-foreground text-[10px] whitespace-nowrap">
              {format(parseISO(event.dateStarted), 'MMM d')}
            </span>
          )}
          {isAllDay ? (
            <span className="text-muted-foreground text-xs whitespace-nowrap">All Day</span>
          ) : (
            <>
              <span className="text-muted-foreground text-xs whitespace-nowrap leading-tight">
                {formatTime12Hour(event.timeStart)}
              </span>
              <span className="text-muted-foreground text-xs whitespace-nowrap leading-tight">
                {formatTime12Hour(event.timeEnd)}
              </span>
            </>
          )}
        </div>
      </div>
      
      {/* Details Column - 34% */}
      <div className="hidden sm:flex items-center gap-2 flex-[0_0_34%] justify-end min-w-0 pr-2">
        {event.details && (
          <div className="text-muted-foreground text-xs lg:text-sm text-right break-words flex-1 min-w-0">
            {event.details}
          </div>
        )}
        <div className="flex flex-col gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 hover:bg-muted"
              onClick={onEdit}
            >
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          )}
          {onDelete && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 hover:bg-muted"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );

  // Wrap with context menu if actions are available
  if (onEdit || onDelete) {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          {content}
        </ContextMenuTrigger>
        <ContextMenuContent>
          {onEdit && (
            <ContextMenuItem onClick={onEdit}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit Event
            </ContextMenuItem>
          )}
          {onDelete && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Event
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>
    );
  }

  return content;
}

// Schedule Panel Component
function SchedulePanel({ 
  title, 
  date, 
  events,
  onDeleteEvent,
  onEditEvent,
  onDoubleClick,
  showDate = false
}: { 
  title: string;
  date: string;
  events: ScheduleEvent[];
  onDeleteEvent?: (id: string) => void;
  onEditEvent?: (event: ScheduleEvent) => void;
  onDoubleClick?: () => void;
  showDate?: boolean;
}) {
  const { settings } = useScheduleStore();
  const transitionSpeed = getTransitionSpeed(settings.transitionSpeed, settings.customTransitionSeconds);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Use overflow transition hook (item height: 20px font * 2 lines + padding = ~50px per item)
  const { currentItems, hasOverflow, currentPage, totalPages, containerHeight } = useOverflowTransition(
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
  
  // For gentle continuous scroll, we don't duplicate items - we use CSS spacer instead
  const isGentleScroll = settings.transitionStyle === 'gentleContinuousScroll';
  
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
    <div 
      className="h-full flex flex-col overflow-hidden cursor-pointer rounded-2xl
        bg-gradient-to-br from-gray-100/80 via-gray-50/60 to-gray-100/40 
        dark:from-gray-900/90 dark:via-gray-900/70 dark:to-gray-900/50
        border border-gray-200/60 dark:border-gray-700/50
        shadow-xl shadow-gray-200/10 dark:shadow-gray-900/30
        backdrop-blur-md transition-all duration-300
        hover:shadow-2xl hover:shadow-gray-300/20 dark:hover:shadow-gray-800/40"
      onDoubleClick={onDoubleClick}
    >
      {/* Header with distinct styling */}
      <div className="px-3 py-2.5 
        bg-gradient-to-r from-slate-200/90 via-slate-100/70 to-slate-50/50 
        dark:from-slate-800/80 dark:via-slate-800/60 dark:to-slate-900/40
        border-b-2 border-slate-300/60 dark:border-slate-600/50
        flex items-center justify-between rounded-t-2xl
        shadow-sm relative overflow-hidden">
        {/* Subtle accent line at top */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 opacity-60" />
        <div className="flex items-center gap-2">
          <h2 className="text-base sm:text-lg lg:text-xl font-bold tracking-wide
            text-slate-800 dark:text-slate-100 drop-shadow-sm">{title}</h2>
          <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 
            text-xs font-bold rounded-full 
            bg-gradient-to-r from-blue-500 to-cyan-500 text-white
            shadow-md shadow-blue-500/20">
            {events.length}
          </span>
        </div>
        <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 hidden sm:block font-medium">{date}</p>
      </div>
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto p-2 sm:p-3 scrollbar-hide space-y-2
          bg-gradient-to-b from-transparent via-slate-50/30 to-transparent dark:via-slate-900/20"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {events.length === 0 ? (
          <div className="flex items-center justify-center h-16" />
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
              {renderItems.map((event, index) => (
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
            {/* Original items - this is what we measure for overflow detection */}
            <div data-original-content>
              {events.map((event, index) => (
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
            {/* Spacer - allows last item to fully exit before first item appears */}
            {isGentleScroll && hasOverflow && (
              <div style={{ height: containerHeight }} aria-hidden="true" />
            )}
            {/* Duplicate items for seamless loop */}
            {isGentleScroll && hasOverflow && events.map((event, index) => (
              <EventRow 
                key={`${event.id}-dup-${index}`} 
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
function PersonnelStatusPanel({ 
  onDeletePersonnel, 
  onEditPersonnel,
  onAddCtoWfh,
  onAddTravel,
  onAddOther
}: { 
  onDeletePersonnel: (id: string) => void;
  onEditPersonnel: (personnel: PersonnelStatus) => void;
  onAddCtoWfh: () => void;
  onAddTravel: () => void;
  onAddOther: () => void;
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
  
  const otherPersonnel = personnelStatuses.filter(
    (p) => p.type === 'OTHER' && isDateInRange(p.dateStart, p.dateEnd, today)
  );
  
  // Combined CTO/LEAVE & WFH personnel
  const ctoLeaveWfhPersonnel = [...ctoflPersonnel, ...wfhPersonnel];

  return (
    <div className="h-full flex flex-col overflow-hidden rounded-2xl
      bg-gradient-to-br from-gray-100/80 via-gray-50/60 to-gray-100/40 
      dark:from-gray-900/90 dark:via-gray-900/70 dark:to-gray-900/50
      border border-gray-200/60 dark:border-gray-700/50
      shadow-xl shadow-gray-200/10 dark:shadow-gray-900/30
      backdrop-blur-md transition-all duration-300
      hover:shadow-2xl hover:shadow-gray-300/30 dark:hover:shadow-gray-800/40">
      <div className="flex-1 flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-gray-200/30 dark:divide-gray-700/30 overflow-hidden">
        {/* Combined CTO/LEAVE & WFH Column - 30% */}
        <div className="sm:w-[30%] flex-shrink-0 overflow-hidden">
          <PersonnelColumn 
            title="CTO/LEAVE & WFH" 
            personnel={ctoLeaveWfhPersonnel} 
            settings={settings}
            onDeletePersonnel={onDeletePersonnel}
            onEditPersonnel={onEditPersonnel}
            onDoubleClick={onAddCtoWfh}
          />
        </div>
        
        {/* IN TRAVEL Column - 30% */}
        <div className="sm:w-[30%] flex-shrink-0 overflow-hidden">
          <PersonnelColumn 
            title="IN TRAVEL" 
            personnel={travelPersonnel} 
            settings={settings}
            onDeletePersonnel={onDeletePersonnel}
            onEditPersonnel={onEditPersonnel}
            onDoubleClick={onAddTravel}
          />
        </div>
        
        {/* Other Division Requests Column - 40% */}
        <div className="sm:w-[40%] flex-shrink-0 overflow-hidden">
          <PersonnelColumn 
            title="OTHER DIVISION REQUESTS" 
            personnel={otherPersonnel} 
            settings={settings}
            onDeletePersonnel={onDeletePersonnel}
            onEditPersonnel={onEditPersonnel}
            onDoubleClick={onAddOther}
          />
        </div>
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
  onEditPersonnel,
  onDoubleClick
}: { 
  title: string;
  personnel: PersonnelStatus[];
  settings: { transitionStyle: TransitionStyle; transitionSpeed: string; smoothScrollEnabled: boolean; customTransitionSeconds: number };
  onDeletePersonnel: (id: string) => void;
  onEditPersonnel: (personnel: PersonnelStatus) => void;
  onDoubleClick: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const transitionSpeed = getTransitionSpeed(settings.transitionSpeed, settings.customTransitionSeconds);
  
  // Personnel item height: 18px name + 12px date + padding = ~48px
  const { currentItems, hasOverflow, currentPage, totalPages, containerHeight } = useOverflowTransition(
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

  // For gentle continuous scroll, we don't duplicate items - we use CSS spacer instead
  const isGentleScroll = settings.transitionStyle === 'gentleContinuousScroll';

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
    <div 
      className="flex flex-col overflow-hidden h-full cursor-pointer"
      onDoubleClick={onDoubleClick}
    >
      <div className="px-2 py-2 
        bg-gradient-to-r from-slate-200/90 via-slate-100/70 to-slate-50/50 
        dark:from-slate-800/80 dark:via-slate-800/60 dark:to-slate-900/40
        border-b-2 border-slate-300/60 dark:border-slate-600/50
        flex-shrink-0 flex items-center justify-center shadow-sm relative overflow-hidden" style={{ height: '52px' }}>
        {/* Subtle accent line at top */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-slate-400 via-gray-400 to-slate-400 opacity-60" />
        <div className="flex items-center justify-center gap-2 w-full">
          <h3 className="text-xs sm:text-sm lg:text-base font-bold tracking-wide text-center leading-tight line-clamp-2 flex-1
            text-slate-800 dark:text-slate-100">{title}</h3>
          <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 
            text-xs font-bold rounded-full 
            bg-gradient-to-r from-slate-500 to-gray-600 text-white
            shadow-md shadow-slate-500/20 flex-shrink-0">
            {personnel.length}
          </span>
        </div>
      </div>
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto p-1.5 scrollbar-hide min-h-0 space-y-1.5
          bg-gradient-to-b from-transparent via-slate-50/20 to-transparent dark:via-slate-900/10"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {personnel.length === 0 ? (
          <div className="text-center py-4" />
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
              {renderItems.map((p, index) => (
                <PersonnelItemCompact key={`${p.id}-${index}`} item={p} onDelete={() => onDeletePersonnel(p.id)} onEdit={() => onEditPersonnel(p)} />
              ))}
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="space-y-0.5" data-content-measure>
            {/* Original items - this is what we measure for overflow detection */}
            <div data-original-content>
              {personnel.map((p, index) => (
                <PersonnelItemCompact key={`${p.id}-${index}`} item={p} onDelete={() => onDeletePersonnel(p.id)} onEdit={() => onEditPersonnel(p)} />
              ))}
            </div>
            {/* Spacer - allows last item to fully exit before first item appears */}
            {isGentleScroll && hasOverflow && (
              <div style={{ height: containerHeight }} aria-hidden="true" />
            )}
            {/* Duplicate items for seamless loop */}
            {isGentleScroll && hasOverflow && personnel.map((p, index) => (
              <PersonnelItemCompact key={`${p.id}-dup-${index}`} item={p} onDelete={() => onDeletePersonnel(p.id)} onEdit={() => onEditPersonnel(p)} />
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

  // Get type badge info for CTO/WFH
  const getTypeBadge = () => {
    if (item.type === 'CTO' || item.type === 'FL') {
      return {
        label: 'CTO/Leave',
        className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      };
    } else if (item.type === 'WFH') {
      return {
        label: 'WFH',
        className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      };
    }
    return null;
  };

  const typeBadge = getTypeBadge();

  const content = (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      whileHover={{ scale: 1.02, y: -1 }}
      transition={{ duration: 0.2 }}
      className="flex items-start justify-between gap-2 py-2 px-2.5 rounded-lg group transition-all duration-300
        bg-gradient-to-r from-white/80 to-white/40 dark:from-gray-800/80 dark:to-gray-800/40
        border border-gray-200/30 dark:border-gray-700/30
        hover:shadow-md hover:shadow-gray-200/20 dark:hover:shadow-gray-900/30
        hover:border-gray-300/50 dark:hover:border-gray-600/50
        backdrop-blur-sm"
    >
      <div className="flex-1 min-w-0 flex items-start gap-2">
        <div className="flex flex-col min-w-0 flex-1">
          <span className="font-semibold text-sm sm:text-base text-foreground line-clamp-2 break-words">{item.name}</span>
          {item.type !== 'OTHER' && (
            <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">
              {formatDateRange(item.dateStart, item.dateEnd)}
            </span>
          )}
          {item.location && (
            <span className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1">{item.location}</span>
          )}
        </div>
        {typeBadge && (
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 mt-0.5 shadow-sm ${typeBadge.className}`}>
            {typeBadge.label}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-0.5 flex-shrink-0">
        {onEdit && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-200/50 dark:hover:bg-gray-700/50"
            onClick={onEdit}
          >
            <Pencil className="h-3 w-3 text-muted-foreground" />
          </Button>
        )}
        {onDelete && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100 dark:hover:bg-red-900/30"
            onClick={onDelete}
          >
            <Trash2 className="h-3 w-3 text-destructive" />
          </Button>
        )}
      </div>
    </motion.div>
  );

  // Wrap with context menu if actions are available
  if (onEdit || onDelete) {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          {content}
        </ContextMenuTrigger>
        <ContextMenuContent>
          {onEdit && (
            <ContextMenuItem onClick={onEdit}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </ContextMenuItem>
          )}
          {onDelete && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>
    );
  }

  return content;
}

// Project Item Component
function ProjectItem({ 
  project, 
  onDelete,
  onEdit 
}: { 
  project: Project;
  onDelete?: () => void;
  onEdit?: () => void;
}) {
  const content = (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex items-center justify-between py-2 px-2 sm:px-3 hover:bg-muted/50 rounded group transition-colors gap-2"
    >
      <span className="font-medium text-sm sm:text-base lg:text-[18px] text-foreground flex-1 line-clamp-2 break-words">{project.name}</span>
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Number display */}
        <span className="min-w-[32px] text-center text-base font-bold text-foreground tabular-nums">
          {project.number}
        </span>
        <div className="flex flex-col gap-0.5">
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

  // Wrap with context menu if actions are available
  if (onEdit || onDelete) {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          {content}
        </ContextMenuTrigger>
        <ContextMenuContent>
          {onEdit && (
            <ContextMenuItem onClick={onEdit}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit Project
            </ContextMenuItem>
          )}
          {onDelete && (
            <>
              {onEdit && <ContextMenuSeparator />}
              <ContextMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Project
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>
    );
  }

  return content;
}

// Urgent Concern Item Component
function UrgentConcernItem({ 
  concern, 
  onDelete,
  onEdit 
}: { 
  concern: UrgentConcern;
  onDelete?: () => void;
  onEdit?: () => void;
}) {
  const content = (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex items-center justify-between py-2 px-2 sm:px-3 hover:bg-muted/50 rounded group transition-colors"
    >
      <div className="flex-1 min-w-0">
        <span className="font-medium text-sm sm:text-base lg:text-[18px] text-foreground line-clamp-2 break-words block">{concern.title}</span>
        {concern.description && (
          <span className="text-xs sm:text-sm text-muted-foreground line-clamp-2 break-words block">{concern.description}</span>
        )}
      </div>
      <div className="flex flex-col gap-0.5 flex-shrink-0 ml-2">
        {onEdit && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={onEdit}
          >
            <Pencil className="h-4 w-4 text-muted-foreground" />
          </Button>
        )}
        {onDelete && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
      </div>
    </motion.div>
  );

  // Wrap with context menu if actions are available
  if (onEdit || onDelete) {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          {content}
        </ContextMenuTrigger>
        <ContextMenuContent>
          {onEdit && (
            <ContextMenuItem onClick={onEdit}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit Concern
            </ContextMenuItem>
          )}
          {onDelete && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Concern
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>
    );
  }

  return content;
}

// Urgent Concern Column with overflow transition
function UrgentConcernColumn({ 
  concerns, 
  settings,
  onDeleteConcern,
  onEditConcern,
  onDoubleClick
}: { 
  concerns: UrgentConcern[];
  settings: { transitionStyle: TransitionStyle; transitionSpeed: string; smoothScrollEnabled: boolean; customTransitionSeconds: number };
  onDeleteConcern: (id: string) => void;
  onEditConcern: (concern: UrgentConcern) => void;
  onDoubleClick: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const transitionSpeed = getTransitionSpeed(settings.transitionSpeed, settings.customTransitionSeconds);
  
  // Concern item height: ~48px
  const { currentItems, hasOverflow, currentPage, totalPages, containerHeight } = useOverflowTransition(
    concerns,
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

  const renderItems = hasOverflow && isPaginationMode ? currentItems : concerns;

  // For gentle continuous scroll, we don't duplicate items - we use CSS spacer instead
  const isGentleScroll = settings.transitionStyle === 'gentleContinuousScroll';

  // Use a stable key that changes when page content changes
  const contentKey = isGentleScroll 
    ? 'continuous-scroll' 
    : (isPaginationMode && hasOverflow 
      ? `page-${currentPage}-${totalPages}-${currentItems.map(c => c.id).join('-')}` 
      : `all-${concerns.map(c => c.id).join('-')}`);
  
  // For gentle continuous scroll, don't use AnimatePresence to avoid interrupting the scroll
  const shouldUseAnimatePresence = !isGentleScroll;

  return (
    <div 
      className="flex flex-col overflow-hidden h-full cursor-pointer"
      onDoubleClick={onDoubleClick}
    >
      <div className="px-2 py-2 
        bg-gradient-to-r from-red-100/90 via-red-50/70 to-orange-50/50 
        dark:from-red-900/40 dark:via-red-900/30 dark:to-red-950/20
        border-b-2 border-red-300/60 dark:border-red-700/50
        flex-shrink-0 shadow-sm relative overflow-hidden">
        {/* Subtle accent line at top */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-500 via-orange-500 to-red-500 opacity-80" />
        <div className="flex items-center justify-center gap-2">
          <h3 className="text-base sm:text-lg lg:text-xl font-bold tracking-wide uppercase
            text-red-700 dark:text-red-300">URGENT CONCERNS</h3>
          <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 
            text-xs font-bold rounded-full 
            bg-gradient-to-r from-red-500 to-orange-500 text-white
            shadow-md shadow-red-500/20">
            {concerns.length}
          </span>
        </div>
      </div>
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto p-1 scrollbar-hide min-h-0
          bg-gradient-to-b from-transparent via-red-50/10 to-transparent dark:via-red-950/10"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {concerns.length === 0 ? (
          <div className="text-center py-4" />
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
              {renderItems.map((concern, index) => (
                <UrgentConcernItem key={`${concern.id}-${index}`} concern={concern} onDelete={() => onDeleteConcern(concern.id)} onEdit={() => onEditConcern(concern)} />
              ))}
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="space-y-0.5" data-content-measure>
            {/* Original items - this is what we measure for overflow detection */}
            <div data-original-content>
              {concerns.map((concern, index) => (
                <UrgentConcernItem key={`${concern.id}-${index}`} concern={concern} onDelete={() => onDeleteConcern(concern.id)} onEdit={() => onEditConcern(concern)} />
              ))}
            </div>
            {/* Spacer - allows last item to fully exit before first item appears */}
            {isGentleScroll && hasOverflow && (
              <div style={{ height: containerHeight }} aria-hidden="true" />
            )}
            {/* Duplicate items for seamless loop */}
            {isGentleScroll && hasOverflow && concerns.map((concern, index) => (
              <UrgentConcernItem key={`${concern.id}-dup-${index}`} concern={concern} onDelete={() => onDeleteConcern(concern.id)} onEdit={() => onEditConcern(concern)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Project Column with overflow transition
function ProjectColumn({ 
  projects, 
  settings,
  onDeleteProject,
  onEditProject,
  onDoubleClick
}: { 
  projects: Project[];
  settings: { transitionStyle: TransitionStyle; transitionSpeed: string; smoothScrollEnabled: boolean; customTransitionSeconds: number };
  onDeleteProject: (id: string) => void;
  onEditProject: (project: Project) => void;
  onDoubleClick: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const transitionSpeed = getTransitionSpeed(settings.transitionSpeed, settings.customTransitionSeconds);
  
  // Project item height: ~52px
  const { currentItems, hasOverflow, currentPage, totalPages, containerHeight } = useOverflowTransition(
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

  // For gentle continuous scroll, we don't duplicate items - we use CSS spacer instead
  const isGentleScroll = settings.transitionStyle === 'gentleContinuousScroll';

  // Use a stable key that changes when page content changes
  const contentKey = isGentleScroll 
    ? 'continuous-scroll' 
    : (isPaginationMode && hasOverflow 
      ? `page-${currentPage}-${totalPages}-${currentItems.map(p => p.id).join('-')}` 
      : `all-${projects.map(p => p.id).join('-')}`);
  
  // For gentle continuous scroll, don't use AnimatePresence to avoid interrupting the scroll
  const shouldUseAnimatePresence = !isGentleScroll;

  return (
    <div 
      className="flex flex-col overflow-hidden h-full cursor-pointer"
      onDoubleClick={onDoubleClick}
    >
      <div className="px-2 py-2 
        bg-gradient-to-r from-green-100/90 via-green-50/70 to-emerald-50/50 
        dark:from-green-900/40 dark:via-green-900/30 dark:to-green-950/20
        border-b-2 border-green-300/60 dark:border-green-700/50
        flex-shrink-0 shadow-sm relative overflow-hidden">
        {/* Subtle accent line at top */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-500 via-emerald-500 to-green-500 opacity-80" />
        <div className="flex items-center justify-center gap-2">
          <h3 className="text-base sm:text-lg lg:text-xl font-bold tracking-wide uppercase
            text-green-700 dark:text-green-300">ONGOING PROJECT REQUESTS</h3>
          <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 
            text-xs font-bold rounded-full 
            bg-gradient-to-r from-green-500 to-emerald-500 text-white
            shadow-md shadow-green-500/20">
            {projects.length}
          </span>
        </div>
      </div>
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto p-1.5 scrollbar-hide min-h-0 space-y-1.5
          bg-gradient-to-b from-transparent via-green-50/10 to-transparent dark:via-green-950/10"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {projects.length === 0 ? (
          <div className="text-center py-4" />
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
              {renderItems.map((project, index) => (
                <ProjectItem 
                  key={`${project.id}-${index}`} 
                  project={project} 
                  onDelete={() => onDeleteProject(project.id)} 
                  onEdit={() => onEditProject(project)} 
                />
              ))}
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="space-y-0.5" data-content-measure>
            {/* Original items - this is what we measure for overflow detection */}
            <div data-original-content>
              {projects.map((project, index) => (
                <ProjectItem 
                  key={`${project.id}-${index}`} 
                  project={project} 
                  onDelete={() => onDeleteProject(project.id)} 
                  onEdit={() => onEditProject(project)} 
                />
              ))}
            </div>
            {/* Spacer - allows last item to fully exit before first item appears */}
            {isGentleScroll && hasOverflow && (
              <div style={{ height: containerHeight }} aria-hidden="true" />
            )}
            {/* Duplicate items for seamless loop */}
            {isGentleScroll && hasOverflow && projects.map((project, index) => (
              <ProjectItem 
                key={`${project.id}-dup-${index}`} 
                project={project} 
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

// Combined Panel 4 - Two Column Layout (Urgent Concerns + Ongoing Project Requests)
function CombinedPanel4({ 
  onDeleteProject, 
  onEditProject,
  onDoubleClickProject,
  onDeleteUrgentConcern,
  onEditUrgentConcern,
  onDoubleClickUrgentConcern
}: { 
  onDeleteProject: (id: string) => void;
  onEditProject: (project: Project) => void;
  onDoubleClickProject: () => void;
  onDeleteUrgentConcern: (id: string) => void;
  onEditUrgentConcern: (concern: UrgentConcern) => void;
  onDoubleClickUrgentConcern: () => void;
}) {
  const { projects, urgentConcerns, settings } = useScheduleStore();
  
  return (
    <div className="h-full flex flex-col overflow-hidden rounded-2xl
      bg-gradient-to-br from-gray-100/80 via-gray-50/60 to-gray-100/40 
      dark:from-gray-900/90 dark:via-gray-900/70 dark:to-gray-900/50
      border border-gray-200/60 dark:border-gray-700/50
      shadow-xl shadow-gray-200/10 dark:shadow-gray-900/30
      backdrop-blur-md transition-all duration-300
      hover:shadow-2xl hover:shadow-gray-300/30 dark:hover:shadow-gray-800/40">
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-200/30 dark:divide-gray-700/30 overflow-hidden">
        {/* Left Column: Urgent Concerns */}
        <UrgentConcernColumn 
          concerns={urgentConcerns}
          settings={settings}
          onDeleteConcern={onDeleteUrgentConcern}
          onEditConcern={onEditUrgentConcern}
          onDoubleClick={onDoubleClickUrgentConcern}
        />
        
        {/* Right Column: Ongoing Project Requests */}
        <ProjectColumn 
          projects={projects}
          settings={settings}
          onDeleteProject={onDeleteProject}
          onEditProject={onEditProject}
          onDoubleClick={onDoubleClickProject}
        />
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
  const [categories, setCategories] = useState<EventCategory[]>([]);
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
        // Load categories from new format or fall back to old single category
        const eventCats = getEventCategories(event);
        setCategories(eventCats);
        setDateStarted(event.dateStarted);
        setTimeStart(event.timeStart);
        setTimeEnd(event.timeEnd);
        setDetails(event.details || '');
        setIsAllDay(event.timeStart === '00:00' && event.timeEnd === '23:59');
      });
    }
  }, [event]);

  // Toggle category selection
  const toggleCategory = (cat: EventCategory) => {
    setCategories(prev => 
      prev.includes(cat) 
        ? prev.filter(c => c !== cat)
        : [...prev, cat]
    );
  };

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
      categories: categories.length > 0 ? categories : undefined,
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
            <Label className="text-base">Sector</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  role="combobox"
                  className="w-full justify-between text-base font-normal"
                >
                  {categories.length > 0 
                    ? categories.map(c => getSectorLabel(c)).join(', ')
                    : 'Select sector(s)'
                  }
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-2" align="start">
                <div className="space-y-1">
                  {EVENT_CATEGORIES.map((cat) => (
                    <div 
                      key={cat.value} 
                      className="flex items-center space-x-2 p-2 rounded hover:bg-muted cursor-pointer"
                      onClick={() => toggleCategory(cat.value)}
                    >
                      <Checkbox 
                        id={`edit-cat-${cat.value}`}
                        checked={categories.includes(cat.value)}
                        onCheckedChange={() => toggleCategory(cat.value)}
                      />
                      <label 
                        htmlFor={`edit-cat-${cat.value}`}
                        className="flex items-center gap-2 text-sm cursor-pointer flex-1 select-none"
                      >
                        <span 
                          className="w-3 h-3 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="whitespace-pre-line">{cat.label}</span>
                      </label>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
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
  onClose,
  defaultDate
}: { 
  open: boolean; 
  onClose: () => void;
  defaultDate?: string | null;
}) {
  const { addEvent } = useScheduleStore();
  const [title, setTitle] = useState('');
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [dateStarted, setDateStarted] = useState(() => defaultDate || format(new Date(), 'yyyy-MM-dd'));
  const [timeStart, setTimeStart] = useState('09:00');
  const [timeEnd, setTimeEnd] = useState('10:00');
  const [details, setDetails] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form with defaultDate when modal opens
  useEffect(() => {
    if (open) {
      queueMicrotask(() => {
        setTitle('');
        setCategories([]);
        setDateStarted(defaultDate || format(new Date(), 'yyyy-MM-dd'));
        setTimeStart('09:00');
        setTimeEnd('10:00');
        setDetails('');
        setIsAllDay(false);
        setError('');
      });
    }
  }, [open, defaultDate]);

  // Handler for all-day toggle
  const handleAllDayChange = (checked: boolean) => {
    setIsAllDay(checked);
    if (checked) {
      setTimeStart('00:00');
      setTimeEnd('23:59');
    }
  };

  // Toggle category selection
  const toggleCategory = (cat: EventCategory) => {
    setCategories(prev => 
      prev.includes(cat) 
        ? prev.filter(c => c !== cat)
        : [...prev, cat]
    );
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
      categories: categories.length > 0 ? categories : undefined,
    });

    // Reset form but keep modal open - preserve the date
    setTitle('');
    setCategories([]);
    // Keep the current date instead of resetting to today
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
            <Label className="text-base">Sector</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  role="combobox"
                  className="w-full justify-between text-base font-normal"
                >
                  {categories.length > 0 
                    ? categories.map(c => getSectorLabel(c)).join(', ')
                    : 'Select sector(s)'
                  }
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-2" align="start">
                <div className="space-y-1">
                  {EVENT_CATEGORIES.map((cat) => (
                    <div 
                      key={cat.value} 
                      className="flex items-center space-x-2 p-2 rounded hover:bg-muted cursor-pointer"
                      onClick={() => toggleCategory(cat.value)}
                    >
                      <Checkbox 
                        id={`add-cat-${cat.value}`}
                        checked={categories.includes(cat.value)}
                        onCheckedChange={() => toggleCategory(cat.value)}
                      />
                      <label 
                        htmlFor={`add-cat-${cat.value}`}
                        className="flex items-center gap-2 text-sm cursor-pointer flex-1 select-none"
                      >
                        <span 
                          className="w-3 h-3 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="whitespace-pre-line">{cat.label}</span>
                      </label>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
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

// Add CTO/Leave & WFH Modal (Combined Form)
function AddCtoWfhModal({ 
  open, 
  onClose,
  defaultDate
}: { 
  open: boolean; 
  onClose: () => void;
  defaultDate?: string | null;
}) {
  const { addPersonnelStatus } = useScheduleStore();
  const [name, setName] = useState('');
  const [requestType, setRequestType] = useState<'CTO' | 'WFH'>('CTO');
  const [dateStart, setDateStart] = useState(() => defaultDate || format(new Date(), 'yyyy-MM-dd'));
  const [dateEnd, setDateEnd] = useState(() => defaultDate || format(new Date(), 'yyyy-MM-dd'));
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form with defaultDate when modal opens
  useEffect(() => {
    if (open) {
      queueMicrotask(() => {
        setName('');
        setRequestType('CTO');
        setDateStart(defaultDate || format(new Date(), 'yyyy-MM-dd'));
        setDateEnd(defaultDate || format(new Date(), 'yyyy-MM-dd'));
        setError('');
      });
    }
  }, [open, defaultDate]);

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

    // Add as CTO/FL type if CTO/Leave is selected, or WFH if WFH is selected
    addPersonnelStatus({
      name: name.trim(),
      type: requestType === 'CTO' ? 'CTO' : 'WFH',
      dateStart,
      dateEnd,
    });

    // Reset form but keep modal open
    setName('');
    setDateStart(format(new Date(), 'yyyy-MM-dd'));
    setDateEnd(format(new Date(), 'yyyy-MM-dd'));
    
    // Small delay to prevent double submission
    setTimeout(() => setIsSubmitting(false), 500);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Add CTO/Leave & WFH</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <p className="text-sm text-destructive">{error}</p>}
          
          <div className="space-y-2">
            <Label htmlFor="ctoWfh-name" className="text-base">Personnel Name *</Label>
            <Input 
              id="ctoWfh-name" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter name"
              className="text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ctoWfh-type" className="text-base">Request Type *</Label>
            <Select 
              value={requestType} 
              onValueChange={(value: 'CTO' | 'WFH') => setRequestType(value)}
            >
              <SelectTrigger className="text-base">
                <SelectValue placeholder="Select request type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CTO" className="text-base">CTO/Leave</SelectItem>
                <SelectItem value="WFH" className="text-base">WFH</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ctoWfh-date-start" className="text-base">Date Start *</Label>
              <Input 
                id="ctoWfh-date-start" 
                type="date" 
                value={dateStart} 
                onChange={(e) => setDateStart(e.target.value)}
                className="text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ctoWfh-date-end" className="text-base">Date End *</Label>
              <Input 
                id="ctoWfh-date-end" 
                type="date" 
                value={dateEnd} 
                onChange={(e) => setDateEnd(e.target.value)}
                className="text-base"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="text-base">Cancel</Button>
            <Button type="submit" className="text-base" disabled={isSubmitting}>{isSubmitting ? 'Adding...' : 'Add'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Add In Travel Modal
function AddTravelModal({ 
  open, 
  onClose,
  defaultDate
}: { 
  open: boolean; 
  onClose: () => void;
  defaultDate?: string | null;
}) {
  const { addPersonnelStatus } = useScheduleStore();
  const [name, setName] = useState('');
  const [dateStart, setDateStart] = useState(() => defaultDate || format(new Date(), 'yyyy-MM-dd'));
  const [dateEnd, setDateEnd] = useState(() => defaultDate || format(new Date(), 'yyyy-MM-dd'));
  const [location, setLocation] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form with defaultDate when modal opens
  useEffect(() => {
    if (open) {
      queueMicrotask(() => {
        setName('');
        setDateStart(defaultDate || format(new Date(), 'yyyy-MM-dd'));
        setDateEnd(defaultDate || format(new Date(), 'yyyy-MM-dd'));
        setLocation('');
        setError('');
      });
    }
  }, [open, defaultDate]);

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

    if (!location.trim()) {
      setError('Location is required');
      setIsSubmitting(false);
      return;
    }

    addPersonnelStatus({
      name: name.trim(),
      type: 'TRAVEL',
      dateStart,
      dateEnd,
      location: location.trim(),
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
          <DialogTitle className="text-xl">Add In Travel</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <p className="text-sm text-destructive">{error}</p>}
          
          <div className="space-y-2">
            <Label htmlFor="travel-name" className="text-base">Personnel Name *</Label>
            <Input 
              id="travel-name" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter name"
              className="text-base"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="travel-date-start" className="text-base">Date Start *</Label>
              <Input 
                id="travel-date-start" 
                type="date" 
                value={dateStart} 
                onChange={(e) => setDateStart(e.target.value)}
                className="text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="travel-date-end" className="text-base">Date End *</Label>
              <Input 
                id="travel-date-end" 
                type="date" 
                value={dateEnd} 
                onChange={(e) => setDateEnd(e.target.value)}
                className="text-base"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="travel-location" className="text-base">Location *</Label>
            <Input 
              id="travel-location" 
              value={location} 
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Enter location"
              className="text-base"
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="text-base">Cancel</Button>
            <Button type="submit" className="text-base" disabled={isSubmitting}>{isSubmitting ? 'Adding...' : 'Add'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Add Other Division Request Modal
function AddOtherDivisionModal({ 
  open, 
  onClose 
}: { 
  open: boolean; 
  onClose: () => void;
}) {
  const { addPersonnelStatus } = useScheduleStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const today = format(new Date(), 'yyyy-MM-dd');

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      queueMicrotask(() => {
        setTitle('');
        setDescription('');
        setError('');
      });
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    setError('');

    if (!title.trim()) {
      setError('Title is required');
      setIsSubmitting(false);
      return;
    }

    // Add as OTHER type with title as name, and description in location field
    addPersonnelStatus({
      name: title.trim(),
      type: 'OTHER',
      dateStart: today,
      dateEnd: today,
      location: description.trim() || undefined,
    });

    // Reset form but keep modal open
    setTitle('');
    setDescription('');
    
    // Small delay to prevent double submission
    setTimeout(() => setIsSubmitting(false), 500);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Add Other Division Request</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <p className="text-sm text-destructive">{error}</p>}
          
          <div className="space-y-2">
            <Label htmlFor="other-title" className="text-base">Title *</Label>
            <Input 
              id="other-title" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter request title"
              className="text-base"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="other-description" className="text-base">Description (Optional)</Label>
            <Textarea 
              id="other-description" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter description"
              className="text-base min-h-[100px]"
              rows={4}
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="text-base">Cancel</Button>
            <Button type="submit" className="text-base" disabled={isSubmitting}>{isSubmitting ? 'Adding...' : 'Add Request'}</Button>
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

// Add Ticker Message Modal
function AddTickerMessageModal({ 
  open, 
  onClose 
}: { 
  open: boolean; 
  onClose: () => void;
}) {
  const { addTickerMessage } = useScheduleStore();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    setError('');

    if (!message.trim()) {
      setError('Message is required');
      setIsSubmitting(false);
      return;
    }

    addTickerMessage({
      message: message.trim(),
    });

    setMessage('');
    setTimeout(() => setIsSubmitting(false), 500);
    // Don't auto-close - let user close manually
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Add Renewing Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <p className="text-sm text-destructive">{error}</p>}
          
          <div className="space-y-2">
            <Label htmlFor="ticker-message" className="text-base">Renewing Project Message *</Label>
            <Input 
              id="ticker-message" 
              value={message} 
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter renewing project message"
              className="text-base"
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="text-base">Cancel</Button>
            <Button type="submit" className="text-base" disabled={isSubmitting}>{isSubmitting ? 'Adding...' : 'Add Renewing Project'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Edit Ticker Message Modal
function EditTickerMessageModal({ 
  open, 
  onClose,
  tickerMessage
}: { 
  open: boolean; 
  onClose: () => void;
  tickerMessage: TickerMessage | null;
}) {
  const { updateTickerMessage } = useScheduleStore();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Populate form when ticker message changes
  useEffect(() => {
    if (tickerMessage) {
      queueMicrotask(() => {
        setMessage(tickerMessage.message);
      });
    }
  }, [tickerMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tickerMessage) return;
    
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    setError('');

    if (!message.trim()) {
      setError('Message is required');
      setIsSubmitting(false);
      return;
    }

    updateTickerMessage(tickerMessage.id, {
      message: message.trim(),
    });

    onClose();
    setTimeout(() => setIsSubmitting(false), 500);
  };

  if (!tickerMessage) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Edit Renewing Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <p className="text-sm text-destructive">{error}</p>}
          
          <div className="space-y-2">
            <Label htmlFor="edit-ticker-message" className="text-base">Renewing Project Message *</Label>
            <Input 
              id="edit-ticker-message" 
              value={message} 
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter renewing project message"
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

// Select Ticker Modal for Edit or Delete
function SelectTickerModal({
  open,
  onClose,
  onSelect,
  mode
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (ticker: TickerMessage) => void;
  mode: 'edit' | 'delete';
}) {
  const { tickerMessages } = useScheduleStore();

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-xl">
            {mode === 'edit' ? 'Select Renewing Project to Edit' : 'Select Renewing Project to Delete'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {tickerMessages.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No renewing projects found.</p>
          ) : (
            tickerMessages.map((ticker) => (
              <div
                key={ticker.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => {
                  onSelect(ticker);
                }}
              >
                <span className="text-foreground truncate flex-1">{ticker.message}</span>
                <Button
                  variant={mode === 'edit' ? 'ghost' : 'destructive'}
                  size="sm"
                  className="ml-2 flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(ticker);
                  }}
                >
                  {mode === 'edit' ? (
                    <>
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </>
                  )}
                </Button>
              </div>
            ))
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} className="text-base">Close</Button>
        </DialogFooter>
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
  const [personnelType, setPersonnelType] = useState<'CTO' | 'WFH' | 'TRAVEL' | 'OTHER'>('CTO');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Populate form when personnel changes
  useEffect(() => {
    if (personnel) {
      queueMicrotask(() => {
        setName(personnel.name);
        setPersonnelType(personnel.type === 'FL' ? 'CTO' : personnel.type);
        setDateStart(personnel.dateStart);
        setDateEnd(personnel.dateEnd);
        setLocation(personnel.location || '');
        setDescription(personnel.location || '');
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
      setError(personnel.type === 'OTHER' ? 'Title is required' : 'Personnel name is required');
      setIsSubmitting(false);
      return;
    }

    if (personnelType === 'TRAVEL' && !location.trim()) {
      setError('Location is required');
      setIsSubmitting(false);
      return;
    }

    updatePersonnelStatus(personnel.id, {
      name: name.trim(),
      type: personnelType,
      dateStart,
      dateEnd,
      location: personnelType === 'TRAVEL' ? location.trim() : personnelType === 'OTHER' ? description.trim() || undefined : undefined,
    });

    onClose();
    setTimeout(() => setIsSubmitting(false), 500);
  };

  if (!personnel) return null;

  const getModalTitle = () => {
    switch (personnel.type) {
      case 'CTO':
      case 'FL':
        return 'Edit CTO/Leave & WFH';
      case 'WFH':
        return 'Edit CTO/Leave & WFH';
      case 'TRAVEL':
        return 'Edit In Travel';
      case 'OTHER':
        return 'Edit Other Division Request';
      default:
        return 'Edit Entry';
    }
  };

  const isOtherType = personnel.type === 'OTHER';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">{getModalTitle()}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <p className="text-sm text-destructive">{error}</p>}
          
          {isOtherType ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="edit-other-title" className="text-base">Title *</Label>
                <Input 
                  id="edit-other-title" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter request title"
                  className="text-base"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-other-date-start" className="text-base">Date Start *</Label>
                  <Input 
                    id="edit-other-date-start" 
                    type="date" 
                    value={dateStart} 
                    onChange={(e) => setDateStart(e.target.value)}
                    className="text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-other-date-end" className="text-base">Date End *</Label>
                  <Input 
                    id="edit-other-date-end" 
                    type="date" 
                    value={dateEnd} 
                    onChange={(e) => setDateEnd(e.target.value)}
                    className="text-base"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-other-description" className="text-base">Description (Optional)</Label>
                <Textarea 
                  id="edit-other-description" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter description"
                  className="text-base min-h-[100px]"
                  rows={4}
                />
              </div>
            </>
          ) : personnel.type === 'TRAVEL' ? (
            <>
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
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="edit-ctoWfh-name" className="text-base">Personnel Name *</Label>
                <Input 
                  id="edit-ctoWfh-name" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter name"
                  className="text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-ctoWfh-type" className="text-base">Request Type *</Label>
                <Select 
                  value={personnelType} 
                  onValueChange={(value: 'CTO' | 'WFH' | 'TRAVEL' | 'OTHER') => setPersonnelType(value)}
                >
                  <SelectTrigger className="text-base">
                    <SelectValue placeholder="Select request type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CTO" className="text-base">CTO/Leave</SelectItem>
                    <SelectItem value="WFH" className="text-base">WFH</SelectItem>
                    <SelectItem value="TRAVEL" className="text-base">Travel</SelectItem>
                    <SelectItem value="OTHER" className="text-base">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-ctoWfh-date-start" className="text-base">Date Start *</Label>
                  <Input 
                    id="edit-ctoWfh-date-start" 
                    type="date" 
                    value={dateStart} 
                    onChange={(e) => setDateStart(e.target.value)}
                    className="text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-ctoWfh-date-end" className="text-base">Date End *</Label>
                  <Input 
                    id="edit-ctoWfh-date-end" 
                    type="date" 
                    value={dateEnd} 
                    onChange={(e) => setDateEnd(e.target.value)}
                    className="text-base"
                  />
                </div>
              </div>
            </>
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

// Add Urgent Concern Modal
function AddUrgentConcernModal({ 
  open, 
  onClose 
}: { 
  open: boolean; 
  onClose: () => void;
}) {
  const { addUrgentConcern } = useScheduleStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      queueMicrotask(() => {
        setTitle('');
        setDescription('');
        setError('');
      });
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    setError('');

    if (!title.trim()) {
      setError('Title is required');
      setIsSubmitting(false);
      return;
    }

    addUrgentConcern({
      title: title.trim(),
      description: description.trim() || undefined,
    });

    // Reset form but keep modal open
    setTitle('');
    setDescription('');
    
    // Small delay to prevent double submission
    setTimeout(() => setIsSubmitting(false), 500);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Add Urgent Concern</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <p className="text-sm text-destructive">{error}</p>}
          
          <div className="space-y-2">
            <Label htmlFor="concern-title" className="text-base">Title *</Label>
            <Input 
              id="concern-title" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter concern title"
              className="text-base"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="concern-description" className="text-base">Description (Optional)</Label>
            <Textarea 
              id="concern-description" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter description"
              className="text-base min-h-[100px]"
              rows={4}
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="text-base">Cancel</Button>
            <Button type="submit" className="text-base" disabled={isSubmitting}>{isSubmitting ? 'Adding...' : 'Add Concern'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Edit Urgent Concern Modal
function EditUrgentConcernModal({ 
  open, 
  onClose,
  urgentConcern
}: { 
  open: boolean; 
  onClose: () => void;
  urgentConcern: UrgentConcern | null;
}) {
  const { updateUrgentConcern } = useScheduleStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Populate form when urgent concern changes
  useEffect(() => {
    if (urgentConcern) {
      queueMicrotask(() => {
        setTitle(urgentConcern.title);
        setDescription(urgentConcern.description || '');
      });
    }
  }, [urgentConcern]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urgentConcern) return;
    
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    setError('');

    if (!title.trim()) {
      setError('Title is required');
      setIsSubmitting(false);
      return;
    }

    updateUrgentConcern(urgentConcern.id, {
      title: title.trim(),
      description: description.trim() || undefined,
    });

    onClose();
    setTimeout(() => setIsSubmitting(false), 500);
  };

  if (!urgentConcern) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Edit Urgent Concern</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <p className="text-sm text-destructive">{error}</p>}
          
          <div className="space-y-2">
            <Label htmlFor="edit-concern-title" className="text-base">Title *</Label>
            <Input 
              id="edit-concern-title" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter concern title"
              className="text-base"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="edit-concern-description" className="text-base">Description (Optional)</Label>
            <Textarea 
              id="edit-concern-description" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter description"
              className="text-base min-h-[100px]"
              rows={4}
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

// Get personnel type color
const getPersonnelTypeColor = (type: PersonnelStatus['type']): string => {
  switch (type) {
    case 'CTO':
    case 'FL':
      return '#ef4444'; // red
    case 'WFH':
      return '#3b82f6'; // blue
    case 'TRAVEL':
      return '#f97316'; // orange
    default:
      return '#6b7280'; // gray
  }
};

// Get personnel type label
const getPersonnelTypeLabel = (type: PersonnelStatus['type']): string => {
  switch (type) {
    case 'CTO':
    case 'FL':
      return 'CTO/FL';
    case 'WFH':
      return 'WFH';
    case 'TRAVEL':
      return 'TRAVEL';
    default:
      return type;
  }
};

// Get personnel for a specific day (within date range)
const getPersonnelForDay = (personnel: PersonnelStatus[], date: Date): PersonnelStatus[] => {
  const dateStr = format(date, 'yyyy-MM-dd');
  return personnel.filter((p) => {
    return dateStr >= p.dateStart && dateStr <= p.dateEnd;
  });
};

// Week View Component
function WeekView({ events, personnelStatuses, onDeleteEvent, onEditEvent, onDeletePersonnel, onEditPersonnel, onDoubleClick, weekStart }: { 
  events: ScheduleEvent[]; 
  personnelStatuses: PersonnelStatus[];
  onDeleteEvent: (id: string) => void;
  onEditEvent: (event: ScheduleEvent) => void;
  onDeletePersonnel: (id: string) => void;
  onEditPersonnel: (personnel: PersonnelStatus) => void;
  onDoubleClick: (date: string) => void;
  weekStart: Date;
}) {
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
          const dateStr = format(date, 'yyyy-MM-dd');
          const dayEvents = getEventsForDay(date);
          const dayPersonnel = getPersonnelForDay(personnelStatuses, date);
          const totalItems = dayEvents.length + dayPersonnel.length;
          const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr;
          
          return (
            <div 
              key={day} 
              className="flex flex-col overflow-hidden min-h-0 cursor-pointer"
              onDoubleClick={() => onDoubleClick(dateStr)}
            >
              <div className={`px-2 py-2 text-center border-b border-border ${isToday ? 'bg-primary/10' : 'bg-muted/20'}`}>
                <div className="text-sm font-medium text-muted-foreground">{day}</div>
                <div className={`text-lg font-bold ${isToday ? 'text-primary' : 'text-foreground'}`}>
                  {format(date, 'd')}
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto p-1.5 space-y-1">
                {totalItems === 0 ? (
                  <div className="text-center py-4 text-muted-foreground text-sm">—</div>
                ) : (
                  <>
                    {dayEvents.map((event) => (
                      <WeekEventRow key={event.id} event={event} onDelete={() => onDeleteEvent(event.id)} onEdit={() => onEditEvent(event)} />
                    ))}
                    {dayPersonnel.map((personnel) => (
                      <WeekPersonnelRow key={personnel.id} personnel={personnel} onDelete={() => onDeletePersonnel(personnel.id)} onEdit={() => onEditPersonnel(personnel)} />
                    ))}
                  </>
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

// Week Personnel Row (compact)
function WeekPersonnelRow({ personnel, onDelete, onEdit }: { personnel: PersonnelStatus; onDelete?: () => void; onEdit?: () => void }) {
  const typeColor = getPersonnelTypeColor(personnel.type);
  const typeLabel = getPersonnelTypeLabel(personnel.type);

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      className="flex items-start gap-1 py-1 px-1.5 hover:bg-muted/50 rounded group transition-colors"
    >
      <StatusDot color={typeColor} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-xs text-foreground truncate">{personnel.name}</div>
        <div className="text-xs text-muted-foreground">
          {typeLabel}
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
function MonthView({ events, personnelStatuses, onDeleteEvent, onEditEvent, onDeletePersonnel, onEditPersonnel, onDoubleClick, monthStart }: { 
  events: ScheduleEvent[]; 
  personnelStatuses: PersonnelStatus[];
  onDeleteEvent: (id: string) => void;
  onEditEvent: (event: ScheduleEvent) => void;
  onDeletePersonnel: (id: string) => void;
  onEditPersonnel: (personnel: PersonnelStatus) => void;
  onDoubleClick: (date: string) => void;
  monthStart: Date;
}) {
  const { settings } = useScheduleStore();
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
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

  const getPersonnelForDayCallback = useCallback((date: Date) => {
    return getPersonnelForDay(personnelStatuses, date);
  }, [personnelStatuses]);

  const selectedDateEvents = selectedDate ? getEventsForDay(selectedDate) : [];
  const selectedDatePersonnel = selectedDate ? getPersonnelForDayCallback(selectedDate) : [];
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
                const dayPersonnel = getPersonnelForDayCallback(date);
                const totalItems = dayEvents.length + dayPersonnel.length;
                const dateStr = format(date, 'yyyy-MM-dd');
                const isCurrentMonth = format(date, 'M') === format(monthStart, 'M');
                const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr;
                
                const handleClick = () => {
                  // Clear any existing timeout
                  if (clickTimeoutRef.current) {
                    clearTimeout(clickTimeoutRef.current);
                  }
                  // Set a timeout for single click (250ms delay to detect double-click)
                  clickTimeoutRef.current = setTimeout(() => {
                    setSelectedDate(date);
                  }, 250);
                };
                
                const handleDoubleClick = () => {
                  // Clear the single-click timeout
                  if (clickTimeoutRef.current) {
                    clearTimeout(clickTimeoutRef.current);
                    clickTimeoutRef.current = null;
                  }
                  onDoubleClick(dateStr);
                };
                
                return (
                  <div 
                    key={dayIndex} 
                    className={`flex flex-col overflow-hidden cursor-pointer hover:bg-muted/20 transition-colors ${!isCurrentMonth ? 'bg-muted/30' : ''} ${isToday ? 'bg-primary/5' : ''}`}
                    onClick={handleClick}
                    onDoubleClick={handleDoubleClick}
                  >
                    <div className={`px-1 py-0.5 text-right ${isToday ? 'bg-primary text-primary-foreground' : ''}`}>
                      <span className={`text-xs font-medium ${isToday ? '' : isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {format(date, 'd')}
                      </span>
                    </div>
                    <div className="flex-1 overflow-hidden p-0.5 space-y-0.5">
                      {dayEvents.slice(0, 3).map((event) => (
                        <MonthEventRow key={event.id} event={event} onDelete={() => onDeleteEvent(event.id)} onEdit={() => onEditEvent(event)} />
                      ))}
                      {dayPersonnel.slice(0, 4 - Math.min(dayEvents.length, 3)).map((personnel) => (
                        <MonthPersonnelRow key={personnel.id} personnel={personnel} onDelete={() => onDeletePersonnel(personnel.id)} onEdit={() => onEditPersonnel(personnel)} />
                      ))}
                      {totalItems > 4 && (
                        <div className="text-xs text-muted-foreground text-center">+{totalItems - 4} more</div>
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
            {selectedDateEvents.length === 0 && selectedDatePersonnel.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No events on this day</p>
            ) : (
              <>
                {selectedDateEvents.map((event) => (
                  <EventRow 
                    key={event.id}
                    event={event}
                    onDelete={() => onDeleteEvent(event.id)}
                    onEdit={() => { setSelectedDate(null); onEditEvent(event); }}
                    transitionStyle="static"
                    transitionSpeed={transitionSpeed}
                  />
                ))}
                {selectedDatePersonnel.map((personnel) => (
                  <DialogPersonnelRow 
                    key={personnel.id}
                    personnel={personnel}
                    onDelete={() => onDeletePersonnel(personnel.id)}
                    onEdit={() => { setSelectedDate(null); onEditPersonnel(personnel); }}
                  />
                ))}
              </>
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

// Month Personnel Row (very compact)
function MonthPersonnelRow({ personnel, onDelete, onEdit }: { personnel: PersonnelStatus; onDelete?: () => void; onEdit?: () => void }) {
  const typeColor = getPersonnelTypeColor(personnel.type);

  return (
    <motion.div 
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex items-center gap-0.5 py-0.5 px-1 hover:bg-muted/50 rounded group transition-colors cursor-pointer"
      title={`${personnel.name} - ${getPersonnelTypeLabel(personnel.type)}`}
    >
      <StatusDot color={typeColor} size="sm" />
      <span className="text-xs text-foreground truncate flex-1">{personnel.name}</span>
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

// Dialog Personnel Row (for month view day detail)
function DialogPersonnelRow({ personnel, onDelete, onEdit }: { personnel: PersonnelStatus; onDelete?: () => void; onEdit?: () => void }) {
  const typeColor = getPersonnelTypeColor(personnel.type);
  const typeLabel = getPersonnelTypeLabel(personnel.type);

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-start gap-2 py-2 px-3 hover:bg-muted/50 rounded group transition-colors"
    >
      <StatusDot color={typeColor} size="md" className="mt-1" />
      <div className="flex-1 min-w-0">
        <span className="font-medium text-base text-foreground">{personnel.name}</span>
        <div className="text-sm text-muted-foreground">
          {typeLabel} • {format(parseISO(personnel.dateStart), 'MMM d')} - {format(parseISO(personnel.dateEnd), 'MMM d')}
          {personnel.location && ` • ${personnel.location}`}
        </div>
      </div>
      <div className="flex items-center gap-0.5">
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
    </motion.div>
  );
}

// Scrolling Ticker Component
function ScrollingTicker({ 
  onSelectToEdit,
  onSelectToDelete
}: { 
  onSelectToEdit: () => void;
  onSelectToDelete: () => void;
}) {
  const { tickerMessages } = useScheduleStore();
  const textRef = useRef<HTMLSpanElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLSpanElement>(null);
  const [shouldScroll, setShouldScroll] = useState(false);
  const [contentWidth, setContentWidth] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const animationRef = useRef<number | null>(null);
  const scrollPositionRef = useRef(0);
  const lastTimeRef = useRef(0);
  
  const tickerText = tickerMessages.map(m => m.message).join("  •  ");
  const scrollSpeed = 40; // pixels per second

  // Check if text exceeds container width and measure widths
  useEffect(() => {
    const checkOverflow = () => {
      if (textRef.current && containerRef.current) {
        const textWidth = textRef.current.scrollWidth;
        const cWidth = containerRef.current.clientWidth;
        setShouldScroll(textWidth > cWidth);
        setContentWidth(textWidth);
        setContainerWidth(cWidth);
      }
    };
    
    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [tickerText]);

  // Animate ticker scroll
  useEffect(() => {
    if (!shouldScroll || !textRef.current || !scrollRef.current) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      scrollPositionRef.current = 0;
      if (scrollRef.current) {
        scrollRef.current.scrollLeft = 0;
      }
      return;
    }

    const animate = (timestamp: number) => {
      if (!textRef.current || !scrollRef.current || !containerRef.current) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      if (!lastTimeRef.current) {
        lastTimeRef.current = timestamp;
      }
      const delta = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      // Reset point: content width + container width (spacer allows last item to fully exit)
      // After spacer, the first item appears from the right
      const resetPoint = contentWidth + containerWidth;
      
      scrollPositionRef.current += (scrollSpeed * delta) / 1000;
      
      // Reset when we've scrolled past content + spacer
      if (scrollPositionRef.current >= resetPoint) {
        scrollPositionRef.current = 0;
      }
      
      scrollRef.current.scrollLeft = scrollPositionRef.current;
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [shouldScroll, contentWidth, containerWidth, scrollSpeed]);

  // Auto-hide if no ticker entries
  if (tickerMessages.length === 0) {
    return null;
  }

  return (
    <>
      {/* Header Title - Above the ticker container */}
      <span className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider px-3">
        Target Renewal Date
      </span>
      
      <div ref={containerRef} className="w-full h-[52px] bg-card border-t border-b border-border overflow-hidden flex-shrink-0 group relative">
        <div 
          ref={scrollRef}
          className="flex items-center h-full px-3 overflow-x-hidden"
        >
          <div className="whitespace-nowrap cursor-default flex" style={{ display: 'inline-flex' }}>
            {/* Original content */}
            <span ref={textRef} className="inline-flex items-center gap-4 font-semibold text-xl text-foreground px-3">
              {tickerMessages.map((ticker, index) => (
                <TickerItem 
                  key={`${ticker.id}-${index}`}
                  ticker={ticker}
                  showSeparator={index < tickerMessages.length - 1}
                />
              ))}
            </span>
            {/* Spacer - creates gap between last item and first item */}
            {shouldScroll && (
              <span ref={spacerRef} style={{ width: `${containerWidth}px`, display: 'inline-block' }} />
            )}
            {/* Duplicate content for seamless loop after spacer */}
            {shouldScroll && (
              <span className="inline-flex items-center gap-4 font-semibold text-xl text-foreground px-3">
                {tickerMessages.map((ticker, index) => (
                  <TickerItem 
                    key={`${ticker.id}-dup-${index}`}
                    ticker={ticker}
                    showSeparator={index < tickerMessages.length - 1}
                  />
                ))}
              </span>
            )}
          </div>
        </div>
      
        {/* Edit and Delete buttons - visible on hover */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-card/90 rounded-lg p-0.5 z-10 border border-border/50">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6"
            onClick={onSelectToEdit}
            title="Edit Renewing Project"
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 text-destructive hover:text-destructive"
            onClick={onSelectToDelete}
            title="Delete Renewing Project"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </>
  );
}

// Ticker Item Component (simplified without individual edit/delete)
function TickerItem({ 
  ticker, 
  showSeparator 
}: { 
  ticker: TickerMessage;
  showSeparator: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2 px-1">
      <span className="text-xl font-semibold text-foreground">{ticker.message}</span>
      {showSeparator && <span className="text-muted-foreground ml-2 text-xl">•</span>}
    </span>
  );
}

// Main Page Component
export default function EUSTDDSchedule() {
  const { events, personnelStatuses, settings, deleteEvent, deletePersonnelStatus, deleteProject, deleteTickerMessage, deleteUrgentConcern, _hasHydrated, loadFromServer, startAutoSync, stopAutoSync } = useScheduleStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [modalType, setModalType] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
  const [prefilledDate, setPrefilledDate] = useState<string | null>(null);
  
  // Edit state
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);
  const [editingPersonnel, setEditingPersonnel] = useState<PersonnelStatus | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingTicker, setEditingTicker] = useState<TickerMessage | null>(null);
  const [editingUrgentConcern, setEditingUrgentConcern] = useState<UrgentConcern | null>(null);
  
  // Ticker selection modal state
  const [selectTickerEditOpen, setSelectTickerEditOpen] = useState(false);
  const [selectTickerDeleteOpen, setSelectTickerDeleteOpen] = useState(false);
  
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

  const handleAddEntry = (type: string, date?: string) => {
    setModalType(type);
    if (date) {
      setPrefilledDate(date);
    }
    // Don't reset prefilledDate if no date provided - keep the last selected date
  };

  const closeModal = () => {
    setModalType(null);
    // Don't reset prefilledDate - keep the last selected date
  };

  // Render based on view mode
  const renderMainContent = () => {
    if (viewMode === 'day') {
      return (
        <main className="flex-1 p-1 sm:p-2 grid grid-cols-1 lg:grid-cols-2 grid-rows-[1fr_1fr] gap-1 sm:gap-2 max-w-[1920px] mx-auto w-full min-h-0 overflow-hidden">
          <SchedulePanel 
            title="TODAY'S SCHEDULE"
            date={format(today, 'EEEE, MMMM d, yyyy')}
            events={todayEvents}
            onDeleteEvent={deleteEvent}
            onEditEvent={setEditingEvent}
           onDoubleClick={() => handleAddEntry('event', format(today, 'yyyy-MM-dd'))}
          />
          
          <SchedulePanel 
            title="TOMORROW'S SCHEDULE"
            date={format(tomorrow, 'EEEE, MMMM d, yyyy')}
            events={tomorrowEvents}
            onDeleteEvent={deleteEvent}
            onEditEvent={setEditingEvent}
            onDoubleClick={() => handleAddEntry('event', format(tomorrow, 'yyyy-MM-dd'))}
          />
          
          <PersonnelStatusPanel 
            onDeletePersonnel={deletePersonnelStatus} 
            onEditPersonnel={setEditingPersonnel}
            onAddCtoWfh={() => setModalType('ctoWfh')}
            onAddTravel={() => setModalType('travel')}
            onAddOther={() => setModalType('otherDivision')}
          />
          
          <CombinedPanel4 
            onDeleteProject={deleteProject} 
            onEditProject={setEditingProject}
            onDoubleClickProject={() => setModalType('project')}
            onDeleteUrgentConcern={deleteUrgentConcern}
            onEditUrgentConcern={setEditingUrgentConcern}
            onDoubleClickUrgentConcern={() => setModalType('urgentConcern')}
          />
        </main>
      );
    } else if (viewMode === 'week') {
      return (
        <main className="flex-1 p-1 sm:p-2 flex flex-col min-h-0 max-w-[1920px] mx-auto w-full overflow-hidden">
          <WeekView 
            events={events}
            personnelStatuses={personnelStatuses}
            onDeleteEvent={deleteEvent}
            onEditEvent={setEditingEvent}
            onDeletePersonnel={deletePersonnelStatus}
            onEditPersonnel={setEditingPersonnel}
            onDoubleClick={(date) => handleAddEntry('event', date)}
            weekStart={weekStart}
          />
        </main>
      );
    } else {
      return (
        <main className="flex-1 p-1 sm:p-2 flex flex-col min-h-0 max-w-[1920px] mx-auto w-full overflow-hidden">
          <MonthView 
            events={events}
            personnelStatuses={personnelStatuses}
            onDeleteEvent={deleteEvent}
            onEditEvent={setEditingEvent}
            onDeletePersonnel={deletePersonnelStatus}
            onEditPersonnel={setEditingPersonnel}
            onDoubleClick={(date) => handleAddEntry('event', date)}
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
      
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {renderMainContent()}
      </div>
      
      <ScrollingTicker 
        onSelectToEdit={() => setSelectTickerEditOpen(true)}
        onSelectToDelete={() => setSelectTickerDeleteOpen(true)}
      />

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
      
      <AddEventModal open={modalType === 'event'} onClose={closeModal} defaultDate={prefilledDate} />
      
      <AddCtoWfhModal 
        open={modalType === 'ctoWfh'} 
        onClose={closeModal}
        defaultDate={prefilledDate}
      />
      
      <AddTravelModal 
        open={modalType === 'travel'} 
        onClose={closeModal} 
        defaultDate={prefilledDate}
      />
      
      <AddOtherDivisionModal 
        open={modalType === 'otherDivision'} 
        onClose={closeModal} 
      />
      
      <AddProjectModal open={modalType === 'project'} onClose={closeModal} />
      
      <AddTickerMessageModal open={modalType === 'ticker'} onClose={closeModal} />
      
      <AddUrgentConcernModal open={modalType === 'urgentConcern'} onClose={closeModal} />
      
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
      
      <EditTickerMessageModal 
        open={!!editingTicker} 
        onClose={() => setEditingTicker(null)} 
        tickerMessage={editingTicker}
      />
      
      <EditUrgentConcernModal 
        open={!!editingUrgentConcern} 
        onClose={() => setEditingUrgentConcern(null)} 
        urgentConcern={editingUrgentConcern}
      />
      
      {/* Ticker Selection Modals */}
      <SelectTickerModal
        open={selectTickerEditOpen}
        onClose={() => setSelectTickerEditOpen(false)}
        onSelect={(ticker) => setEditingTicker(ticker)}
        mode="edit"
      />
      
      <SelectTickerModal
        open={selectTickerDeleteOpen}
        onClose={() => setSelectTickerDeleteOpen(false)}
        onSelect={(ticker) => deleteTickerMessage(ticker.id)}
        mode="delete"
      />
    </div>
  );
}
