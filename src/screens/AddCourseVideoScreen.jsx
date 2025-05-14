import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  Image,
} from 'react-native';
import {courseService} from '../services/api';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'react-native-image-picker';
import WebViewDocumentPicker from '../components/WebViewDocumentPicker';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Add this import
import api from '../services/api'; // Add this import for direct API access
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const AddCourseVideoScreen = ({route, navigation}) => {
  const {courseId} = route.params;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [video, setVideo] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [course, setCourse] = useState(null);
  const [sequenceOrder, setSequenceOrder] = useState(0);
  const [webViewPickerVisible, setWebViewPickerVisible] = useState(false);
  const insets = useSafeAreaInsets();
  useEffect(() => {
    // Set the auth token for requests and debug token availability
    const setAuthToken = async () => {
      try {
        // Log all possible token locations for debugging
        const asyncToken = await AsyncStorage.getItem('token');
        const atToken = await AsyncStorage.getItem('@token');

        console.log('[TOKEN DEBUG] AsyncStorage token:', asyncToken);
        console.log('[TOKEN DEBUG] AsyncStorage @token:', atToken);
        console.log(
          '[TOKEN DEBUG] Current API headers:',
          api.defaults.headers.common['Authorization'],
        );

        // Try both token formats
        const token = asyncToken || atToken;

        if (token) {
          console.log(
            '[TOKEN DEBUG] Setting auth token for requests:',
            token.substring(0, 10) + '...',
          );
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

          // Remove this line or check if the method exists first
          // courseService.setAuthToken(token);

          // Instead, use this:
          if (typeof courseService.setAuthToken === 'function') {
            courseService.setAuthToken(token);
          }
        } else {
          console.warn('[TOKEN DEBUG] No token found in AsyncStorage');

          // Check if user might be logged in through context
          const userString =
            (await AsyncStorage.getItem('user')) ||
            (await AsyncStorage.getItem('@user'));
          console.log('[TOKEN DEBUG] User data available:', !!userString);
        }
      } catch (error) {
        console.error('[TOKEN DEBUG] Error setting auth token:', error);
      }
    };

    setAuthToken();
    fetchCourseDetails();
  }, []);

  const fetchCourseDetails = async () => {
    try {
      const data = await courseService.getCourseById(courseId);
      setCourse(data);

      // Set the next sequence number
      if (data.videos && data.videos.length > 0) {
        const maxSequence = Math.max(...data.videos.map(v => v.sequence_order));
        setSequenceOrder(maxSequence + 1);
      }
    } catch (error) {
      console.error('Error fetching course details:', error);
      Alert.alert('Error', 'Failed to load course details');
    }
  };

  const openVideoPicker = () => {
    setWebViewPickerVisible(true);
  };

  const handleWebViewFilesSelected = files => {
    if (files && files.length > 0) {
      const selectedVideo = files[0];

      // Check if file is a video
      if (!selectedVideo.type.includes('video/')) {
        Alert.alert('Invalid File', 'Please select a video file');
        setWebViewPickerVisible(false);
        return;
      }

      // Set the video state
      setVideo({
        uri: selectedVideo.uri,
        type: selectedVideo.type,
        name: selectedVideo.name,
        size: selectedVideo.size,
      });
    }
    setWebViewPickerVisible(false);
  };

  const pickThumbnail = () => {
    const options = {
      mediaType: 'photo',
      quality: 0.7, // Reduced quality for better performance
      maxWidth: 600, // Reduced dimensions for better performance
      maxHeight: 600,
    };

    ImagePicker.launchImageLibrary(options, response => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        Alert.alert('Error', 'ImagePicker Error: ' + response.errorMessage);
      } else {
        try {
          const asset = response.assets[0];

          // Log detailed information about the selected image
          console.log('[THUMB DEBUG] Selected image:', {
            uri: asset.uri?.substring(0, 50) + '...',
            type: asset.type,
            fileName: asset.fileName,
            fileSize: asset.fileSize,
          });

          // Guard against invalid assets
          if (!asset.uri || !asset.type) {
            Alert.alert('Error', 'Invalid image selected');
            return;
          }

          // Set thumbnail with properly structured data
          setThumbnail({
            uri: asset.uri,
            type: asset.type || 'image/jpeg',
            name: asset.fileName || `image-${Date.now()}.jpg`,
            size: asset.fileSize,
          });

          console.log('[THUMB DEBUG] Thumbnail set successfully');
        } catch (error) {
          console.error(
            '[THUMB DEBUG] Error processing selected image:',
            error,
          );
          Alert.alert('Error', 'Failed to process the selected image');
        }
      }
    });
  };

  const handleAddVideo = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a video title');
      return;
    }

    if (!video) {
      Alert.alert('Error', 'Please select a video file');
      return;
    }

    try {
      setLoading(true);

      // Debug token before upload attempts
      const asyncToken = await AsyncStorage.getItem('token');
      const atToken = await AsyncStorage.getItem('@token');
      console.log(
        '[TOKEN DEBUG] Before upload - token available:',
        !!asyncToken || !!atToken,
      );

      // Ensure token is properly set in API headers
      const token = asyncToken || atToken;
      if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        console.log('[TOKEN DEBUG] API headers set with token');
      }

      // If no valid token, prompt for login
      if (!token) {
        Alert.alert(
          'Authentication Issue',
          'Your login session appears to have expired. Please re-login.',
          [{text: 'OK', onPress: () => navigation.navigate('Login')}],
        );
        return;
      }

      console.log('[VIDEO DEBUG] Starting video upload');
      // Upload video file with improved error handling
      let videoResult;
      try {
        videoResult = await courseService.uploadCourseVideo(video);
        console.log(
          '[VIDEO DEBUG] Video uploaded successfully:',
          videoResult.url?.substring(0, 50) + '...',
        );
      } catch (videoError) {
        console.error('[VIDEO DEBUG] Video upload failed:', videoError);
        throw new Error(`Video upload failed: ${videoError.message}`);
      }

      // Upload thumbnail if available
      let thumbnailUrl = null;
      if (thumbnail) {
        try {
          console.log('[THUMB DEBUG] Starting thumbnail upload');
          const thumbnailResult = await courseService.uploadCourseThumbnail(
            thumbnail,
          );
          thumbnailUrl = thumbnailResult.url;
          console.log(
            '[THUMB DEBUG] Thumbnail uploaded successfully:',
            thumbnailUrl?.substring(0, 50) + '...',
          );
        } catch (thumbError) {
          console.error('[THUMB DEBUG] Thumbnail upload failed:', thumbError);
          // Continue with video even if thumbnail fails
          Alert.alert(
            'Warning',
            'Thumbnail upload failed, but continuing with video upload',
          );
        }
      }

      // Add video to course with proper error handling
      try {
        await courseService.addVideoToCourse(courseId, {
          title: title.trim(),
          description: description.trim(),
          video_url: videoResult.url,
          thumbnail_url: thumbnailUrl,
          sequence_order: sequenceOrder,
          duration: 0,
        });

        console.log('[COURSE DEBUG] Video added to course successfully');
      } catch (courseError) {
        console.error(
          '[COURSE DEBUG] Failed to add video to course:',
          courseError,
        );
        throw new Error(
          `Failed to add video to course: ${courseError.message}`,
        );
      }

      Alert.alert('Success', 'Video added to the course', [
        {
          text: 'Add Another',
          onPress: () => {
            setTitle('');
            setDescription('');
            setVideo(null);
            setThumbnail(null);
            setSequenceOrder(sequenceOrder + 1);
          },
        },
        {
          text: 'Done',
          onPress: () => navigation.navigate('CourseDetails', {courseId}),
          style: 'cancel',
        },
      ]);
    } catch (error) {
      console.error('Error adding video:', error);

      // Enhanced error handling
      if (error.message && error.message.includes('Authentication token')) {
        Alert.alert(
          'Session Expired',
          'Your login session has expired. Please login again.',
          [{text: 'Login', onPress: () => navigation.navigate('Login')}],
        );
      } else {
        Alert.alert('Error', `Failed to add video: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, {paddingTop: insets.top}]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Course Video</Text>
        <View style={{width: 32}} />
      </View>

      <ScrollView style={styles.form}>
        {course && (
          <View style={styles.courseInfoCard}>
            <Text style={styles.courseInfoTitle}>{course.title}</Text>
            <Text style={styles.courseInfoVideos}>
              {course.videos?.length || 0} video(s) in course
            </Text>
          </View>
        )}

        <Text style={styles.label}>Video Title *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Enter video title"
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Enter video description"
          placeholderTextColor="#999"
          multiline
          textAlignVertical="top"
        />

        <Text style={styles.label}>Upload Video *</Text>
        <TouchableOpacity
          style={styles.uploadContainer}
          onPress={openVideoPicker}>
          {video ? (
            <View style={styles.videoSelectedContainer}>
              <Icon name="file-video" size={32} color="#2e7af5" />
              <View style={styles.videoInfoContainer}>
                <Text style={styles.videoName} numberOfLines={1}>
                  {video.name}
                </Text>
                <Text style={styles.videoSize}>
                  {(video.size / (1024 * 1024)).toFixed(2)} MB
                </Text>
              </View>
              <Icon name="check-circle" size={24} color="#4CAF50" />
            </View>
          ) : (
            <View style={styles.uploadContent}>
              <Icon name="upload" size={32} color="#888" />
              <Text style={styles.uploadText}>Tap to select a video file</Text>
              <Text style={styles.uploadSubtext}>
                MP4, MOV, or other video formats
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.label}>Video Thumbnail (Optional)</Text>
        <TouchableOpacity
          style={styles.thumbnailContainer}
          onPress={pickThumbnail}>
          {thumbnail ? (
            <Image
              source={{uri: thumbnail.uri}}
              style={styles.thumbnailPreview}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.thumbnailPlaceholder}>
              <Icon name="image-plus" size={32} color="#888" />
              <Text style={styles.thumbnailText}>
                Tap to select a thumbnail
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.submitButton,
            (!title || !video || loading) && styles.disabledButton,
          ]}
          onPress={handleAddVideo}
          disabled={!title || !video || loading}>
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Icon name="plus" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Add Video to Course</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* WebView Document Picker */}
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
    backgroundColor: '#2e7af5',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  form: {
    padding: 16,
  },
  courseInfoCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2e7af5',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  courseInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  courseInfoVideos: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  uploadContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
  },
  uploadContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  uploadText: {
    fontSize: 16,
    color: '#333',
    marginTop: 12,
  },
  uploadSubtext: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  videoSelectedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  videoInfoContainer: {
    flex: 1,
    marginLeft: 12,
  },
  videoName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  videoSize: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  thumbnailContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 24,
  },
  thumbnailPlaceholder: {
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f7f7f7',
  },
  thumbnailText: {
    marginTop: 8,
    fontSize: 14,
    color: '#888',
  },
  thumbnailPreview: {
    width: '100%',
    height: 160,
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#2e7af5',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  disabledButton: {
    backgroundColor: '#a0c0e8',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default AddCourseVideoScreen;
