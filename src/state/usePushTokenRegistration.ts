import { useEffect } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { registerPushToken } from '../firebase/notifications';

/**
 * Requests notification permission and registers this device's Expo push
 * token against the signed-in member's profile. Silently does nothing if
 * permission is denied, or if there's no EAS project ID configured yet
 * (see README — requires running `eas init` once) — a missing token just
 * means this device won't receive pushes, not a crash.
 */
export function usePushTokenRegistration(uid: string | undefined) {
  useEffect(() => {
    if (!uid) return;
    const currentUid = uid; // narrow once — TS won't carry the guard into the nested async closure below
    let cancelled = false;

    async function register() {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId) {
        console.warn('Geen EAS project ID gevonden — pushmeldingen zijn uitgeschakeld tot `eas init` is gedraaid.');
        return;
      }

      const { status: existing } = await Notifications.getPermissionsAsync();
      let status = existing;
      if (status !== 'granted') {
        const req = await Notifications.requestPermissionsAsync();
        status = req.status;
      }
      if (status !== 'granted') return;

      if (Platform.OS === 'android') {
        // HIGH (not DEFAULT) is what makes Android show this as a heads-up
        // banner — DEFAULT only ever lands quietly in the notification
        // shade. Android channels are immutable once created though, so
        // bumping this value alone won't fix a channel that already exists
        // on a device from an earlier build — that needs a fresh install.
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.HIGH,
        });
      }

      try {
        const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
        if (!cancelled) await registerPushToken(currentUid, token);
      } catch (err) {
        console.warn('Kon geen pushtoken ophalen:', err);
      }
    }

    register();
    return () => {
      cancelled = true;
    };
  }, [uid]);
}
