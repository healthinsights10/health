import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  FlatList,
  SafeAreaView,
  Dimensions,
  BackHandler, // Add this import
} from 'react-native';
import {courseService} from '../services/api';
import Video from 'react-native-video';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useAuth} from '../context/AuthContext';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import CourseDiscussion from '../components/CourseDiscussion';

const {width} = Dimensions.get('window');

const CourseDetailsScreen = ({route, navigation}) => {
  const {courseId} = route.params;
  const {user} = useAuth();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef(null);
  const insets = useSafeAreaInsets();

  // Add new state variables
  const [initialVideoId, setInitialVideoId] = useState(null);
  const [focusComment, setFocusComment] = useState(null);

  // Add useEffect to handle hardware back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        handleBackNavigation();
        return true; // Prevent default back action
      },
    );

    return () => backHandler.remove();
  }, []);

  useEffect(() => {
    fetchCourseDetails();

    // Check if we need to focus on a specific video/comment
    const initialVideoId = route.params?.initialVideoId;
    const focusComment = route.params?.focusComment;

    if (initialVideoId) {
      // Store this to focus after loading
      setInitialVideoId(initialVideoId);
      setFocusComment(focusComment);
    } else if (focusComment) {
      // Just focus on a comment in the general discussion
      setFocusComment(focusComment);
    }
  }, [courseId]);

  // Add this function to handle back navigation
  const handleBackNavigation = () => {
    // Check if we can go back to Courses screen
    const navigationState = navigation.getState();
    const routeNames = navigationState.routes.map(route => route.name);

    // If Courses screen exists in the stack, navigate to it
    if (routeNames.includes('Courses')) {
      navigation.goBack();
    } else {
      // Otherwise, reset navigation to Courses
      navigation.goBack();
    }
  };

  const fetchCourseDetails = async () => {
    try {
      setLoading(true);
      const data = await courseService.getCourseById(courseId);
      setCourse(data);

      // Select the specific video if initialVideoId is provided
      if (initialVideoId && data.videos) {
        const videoToSelect = data.videos.find(
          v => v.id.toString() === initialVideoId,
        );
        if (videoToSelect) {
          setSelectedVideo(videoToSelect);
        } else {
          // Fallback to first video
          if (data.videos.length > 0) {
            setSelectedVideo(data.videos[0]);
          }
        }
      } else if (data.videos && data.videos.length > 0) {
        // Default behavior - select first video
        setSelectedVideo(data.videos[0]);
      }
    } catch (error) {
      console.error('Error fetching course details:', error);
      Alert.alert('Error', 'Failed to load course details');
    } finally {
      setLoading(false);
    }
  };

  const refreshCourse = async () => {
    try {
      await fetchCourseDetails();
    } catch (error) {
      console.error('Error refreshing course:', error);
    }
  };

  const handleDeleteCourse = async () => {
    Alert.alert(
      'Delete Course',
      'Are you sure you want to delete this course? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              console.log('Starting course deletion process...');
              await courseService.deleteCourse(courseId);
              console.log('Course deleted successfully');

              Alert.alert('Success', 'Course deleted successfully', [
                {
                  text: 'OK',
                  onPress: () => handleBackNavigation(),
                },
              ]);
            } catch (error) {
              console.error('Error deleting course:', error);

              let errorMessage = 'Failed to delete course';
              if (
                error.response &&
                error.response.data &&
                error.response.data.message
              ) {
                errorMessage = error.response.data.message;
              }

              Alert.alert('Error', errorMessage);
            }
          },
          style: 'destructive',
        },
      ],
    );
  };

  const handleSelectVideo = video => {
    console.log('Selecting video:', {
      id: video.id,
      title: video.title,
      course_id: video.course_id,
    });

    setSelectedVideo(video);
    setIsPlaying(true);
  };

  const renderVideoItem = ({item, index}) => {
    const isActive = selectedVideo && selectedVideo.id === item.id;

    return (
      <TouchableOpacity
        style={[styles.videoCard, isActive && styles.activeVideoCard]}
        onPress={() => handleSelectVideo(item)}>
        <View style={styles.videoCardContent}>
          <View style={styles.videoIconContainer}>
            <Icon
              name={isActive ? 'play-circle' : 'play-circle-outline'}
              size={32}
              color={isActive ? '#2e7af5' : '#4a90e2'}
            />
          </View>
          <View style={styles.videoInfo}>
            <Text
              style={[
                styles.videoCardTitle,
                isActive && styles.activeVideoTitle,
              ]}
              numberOfLines={2}>
              {item.title}
            </Text>
            {item.description && (
              <Text style={styles.videoCardDescription} numberOfLines={2}>
                {item.description}
              </Text>
            )}
            <View style={styles.videoMeta}>
              {item.duration && (
                <View style={styles.durationContainer}>
                  <Icon name="clock-outline" size={14} color="#666" />
                  <Text style={styles.videoDuration}>
                    {Math.floor(item.duration / 60)}:
                    {(item.duration % 60).toString().padStart(2, '0')}
                  </Text>
                </View>
              )}
              <Text style={styles.videoNumber}>Video {index + 1}</Text>
            </View>
          </View>
        </View>

        {/* Progress indicator if needed */}
        {isActive && (
          <View style={styles.activeIndicator}>
            <View style={styles.activeIndicatorBar} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2e7af5" />
        <Text style={styles.loadingText}>Loading course...</Text>
      </SafeAreaView>
    );
  }

  if (!course) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Icon name="alert-circle-outline" size={60} color="#ff6b6b" />
        <Text style={styles.errorText}>Course not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackNavigation}>
          {' '}
          {/* Update this */}
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const canManageCourse =
    user &&
    (user.role === 'admin' ||
      (user.role === 'doctor' && user.id === course.creator_id));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackNavigation}>
          {' '}
          {/* Update this */}
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {course.title}
        </Text>

        {canManageCourse && (
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.navigate('AddCourseVideo', {courseId})}>
              <Icon name="plus-circle" size={24} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleDeleteCourse}>
              <Icon name="delete" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Rest of your component remains the same */}
      <ScrollView style={styles.content}>
        {selectedVideo ? (
          <View style={styles.videoContainer}>
            <Video
              ref={videoRef}
              source={{uri: selectedVideo.video_url}}
              style={styles.videoPlayer}
              controls={true}
              paused={!isPlaying}
              resizeMode="contain"
              onError={error => console.error('Video error:', error)}
            />
            <Text style={styles.videoTitle}>{selectedVideo.title}</Text>
            {selectedVideo.description && (
              <Text style={styles.videoDescription}>
                {selectedVideo.description}
              </Text>
            )}

            {/* Course Content Section - Show SECOND (after discussion) */}
            <View style={styles.courseContentSection}>
              <Text style={styles.sectionTitle}>Course Content</Text>
              {course.videos && course.videos.length > 0 ? (
                <FlatList
                  data={course.videos}
                  renderItem={renderVideoItem}
                  keyExtractor={item => item.id.toString()}
                  scrollEnabled={false}
                  showsVerticalScrollIndicator={false}
                  ItemSeparatorComponent={() => (
                    <View style={styles.videoCardSeparator} />
                  )}
                />
              ) : (
                <View style={styles.noVideosContainer}>
                  <Icon name="video-off" size={40} color="#ccc" />
                  <Text style={styles.noVideosText}>No videos available</Text>
                  {canManageCourse && (
                    <TouchableOpacity
                      style={styles.addVideoButton}
                      onPress={() =>
                        navigation.navigate('AddCourseVideo', {courseId})
                      }>
                      <Text style={styles.addVideoButtonText}>Add a Video</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

            {/* Video-specific Discussion Section */}
            <View style={styles.videoDiscussionSection}>
              <Text style={styles.sectionTitle}>
                Discussion: {selectedVideo.title}
              </Text>
              <Text style={styles.sectionSubtitle}>
                Comments for this video only
              </Text>
              <CourseDiscussion
                key={`video-${selectedVideo.id}`}
                courseId={courseId}
                videoId={selectedVideo.id.toString()}
                user={user}
                refreshDiscussions={refreshCourse}
                discussionType="video"
                focusComment={
                  selectedVideo.id.toString() === initialVideoId
                    ? focusComment
                    : null
                }
              />
            </View>
          </View>
        ) : (
          <View>
            <View style={styles.noVideoContainer}>
              <Image
                source={{
                  uri:
                    course.thumbnail_url ||
                    'https://via.placeholder.com/400x225?text=Course+Thumbnail',
                }}
                style={styles.courseThumbnail}
              />
            </View>

            <View style={styles.courseInfoSection}>
              <Text style={styles.sectionTitle}>About This Course</Text>
              <Text style={styles.courseDescription}>
                {course.description || 'No description available'}
              </Text>

              <View style={styles.metadataContainer}>
                <View style={styles.metadataItem}>
                  <Icon name="account" size={16} color="#666" />
                  <Text style={styles.metadataText}>{course.creator_name}</Text>
                </View>

                {course.category && (
                  <View style={styles.metadataItem}>
                    <Icon name="tag" size={16} color="#666" />
                    <Text style={styles.metadataText}>{course.category}</Text>
                  </View>
                )}

                <View style={styles.metadataItem}>
                  <Icon name="video" size={16} color="#666" />
                  <Text style={styles.metadataText}>
                    {course.videos?.length || 0} videos
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Course Discussion Section - Show FIRST when no video is selected */}
        {!selectedVideo && (
          <View style={styles.discussionSection}>
            <Text style={styles.sectionTitle}>Course Discussion</Text>
            <Text style={styles.sectionSubtitle}>
              General course discussion
            </Text>
            <CourseDiscussion
              key="course-general"
              courseId={courseId}
              videoId={null}
              user={user}
              refreshDiscussions={refreshCourse}
              discussionType="course"
              focusComment={!initialVideoId ? focusComment : null}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#333',
    marginTop: 10,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2e7af5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  content: {
    flex: 1,
  },
  videoContainer: {
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  videoPlayer: {
    width: '100%',
    height: 200,
    backgroundColor: '#000',
  },
  videoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    padding: 16,
    paddingBottom: 8,
  },
  videoDescription: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 16,
    paddingBottom: 16,
    lineHeight: 20,
  },
  noVideoContainer: {
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  courseThumbnail: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  courseInfoSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  courseDescription: {
    fontSize: 16,
    color: '#555',
    lineHeight: 24,
    marginBottom: 20,
  },
  metadataContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metadataText: {
    fontSize: 14,
    color: '#666',
  },
  courseContentSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 16,
  },
  videoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#e0e6ed',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  activeVideoCard: {
    borderColor: '#2e7af5',
    borderWidth: 2,
    backgroundColor: '#f8fbff',
  },
  videoCardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  videoIconContainer: {
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f7ff',
  },
  videoInfo: {
    flex: 1,
  },
  videoCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    lineHeight: 22,
  },
  activeVideoTitle: {
    color: '#2e7af5',
  },
  videoCardDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 18,
  },
  videoMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  videoDuration: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  videoNumber: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#2e7af5',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  activeIndicatorBar: {
    flex: 1,
    backgroundColor: '#2e7af5',
  },
  videoCardSeparator: {
    height: 8,
  },
  videoItem: {
    padding: 12,
    borderRadius: 8,
    marginVertical: 4,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  activeVideoItem: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2e7af5',
  },
  videoItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  videoTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  noVideosContainer: {
    alignItems: 'center',
    padding: 40,
  },
  noVideosText: {
    fontSize: 16,
    color: '#999',
    marginTop: 10,
    marginBottom: 20,
  },
  addVideoButton: {
    backgroundColor: '#2e7af5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addVideoButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  discussionSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 16,
  },
  videoDiscussionSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  backButtonText: {
    color: '#2e7af5',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
  },
});

export default CourseDetailsScreen;
