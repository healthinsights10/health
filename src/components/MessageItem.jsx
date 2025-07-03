import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Linking,
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

    // Check if the message contains URLs
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    const parts = message.content.split(urlPattern);
    
    if (parts.length === 1) {
      // No URLs found, render as plain text
      return <Text style={styles.messageText}>{message.content}</Text>;
    }

    // URLs found, render with clickable links
    return (
      <Text style={styles.messageText}>
        {parts.map((part, index) => {
          if (urlPattern.test(part)) {
            return (
              <Text
                key={index}
                style={styles.linkText}
                onPress={() => Linking.openURL(part)}>
                {part}
              </Text>
            );
          }
          return part;
        })}
      </Text>
    );
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
  },
  linkText: {
    color: '#2e7af5',
    textDecorationLine: 'underline',
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