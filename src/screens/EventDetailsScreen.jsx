import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Clipboard,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {eventService} from '../services/api';
import {useAuth} from '../context/AuthContext';
import PdfViewer from '../components/PdfViewer';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Share from 'react-native-share';
import sharingService from '../services/sharingService';

// Event Status Badge Component (reused from HomeScreen)
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

const EventDetailsScreen = ({route, navigation}) => {
  const {eventId} = route.params;
  const {user} = useAuth();
  const [event, setEvent] = useState(null);
  const [eventDays, setEventDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [registeredEvents, setRegisteredEvents] = useState([]);
  const [brochure, setBrochure] = useState(null);
  const [brochureLoading, setBrochureLoading] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    fetchEventDetails();
    fetchEventBrochure();
    fetchRegisteredEvents();
    fetchEventDays(); // Add this
  }, [eventId]);

  const fetchEventDetails = async () => {
  try {
    setLoading(true);
    const eventData = await eventService.getEventById(eventId);

    // ADD: Enhanced debug logging for sponsors
    console.log('📋 Event data received:', eventData);
    console.log('📋 Event sponsors:', eventData.sponsors);
    console.log('📋 Sponsors type:', typeof eventData.sponsors);
    console.log('📋 Sponsors length:', eventData.sponsors?.length || 0);
    
    // Check if sponsors is a string (JSON) that needs parsing
    if (typeof eventData.sponsors === 'string') {
      try {
        eventData.sponsors = JSON.parse(eventData.sponsors);
        console.log('📋 Parsed sponsors:', eventData.sponsors);
      } catch (error) {
        console.error('❌ Failed to parse sponsors JSON:', error);
        eventData.sponsors = [];
      }
    }

    setEvent(eventData);
  } catch (error) {
    console.error('Failed to load event details:', error);
    Alert.alert('Error', 'Failed to load event details.');
  } finally {
    setLoading(false);
  }
};

  // Add function to fetch registered events
  const fetchRegisteredEvents = async () => {
    try {
      const data = await eventService.getRegisteredEvents();
      setRegisteredEvents(data.map(event => event.id));
    } catch (error) {
      console.error('Failed to fetch registered events:', error);
    }
  };

  // Update the fetchEventBrochure function
  const fetchEventBrochure = async () => {
    try {
      setBrochureLoading(true);
      const brochureData = await eventService.getEventBrochure(eventId);
      console.log('Fetched brochure data:', brochureData);

      if (brochureData) {
        setBrochure(brochureData);
      }
    } catch (error) {
      console.error('Failed to load brochure:', error);
      // Not showing an alert as this is not critical
    } finally {
      setBrochureLoading(false);
    }
  };

  // Add this new function
  const fetchEventDays = async () => {
    try {
      const eventDaysData = await eventService.getEventDays(eventId);
      setEventDays(eventDaysData || []);
    } catch (error) {
      console.error('Failed to load event days:', error);
      setEventDays([]);
    }
  };

  // Format date function
  const formatDate = dateString => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Format time function
  const formatTime = dateString => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Add function to handle event deletion
  const handleDeleteEvent = async () => {
    Alert.alert('Delete Event', 'Are you sure you want to delete this event?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await eventService.deleteEvent(eventId);
            Alert.alert('Success', 'Event deleted successfully');
            navigation.goBack();
          } catch (error) {
            console.error('Error deleting event:', error);
            Alert.alert('Error', 'Failed to delete event');
          }
        },
      },
    ]);
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

  const renderSponsorItem = ({item}) => {
    const sponsorName = 
      item.name || 
      item.company_name || 
      item.contactPerson || 
      item.pharma_name || 
      'Unknown Sponsor';

    const sponsorLevel = item.level || 'Standard';
    const sponsorType = item.type || 'manual';
    const isPharmaSponsor = sponsorType === 'pharma_company';

    return (
      <View style={styles.sponsorCard}>
        <View style={styles.sponsorHeader}>
          <Icon 
            name={isPharmaSponsor ? 'domain' : 'handshake'} 
            size={20} 
            color="#2e7af5" 
          />
          <Text style={styles.sponsorName}>{sponsorName}</Text>
        </View>

        {item.contactPerson && item.contactPerson !== sponsorName && (
          <View style={styles.sponsorDetail}>
            <Icon name="account" size={14} color="#666" />
            <Text style={styles.sponsorDetailText}>
              {item.contactPerson}
            </Text>
          </View>
        )}

        {item.contactEmail && (
          <View style={styles.sponsorDetail}>
            <Icon name="email" size={14} color="#666" />
            <Text style={styles.sponsorDetailText}>
              {item.contactEmail}
            </Text>
          </View>
        )}

        <View style={styles.sponsorFooter}>
          <View style={[
            styles.sponsorLevelBadge,
            {
              backgroundColor: 
                sponsorLevel === 'Gold' ? '#fff3cd' :
                sponsorLevel === 'Silver' ? '#f8f9fa' :
                sponsorLevel === 'Bronze' ? '#ffeaa7' : '#e3f2fd'
            }
          ]}>
            <Text style={[
              styles.sponsorLevelText,
              {
                color: 
                  sponsorLevel === 'Gold' ? '#856404' :
                  sponsorLevel === 'Silver' ? '#495057' :
                  sponsorLevel === 'Bronze' ? '#6c5ce7' : '#2e7af5'
              }
            ]}>
              {sponsorLevel}
            </Text>
          </View>

          <View style={[
            styles.sponsorTypeBadge,
            {backgroundColor: isPharmaSponsor ? '#e8f5e9' : '#fff3e0'}
          ]}>
            <Icon 
              name={isPharmaSponsor ? 'medical-bag' : 'account-group'} 
              size={12} 
              color={isPharmaSponsor ? '#2e7d32' : '#f57c00'} 
            />
            <Text style={[
              styles.sponsorTypeText,
              {color: isPharmaSponsor ? '#2e7d32' : '#f57c00'}
            ]}>
              {isPharmaSponsor ? 'Pharma' : 'Manual'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // Add this helper function inside your component, before the return statement
  const handleOpenLink = url => {
    // Log the original URL
    console.log('Original URL:', url);

    // Better URL validation and formatting
    let validUrl = url.trim();

    // Add proper protocol if missing
    if (!validUrl.match(/^https?:\/\//i)) {
      validUrl = `https://${validUrl}`;
      console.log('Added https:// protocol:', validUrl);
    }

    console.log('Attempting to open:', validUrl);

    // Skip canOpenURL check and directly try to open the URL
    Linking.openURL(validUrl)
      .then(() => {
        console.log('URL opened successfully');
      })
      .catch(err => {
        console.error('Error opening URL:', err);

        // Show error message with the actual URL for debugging
        Alert.alert(
          'Error Opening Link',
          `Could not open ${validUrl}. Please try copying the link manually.`,
          [
            {
              text: 'Copy URL',
              onPress: () => {
                Clipboard.setString(validUrl);
                Alert.alert(
                  'URL Copied',
                  'The URL has been copied to clipboard',
                );
              },
            },
            {
              text: 'OK',
              style: 'cancel',
            },
          ],
        );
      });
  };

  const handleShareEvent = async () => {
    try {
      await sharingService.shareEvent(eventId, {
        title: event.title,
        description: event.description,
        startDate: event.startDate,
        mode: event.mode,
        venue: event.venue,
      });
    } catch (error) {
      console.error('Failed to share event:', error);
    }
  };

  const handleShareMeeting = async () => {
    try {
      await sharingService.shareMeeting(eventId, {
        title: event.title,
        description: event.description,
        date: event.startDate,
        mode: event.mode,
        venue: event.venue,
        organizer: event.organizerName,
      });
    } catch (error) {
      console.error('Failed to share meeting:', error);
    }
  };

  // Add this helper function to format time from time string
  const formatTimeFromString = (timeString) => {
    if (!timeString) return '';
    try {
      // timeString is in format "HH:MM:SS" or "HH:MM"
      const [hours, minutes] = timeString.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch (error) {
      return timeString; // Return original if parsing fails
    }
  };

  // Add this component to render event days
  const renderEventDays = () => {
    if (!eventDays || eventDays.length === 0) {
      // Fallback to original single-day display
      return (
        <>
          <View style={styles.detailRow}>
            <Icon name="calendar-range" size={20} color="#2e7af5" />
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailLabel}>Start Date</Text>
              <Text style={styles.detailText}>
                {formatDate(event.startDate)} at {formatTime(event.startDate)}
              </Text>
            </View>
          </View>
          <View style={styles.detailRow}>
            <Icon name="calendar-range" size={20} color="#2e7af5" />
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailLabel}>End Date</Text>
              <Text style={styles.detailText}>
                {formatDate(event.endDate)} at {formatTime(event.endDate)}
              </Text>
            </View>
          </View>
        </>
      );
    }

    // Multi-day event display
    return (
      <View style={styles.multiDayEventsContainer}>
        <View style={styles.eventOverviewRow}>
          <Icon name="calendar-multiple" size={20} color="#2e7af5" />
          <View style={styles.detailTextContainer}>
            <Text style={styles.detailLabel}>Event Duration</Text>
            <Text style={styles.detailText}>
              {eventDays.length} Day{eventDays.length > 1 ? 's' : ''} • {formatDate(eventDays[0].date)} - {formatDate(eventDays[eventDays.length - 1].date)}
            </Text>
          </View>
        </View>

        {eventDays.map((day, index) => (
          <View key={day.day_number} style={styles.eventDayCard}>
            <View style={styles.dayHeader}>
              <View style={styles.dayNumberBadge}>
                <Text style={styles.dayNumberText}>{day.day_number}</Text>
              </View>
              <View style={styles.dayHeaderInfo}>
                <Text style={styles.dayDate}>{formatDate(day.date)}</Text>
                <Text style={styles.dayTime}>
                  {formatTimeFromString(day.start_time)} - {formatTimeFromString(day.end_time)}
                </Text>
              </View>
            </View>

            {day.venue && (
              <View style={styles.dayDetail}>
                <Icon name="map-marker" size={16} color="#666" />
                <Text style={styles.dayDetailText}>{day.venue}</Text>
              </View>
            )}

            {day.venue_address && (
              <View style={styles.dayDetail}>
                <Icon name="map-marker-outline" size={16} color="#666" />
                <Text style={styles.dayDetailText}>{day.venue_address}</Text>
              </View>
            )}

            {day.description && (
              <View style={styles.dayDetail}>
                <Icon name="text" size={16} color="#666" />
                <Text style={styles.dayDetailText}>{day.description}</Text>
              </View>
            )}

            {day.capacity && (
              <View style={styles.dayDetail}>
                <Icon name="account-group" size={16} color="#666" />
                <Text style={styles.dayDetailText}>{day.capacity} attendees</Text>
              </View>
            )}

            {day.special_notes && (
              <View style={styles.dayDetail}>
                <Icon name="note-text" size={16} color="#666" />
                <Text style={styles.dayDetailText}>{day.special_notes}</Text>
              </View>
            )}
          </View>
        ))}
      </View>
    );
  };

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
          onPress={handleShareMeeting}>
          <Icon name="share-variant" size={24} color="#2e7af5" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
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

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          {user?.id === event.organizer_id ? (
            // Show Edit and Delete buttons for event creator
            <>
              <TouchableOpacity
                style={[styles.secondaryButton, {backgroundColor: '#ffebee'}]}
                onPress={handleDeleteEvent}>
                <Icon name="delete" size={18} color="#d32f2f" />
                <Text style={[styles.secondaryButtonText, {color: '#d32f2f'}]}>
                  Delete Event
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            // Show Register/Registered and Quiz buttons for other users
            <>
              {event.status === 'approved' &&
                (registeredEvents.includes(event.id) ? (
                  <TouchableOpacity
                    style={[styles.primaryButton, {backgroundColor: '#4caf50'}]}
                    disabled={true}>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <Icon name="check-circle" size={18} color="#fff" />
                      <Text style={[styles.primaryButtonText, {marginLeft: 6}]}>
                        Registered
                      </Text>
                    </View>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() =>
                      navigation.navigate('EventRegistration', {eventId})
                    }>
                    <Icon name="account-plus" size={18} color="#fff" />
                    <Text style={styles.primaryButtonText}> Register Now</Text>
                  </TouchableOpacity>
                ))}

              <TouchableOpacity
                style={[styles.secondaryButton, {backgroundColor: '#ff85be'}]}
                onPress={() =>
                  navigation.navigate('Quiz', {
                    eventId: event.id,
                    eventTitle: event.title,
                  })
                }>
                <Icon name="help-circle" size={18} color="#fff" />
                <Text style={[styles.secondaryButtonText, {color: '#fff'}]}>
                  Take Quiz
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Date and Time Section - Updated */}
        <View style={styles.detailSection}>
          <Text style={styles.sectionTitle}>
            {eventDays && eventDays.length > 1 ? 'Event Schedule' : 'Date & Time'}
          </Text>
          {renderEventDays()}
        </View>

        {/* Location Section - Updated for multi-day */}
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
                {event.mode === 'Virtual' ? 'Platform' : 'Main Venue'}
              </Text>

              {/* Virtual event handling */}
              {event.mode === 'Virtual' ? (
                <>
                  <Text style={styles.detailText}>Virtual Event</Text>

                  {/* Only show join link if user created event or has registered */}
                  {(event.organizer_id === user?.id ||
                    registeredEvents.includes(event.id)) && (
                    <TouchableOpacity
                      style={styles.joinLinkContainer}
                      onPress={() => handleOpenLink(event.venue)}>
                      <Icon name="link" size={16} color="#2e7af5" />
                      <Text style={styles.joinLinkText}>
                        Join Virtual Event
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                // For in-person events, show venue as before
                <Text style={styles.detailText}>{event.venue}</Text>
              )}
            </View>
          </View>

          {event.capacity && (
            <View style={styles.detailRow}>
              <Icon name="account-group" size={20} color="#2e7af5" />
              <View style={styles.detailTextContainer}>
                <Text style={styles.detailLabel}>Overall Capacity</Text>
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
            <Text style={styles.sectionTitle}>
              Event Sponsors ({event.sponsors.length})
            </Text>
            <FlatList
              data={event.sponsors}
              renderItem={renderSponsorItem}
              keyExtractor={(item, index) => {
                return (
                  item.id?.toString() ||
                  item.pharma_id?.toString() ||
                  item.name ||
                  `sponsor-${index}`
                );
              }}
              scrollEnabled={false}
              numColumns={2}
              columnWrapperStyle={
                event.sponsors.length > 1 ? styles.sponsorsRow : null
              }
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
      </ScrollView>
    </SafeAreaView>
  );
};

// Add these new styles to the existing StyleSheet
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9fc',
    //paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
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
  actionButtonsContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  primaryButton: {
    backgroundColor: '#2e7af5',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
    marginRight: 8,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  registeredButton: {
    backgroundColor: '#4caf50',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#f0f7ff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginLeft: 8,
  },
  secondaryButtonText: {
    color: '#2e7af5',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
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
    paddingVertical: 8,
  },
  sponsorsRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sponsorCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    marginRight: 8,
    flex: 1,
    minWidth: 160,
    maxWidth: '48%',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  sponsorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sponsorName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  sponsorDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sponsorDetailText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
    flex: 1,
  },
  sponsorFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  sponsorLevelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  sponsorLevelText: {
    fontSize: 11,
    fontWeight: '600',
  },
  sponsorTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  sponsorTypeText: {
    fontSize: 10,
    fontWeight: '500',
    marginLeft: 3,
  },

  // New styles for multi-day events
  multiDayEventsContainer: {
    gap: 12,
  },
  eventOverviewRow: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  eventDayCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2e7af5',
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2e7af5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dayNumberText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  dayHeaderInfo: {
    flex: 1,
  },
  dayDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  dayTime: {
    fontSize: 14,
    color: '#666',
  },
  dayDetail: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  dayDetailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  joinLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
  },
  joinLinkText: {
    fontSize: 14,
    color: '#2e7af5',
    fontWeight: '500',
    marginLeft: 6,
  },

  // ... rest of existing styles ...
});

export default EventDetailsScreen;
