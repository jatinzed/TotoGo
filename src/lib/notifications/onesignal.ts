import OneSignal from 'react-onesignal';
import { supabase } from '../supabase/client';

export async function initOneSignal() {
  const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
  if (!appId) {
    console.warn('VITE_ONESIGNAL_APP_ID not found');
    return;
  }

  try {
    await OneSignal.init({
      appId: appId,
      allowLocalhostAsSecureOrigin: true,
      serviceWorkerParam: { scope: '/push/onesignal/' },
      serviceWorkerPath: 'OneSignalSDKWorker.js',
    });

    const permission = await (OneSignal.Notifications as any).permission;
    if (permission !== 'granted') {
      await OneSignal.Notifications.requestPermission();
    }

    const playerId = (OneSignal.User as any).PushSubscription.id;
    if (playerId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('push_tokens').upsert({
          user_id: user.id,
          token: playerId,
          device_type: 'onesignal',
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id, token' });
      }
    }
  } catch (error) {
    console.error('Error initializing OneSignal:', error);
  }
}

export async function sendPushNotification(userId: string, title: string, message: string) {
  // In a real app, this should be called from a server-side Edge Function
  // to avoid exposing OneSignal API REST Key.
  // We will call a placeholder Supabase Edge Function here.
  try {
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: { userId, title, message }
    });
    console.log('Push notification response:', data);
    if (error) throw error;
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
}
