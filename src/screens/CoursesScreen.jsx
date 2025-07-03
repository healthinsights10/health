import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  TextInput,
} from 'react-native';
import {courseService} from '../services/api';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useAuth} from '../context/AuthContext';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const CoursesScreen = ({navigation}) => {
  const {user} = useAuth();
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const insets = useSafeAreaInsets();

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const data = await courseService.getAllCourses();
      setCourses(data);
      setFilteredCourses(data);
    } catch (error) {
      console.error('Error fetching courses:', error);
      Alert.alert('Error', 'Failed to load courses. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCourses();
  };

  const handleSearch = query => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredCourses(courses);
    } else {
      const filtered = courses.filter(
        course =>
          course.title.toLowerCase().includes(query.toLowerCase()) ||
          course.description?.toLowerCase().includes(query.toLowerCase()) ||
          course.creator_name?.toLowerCase().includes(query.toLowerCase()) ||
          course.category?.toLowerCase().includes(query.toLowerCase()),
      );
      setFilteredCourses(filtered);
    }
  };

  useEffect(() => {
    fetchCourses();

    const unsubscribe = navigation.addListener('focus', () => {
      fetchCourses();
    });

    return unsubscribe;
  }, [navigation]);

  // Update filtered courses when courses change
  useEffect(() => {
    handleSearch(searchQuery);
  }, [courses]);

  const renderCourseItem = ({item}) => {
    const isCreator = user?.id === item.creator_id;
    const isPending = item.status === 'pending';
    const isRejected = item.status === 'rejected';

    return (
      <TouchableOpacity
        style={styles.courseCard}
        onPress={() =>
          navigation.navigate('CourseDetails', {courseId: item.id})
        }>
        {isCreator && (isPending || isRejected) && (
          <View
            style={[
              styles.statusBadge,
              isPending ? styles.pendingBadge : styles.rejectedBadge,
            ]}>
            <Text style={styles.statusText}>
              {isPending ? 'Pending Approval' : 'Rejected'}
            </Text>
          </View>
        )}

        <Image
          source={{
            uri:
              item.thumbnail_url ||
              'https://via.placeholder.com/150x100?text=Course',
          }}
          style={styles.courseThumbnail}
        />
        <View style={styles.courseInfo}>
          <Text style={styles.courseTitle}>{item.title}</Text>
          <Text style={styles.courseDescription} numberOfLines={2}>
            {item.description || 'No description available'}
          </Text>
          <View style={styles.courseFooter}>
            <Text style={styles.courseCreator}>By {item.creator_name}</Text>
            {item.category && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{item.category}</Text>
              </View>
            )}
          </View>

          {isCreator && isRejected && item.approval_notes && (
            <View style={styles.feedbackContainer}>
              <Text style={styles.feedbackLabel}>Feedback:</Text>
              <Text style={styles.feedbackText}>{item.approval_notes}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    if (searchQuery.trim() !== '' && filteredCourses.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Icon name="magnify-remove-outline" size={60} color="#cccccc" />
          <Text style={styles.emptyText}>
            No courses found for "{searchQuery}"
          </Text>
          <TouchableOpacity
            style={styles.clearSearchButton}
            onPress={() => handleSearch('')}>
            <Text style={styles.clearSearchText}>Clear Search</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Icon name="school-outline" size={60} color="#cccccc" />
        <Text style={styles.emptyText}>No courses available</Text>
        {(user?.role === 'admin' || user?.role === 'doctor') && (
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => navigation.navigate('CreateCourse')}>
            <Text style={styles.createButtonText}>Create A Course</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, {paddingTop: insets.top}]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Educational Courses</Text>
        {(user?.role === 'admin' || user?.role === 'doctor') && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('CreateCourse')}>
            <Icon name="plus" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Icon
            name="magnify"
            size={20}
            color="#999"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search courses by name, description, or creator..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => handleSearch('')}
              style={styles.clearButton}>
              <Icon name="close" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2e7af5" />
          <Text style={styles.loadingText}>Loading courses...</Text>
        </View>
      ) : filteredCourses.length > 0 ? (
        <FlatList
          data={filteredCourses}
          renderItem={renderCourseItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.coursesList}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      ) : (
        renderEmptyState()
      )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2e7af5',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6eff7',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 4,
  },
  clearButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  coursesList: {
    padding: 16,
  },
  courseCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  courseThumbnail: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
  },
  courseInfo: {
    padding: 16,
  },
  courseTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  courseDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  courseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  courseCreator: {
    fontSize: 13,
    color: '#999',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#e6f0ff',
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    color: '#2e7af5',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  createButton: {
    backgroundColor: '#2e7af5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  clearSearchButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2e7af5',
  },
  clearSearchText: {
    color: '#2e7af5',
    fontSize: 14,
    fontWeight: '500',
  },
  statusBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  pendingBadge: {
    backgroundColor: '#fff3cd',
  },
  rejectedBadge: {
    backgroundColor: '#f8d7da',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
  },
  feedbackContainer: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e1e1e1',
  },
  feedbackLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  feedbackText: {
    fontSize: 14,
    color: '#666',
  },
});

export default CoursesScreen;
