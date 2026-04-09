import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { olaReverseGeocode } from '@/services/olaMapService';

export interface LocationData {
  cityName: string;
  areaName?: string;
  lat?: number;
  lng?: number;
  source: 'manual' | 'gps' | 'flutter';
  fullAddress?: string;
}

export type LocationStatus = 'idle' | 'checking' | 'blocked' | 'enabling' | 'ready';

interface LocationContextType {
  location: LocationData;
  locationStatus: LocationStatus;
  setLocation: (loc: LocationData) => void;
  requestGPSLocation: () => void;
  requestEnableLocationServices: () => void;
  isLocating: boolean;
  locationError: string | null;
}

const DEFAULT_LOCATION: LocationData = {
  cityName: 'Bangalore',
  areaName: undefined,
  lat: undefined,
  lng: undefined,
  source: 'manual',
  fullAddress: undefined,
};

const STARTUP_OVERALL_TIMEOUT_MS = 10000;
const LOCATION_REQUEST_TIMEOUT_MS = 15000;

const LocationContext = createContext<LocationContextType>({
  location: DEFAULT_LOCATION,
  locationStatus: 'idle',
  setLocation: () => {},
  requestGPSLocation: () => {},
  requestEnableLocationServices: () => {},
  isLocating: false,
  locationError: null,
});

export const useLocation_ = () => useContext(LocationContext);

async function reverseGeocode(lat: number, lng: number): Promise<{ city: string; area?: string; fullAddress?: string }> {
  try {
    const result = await olaReverseGeocode(lat, lng);
    return {
      city: result.city,
      area: result.neighborhood || result.area || result.subLocality || result.locality || undefined,
      fullAddress: result.structuredAddress || result.formatted_address || undefined,
    };
  } catch {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      const addr = data.address || {};
      const city = addr.city || addr.town || addr.village || addr.state_district || addr.state || 'Unknown';
      const area = addr.suburb || addr.neighbourhood || addr.city_district || undefined;
      return { city, area, fullAddress: data.display_name || undefined };
    } catch {
      return { city: 'Unknown' };
    }
  }
}

export const LocationProvider = ({ children }: { children: ReactNode }) => {
  const [location, setLocationState] = useState<LocationData>(DEFAULT_LOCATION);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationStatus, setLocationStatusRaw] = useState<LocationStatus>('idle');

  const cachedLocationRef = useRef<LocationData | null>(null);
  const statusRef = useRef<LocationStatus>('idle');
  const hasReachedReadyRef = useRef(false);
  const hasCheckedLocationRef = useRef(false);
  const isEnablingLocationRef = useRef(false);
  const isRequestingLocationRef = useRef(false);
  const startupTimeoutRef = useRef<number | null>(null);
  const nativeRequestTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user_location');
      if (stored) {
        cachedLocationRef.current = JSON.parse(stored);
      }
    } catch {
      cachedLocationRef.current = null;
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('user_location', JSON.stringify(location));
  }, [location]);

  const clearStartupTimeout = useCallback(() => {
    if (startupTimeoutRef.current !== null) {
      window.clearTimeout(startupTimeoutRef.current);
      startupTimeoutRef.current = null;
    }
  }, []);

  const clearNativeRequestTimeout = useCallback(() => {
    if (nativeRequestTimeoutRef.current !== null) {
      window.clearTimeout(nativeRequestTimeoutRef.current);
      nativeRequestTimeoutRef.current = null;
    }
  }, []);

  const setStatus = useCallback((nextStatus: LocationStatus, source: string) => {
    const currentStatus = statusRef.current;

    if (hasReachedReadyRef.current && nextStatus !== 'ready') {
      console.log('[LOCATION] STATUS LOCKED → ready', {
        attempted: nextStatus,
        source,
        time: Date.now(),
      });
      return;
    }

    if (currentStatus === nextStatus) {
      return;
    }

    console.log(`[LOCATION] STATUS → ${currentStatus} → ${nextStatus}`, {
      source,
      time: Date.now(),
    });

    statusRef.current = nextStatus;
    setLocationStatusRaw(nextStatus);
  }, []);

  const mergeLocationState = useCallback((partial: Partial<LocationData>) => {
    setLocationState((prev) => {
      const next: LocationData = {
        cityName: partial.cityName ?? prev.cityName,
        areaName: partial.areaName ?? prev.areaName,
        lat: partial.lat ?? prev.lat,
        lng: partial.lng ?? prev.lng,
        source: partial.source ?? prev.source,
        fullAddress: partial.fullAddress ?? prev.fullAddress,
      };
      cachedLocationRef.current = next;
      return next;
    });
  }, []);

  const markReady = useCallback((source: string, partial?: Partial<LocationData>) => {
    clearStartupTimeout();
    clearNativeRequestTimeout();
    isEnablingLocationRef.current = false;
    isRequestingLocationRef.current = false;
    hasReachedReadyRef.current = true;
    setIsLocating(false);
    setLocationError(null);

    if (partial) {
      mergeLocationState(partial);
    }

    setStatus('ready', source);
  }, [clearNativeRequestTimeout, clearStartupTimeout, mergeLocationState, setStatus]);

  const markBlocked = useCallback((source: string, errorMessage?: string) => {
    clearStartupTimeout();
    clearNativeRequestTimeout();
    isEnablingLocationRef.current = false;
    isRequestingLocationRef.current = false;
    setIsLocating(false);

    if (hasReachedReadyRef.current) {
      console.log('[LOCATION] STATUS LOCKED → ready', {
        attempted: 'blocked',
        source,
        time: Date.now(),
      });
      return;
    }

    if (errorMessage) {
      setLocationError(errorMessage);
    }

    cachedLocationRef.current = null;
    localStorage.removeItem('user_location');
    setLocationState(DEFAULT_LOCATION);
    setStatus('blocked', source);
  }, [clearNativeRequestTimeout, clearStartupTimeout, setStatus]);

  const setLocation = useCallback((loc: LocationData) => {
    cachedLocationRef.current = loc;
    setLocationState(loc);
    clearNativeRequestTimeout();
    isEnablingLocationRef.current = false;
    isRequestingLocationRef.current = false;
    setIsLocating(false);
    setLocationError(null);

    if (loc.lat != null && loc.lng != null) {
      hasReachedReadyRef.current = true;
      setStatus('ready', 'setLocation');
    }
  }, [clearNativeRequestTimeout, setStatus]);

  const requestGPSLocation = useCallback(() => {
    if (isRequestingLocationRef.current) {
      return;
    }

    isRequestingLocationRef.current = true;
    setIsLocating(true);
    setLocationError(null);
    clearNativeRequestTimeout();

    console.log('[LOCATION BRIDGE] requestLocation called');

    if (window.flutter_inappwebview) {
      try {
        nativeRequestTimeoutRef.current = window.setTimeout(() => {
          isRequestingLocationRef.current = false;
          setIsLocating(false);
          setLocationError('Location request timed out. Please try again.');

          if (statusRef.current === 'enabling') {
            markBlocked('native-request-timeout', 'Location request timed out. Please try again.');
          }
        }, LOCATION_REQUEST_TIMEOUT_MS);

        window.flutter_inappwebview.callHandler('requestLocation');
        return;
      } catch {
        clearNativeRequestTimeout();
      }
    }

    if (!navigator.geolocation) {
      isRequestingLocationRef.current = false;
      markBlocked('no-geolocation-api', 'Geolocation is not supported by this browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        isRequestingLocationRef.current = false;
        const { latitude, longitude } = pos.coords;
        const geo = await reverseGeocode(latitude, longitude);
        setLocation({
          cityName: geo.city,
          areaName: geo.area,
          lat: latitude,
          lng: longitude,
          source: 'gps',
          fullAddress: geo.fullAddress,
        });
      },
      (err) => {
        isRequestingLocationRef.current = false;
        clearNativeRequestTimeout();
        setIsLocating(false);

        const messages: Record<number, string> = {
          1: 'Location permission denied. Please enable it in your settings.',
          2: 'GPS is turned off. Please enable location services.',
          3: 'Location request timed out. Please try again.',
        };
        const message = messages[err.code] || 'Failed to get location';
        setLocationError(message);

        if ((statusRef.current === 'checking' || statusRef.current === 'blocked' || statusRef.current === 'enabling') && !hasReachedReadyRef.current) {
          markBlocked('browser-request-error', message);
        }
      },
      { enableHighAccuracy: true, timeout: LOCATION_REQUEST_TIMEOUT_MS, maximumAge: 0 }
    );
  }, [clearNativeRequestTimeout, markBlocked, setLocation]);

  const requestEnableLocationServices = useCallback(() => {
    if (hasReachedReadyRef.current) {
      return;
    }

    if (isEnablingLocationRef.current) {
      return;
    }

    setLocationError(null);
    isEnablingLocationRef.current = true;
    setStatus('enabling', 'user-enable-click');

    console.log('[LOCATION BRIDGE] enableLocationServices called');

    if (window.flutter_inappwebview) {
      try {
        window.flutter_inappwebview.callHandler('enableLocationServices');
        return;
      } catch {
        isEnablingLocationRef.current = false;
      }
    }

    isEnablingLocationRef.current = false;
    requestGPSLocation();
  }, [requestGPSLocation, setStatus]);

  useEffect(() => {
    (window as any).setLocationFromNative = (data: {
      lat: number;
      lng: number;
      city?: string;
      area?: string;
      fullAddress?: string;
    }) => {
      const applyLocation = (resolved?: { city?: string; area?: string; fullAddress?: string }) => {
        setLocation({
          cityName: data.city ?? resolved?.city ?? cachedLocationRef.current?.cityName ?? DEFAULT_LOCATION.cityName,
          areaName: data.area ?? resolved?.area ?? cachedLocationRef.current?.areaName,
          lat: data.lat,
          lng: data.lng,
          source: 'flutter',
          fullAddress: data.fullAddress ?? resolved?.fullAddress ?? cachedLocationRef.current?.fullAddress,
        });
      };

      if (data.city) {
        applyLocation();
        return;
      }

      reverseGeocode(data.lat, data.lng)
        .then((geo) => applyLocation(geo))
        .catch(() => applyLocation());
    };

    (window as any).setLocationError = (msg: string) => {
      clearNativeRequestTimeout();
      isEnablingLocationRef.current = false;
      isRequestingLocationRef.current = false;
      setIsLocating(false);
      setLocationError(msg);

      console.log('[LOCATION] ❌ NATIVE LOCATION ERROR', {
        message: msg,
        status: statusRef.current,
        time: Date.now(),
      });

      if ((statusRef.current === 'checking' || statusRef.current === 'enabling') && !hasReachedReadyRef.current) {
        markBlocked('native-location-error', msg);
      }
    };

    (window as any).onLocationServicesEnabled = () => {
      console.log('[LOCATION] FLUTTER CALLBACK → ENABLED');
      isEnablingLocationRef.current = false;
      requestGPSLocation();
    };

    (window as any).setLocationCheckResult = (data: {
      enabled: boolean;
      lat?: number;
      lng?: number;
      city?: string;
      area?: string;
      fullAddress?: string;
    }) => {
      clearStartupTimeout();
      console.log(`[LOCATION] CHECK RESULT → enabled: ${data.enabled}`);

      if (!data.enabled) {
        markBlocked('native-check-disabled');
        return;
      }

      const cached = cachedLocationRef.current;

      if (data.lat != null && data.lng != null) {
        markReady('native-check-enabled', {
          cityName: data.city ?? cached?.cityName ?? DEFAULT_LOCATION.cityName,
          areaName: data.area ?? cached?.areaName,
          lat: data.lat,
          lng: data.lng,
          source: 'flutter',
          fullAddress: data.fullAddress ?? cached?.fullAddress,
        });

        if (!data.city) {
          reverseGeocode(data.lat, data.lng)
            .then((geo) => mergeLocationState({
              cityName: geo.city,
              areaName: geo.area,
              fullAddress: geo.fullAddress,
              source: 'flutter',
            }))
            .catch(() => undefined);
        }
        return;
      }

      if (cached) {
        markReady('native-check-enabled', cached);
        return;
      }

      markReady('native-check-enabled');
    };

    return () => {
      clearStartupTimeout();
      clearNativeRequestTimeout();
      delete (window as any).setLocationFromNative;
      delete (window as any).setLocationError;
      delete (window as any).onLocationServicesEnabled;
      delete (window as any).setLocationCheckResult;
    };
  }, [clearNativeRequestTimeout, clearStartupTimeout, markBlocked, markReady, mergeLocationState, requestGPSLocation, setLocation]);

  useEffect(() => {
    if (hasCheckedLocationRef.current) {
      return;
    }

    hasCheckedLocationRef.current = true;
    setStatus('checking', 'startup-begin');
    console.log('[LOCATION] STARTUP CHECK BEGIN');

    if (window.flutter_inappwebview) {
      startupTimeoutRef.current = window.setTimeout(() => {
        if (!hasReachedReadyRef.current) {
          markBlocked('startup-check-timeout', 'Location check took too long. Please try again.');
        }
      }, STARTUP_OVERALL_TIMEOUT_MS);

      console.log('[LOCATION BRIDGE] checkLocationStatus called');
      window.flutter_inappwebview.callHandler('checkLocationStatus');
      return;
    }

    if (!navigator.geolocation) {
      markBlocked('no-geolocation-api', 'Geolocation is not supported by this browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        clearStartupTimeout();
        const { latitude, longitude } = pos.coords;
        const geo = await reverseGeocode(latitude, longitude);
        setLocation({
          cityName: geo.city,
          areaName: geo.area,
          lat: latitude,
          lng: longitude,
          source: 'gps',
          fullAddress: geo.fullAddress,
        });
      },
      (err) => {
        const messages: Record<number, string> = {
          1: 'Location permission denied. Please enable it in your settings.',
          2: 'GPS is turned off. Please enable location services.',
          3: 'Location request timed out. Please try again.',
        };
        markBlocked('browser-startup-check', messages[err.code] || 'Failed to determine location');
      },
      { enableHighAccuracy: false, timeout: STARTUP_OVERALL_TIMEOUT_MS, maximumAge: 0 }
    );
  }, [clearStartupTimeout, markBlocked, setLocation, setStatus]);

  return (
    <LocationContext.Provider
      value={{
        location,
        locationStatus,
        setLocation,
        requestGPSLocation,
        requestEnableLocationServices,
        isLocating,
        locationError,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};