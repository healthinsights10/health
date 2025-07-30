import React, {useState, useEffect} from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useAuth} from '../context/AuthContext';
import {userService} from '../services/api';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const PrivateMeetingDetailsScreen = ({route, navigation}) => {
  const {meetingId} = route.params;
  const {user} = useAuth();
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    fetchMeetingDetails();
  }, [meetingId]);

  const fetchMeetingDetails = async () => {
    try {
      setLoading(true);
      const response = await userService.getMeetingById(meetingId);
      setMeeting(response);
    } catch (error) {
      console.error('Failed to fetch meeting details:', error);
      Alert.alert('Error', 'Failed to load meeting details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = dateString => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = timeString => {
    if (!timeString) return 'N/A';
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0);

    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleJoinMeeting = () => {
    if (meeting.mode === 'Virtual' && meeting.meeting_link) {
      Linking.openURL(meeting.meeting_link);
    } else if (meeting.mode === 'In-Person') {
      Alert.alert(
        'In-Person Meeting',
        `This meeting will be held at: ${meeting.venue}`,
        [
          {text: 'OK'},
          {
            text: 'Get Directions',
            onPress: () => {
              const mapsUrl = `https://maps.google.com/maps?q=${encodeURIComponent(meeting.venue)}`;
              Linking.openURL(mapsUrl);
            }
          }
        ]
      );
    }
  };

  const handleUpdateInvitationStatus = async (status) => {
    try {
      setUpdatingStatus(true);
      await userService.updateInvitationStatus(meetingId, status);
      
      Alert.alert(
        'Success', 
        `You have ${status} the meeting invitation.`,
        [{text: 'OK', onPress: () => fetchMeetingDetails()}]
      );
    } catch (error) {
      console.error('Failed to update invitation status:', error);
      Alert.alert('Error', 'Failed to update invitation status. Please try again.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleCancelMeeting = () => {
    Alert.alert(
      'Cancel Meeting',
      'Are you sure you want to cancel this meeting? This action cannot be undone.',
      [
        {text: 'No', style: 'cancel'},
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await userService.cancelMeeting(meetingId);
              Alert.alert('Success', 'Meeting cancelled successfully', [
                {text: 'OK', onPress: () => navigation.goBack()},
              ]);
            } catch (error) {
              console.error('Failed to cancel meeting:', error);
              Alert.alert('Error', 'Failed to cancel meeting. Please try again.');
            }
          },
        },
      ],
    );
  };

  const isOrganizer = meeting && user && meeting.organizer_id === user.id;
  const isInvited = meeting && meeting.invitations && 
    meeting.invitations.some(inv => inv.doctor_id === user.id);
  const userInvitation = meeting && meeting.invitations && 
    meeting.invitations.find(inv => inv.doctor_id === user.id);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, {paddingTop: insets.top}]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Meeting Details</Text>
          <View style={{width: 24}} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2e7af5" />
          <Text style={styles.loadingText}>Loading meeting details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!meeting) {
    return (
      <SafeAreaView style={[styles.container, {paddingTop: insets.top}]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Meeting Details</Text>
          <View style={{width: 24}} />
        </View>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={60} color="#ccc" />
          <Text style={styles.errorTitle}>Meeting Not Found</Text>
          <Text style={styles.errorSubtitle}>
            This meeting may have been cancelled or you don't have access to view it.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, {paddingTop: insets.top}]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meeting Details</Text>
        <View style={{width: 24}} />
      </View>

      <ScrollView style={styles.content}>
        {/* Meeting Header */}
        <View style={styles.meetingHeader}>
          <View style={styles.meetingBadgesRow}>
            <View style={styles.meetingTypeBadge}>
              <Icon
                name={meeting.mode === 'Virtual' ? 'video' : 'map-marker'}
                size={16}
                color="#2e7af5"
              />
              <Text style={styles.meetingTypeText}>
                {meeting.mode === 'Virtual' ? 'Virtual Meeting' : 'In-Person Meeting'}
              </Text>
            </View>

            <View style={styles.privateBadge}>
              <Icon name="lock" size={14} color="#fff" />
              <Text style={styles.privateText}>Private Meeting</Text>
            </View>
          </View>

          <Text style={styles.meetingTitle}>{meeting.title}</Text>

          <View style={styles.organizerInfo}>
            <Icon name="account" size={16} color="#666" />
            <Text style={styles.organizerText}>
              Organized by {meeting.organizer_name}
            </Text>
          </View>

          {/* Invitation Status */}
          {isInvited && userInvitation && (
            <View style={styles.invitationStatusContainer}>
              <View style={[
                styles.invitationStatusBadge,
                userInvitation.status === 'accepted' ? styles.acceptedBadge :
                userInvitation.status === 'declined' ? styles.declinedBadge : styles.pendingBadge
              ]}>
                <Text style={styles.invitationStatusText}>
                  Your Status: {userInvitation.status.charAt(0).toUpperCase() + userInvitation.status.slice(1)}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Date & Time */}
        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Date & Time</Text>

          <View style={styles.detailRow}>
            <Icon name="calendar" size={20} color="#2e7af5" />
            <Text style={styles.detailText}>
              {formatDate(meeting.start_date)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Icon name="clock-outline" size={20} color="#2e7af5" />
            <Text style={styles.detailText}>
              {formatTime(meeting.start_time)} - {formatTime(meeting.end_time)}
            </Text>
          </View>
        </View>

        {/* Location/Link */}
        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>
            {meeting.mode === 'Virtual' ? 'Meeting Link' : 'Location'}
          </Text>

          {meeting.mode === 'Virtual' ? (
            <TouchableOpacity
              style={styles.linkRow}
              onPress={() => Linking.openURL(meeting.meeting_link)}>
              <Icon name="link" size={20} color="#2e7af5" />
              <Text style={styles.linkText}>{meeting.meeting_link}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.detailRow}>
              <Icon name="map-marker" size={20} color="#2e7af5" />
              <Text style={styles.detailText}>{meeting.venue}</Text>
            </View>
          )}
        </View>

        {/* About this Meeting */}
        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>About this Meeting</Text>
          <Text style={styles.descriptionText}>{meeting.description}</Text>
        </View>

        {/* Invited Participants */}
        <View style={styles.detailsCard}>
          <View style={styles.participantsHeader}>
            <Text style={styles.sectionTitle}>Invited Participants</Text>

            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => setShowParticipantsModal(true)}>
              <Text style={styles.viewAllText}>View All</Text>
              <Icon name="chevron-right" size={16} color="#2e7af5" />
            </TouchableOpacity>
          </View>

          <Text style={styles.participantCount}>
            {meeting.invitations ? meeting.invitations.length : 0} participants invited
          </Text>

          {meeting.invitations && meeting.invitations.length > 0 ? (
            <View style={styles.participantPreview}>
              {meeting.invitations.slice(0, 3).map((invitation, index) => (
                <View key={invitation.id || index} style={styles.participantItem}>
                  <View style={styles.participantAvatar}>
                    <Text style={styles.participantInitial}>
                      {invitation.doctor_name ? invitation.doctor_name.charAt(0) : 'U'}
                    </Text>
                  </View>
                  <View style={styles.participantInfo}>
                    <Text style={styles.participantName}>{invitation.doctor_name}</Text>
                    <Text style={styles.participantEmail}>{invitation.doctor_email}</Text>
                  </View>
                  <View style={[
                    styles.participantStatusBadge,
                    invitation.status === 'accepted' ? styles.acceptedBadge :
                    invitation.status === 'declined' ? styles.declinedBadge : styles.pendingBadge
                  ]}>
                    <Text style={styles.participantStatusText}>
                      {invitation.status.charAt(0).toUpperCase() + invitation.status.slice(1)}
                    </Text>
                  </View>
                </View>
              ))}
              {meeting.invitations.length > 3 && (
                <TouchableOpacity 
                  style={styles.moreParticipants}
                  onPress={() => setShowParticipantsModal(true)}>
                  <Text style={styles.moreParticipantsText}>
                    +{meeting.invitations.length - 3} more participants
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <Text style={styles.noParticipantsText}>No participants invited yet.</Text>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {/* Join Meeting Button */}
          {(isOrganizer || (isInvited && userInvitation?.status === 'accepted')) && (
            <TouchableOpacity
              style={styles.joinButton}
              onPress={handleJoinMeeting}>
              <Icon 
                name={meeting.mode === 'Virtual' ? 'video' : 'map-marker'} 
                size={20} 
                color="#fff" 
              />
              <Text style={styles.joinButtonText}>
                {meeting.mode === 'Virtual' ? 'Join Meeting' : 'View Location'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Invitation Response Buttons */}
          {isInvited && userInvitation?.status === 'pending' && (
            <View style={styles.invitationButtons}>
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={() => handleUpdateInvitationStatus('accepted')}
                disabled={updatingStatus}>
                {updatingStatus ? (
                  <ActivityIndicator size="small" color="#4CAF50" />
                ) : (
                  <>
                    <Icon name="check" size={20} color="#4CAF50" />
                    <Text style={styles.acceptButtonText}>Accept Invitation</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.declineButton}
                onPress={() => handleUpdateInvitationStatus('declined')}
                disabled={updatingStatus}>
                {updatingStatus ? (
                  <ActivityIndicator size="small" color="#F44336" />
                ) : (
                  <>
                    <Icon name="close" size={20} color="#F44336" />
                    <Text style={styles.declineButtonText}>Decline Invitation</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Cancel Meeting Button (for organizers) */}
          {isOrganizer && meeting.status === 'active' && (
            <TouchableOpacity
              style={styles.cancelMeetingButton}
              onPress={handleCancelMeeting}>
              <Icon name="calendar-remove" size={20} color="#e53935" />
              <Text style={styles.cancelMeetingButtonText}>Cancel Meeting</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Participants Modal */}
      <Modal
        visible={showParticipantsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowParticipantsModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Invited Participants</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowParticipantsModal(false)}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {meeting.invitations && meeting.invitations.length > 0 ? (
                meeting.invitations.map((invitation, index) => (
                  <View key={invitation.id || index} style={styles.modalParticipantItem}>
                    <View style={styles.participantAvatar}>
                      <Text style={styles.participantInitial}>
                        {invitation.doctor_name ? invitation.doctor_name.charAt(0) : 'U'}
                      </Text>
                    </View>
                    <View style={styles.participantDetails}>
                      <Text style={styles.participantName}>{invitation.doctor_name}</Text>
                      <Text style={styles.participantEmail}>{invitation.doctor_email}</Text>
                    </View>
                    <View style={[
                      styles.participantStatusBadge,
                      invitation.status === 'accepted' ? styles.acceptedBadge :
                      invitation.status === 'declined' ? styles.declinedBadge : styles.pendingBadge
                    ]}>
                      <Text style={styles.participantStatusText}>
                        {invitation.status.charAt(0).toUpperCase() + invitation.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyParticipants}>
                  <Icon name="account-group" size={60} color="#ccc" />
                  <Text style={styles.emptyParticipantsText}>No participants invited</Text>
                </View>
              )}
            </ScrollView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
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
    marginTop: 12,
    color: '#666',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  meetingHeader: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  meetingBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  meetingTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f4ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  meetingTypeText: {
    fontSize: 12,
    color: '#2e7af5',
    fontWeight: '500',
    marginLeft: 4,
  },
  privateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff9800',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    marginLeft: 8,
  },
  privateText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
    marginLeft: 4,
  },
  meetingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  organizerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  organizerText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  invitationStatusContainer: {
    marginTop: 12,
  },
  invitationStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  invitationStatusText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkText: {
    fontSize: 16,
    color: '#2e7af5',
    textDecorationLine: 'underline',
    marginLeft: 12,
  },
  descriptionText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  participantsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    color: '#2e7af5',
    fontWeight: '500',
    marginRight: 4,
  },
  participantCount: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  participantPreview: {
    // Container for participant preview
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  participantAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2e7af5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  participantInitial: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  participantEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  participantStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  participantStatusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  moreParticipants: {
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  moreParticipantsText: {
    fontSize: 14,
    color: '#2e7af5',
    fontWeight: '500',
  },
  noParticipantsText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  actionButtons: {
    marginVertical: 16,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2e7af5',
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 12,
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  invitationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    paddingVertical: 16,
    flex: 1,
    marginRight: 8,
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
    marginLeft: 8,
  },
  declineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    paddingVertical: 16,
    flex: 1,
    marginLeft: 8,
  },
  declineButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F44336',
    marginLeft: 8,
  },
  cancelMeetingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffebee',
    borderRadius: 12,
    paddingVertical: 16,
  },
  cancelMeetingButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#e53935',
    marginLeft: 8,
  },
  // Badge styles
  pendingBadge: {
    backgroundColor: '#FFF3E0',
  },
  acceptedBadge: {
    backgroundColor: '#E8F5E9',
  },
  declinedBadge: {
    backgroundColor: '#FFEBEE',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 16,
    maxHeight: '70%',
  },
  modalParticipantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  participantDetails: {
    flex: 1,
  },
  emptyParticipants: {
    padding: 24,
    alignItems: 'center',
  },
  emptyParticipantsText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
});

export default PrivateMeetingDetailsScreen;