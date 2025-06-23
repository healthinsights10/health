// filepath: d:\medevent\Health\src\components\NotificationHandler.jsx

import React, {useEffect} from 'react';
import {fcmService} from '../services/fcmService';
import {useNavigation} from '@react-navigation/native';
import {Alert, Platform} from 'react-native';
import messaging from '@react-native-firebase/messaging';

const NotificationHandler = () => {
  const navigation = useNavigation();

  const handleNotificationNavigation = data => {
    if (!data) return;

    const {type, id, action, status, video_id, comment_id} = data;

    console.log('Handling notification navigation:', {type, id, action});

    switch (type) {
      case 'pending_event':
        if (action === 'approval') {
          navigation.navigate('AdminEventManagement');
        }
        break;

      case 'event_approval':
        if (action === 'view' && id) {
          navigation.navigate('MyEvents');
        }
        break;

      case 'event_rejection':
        if (action === 'view' && id) {
          navigation.navigate('MyEvents');
        }
        break;

      case 'new_event':
        if (action === 'view' && id) {
          navigation.navigate('EventDetails', {eventId: id});
        }
        break;

      case 'chat_message':
        if (action === 'open_chat') {
          // Handle different possible formats of sender/user ID
          const userId = id || data?.sender_id || data?.senderId || data?.user_id;
          const roomId = data?.room_id || data?.roomId;
          
          console.log('Chat notification received:', { userId, roomId, data });
          
          if (userId) {
            // Navigate to ChatScreen with the sender's ID and notification flag
            navigation.navigate('ChatScreen', {
              userId: userId,
              roomId: roomId,
              openFromNotification: true,
              // Also pass the sender details if available
              senderName: data?.sender_name || data?.senderName,
            });
          }
        }
        break;

      case 'meeting_invitation':
        if (action === 'view_invitation') {
          navigation.navigate('MeetingInvitations');
        }
        break;

      case 'invitation_response':
        if (action === 'view_meeting' && id) {
          navigation.navigate('MeetingDetails', {meetingId: id});
        }
        break;

      case 'account_verification':
        if (action === 'dashboard') {
          navigation.navigate('HomeScreen');
        }
        break;

      case 'account_rejection':
        if (action === 'verification') {
          navigation.navigate('UserVerification');
        }
        break;

      case 'sponsorship_request':
        if (action === 'respond') {
          navigation.navigate('SponsorshipRequests');
        }
        break;

      case 'sponsorship_response':
        if (action === 'view' && id) {
          if (status === 'accepted') {
            navigation.navigate('EventDetails', {eventId: id});
          } else {
            navigation.navigate('SponsorshipRequests');
          }
        }
        break;

      case 'course_new_comment':
        if (action === 'view_discussion' && id) {
          if (video_id) {
            // Navigate to the specific video discussion
            navigation.navigate('CourseDetails', {
              courseId: id,
              initialVideoId: video_id,
              focusComment: comment_id,
            });
          } else {
            // Navigate to the general course discussion
            navigation.navigate('CourseDetails', {
              courseId: id,
              focusComment: comment_id,
            });
          }
        }
        break;

      case 'course_comment_reply':
        if (action === 'view_discussion' && id) {
          if (video_id) {
            // Navigate to the specific video discussion
            navigation.navigate('CourseDetails', {
              courseId: id,
              initialVideoId: video_id,
              focusComment: comment_id,
            });
          } else {
            // Navigate to the general course discussion
            navigation.navigate('CourseDetails', {
              courseId: id,
              focusComment: comment_id,
            });
          }
        }
        break;
    }
  };

  // Function to display foreground notifications
  const showForegroundNotification = (title, body, data) => {
    if (Platform.OS === 'ios') {
      // For iOS, we'll use a simple Alert
      Alert.alert(
        title,
        body,
        [
          {
            text: 'Dismiss',
            style: 'cancel',
          },
          {
            text: 'View',
            onPress: () => handleNotificationNavigation(data),
          },
        ],
        {cancelable: true},
      );
    } else {
      // For Android, we can use the messaging API directly
      // Note: This will only work if you have set up the notification channel
      messaging()
        .getInitialNotification()
        .then(remoteMessage => {
          // Show a toast or custom notification UI
          // For simplicity, we'll use Alert here too
          Alert.alert(
            title,
            body,
            [
              {
                text: 'Dismiss',
                style: 'cancel',
              },
              {
                text: 'View',
                onPress: () => handleNotificationNavigation(data),
              },
            ],
            {cancelable: true},
          );
        });
    }
  };

  useEffect(() => {
    // Handle foreground notifications - We need to manually display them
    const onNotification = remoteMessage => {
      console.log('Notification received in foreground:', remoteMessage);

      // Extract notification details
      const title = remoteMessage.notification?.title || 'New Notification';
      const body = remoteMessage.notification?.body || '';
      const data = remoteMessage.data || {};

      // Display the notification to the user
      showForegroundNotification(title, body, data);
    };

    // Handle notifications that open the app
    const onNotificationOpened = remoteMessage => {
      console.log('Notification opened app', remoteMessage);

      if (remoteMessage.data) {
        handleNotificationNavigation(remoteMessage.data);
      }
    };

    // Register notification handlers
    fcmService.registerNotificationListeners(
      onNotification,
      onNotificationOpened,
    );

    // Clean up
    return () => {
      fcmService.unregister();
    };
  }, []);

  return null; // This component doesn't render anything
};

export default NotificationHandler;
