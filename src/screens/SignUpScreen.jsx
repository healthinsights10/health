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
  Image,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useAuth} from '../context/AuthContext';
import * as ImagePicker from 'react-native-image-picker';
import RNFS from 'react-native-fs';
import WebViewDocumentPicker from '../components/WebViewDocumentPicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {api} from '../services/api';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

// Use the same API URL as the auth service
const API_BASE_URL = 'http://192.168.1.4:5000/api';

const SignUpScreen = ({navigation}) => {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [roleInCompany, setRoleInCompany] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Additional fields based on role
  const [degree, setDegree] = useState('');
  const [company, setCompany] = useState('');
  const insets = useSafeAreaInsets();
  // Document upload states
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Add state for WebView document picker
  const [webViewPickerVisible, setWebViewPickerVisible] = useState(false);

  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {signup, login} = useAuth();

  const selectRole = selectedRole => {
    setRole(selectedRole);
    setStep(2);
  };

  // Replace your old document picker function with this one
  const pickDocument = () => {
    setWebViewPickerVisible(true);
  };

  // Handle files selected from WebView
  const handleWebViewFilesSelected = files => {
    setWebViewPickerVisible(false);

    if (files && files.length > 0) {
      const newDocs = files.map(file => ({
        name: file.name,
        type: file.type,
        uri: file.uri,
        size: file.size,
      }));

      setDocuments(prev => [...prev, ...newDocs]);
    }
  };

  const removeDocument = index => {
    const newDocs = [...documents];
    newDocs.splice(index, 1);
    setDocuments(newDocs);
  };

  const takePhoto = () => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
    };

    ImagePicker.launchCamera(options, response => {
      if (response.didCancel) {
        console.log('User cancelled camera');
      } else if (response.errorCode) {
        Alert.alert('Error', 'Camera Error: ' + response.errorMessage);
      } else {
        const asset = response.assets[0];
        const newDoc = {
          name: `Photo_${new Date().toISOString()}.jpg`,
          type: asset.type,
          uri: asset.uri,
          size: asset.fileSize,
        };
        setDocuments([...documents, newDoc]);
      }
    });
  };

  const pickFromGallery = () => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
    };

    ImagePicker.launchImageLibrary(options, response => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        Alert.alert('Error', 'ImagePicker Error: ' + response.errorMessage);
      } else {
        const asset = response.assets[0];
        const newDoc = {
          name: asset.fileName || `Image_${new Date().toISOString()}.jpg`,
          type: asset.type,
          uri: asset.uri,
          size: asset.fileSize,
        };
        setDocuments([...documents, newDoc]);
      }
    });
  };

  // Update the handleUploadDocuments function with a non-Expo approach

  // In handleUploadDocuments function

  const handleUploadDocuments = async () => {
    if (documents.length === 0) {
      return [];
    }

    setUploading(true);

    try {
      const uploadedDocs = [];
      const token = await getAuthToken();

      for (const doc of documents) {
        console.log(`Uploading document: ${doc.name}`);

        // Create form data
        const formData = new FormData();

        // Add file to form data
        formData.append('document', {
          uri: Platform.OS === 'ios' ? doc.uri.replace('file://', '') : doc.uri,
          type: doc.type || 'application/octet-stream',
          name: doc.name || `file-${Date.now()}.${doc.uri.split('.').pop()}`,
        });

        // Upload to our server endpoint
        const response = await fetch(`${API_BASE_URL}/uploads/document`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            // Don't set Content-Type for multipart/form-data
          },
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Upload failed:', errorText);
          throw new Error(`Upload failed: ${response.status} ${errorText}`);
        }

        const result = await response.json();
        console.log('Upload result:', result);

        uploadedDocs.push({
          name: doc.name,
          type: doc.type,
          size: doc.size,
          url: result.url,
          storage_path: result.storage_path,
          upload_date: new Date().toISOString(),
          verified: false,
        });
      }

      console.log(`Successfully uploaded ${uploadedDocs.length} documents`);
      return uploadedDocs;
    } catch (error) {
      console.error('Document upload error:', error);
      Alert.alert(
        'Upload Error',
        'Failed to upload documents: ' + error.message,
      );
      return [];
    } finally {
      setUploading(false);
    }
  };

  // Helper function to get the auth token
  const getAuthToken = async () => {
    try {
      const token = await AsyncStorage.getItem('@token');
      return token;
    } catch (error) {
      console.error('Failed to get auth token', error);
      return null;
    }
  };

  // Update the handleSignUp function to treat pharma documents the same as doctor documents

  const handleSignUp = async () => {
    // Simple validation
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    // Make document upload required for doctors
    if (role === 'doctor' && documents.length === 0) {
      Alert.alert(
        'Error',
        'Please upload at least one document for verification',
      );
      return;
    }

    try {
      setIsSubmitting(true);

      // First, prepare and upload the documents to get their URLs
      let documentData = [];

      if (documents.length > 0) {
        // Show a loading message
        Alert.alert('Processing', 'Uploading your documents. Please wait...', [
          {text: 'OK'},
        ]);

        try {
          // Upload documents to temporary storage first
          for (const doc of documents) {
            const formData = new FormData();

            formData.append('document', {
              uri:
                Platform.OS === 'ios' ? doc.uri.replace('file://', '') : doc.uri,
              type: doc.type || 'application/octet-stream',
              name: doc.name || `file-${Date.now()}.${doc.uri.split('.').pop()}`,
            });

            console.log('Uploading document to:', `${API_BASE_URL}/uploads/temp-document`);

            // Use the constant instead of api.defaults.baseURL
            const response = await fetch(
              `${API_BASE_URL}/uploads/temp-document`,
              {
                method: 'POST',
                body: formData,
                headers: {
                  'Content-Type': 'multipart/form-data',
                },
              },
            );

            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(
                `Document upload failed: ${response.status} ${errorText}`,
              );
            }

            const result = await response.json();

            documentData.push({
              name: doc.name,
              type: doc.type,
              size: doc.size,
              url: result.url,
              storage_path: result.storage_path,
            });
          }
        } catch (uploadError) {
          console.error('Document upload error:', uploadError);
          throw new Error(`Document upload failed: ${uploadError.message}`);
        }
      }

      // Create user data object including document info
      const userData = {
        name,
        email,
        password,
        role,
        phone,
        // Include uploaded documents data in the signup request
        documents: documentData,
      };

      // Add role-specific fields
      if (role === 'doctor') {
        userData.degree = degree;
      } else if (role === 'pharma') {
        userData.company = company;
        userData.roleInCompany = roleInCompany;
      }

      console.log('Sending user data for registration:', {
        ...userData,
        password: '***',
        documents: `${documentData.length} documents`,
      });

      // Register the user with documents included
      await signup(userData);

      // Show success message with instructions to verify email
      Alert.alert(
        'Registration Complete!',
        'Your account has been created and your documents have been submitted. Please check your email to verify your account before logging in.',
        [
          {
            text: 'Go to Login',
            onPress: () => navigation.replace('Login'),
          },
        ],
      );
    } catch (error) {
      console.error('Signup error:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Please try again later';
      
      if (error.message.includes('Network request failed')) {
        errorMessage = 'Network connection failed. Please check your internet connection and server status.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Request timed out. Please check your internet connection and try again.';
      } else if (error.message.includes('Document upload failed')) {
        errorMessage = error.message;
      } else if (error.response?.status === 400) {
        errorMessage = error.response?.data?.message || 'Invalid user data provided';
      } else if (error.response?.status === 409) {
        errorMessage = 'An account with this email already exists';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Signup Failed', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Role Selection Screen
  if (step === 1) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Join MedEvent</Text>
          <Text style={styles.subtitle}>What best describes you?</Text>
        </View>

        <View style={styles.roleContainer}>
          <TouchableOpacity
            style={styles.roleCard}
            onPress={() => selectRole('doctor')}>
            <Icon name="doctor" size={60} color="#2e7af5" />
            <Text style={styles.roleTitle}>Doctor</Text>
            <Text style={styles.roleDescription}>
              Access medical conferences, CME courses, and connect with
              colleagues.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.roleCard}
            onPress={() => selectRole('pharma')}>
            <Icon name="pill" size={60} color="#2e7af5" />
            <Text style={styles.roleTitle}>Pharmaceutical Rep</Text>
            <Text style={styles.roleDescription}>
              Connect with healthcare professionals and showcase your products.
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <TouchableOpacity onPress={() => navigation.replace('Login')}>
            <Text style={styles.loginText}>Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // Registration Form Screen
  return (
    <ScrollView style={[styles.container, {paddingTop: insets.top}]}>
      <TouchableOpacity style={styles.backButton} onPress={() => setStep(1)}>
        <Icon name="arrow-left" size={24} color="#2e7af5" />
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>
          Sign up as{' '}
          {role === 'doctor'
            ? 'Healthcare Professional'
            : 'Pharmaceutical Representative'}
        </Text>
      </View>

      <View style={styles.formContainer}>
        <Text style={styles.inputLabel}>Full Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your full name"
          value={name}
          onChangeText={setName}
        />
        <Text style={styles.inputLabel}>Phone Number</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your phone number"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <Text style={styles.inputLabel}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your email"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        {role === 'doctor' && (
          <>
            <Text style={styles.inputLabel}>Medical Specialty</Text>
            <TextInput
              style={styles.input}
              placeholder="E.g., Cardiology, Pediatrics"
              value={degree}
              onChangeText={setDegree}
            />

            <Text style={styles.sectionTitle}>Upload Medical Credentials</Text>
            <Text style={styles.sectionSubtitle}>
              Please upload your medical degree, certifications, or license
              documents
            </Text>

            <View style={styles.uploadButtonsContainer}>
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={pickDocument}>
                <Icon name="file-document-outline" size={24} color="#2e7af5" />
                <Text style={styles.uploadButtonText}>Browse Files</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.uploadButton} onPress={takePhoto}>
                <Icon name="camera" size={24} color="#2e7af5" />
                <Text style={styles.uploadButtonText}>Take Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.uploadButton}
                onPress={pickFromGallery}>
                <Icon name="image" size={24} color="#2e7af5" />
                <Text style={styles.uploadButtonText}>From Gallery</Text>
              </TouchableOpacity>
            </View>

            {documents.length > 0 && (
              <View style={styles.documentListContainer}>
                <Text style={styles.documentListTitle}>
                  Selected Documents ({documents.length})
                </Text>
                {documents.map((doc, index) => (
                  <View key={index} style={styles.documentItem}>
                    <View style={styles.documentInfo}>
                      <Icon
                        name={
                          doc.type.includes('image') ? 'image' : 'file-pdf-box'
                        }
                        size={24}
                        color="#2e7af5"
                      />
                      <View style={styles.documentDetails}>
                        <Text style={styles.documentName} numberOfLines={1}>
                          {doc.name}
                        </Text>
                        <Text style={styles.documentSize}>
                          {(doc.size / 1024).toFixed(1)} KB
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => removeDocument(index)}
                      style={styles.documentRemove}>
                      <Icon name="close" size={20} color="#ff4c4c" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {role === 'pharma' && (
          <>
            <Text style={styles.inputLabel}>Company Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your company name"
              value={company}
              onChangeText={setCompany}
            />
            <Text style={styles.inputLabel}>Role in Company</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your role in the company"
              value={roleInCompany}
              onChangeText={setRoleInCompany}
            />

            <Text style={styles.sectionTitle}>Upload Company Credentials</Text>
            <Text style={styles.sectionSubtitle}>
              Please upload company registration, license, or accreditation
              documents (Optional)
            </Text>

            <View style={styles.uploadButtonsContainer}>
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={pickDocument}>
                <Icon name="file-document-outline" size={24} color="#2e7af5" />
                <Text style={styles.uploadButtonText}>Browse Files</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.uploadButton} onPress={takePhoto}>
                <Icon name="camera" size={24} color="#2e7af5" />
                <Text style={styles.uploadButtonText}>Take Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.uploadButton}
                onPress={pickFromGallery}>
                <Icon name="image" size={24} color="#2e7af5" />
                <Text style={styles.uploadButtonText}>From Gallery</Text>
              </TouchableOpacity>
            </View>

            {documents.length > 0 && (
              <View style={styles.documentListContainer}>
                <Text style={styles.documentListTitle}>
                  Selected Documents ({documents.length})
                </Text>
                {documents.map((doc, index) => (
                  <View key={index} style={styles.documentItem}>
                    <View style={styles.documentInfo}>
                      <Icon
                        name={
                          doc.type.includes('image') ? 'image' : 'file-pdf-box'
                        }
                        size={24}
                        color="#2e7af5"
                      />
                      <View style={styles.documentDetails}>
                        <Text style={styles.documentName} numberOfLines={1}>
                          {doc.name}
                        </Text>
                        <Text style={styles.documentSize}>
                          {(doc.size / 1024).toFixed(1)} KB
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => removeDocument(index)}
                      style={styles.documentRemove}>
                      <Icon name="close" size={20} color="#ff4c4c" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        <Text style={styles.inputLabel}>Password</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Create a password"
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

        <Text style={styles.inputLabel}>Confirm Password</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Confirm your password"
            secureTextEntry={!showConfirmPassword}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
            <Icon
              name={showConfirmPassword ? 'eye-off' : 'eye'}
              size={20}
              color="#666"
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.termsContainer}>
        <Text style={styles.termsText}>
          By signing up, you agree to our Terms of Service and Privacy Policy
          {role === 'doctor' &&
            '. Your credentials will be verified by an admin.'}
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={handleSignUp}
          disabled={isSubmitting || uploading}>
          {isSubmitting || uploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Create Account</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account?</Text>
        <TouchableOpacity onPress={() => navigation.replace('Login')}>
          <Text style={styles.loginText}>Login</Text>
        </TouchableOpacity>
      </View>

      {/* Add the WebView document picker component */}
      <WebViewDocumentPicker
        visible={webViewPickerVisible}
        onClose={() => setWebViewPickerVisible(false)}
        onFilesSelected={handleWebViewFilesSelected}
      />
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
  backButton: {
    marginTop: 40,
  },
  header: {
    marginTop: 40,
    marginBottom: 30,
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
  roleContainer: {
    marginVertical: 20,
  },
  roleCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  roleTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  roleDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
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
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  uploadButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  uploadButton: {
    flex: 1,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#2e7af5',
    borderStyle: 'dashed',
  },
  uploadButtonText: {
    color: '#2e7af5',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  documentListContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  documentListTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  documentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  documentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  documentDetails: {
    marginLeft: 8,
    flex: 1,
  },
  documentName: {
    fontSize: 14,
    color: '#333',
  },
  documentSize: {
    fontSize: 12,
    color: '#666',
  },
  documentRemove: {
    padding: 4,
  },
  termsContainer: {
    marginBottom: 24,
  },
  termsText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
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
    marginTop: 16,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    marginRight: 4,
  },
  loginText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2e7af5',
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
  },
  eyeButton: {
    paddingHorizontal: 16,
  },
});

export default SignUpScreen;
