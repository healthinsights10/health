import React, {useState, useEffect, useCallback, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  FlatList,
  StatusBar,
  Platform,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AntDesignIcon from 'react-native-vector-icons/AntDesign';
import {Calendar} from 'react-native-calendars';
import {eventService} from '../services/api';
import {useAuth} from '../context/AuthContext';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const ConferencesScreen = ({navigation}) => {
  const {user} = useAuth();
  const insets = useSafeAreaInsets();

  // Performance constants
  const INITIAL_RENDER_COUNT = 4;
  const LOAD_MORE_COUNT = 6;

  // Performance optimization states
  const [initialRenderComplete, setInitialRenderComplete] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Core states
  const [activeTab, setActiveTab] = useState('All Events');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [registeredEvents, setRegisteredEvents] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // Memoized date and time formatters
  const formatDate = useCallback((dateString) => {
    const options = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
  }, []);

  const formatTime = useCallback((timeString) => {
    if (!timeString) return '';
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }, []);

  // Memoized event dates renderer
  const renderEventDates = useCallback((event, eventDays = []) => {
    if (eventDays && eventDays.length > 1) {
      return (
        <View style={styles.multiDayContainer}>
          <View style={styles.eventDetailItem}>
            <Icon name="calendar-range" size={16} color="#666" />
            <Text style={styles.eventDetailText}>
              {eventDays.length} Days: {formatDate(eventDays[0].date)} -{' '}
              {formatDate(eventDays[eventDays.length - 1].date)}
            </Text>
          </View>

          {eventDays.slice(0, 2).map((day) => (
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
  }, [formatDate, formatTime]);

  // Optimized fetch functions
  const fetchEventsQuick = useCallback(async () => {
    try {
      setLoading(true);
      const data = await eventService.getAllEvents();

      // Sort and filter out past events immediately
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const upcomingEvents = data
        .filter(event => new Date(event.start_date) >= today)
        .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

      // Set events immediately without brochures for fast initial render
      setEvents(upcomingEvents);
      setLoading(false);

      // Load additional data for first few events only
      if (upcomingEvents.length > 0) {
        const priorityEvents = upcomingEvents.slice(0, INITIAL_RENDER_COUNT);
        
        // Load brochures and event days progressively
        const eventsWithAdditionalData = await Promise.all(
          priorityEvents.map(async (event, index) => {
            try {
              // Add staggered delay to prevent server overload
              if (index > 0) {
                await new Promise(resolve => setTimeout(resolve, 100 * index));
              }

              const [brochureData, eventDays] = await Promise.all([
                eventService.getEventBrochure(event.id).catch(() => null),
                eventService.getEventDays(event.id).catch(() => [])
              ]);

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
          })
        );

        // Update only the first few events with additional data
        setEvents(prevEvents => {
          const updated = [...prevEvents];
          eventsWithAdditionalData.forEach((eventWithData, index) => {
            if (updated[index]) {
              updated[index] = eventWithData;
            }
          });
          return updated;
        });
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
      Alert.alert('Error', 'Failed to load events.');
      setLoading(false);
    }
  }, []);

  // Background fetch for remaining events
  const loadRemainingEventsData = useCallback(async () => {
    if (events.length <= INITIAL_RENDER_COUNT) return;

    try {
      const remainingEvents = events.slice(INITIAL_RENDER_COUNT);
      
      const eventsWithAdditionalData = await Promise.all(
        remainingEvents.map(async (event, index) => {
          try {
            // Longer delay for background loading
            await new Promise(resolve => setTimeout(resolve, 200 * index));

            const [brochureData, eventDays] = await Promise.all([
              eventService.getEventBrochure(event.id).catch(() => null),
              eventService.getEventDays(event.id).catch(() => [])
            ]);

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
        })
      );

      // Update remaining events
      setEvents(prevEvents => {
        const updated = [...prevEvents];
        eventsWithAdditionalData.forEach((eventWithData, index) => {
          const targetIndex = INITIAL_RENDER_COUNT + index;
          if (updated[targetIndex]) {
            updated[targetIndex] = eventWithData;
          }
        });
        return updated;
      });
    } catch (error) {
      console.error('Error loading remaining events data:', error);
    }
  }, [events.length]);

  const fetchRegisteredEvents = useCallback(async () => {
    try {
      const data = await eventService.getRegisteredEvents();
      setRegisteredEvents(data.map(event => event.id));
    } catch (error) {
      console.error('Failed to fetch registered events:', error);
    }
  }, []);

  // Optimized filtering with useMemo - FIXED for multi-day events
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      // Filter based on active tab
      if (activeTab === 'Conferences' && event.type !== 'Conference') {
        return false;
      }

      if (activeTab === 'Meetings' && event.type !== 'Meeting') {
        return false;
      }

      // Filter based on search query
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

      // Filter based on selected date - FIXED for multi-day events
      if (selectedDate) {
        const searchDate = new Date(selectedDate);
        searchDate.setHours(0, 0, 0, 0);
        
        // Check if event has eventDays (multi-day event)
        if (event.eventDays && event.eventDays.length > 0) {
          // For multi-day events, check if selected date falls within any event day
          const isDateInEventDays = event.eventDays.some(day => {
            const dayDate = new Date(day.date);
            dayDate.setHours(0, 0, 0, 0);
            return dayDate.getTime() === searchDate.getTime();
          });
          
          if (!isDateInEventDays) {
            return false;
          }
        } else {
          // For single-day events, check if selected date falls within start_date and end_date
          const eventStartDate = new Date(event.start_date);
          eventStartDate.setHours(0, 0, 0, 0);
          const eventEndDate = new Date(event.end_date);
          eventEndDate.setHours(0, 0, 0, 0);

          // Check if selected date is within the event's date range
          if (searchDate.getTime() < eventStartDate.getTime() || 
              searchDate.getTime() > eventEndDate.getTime()) {
            return false;
          }
        }
      }

      return true;
    });
  }, [events, activeTab, searchQuery, selectedDate]);

  // Events to display with progressive loading
  const eventsToDisplay = useMemo(() => {
    if (!initialRenderComplete) {
      return filteredEvents.slice(0, INITIAL_RENDER_COUNT);
    }
    return filteredEvents;
  }, [filteredEvents, initialRenderComplete]);

  // Memoized event card renderer
  const renderEventCard = useCallback(({item: event}) => (
    <View style={styles.eventCard}>
      {/* Brochure Preview */}
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

      <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>
      <Text style={styles.eventDescription} numberOfLines={3}>{event.description}</Text>

      <View style={styles.eventDetails}>
        {renderEventDates(event, event.eventDays)}

        <View style={styles.eventDetailItem}>
          <Icon
            name={event.mode === 'Virtual' ? 'video' : 'map-marker'}
            size={16}
            color="#666"
          />
          <Text style={styles.eventDetailText} numberOfLines={1}>
            {event.mode === 'Virtual' ? 'Virtual Event' : event.venue}
          </Text>
        </View>
        <View style={styles.eventDetailItem}>
          <Icon name="account-group" size={16} color="#666" />
          <Text style={styles.eventDetailText} numberOfLines={1}>{event.organizer_name}</Text>
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

        {user?.id !== event.organizer_id &&
          (registeredEvents.includes(event.id) ? (
            <View style={[styles.eventButton, styles.registeredButton]}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <AntDesignIcon name="checkcircle" size={14} color="#fff" />
                <Text style={[styles.registeredButtonText, {marginLeft: 5}]}>
                  Registered
                </Text>
              </View>
            </View>
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
  ), [navigation, user, registeredEvents, renderEventDates]);

  // Load more functionality
  const handleLoadMore = useCallback(() => {
    if (!initialRenderComplete) {
      setInitialRenderComplete(true);
      // Start loading remaining events data in background
      setTimeout(() => {
        loadRemainingEventsData();
      }, 500);
    }
  }, [initialRenderComplete, loadRemainingEventsData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchEventsQuick(), fetchRegisteredEvents()]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [fetchEventsQuick, fetchRegisteredEvents]);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedDate('');
    setActiveTab('All Events');
  }, []);

  // Effects
  useEffect(() => {
    const loadInitialData = async () => {
      await Promise.all([
        fetchEventsQuick(),
        fetchRegisteredEvents(),
      ]);

      // Mark initial render complete after a delay
      setTimeout(() => {
        setInitialRenderComplete(true);
        // Start loading remaining data
        loadRemainingEventsData();
      }, 1000);
    };

    loadInitialData();

    const unsubscribe = navigation.addListener('focus', () => {
      fetchEventsQuick();
      fetchRegisteredEvents();
    });

    return unsubscribe;
  }, [navigation, fetchEventsQuick, fetchRegisteredEvents, loadRemainingEventsData]);

  return (
    <SafeAreaView style={[styles.container, {paddingTop: insets.top}]}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <View style={styles.headerLeftContent}>
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
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2e7af5" />
          <Text style={styles.loadingText}>Loading events...</Text>
        </View>
      ) : filteredEvents.length === 0 ? (
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
      ) : (
        <FlatList
          data={eventsToDisplay}
          renderItem={renderEventCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.eventsContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          // Performance optimizations
          initialNumToRender={INITIAL_RENDER_COUNT}
          maxToRenderPerBatch={4}
          windowSize={8}
          updateCellsBatchingPeriod={50}
          removeClippedSubviews={true}
          getItemLayout={(data, index) => ({
            length: 280, // Approximate height of event card
            offset: 280 * index,
            index,
          })}
          // Load more functionality
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={() => {
            if (isLoadingMore && initialRenderComplete) {
              return (
                <View style={styles.loadingMoreContainer}>
                  <ActivityIndicator size="small" color="#2e7af5" />
                  <Text style={styles.loadingMoreText}>Loading more events...</Text>
                </View>
              );
            }
            if (!initialRenderComplete && filteredEvents.length > INITIAL_RENDER_COUNT) {
              return (
                <TouchableOpacity
                  style={styles.loadMoreButton}
                  onPress={handleLoadMore}>
                  <Text style={styles.loadMoreButtonText}>
                    Load {filteredEvents.length - INITIAL_RENDER_COUNT} more events
                  </Text>
                </TouchableOpacity>
              );
            }
            return null;
          }}
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
    padding: 20,
    paddingBottom: 0,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
  },
  headerLeftContent: {
    flex: 1,
    paddingRight: 12, // Add spacing between title and button
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
    paddingHorizontal: 12, // Reduced padding
    paddingVertical: 8,    // Reduced padding
    minWidth: 80,          // Ensure minimum width
    justifyContent: 'center',
  },
  createButtonText: {
    color: 'white',
    fontWeight: '500',
    marginLeft: 4,        // Reduced margin
    fontSize: 14,         // Slightly smaller font
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  eventsContainer: {
    padding: 20,
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
    flex: 1,
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
  loadingMoreContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingMoreText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  loadMoreButton: {
    backgroundColor: '#2e7af5',
    marginHorizontal: 20,
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
});

export default ConferencesScreen;
