import { useLocation_ } from '@/contexts/LocationContext';
import { MapPin, Navigation, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const LocationGate = ({ children }: { children: React.ReactNode }) => {
  const { locationStatus, requestEnableLocationServices, isLocating, locationError } = useLocation_();

  if (locationStatus === 'idle' || locationStatus === 'checking') {
    console.log('[LOCATION UI] SHOW LOADER', { status: locationStatus, time: Date.now() });
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (locationStatus === 'ready') {
    console.log('[LOCATION UI] SHOW APP', { time: Date.now() });
    return <>{children}</>;
  }

  const isWaitingForLocation = locationStatus === 'enabling' || isLocating;

  console.log('[LOCATION UI] SHOW GATE', { status: locationStatus, time: Date.now() });

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background px-6 text-center">
      <div className="relative mb-8">
        <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" style={{ animationDuration: '2s' }} />
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
          <MapPin className="h-12 w-12 text-primary" />
        </div>
      </div>

      <h1 className="mb-3 text-xl font-bold text-foreground">
        Location Required
      </h1>
      <p className="mb-8 max-w-xs text-sm leading-relaxed text-muted-foreground">
        We need your location to show nearby salons and services available in your area.
      </p>

      <Button
        size="lg"
        className="gap-2 rounded-full px-8"
        onClick={() => {
          console.log('[LOCATION UI] BUTTON CLICK → ENABLE LOCATION');
          requestEnableLocationServices();
        }}
        disabled={isWaitingForLocation}
      >
        {isWaitingForLocation ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            Detecting Location…
          </>
        ) : (
          <>
            <Navigation className="h-4 w-4" />
            Turn On Location
          </>
        )}
      </Button>

      {locationError && (
        <p className="mt-4 max-w-xs text-xs text-destructive">{locationError}</p>
      )}
    </div>
  );
};

export default LocationGate;