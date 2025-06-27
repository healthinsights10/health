import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {fcmService} from '../services/fcmService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import {useAuth} from '../context/AuthContext';

const API_URL = 'http://192.168.1.8:5000/api';
const FCMDebugScreen = () => {
  const {user} = useAuth(); // Changed from destructuring getAuthToken
  const [fcmToken, setFcmToken] = useState('');
  const [status, setStatus] = useState({});
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);

  const addLog = message => {
    const timestamp = new Date().toISOString().substring(11, 23);
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
  };

  useEffect(() => {
    const loadToken = async () => {
      const token = await AsyncStorage.getItem('fcmToken');
      setFcmToken(token || 'Not found');
      addLog(token ? 'FCM token loaded from storage' : 'No FCM token found');
    };

    loadToken();
  }, []);

  const requestNewToken = async () => {
    try {
      setLoading(true);
      addLog('Requesting new FCM token...');

      await AsyncStorage.removeItem('fcmToken');
      const token = await fcmService.getFcmToken();

      setFcmToken(token || 'Failed to get token');
      addLog(
        token
          ? `New token generated: ${token.substring(0, 10)}...`
          : 'Failed to generate token',
      );

      setStatus({
        success: !!token,
        message: token ? 'New token generated' : 'Failed to generate token',
      });
    } catch (error) {
      addLog(`Error: ${error.message}`);
      setStatus({
        success: false,
        message: `Error: ${error.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const verifyToken = async () => {
    try {
      setLoading(true);
      addLog('Verifying FCM token...');

      const result = await fcmService.verifyTokenRegistration();
      setStatus(result);

      addLog(`Verification result: ${result.success ? 'Success' : 'Failed'}`);
      if (result.message) {
        addLog(`Message: ${result.message}`);
      }
    } catch (error) {
      addLog(`Error: ${error.message}`);
      setStatus({
        success: false,
        message: `Error: ${error.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  // Add this function to get the auth token properly
  const getAuthToken = async () => {
    try {
      // Try to get from AsyncStorage first
      let token = await AsyncStorage.getItem('@token');

      if (!token) {
        // Try alternative storage key
        token = await AsyncStorage.getItem('token');
      }

      if (token) {
        // Make sure token has proper format
        return token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      }

      // If not in AsyncStorage, try to get from context
      if (user && user.token) {
        return user.token.startsWith('Bearer ')
          ? user.token
          : `Bearer ${user.token}`;
      }

      addLog('No valid auth token found');
      return null;
    } catch (error) {
      addLog('Failed to get auth token: ' + error.message);
      return null;
    }
  };

  const sendTestNotification = async () => {
    try {
      setLoading(true);
      addLog('Sending test notification...');

      const authToken = await getAuthToken();

      if (!authToken) {
        throw new Error('Authentication token not found');
      }

      addLog(`Auth token retrieved: ${authToken.substring(0, 15)}...`);

      // Check if server is reachable before making the request
      // try {
      //   // Simple ping to check server connectivity
      //   await axios.get(`${API_URL}/health`, {timeout: 5000});
      //   addLog('Server is reachable');
      // } catch (pingError) {
      //   addLog(`Server connectivity check failed: ${pingError.message}`);
      //   // Continue anyway, the main request might still work
      // }

      addLog(`Making request to: ${API_URL}/test-notification`);

      const response = await axios.post(
        `${API_URL}/test-notification`,
        {fcmToken},
        {
          headers: {Authorization: authToken},
          timeout: 10000, // 10 second timeout
        },
      );

      addLog(`Response: ${JSON.stringify(response.data)}`);
      setStatus({
        success: response.data.success,
        message: response.data.message,
      });
    } catch (error) {
      const errorMessage = error.response
        ? `Server error: ${error.response.status} - ${JSON.stringify(
            error.response.data,
          )}`
        : `Network error: ${error.message}`;

      addLog(`Error: ${errorMessage}`);
      setStatus({
        success: false,
        message: `Error: ${error.message}. Check that your server is running at ${API_URL}`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>FCM Debug Tool</Text>

      <View style={styles.tokenContainer}>
        <Text style={styles.label}>FCM Token:</Text>
        <Text style={styles.tokenText} numberOfLines={3} ellipsizeMode="middle">
          {fcmToken || 'Loading...'}
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={requestNewToken}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Generate New Token</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={verifyToken}
          disabled={loading || !fcmToken}>
          <Text style={styles.buttonText}>Verify Token</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.warningButton]}
          onPress={sendTestNotification}
          disabled={loading || !fcmToken}>
          <Text style={styles.buttonText}>Send Test Notification</Text>
        </TouchableOpacity>
      </View>

      {status.message && (
        <View
          style={[
            styles.statusContainer,
            status.success ? styles.successStatus : styles.errorStatus,
          ]}>
          <Text style={styles.statusText}>{status.message}</Text>
        </View>
      )}

      <Text style={styles.logsTitle}>Debug Logs:</Text>
      <ScrollView style={styles.logsContainer}>
        {logs.map((log, i) => (
          <Text key={i} style={styles.logText}>
            {log}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  tokenContainer: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  tokenText: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'monospace',
  },
  buttonContainer: {
    marginBottom: 16,
  },
  button: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  primaryButton: {
    backgroundColor: '#2e7af5',
  },
  secondaryButton: {
    backgroundColor: '#4CAF50',
  },
  warningButton: {
    backgroundColor: '#FF9800',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  statusContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  successStatus: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
    borderWidth: 1,
  },
  errorStatus: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
    borderWidth: 1,
  },
  statusText: {
    color: '#333',
  },
  logsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  logsContainer: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 8,
  },
  logText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#333',
    marginBottom: 4,
  },
});

export default FCMDebugScreen;
