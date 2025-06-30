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
  Modal,
} from 'react-native';
import {courseService} from '../../services/api';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useAuth} from '../../context/AuthContext';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const PendingCoursesScreen = ({navigation}) => {
  const {user} = useAuth();
  const [pendingCourses, setPendingCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [actionType, setActionType] = useState(''); // 'approve' or 'reject'
  const [notes, setNotes] = useState('');
  const insets = useSafeAreaInsets();

  const fetchPendingCourses = async () => {
    try {
      setLoading(true);
      const data = await courseService.getPendingCourses();
      setPendingCourses(data);
    } catch (error) {
      console.error('Error fetching pending courses:', error);
      Alert.alert('Error', 'Failed to load pending courses. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPendingCourses();
  };

  useEffect(() => {
    fetchPendingCourses();

    const unsubscribe = navigation.addListener('focus', () => {
      fetchPendingCourses();
    });

    return unsubscribe;
  }, [navigation]);

  const handleApprove = course => {
    setSelectedCourse(course);
    setActionType('approve');
    setNotes('');
    setModalVisible(true);
  };

  const handleReject = course => {
    setSelectedCourse(course);
    setActionType('reject');
    setNotes('');
    setModalVisible(true);
  };

  const confirmAction = async () => {
    if (actionType === 'reject' && !notes.trim()) {
      Alert.alert('Error', 'Please provide feedback for rejection');
      return;
    }

    try {
      setLoading(true);
      setModalVisible(false);

      if (actionType === 'approve') {
        await courseService.approveCourse(selectedCourse.id, notes);
        Alert.alert('Success', 'Course has been approved');
      } else {
        await courseService.rejectCourse(selectedCourse.id, notes);
        Alert.alert('Success', 'Course has been rejected');
      }

      fetchPendingCourses();
    } catch (error) {
      console.error(`Error ${actionType}ing course:`, error);
      Alert.alert('Error', `Failed to ${actionType} course. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const renderCourseItem = ({item}) => {
    return (
      <View style={styles.courseCard}>
        <TouchableOpacity
          onPress={() =>
            navigation.navigate('CourseDetails', {courseId: item.id})
          }>
          <Image
            source={{
              uri:
                item.thumbnail_url ||
                'https://via.placeholder.com/150x100?text=Course',
            }}
            style={styles.courseThumbnail}
          />
        </TouchableOpacity>

        <View style={styles.courseInfo}>
          <Text style={styles.courseTitle}>{item.title}</Text>

          <Text style={styles.courseDescription} numberOfLines={2}>
            {item.description || 'No description available'}
          </Text>

          <View style={styles.metaInfo}>
            <Text style={styles.creatorInfo}>
              Created by: {item.creator_name}
            </Text>
            <Text style={styles.dateInfo}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => handleApprove(item)}>
              <Icon name="check" size={16} color="#fff" />
              <Text style={styles.buttonText}>Approve</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleReject(item)}>
              <Icon name="close" size={16} color="#fff" />
              <Text style={styles.buttonText}>Reject</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.viewButton]}
              onPress={() =>
                navigation.navigate('CourseDetails', {courseId: item.id})
              }>
              <Icon name="eye" size={16} color="#fff" />
              <Text style={styles.buttonText}>View</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Icon name="check-all" size={60} color="#cccccc" />
      <Text style={styles.emptyText}>No pending courses to review</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, {paddingTop: insets.top}]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pending Courses</Text>
        <View style={{width: 24}} />
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2e7af5" />
          <Text style={styles.loadingText}>Loading pending courses...</Text>
        </View>
      ) : (
        <FlatList
          data={pendingCourses}
          renderItem={renderCourseItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.coursesList}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={renderEmptyState}
        />
      )}

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {actionType === 'approve' ? 'Approve Course' : 'Reject Course'}
            </Text>

            <Text style={styles.modalSubtitle}>{selectedCourse?.title}</Text>

            <TextInput
              style={styles.notesInput}
              placeholder={
                actionType === 'approve'
                  ? 'Optional: Add notes (visible to creator)'
                  : 'Required: Provide feedback for rejection'
              }
              placeholderTextColor="#999"
              multiline
              value={notes}
              onChangeText={setNotes}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  actionType === 'approve'
                    ? styles.confirmApproveButton
                    : styles.confirmRejectButton,
                ]}
                onPress={confirmAction}>
                <Text style={styles.confirmButtonText}>
                  {actionType === 'approve' ? 'Approve' : 'Reject'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  backButton: {
    padding: 8,
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
  metaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  creatorInfo: {
    fontSize: 13,
    color: '#777',
  },
  dateInfo: {
    fontSize: 13,
    color: '#999',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    flex: 1,
    marginHorizontal: 4,
  },
  approveButton: {
    backgroundColor: '#4caf50',
  },
  rejectButton: {
    backgroundColor: '#f44336',
  },
  viewButton: {
    backgroundColor: '#2e7af5',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 14,
    marginLeft: 4,
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
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 16,
    color: '#555',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    height: 120,
    textAlignVertical: 'top',
    marginBottom: 16,
    color: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  confirmApproveButton: {
    backgroundColor: '#4caf50',
  },
  confirmRejectButton: {
    backgroundColor: '#f44336',
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default PendingCoursesScreen;
