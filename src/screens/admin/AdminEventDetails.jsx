import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {eventService, adminService} from '../../services/api';
import PdfViewer from '../../components/PdfViewer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Event Status Badge Component
const EventStatusBadge = ({status}) => {
  let bgColor = '#FFF3E0'; // Default pending color
  let textColor = '#E65100';
  let iconName = 'clock-outline';
  let label = 'Pending';

  if (status === 'approved') {
    bgColor = '#E8F5E9';
    textColor = '#2E7D32';
    iconName = 'check-circle';
    label = 'Approved';
  } else if (status === 'rejected') {
    bgColor = '#FFEBEE';
    textColor = '#C62828';
    iconName = 'close-circle';
    label = 'Rejected';
  }

  return (
    <View style={[styles.badge, {backgroundColor: bgColor}]}>
      <Icon
        name={iconName}
        size={12}
        color={textColor}
        style={{marginRight: 4}}
      />
      <Text style={[styles.badgeText, {color: textColor}]}>{label}</Text>
    </View>
  );
};

const AdminEventDetails = ({route, navigation}) => {
  const {eventId} = route.params;
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registrations, setRegistrations] = useState([]);
  const [registrationsLoading, setRegistrationsLoading] = useState(false);
  const [brochure, setBrochure] = useState(null);
  const [brochureLoading, setBrochureLoading] = useState(false);
  const insets = useSafeAreaInsets();
  useEffect(() => {
    fetchEventDetails();
    fetchEventBrochure();
    fetchRegistrations();
  }, [eventId]);

  const fetchEventDetails = async () => {
    try {
      setLoading(true);
      const eventData = await eventService.getEventById(eventId);
      setEvent(eventData);
    } catch (error) {
      console.error('Failed to load event details:', error);
      Alert.alert('Error', 'Failed to load event details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchEventBrochure = async () => {
    try {
      setBrochureLoading(true);
      const brochureData = await eventService.getEventBrochure(eventId);
      if (brochureData) {
        setBrochure(brochureData);
      }
    } catch (error) {
      console.error('Failed to load brochure:', error);
    } finally {
      setBrochureLoading(false);
    }
  };

  const fetchRegistrations = async () => {
    try {
      setRegistrationsLoading(true);
      const data = await adminService.getEventRegistrations(eventId);
      setRegistrations(data);
    } catch (error) {
      console.error('Failed to fetch registrations:', error);
    } finally {
      setRegistrationsLoading(false);
    }
  };

  // Format date function
  const formatDate = dateString => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Format time function
  const formatTime = dateString => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleEditEvent = () => {
    navigation.navigate('AdminEditEvent', {
      eventId: eventId,
      fromManagement: true,
    });
  };

  const handleViewRegistrations = () => {
    navigation.navigate('EventRegistrations', {eventId: eventId});
  };

  const handleApproveEvent = async () => {
    try {
      await eventService.approveEvent(eventId);
      Alert.alert('Success', 'Event has been approved');
      fetchEventDetails(); // Refresh details
    } catch (error) {
      Alert.alert('Error', 'Failed to approve event');
    }
  };

  const handleRejectEvent = async () => {
    Alert.alert('Reject Event', 'Are you sure you want to reject this event?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          try {
            await eventService.rejectEvent(eventId);
            Alert.alert('Success', 'Event has been rejected');
            fetchEventDetails(); // Refresh details
          } catch (error) {
            Alert.alert('Error', 'Failed to reject event');
          }
        },
      },
    ]);
  };

  const handleDeleteEvent = async () => {
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event? This action cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await eventService.deleteEvent(eventId);
              Alert.alert('Success', 'Event deleted successfully', [
                {text: 'OK', onPress: () => navigation.goBack()},
              ]);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete event');
            }
          },
        },
      ],
    );
  };

  // Render speaker item
  const renderSpeakerItem = ({item}) => (
    <View style={styles.speakerCard}>
      <View style={styles.speakerIconContainer}>
        <Icon name="account" size={24} color="#2e7af5" />
      </View>
      <View style={styles.speakerInfo}>
        <Text style={styles.speakerName}>{item.name}</Text>
        {item.title && <Text style={styles.speakerTitle}>{item.title}</Text>}
        {item.bio && <Text style={styles.speakerBio}>{item.bio}</Text>}
      </View>
    </View>
  );

  // Render sponsor item
  const renderSponsorItem = ({item}) => (
    <View style={styles.sponsorCard}>
      <Text style={styles.sponsorName}>{item.name}</Text>
      {item.level && (
        <Text style={styles.sponsorLevel}>Level: {item.level}</Text>
      )}
      {item.registered_by && (
        <View style={styles.sponsorRegistration}>
          <Icon name="calendar-check" size={14} color="#4caf50" />
          <Text style={styles.sponsorRegistrationText}>Registered via app</Text>
        </View>
      )}
      {item.contactPerson && (
        <View style={styles.sponsorContactRow}>
          <Icon name="account" size={14} color="#666" />
          <Text style={styles.sponsorContactText}>{item.contactPerson}</Text>
        </View>
      )}
      {item.contactEmail && (
        <TouchableOpacity
          style={styles.sponsorContactRow}
          onPress={() => Linking.openURL(`mailto:${item.contactEmail}`)}>
          <Icon name="email" size={14} color="#666" />
          <Text style={[styles.sponsorContactText, styles.linkText]}>
            {item.contactEmail}
          </Text>
        </TouchableOpacity>
      )}
      {item.contactPhone && (
        <TouchableOpacity
          style={styles.sponsorContactRow}
          onPress={() => Linking.openURL(`tel:${item.contactPhone}`)}>
          <Icon name="phone" size={14} color="#666" />
          <Text style={[styles.sponsorContactText, styles.linkText]}>
            {item.contactPhone}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // Render registration item
  const renderRegistrationItem = ({item}) => (
    <View style={styles.registrationItem}>
      <View style={styles.registrationHeader}>
        <Text style={styles.registrationName}>{item.user.name}</Text>
        <Text style={styles.registrationDate}>
          {formatDate(item.registered_at)}
        </Text>
      </View>
      <Text style={styles.registrationEmail}>{item.user.email}</Text>
      {item.user.phone && (
        <Text style={styles.registrationPhone}>{item.user.phone}</Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2e7af5" />
          <Text style={styles.loadingText}>Loading event details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={64} color="#ff6b6b" />
          <Text style={styles.errorTitle}>Event Not Found</Text>
          <Text style={styles.errorMessage}>
            The event you're looking for doesn't exist or has been removed.
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, {paddingTop: insets.top}]}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBackButton}>
          <Icon name="arrow-left" size={24} color="#2e7af5" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Event Details</Text>
        <TouchableOpacity
          style={styles.headerActionButton}
          onPress={handleEditEvent}>
          <Icon name="pencil" size={24} color="#2e7af5" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Admin Action Bar */}
        <View style={styles.adminActionBar}>
          <Text style={styles.adminActionTitle}>Admin Actions:</Text>
          <View style={styles.adminActionButtons}>
            {event.status === 'pending' && (
              <>
                <TouchableOpacity
                  style={[styles.adminButton, styles.approveButton]}
                  onPress={handleApproveEvent}>
                  <Icon name="check-circle" size={18} color="#fff" />
                  <Text style={styles.adminButtonText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.adminButton, styles.rejectButton]}
                  onPress={handleRejectEvent}>
                  <Icon name="close-circle" size={18} color="#fff" />
                  <Text style={styles.adminButtonText}>Reject</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity
              style={[styles.adminButton, styles.registrationsButton]}
              onPress={handleViewRegistrations}>
              <Icon name="clipboard-list" size={18} color="#fff" />
              <Text style={styles.adminButtonText}>Registrations</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.adminButton, styles.deleteButton]}
              onPress={handleDeleteEvent}>
              <Icon name="delete" size={18} color="#fff" />
              <Text style={styles.adminButtonText}>Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.adminButton, {backgroundColor: '#9c27b0'}]}
              onPress={() => navigation.navigate('AdminQuiz', { 
                eventId: eventId, 
                eventTitle: event.title 
              })}>
              <Icon name="help-circle" size={18} color="#fff" />
              <Text style={styles.adminButtonText}>Manage Quiz</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Brochure Section */}
        {brochure && brochure.url && (
          <View style={styles.brochureContainer}>
            <Text style={styles.brochureTitle}>Event Brochure</Text>
            <PdfViewer pdfUrl={brochure.url} />
          </View>
        )}

        {/* Event Header Section */}
        <View style={styles.eventHeaderSection}>
          <View style={styles.eventTypeAndStatus}>
            <Text style={styles.eventType}>{event.type}</Text>
            <EventStatusBadge status={event.status} />
          </View>
          <Text style={styles.eventTitle}>{event.title}</Text>
          <View style={styles.eventMode}>
            <Icon
              name={event.mode === 'Virtual' ? 'video' : 'map-marker'}
              size={16}
              color="#666"
            />
            <Text style={styles.eventModeText}>{event.mode}</Text>
          </View>
        </View>

        {/* Registration Stats Section */}
        <View style={styles.statsSection}>
          <View style={styles.statsCard}>
            <Text style={styles.statsNumber}>{registrations.length}</Text>
            <Text style={styles.statsLabel}>Registrations</Text>
          </View>
          {event.capacity && (
            <>
              <View style={styles.statsCard}>
                <Text style={styles.statsNumber}>{event.capacity}</Text>
                <Text style={styles.statsLabel}>Capacity</Text>
              </View>
              <View style={styles.statsCard}>
                <Text style={styles.statsNumber}>
                  {Math.round((registrations.length / event.capacity) * 100)}%
                </Text>
                <Text style={styles.statsLabel}>Filled</Text>
              </View>
            </>
          )}
        </View>

        {/* Date & Time Section */}
        <View style={styles.detailSection}>
          <Text style={styles.sectionTitle}>Date & Time</Text>
          <View style={styles.detailRow}>
            <Icon name="calendar-range" size={20} color="#2e7af5" />
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailLabel}>Start Date</Text>
              <Text style={styles.detailText}>
                {formatDate(event.startDate)} at{' '}
                {event.start_time || formatTime(event.startDate)}
              </Text>
            </View>
          </View>
          <View style={styles.detailRow}>
            <Icon name="calendar-range" size={20} color="#2e7af5" />
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailLabel}>End Date</Text>
              <Text style={styles.detailText}>
                {formatDate(event.endDate)} at{' '}
                {event.end_time || formatTime(event.endDate)}
              </Text>
            </View>
          </View>
        </View>

        {/* Venue Section */}
        <View style={styles.detailSection}>
          <Text style={styles.sectionTitle}>Location</Text>
          <View style={styles.detailRow}>
            <Icon
              name={event.mode === 'Virtual' ? 'video' : 'map-marker'}
              size={20}
              color="#2e7af5"
            />
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailLabel}>
                {event.mode === 'Virtual' ? 'Platform' : 'Venue'}
              </Text>
              <Text style={styles.detailText}>{event.venue}</Text>
            </View>
          </View>

          {event.capacity && (
            <View style={styles.detailRow}>
              <Icon name="account-group" size={20} color="#2e7af5" />
              <View style={styles.detailTextContainer}>
                <Text style={styles.detailLabel}>Capacity</Text>
                <Text style={styles.detailText}>
                  {event.capacity} attendees
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Description Section */}
        <View style={styles.detailSection}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{event.description}</Text>
        </View>

        {/* Registration Information */}
        <View style={styles.detailSection}>
          <Text style={styles.sectionTitle}>Registration</Text>
          <View style={styles.detailRow}>
            <Icon name="currency-usd" size={20} color="#2e7af5" />
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailLabel}>Registration Fee</Text>
              <Text style={styles.detailText}>
                {event.registrationFee === '0' || event.registrationFee === 0
                  ? 'Free Event'
                  : `$${event.registrationFee}`}
              </Text>
            </View>
          </View>

          {event.website && (
            <View style={styles.detailRow}>
              <Icon name="web" size={20} color="#2e7af5" />
              <View style={styles.detailTextContainer}>
                <Text style={styles.detailLabel}>Website</Text>
                <TouchableOpacity
                  onPress={() => Linking.openURL(event.website)}>
                  <Text style={styles.linkText}>{event.website}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Recent Registrations */}
        <View style={styles.detailSection}>
          <Text style={styles.sectionTitle}>Recent Registrations</Text>
          {registrationsLoading ? (
            <ActivityIndicator
              size="small"
              color="#2e7af5"
              style={{marginVertical: 16}}
            />
          ) : registrations.length > 0 ? (
            <>
              <FlatList
                data={registrations.slice(0, 3)} // Show only the most recent 3
                renderItem={renderRegistrationItem}
                keyExtractor={item => item.id}
                scrollEnabled={false}
              />
              {registrations.length > 3 && (
                <TouchableOpacity
                  style={styles.viewAllButton}
                  onPress={handleViewRegistrations}>
                  <Text style={styles.viewAllButtonText}>
                    View All {registrations.length} Registrations
                  </Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <Text style={styles.noDataText}>No registrations yet</Text>
          )}
        </View>

        {/* Speakers Section */}
        {event.speakers && event.speakers.length > 0 && (
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>Speakers</Text>
            <FlatList
              data={event.speakers}
              renderItem={renderSpeakerItem}
              keyExtractor={item => item.id}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* Sponsors Section */}
        {event.sponsors && event.sponsors.length > 0 && (
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>Sponsors</Text>
            <FlatList
              data={event.sponsors}
              renderItem={renderSponsorItem}
              keyExtractor={item => item.id}
              scrollEnabled={false}
              horizontal={true}
              contentContainerStyle={styles.sponsorsContainer}
            />
          </View>
        )}

        {/* Organizer Information */}
        <View style={styles.detailSection}>
          <Text style={styles.sectionTitle}>Event Organizer</Text>
          <View style={styles.detailRow}>
            <Icon name="account" size={20} color="#2e7af5" />
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailLabel}>Name</Text>
              <Text style={styles.detailText}>{event.organizerName}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Icon name="email" size={20} color="#2e7af5" />
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailLabel}>Email</Text>
              <TouchableOpacity
                onPress={() =>
                  Linking.openURL(`mailto:${event.organizerEmail}`)
                }>
                <Text style={styles.linkText}>{event.organizerEmail}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {event.organizerPhone && (
            <View style={styles.detailRow}>
              <Icon name="phone" size={20} color="#2e7af5" />
              <View style={styles.detailTextContainer}>
                <Text style={styles.detailLabel}>Phone</Text>
                <TouchableOpacity
                  onPress={() =>
                    Linking.openURL(`tel:${event.organizerPhone}`)
                  }>
                  <Text style={styles.linkText}>{event.organizerPhone}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Terms and Conditions */}
        {event.termsAndConditions && (
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>Terms and Conditions</Text>
            <Text style={styles.description}>{event.termsAndConditions}</Text>
          </View>
        )}

        {/* Admin Information */}
        <View style={styles.detailSection}>
          <Text style={styles.sectionTitle}>Admin Information</Text>
          <View style={styles.detailRow}>
            <Icon name="calendar-plus" size={20} color="#2e7af5" />
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailLabel}>Created</Text>
              <Text style={styles.detailText}>
                {formatDate(event.created_at)}
              </Text>
            </View>
          </View>

          {event.verified_at && (
            <View style={styles.detailRow}>
              <Icon name="check-circle" size={20} color="#2e7af5" />
              <View style={styles.detailTextContainer}>
                <Text style={styles.detailLabel}>Verified</Text>
                <Text style={styles.detailText}>
                  {formatDate(event.verified_at)}
                </Text>
              </View>
            </View>
          )}

          {event.admin_edited && (
            <View style={styles.detailRow}>
              <Icon name="pencil" size={20} color="#2e7af5" />
              <View style={styles.detailTextContainer}>
                <Text style={styles.detailLabel}>Last Edited by Admin</Text>
                <Text style={styles.detailText}>
                  {formatDate(event.admin_edited_at)}
                </Text>
              </View>
            </View>
          )}

          {/* Add verification notes if any */}
          {event.verification_notes && (
            <View style={styles.notesContainer}>
              <Text style={styles.notesTitle}>Verification Notes</Text>
              <Text style={styles.notesText}>{event.verification_notes}</Text>
            </View>
          )}
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
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: 'white',
  },
  headerBackButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerActionButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#2e7af5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  eventHeaderSection: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  eventTypeAndStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventType: {
    fontSize: 14,
    color: '#2e7af5',
    fontWeight: '500',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  eventTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  eventMode: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventModeText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  adminActionBar: {
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    padding: 16,
  },
  adminActionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  adminActionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  adminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    marginRight: 8,
    marginBottom: 8,
  },
  approveButton: {
    backgroundColor: '#4caf50',
  },
  rejectButton: {
    backgroundColor: '#f44336',
  },
  registrationsButton: {
    backgroundColor: '#2196f3',
  },
  deleteButton: {
    backgroundColor: '#757575',
  },
  adminButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 14,
    marginLeft: 4,
  },
  statsSection: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  statsCard: {
    flex: 1,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#eee',
    paddingVertical: 8,
  },
  statsNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2e7af5',
  },
  statsLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  detailSection: {
    padding: 16,
    backgroundColor: 'white',
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  detailTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 2,
  },
  detailText: {
    fontSize: 16,
    color: '#333',
  },
  description: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  linkText: {
    fontSize: 16,
    color: '#2e7af5',
    textDecorationLine: 'underline',
  },
  speakerCard: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 12,
  },
  speakerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  speakerInfo: {
    flex: 1,
  },
  speakerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  speakerTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  speakerBio: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  sponsorsContainer: {
    paddingBottom: 8,
  },
  sponsorCard: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginRight: 16,
    marginBottom: 8,
    minWidth: 250,
    maxWidth: 300,
  },
  sponsorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  sponsorLevel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  sponsorRegistration: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  sponsorRegistrationText: {
    fontSize: 12,
    color: '#388e3c',
    marginLeft: 4,
  },
  sponsorContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sponsorContactText: {
    fontSize: 13,
    color: '#555',
    marginLeft: 6,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: '#e3f2fd',
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    color: '#2e7af5',
    fontSize: 14,
  },
  brochureContainer: {
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: {width: 0, height: 1},
  },
  brochureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  registrationItem: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  registrationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  registrationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  registrationDate: {
    fontSize: 12,
    color: '#777',
  },
  registrationEmail: {
    fontSize: 14,
    color: '#2e7af5',
    marginBottom: 4,
  },
  registrationPhone: {
    fontSize: 14,
    color: '#666',
  },
  viewAllButton: {
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#f0f7ff',
    borderRadius: 8,
    marginTop: 8,
  },
  viewAllButtonText: {
    color: '#2e7af5',
    fontWeight: '500',
  },
  noDataText: {
    fontSize: 16,
    color: '#888',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 16,
  },
  notesContainer: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2e7af5',
  },
  notesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
});

export default AdminEventDetails;
