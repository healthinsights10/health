import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { quizService } from '../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const QuizScreen = ({ route, navigation }) => {
  const { eventId, eventTitle } = route.params;
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userAnswers, setUserAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [quizMode, setQuizMode] = useState('loading'); // 'loading', 'choice', 'taking', 'results'
  const [currentResults, setCurrentResults] = useState(null);
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadQuiz();
  }, [eventId]);

  const loadQuiz = async () => {
    try {
      setLoading(true);
      const response = await quizService.fetchQuiz(eventId);
      
      if (!response) {
        setQuizMode('no_quiz');
        return;
      }

      setQuiz(response);

      // Determine what to show based on attempts
      if (response.attemptCount === 0) {
        setQuizMode('taking'); // First attempt
      } else {
        setQuizMode('choice'); // Show choice between retake and view results
      }
    } catch (error) {
      console.error('Failed to load quiz:', error);
      Alert.alert('Error', 'Failed to load quiz');
      setQuizMode('error');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionIndex, answer) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionIndex]: answer
    }));
  };

  const handleSubmitQuiz = async () => {
    try {
      setSubmitting(true);
      
      // Calculate score
      let score = 0;
      const totalQuestions = quiz.questions.length;
      
      quiz.questions.forEach((question, index) => {
        if (userAnswers[index] === question.correctAnswer) {
          score++;
        }
      });

      const submissionData = {
        answers: userAnswers,
        score: score,
        totalQuestions: totalQuestions
      };

      const response = await quizService.submitQuiz(eventId, submissionData);

      // Show results and navigate to choice screen
      Alert.alert(
        'Quiz Submitted',
        `You scored ${score} out of ${totalQuestions} (${Math.round((score/totalQuestions)*100)}%)!`,
        [{ 
          text: 'OK', 
          onPress: () => {
            // Reload quiz data to update attempt count
            loadQuiz();
          }
        }]
      );
    } catch (error) {
      console.error('Failed to submit quiz:', error);
      if (error.response?.data?.message) {
        Alert.alert('Error', error.response.data.message);
      } else {
        Alert.alert('Error', 'Failed to submit quiz');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewResults = async () => {
    try {
      setLoading(true);
      const results = await quizService.getQuizResults(eventId);
      setCurrentResults(results);
      setQuizMode('results');
    } catch (error) {
      console.error('Failed to load results:', error);
      Alert.alert('Error', 'Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  const handleRetakeQuiz = () => {
    setUserAnswers({});
    setQuizMode('taking');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'passed': return '#4caf50';
      case 'failed': return '#f44336';
      default: return '#666';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'passed': return 'check-circle';
      case 'failed': return 'close-circle';
      default: return 'help-circle';
    }
  };

  const renderChoiceScreen = () => (
    <View style={styles.choiceContainer}>
      <View style={styles.attemptSummary}>
        <Icon name="clipboard-check" size={60} color="#2e7af5" />
        <Text style={styles.attemptTitle}>Quiz Attempts</Text>
        <Text style={styles.attemptSubtitle}>
          You have completed {quiz.attemptCount} out of {quiz.maxAttempts} attempts
        </Text>
        
        {quiz.attempts.length > 0 && (
          <View style={styles.lastAttemptCard}>
            <Text style={styles.lastAttemptTitle}>Latest Attempt</Text>
            <View style={styles.scoreRow}>
              <Text style={styles.scoreText}>
                {quiz.attempts[0].score}/{quiz.attempts[0].total_questions}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(quiz.attempts[0].status) }]}>
                <Icon name={getStatusIcon(quiz.attempts[0].status)} size={16} color="#fff" />
                <Text style={styles.statusText}>{quiz.attempts[0].percentage}%</Text>
              </View>
            </View>
          </View>
        )}
      </View>

      <View style={styles.choiceButtons}>
        <TouchableOpacity
          style={styles.choiceButton}
          onPress={handleViewResults}>
          <Icon name="chart-line" size={24} color="#2e7af5" />
          <Text style={styles.choiceButtonText}>View All Results</Text>
          <Text style={styles.choiceButtonSubtext}>See detailed performance</Text>
        </TouchableOpacity>

        {quiz.canAttempt && (
          <TouchableOpacity
            style={[styles.choiceButton, styles.retakeButton]}
            onPress={handleRetakeQuiz}>
            <Icon name="refresh" size={24} color="#fff" />
            <Text style={[styles.choiceButtonText, { color: '#fff' }]}>
              Retake Quiz
            </Text>
            <Text style={[styles.choiceButtonSubtext, { color: '#fff' }]}>
              Attempt {quiz.attemptCount + 1} of {quiz.maxAttempts}
            </Text>
          </TouchableOpacity>
        )}

        {!quiz.canAttempt && (
          <View style={[styles.choiceButton, styles.maxAttemptsButton]}>
            <Icon name="block-helper" size={24} color="#666" />
            <Text style={[styles.choiceButtonText, { color: '#666' }]}>
              Maximum Attempts Reached
            </Text>
            <Text style={[styles.choiceButtonSubtext, { color: '#666' }]}>
              You have used all {quiz.maxAttempts} attempts
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderResultsScreen = () => (
    <View style={styles.resultsContainer}>
      <Text style={styles.resultsTitle}>Quiz Results</Text>
      
      <ScrollView style={styles.resultsList}>
        {currentResults?.submissions.map((submission, index) => (
          <TouchableOpacity
            key={submission.id}
            style={[
              styles.resultCard,
              selectedAttempt?.id === submission.id && styles.selectedResultCard
            ]}
            onPress={() => setSelectedAttempt(submission)}>
            
            <View style={styles.resultHeader}>
              <Text style={styles.attemptNumber}>
                Attempt {submission.attempt_number}
              </Text>
              <Text style={styles.attemptDate}>
                {new Date(submission.submitted_at).toLocaleDateString()}
              </Text>
            </View>

            <View style={styles.resultStats}>
              <View style={styles.scoreContainer}>
                <Text style={styles.scoreLabel}>Score</Text>
                <Text style={styles.scoreValue}>
                  {submission.score}/{submission.total_questions}
                </Text>
              </View>
              
              <View style={styles.percentageContainer}>
                <Text style={styles.percentageLabel}>Percentage</Text>
                <View style={[styles.percentageBadge, { backgroundColor: getStatusColor(submission.status) }]}>
                  <Icon name={getStatusIcon(submission.status)} size={16} color="#fff" />
                  <Text style={styles.percentageValue}>{submission.percentage}%</Text>
                </View>
              </View>
            </View>

            {selectedAttempt?.id === submission.id && (
              <View style={styles.resultDetails}>
                <Text style={styles.resultDetailsTitle}>Answer Details:</Text>
                {quiz.questions.map((question, qIndex) => (
                  <View key={qIndex} style={styles.questionResult}>
                    <Text style={styles.questionResultText}>
                      Q{qIndex + 1}: {question.question}
                    </Text>
                    <View style={styles.answerComparison}>
                      <Text style={styles.yourAnswer}>
                        Your answer: {submission.answers[qIndex] || 'Not answered'}
                      </Text>
                      <Text style={styles.correctAnswer}>
                        Correct answer: {question.correctAnswer}
                      </Text>
                      <Icon 
                        name={submission.answers[qIndex] === question.correctAnswer ? 'check' : 'close'} 
                        size={16} 
                        color={submission.answers[qIndex] === question.correctAnswer ? '#4caf50' : '#f44336'} 
                      />
                    </View>
                  </View>
                ))}
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={styles.backToChoiceButton}
        onPress={() => setQuizMode('choice')}>
        <Icon name="arrow-left" size={20} color="#2e7af5" />
        <Text style={styles.backToChoiceText}>Back to Options</Text>
      </TouchableOpacity>
    </View>
  );

  const renderTakingQuiz = () => (
    <ScrollView style={styles.scrollView}>
      <View style={styles.content}>
        <Text style={styles.eventTitle}>{eventTitle}</Text>
        <View style={styles.quizHeader}>
          <Text style={styles.subtitle}>
            Answer all questions and submit your quiz
          </Text>
          {quiz.attemptCount > 0 && (
            <Text style={styles.attemptInfo}>
              Attempt {quiz.attemptCount + 1} of {quiz.maxAttempts}
            </Text>
          )}
        </View>

        {quiz.questions.map((question, index) => (
          <View key={index} style={styles.questionContainer}>
            <Text style={styles.questionNumber}>Question {index + 1}</Text>
            <Text style={styles.questionText}>{question.question}</Text>

            {question.type === 'multiple-choice' ? (
              <View style={styles.optionsContainer}>
                {question.options.map((option, optionIndex) => (
                  <TouchableOpacity
                    key={optionIndex}
                    style={[
                      styles.optionButton,
                      userAnswers[index] === option && styles.selectedOption
                    ]}
                    onPress={() => handleAnswerChange(index, option)}>
                    <Text style={[
                      styles.optionText,
                      userAnswers[index] === option && styles.selectedOptionText
                    ]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <TextInput
                style={styles.textInput}
                placeholder="Type your answer here..."
                value={userAnswers[index] || ''}
                onChangeText={(text) => handleAnswerChange(index, text)}
                multiline
              />
            )}
          </View>
        ))}

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.disabledButton]}
          onPress={handleSubmitQuiz}
          disabled={submitting}>
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Icon name="check-circle" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Submit Quiz</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

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
        <Text style={styles.headerTitle}>
          {quizMode === 'results' ? 'Quiz Results' : 'Quiz'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {quizMode === 'no_quiz' && (
        <View style={styles.comingSoonContainer}>
          <Icon name="clock-outline" size={80} color="#ccc" />
          <Text style={styles.comingSoonTitle}>Coming Soon</Text>
          <Text style={styles.comingSoonText}>
            The quiz for this event is not available yet.
          </Text>
        </View>
      )}

      {quizMode === 'choice' && renderChoiceScreen()}
      {quizMode === 'taking' && renderTakingQuiz()}
      {quizMode === 'results' && renderResultsScreen()}
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
  comingSoonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  comingSoonTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  comingSoonText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  choiceContainer: {
    flex: 1,
    padding: 16,
  },
  attemptSummary: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  attemptTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  attemptSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  lastAttemptCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: '100%',
  },
  lastAttemptTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  choiceButtons: {
    gap: 16,
  },
  choiceButton: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  retakeButton: {
    backgroundColor: '#4caf50',
  },
  maxAttemptsButton: {
    backgroundColor: '#f5f5f5',
  },
  choiceButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
  },
  choiceButtonSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  resultsContainer: {
    flex: 1,
    padding: 16,
  },
  resultsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  resultsList: {
    flex: 1,
  },
  resultCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedResultCard: {
    borderWidth: 2,
    borderColor: '#2e7af5',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  attemptNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  attemptDate: {
    fontSize: 14,
    color: '#666',
  },
  resultStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreContainer: {
    alignItems: 'flex-start',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  percentageContainer: {
    alignItems: 'flex-end',
  },
  percentageLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  percentageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  percentageValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  resultDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  resultDetailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  questionResult: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  questionResultText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  answerComparison: {
    gap: 4,
  },
  yourAnswer: {
    fontSize: 13,
    color: '#666',
  },
  correctAnswer: {
    fontSize: 13,
    color: '#4caf50',
    fontWeight: '500',
  },
  backToChoiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginTop: 16,
    gap: 8,
  },
  backToChoiceText: {
    fontSize: 16,
    color: '#2e7af5',
    fontWeight: '500',
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
  quizHeader: {
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  attemptInfo: {
    fontSize: 14,
    color: '#2e7af5',
    fontWeight: '500',
    marginTop: 4,
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
  questionNumber: {
    fontSize: 12,
    color: '#2e7af5',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    lineHeight: 24,
  },
  optionsContainer: {
    gap: 8,
  },
  optionButton: {
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  selectedOption: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2e7af5',
  },
  optionText: {
    fontSize: 14,
    color: '#333',
  },
  selectedOptionText: {
    color: '#2e7af5',
    fontWeight: '500',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#f8f9fa',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2e7af5',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default QuizScreen;