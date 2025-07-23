import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { notificationService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const NotificationScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  // Fetch notifications
  const fetchNotifications = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      
      console.log('📱 Fetching notifications for user:', user?.id);
      const data = await notificationService.getNotifications();
      console.log('📱 Received notifications:', data?.length || 0);
      
      // Remove duplicates based on title, body, and data.id
      const uniqueNotifications = data?.filter((notification, index, self) => {
        return index === self.findIndex(n => 
          n.title === notification.title && 
          n.body === notification.body && 
          n.data?.id === notification.data?.id
        );
      }) || [];

      console.log('📱 After deduplication:', uniqueNotifications.length);
      
      setNotifications(uniqueNotifications);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      Alert.alert('Error', 'Failed to load notifications. Please try again.');
      setNotifications([]);
    } finally {
      if (showLoading) setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  // Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications(false);
  }, [fetchNotifications]);

  // Mark notification as read
  const handleNotificationPress = async (notification) => {
    try {
      if (!notification.read) {
        await notificationService.markAsRead(notification.id);
        
        // Update local state
        setNotifications(prev =>
          prev.map(notif =>
            notif.id === notification.id
              ? { ...notif, read: true, read_at: new Date().toISOString() }
              : notif
          )
        );
      }

      // Handle navigation based on notification type
      handleNotificationAction(notification);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Handle notification actions
  const handleNotificationAction = (notification) => {
    const { data } = notification;
    
    try {
      console.log('🔄 Handling notification action:', data);
      
      switch (data?.type) {
        case 'pending_event':
        case 'event_approval':
        case 'event_rejection':
        case 'new_event':
          if (data.id && data.id !== 'notifications') { // Add validation
            console.log('📍 Navigating to EventDetails with eventId:', data.id);
            navigation.navigate('EventDetails', { eventId: data.id });
          } else {
            console.warn('⚠️ Invalid event ID in notification:', data.id);
          }
          break;
        
        case 'meeting_invitation':
        case 'invitation_response':
          if (data.id && data.id !== 'notifications') { // Add validation
            console.log('📍 Navigating to MeetingDetails with meetingId:', data.id);
            navigation.navigate('MeetingDetails', { meetingId: data.id });
          } else {
            console.warn('⚠️ Invalid meeting ID in notification:', data.id);
          }
          break;
        
        case 'sponsorship_request':
        case 'sponsorship_response':
          if (data.id && data.id !== 'notifications') { // Add validation
            console.log('📍 Navigating to EventDetails with eventId:', data.id);
            navigation.navigate('EventDetails', { eventId: data.id });
          } else {
            console.warn('⚠️ Invalid event ID in notification:', data.id);
          }
          break;
        
        default:
          console.log('ℹ️ No specific action for notification type:', data?.type);
          break;
      }
    } catch (error) {
      console.error('❌ Error handling notification action:', error);
    }
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    try {
      setMarkingAllRead(true);
      await notificationService.markAllAsRead();
      
      // Update local state
      setNotifications(prev =>
        prev.map(notif => ({
          ...notif,
          read: true,
          read_at: new Date().toISOString()
        }))
      );
      
      Alert.alert('Success', 'All notifications marked as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      Alert.alert('Error', 'Failed to mark all notifications as read');
    } finally {
      setMarkingAllRead(false);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
  };

  // Get notification icon
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'pending_event':
        return 'calendar-clock';
      case 'event_approval':
        return 'calendar-check';
      case 'event_rejection':
        return 'calendar-remove';
      case 'new_event':
        return 'calendar-plus';
      case 'meeting_invitation':
        return 'account-group';
      case 'invitation_response':
        return 'reply';
      case 'sponsorship_request':
        return 'handshake';
      case 'sponsorship_response':
        return 'handshake-outline';
      default:
        return 'bell';
    }
  };

  // Get notification color
  const getNotificationColor = (type) => {
    switch (type) {
      case 'pending_event':
        return '#ff9800';
      case 'event_approval':
        return '#4caf50';
      case 'event_rejection':
        return '#f44336';
      case 'new_event':
        return '#2e7af5';
      case 'meeting_invitation':
        return '#9c27b0';
      case 'invitation_response':
        return '#607d8b';
      case 'sponsorship_request':
        return '#795548';
      case 'sponsorship_response':
        return '#3f51b5';
      default:
        return '#666';
    }
  };

  // Render notification item
  const renderNotificationItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.notificationCard, !item.read && styles.unreadCard]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.notificationHeader}>
        <View style={styles.iconContainer}>
          <Icon
            name={getNotificationIcon(item.data?.type)}
            size={24}
            color={getNotificationColor(item.data?.type)}
          />
        </View>
        
        <View style={styles.notificationContent}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, !item.read && styles.unreadTitle]}>
              {item.title}
            </Text>
            {!item.read && <View style={styles.unreadDot} />}
          </View>
          
          <Text style={styles.body} numberOfLines={3}>
            {item.body}
          </Text>
          
          <Text style={styles.timestamp}>
            {formatDate(item.created_at)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Get unread count
  const unreadCount = notifications.filter(notif => !notif.read).length;

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <Text style={styles.unreadCount}>
              {unreadCount} unread
            </Text>
          )}
        </View>
        
        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.markAllButton}
            onPress={handleMarkAllAsRead}
            disabled={markingAllRead}
          >
            {markingAllRead ? (
              <ActivityIndicator size="small" color="#2e7af5" />
            ) : (
              <Text style={styles.markAllText}>Mark all read</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2e7af5" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="bell-off" size={80} color="#ccc" />
          <Text style={styles.emptyTitle}>No Notifications</Text>
          <Text style={styles.emptySubtitle}>
            You'll see your notifications here when you receive them
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotificationItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#2e7af5']}
              tintColor="#2e7af5"
            />
          }
          showsVerticalScrollIndicator={false}
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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  unreadCount: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  markAllText: {
    fontSize: 12,
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
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
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
    lineHeight: 22,
  },
  listContainer: {
    padding: 16,
  },
  notificationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#2e7af5',
    backgroundColor: '#fafbff',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  unreadTitle: {
    fontWeight: '600',
    color: '#1a1a1a',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2e7af5',
    marginLeft: 8,
  },
  body: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
});

export default NotificationScreen;