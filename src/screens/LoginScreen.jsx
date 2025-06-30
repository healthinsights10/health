import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'; // Add this import
import {useAuth} from '../context/AuthContext';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const LoginScreen = ({navigation}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // Add this state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {login, resendVerification} = useAuth();
  const insets = useSafeAreaInsets();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    try {
      setIsSubmitting(true);

      try {
        // Attempt to login
        const response = await login(email, password);

        // If we get here, login was successful
        // Navigation will be handled by AppNavigator
      } catch (error) {
        console.log('Login error:', error);

        // Check if the error is due to email verification
        if (
          error.needsVerification ||
          (error.message && error.message.includes('verify'))
        ) {
          Alert.alert(
            'Email Verification Required',
            'Please verify your email before logging in.',
            [
              {
                text: 'Resend Verification Email',
                onPress: async () => {
                  try {
                    await resendVerification(email);
                    Alert.alert(
                      'Verification Email Sent',
                      'A new verification link has been sent to your email address.',
                    );
                  } catch (resendError) {
                    Alert.alert(
                      'Error',
                      resendError.message ||
                        'Failed to resend verification email',
                    );
                  }
                },
              },
              {
                text: 'OK',
                style: 'cancel',
              },
            ],
          );
        } else {
          // Handle other login errors
          Alert.alert(
            'Login Failed',
            error.message || 'Please check your credentials',
          );
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={[styles.container, {paddingTop: insets.top}]}>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Login to your account</Text>
      </View>

      <View style={styles.formContainer}>
        <Text style={styles.inputLabel}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your email"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.inputLabel}>Password</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Enter your password"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword(!showPassword)}>
            <Icon
              name={showPassword ? 'eye-off' : 'eye'}
              size={20}
              color="#666"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.forgotPassword}>
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={handleLogin}
          disabled={isSubmitting}>
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Don't have an account?</Text>
        <TouchableOpacity onPress={() => navigation.replace('SignUp')}>
          <Text style={styles.signUpText}>Sign Up</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f7f9fc',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  header: {
    marginTop: 60,
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  formContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e1e1e1',
    fontSize: 16,
    color: '#333',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e1e1e1',
    marginBottom: 16,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#333',
  },
  eyeButton: {
    paddingHorizontal: 16,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
  },
  forgotPasswordText: {
    color: '#2e7af5',
    fontSize: 14,
  },
  buttonContainer: {
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#2e7af5',
    borderRadius: 12,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    marginRight: 4,
  },
  signUpText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2e7af5',
  },
});

export default LoginScreen;
