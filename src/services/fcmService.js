import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Platform, Alert, Linking} from 'react-native';

const API_URL = 'https://health-server-bw3x.onrender.com/api';

class FCMService {
  async registerAppWithFCM() {
    try {
      console.log('🔧 Registering app with FCM...');
      if (Platform.OS === 'ios') {
        await messaging().registerDeviceForRemoteMessages();
        await messaging().setAutoInitEnabled(true);
      }
      console.log('✅ App registered with FCM');
    } catch (error) {
      console.error('❌ Error registering app with FCM:', error);
    }
  }

  async requestUserPermission() {
    console.log('🔔 Requesting FCM permission...');
    
    try {
      // Request permission with more explicit options
      const authStatus = await messaging().requestPermission({
        alert: true,
        announcement: false,
        badge: true,
        carPlay: false,
        provisional: false,
        sound: true,
      });
      
      console.log('🔔 FCM Permission status:', authStatus);
      console.log('🔔 Permission constants:', {
        AUTHORIZED: messaging.AuthorizationStatus.AUTHORIZED,
        DENIED: messaging.AuthorizationStatus.DENIED,
        NOT_DETERMINED: messaging.AuthorizationStatus.NOT_DETERMINED,
        PROVISIONAL: messaging.AuthorizationStatus.PROVISIONAL,
      });

      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('✅ FCM Permission granted');
        const token = await this.getFcmToken();
        return token;
      } else {
        console.log('❌ FCM permission rejected');
        
        // Show user-friendly explanation
        setTimeout(() => {
          Alert.alert(
            'Enable Notifications',
            'Get notified about important messages, meeting invitations, and event updates. You can enable notifications in Settings > Apps > MedEvents > Notifications.',
            [
              {
                text: 'Not Now',
                style: 'cancel',
              },
              {
                text: 'Open Settings',
                onPress: () => {
                  if (Platform.OS === 'ios') {
                    Linking.openURL('app-settings:');
                  } else {
                    Linking.openSettings();
                  }
                },
              },
            ]
          );
        }, 1000);
        
        return null;
      }
    } catch (error) {
      console.error('❌ Error requesting FCM permission:', error);
      return null;
    }
  }

  async getFcmToken() {
    try {
      console.log('🎟️ Getting FCM token...');
      const existingToken = await AsyncStorage.getItem('fcmToken');
      
      if (existingToken) {
        console.log('✅ Found existing FCM token:', existingToken.substring(0, 20) + '...');
        return existingToken;
      }

      const fcmToken = await messaging().getToken();
      
      if (fcmToken) {
        console.log('✅ New FCM Token generated:', fcmToken.substring(0, 20) + '...');
        await AsyncStorage.setItem('fcmToken', fcmToken);
        
        // Check if user is logged in and send to server
        const authToken = await AsyncStorage.getItem('@token');
        if (authToken) {
          await this.sendTokenToServer(fcmToken, authToken);
        }
        
        return fcmToken;
      } else {
        console.log('❌ No FCM token received');
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting FCM token:', error);
      return null;
    }
  }

  async sendTokenToServer(fcmToken, authToken) {
    try {
      console.log('📤 Sending FCM token to server...');
      console.log('📡 API URL:', `${API_URL}/users/fcm-token`);
      
      const response = await fetch(`${API_URL}/users/fcm-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({token: fcmToken}),
      });

      console.log('📡 Response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ FCM token registered with server:', result);
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to register FCM token:', response.status, errorText);
      }
    } catch (error) {
      console.error('❌ Network error registering FCM token:', error);
    }
  }

  async registerTokenAfterLogin(authToken) {
    console.log('🔄 Registering token after login...');
    const fcmToken = await AsyncStorage.getItem('fcmToken');
    if (fcmToken) {
      console.log('📤 Found existing token, sending to server...');
      await this.sendTokenToServer(fcmToken, authToken);
    } else {
      console.log('❓ No FCM token found, requesting new one...');
      const newToken = await this.getFcmToken();
      if (newToken) {
        await this.sendTokenToServer(newToken, authToken);
      }
    }
  }

  registerNotificationListeners(onNotification, onNotificationOpened) {
    console.log('👂 Registering notification listeners...');
    
    // Foreground message handler
    this.messageListener = messaging().onMessage(async remoteMessage => {
      console.log('📱 Notification received in foreground:', remoteMessage);
      if (onNotification) onNotification(remoteMessage);
    });

    // Background notification opened handler
    messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('📱 Notification opened app from background:', remoteMessage);
      if (onNotificationOpened) onNotificationOpened(remoteMessage);
    });

    // App opened from quit state
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log('📱 Notification opened app from quit state:', remoteMessage);
          if (onNotificationOpened) onNotificationOpened(remoteMessage);
        }
      });

    // Token refresh handler
    messaging().onTokenRefresh(async fcmToken => {
      console.log('🔄 FCM token refreshed:', fcmToken.substring(0, 20) + '...');
      await AsyncStorage.setItem('fcmToken', fcmToken);
      
      const authToken = await AsyncStorage.getItem('@token');
      if (authToken) {
        this.sendTokenToServer(fcmToken, authToken);
      }
    });
  }

  unregister() {
    console.log('🔇 Unregistering FCM listeners...');
    if (this.messageListener) {
      this.messageListener();
    }
  }

  async verifyTokenRegistration() {
    try {
      const fcmToken = await AsyncStorage.getItem('fcmToken');
      if (!fcmToken) {
        console.log('⚠️ No FCM token stored locally');
        return {success: false, error: 'No FCM token stored'};
      }

      console.log('📱 Found local FCM token:', fcmToken.substring(0, 15) + '...');

      const authToken = await AsyncStorage.getItem('@token');
      if (!authToken) {
        console.log('⚠️ User not logged in, cannot verify token with server');
        return {success: false, error: 'User not logged in'};
      }

      const response = await fetch(`${API_URL}/verify-fcm-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({fcmToken}),
      });

      const result = await response.json();
      console.log('🔍 FCM token verification result:', result);

      return result;
    } catch (error) {
      console.error('❌ Error verifying FCM token:', error);
      return {success: false, error: error.message};
    }
  }
}

export const fcmService = new FCMService();
