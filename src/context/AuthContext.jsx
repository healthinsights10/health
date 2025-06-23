import React, {createContext, useState, useEffect} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {authService} from '../services/api';
import {fcmService} from '../services/fcmService';

// Add this line to define the API URL
const API_URL = 'http://192.168.1.4:5000';

export const AuthContext = createContext();

export const AuthProvider = ({children}) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is logged in (token exists in AsyncStorage)
  useEffect(() => {
    const loadStoredUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('@user');
        const storedToken = await AsyncStorage.getItem('@token');

        if (storedUser && storedToken) {
          setUser(JSON.parse(storedUser));
          authService.setAuthToken(storedToken);
        }
      } catch (error) {
        console.error('Failed to load authentication data', error);
      } finally {
        setLoading(false);
      }
    };

    loadStoredUser();
  }, []);

  // Modified login function to handle role-specific login
  const login = async (email, password) => {
    try {
      console.log('🔐 Logging in user...');
      setLoading(true);
      setError(null);

      const response = await authService.login(email, password);
      console.log('✅ Login successful:', response);

      if (response && response.token && response.user) {
        const {token, user} = response;

        // Store auth data
        await AsyncStorage.setItem('@token', token);
        await AsyncStorage.setItem('@user', JSON.stringify(user));

        console.log('💾 Auth data stored, registering FCM token...');

        // Register FCM token with server - add delay to ensure everything is ready
        setTimeout(async () => {
          try {
            await fcmService.registerTokenAfterLogin(token);
          } catch (fcmError) {
            console.error('FCM registration error during login:', fcmError);
          }
        }, 1000);

        setUser(user);
        setIsAuthenticated(true);
        return true;
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      setError(error.message || 'Login failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Modified signup to handle admin signup
  const signup = async userData => {
    try {
      setError(null);
      setLoading(true);
      await authService.signup(userData);
    } catch (error) {
      setError(error.message || 'Signup failed');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Fix the logout function
  const logout = async () => {
    try {
      setLoading(true);

      // Delete FCM token from server before logout
      const token = await AsyncStorage.getItem('@token');
      const fcmToken = await AsyncStorage.getItem('fcmToken');

      if (token && fcmToken) {
        try {
          const response = await fetch(`${API_URL}/api/users/fcm-token`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({token: fcmToken}),
          });

          if (response.ok) {
            console.log('FCM token removed from server');
          }
        } catch (error) {
          console.error('Error removing FCM token:', error);
        }
      }

      await AsyncStorage.removeItem('@token');
      await AsyncStorage.removeItem('@user');
      await AsyncStorage.removeItem('fcmToken');
      setUser(null);
    } catch (error) {
      console.error('Logout failed', error);
    } finally {
      setLoading(false);
    }
  };

  // Add this new function to your AuthProvider component
  const resendVerification = async email => {
    try {
      setError(null);
      setLoading(true);
      const response = await authService.resendVerificationEmail(email);
      return response;
    } catch (error) {
      setError(error.message || 'Failed to resend verification email');
      throw error;
    } finally {
      setLoading(false);
    }
  };
  const getToken = async () => {
    try {
      // Try AsyncStorage first
      const storedToken = await AsyncStorage.getItem('@token');

      if (storedToken) {
        return storedToken;
      }

      // If not in AsyncStorage but we have an authorized API, try to get from there
      const currentToken = authService.getAuthToken?.();
      if (currentToken) {
        // Save it to AsyncStorage for next time
        await AsyncStorage.setItem('@token', currentToken);
        return currentToken;
      }

      return null;
    } catch (error) {
      console.error('Error retrieving token:', error);
      return null;
    }
  };
  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        signup,
        logout,
        getToken,
        resendVerification, // Add this line
        isAuthenticated: !!user,
      }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook for easy auth context consumption
export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
