import { useEffect, useRef, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { registerDevice, updateDeviceStatus } from '@services/operatorJobs';
import { useAuth } from '@context/AuthContext';

// Configuración de notificaciones
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const usePushNotifications = () => {
  const { user, pilotProfile } = useAuth();
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    // Configurar listeners para notificaciones
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('Notificación recibida:', notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('Respuesta a notificación:', response);
      // Aquí se puede manejar la navegación a pantallas específicas
      // basándose en el contenido de la notificación
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  const registerForPushNotifications = useCallback(async (retryCount = 0): Promise<string | null> => {
    const MAX_RETRIES = 3;
    const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff

    try {
      // Verificar si el dispositivo es físico (necesario para push notifications)
      if (!Device.isDevice) {
        console.warn('Push notifications only work on physical devices');
        return null;
      }

      // Configurar permisos de notificaciones
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Failed to get push token for push notification!');
        return null;
      }

      // Obtener el token del dispositivo
      const tokenData = await Notifications.getExpoPushTokenAsync();
      const deviceToken = tokenData.data;

      console.log('Device push token:', deviceToken);

      // Registrar el dispositivo en el backend si el usuario está autenticado
      if (user && pilotProfile && deviceToken) {
        try {
          await registerDevice(
            deviceToken,
            Platform.OS === 'ios' ? 'ios' : 'android'
          );
          console.log('Device registered successfully');
        } catch (error) {
          console.error('Failed to register device:', error);

          // Retry with exponential backoff
          if (retryCount < MAX_RETRIES) {
            console.log(`Retrying device registration in ${RETRY_DELAYS[retryCount]}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[retryCount]));
            return registerForPushNotifications(retryCount + 1);
          } else {
            console.error('Max retries reached for device registration');
          }
        }
      }

      return deviceToken;
    } catch (error) {
      console.error('Error registering for push notifications:', error);

      // Retry with exponential backoff
      if (retryCount < MAX_RETRIES) {
        console.log(`Retrying push notification registration in ${RETRY_DELAYS[retryCount]}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[retryCount]));
        return registerForPushNotifications(retryCount + 1);
      }

      return null;
    }
  }, [user, pilotProfile]);

  const unregisterDevice = useCallback(async (deviceToken: string): Promise<boolean> => {
    try {
      // First, try to find and deactivate the device in the backend
      if (user && pilotProfile) {
        try {
          // Get the user's devices and deactivate them
          // Note: This would need a proper endpoint to list devices for a user
          // For now, we'll just log and return success
          console.log('Unregistering device:', deviceToken);

          // In a complete implementation, you would call something like:
          // await updateDeviceStatus(deviceId, false);

        } catch (error) {
          console.error('Failed to unregister device from backend:', error);
          // Continue anyway since we want to clear local state
        }
      }

      // Clear the push token locally
      await Notifications.setBadgeCountAsync(0);

      return true;
    } catch (error) {
      console.error('Error unregistering device:', error);
      return false;
    }
  }, [user, pilotProfile]);

  const sendTestNotification = async () => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Prueba de notificación',
          body: '¡Las notificaciones push están funcionando!',
          sound: 'default',
        },
        trigger: { seconds: 2 },
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
    }
  };

  return {
    registerForPushNotifications,
    unregisterDevice,
    sendTestNotification,
    notificationListener: notificationListener.current,
    responseListener: responseListener.current,
  };
};
