import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StatusBar,
  Platform,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AntDesignIcon from 'react-native-vector-icons/AntDesign';
import {Calendar} from 'react-native-calendars';
import {eventService} from '../services/api'; // Import the API service
import {useAuth} from '../context/AuthContext';
import {
  SafeAreaInsetsContext,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

const ConferencesScreen = ({navigation}) => {
  const {user} = useAuth(); // Get current user
  const [activeTab, setActiveTab] = useState('All Events');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [events, setEvents] = useState([]); // State for events
  const [loading, setLoading] = useState(true); // State for loading
  const [registeredEvents, setRegisteredEvents] = useState([]); // Add this state
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();
  const formatDate = dateString => {
    const options = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  // Helper function to format time
  const formatTime = timeString => {
    if (!timeString) return '';
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Add this new component for rendering multi-day date information
  const renderEventDates = (event, eventDays = []) => {
    if (eventDays && eventDays.length > 1) {
      // Multi-day event
      return (
        <View style={styles.multiDayContainer}>
          <View style={styles.eventDetailItem}>
            <Icon name="calendar-range" size={16} color="#666" />
            <Text style={styles.eventDetailText}>
              {eventDays.length} Days: {formatDate(eventDays[0].date)} -{' '}
              {formatDate(eventDays[eventDays.length - 1].date)}
            </Text>
          </View>

          {/* Show first 2 days with times */}
          {eventDays.slice(0, 2).map((day, index) => (
            <View key={day.day_number} style={styles.dayTimeItem}>
              <Icon name="clock" size={14} color="#888" />
              <Text style={styles.dayTimeText}>
                Day {day.day_number}: {formatTime(day.start_time)} -{' '}
                {formatTime(day.end_time)}
              </Text>
            </View>
          ))}

          {eventDays.length > 2 && (
            <Text style={styles.moreDaysText}>
              +{eventDays.length - 2} more days
            </Text>
          )}
        </View>
      );
    } else {
      // Single day event
      return (
        <>
          <View style={styles.eventDetailItem}>
            <Icon name="calendar" size={16} color="#666" />
            <Text style={styles.eventDetailText}>
              {formatDate(event.start_date)} - {formatDate(event.end_date)}
            </Text>
          </View>

          <View style={styles.eventDetailItem}>
            <Icon name="clock" size={16} color="#666" />
            <Text style={styles.eventDetailText}>
              {formatTime(event.start_time)} - {formatTime(event.end_time)}
            </Text>
          </View>
        </>
      );
    }
  };

  // Update the fetchEvents function to include event days
  const fetchEvents = async () => {
    try {
      setLoading(true);
      const data = await eventService.getAllEvents();

      // Fetch brochure info and event days for each event
      const eventsWithAdditionalData = await Promise.all(
        data.map(async event => {
          try {
            // Fetch brochure
            const brochureData = await eventService.getEventBrochure(event.id);

            // Fetch event days
            let eventDays = [];
            try {
              eventDays = await eventService.getEventDays(event.id);
            } catch (error) {
              console.log('No event days found for event:', event.id);
            }

            return {
              ...event,
              brochure: brochureData,
              eventDays: eventDays || [],
            };
          } catch (error) {
            return {
              ...event,
              eventDays: [],
            };
          }
        }),
      );

      // Sort events by start date
      const sortedEvents = eventsWithAdditionalData.sort((a, b) => {
        return new Date(a.start_date) - new Date(b.start_date);
      });

      setEvents(sortedEvents);
    } catch (error) {
      console.error('Failed to fetch events:', error);
      Alert.alert('Error', 'Failed to load events.');
    } finally {
      setLoading(false);
    }
  };

  // Add onRefresh handler
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchEvents(), fetchRegisteredEvents()]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Add function to fetch registered events
  const fetchRegisteredEvents = async () => {
    try {
      const data = await eventService.getRegisteredEvents();
      setRegisteredEvents(data.map(event => event.id));
    } catch (error) {
      console.error('Failed to fetch registered events:', error);
    }
  };

  useEffect(() => {
    fetchEvents(); // Fetch events when the screen loads
    fetchRegisteredEvents();
  }, []);

  // Update the filtering logic in the component
  const filteredEvents = events.filter(event => {
    // Filter out past events - add this new code block first
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to beginning of day for proper comparison
    const eventStartDate = new Date(event.start_date);

    // Skip events that have already ended
    if (eventStartDate < today) {
      return false;
    }

    // Filter based on active tab
    if (activeTab === 'Conferences' && event.type !== 'Conference') {
      return false;
    }

    if (activeTab === 'Meetings' && event.type !== 'Meeting') {
      return false;
    }

    // Filter based on search query (search in title, description and organizer)
    if (searchQuery) {
      const searchTerm = searchQuery.toLowerCase();
      const matchesSearch =
        event.title.toLowerCase().includes(searchTerm) ||
        event.description.toLowerCase().includes(searchTerm) ||
        event.organizer_name.toLowerCase().includes(searchTerm);

      if (!matchesSearch) {
        return false;
      }
    }

    // Filter based on selected date
    if (selectedDate) {
      const eventStartDate = new Date(event.start_date);
      const searchDate = new Date(selectedDate);

      // Check if event date matches selected date
      if (
        eventStartDate.getDate() !== searchDate.getDate() ||
        eventStartDate.getMonth() !== searchDate.getMonth() ||
        eventStartDate.getFullYear() !== searchDate.getFullYear()
      ) {
        return false;
      }
    }

    return true;
  });

  // Add a clear filters function
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedDate('');
    setActiveTab('All Events');
  };

  // Update the renderEventCard function to include brochure thumbnail
  const renderEventCard = event => (
    <View style={styles.eventCard} key={event.id}>
      {/* Brochure Preview - Only show if event has a brochure */}
      {event.brochure && (
        <View style={styles.brochurePreviewContainer}>
          <TouchableOpacity
            style={styles.brochurePreview}
            onPress={() =>
              navigation.navigate('EventDetails', {eventId: event.id})
            }>
            <Icon name="file-pdf-box" size={36} color="#e53935" />
            <Text style={styles.brochureText}>View Brochure</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.eventBadgeContainer}>
        <View
          style={[styles.badge, styles[event.type.toLowerCase() + 'Badge']]}>
          <Text style={styles.badgeText}>{event.type}</Text>
        </View>
        <View
          style={[styles.badge, styles[event.status.toLowerCase() + 'Badge']]}>
          <Text style={styles.badgeText}>{event.status}</Text>
        </View>
      </View>

      <Text style={styles.eventTitle}>{event.title}</Text>
      <Text style={styles.eventDescription}>{event.description}</Text>

      <View style={styles.eventDetails}>
        {/* Use the new multi-day date renderer */}
        {renderEventDates(event, event.eventDays)}

        <View style={styles.eventDetailItem}>
          <Icon
            name={event.mode === 'Virtual' ? 'video' : 'map-marker'}
            size={16}
            color="#666"
          />
          <Text style={styles.eventDetailText}>
            {event.mode === 'Virtual' ? 'Virtual Event' : event.venue}
          </Text>
        </View>
        <View style={styles.eventDetailItem}>
          <Icon name="account-group" size={16} color="#666" />
          <Text style={styles.eventDetailText}>{event.organizer_name}</Text>
        </View>
      </View>

      <View style={styles.eventButtonContainer}>
        <TouchableOpacity
          style={styles.eventButton}
          onPress={() =>
            navigation.navigate('EventDetails', {eventId: event.id})
          }>
          <Text style={styles.eventButtonText}>View Details</Text>
        </TouchableOpacity>

        {/* Only show register button if user is not the organizer */}
        {user?.id !== event.organizer_id &&
          (registeredEvents.includes(event.id) ? (
            <TouchableOpacity
              style={[styles.eventButton, styles.registeredButton]}
              disabled={true}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <AntDesignIcon name="checkcircle" size={14} color="#fff" />
                <Text style={[styles.registeredButtonText, {marginLeft: 5}]}>
                  Registered
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.eventButton, styles.registerButton]}
              onPress={() =>
                navigation.navigate('EventRegistration', {eventId: event.id})
              }>
              <Text style={styles.registerButtonText}>Register</Text>
            </TouchableOpacity>
          ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, {paddingTop: insets.top}]}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <View>
            <Text style={styles.headerTitle}>Events</Text>
            <Text style={styles.headerSubtitle}>
              Browse and Register For Upcoming Events.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => navigation.navigate('CreateConference')}>
            <Icon name="plus" size={18} color="#fff" />
            <Text style={styles.createButtonText}>Create</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search and Filter */}
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
            placeholder="Search by title, description or organizer..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close" size={20} color="#999" />
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity
          style={styles.datePickerButton}
          onPress={() => setShowDatePicker(!showDatePicker)}>
          <Icon
            name="calendar"
            size={20}
            color={selectedDate ? '#2e7af5' : '#666'}
          />
          <Text
            style={[styles.datePickerText, selectedDate && {color: '#2e7af5'}]}>
            {selectedDate ? formatDate(selectedDate) : 'Filter by date'}
          </Text>
          {selectedDate ? (
            <TouchableOpacity
              onPress={e => {
                e.stopPropagation();
                setSelectedDate('');
              }}
              style={{marginLeft: 8}}>
              <Icon name="close" size={16} color="#666" />
            </TouchableOpacity>
          ) : null}
        </TouchableOpacity>
      </View>

      {showDatePicker && (
        <Calendar
          style={styles.calendar}
          onDayPress={day => {
            setSelectedDate(day.dateString);
            setShowDatePicker(false);
          }}
          markedDates={{
            [selectedDate]: {selected: true, selectedColor: '#2e7af5'},
          }}
        />
      )}

      {(searchQuery || selectedDate) && (
        <View style={styles.activeFiltersContainer}>
          <Text style={styles.activeFiltersText}>
            {`${filteredEvents.length} ${
              filteredEvents.length === 1 ? 'result' : 'results'
            } found`}
          </Text>
          <TouchableOpacity
            onPress={clearFilters}
            style={styles.clearFiltersButton}>
            <Text style={styles.clearFiltersText}>Clear all filters</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Event Type Tabs */}
      <View style={styles.tabsContainer}>
        {['All Events', 'Conferences', 'Meetings'].map(type => (
          <TouchableOpacity
            key={type}
            style={[styles.tab, activeTab === type && styles.activeTab]}
            onPress={() => setActiveTab(type)}>
            <Text
              style={[
                styles.tabText,
                activeTab === type && styles.activeTabText,
              ]}>
              {type}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Event Cards */}
      {loading ? (
        <ActivityIndicator
          size="large"
          color="#2e7af5"
          style={{marginTop: 20}}
        />
      ) : (
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }>
          <View style={styles.eventsContainer}>
            {filteredEvents.map(event => renderEventCard(event))}

            {filteredEvents.length === 0 && !loading && (
              <View style={styles.emptyContainer}>
                <Icon name="calendar-blank" size={64} color="#ccc" />
                <Text style={styles.emptyTitle}>No Upcoming Events</Text>
                <Text style={styles.emptySubtitle}>
                  {searchQuery
                    ? 'No upcoming events match your search criteria'
                    : selectedDate
                    ? 'No events scheduled for the selected date'
                    : 'There are no upcoming events at this time'}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9fc',
    //paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    padding: 20,
    paddingBottom: 0,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    marginBottom: 16,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2e7af5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  createButtonText: {
    color: 'white',
    fontWeight: '500',
    marginLeft: 6,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
  },
  filterButtonText: {
    color: '#2e7af5',
    marginHorizontal: 4,
    fontSize: 14,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
  },
  datePickerText: {
    color: '#666',
    marginLeft: 4,
    fontSize: 14,
  },
  calendar: {
    borderRadius: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  activeFiltersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  activeFiltersText: {
    fontSize: 14,
    color: '#666',
  },
  clearFiltersButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  clearFiltersText: {
    fontSize: 14,
    color: '#333',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  tab: {
    marginRight: 24,
    paddingBottom: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#2e7af5',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  activeTabText: {
    color: '#2e7af5',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  eventsContainer: {
    padding: 20,
  },
  eventCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  brochurePreviewContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 1,
  },
  brochurePreview: {
    backgroundColor: 'rgba(245, 245, 245, 0.95)',
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brochureText: {
    color: '#e53935',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  eventBadgeContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  badge: {
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
  },
  conferenceBadge: {
    backgroundColor: '#EBE9FD',
  },
  meetingBadge: {
    backgroundColor: '#D1F2EA',
  },
  upcomingBadge: {
    backgroundColor: '#EBE9FD',
  },
  ongoingBadge: {
    backgroundColor: '#E3F5DB',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#7B68EE',
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  eventDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  eventDetails: {
    marginBottom: 16,
  },
  eventDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventDetailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  eventButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  eventButtonText: {
    color: '#2e7af5',
    fontSize: 14,
    fontWeight: '500',
  },
  registerButton: {
    backgroundColor: '#2e7af5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  registerButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  registeredButton: {
    backgroundColor: '#4caf50',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  registeredButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    maxWidth: '80%',
  },

  // Add these new styles for multi-day events
  multiDayContainer: {
    marginBottom: 8,
  },
  dayTimeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    marginLeft: 20,
  },
  dayTimeText: {
    fontSize: 12,
    color: '#888',
    marginLeft: 6,
  },
  moreDaysText: {
    fontSize: 12,
    color: '#2e7af5',
    fontStyle: 'italic',
    marginLeft: 20,
    marginTop: 4,
  },
});

export default ConferencesScreen;
