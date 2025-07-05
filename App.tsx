import React, {useEffect} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {AuthProvider} from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {fcmService} from './src/services/fcmService';
import NotificationHandler from './src/components/NotificationHandler';
import messaging from '@react-native-firebase/messaging';
import DeepLinkHandler from './src/components/DeepLinkHandler';
import {Platform, PermissionsAndroid, Alert} from 'react-native';

// Register background message handler before your App component
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Message handled in the background:', remoteMessage);
  return Promise.resolve();
});

const App = () => {
  useEffect(() => {
    const initializeFCM = async () => {
      try {
        console.log('🚀 Initializing FCM...');
        
        // Register app with FCM
        await fcmService.registerAppWithFCM();
        
        // For Android 13+ (API level 33+), request notification permission
        if (Platform.OS === 'android' && Platform.Version >= 33) {
          console.log('📱 Requesting Android 13+ notification permission...');
          try {
            const granted = await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
              {
                title: 'Enable Notifications',
                message: 'Stay updated with important messages, meeting invitations, and event notifications from MedEvents.',
                buttonNeutral: 'Ask Me Later',
                buttonNegative: 'No Thanks',
                buttonPositive: 'Allow Notifications',
              }
            );
            
            if (granted === PermissionsAndroid.RESULTS.GRANTED) {
              console.log('✅ Android notification permission granted');
            } else {
              console.log('❌ Android notification permission denied');
              // Show explanation dialog
              Alert.alert(
                'Notifications Disabled',
                'You can enable notifications anytime in Settings > Apps > MedEvents > Notifications',
                [
                  {text: 'OK', style: 'default'},
                ]
              );
            }
          } catch (err) {
            console.error('❌ Error requesting Android notification permission:', err);
          }
        }
        
        // Request FCM permission (this will show the iOS dialog)
        const fcmToken = await fcmService.requestUserPermission();
        
        if (fcmToken) {
          console.log('✅ FCM token obtained successfully');
        } else {
          console.log('⚠️ FCM permission denied or token not obtained');
        }
        
        console.log('✅ FCM initialization complete');
      } catch (error) {
        console.error('❌ Error initializing FCM:', error);
      }
    };

    // Initialize FCM
    initializeFCM();

    // Clean up on unmount
    return () => {
      fcmService.unregister();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <DeepLinkHandler />
          <AppNavigator />
          <NotificationHandler />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
};

export default App;
