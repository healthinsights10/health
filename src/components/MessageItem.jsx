import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Linking,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const MessageItem = ({message, currentUserId, onAttachmentPress}) => {
  const isOwnMessage = message.sender_id === currentUserId;

  const getFileIcon = fileType => {
    if (!fileType) return '📄';
    fileType = fileType.toLowerCase();

    if (fileType.includes('pdf')) return '📕';
    if (fileType.includes('doc')) return '📘';
    if (fileType.includes('xls') || fileType.includes('sheet')) return '📗';
    if (fileType.includes('ppt')) return '📙';
    if (
      fileType.includes('image') ||
      fileType.includes('jpg') ||
      fileType.includes('jpeg') ||
      fileType.includes('png')
    )
      return '🖼️';
    if (fileType.includes('video') || fileType.includes('mp4')) return '🎬';
    if (fileType.includes('audio') || fileType.includes('mp3')) return '🎵';
    return '📄';
  };

  const formatFileSize = bytes => {
    if (!bytes || bytes === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const renderMessageText = () => {
    if (!message.content || 
        message.content === '📎 Document' || 
        message.content === '📷 Image') {
      return null;
    }

    // Enhanced URL pattern to catch both HTTP and custom scheme URLs
    const urlPattern = /(https?:\/\/[^\s]+|medevents:\/\/[^\s]+)/g;
    
    if (!urlPattern.test(message.content)) {
      // No URLs found, render as plain text
      return <Text style={styles.messageText}>{message.content}</Text>;
    }

    // Split content by URLs and create clickable links
    const parts = message.content.split(urlPattern);
    
    return (
      <Text style={styles.messageText}>
        {parts.map((part, index) => {
          if (urlPattern.test(part)) {
            return (
              <Text
                key={index}
                style={styles.linkText}
                onPress={() => handleLinkPress(part)}>
                {part}
              </Text>
            );
          }
          return <Text key={index}>{part}</Text>;
        })}
      </Text>
    );
  };

  // FIXED: Enhanced function to handle link press with web URL conversion
  const handleLinkPress = async (url) => {
    try {
      console.log('🔗 Attempting to open URL:', url);
      
      // FIXED: Check if it's a MedEvents web URL and convert to deep link
      if (url.includes('medevent-event-sharing.vercel.app')) {
        const convertedUrl = convertWebUrlToDeepLink(url);
        console.log('🔄 Converted URL:', convertedUrl);
        
        // Try to open the deep link first
        const canOpenDeepLink = await Linking.canOpenURL(convertedUrl);
        
        if (canOpenDeepLink) {
          await Linking.openURL(convertedUrl);
          console.log('✅ Deep link opened successfully');
          return;
        } else {
          console.log('⚠️ Deep link not supported, trying web URL');
          // Fallback to web URL
          await Linking.openURL(url);
          console.log('✅ Web URL opened successfully');
          return;
        }
      }
      
      // For other URLs, check if they're supported
      const supported = await Linking.canOpenURL(url);
      
      if (supported) {
        await Linking.openURL(url);
        console.log('✅ URL opened successfully');
      } else {
        console.log('❌ URL not supported:', url);
        Alert.alert(
          'Cannot Open Link',
          'This link cannot be opened on your device. Would you like to copy the link?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Copy Link', 
              onPress: () => copyToClipboard(url) 
            }
          ]
        );
      }
    } catch (error) {
      console.error('❌ Error opening URL:', error);
      Alert.alert(
        'Error Opening Link',
        'Failed to open the link. Would you like to copy it instead?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Copy Link', 
            onPress: () => copyToClipboard(url) 
          }
        ]
      );
    }
  };

  // ADDED: Function to convert web URLs to deep links
  const convertWebUrlToDeepLink = (webUrl) => {
    try {
      // Extract the path from the web URL
      const url = new URL(webUrl);
      const path = url.pathname; // e.g., "/meeting/cff2688c-f04e-4d08-9ee0-2265125cbd41"
      
      // Convert to deep link format
      if (path.startsWith('/meeting/')) {
        const meetingId = path.split('/meeting/')[1];
        return `medevents://meeting/${meetingId}`;
      } else if (path.startsWith('/event/')) {
        const eventId = path.split('/event/')[1];
        return `medevents://event/${eventId}`;
      }
      
      // For other paths, return the original URL
      return webUrl;
    } catch (error) {
      //console.error('Error converting URL:', error);
      return webUrl;
    }
  };

  // ADDED: Function to copy URL to clipboard
  const copyToClipboard = async (url) => {
    try {
      const { Clipboard } = require('@react-native-clipboard/clipboard');
      await Clipboard.setString(url);
      Alert.alert('Success', 'Link copied to clipboard!');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      Alert.alert('Error', 'Failed to copy link to clipboard');
    }
  };

  const renderAttachment = () => {
    if (!message.is_attachment || !message.file_url) return null;

    // Handle image attachments
    if (
      message.attachment_type === 'image' ||
      (message.file_type && message.file_type.toLowerCase().includes('image'))
    ) {
      return (
        <TouchableOpacity
          style={styles.imageAttachment}
          onPress={() => onAttachmentPress(message)}>
          <Image
            source={{uri: message.file_url}}
            style={styles.attachmentImage}
            resizeMode="cover"
          />
          <Text style={styles.attachmentCaption}>
            {message.file_name || 'Image'}
          </Text>
        </TouchableOpacity>
      );
    }

    // Handle other file types
    return (
      <TouchableOpacity
        style={styles.fileAttachment}
        onPress={() => onAttachmentPress(message)}>
        <View style={styles.fileIconContainer}>
          <Text style={styles.fileIcon}>{getFileIcon(message.file_type)}</Text>
        </View>
        <View style={styles.fileInfoContainer}>
          <Text style={styles.fileName} numberOfLines={1}>
            {message.file_name || 'File'}
          </Text>
          <Text style={styles.fileDetails}>
            {message.file_type?.split('/')[1] || 'Document'} •{' '}
            {formatFileSize(message.file_size)}
          </Text>
        </View>
        <Icon name="download" size={16} color="#2e7af5" />
      </TouchableOpacity>
    );
  };

  return (
    <View
      style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessage : styles.otherMessage,
      ]}>
      <View
        style={[
          styles.messageBubble,
          isOwnMessage ? styles.ownBubble : styles.otherBubble,
        ]}>
        {!isOwnMessage && (
          <Text style={styles.senderName}>{message.sender_name}</Text>
        )}

        {/* Show text content if not an attachment or if has both attachment and text */}
        {(!message.is_attachment || message.content) && renderMessageText()}

        {/* Render attachment if present */}
        {renderAttachment()}

        <Text style={styles.timestamp}>
          {new Date(message.created_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    </View>
  );
};

// UPDATED: Enhanced styles with better link styling
const styles = StyleSheet.create({
  messageContainer: {
    marginVertical: 4,
    paddingHorizontal: 16,
    width: '100%',
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 18,
    padding: 12,
    marginBottom: 2,
  },
  ownBubble: {
    backgroundColor: '#e3f2fd',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#f0f0f0',
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    color: '#555',
  },
  messageText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  linkText: {
    color: '#2e7af5',
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
  timestamp: {
    fontSize: 10,
    color: '#888',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  attachmentImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginVertical: 4,
  },
  imageAttachment: {
    marginVertical: 6,
  },
  attachmentCaption: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  fileAttachment: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
    marginVertical: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  fileIconContainer: {
    marginRight: 10,
  },
  fileIcon: {
    fontSize: 24,
  },
  fileInfoContainer: {
    flex: 1,
    marginRight: 8,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  fileDetails: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
});

export default MessageItem;