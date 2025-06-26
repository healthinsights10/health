import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { quizService } from '../../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const AdminQuizScreen = ({ route, navigation }) => {
  const { eventId, eventTitle } = route.params;
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadExistingQuiz();
  }, [eventId]);

  const loadExistingQuiz = async () => {
    try {
      setLoading(true);
      const response = await quizService.fetchQuiz(eventId);
      if (response && response.questions) {
        setQuestions(response.questions);
      }
    } catch (error) {
      // Quiz doesn't exist yet, that's fine
      console.log('No existing quiz found');
    } finally {
      setLoading(false);
    }
  };

  const addQuestion = () => {
    const newQuestion = {
      id: Date.now().toString(),
      question: '',
      type: 'multiple-choice',
      options: ['', '', '', ''],
      correctAnswer: '',
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (index, field, value) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index][field] = value;
    setQuestions(updatedQuestions);
  };

  const updateOption = (questionIndex, optionIndex, value) => {
    const updatedQuestions = [...questions];
    updatedQuestions[questionIndex].options[optionIndex] = value;
    setQuestions(updatedQuestions);
  };

  const removeQuestion = (index) => {
    const updatedQuestions = questions.filter((_, i) => i !== index);
    setQuestions(updatedQuestions);
  };

  const toggleQuestionType = (index) => {
    const updatedQuestions = [...questions];
    const currentType = updatedQuestions[index].type;
    updatedQuestions[index].type = currentType === 'multiple-choice' ? 'text' : 'multiple-choice';
    
    if (updatedQuestions[index].type === 'text') {
      updatedQuestions[index].options = [];
    } else {
      updatedQuestions[index].options = ['', '', '', ''];
    }
    updatedQuestions[index].correctAnswer = '';
    setQuestions(updatedQuestions);
  };

  const saveQuiz = async () => {
    try {
      // Validate questions
      const invalidQuestions = questions.filter(q => 
        !q.question.trim() || 
        !q.correctAnswer.trim() ||
        (q.type === 'multiple-choice' && q.options.some(opt => !opt.trim()))
      );

      if (invalidQuestions.length > 0) {
        Alert.alert('Validation Error', 'Please fill in all question fields and provide correct answers.');
        return;
      }

      setSaving(true);
      await quizService.addQuiz(eventId, { questions });
      Alert.alert('Success', 'Quiz saved successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Failed to save quiz:', error);
      Alert.alert('Error', 'Failed to save quiz. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2e7af5" />
        <Text style={styles.loadingText}>Loading Quiz...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Quiz</Text>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={saveQuiz}
          disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color="#2e7af5" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.eventTitle}>{eventTitle}</Text>
          <Text style={styles.subtitle}>
            Create quiz questions for this event
          </Text>

          {questions.map((question, index) => (
            <View key={question.id} style={styles.questionContainer}>
              <View style={styles.questionHeader}>
                <Text style={styles.questionNumber}>Question {index + 1}</Text>
                <View style={styles.questionActions}>
                  <TouchableOpacity
                    style={styles.typeToggle}
                    onPress={() => toggleQuestionType(index)}>
                    <Icon 
                      name={question.type === 'multiple-choice' ? 'format-list-bulleted' : 'format-text'} 
                      size={16} 
                      color="#2e7af5" 
                    />
                    <Text style={styles.typeToggleText}>
                      {question.type === 'multiple-choice' ? 'MCQ' : 'Text'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeQuestion(index)}>
                    <Icon name="close" size={20} color="#f44336" />
                  </TouchableOpacity>
                </View>
              </View>

              <TextInput
                style={styles.questionInput}
                placeholder="Enter your question..."
                value={question.question}
                onChangeText={(text) => updateQuestion(index, 'question', text)}
                multiline
              />

              {question.type === 'multiple-choice' ? (
                <View style={styles.optionsContainer}>
                  <Text style={styles.optionsLabel}>Options:</Text>
                  {question.options.map((option, optionIndex) => (
                    <View key={optionIndex} style={styles.optionRow}>
                      <TextInput
                        style={styles.optionInput}
                        placeholder={`Option ${optionIndex + 1}`}
                        value={option}
                        onChangeText={(text) => updateOption(index, optionIndex, text)}
                      />
                      <TouchableOpacity
                        style={[
                          styles.correctButton,
                          question.correctAnswer === option && styles.correctButtonSelected
                        ]}
                        onPress={() => updateQuestion(index, 'correctAnswer', option)}>
                        <Icon 
                          name={question.correctAnswer === option ? 'check-circle' : 'circle-outline'} 
                          size={20} 
                          color={question.correctAnswer === option ? '#4caf50' : '#ccc'} 
                        />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.textAnswerContainer}>
                  <Text style={styles.optionsLabel}>Correct Answer:</Text>
                  <TextInput
                    style={styles.textAnswerInput}
                    placeholder="Enter the correct answer..."
                    value={question.correctAnswer}
                    onChangeText={(text) => updateQuestion(index, 'correctAnswer', text)}
                    multiline
                  />
                </View>
              )}
            </View>
          ))}

          <TouchableOpacity style={styles.addQuestionButton} onPress={addQuestion}>
            <Icon name="plus-circle" size={24} color="#2e7af5" />
            <Text style={styles.addQuestionText}>Add Question</Text>
          </TouchableOpacity>
        </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
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
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2e7af5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  questionContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  questionNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2e7af5',
  },
  questionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    backgroundColor: '#f0f6ff',
    borderRadius: 6,
    gap: 4,
  },
  typeToggleText: {
    fontSize: 12,
    color: '#2e7af5',
    fontWeight: '500',
  },
  removeButton: {
    padding: 4,
  },
  questionInput: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#f8f9fa',
    marginBottom: 16,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  optionsContainer: {
    gap: 8,
  },
  optionsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#f8f9fa',
  },
  correctButton: {
    padding: 4,
  },
  correctButtonSelected: {
    backgroundColor: '#e8f5e9',
    borderRadius: 4,
  },
  textAnswerContainer: {
    gap: 8,
  },
  textAnswerInput: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#f8f9fa',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  addQuestionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#f0f6ff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e3f2fd',
    borderStyle: 'dashed',
    marginTop: 8,
    gap: 8,
  },
  addQuestionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2e7af5',
  },
});

export default AdminQuizScreen;