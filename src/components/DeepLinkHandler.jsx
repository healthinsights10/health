import {useEffect} from 'react';
import {Linking, Alert} from 'react-native';
import {useNavigation, CommonActions} from '@react-navigation/native';

const DeepLinkHandler = () => {
  const navigation = useNavigation();

  useEffect(() => {
    // Handle initial URL when app is closed
    const getInitialURL = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        console.log('[DeepLink] Initial URL:', initialUrl);
        if (initialUrl) {
          handleDeepLink(initialUrl);
        }
      } catch (error) {
        console.error('[DeepLink] Error getting initial URL:', error);
      }
    };

    // Handle URL when app is already open
    const handleUrlChange = ({url}) => {
      console.log('[DeepLink] URL changed:', url);
      handleDeepLink(url);
    };

    // Set up listeners
    getInitialURL();
    const subscription = Linking.addEventListener('url', handleUrlChange);

    return () => {
      subscription?.remove();
    };
  }, [navigation]);

  const handleDeepLink = (url) => {
    console.log('[DeepLink] Handling URL:', url);
    const parsedUrl = parseDeepLink(url);
    console.log('[DeepLink] Parsed URL:', parsedUrl);
    
    if (parsedUrl) {
      navigateToScreen(parsedUrl);
    } else {
      console.log('[DeepLink] Could not parse URL');
    }
  };

  const parseDeepLink = (url) => {
    try {
      console.log('[DeepLink] Parsing URL:', url);
      
      // Handle medevents:// scheme
      if (url.startsWith('medevents://')) {
        const path = url.replace('medevents://', '');
        const parts = path.split('/');
        console.log('[DeepLink] Custom scheme parts:', parts);

        // Handle events: medevents://event/eventId
        if (parts[0] === 'event' && parts[1]) {
          const eventId = parts[1].split('?')[0]; // Remove query params if any
          console.log('[DeepLink] Found event ID:', eventId);
          return {
            type: 'event',
            eventId: eventId,
          };
        }

        // Handle meetings: medevents://meeting/eventId (route to EventDetailsScreen)
        if (parts[0] === 'meeting' && parts[1]) {
          const eventId = parts[1].split('?')[0];
          console.log('[DeepLink] Found meeting/event ID:', eventId);
          return {
            type: 'event', // Change this to 'event' to route to EventDetailsScreen
            eventId: eventId, // Use eventId instead of meetingId
          };
        }

        // Handle posts: medevents://post/postId
        if (parts[0] === 'post' && parts[1]) {
          const postId = parts[1].split('?')[0];
          return {
            type: 'post',
            postId: postId,
          };
        }

        // Handle chat: medevents://chat/userId
        if (parts[0] === 'chat' && parts[1]) {
          const userId = parts[1].split('?')[0];
          return {
            type: 'chat',
            userId: userId,
          };
        }
      }
      
      // Handle your Vercel domain URLs
      if (url.includes('medevent-event-sharing.vercel.app/')) {
        if (url.includes('/event/')) {
          const eventId = url.split('/event/')[1].split('?')[0];
          return { type: 'event', eventId: eventId };
        }
        if (url.includes('/meeting/')) {
          const eventId = url.split('/meeting/')[1].split('?')[0];
          return { type: 'event', eventId: eventId }; // Route meetings to EventDetailsScreen
        }
        if (url.includes('/post/')) {
          const postId = url.split('/post/')[1].split('?')[0];
          return { type: 'post', postId: postId };
        }
        if (url.includes('/chat/')) {
          const userId = url.split('/chat/')[1].split('?')[0];
          return { type: 'chat', userId: userId };
        }
      }

      // Handle any URL with event ID format (fallback)
      const eventIdRegex = /(?:event|meeting)\/([a-zA-Z0-9-]+)/;
      const eventMatch = url.match(eventIdRegex);
      if (eventMatch && eventMatch[1]) {
        console.log('[DeepLink] Regex found event ID:', eventMatch[1]);
        return {
          type: 'event',
          eventId: eventMatch[1],
        };
      }

      return null;
    } catch (error) {
      console.error('[DeepLink] Error parsing deep link:', error);
      return null;
    }
  };

  const navigateToScreen = (parsedUrl) => {
    try {
      console.log('[DeepLink] Navigating with data:', parsedUrl);
      
      // Use setTimeout to ensure navigation is ready
      setTimeout(() => {
        switch (parsedUrl.type) {
          case 'event':
            console.log('[DeepLink] Navigating to EventDetails with ID:', parsedUrl.eventId);
            navigation.dispatch(
              CommonActions.navigate({
                name: 'EventDetails',
                params: { eventId: parsedUrl.eventId },
              })
            );
            break;

          case 'post':
            navigation.dispatch(
              CommonActions.navigate({
                name: 'PostDetails',
                params: { postId: parsedUrl.postId },
              })
            );
            break;

          case 'chat':
            navigation.dispatch(
              CommonActions.navigate({
                name: 'ChatScreen',
                params: { userId: parsedUrl.userId },
              })
            );
            break;

          default:
            navigation.dispatch(
              CommonActions.navigate('HomeScreen')
            );
        }
      }, 300); // Small delay to ensure navigation is ready
      
    } catch (error) {
      console.error('[DeepLink] Error navigating to screen:', error);
      Alert.alert(
        'Navigation Error',
        'Could not navigate to the requested content. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  return null;
};

export default DeepLinkHandler;