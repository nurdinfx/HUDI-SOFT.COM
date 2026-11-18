import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure default notification handler behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const NotificationService = {
  // Request permissions and register for push notifications
  async registerForPushNotificationsAsync(): Promise<string | null> {
    if (Platform.OS === 'web') return null;

    try {
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

      // Get Expo Push Token
      const tokenData = await Notifications.getExpoPushTokenAsync();
      const token = tokenData.data;
      console.log('Expo Push Token registered:', token);

      // Android specific channel setup
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#4F46E5',
        });
      }

      return token;
    } catch (err) {
      console.error('Push notification registration failed:', err);
      return null;
    }
  },

  // Setup listeners for notification events
  setupListeners(
    onReceived: (notification: Notifications.Notification) => void,
    onOpened: (response: Notifications.NotificationResponse) => void
  ) {
    const receivedSub = Notifications.addNotificationReceivedListener(onReceived);
    const responseSub = Notifications.addNotificationResponseReceivedListener(onOpened);

    // Return cleanup function
    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  },
};
