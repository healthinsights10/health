import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {adminService} from '../../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const EventRegistrationsScreen = ({route, navigation}) => {
  const {eventId} = route.params;
  const [event, setEvent] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [filteredRegistrations, setFilteredRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'doctors', 'pharma'
  const [exporting, setExporting] = useState(false);
  const insets = useSafeAreaInsets();
  useEffect(() => {
    fetchEventDetails();
    fetchRegistrations();
  }, [eventId]);

  // Apply filter whenever registrations or active filter changes
  useEffect(() => {
    applyFilter(activeFilter);
  }, [registrations, activeFilter]);

  const fetchEventDetails = async () => {
    try {
      const data = await adminService.getEventById(eventId);
      setEvent(data);
    } catch (error) {
      console.error('Failed to fetch event details:', error);
      Alert.alert('Error', 'Failed to load event details');
    }
  };

  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      const data = await adminService.getEventRegistrations(eventId);
      setRegistrations(data);
    } catch (error) {
      console.error('Failed to fetch registrations:', error);
      Alert.alert('Error', 'Failed to load registration data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilter = filter => {
    switch (filter) {
      case 'pharma':
        // Filter registrations where user.role is 'pharma'
        setFilteredRegistrations(
          registrations.filter(reg => reg.user?.role === 'pharma'),
        );
        break;
      case 'doctors':
        // Filter registrations where user.role is 'doctor'
        setFilteredRegistrations(
          registrations.filter(reg => reg.user?.role === 'doctor'),
        );
        break;
      case 'all':
      default:
        setFilteredRegistrations(registrations);
        break;
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchRegistrations();
  };

  const handleCancelRegistration = userId => {
    Alert.alert(
      'Cancel Registration',
      'Are you sure you want to cancel this registration?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Yes, Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminService.cancelEventRegistration(eventId, userId);
              Alert.alert('Success', 'Registration has been cancelled');
              // Refresh the registrations list
              fetchRegistrations();
            } catch (error) {
              console.error('Failed to cancel registration:', error);
              Alert.alert('Error', 'Failed to cancel registration');
            }
          },
        },
      ],
    );
  };

  const handleExportRegistrations = async () => {
    try {
      setExporting(true); // Add this state if you don't have it
      console.log('📧 Starting export process...');
      
      const result = await adminService.exportEventRegistrations(eventId);
      
      console.log('✅ Export successful:', result);
      
      Alert.alert(
        'Export Successful! 📧', 
        `Registration data for ${result.count} attendees has been sent to ${result.sentTo}.\n\nFile: ${result.filename}\n\nPlease check your email inbox (and spam folder if needed).`,
        [
          {
            text: 'OK',
            onPress: () => console.log('✅ Export email notification acknowledged')
          }
        ]
      );
    } catch (error) {
      console.error('❌ Export failed:', error);
      
      let errorMessage = 'Failed to export registration data. Please try again.';
      if (error.response?.status === 404) {
        errorMessage = 'Event not found or no registrations available.';
      } else if (error.message.includes('Network')) {
        errorMessage = 'Network error. Please check your connection.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error. Please contact support if this persists.';
      }

      Alert.alert(
        'Export Failed', 
        errorMessage,
        [
          {
            text: 'Retry',
            onPress: handleExportRegistrations
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]
      );
    } finally {
      setExporting(false);
    }
  };

  const formatDate = dateString => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderRegistrationItem = ({item}) => (
    <View style={styles.registrationCard}>
      <View style={styles.userDetails}>
        <View style={styles.userHeader}>
          <Text style={styles.userName}>{item.user?.name}</Text>
          <View 
            style={[
              styles.roleBadge, 
              {
                backgroundColor: 
                  item.user?.role === 'doctor' ? '#E1F5FE' : 
                  item.user?.role === 'pharma' ? '#FFF8E1' : 
                  '#E8F5E9'
              }
            ]}
          >
            <Icon 
              name={
                item.user?.role === 'doctor' ? 'doctor' : 
                item.user?.role === 'pharma' ? 'pill' : 
                'account'
              } 
              size={14} 
              color={
                item.user?.role === 'doctor' ? '#0288D1' : 
                item.user?.role === 'pharma' ? '#F9A825' : 
                '#4CAF50'
              } 
            />
            <Text 
              style={[
                styles.roleBadgeText,
                {
                  color: 
                    item.user?.role === 'doctor' ? '#0288D1' : 
                    item.user?.role === 'pharma' ? '#F9A825' : 
                    '#4CAF50'
                }
              ]}
            >
              {item.user?.role === 'doctor' ? 'Doctor' : 
               item.user?.role === 'pharma' ? 'Pharma' : 
               'User'}
            </Text>
          </View>
        </View>
        <Text style={styles.userEmail}>{item.user?.email}</Text>
        {item.user?.phone && (
          <Text style={styles.userPhone}>{item.user.phone}</Text>
        )}
      </View>

      <View style={styles.registrationDetails}>
        <View style={styles.detailRow}>
          <Icon name="clock-outline" size={16} color="#666" />
          <Text style={styles.detailText}>
            Registered: {formatDate(item.registered_at)}
          </Text>
        </View>

        {item.company_name && (
          <View style={styles.detailRow}>
            <Icon name="domain" size={16} color="#666" />
            <Text style={styles.detailText}>Company: {item.company_name}</Text>
          </View>
        )}

        {item.user?.company && (
          <View style={styles.detailRow}>
            <Icon name="domain" size={16} color="#666" />
            <Text style={styles.detailText}>
              Organization: {item.user.company}
            </Text>
          </View>
        )}

        {item.user?.role === 'doctor' && item.user?.specialization && (
          <View style={styles.detailRow}>
            <Icon name="stethoscope" size={16} color="#666" />
            <Text style={styles.detailText}>
              Specialization: {item.user.specialization}
            </Text>
          </View>
        )}
      </View>

      {item.additionalNotes && (
        <View style={styles.notes}>
          <Text style={styles.notesLabel}>Notes:</Text>
          <Text style={styles.notesText}>{item.additionalNotes}</Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => handleCancelRegistration(item.user.id)}>
        <Text style={styles.cancelButtonText}>Cancel Registration</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2e7af5" />
        <Text style={styles.loadingText}>Loading registrations...</Text>
      </View>
    );
  }

  // Get counts for each type of registration
  const doctorCount = registrations.filter(
    reg => reg.user?.role === 'doctor',
  ).length;
  const pharmaCount = registrations.filter(
    reg => reg.user?.role === 'pharma',
  ).length;

  return (
    <SafeAreaView style={[styles.container, {paddingTop: insets.top}]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f7f9fc" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Event Registrations</Text>
        <View style={{width: 24}} />
      </View>

      {event && (
        <View style={styles.eventInfoCard}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          <View style={styles.eventDetail}>
            <Icon name="calendar" size={16} color="#666" />
            <Text style={styles.eventDetailText}>
              {formatDate(event.startDate)} - {formatDate(event.endDate)}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{registrations.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{doctorCount}</Text>
          <Text style={styles.statLabel}>Doctors</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{pharmaCount}</Text>
          <Text style={styles.statLabel}>Pharma</Text>
        </View>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterTabs}>
        <TouchableOpacity
          style={[
            styles.filterTab,
            activeFilter === 'all' && styles.filterTabActive,
          ]}
          onPress={() => setActiveFilter('all')}>
          <Text
            style={[
              styles.filterTabText,
              activeFilter === 'all' && styles.filterTabTextActive,
            ]}>
            All ({registrations.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterTab,
            activeFilter === 'doctors' && styles.filterTabActive,
          ]}
          onPress={() => setActiveFilter('doctors')}>
          <View style={styles.filterTabContent}>
            <Icon
              name="doctor"
              size={16}
              color={activeFilter === 'doctors' ? '#2e7af5' : '#666'}
              style={styles.filterTabIcon}
            />
            <Text
              style={[
                styles.filterTabText,
                activeFilter === 'doctors' && styles.filterTabTextActive,
              ]}>
              Doctors ({doctorCount})
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterTab,
            activeFilter === 'pharma' && styles.filterTabActive,
          ]}
          onPress={() => setActiveFilter('pharma')}>
          <View style={styles.filterTabContent}>
            <Icon
              name="pill"
              size={16}
              color={activeFilter === 'pharma' ? '#2e7af5' : '#666'}
              style={styles.filterTabIcon}
            />
            <Text
              style={[
                styles.filterTabText,
                activeFilter === 'pharma' && styles.filterTabTextActive,
              ]}>
              Pharma ({pharmaCount})
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.exportButton, exporting && styles.exportButtonDisabled]}
          onPress={handleExportRegistrations}
          disabled={exporting}>
          {exporting ? (
            <>
              <ActivityIndicator size="small" color="#2e7af5" />
              <Text style={[styles.exportButtonText, {marginLeft: 8}]}>Sending Email...</Text>
            </>
          ) : (
            <>
              <Icon name="email-send" size={18} color="#2e7af5" />
              <Text style={styles.exportButtonText}>Email Export</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredRegistrations}
        renderItem={renderRegistrationItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon
              name={
                activeFilter === 'doctors'
                  ? 'doctor'
                  : activeFilter === 'pharma'
                  ? 'pill'
                  : 'account-group-outline'
              }
              size={64}
              color="#ccc"
            />
            <Text style={styles.emptyTitle}>
              No {activeFilter !== 'all' ? activeFilter : ''} Registrations
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeFilter === 'doctors'
                ? 'No doctors have registered for this event yet.'
                : activeFilter === 'pharma'
                ? 'No pharmaceutical representatives have registered for this event yet.'
                : "This event doesn't have any registrations yet."}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9fc',
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
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
  eventInfoCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  eventDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventDetailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  statsRow: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginRight: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  // Filter tabs styles
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  filterTabActive: {
    borderBottomColor: '#2e7af5',
  },
  filterTabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterTabIcon: {
    marginRight: 4,
  },
  filterTabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: '#2e7af5',
    fontWeight: '600',
  },
  actionButtons: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f6ff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d0e1ff',
  },
  exportButtonDisabled: {
    opacity: 0.6,
    backgroundColor: '#f5f5f5',
  },
  exportButtonText: {
    fontSize: 14,
    color: '#2e7af5',
    marginLeft: 8,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  registrationCard: {
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
  userDetails: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 12,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  roleBadgeText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  userPhone: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  registrationDetails: {
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
  notes: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#666',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#e53935',
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
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
  },
});

export default EventRegistrationsScreen;