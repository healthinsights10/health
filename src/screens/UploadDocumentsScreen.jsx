import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'react-native-image-picker';
import RNFS from 'react-native-fs';
import WebViewDocumentPicker from '../components/WebViewDocumentPicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Platform} from 'react-native';
import {userService} from '../services/api';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const API_BASE_URL = 'https://health-server-bw3x.onrender.com/api';

const UploadDocumentsScreen = ({navigation}) => {
  const [documents, setDocuments] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [webViewPickerVisible, setWebViewPickerVisible] = useState(false);
  const insets = useSafeAreaInsets();

  const pickDocument = () => {
    setWebViewPickerVisible(true);
  };

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

  const handleUploadDocuments = async () => {
    if (documents.length === 0) {
      Alert.alert('Error', 'Please select at least one document to upload');
      return;
    }

    setIsSubmitting(true);

    try {
      const uploadedDocs = [];
      const token = await getAuthToken();

      if (!token) {
        Alert.alert('Error', 'Authentication token not found. Please login again.');
        return;
      }

      for (const doc of documents) {
        console.log(`📤 Uploading document: ${doc.name}`);

        // Validate file before upload
        if (!doc.uri || !doc.name) {
          console.error('❌ Invalid document data:', doc);
          throw new Error(`Invalid document: ${doc.name || 'unknown'}`);
        }

        // Create form data using XMLHttpRequest for better compatibility
        const formData = new FormData();
        formData.append('document', {
          uri: Platform.OS === 'ios' ? doc.uri.replace('file://', '') : doc.uri,
          type: doc.type || 'application/octet-stream',
          name: doc.name || `file-${Date.now()}.${doc.uri.split('.').pop()}`,
        });

        // Use XMLHttpRequest for the upload with enhanced error handling
        const result = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();

          // Set timeout
          xhr.timeout = 300000; // 5 minutes

          xhr.open('POST', `${API_BASE_URL}/uploads/document`);
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
          
          // Don't set Content-Type - let XMLHttpRequest set it with boundary

          xhr.onload = function() {
            console.log(`📥 Upload response: ${xhr.status} ${xhr.statusText}`);
            
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const response = JSON.parse(xhr.responseText);
                console.log('✅ Upload successful:', response);
                resolve(response);
              } catch (e) {
                console.error('❌ Invalid JSON response:', xhr.responseText);
                reject(new Error(`Invalid server response: ${xhr.responseText.substring(0, 200)}`));
              }
            } else {
              console.error('❌ Upload failed:', xhr.status, xhr.responseText);
              reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
            }
          };

          xhr.onerror = function() {
            console.error('❌ Network error during upload');
            reject(new Error('Network error occurred during upload. Please check your internet connection.'));
          };

          xhr.ontimeout = function() {
            console.error('❌ Upload timeout');
            reject(new Error('Upload timed out. Please try again with a smaller file.'));
          };

          xhr.onabort = function() {
            console.error('❌ Upload aborted');
            reject(new Error('Upload was cancelled.'));
          };

          // Add upload progress logging
          xhr.upload.onprogress = function(event) {
            if (event.lengthComputable) {
              const percentComplete = (event.loaded / event.total) * 100;
              console.log(`📊 Upload progress: ${percentComplete.toFixed(1)}%`);
            }
          };

          xhr.send(formData);
        });

        console.log('📋 Processing upload result:', result);

        // Validate the response
        if (!result.success || !result.url) {
          throw new Error(`Invalid upload response for ${doc.name}`);
        }

        // Create document object with Supabase URL and storage path
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

      // Upload the documents to user profile
      if (uploadedDocs.length > 0) {
        console.log('💾 Saving document references...');
        await userService.uploadDocuments(uploadedDocs);

        Alert.alert('Success', 'Documents uploaded successfully', [
          {text: 'OK', onPress: () => navigation.goBack()},
        ]);
      }
    } catch (error) {
      console.error('❌ Error uploading documents:', error);
      
      let errorMessage = 'Failed to upload documents. Please try again.';
      
      if (error.message.includes('Network error')) {
        errorMessage = 'Network connection failed. Please check your internet connection and try again.';
      } else if (error.message.includes('timeout') || error.message.includes('timed out')) {
        errorMessage = 'Upload timed out. Please try again with a smaller file or better internet connection.';
      } else if (error.message.includes('File too large')) {
        errorMessage = 'One or more files are too large. Maximum file size is 50MB.';
      } else if (error.message.includes('Invalid upload response')) {
        errorMessage = 'Server error during upload. Please try again later.';
      }
      
      Alert.alert('Upload Failed', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add this helper function to get the auth token
  const getAuthToken = async () => {
    try {
      const token = await AsyncStorage.getItem('@token');
      return token;
    } catch (error) {
      console.error('Failed to get auth token', error);
      return null;
    }
  };

  return (
    <SafeAreaView style={[styles.container, {paddingTop: insets.top}]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upload Documents</Text>
        <View style={{width: 24}} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>Medical Credentials</Text>
        <Text style={styles.sectionSubtitle}>
          Please upload your medical degree, certifications, or license
          documents for verification
        </Text>

        <View style={styles.uploadButtonsContainer}>
          <TouchableOpacity style={styles.uploadButton} onPress={pickDocument}>
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
                    name={doc.type.includes('image') ? 'image' : 'file-pdf-box'}
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

        <TouchableOpacity
          style={[
            styles.uploadButton,
            {
              marginTop: 20,
              backgroundColor: documents.length > 0 ? '#2e7af5' : '#ccc',
            },
          ]}
          onPress={handleUploadDocuments}
          disabled={isSubmitting || documents.length === 0}>
          {isSubmitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Icon name="upload" size={24} color="#fff" />
              <Text style={[styles.uploadButtonText, {color: '#fff'}]}>
                Upload Documents
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.infoContainer}>
          <Icon name="information-outline" size={20} color="#666" />
          <Text style={styles.infoText}>
            Your documents will be reviewed by our team for verification. This
            process may take 1-2 business days.
          </Text>
        </View>
      </ScrollView>

      <WebViewDocumentPicker
        visible={webViewPickerVisible}
        onClose={() => setWebViewPickerVisible(false)}
        onFilesSelected={handleWebViewFilesSelected}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9fc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
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
  infoContainer: {
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    padding: 16,
    marginTop: 24,
    marginBottom: 24,
    flexDirection: 'row',
  },
  infoText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
});

export default UploadDocumentsScreen;
