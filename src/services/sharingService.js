import Share from 'react-native-share';
import {Clipboard, Alert} from 'react-native';

class SharingService {
  // Share an event
  async shareEvent(eventId, eventData) {
    return this.shareContent('event', eventId, {
      title: eventData.title,
      description: eventData.description,
      emoji: '🏥',
      type: 'medical event',
      extraInfo: `📅 ${this.formatDate(eventData.startDate)} at ${this.formatTime(eventData.startDate)}\n📍 ${eventData.mode === 'Virtual' ? 'Virtual Event' : eventData.venue}`
    });
  }

  // Share a meeting (which is actually an event in your system)
  async shareMeeting(eventId, eventData) {
    return this.shareContent('meeting', eventId, {
      title: eventData.title,
      description: eventData.description || `Meeting: ${eventData.title}`,
      emoji: '🤝',
      type: 'meeting',
      extraInfo: `📅 ${this.formatDate(eventData.date || eventData.startDate)} at ${this.formatTime(eventData.date || eventData.startDate)}\n📍 ${eventData.mode === 'Virtual' || eventData.mode === 'online' ? 'Virtual Meeting' : eventData.venue}`
    });
  }

  // Share a post (for future use)
  async sharePost(postId, postData) {
    return this.shareContent('post', postId, {
      title: postData.title,
      description: postData.excerpt || postData.content?.substring(0, 150),
      emoji: '📝',
      type: 'post'
    });
  }

  // Share a chat/profile
  async shareProfile(userId, userData) {
    return this.shareContent('chat', userId, {
      title: userData.name,
      description: `Connect with ${userData.name} on MedEvents`,
      emoji: '👤',
      type: 'profile'
    });
  }

  // Generic sharing method
  async shareContent(type, id, content) {
    try {
      const customScheme = `medevents://${type}/${id}`;
      // Create a dummy HTTP URL that WhatsApp will recognize as clickable
      const httpFallback = `https://medevents.app/${type}/${id}`;
      
      const shareMessage = `${content.emoji} *${content.title}*\n\n${content.description}\n\n${content.extraInfo || ''}\n\n📱 Open in MedEvents app: ${httpFallback}\n\n💿 Don't have the app? Search "MedEvents" in your app store!`;
      
      const shareOptions = {
        title: `Check out this ${content.type}!`,
        message: shareMessage,
      };

      const result = await Share.open(shareOptions);
      console.log('Share result:', result);
      return result;
      
    } catch (error) {
      console.error('Share error:', error);
      if (error.message !== 'User did not share') {
        const fallbackText = `${content.emoji} ${content.title}\n\n${content.type.toUpperCase()} ID: ${id}\nOpen MedEvents app to view details`;
        Clipboard.setString(fallbackText);
        Alert.alert('Content Copied!', `${content.type} information copied to clipboard.`);
      }
      throw error;
    }
  }

  // Helper methods
  formatDate(dateString) {
    if (!dateString) return 'Date TBD';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  formatTime(dateString) {
    if (!dateString) return 'Time TBD';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Generate deep link without sharing
  generateDeepLink(type, id) {
    return `medevents://${type}/${id}`;
  }

  // Test if the app can handle a deep link
  async canHandleDeepLink(url) {
    try {
      const {Linking} = require('react-native');
      return await Linking.canOpenURL(url);
    } catch (error) {
      console.error('Error checking deep link support:', error);
      return false;
    }
  }
}

export default new SharingService();