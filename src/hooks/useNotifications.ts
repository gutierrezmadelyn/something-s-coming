// @ts-nocheck
import { useState, useEffect, useCallback, useRef } from 'react';

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
}

interface UseNotificationsReturn {
  permission: NotificationPermission | 'default';
  requestPermission: () => Promise<boolean>;
  showNotification: (options: NotificationOptions) => void;
  updateBadge: (count: number) => void;
  playSound: () => void;
}

// Notification sound (base64 encoded short beep)
const NOTIFICATION_SOUND_URL = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Onp6Qf3BpbXuJl52ajoBxZF5wg5mpl5WAb2JnfJakp5qMfW1kZ3qRpq2lmId2amhsfZOjraiZiHttZ2p5jpymqqSUgXZsa3CAlZ+lpJqPgHRsbnOGmKKlpJyRgnZtbnR+laCnopmRgndub3V7k6ClpZqRg3hwcXR5kJ6ipZuTg3pxcXR4j52hpJyTg3txcnV4jo+goJuShHpycXZ3jZ+gnpmRg3tycnZ3jJ6fnpmShHtycXZ3jJ6enZiRg3tycXZ3jJ6enZiQg3tycnZ3jJ6enZmRg3tycnZ3jJ+fn5qSg3tycnZ3jZ+fn5qSg3tycnZ3jZ+fn5qSg3tycnZ3jZ+fn5qSg3tycXZ3jZ+fn5qShHtycXZ3jZ+fn5qShHtycXZ3jZ+fnpqShHtyc3Z3jZ+fnpqRhHtyc3Z3jJ6fnpqRg3tyc3V3jJ6enZqRg3tycnV3jJ6enZqRg3tycnV3jJ6enJmRg3tycnV3jJ6dnJqRhHtycnV3jJ6dnJqRhHtycnR3jJ6dnZqRhHtycnR3jJ6dnZqRhHtxcnR3jJ6dnZqRhHtxcnR3jJ6dnZmRhHtxcnR3i56dnZmRhHtxcnR3i56dnJmRhHtxcnN2i56dnJmRhHtxcnN2i56cnJmRhHtxcnN2i52cnJmRhHtxcnN2i52cnJmRhHtxcnN2i52cmpiQg3txc3R3i52cmpiQg3txcnR2i52cmpiQg3txcnR2i52cmpiQg3txcnR2i52cmpiQg3txcnR2i52cmpiQg3txcnR2i52cmpiQg3txcnN2i52cmpiQg3txcnN2i52cmpiQg3txcnN2i52cmpiQg3txcnN2i52cmpiQg3txcnN2i52cmpiQg3txcnN2i52cmpiQg3txcnN2i52cmpiQg3twcXN2i52bmpiPg3twcXN2ip2bmpeQg3twcXN2ip2bmpeQg3twcXJ1ip2ampeQgnpwcXJ1ip2ampaQgnpwcXJ1ip2ampaQgnpwcXJ1ip2ampaQgnpwcHJ1ip2ampaQgnpwcHJ1ip2ampaQgnpwcHJ1ip2ampaQgnpwcHJ1ipyampaQgnpvb3F0ipyampaQgnpvb3F0ipyZmZaQgnpvb3F0ipyZmZaQgnpvb3F0ipyZmZaQgnpvb3F0ipyZmZaQgnpvb3F0ipyZmZWPgnpvb3F0ipyZmZWPgnpvb3F0ipyZmZWPgnpvb3F0ipyZmZWPgnpvb3F0ipyZmZWPgnpvb3B0iZyZmZWPgnpvb3B0iZyYmJWPgXlvb3B0iZuYmJWPgXlvb3B0iZuYmJSPgXlvb3B0iZuYmJSPgXlub291iZuYmJSPgXlub295iZuYmJSPgXlub295iZuYl5SPgXlub295iZuXl5SPgXlub295iZuXl5SPgXlub295iZqXl5SPgXlub295iZqXl5SPgXlub295iZqXl5SOgHlub295iJqXl5SOgHlub295iJqXlpSOgHlub295iJqWlpSOgHhub294iJqWlpSOgHhub294iJqWlpSOgHhub294iJqWlpSOgHhub294h5qWlpONgHhub294h5mWlpONgHhtbnB4h5mWlpONgHhtbnB4h5mWlpONgHhtbnB4h5mVlZONgHhtbnB3h5mVlZONgHhtbnB3h5mVlZONgHhtbnB3h5mVlZONf3htbm93h5mVlZOMf3htbm93h5mVlZKMf3htbm93h5mVlZKMf3htbm93h5mVlJKMf3htbm93h5mVlJKMf3htbW93h5iVlJKMf3htbW93h5iUlJKMf3htbW93h5iUlJKMf3htbW92h5iUlJKMf3dsLm92h5iUlJKMf3dsbW52h5iUlJKLf3dsbW52h5iUlJGLf3dsbW52h5iUk5GLfndsbW52h5iTk5GLfndsbW52h5iTk5GLfndsbW52hpiTk5GLfndsbW52hpiTk5GLfndsbW11hpiTk5CLfndsbW11hpiTk5CLfndsbW11hpiTk5CLfndrbW11hpiTko+LfndrbW11hpiSko+LfndrbWx1hpiSko+LfndrbWx1hpiSko+LfndrbWx1hpiSko+LfndrbWx1hpiSko+LfndrbWx1hpiSko+LfndrbWx1hpiSko+KfndrbWx1hpeSko+KfndrbWx0hpeRko+KfndrbWx0hpeRkY+KfndrbWx0hpeRkY+KfndrbWx0hpeRkY+KfndrbWx0hpeRkY6KfnZqbGx0hpeRkY6KfnZqbGx0hpeRkY6KfnZqbGx0hpeRkY6KfnZqbGx0hpeRkI6KfnZqbGxzhpeQkI6KfnZqbGxzhpePkI6JfXZqbGxzhpePkI6JfXZqa2xzhpePkI6JfXZqa2xzhpePkI6JfXZqa2xzhpePj46JfXZqa2xzhpePj46JfXZqa2xyhpePj46JfXZqa2xyhZePj42JfXZqa2xyhZePj42JfXZqa2tyhZeOj42JfXZqa2tyhZeOj42JfXZqa2tyhZeOj42IfXZqa2tyhZaNj42IfXVqa2txhZaNj42IfXVpa2txhZaNj4yIfXVpa2txhZaNjoqIfXVpaGtwhZaNjoqIfXVpaGtwhJWNjoqHfHVpaGtwhJWMjoqHfHVpaGtwhJWMjYqHfHVpaGpwhJSMjYqHfHVpaGpwhJSMjYqHfHRpaGpwhJSMjYqHfHRpaGpwhJOLjIqHfHRpaGpwhJOLjImGfHRpaGpvhJOLjImGfHRoZ2pvhJOLjImGe3RoZ2lvg5OLi4mGe3RoZ2lvg5OKi4mGe3RoZ2lvg5KKi4mGe3RoZ2lvg5KKi4iGe3NoZ2lvg5KKi4iFe3NoZ2hvg5KKioiFe3NoZ2hvg5KKioiFe3NoZ2hvg5KJioeFe3NoZ2dvg5KJioeFe3NoZ2dvgpGJioeFe3NoZmdvgpGJioeFenNoZmdugpGJiYeEenNoZmdugpGIiYeEenNoZmdugpGIiYeEenNoZmdugpGIiYeEenNoZmdugpGIiYeEenJnZmdug5GIiYaDenJnZmdug5GHiYaDenJnZWdug5CHiIaDenJnZWdtg5CHiIaDenJnZWdtgpCHiIaDenJnZWdtgpCHiIaCeXJnZWdtgpCHiIaCeXJnZWdtgo+HiIaCeXJnZWZtgo+Gh4WCeXJnZWZtgo+Gh4WCeXJmZWZtgo+Gh4WBd3FmZWZtgY+Gh4WBd3FmZGZsf4+GhoSAd3FmZGZsf46Ghj8=';

export function useNotifications(): UseNotificationsReturn {
  const [permission, setPermission] = useState<NotificationPermission | 'default'>('default');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const originalTitleRef = useRef<string>('');

  // Initialize
  useEffect(() => {
    // Store original title
    originalTitleRef.current = document.title;

    // Check current permission
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }

    // Create audio element for notification sound
    audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
    audioRef.current.volume = 0.5;

    return () => {
      // Restore original title on unmount
      document.title = originalTitleRef.current;
    };
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      setPermission('granted');
      return true;
    }

    if (Notification.permission === 'denied') {
      setPermission('denied');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (err) {
      console.error('Error requesting notification permission:', err);
      return false;
    }
  }, []);

  // Show a notification
  const showNotification = useCallback((options: NotificationOptions) => {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return;
    }

    if (Notification.permission !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/favicon.ico',
        tag: options.tag || 'negoworking-message',
        requireInteraction: options.requireInteraction || false,
        silent: true, // We handle sound separately
      });

      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000);

      // Focus window when notification is clicked
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (err) {
      console.error('Error showing notification:', err);
    }
  }, []);

  // Update the browser tab badge/title
  const updateBadge = useCallback((count: number) => {
    if (count > 0) {
      document.title = `(${count}) ${originalTitleRef.current}`;
    } else {
      document.title = originalTitleRef.current;
    }
  }, []);

  // Play notification sound
  const playSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(err => {
        // Auto-play might be blocked, that's okay
        console.warn('Could not play notification sound:', err);
      });
    }
  }, []);

  return {
    permission,
    requestPermission,
    showNotification,
    updateBadge,
    playSound,
  };
}
