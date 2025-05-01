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
// Import the WebView document picker
import WebViewDocumentPicker from '../components/WebViewDocumentPicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { userService } from '../services/api';

const SignUpScreen = ({navigation}) => {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Additional fields based on role
  const [degree, setDegree] = useState('');
  const [company, setCompany] = useState('');

  // Document upload states
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Add state for WebView document picker
  const [webViewPickerVisible, setWebViewPickerVisible] = useState(false);

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
        name: doc.name || `file-${Date.now()}.${doc.uri.split('.').pop()}`
      });
      
      // Upload to our server endpoint
      const response = await fetch(`${api.defaults.baseURL}/uploads/document`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
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
    Alert.alert('Upload Error', 'Failed to upload documents: ' + error.message);
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

  // Update the handleSignUp function to properly include documents
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

    try {
      setIsSubmitting(true);

      // Create user data object based on role
      const userData = {
        name,
        email,
        password,
        role,
      };

      // Add role-specific fields
      if (role === 'doctor') {
        userData.degree = degree;
        // Documents will be uploaded after registration
      } else if (role === 'pharma') {
        userData.company = company;
      }

      // Debug log
      console.log('Sending user data for registration:', userData);

      // Register the user
      await signup(userData);

      // Now handle the document upload if needed
      if (role === 'doctor' && documents.length > 0) {
        // Show an intermediate message
        Alert.alert(
          'Account Created',
          'Your account has been created successfully! Now uploading your documents for verification.',
          [{ text: 'OK' }]
        );

        try {
          // Login first to get a valid token
          await login(email, password);
          
          // Now upload the documents with valid authentication
          const uploadedDocuments = await handleUploadDocuments();
          
          if (uploadedDocuments.length > 0) {
            // Update user profile with documents
            await userService.uploadDocuments(uploadedDocuments);
            
            Alert.alert(
              'Registration Complete',
              'Your account and documents have been submitted. An admin will review your documents for verification.',
              [{ text: 'Continue' }]
            );
          }
        } catch (uploadError) {
          console.error('Document upload error:', uploadError);
          Alert.alert(
            'Document Upload Failed',
            'Your account was created but we couldn\'t upload your documents. ' +
            'You can upload them later from your profile.',
            [{ text: 'OK' }]
          );
        }
      } else {
        // Show success message for regular users (no documents)
        Alert.alert(
          'Registration Successful',
          'Your account has been created successfully!',
          [{ text: 'Continue' }]
        );
      }
    } catch (error) {
      console.error('Signup error:', error);
      Alert.alert('Signup Failed', error.message || 'Please try again later');
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
    <ScrollView contentContainerStyle={styles.container}>
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
          </>
        )}

        <Text style={styles.inputLabel}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Create a password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <Text style={styles.inputLabel}>Confirm Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Confirm your password"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
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
});

export default SignUpScreen;
