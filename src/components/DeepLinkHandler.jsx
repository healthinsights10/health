import {useEffect} from 'react';
import {Linking} from 'react-native';
import {useNavigation} from '@react-navigation/native';

const DeepLinkHandler = () => {
  const navigation = useNavigation();

  useEffect(() => {
    // Handle initial URL when app is closed
    const getInitialURL = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          handleDeepLink(initialUrl);
        }
      } catch (error) {
        console.error('Error getting initial URL:', error);
      }
    };

    // Handle URL when app is already open
    const handleUrlChange = (url) => {
      handleDeepLink(url);
    };

    // Set up listeners
    getInitialURL();
    const subscription = Linking.addEventListener('url', handleUrlChange);

    return () => {
      subscription?.remove();
    };
  }, []);

  const handleDeepLink = (url) => {
    console.log('Deep link received:', url);
    
    // Parse the URL
    const parsedUrl = parseDeepLink(url);
    if (parsedUrl) {
      navigateToScreen(parsedUrl);
    }
  };

  const parseDeepLink = (url) => {
    try {
      // Handle medevents:// scheme
      if (url.startsWith('medevents://')) {
        const path = url.replace('medevents://', '');
        const parts = path.split('/');
        
        if (parts[0] === 'event' && parts[1]) {
          return {
            type: 'event',
            eventId: parts[1]
          };
        }
      }
      
      // Handle https://medevents.app/ URLs
      if (url.includes('medevents.app/event/')) {
        const eventId = url.split('/event/')[1];
        if (eventId) {
          return {
            type: 'event',
            eventId: eventId
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error parsing deep link:', error);
      return null;
    }
  };

  const navigateToScreen = (parsedUrl) => {
    try {
      switch (parsedUrl.type) {
        case 'event':
          // Navigate to EventDetails screen
          navigation.navigate('EventDetails', {
            eventId: parsedUrl.eventId
          });
          break;
        default:
          // Navigate to home if unknown type
          navigation.navigate('HomeScreen');
      }
    } catch (error) {
      console.error('Error navigating to screen:', error);
    }
  };

  return null; // This component doesn't render anything
};

export default DeepLinkHandler;