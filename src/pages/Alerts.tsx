import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { InfoPage } from '@/components/InfoPage';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';

const KEY = 'alerts:prefs';
type Prefs = { enabled: boolean; token?: string; walk_ons: boolean; cpps: boolean; radius_miles: number; latitude?: number | null; longitude?: number | null };
const DEFAULTS: Prefs = { enabled: false, walk_ons: true, cpps: true, radius_miles: 50 };

function load(): Prefs {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return DEFAULTS; }
}

/** Saves to the server; returns true only when the server confirmed it. */
async function save(p: Prefs): Promise<boolean> {
  if (!p.token) return false;
  const { data, error } = await supabase.functions.invoke('register-alert-device', {
    body: { token: p.token, enabled: p.enabled, walk_ons: p.walk_ons, cpps: p.cpps, radius_miles: p.radius_miles, latitude: p.latitude ?? null, longitude: p.longitude ?? null },
  });
  if (error || !(data as { ok?: boolean })?.ok) return false;
  localStorage.setItem(KEY, JSON.stringify(p));
  return true;
}

/** Ask iOS for a push token, cleaning up listeners and giving up after 20s. */
async function getPushToken(): Promise<string> {
  const handles: { remove: () => Promise<void> }[] = [];
  try {
    return await new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout')), 20000);
      PushNotifications.addListener('registration', (t) => { clearTimeout(timer); resolve(t.value); }).then((h) => handles.push(h));
      PushNotifications.addListener('registrationError', (e) => { clearTimeout(timer); reject(e); }).then((h) => handles.push(h));
      PushNotifications.register().catch(reject);
    });
  } finally {
    await Promise.all(handles.map((h) => h.remove()));
  }
}

function getPosition(): Promise<{ latitude: number; longitude: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: +pos.coords.latitude.toFixed(2), longitude: +pos.coords.longitude.toFixed(2) }),
      () => resolve(null),
      { timeout: 10000 },
    );
  });
}

/** Opens the event when someone taps a notification. Mounted once in the app. */
export function useAlertTapHandler() {
  const navigate = useNavigate();
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const sub = PushNotifications.addListener('pushNotificationActionPerformed', (a) => {
      const id = a.notification.data?.eventId;
      if (id) navigate(`/events/${id}`);
    });
    return () => { sub.then((s) => s.remove()); };
  }, [navigate]);
}

export default function Alerts() {
  const native = Capacitor.isNativePlatform();
  const [prefs, setPrefs] = useState<Prefs>(load);
  const [busy, setBusy] = useState(false);

  const update = async (patch: Partial<Prefs>): Promise<boolean> => {
    const previous = prefs;
    const next = { ...prefs, ...patch };
    setPrefs(next);
    setBusy(true);
    const ok = await save(next);
    setBusy(false);
    if (!ok) {
      setPrefs(previous);
      toast.error('Could not save your alert settings. Check your connection and try again.');
    }
    return ok;
  };

  const turnOn = async () => {
    setBusy(true);
    try {
      const perm = await PushNotifications.requestPermissions();
      if (perm.receive !== 'granted') {
        toast.error('Notifications are off. Turn them on in iPhone Settings → Find A Walk-On.');
        return;
      }
      const token = await getPushToken();
      const pos = await getPosition();
      const next = { ...prefs, enabled: true, token, latitude: pos?.latitude ?? null, longitude: pos?.longitude ?? null };
      if (!(await save(next))) {
        toast.error('Could not turn on alerts — we could not reach our server. Please try again.');
        return;
      }
      setPrefs(next);
      toast.success(pos ? 'Alerts are on.' : 'Alerts are on. Allow location to get walk-ons near you.');
    } catch {
      toast.error('Could not turn on alerts. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <InfoPage title="Event Alerts" description="Get notified when new walk-on games near you or CPPS round dates are added.">
      {!native ? (
        <p>Alerts work in the Find A Walk-On iPhone app. Download it to be notified when new walk-ons near you or CPPS round dates are added.</p>
      ) : !prefs.enabled ? (
        <>
          <p>Get a notification as soon as a new walk-on near you, or a new CPPS round date, has been checked and added.</p>
          <Button className="min-h-11" onClick={turnOn} disabled={busy}>Turn on alerts</Button>
        </>
      ) : (
        <div className="space-y-6 text-foreground">
          <div className="flex items-center justify-between gap-4 min-h-11">
            <Label htmlFor="walkons">Walk-ons near me</Label>
            <Switch id="walkons" checked={prefs.walk_ons} onCheckedChange={(v) => update({ walk_ons: v })} />
          </div>
          {prefs.walk_ons && (
            <div className="space-y-3">
              <Label>Within {prefs.radius_miles} miles</Label>
              <Slider min={10} max={200} step={10} value={[prefs.radius_miles]}
                onValueChange={([v]) => setPrefs((p) => ({ ...p, radius_miles: v }))}
                onValueCommit={([v]) => update({ radius_miles: v })} />
              <Button variant="outline" size="sm" className="min-h-11" onClick={async () => {
                const pos = await getPosition();
                if (pos) { if (await update(pos)) toast.success('Location updated.'); } else toast.error('Location not available. Check iPhone Settings.');
              }}>{prefs.latitude == null ? 'Use my location' : 'Update my location'}</Button>
            </div>
          )}
          <div className="flex items-center justify-between gap-4 min-h-11">
            <Label htmlFor="cpps">New CPPS round dates</Label>
            <Switch id="cpps" checked={prefs.cpps} onCheckedChange={(v) => update({ cpps: v })} />
          </div>
          <Button variant="ghost" className="min-h-11" onClick={() => update({ enabled: false })}>Turn off all alerts</Button>
        </div>
      )}
    </InfoPage>
  );
}
