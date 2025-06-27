import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Alert,
  TextInput,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useAuth} from '../context/AuthContext';
import {eventService} from '../services/api';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Calendar} from 'react-native-calendars'; // Add this import
import api from '../services/api';

// Event Status Badge Component (reused from MyEventsScreen)
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

const HomeScreen = ({navigation}) => {
  // Get user from auth context
  const {user} = useAuth();
  const insets = useSafeAreaInsets();
  // State for events
  const [registeredEvents, setRegisteredEvents] = useState([]); // Add this at the top with other states
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('my'); // 'my', 'ongoing', 'recommended'

  // Add state for stats
  const [stats, setStats] = useState({
    upcomingEvents: 0,
    newRegistrations: 0,
    meetingsThisWeek: 0,
    nextMeetingDays: null,
  });

  // Add new state for search
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredEvents, setFilteredEvents] = useState([]);
  // Add these near your other state declarations
  const [showCalendar, setShowCalendar] = useState(false);
  const [markedDates, setMarkedDates] = useState({});

  // Add this state variable with your other state declarations
  const [profileImage, setProfileImage] = useState(user?.avatar_url || null);

  // Helper function to get proper greeting based on time of day
  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return 'Good Morning';
    if (hours < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Format the name with title if user is a doctor
  const getFormattedName = () => {
    if (!user) return 'User';

    if (user.role === 'doctor') {
      // Get first name only for a more personal greeting
      const firstName = user.name.split(' ')[0];
      return `Dr. ${firstName}`;
    }

    // For non-doctors just use their first name
    return user.name.split(' ')[0];
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

  // Add this function to fetch profile image
  const fetchProfileImage = async () => {
    try {
      const response = await api.get(`/users/profile-image`);
      if (response.data && response.data.avatar_url) {
        setProfileImage(response.data.avatar_url);
      }
    } catch (error) {
      console.log('Could not fetch profile image:', error);
      // Keep using existing image or default
    }
  };

  // Calculate real stats from events data
  const calculateStats = eventsData => {
    const now = new Date();

    // Count upcoming events (events that haven't ended yet)
    const upcoming = eventsData.filter(event => new Date(event.endDate) >= now);

    // Count this week's meetings/events
    const oneWeekFromNow = new Date(now);
    oneWeekFromNow.setDate(now.getDate() + 7);

    const thisWeekMeetings = upcoming.filter(
      event => new Date(event.startDate) <= oneWeekFromNow,
    );

    // Find next meeting
    const nextMeeting = upcoming.sort(
      (a, b) => new Date(a.startDate) - new Date(b.startDate),
    )[0];

    let nextMeetingDays = null;
    if (nextMeeting) {
      const diffTime = Math.abs(new Date(nextMeeting.startDate) - now);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      nextMeetingDays = diffDays;
    }

    // Get new registrations this week (dummy logic - replace with actual if available)
    // This would ideally be fetched from the server
    const newRegistrations = Math.min(upcoming.length, 2);

    setStats({
      upcomingEvents: upcoming.length,
      newRegistrations,
      meetingsThisWeek: thisWeekMeetings.length,
      nextMeetingDays,
    });
  };

  // Update the fetchEvents function to filter ongoing events for today only
  const fetchEvents = async () => {
    try {
      setLoading(true);
      // Fetch events based on active tab
      let data;
      switch (activeTab) {
        case 'my':
          data = await eventService.getMyEvents();
          break;
        case 'ongoing':
          // Get all events first
          data = await eventService.getOngoingEvents();

          // Filter to show only events scheduled for today
          const today = new Date();
          today.setHours(0, 0, 0, 0); // Reset time to start of day

          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1); // Get tomorrow's date

          // Filter events that are happening today (current date falls between start and end dates)
          data = data.filter(event => {
            const startDate = new Date(event.startDate);
            startDate.setHours(0, 0, 0, 0);

            const endDate = new Date(event.endDate);
            endDate.setHours(23, 59, 59, 999); // End of day

            return startDate <= today && endDate >= today;
          });
          break;
        case 'participated':
          // Get registered events (full details) when participated tab is selected
          data = await eventService.getRegisteredEvents();
          // Sort by start date (newest first)
          data = data.sort(
            (a, b) => new Date(b.startDate) - new Date(a.startDate),
          );
          break;
        case 'recommended':
          data = await eventService.getRecommendedEvents();
          break;
        default:
          data = await eventService.getMyEvents();
      }

      // Fetch brochure info for each event
      const eventsWithBrochures = await Promise.all(
        data.map(async event => {
          try {
            const brochureData = await eventService.getEventBrochure(event.id);
            return {...event, brochure: brochureData};
          } catch (error) {
            // If no brochure or error, return event without brochure
            return event;
          }
        }),
      );

      setEvents(eventsWithBrochures);
      calculateStats(eventsWithBrochures); // Calculate stats based on events
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Update useEffect to fetch registered events
  useEffect(() => {
    fetchEvents();
    fetchRegisteredEvents();
    if (user) fetchProfileImage(); // Add this line

    const unsubscribe = navigation.addListener('focus', () => {
      fetchEvents();
      fetchRegisteredEvents();
      if (user) fetchProfileImage(); // Add this line
    });

    return unsubscribe;
  }, [navigation, activeTab]);

  // Update onRefresh to include registered events
  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([fetchEvents(), fetchRegisteredEvents()]); // Update this
  };

  // Format date function (reused from MyEventsScreen)
  const formatDate = dateString => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Update the renderEventItem function to fix the layout

  const renderEventItem = ({item}) => (
    <TouchableOpacity
      style={styles.eventCard}
      onPress={() => navigation.navigate('EventDetails', {eventId: item.id})}>
      {/* Event Header with Status Badge */}
      <View style={styles.eventHeader}>
        <View>
          <Text style={styles.eventType}>{item.type}</Text>
          <Text style={styles.eventTitle}>{item.title}</Text>
        </View>
        <EventStatusBadge status={item.status} />
      </View>

      {/* Brochure Preview - Repositioned below the header */}
      {item.brochure && (
        <View style={styles.brochureTagContainer}>
          <TouchableOpacity
            style={styles.brochureTag}
            onPress={() =>
              navigation.navigate('EventDetails', {eventId: item.id})
            }>
            <Icon name="file-pdf-box" size={20} color="#e53935" />
            <Text style={styles.brochureTagText}>View Brochure</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.eventDescription} numberOfLines={2}>
        {item.description}
      </Text>

      <View style={styles.eventDetails}>
        <View style={styles.detailItem}>
          <Icon name="calendar-range" size={16} color="#666" />
          <Text style={styles.detailText}>
            {formatDate(item.startDate)} - {formatDate(item.endDate)}
          </Text>
        </View>

        <View style={styles.detailItem}>
          <Icon
            name={item.mode === 'Virtual' ? 'video' : 'map-marker'}
            size={16}
            color="#666"
          />
          <Text style={styles.detailText}>
            {item.mode}: {item.venue}
          </Text>
        </View>
      </View>

      <View style={styles.eventActions}>
        <TouchableOpacity
          style={styles.eventButton}
          onPress={() =>
            navigation.navigate('EventDetails', {eventId: item.id})
          }>
          <Text style={styles.eventButtonText}>View Details</Text>
        </TouchableOpacity>

        {item.status === 'approved' &&
          user?.id !== item.organizer_id &&
          user?.id !== item.created_by?.id &&
          (registeredEvents.includes(item.id) ? (
            <TouchableOpacity
              style={[styles.eventButton, styles.registeredButton]}
              disabled={true}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Icon name="check-circle" size={14} color="#fff" />
                <Text style={[styles.registeredButtonText, {marginLeft: 5}]}>
                  Registered
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.eventButton, styles.registerButton]}
              onPress={() =>
                navigation.navigate('EventRegistration', {eventId: item.id})
              }>
              <Text style={styles.registerButtonText}>Register</Text>
            </TouchableOpacity>
          ))}
      </View>
    </TouchableOpacity>
  );

  // Add search filtering effect
  useEffect(() => {
    if (events.length > 0) {
      const filtered = events.filter(
        event =>
          event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.venue.toLowerCase().includes(searchTerm.toLowerCase()),
      );
      setFilteredEvents(filtered);
    } else {
      setFilteredEvents([]);
    }
  }, [searchTerm, events]);

  // Add this function before the return statement
  // Replace the existing generateMarkedDates function with this improved version
  const generateMarkedDates = eventsData => {
    const marks = {};

    eventsData.forEach(event => {
      // Skip if no start or end date
      if (!event.startDate || !event.endDate) return;

      // Parse dates carefully to avoid timezone issues
      const startParts = event.startDate.split('T')[0].split('-');
      const endParts = event.endDate.split('T')[0].split('-');

      // Create dates using year, month, day to avoid timezone shifts
      // Note: months are 0-indexed in JavaScript Date
      const start = new Date(
        parseInt(startParts[0]),
        parseInt(startParts[1]) - 1,
        parseInt(startParts[2]),
      );

      const end = new Date(
        parseInt(endParts[0]),
        parseInt(endParts[1]) - 1,
        parseInt(endParts[2]),
      );

      // Generate all dates in the range
      const currentDate = new Date(start);
      while (currentDate <= end) {
        // Format: YYYY-MM-DD
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;

        // Add each date to the marked dates
        marks[dateString] = {
          selected: true,
          selectedColor: '#FFA500', // Light orange color
        };

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });

    // For debugging
    console.log('Marked dates:', Object.keys(marks));

    return marks;
  };

  // Add this useEffect
  useEffect(() => {
    if (events && events.length > 0) {
      try {
        const marks = generateMarkedDates(events);
        setMarkedDates(marks);
      } catch (error) {
        console.error('Error generating marked dates:', error);
        // Fallback to empty object if there's an error
        setMarkedDates({});
      }
    } else {
      setMarkedDates({});
    }
  }, [events]);

  return (
    <SafeAreaView style={[styles.container, {paddingTop: insets.top}]}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>
            {getGreeting()}, {getFormattedName()}
          </Text>
          <Text style={styles.subtitleText}>
            {user?.role === 'doctor'
              ? "Here's your medical education today"
              : user?.role === 'pharma'
              ? 'Here are your upcoming connections'
              : "Here's your overview today"}
          </Text>
        </View>

        {/* Replace the profile icon with this */}
        <TouchableOpacity
          style={styles.profileIconContainer}
          onPress={() => navigation.navigate('Profile')}>
          {profileImage ? (
            <Image
              source={{uri: profileImage}}
              style={styles.profileImage}
            />
          ) : (
            <View style={styles.profileInitialContainer}>
              <Text style={styles.profileInitialText}>
                {user?.name?.charAt(0) || 'U'}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        <View style={styles.statsContainer}>
          {/* Upcoming Conferences Card */}
          <View style={[styles.card, styles.widerCard]}>
            <View style={styles.cardHeader}>
              <Ionicons name="people-outline" size={24} color={'#ffffff'} />
              <Text style={styles.cardTitle}>Upcoming Events</Text>
            </View>
            <Text style={styles.statNumber}>{stats.upcomingEvents}</Text>
            <Text style={styles.statSubtext}>
              {stats.newRegistrations > 0
                ? `+${stats.newRegistrations} registered this week`
                : 'No new registrations this week'}
            </Text>
          </View>

          {/* Meetings This Week Card */}
          <View style={[styles.card, styles.widerCard]}>
            <View style={styles.cardHeader}>
              <Ionicons name="calendar-outline" size={24} color={'#ffffff'} />
              <Text style={styles.cardTitle}>Meetings This Week</Text>
            </View>
            <Text style={styles.statNumber}>{stats.meetingsThisWeek}</Text>
            <Text style={styles.statSubtext}>
              {stats.nextMeetingDays !== null
                ? `Next one in ${stats.nextMeetingDays} day${
                    stats.nextMeetingDays !== 1 ? 's' : ''
                  }`
                : 'No upcoming meetings'}
            </Text>
          </View>

          {/* Available CME Courses Card */}
          {/* <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Icon name="book-open-variant" size={24} color="#ffffff" />
              <Text style={styles.cardTitle}>Available Courses</Text>
            </View>
            <Text style={styles.statNumber}>24</Text>
            <Text style={styles.statSubtext}>5 new courses added</Text>
          </View> */}
        </View>

        {/* Events Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'my' && styles.activeTab]}
            onPress={() => setActiveTab('my')}>
            <Text
              style={[
                styles.tabText,
                activeTab === 'my' && styles.activeTabText,
              ]}>
              My Events
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'ongoing' && styles.activeTab]}
            onPress={() => setActiveTab('ongoing')}>
            <Text
              style={[
                styles.tabText,
                activeTab === 'ongoing' && styles.activeTabText,
              ]}>
              Ongoing Events
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'participated' && styles.activeTab,
            ]}
            onPress={() => setActiveTab('participated')}>
            <Text
              style={[
                styles.tabText,
                activeTab === 'participated' && styles.activeTabText,
              ]}>
              Registered Events
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Icon
              name="magnify"
              size={20}
              color="#666"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder={`Search ${
                activeTab === 'my'
                  ? 'my'
                  : activeTab === 'ongoing'
                  ? 'ongoing'
                  : 'participated'
              } events...`}
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholderTextColor="#999"
            />
            {searchTerm !== '' && (
              <TouchableOpacity onPress={() => setSearchTerm('')}>
                <Icon name="close-circle" size={18} color="#999" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={styles.calendarIconButton}
            onPress={() => setShowCalendar(!showCalendar)}>
            <Icon name="calendar" size={22} color="#2e7af5" />
          </TouchableOpacity>
        </View>

        {/* Event Cards */}
        <View style={styles.eventCardsContainer}>
          {loading && !refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2e7af5" />
              <Text style={styles.loadingText}>Loading events...</Text>
            </View>
          ) : filteredEvents.length === 0 && searchTerm !== '' ? (
            <View style={styles.emptyContainer}>
              <Icon name="magnify-off" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>No Events Found</Text>
              <Text style={styles.emptySubtitle}>
                No events match your search criteria. Please try another term.
              </Text>
            </View>
          ) : events.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="calendar-blank" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>No Events Found</Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === 'my'
                  ? 'Create your first medical event or browse recommended events'
                  : activeTab === 'ongoing'
                  ? 'There are no ongoing events at the moment'
                  : activeTab === 'participated'
                  ? "You haven't registered for any events yet"
                  : "We don't have any recommendations for you yet"}
              </Text>
              {activeTab === 'my' && (
                <TouchableOpacity
                  style={styles.createEventButton}
                  onPress={() => navigation.navigate('CreateConference')}>
                  <Text style={styles.createEventButtonText}>Create Event</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <FlatList
              data={filteredEvents.length > 0 ? filteredEvents : events}
              renderItem={renderEventItem}
              keyExtractor={item => item.id}
              scrollEnabled={false}
              nestedScrollEnabled={true}
            />
          )}
        </View>
      </ScrollView>

      {/* Calendar Overlay */}
      {showCalendar && (
        <View style={styles.calendarOverlay}>
          <View style={styles.calendarContainer}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarTitle}>Event Calendar</Text>
              <TouchableOpacity onPress={() => setShowCalendar(false)}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <Calendar
              markedDates={markedDates}
              hideExtraDays={true}
              enableSwipeMonths={true}
              theme={{
                backgroundColor: '#ffffff',
                calendarBackground: '#ffffff',
                textSectionTitleColor: '#2e7af5',
                selectedDayBackgroundColor: '#FFA500',
                selectedDayTextColor: '#ffffff',
                todayTextColor: '#2e7af5',
                dayTextColor: '#333',
                textDisabledColor: '#d9e1e8',
                dotColor: '#FFA500',
                selectedDotColor: '#ffffff',
                arrowColor: '#2e7af5',
                monthTextColor: '#333',
              }}
            />

            <View style={styles.calendarLegend}>
              <View style={styles.legendItem}>
                <View style={styles.legendDot} />
                <Text style={styles.legendText}>Event Dates</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    overflow: 'hidden',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  profileInitialContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2e7af5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitialText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitleText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 16,
  },
  card: {
    width: '32%',
    backgroundColor: '#2e7af5',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },

  // Add style for wider cards (since we now have 2 instead of 3)
  widerCard: {
    width: '48%', // Make cards take up almost half the width
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
  cardHeader: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
    textAlign: 'center',
  },
  statNumber: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
    textAlign: 'center',
  },
  statSubtext: {
    fontSize: 12,
    color: '#ffffff',
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  tab: {
    marginRight: 16,
    paddingBottom: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#2e7af5',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#2e7af5',
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    padding: 0,
  },
  calendarIconButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: 42,
    height: 42,
  },
  eventCardsContainer: {
    padding: 16,
    paddingBottom: 80,
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
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  eventType: {
    fontSize: 13,
    color: '#2e7af5',
    fontWeight: '500',
    marginBottom: 4,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 8,
    maxWidth: '80%',
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
  eventDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  eventDetails: {
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  eventActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  eventButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  eventButtonText: {
    color: '#2e7af5',
    fontSize: 14,
    fontWeight: '500',
  },
  registerButton: {
    backgroundColor: '#2e7af5',
  },
  registerButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    padding: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    padding: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  createEventButton: {
    backgroundColor: '#2e7af5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createEventButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  brochureTagContainer: {
    marginTop: 4,
    marginBottom: 12,
  },
  brochureTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFF8F8',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  brochureTagText: {
    color: '#e53935',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
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
  calendarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  calendarContainer: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  calendarLegend: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFA500',
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
});

export default HomeScreen;
