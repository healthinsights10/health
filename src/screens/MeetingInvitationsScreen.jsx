import React, {useState, useEffect} from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useAuth} from '../context/AuthContext';
import { userService } from '../services/api';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const MeetingInvitationsScreen = ({navigation}) => {
  const {user} = useAuth();
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    fetchInvitations();

    const unsubscribe = navigation.addListener('focus', () => {
      fetchInvitations();
    });

    return unsubscribe;
  }, [navigation]);

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      let organized = [];
      let invited = [];

      // Fetch meetings organized by the doctor
      if (user?.role === 'doctor') {
        organized = await userService.getOrganizedMeetings();
        invited = await userService.getInvitedMeetings();
      } else if (user?.role === 'pharma') {
        organized = await userService.getOrganizedMeetings();
      } else if (user?.role === 'admin') {
        organized = await userService.getAllMeetings();
      }

      // Merge and deduplicate by meeting id
      const allMeetings = [...organized, ...invited];
      const uniqueMeetings = allMeetings.filter(
        (meeting, index, self) =>
          index === self.findIndex(m => m.id === meeting.id)
      );

      setInvitations(uniqueMeetings);
    } catch (error) {
      console.error('Failed to fetch meeting invitations:', error);
      Alert.alert('Error', 'Failed to load invitations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewMeeting = meetingId => {
    navigation.navigate('MeetingDetails', {meetingId});
  };

  const handleAcceptInvitation = async meetingId => {
    try {
      await userService.updateInvitationStatus(meetingId, 'accepted');
      Alert.alert('Success', 'You have accepted the meeting invitation.');
      fetchInvitations(); // Refresh the invitations list
    } catch (error) {
      console.error('Failed to accept invitation:', error);
      Alert.alert('Error', 'Failed to accept invitation. Please try again.');
    }
  };

  const handleDeclineInvitation = async meetingId => {
    try {
      await userService.updateInvitationStatus(meetingId, 'declined');
      Alert.alert('Success', 'You have declined the meeting invitation.');
      fetchInvitations(); // Refresh the invitations list
    } catch (error) {
      console.error('Failed to decline invitation:', error);
      Alert.alert('Error', 'Failed to decline invitation. Please try again.');
    }
  };

  const formatDate = dateString => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = timeString => {
    // Handle timeString in format "HH:MM:SS"
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0);

    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderInvitationItem = ({item}) => (
    <View style={styles.meetingCard}>
      <View style={styles.meetingHeader}>
        <Icon
          name={item.mode === 'online' ? 'video' : 'map-marker'}
          size={20}
          color="#2e7af5"
        />
        <Text style={styles.meetingType}>
          {item.mode === 'online' ? 'Online Meeting' : 'In-Person Meeting'}
        </Text>

        <View
          style={[
            styles.statusBadge,
            item.invitation_status === 'accepted'
              ? styles.acceptedBadge
              : item.invitation_status === 'declined'
              ? styles.declinedBadge
              : styles.pendingBadge,
          ]}>
          <Text style={styles.statusText}>
            {item.invitation_status === 'accepted'
              ? 'Accepted'
              : item.invitation_status === 'declined'
              ? 'Declined'
              : 'Pending'}
          </Text>
        </View>
      </View>

      <Text style={styles.meetingTitle}>{item.title}</Text>

      <View style={styles.organizerRow}>
        <Icon name="account" size={16} color="#666" />
        <Text style={styles.organizerText}>By {item.organizer_name}</Text>
      </View>

      <View style={styles.meetingDetails}>
        <View style={styles.detailRow}>
          <Icon name="calendar" size={16} color="#666" />
          <Text style={styles.detailText}>{formatDate(item.start_date)}</Text>
        </View>

        <View style={styles.detailRow}>
          <Icon name="clock-outline" size={16} color="#666" />
          <Text style={styles.detailText}>
            {formatTime(item.start_time)} - {formatTime(item.end_time)}
          </Text>
        </View>

        {item.mode === 'in-person' && item.venue && (
          <View style={styles.detailRow}>
            <Icon name="map-marker" size={16} color="#666" />
            <Text style={styles.detailText}>{item.venue}</Text>
          </View>
        )}
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.detailsButton}
          onPress={() => handleViewMeeting(item.id)}>
          <Text style={styles.detailsButtonText}>View Details</Text>
        </TouchableOpacity>

        {item.invitation_status === 'pending' && (
          <View style={styles.responseButtons}>
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={() => handleAcceptInvitation(item.id)}>
              <Icon name="check" size={16} color="#4CAF50" />
              <Text style={styles.acceptButtonText}>Accept</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.declineButton}
              onPress={() => handleDeclineInvitation(item.id)}>
              <Icon name="close" size={16} color="#F44336" />
              <Text style={styles.declineButtonText}>Decline</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, {paddingTop: insets.top}]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meeting Invitations</Text>
        <View style={{width: 24}} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2e7af5" />
          <Text style={styles.loadingText}>Loading invitations...</Text>
        </View>
      ) : (
        <FlatList
          data={invitations}
          renderItem={renderInvitationItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="calendar-blank" size={60} color="#ccc" />
              <Text style={styles.emptyTitle}>No Invitations</Text>
              <Text style={styles.emptySubtitle}>
                You don't have any meeting invitations yet.
              </Text>
            </View>
          }
        />
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
  listContainer: {
    padding: 16,
  },
  meetingCard: {
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
  meetingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  meetingType: {
    fontSize: 14,
    color: '#2e7af5',
    fontWeight: '500',
    marginLeft: 8,
  },
  statusBadge: {
    marginLeft: 'auto',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingBadge: {
    backgroundColor: '#FFF3E0',
  },
  acceptedBadge: {
    backgroundColor: '#E8F5E9',
  },
  declinedBadge: {
    backgroundColor: '#FFEBEE',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  meetingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  organizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  organizerText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  meetingDetails: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  actionButtons: {
    flexDirection: 'column',
  },
  detailsButton: {
    backgroundColor: '#f0f6ff',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  detailsButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2e7af5',
  },
  responseButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    paddingVertical: 10,
    flex: 1,
    marginRight: 8,
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4CAF50',
    marginLeft: 4,
  },
  declineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    paddingVertical: 10,
    flex: 1,
    marginLeft: 8,
  },
  declineButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F44336',
    marginLeft: 4,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default MeetingInvitationsScreen;
