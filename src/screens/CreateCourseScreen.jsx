import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import {courseService} from '../services/api';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'react-native-image-picker';
import {useAuth} from '../context/AuthContext';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const CATEGORIES = [
  'Clinical Practice',
  'Research',
  'Medical Technology',
  'Patient Care',
  'Wellness',
  'Pharmaceutical',
  'Other',
];

const CreateCourseScreen = ({navigation}) => {
  const insets = useSafeAreaInsets();
  const {user} = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [thumbnail, setThumbnail] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const pickThumbnail = () => {
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
        setThumbnail({
          uri: asset.uri,
          type: asset.type,
          name: asset.fileName || `image-${Date.now()}.jpg`,
          size: asset.fileSize,
        });
      }
    });
  };

  const handleCreateCourse = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a course title');
      return;
    }

    try {
      setSubmitting(true);

      // First, upload thumbnail if available
      let thumbnailUrl = null;
      if (thumbnail) {
        const thumbnailResult = await courseService.uploadCourseThumbnail(
          thumbnail,
        );
        thumbnailUrl = thumbnailResult.url;
      }

      // Create course
      const newCourse = {
        title: title.trim(),
        description: description.trim(),
        category: category || null,
        thumbnail_url: thumbnailUrl,
      };

      const result = await courseService.createCourse(newCourse);

      // Different messages depending on role
      const isAdmin = user.role === 'admin';
      const successMessage = isAdmin
        ? 'Course created and published successfully!'
        : 'Course created successfully! It will be visible after admin approval.';

      Alert.alert('Success', successMessage, [
        {
          text: 'Add Videos Now',
          onPress: () => {
            const courseId = result.course ? result.course.id : result.id;
            navigation.navigate('AddCourseVideo', {courseId});
          },
        },
        {
          text: 'Later',
          onPress: () => navigation.navigate('Courses'),
          style: 'cancel',
        },
      ]);
    } catch (error) {
      console.error('Error creating course:', error);
      Alert.alert('Error', `Failed to create course: ${error.message}`);
    } finally {
      setSubmitting(false);
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
        <Text style={styles.headerTitle}>Create New Course</Text>
        <View style={{width: 32}} />
      </View>

      <ScrollView style={styles.form}>
        <Text style={styles.label}>Course Title *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Enter course title"
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Enter course description"
          placeholderTextColor="#999"
          multiline
          textAlignVertical="top"
        />

        <Text style={styles.label}>Category</Text>
        <TouchableOpacity
          style={styles.categoryInput}
          onPress={() => setShowCategoryPicker(!showCategoryPicker)}>
          <Text
            style={
              category ? styles.categorySelected : styles.categoryPlaceholder
            }>
            {category || 'Select a category'}
          </Text>
          <Icon
            name={showCategoryPicker ? 'chevron-up' : 'chevron-down'}
            size={24}
            color="#999"
          />
        </TouchableOpacity>

        {showCategoryPicker && (
          <View style={styles.categoryPicker}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryOption,
                  category === cat && styles.categoryOptionSelected,
                ]}
                onPress={() => {
                  setCategory(cat);
                  setShowCategoryPicker(false);
                }}>
                <Text
                  style={[
                    styles.categoryOptionText,
                    category === cat && styles.categoryOptionTextSelected,
                  ]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.label}>Course Thumbnail</Text>
        <TouchableOpacity
          style={styles.thumbnailContainer}
          onPress={pickThumbnail}>
          {thumbnail ? (
            <Image
              source={{uri: thumbnail.uri}}
              style={styles.thumbnailPreview}
            />
          ) : (
            <View style={styles.thumbnailPlaceholder}>
              <Icon name="image-plus" size={40} color="#888" />
              <Text style={styles.thumbnailPlaceholderText}>
                Tap to select thumbnail
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.createButton, submitting && styles.disabledButton]}
          onPress={handleCreateCourse}
          disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.createButtonText}>Create Course</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
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
    height: 120,
    textAlignVertical: 'top',
  },
  categoryInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  categoryPlaceholder: {
    color: '#999',
    fontSize: 16,
  },
  categorySelected: {
    color: '#333',
    fontSize: 16,
  },
  categoryPicker: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 16,
    maxHeight: 200,
  },
  categoryOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  categoryOptionSelected: {
    backgroundColor: '#e6f0ff',
  },
  categoryOptionText: {
    fontSize: 16,
    color: '#333',
  },
  categoryOptionTextSelected: {
    fontWeight: 'bold',
    color: '#2e7af5',
  },
  thumbnailContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 24,
  },
  thumbnailPreview: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  thumbnailPlaceholder: {
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f7f7f7',
  },
  thumbnailPlaceholderText: {
    marginTop: 8,
    fontSize: 14,
    color: '#888',
  },
  createButton: {
    backgroundColor: '#2e7af5',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 24,
  },
  disabledButton: {
    backgroundColor: '#a0c0e8',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CreateCourseScreen;
