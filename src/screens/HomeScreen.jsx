import React, {useState, useEffect, useCallback, useMemo} from 'react';
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
import {Calendar} from 'react-native-calendars';
import api from '../services/api';

// Performance constants
const INITIAL_RENDER_COUNT = 3;
const LOAD_MORE_COUNT = 5;

// Event Status Badge Component (memoized for performance)
const EventStatusBadge = React.memo(({status}) => {
  const badgeConfig = useMemo(() => {
    switch (status) {
      case 'approved':
        return {
          bgColor: '#E8F5E9',
          textColor: '#2E7D32',
          iconName: 'check-circle',
          label: 'Approved',
        };
      case 'rejected':
        return {
          bgColor: '#FFEBEE',
          textColor: '#C62828',
          iconName: 'close-circle',
          label: 'Rejected',
        };
      default:
        return {
          bgColor: '#FFF3E0',
          textColor: '#E65100',
          iconName: 'clock-outline',
          label: 'Pending',
        };
    }
  }, [status]);

  return (
    <View style={[styles.badge, {backgroundColor: badgeConfig.bgColor}]}>
      <Icon
        name={badgeConfig.iconName}
        size={12}
        color={badgeConfig.textColor}
        style={{marginRight: 4}}
      />
      <Text style={[styles.badgeText, {color: badgeConfig.textColor}]}>
        {badgeConfig.label}
      </Text>
    </View>
  );
});

const HomeScreen = ({navigation}) => {
  const {user} = useAuth();
  const insets = useSafeAreaInsets();

  // Performance optimization states
  const [initialRenderComplete, setInitialRenderComplete] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Core states
  const [registeredEvents, setRegisteredEvents] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('my');

  // Optimized states
  const [allEventsData, setAllEventsData] = useState({
    myEvents: [],
    ongoingEvents: [],
    registeredEvents: [],
  });

  const [stats, setStats] = useState({
    upcomingEvents: 0,
    newRegistrations: 0,
    meetingsThisWeek: 0,
    nextMeetingDays: null,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [markedDates, setMarkedDates] = useState({});
  const [profileImage, setProfileImage] = useState(user?.avatar_url || null);

  // Memoized greeting and name to avoid recalculation
  const greeting = useMemo(() => {
    const hours = new Date().getHours();
    if (hours < 12) return 'Good Morning';
    if (hours < 18) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  const formattedName = useMemo(() => {
    if (!user) return 'User';
    const firstName = user.name.split(' ')[0];
    return user.role === 'doctor' ? `Dr. ${firstName}` : firstName;
  }, [user]);

  // Optimized events to display
  const eventsToDisplay = useMemo(() => {
    const dataToShow = filteredEvents.length > 0 ? filteredEvents : events;
    if (!initialRenderComplete) {
      return dataToShow.slice(0, INITIAL_RENDER_COUNT);
    }
    return dataToShow;
  }, [filteredEvents, events, initialRenderComplete]);

  // Memoized stats calculation
  const calculateStats = useCallback((allEventsData) => {
    const now = new Date();
    const allEvents = [
      ...allEventsData.myEvents,
      ...allEventsData.ongoingEvents,
      ...allEventsData.registeredEvents,
    ];

    // Remove duplicates efficiently
    const uniqueEvents = allEvents.filter((event, index, self) => 
      index === self.findIndex(e => e.id === event.id)
    );

    const upcoming = uniqueEvents.filter(
      event => new Date(event.endDate) >= now,
    );

    const oneWeekFromNow = new Date(now);
    oneWeekFromNow.setDate(now.getDate() + 7);

    const thisWeekMeetings = upcoming.filter(
      event => new Date(event.startDate) <= oneWeekFromNow,
    );

    const nextMeeting = upcoming.sort(
      (a, b) => new Date(a.startDate) - new Date(b.startDate),
    )[0];

    let nextMeetingDays = null;
    if (nextMeeting) {
      const diffTime = Math.abs(new Date(nextMeeting.startDate) - now);
      nextMeetingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    const newRegistrations = Math.min(upcoming.length, 2);

    setStats({
      upcomingEvents: upcoming.length,
      newRegistrations,
      meetingsThisWeek: thisWeekMeetings.length,
      nextMeetingDays,
    });
  }, []);

  // Optimized fetch functions with priority loading
  const fetchRegisteredEvents = useCallback(async () => {
    try {
      const data = await eventService.getRegisteredEvents();
      setRegisteredEvents(data.map(event => event.id));
    } catch (error) {
      console.error('Failed to fetch registered events:', error);
    }
  }, []);

  const fetchProfileImage = useCallback(async () => {
    try {
      const response = await api.get(`/users/profile-image`);
      if (response.data?.avatar_url) {
        setProfileImage(response.data.avatar_url);
      }
    } catch (error) {
      console.log('Could not fetch profile image:', error);
    }
  }, []);

  // Fast initial fetch with minimal data
  const fetchEventsQuick = useCallback(async () => {
    try {
      setLoading(true);
      let data;

      switch (activeTab) {
        case 'my':
          data = await eventService.getMyEvents();
          break;
        case 'ongoing':
          data = await eventService.getOngoingEvents();
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          data = data.filter(event => {
            const startDate = new Date(event.startDate);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(event.endDate);
            endDate.setHours(23, 59, 59, 999);
            return startDate <= today && endDate >= today;
          });
          break;
        case 'participated':
          data = await eventService.getRegisteredEvents();
          data = data.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
          break;
        default:
          data = await eventService.getMyEvents();
      }

      // Set events immediately without brochures for fast initial render
      setEvents(data);
      setLoading(false);

      // Load brochures in background for first few events only
      if (data.length > 0) {
        const priorityEvents = data.slice(0, INITIAL_RENDER_COUNT);
        const eventsWithBrochures = await Promise.all(
          priorityEvents.map(async (event, index) => {
            try {
              // Add delay to prevent overwhelming the server
              if (index > 0) {
                await new Promise(resolve => setTimeout(resolve, 100 * index));
              }
              const brochureData = await eventService.getEventBrochure(event.id);
              return {...event, brochure: brochureData};
            } catch (error) {
              return event;
            }
          })
        );

        // Update only the first few events with brochures
        setEvents(prevEvents => {
          const updated = [...prevEvents];
          eventsWithBrochures.forEach((eventWithBrochure, index) => {
            if (updated[index]) {
              updated[index] = eventWithBrochure;
            }
          });
          return updated;
        });
      }
    } catch (error) {
      console.error('Failed to load events:', error);
      setLoading(false);
    } finally {
      setRefreshing(false);
    }
  }, [activeTab]);

  // Background fetch for remaining data
  const fetchAllEventsDataBackground = useCallback(async () => {
    try {
      const [myEventsData, ongoingEventsData, registeredEventsData] =
        await Promise.all([
          eventService.getMyEvents(),
          eventService.getOngoingEvents(),
          eventService.getRegisteredEvents(),
        ]);

      setAllEventsData({
        myEvents: myEventsData,
        ongoingEvents: ongoingEventsData,
        registeredEvents: registeredEventsData,
      });
    } catch (error) {
      console.error('Failed to load all events data:', error);
    }
  }, []);

  // Optimized marked dates generation
  const generateMarkedDates = useCallback((allEvents) => {
    const marks = {};
    const colors = {
      myEvents: '#2e7af5',
      ongoingEvents: '#4CAF50',
      registeredEvents: '#FF9800'
    };

    Object.keys(allEvents).forEach(category => {
      const eventsArray = allEvents[category];
      const color = colors[category];

      eventsArray.forEach(event => {
        if (!event.startDate || !event.endDate) return;

        try {
          const startParts = event.startDate.split('T')[0].split('-');
          const endParts = event.endDate.split('T')[0].split('-');

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

          const currentDate = new Date(start);
          while (currentDate <= end) {
            const dateString = currentDate.toISOString().split('T')[0];

            if (!marks[dateString]) {
              marks[dateString] = {
                dots: [{ color, key: category }],
                selected: true,
                selectedColor: color
              };
            } else if (!marks[dateString].dots.some(dot => dot.color === color)) {
              marks[dateString].dots.push({ color, key: category });
            }

            currentDate.setDate(currentDate.getDate() + 1);
          }
        } catch (error) {
          console.error('Error processing event date:', error);
        }
      });
    });

    return marks;
  }, []);

  // Memoized renderEventItem
  const renderEventItem = useCallback(({item}) => (
    <TouchableOpacity
      style={styles.eventCard}
      onPress={() => navigation.navigate('EventDetails', {eventId: item.id})}>
      <View style={styles.eventHeader}>
        <View style={styles.eventHeaderText}>
          <Text style={styles.eventType}>{item.type}</Text>
          <Text style={styles.eventTitle} numberOfLines={1}>{item.title}</Text>
        </View>
        <EventStatusBadge status={item.status} />
      </View>

      {item.brochure && (
        <View style={styles.brochureTagContainer}>
          <TouchableOpacity
            style={styles.brochureTag}
            onPress={() => navigation.navigate('EventDetails', {eventId: item.id})}>
            <Icon name="file-pdf-box" size={16} color="#e53935" />
            <Text style={styles.brochureTagText}>View Brochure</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.eventDescription} numberOfLines={2}>
        {item.description}
      </Text>

      <View style={styles.eventDetails}>
        <View style={styles.detailItem}>
          <Icon name="calendar-range" size={14} color="#666" />
          <Text style={styles.detailText} numberOfLines={1}>
            {new Date(item.startDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })} - {new Date(item.endDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </Text>
        </View>

        <View style={styles.detailItem}>
          <Icon
            name={item.mode === 'Virtual' ? 'video' : 'map-marker'}
            size={14}
            color="#666"
          />
          <Text style={styles.detailText} numberOfLines={1}>
            {item.mode}: {item.venue}
          </Text>
        </View>
      </View>

      <View style={styles.eventActions}>
        <TouchableOpacity
          style={styles.eventButton}
          onPress={() => navigation.navigate('EventDetails', {eventId: item.id})}>
          <Text style={styles.eventButtonText}>View Details</Text>
        </TouchableOpacity>

        {item.status === 'approved' &&
          user?.id !== item.organizer_id &&
          user?.id !== item.created_by?.id &&
          (registeredEvents.includes(item.id) ? (
            <View style={[styles.eventButton, styles.registeredButton]}>
              <Icon name="check-circle" size={12} color="#fff" />
              <Text style={styles.registeredButtonText}>Registered</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.eventButton, styles.registerButton]}
              onPress={() => navigation.navigate('EventRegistration', {eventId: item.id})}>
              <Text style={styles.registerButtonText}>Register</Text>
            </TouchableOpacity>
          ))}
      </View>
    </TouchableOpacity>
  ), [navigation, user, registeredEvents]);

  // Load more functionality
  const handleLoadMore = useCallback(() => {
    if (!initialRenderComplete) {
      setInitialRenderComplete(true);
    }
  }, [initialRenderComplete]);

  // Effects with optimizations
  useEffect(() => {
    calculateStats(allEventsData);
  }, [allEventsData, calculateStats]);

  useEffect(() => {
    if (events.length > 0) {
      const filtered = events.filter(event =>
        event.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.venue?.toLowerCase().includes(searchTerm.toLowerCase()),
      );
      setFilteredEvents(filtered);
    } else {
      setFilteredEvents([]);
    }
  }, [searchTerm, events]);

  useEffect(() => {
    if (
      allEventsData.myEvents.length > 0 ||
      allEventsData.ongoingEvents.length > 0 ||
      allEventsData.registeredEvents.length > 0
    ) {
      const marks = generateMarkedDates(allEventsData);
      setMarkedDates(marks);
    }
  }, [allEventsData, generateMarkedDates]);

  // Initial load effect
  useEffect(() => {
    const loadInitialData = async () => {
      // Load critical data first
      await Promise.all([
        fetchEventsQuick(),
        fetchRegisteredEvents(),
      ]);

      // Load profile image and background data
      setTimeout(() => {
        if (user) fetchProfileImage();
        fetchAllEventsDataBackground();
      }, 500);

      // Mark initial render complete
      setTimeout(() => {
        setInitialRenderComplete(true);
      }, 1000);
    };

    loadInitialData();

    const unsubscribe = navigation.addListener('focus', () => {
      fetchEventsQuick();
      fetchRegisteredEvents();
    });

    return unsubscribe;
  }, [navigation, activeTab, fetchEventsQuick, fetchRegisteredEvents, fetchProfileImage, fetchAllEventsDataBackground, user]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([
      fetchEventsQuick(),
      fetchRegisteredEvents(),
      fetchAllEventsDataBackground()
    ]);
  }, [fetchEventsQuick, fetchRegisteredEvents, fetchAllEventsDataBackground]);

  return (
    <SafeAreaView style={[styles.container, {paddingTop: insets.top}]}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>
            {greeting}, {formattedName}
          </Text>
          <Text style={styles.subtitleText}>
            {user?.role === 'doctor'
              ? "Here's your medical education today"
              : user?.role === 'pharma'
              ? 'Here are your upcoming connections'
              : "Here's your overview today"}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.profileIconContainer}
          onPress={() => navigation.navigate('Profile')}>
          {profileImage ? (
            <Image source={{uri: profileImage}} style={styles.profileImage} />
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
        }
        showsVerticalScrollIndicator={false}>
        
        <View style={styles.statsContainer}>
          <View style={[styles.card, styles.widerCard]}>
            <View style={styles.cardHeader}>
              <Ionicons name="people-outline" size={24} color="#ffffff" />
              <Text style={styles.cardTitle}>Upcoming Events</Text>
            </View>
            <Text style={styles.statNumber}>{stats.upcomingEvents}</Text>
            <Text style={styles.statSubtext}>
              {stats.newRegistrations > 0
                ? `+${stats.newRegistrations} registered this week`
                : 'No new registrations this week'}
            </Text>
          </View>

          <View style={[styles.card, styles.widerCard]}>
            <View style={styles.cardHeader}>
              <Ionicons name="calendar-outline" size={24} color="#ffffff" />
              <Text style={styles.cardTitle}>Events This Week</Text>
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
        </View>

        {/* Events Tabs */}
        <View style={styles.tabContainer}>
          {['my', 'ongoing', 'participated'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}>
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab === 'my' ? 'My Events' : 
                 tab === 'ongoing' ? 'Ongoing Events' : 'Registered Events'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Icon name="magnify" size={18} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={`Search ${activeTab} events...`}
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholderTextColor="#999"
            />
            {searchTerm !== '' && (
              <TouchableOpacity onPress={() => setSearchTerm('')}>
                <Icon name="close-circle" size={16} color="#999" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={styles.calendarIconButton}
            onPress={() => setShowCalendar(!showCalendar)}>
            <Icon name="calendar" size={20} color="#2e7af5" />
          </TouchableOpacity>
        </View>

        {/* Event Cards */}
        <View style={styles.eventCardsContainer}>
          {loading && !refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2e7af5" />
              <Text style={styles.loadingText}>Loading events...</Text>
            </View>
          ) : eventsToDisplay.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="calendar-blank" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>No Events Found</Text>
              <Text style={styles.emptySubtitle}>
                {searchTerm !== '' 
                  ? 'No events match your search criteria.'
                  : activeTab === 'my'
                  ? 'Create your first medical event'
                  : activeTab === 'ongoing'
                  ? 'No ongoing events at the moment'
                  : "You haven't registered for any events yet"}
              </Text>
              {activeTab === 'my' && searchTerm === '' && (
                <TouchableOpacity
                  style={styles.createEventButton}
                  onPress={() => navigation.navigate('CreateConference')}>
                  <Text style={styles.createEventButtonText}>Create Event</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <FlatList
              data={eventsToDisplay}
              renderItem={renderEventItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              nestedScrollEnabled={false}
              initialNumToRender={INITIAL_RENDER_COUNT}
              maxToRenderPerBatch={3}
              windowSize={5}
              updateCellsBatchingPeriod={50}
              removeClippedSubviews={true}
              getItemLayout={(data, index) => ({
                length: 250,
                offset: 250 * index,
                index,
              })}
              ListFooterComponent={() => {
                const totalEvents = filteredEvents.length > 0 ? filteredEvents : events;
                if (!initialRenderComplete && totalEvents.length > INITIAL_RENDER_COUNT) {
                  return (
                    <TouchableOpacity style={styles.loadMoreButton} onPress={handleLoadMore}>
                      <Text style={styles.loadMoreButtonText}>
                        Load {totalEvents.length - INITIAL_RENDER_COUNT} more events
                      </Text>
                    </TouchableOpacity>
                  );
                }
                return null;
              }}
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
              markingType="multi-dot"
              markedDates={markedDates}
              hideExtraDays={true}
              enableSwipeMonths={true}
              theme={{
                backgroundColor: '#ffffff',
                calendarBackground: '#ffffff',
                textSectionTitleColor: '#2e7af5',
                selectedDayBackgroundColor: '#2e7af5',
                selectedDayTextColor: '#ffffff',
                todayTextColor: '#2e7af5',
                dayTextColor: '#333',
                textDisabledColor: '#d9e1e8',
                dotColor: '#2e7af5',
                selectedDotColor: '#ffffff',
                arrowColor: '#2e7af5',
                monthTextColor: '#333',
              }}
            />

            <View style={styles.calendarLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, {backgroundColor: '#2e7af5'}]} />
                <Text style={styles.legendText}>My Events</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, {backgroundColor: '#4CAF50'}]} />
                <Text style={styles.legendText}>Ongoing Events</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, {backgroundColor: '#FF9800'}]} />
                <Text style={styles.legendText}>Registered Events</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

// Update styles for better performance
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
    justifyContent: 'space-between',
    padding: 16,
  },
  card: {
    backgroundColor: '#2e7af5',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  widerCard: {
    width: '48%',
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
  eventHeaderText: {
    flex: 1,
    marginRight: 8,
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
  brochureTagContainer: {
    marginBottom: 8,
  },
  brochureTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFF8F8',
    borderRadius: 16,
    paddingHorizontal: 8,
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
    marginBottom: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  eventActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  registerButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  registeredButton: {
    backgroundColor: '#4caf50',
    flexDirection: 'row',
    alignItems: 'center',
  },
  registeredButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
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
  loadMoreButton: {
    backgroundColor: '#2e7af5',
    marginHorizontal: 16,
    marginVertical: 10,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  loadMoreButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
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
    justifyContent: 'space-around',
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
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
});

export default HomeScreen;
