import React, {useEffect} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {AuthProvider} from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {fcmService} from './src/services/fcmService';
import NotificationHandler from './src/components/NotificationHandler';
import messaging from '@react-native-firebase/messaging';

// Register background message handler before your App component
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Message handled in the background:', remoteMessage);
  return Promise.resolve();
});

const App = () => {
  useEffect(() => {
    // Initialize FCM
    fcmService.registerAppWithFCM();

    // Request permission and get token
    fcmService.requestUserPermission();

    // Clean up on unmount
    return () => {
      fcmService.unregister();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <AppNavigator />
          <NotificationHandler />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
};

export default App;
