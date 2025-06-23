import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  StatusBar,
  SafeAreaView,
  Modal,
  Image,
  Linking,
  ScrollView,
  BackHandler,
  Clipboard,
  RefreshControl,
} from 'react-native';
import * as Assets from '../assets';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'react-native-image-picker';
import WebViewDocumentPicker from '../components/WebViewDocumentPicker';
import io from 'socket.io-client';
import axios from 'axios';
import {useAuth} from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {WebView} from 'react-native-webview';
import MessageItem from '../components/MessageItem';

const SOCKET_URL = 'http://192.168.1.4:5000';
const API_URL = 'http://192.168.1.4:5000';

const ChatScreen = () => {
  // Auth context
  const {user, getToken} = useAuth();
  const insets = useSafeAreaInsets();

  // State for messages & chat
  const [messages, setMessages] = useState([]);
  const [chatHistory, setChatHistory] = useState({});
  const [newMessage, setNewMessage] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);
  const [recentChats, setRecentChats] = useState([]);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [contactDetails, setContactDetails] = useState(null);

  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [noResultsFound, setNoResultsFound] = useState(false);

  // File handling states
  const [showAttachmentOptions, setShowAttachmentOptions] = useState(false);
  const [webViewPickerVisible, setWebViewPickerVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cachedImages, setCachedImages] = useState({});
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);

  // Various refs
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const currentRoomIdRef = useRef(null);
  const flatListRef = useRef(null);
  const searchInputRef = useRef(null);
  const pollIntervalRef = useRef(null);

  // Add this near the top of your component with other state variables
  const [lastMessageTimestamp, setLastMessageTimestamp] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Define debounce helper function
  const debounce = (func, delay) => {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func.apply(this, args);
      }, delay);
    };
  };

  // IMPORTANT: All useCallback hooks must be defined here at the top level
  const debouncedSearch = useCallback(
    debounce(query => {
      searchUsers(query);
    }, 500),
    [],
  );

  // Add this useEffect to fetch contact details when modal opens
  useEffect(() => {
    if (profileModalVisible && selectedDoctor && !selectedDoctor.isAdminSupport) {
      fetchContactDetails(selectedDoctor.id);
    }
  }, [profileModalVisible, selectedDoctor]);

  // Debug output for current user
  useEffect(() => {
    console.log('Current user:', user);
  }, [user]);

  // Add this useEffect to periodically check for new messages
  useEffect(() => {
    if (!selectedDoctor || !socketConnected) return;
    
    // Clean up any existing interval
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    
    // Create polling interval for message updates
    pollIntervalRef.current = setInterval(() => {
      console.log('Polling for new messages...');
      fetchLatestMessages();
    }, 15000); // Poll every 15 seconds
    
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [selectedDoctor, socketConnected]);

  // Fetch all doctors
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        console.log('Fetching doctors for chat');
        const response = await axios.get(`${API_URL}/api/doctors`);

        // Filter out the current user from the doctors list
        const filteredDoctors = response.data.filter(doc => doc.id !== user.id);

        // Add admin support contact option at the top of the list
        filteredDoctors.unshift({
          id: 'admin',
          name: 'Support Team',
          role: 'admin',
          isAdminSupport: true,
        });

        setDoctors(filteredDoctors);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching doctors:', error);
        Alert.alert('Error', 'Failed to fetch contacts');
        setLoading(false);
      }
    };
    fetchDoctors();
  }, [user?.id]);

  // Update currentRoomIdRef when selectedDoctor changes
  useEffect(() => {
    if (selectedDoctor && user) {
      let roomId;
      if (selectedDoctor.isAdminSupport) {
        // For admin support, always use format: admin-id-user-id
        roomId = `66768b81-2d00-4eca-9145-4cf11f687fe8-${user.id}`;
      } else {
        // For doctor-to-doctor chats, sort IDs alphabetically
        roomId = [user.id, selectedDoctor.id].sort().join('-');
      }
      currentRoomIdRef.current = roomId;
      console.log('Current room ID set to:', roomId);
    } else {
      currentRoomIdRef.current = null;
    }
  }, [selectedDoctor, user]);

  // Fetch message history when selecting a doctor
  useEffect(() => {
    if (selectedDoctor) {
      fetchMessageHistory();
    }
  }, [selectedDoctor]);

  useEffect(() => {
    const loadImages = async () => {
      const imagesToLoad = messages.filter(
        msg =>
          (msg.isAttachment === true && msg.attachmentType === 'image') ||
          (msg.fileType && msg.fileType.includes('image')) ||
          (msg.fileUrl && msg.fileUrl.match(/\.(jpeg|jpg|gif|png)$/i)),
      );

      console.log('Images to load:', imagesToLoad.length);

      for (const msg of imagesToLoad) {
        if (msg.fileUrl && !cachedImages[msg.fileUrl]) {
          console.log('Caching image:', msg.fileUrl);
          try {
            const localUri = await downloadAndCacheImage(msg.fileUrl);
            if (localUri) {
              setCachedImages(prev => ({
                ...prev,
                [msg.fileUrl]: localUri,
              }));
            }
          } catch (error) {
            console.error('Error caching image:', error);
          }
        }
      }
    };

    loadImages();
  }, [messages]);

  // Socket connection
  useEffect(() => {
    if (selectedDoctor && user) {
      // Clean up previous connection if any
      if (socketRef.current) {
        socketRef.current.disconnect();
      }

      // Clear any pending reconnect timeouts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      console.log('Connecting to socket at:', SOCKET_URL);

      // Configure socket with proper options
      socketRef.current = io(SOCKET_URL, {
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        transports: ['websocket', 'polling'],
        forceNew: true,
      });

      socketRef.current.on('connect', () => {
        console.log('Socket connected');
        setSocketConnected(true);

        // Create a consistent room ID
        let roomId;
        if (selectedDoctor.isAdminSupport) {
          roomId = `66768b81-2d00-4eca-9145-4cf11f687fe8-${user.id}`;
        } else {
          roomId = [user.id, selectedDoctor.id].sort().join('-');
        }

        console.log('Joining room:', roomId);
        socketRef.current.emit('join_room', roomId);
      });

      socketRef.current.on('receive_message', message => {
        console.log('Received message:', message);

        // Handle received message
        const newMessage = {
          id: message.id || message.tempId, // Add fallback to tempId
          text: message.text || message.content,
          senderId: message.senderId || message.sender_id,
          senderName: message.senderName || message.sender_name,
          receiverId: message.receiverId || message.receiver_id,
          timestamp: message.timestamp || message.created_at,
          roomId: message.roomId || message.room_id,
          isAttachment: message.isAttachment || message.is_attachment || false,
          attachmentType: message.attachmentType || message.attachment_type,
          fileUrl: message.fileUrl || message.file_url,
          fileName: message.fileName || message.file_name,
          fileType: message.fileType || message.file_type,
          fileSize: message.fileSize || message.file_size,
        };

        // Update the last message timestamp
        const messageTime = new Date(newMessage.timestamp);
        if (!lastMessageTimestamp || messageTime > new Date(lastMessageTimestamp)) {
          setLastMessageTimestamp(newMessage.timestamp);
        }

        // Check if this is our own message coming back from the server
        const isOwnMessage = newMessage.senderId === user?.id;

        // If it's our own message, match it with any pending messages to avoid duplicates
        if (isOwnMessage) {
          setMessages(prevMessages => {
            // Try to find an existing pending message with the same tempId or similar content
            const existingMessage = prevMessages.find(
              msg =>
                (message.tempId && msg.id === message.tempId) ||
                (msg.pending &&
                  msg.text === newMessage.text &&
                  msg.senderId === newMessage.senderId),
            );

            if (existingMessage) {
              // Replace the pending message with the confirmed one
              return prevMessages.map(msg =>
                (message.tempId && msg.id === message.tempId) ||
                (msg.pending &&
                  msg.text === newMessage.text &&
                  msg.senderId === newMessage.senderId)
                  ? {...newMessage, pending: false}
                  : msg,
              );
            } else {
              // No matching message found, add as new
              return [newMessage, ...prevMessages];
            }
          });
        } else {
          // For messages from others, just add them
          setMessages(prevMessages => {
            if (!prevMessages.some(msg => msg.id === newMessage.id)) {
              return [newMessage, ...prevMessages];
            }
            return prevMessages;
          });
        }

        // Always update chat history
        setChatHistory(prev => {
          const currentRoomMessages = prev[newMessage.roomId] || [];

          // Check if message already exists in chat history
          const messageExists = currentRoomMessages.some(
            msg => msg.id === newMessage.id,
          );

          if (!messageExists) {
            return {
              ...prev,
              [newMessage.roomId]: [newMessage, ...currentRoomMessages],
            };
          }
          return prev;
        });
      });

      // Listen for message confirmation
      socketRef.current.on('message_confirmed', confirmedMessage => {
        console.log('Message confirmed:', confirmedMessage);
        updateMessageStatus(confirmedMessage);
      });

      socketRef.current.on('connect_error', error => {
        console.error('Socket connection error:', error);
        setSocketConnected(false);

        // Implement retry logic with backoff
        if (!reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('Attempting to reconnect...');
            socketRef.current.connect();
            reconnectTimeoutRef.current = null;
          }, 3000);
        }
      });

      socketRef.current.on('disconnect', reason => {
        console.log('Socket disconnected:', reason);
        setSocketConnected(false);

        // Always try to reconnect automatically after a short delay
        if (!reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('Attempting to reconnect socket...');
            if (socketRef.current) {
              socketRef.current.connect();
            }
            reconnectTimeoutRef.current = null;
          }, 3000);
        }
      });

      return () => {
        console.log('Disconnecting socket');
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        socketRef.current.disconnect();
        setSocketConnected(false);
      };
    }
  }, [selectedDoctor, user, lastMessageTimestamp]);

  // Add this after your other useEffect hooks
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (selectedDoctor) {
        setSelectedDoctor(null);
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [selectedDoctor]);

  // Function to fetch latest messages
  const fetchLatestMessages = async () => {
    if (!selectedDoctor || !user || !currentRoomIdRef.current) return;
    
    try {
      const roomId = currentRoomIdRef.current;
      let url = `${API_URL}/api/messages/${roomId}`;
      
      // Only fetch messages newer than our last message
      if (messages.length > 0 && lastMessageTimestamp) {
        url += `?since=${encodeURIComponent(lastMessageTimestamp)}`;
      }
      
      console.log('Fetching latest messages from:', url);
      const response = await axios.get(url);
      
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        console.log(`Received ${response.data.length} new messages`);
        
        // Transform data to match UI expectations
        const formattedMessages = response.data.map(msg => ({
          id: msg.id,
          text: msg.content || msg.text,
          senderId: msg.sender_id || msg.senderId,
          senderName: msg.sender_name || msg.senderName,
          receiverId: msg.receiver_id || msg.receiverId,
          timestamp: msg.created_at || msg.timestamp,
          roomId: msg.room_id || msg.roomId,
          isAttachment: msg.is_attachment === true || msg.isAttachment === true,
          attachmentType: msg.attachment_type || msg.attachmentType,
          fileUrl: msg.file_url || msg.fileUrl,
          fileName: msg.file_name || msg.fileName,
          fileType: msg.file_type || msg.fileType,
          fileSize: msg.file_size || msg.fileSize,
        }));
        
        // Update messages state with new messages
        setMessages(prevMessages => {
          // Filter out duplicates
          const existingIds = prevMessages.map(m => m.id);
          const newMessages = formattedMessages.filter(m => !existingIds.includes(m.id));
          
          if (newMessages.length > 0) {
            console.log(`Adding ${newMessages.length} new messages`);
            
            // Update last message timestamp
            if (newMessages.length > 0) {
              const latestMsg = newMessages.reduce((latest, msg) => {
                const msgTime = new Date(msg.timestamp);
                const latestTime = new Date(latest.timestamp);
                return msgTime > latestTime ? msg : latest;
              }, newMessages[0]);
              
              setLastMessageTimestamp(latestMsg.timestamp);
            }
            
            // Merge and sort by timestamp (most recent first)
            return [...newMessages, ...prevMessages].sort((a, b) => 
              new Date(b.timestamp) - new Date(a.timestamp)
            );
          }
          
          return prevMessages;
        });
      }
    } catch (error) {
      console.error('Error fetching latest messages:', error);
    }
  };

  // Rest of your component functionality...
  const fetchContactDetails = async (contactId) => {
    try {
      setContactDetails(null); // Reset previous details
      
      const token = await getAuthToken();
      const response = await axios.get(`${API_URL}/api/user-profile/${contactId}`, {
        headers: {
          Authorization: token,
        },
      });
      
      console.log('Contact details received:', response.data);
      setContactDetails(response.data);
    } catch (error) {
      console.error('Failed to fetch contact details:', error);
      Alert.alert('Error', 'Could not load contact information');
    }
  };

  // Move downloadAndCacheImage function inside component
  const downloadAndCacheImage = async imageUrl => {
    try {
      if (!imageUrl) return null;

      // Check if we already have this URL cached
      if (cachedImages[imageUrl]) {
        return cachedImages[imageUrl];
      }

      // Generate a unique filename based on the URL
      const filename = imageUrl.substring(imageUrl.lastIndexOf('/') + 1);
      const localPath = `${RNFS.CachesDirectoryPath}/${filename}`;

      // Check if file exists locally
      const exists = await RNFS.exists(localPath);
      if (exists) {
        console.log('Image already cached:', localPath);
        setCachedImages(prev => ({
          ...prev,
          [imageUrl]: `file://${localPath}`,
        }));
        return `file://${localPath}`;
      }

      // Download the file
      const downloadResult = await RNFS.downloadFile({
        fromUrl: imageUrl,
        toFile: localPath,
      }).promise;

      if (downloadResult.statusCode === 200) {
        console.log('Image cached successfully:', localPath);
        setCachedImages(prev => ({
          ...prev,
          [imageUrl]: `file://${localPath}`,
        }));
        return `file://${localPath}`;
      }
      return null;
    } catch (error) {
      console.error('Error caching image:', error);
      return null;
    }
  };

  const openPreview = item => {
    // Unify field names
    const fileData = {
      ...item,
      fileUrl: item.fileUrl || item.file_url,
      fileName: item.fileName || item.file_name,
      fileType: item.fileType || item.file_type,
      fileSize: item.fileSize || item.file_size,
    };

    console.log('Opening preview for:', fileData);
    setPreviewItem(fileData);
    setPreviewVisible(true);
  };

  const fetchMessageHistory = async () => {
    // Function implementation...
    if (!selectedDoctor || !user) return;

    try {
      let roomId;
      if (selectedDoctor.isAdminSupport) {
        // Use consistent admin room format
        roomId = `66768b81-2d00-4eca-9145-4cf11f687fe8-${user.id}`;
      } else {
        roomId = [user.id, selectedDoctor.id].sort().join('-');
      }

      console.log('Fetching messages for room:', roomId);

      // Check if we already have messages for this room in our chat history
      if (chatHistory[roomId] && chatHistory[roomId].length > 0) {
        console.log('Using cached messages for room:', roomId);
        setMessages(chatHistory[roomId]);
      }

      // Fetch messages from the server
      const response = await axios.get(`${API_URL}/api/messages/${roomId}`);
      console.log('Message history response:', response.data);

      if (response.data && Array.isArray(response.data)) {
        // Transform data to match UI expectations
        const formattedMessages = response.data.map(msg => ({
          id: msg.id,
          text: msg.content || msg.text,
          senderId: msg.sender_id || msg.senderId,
          senderName: msg.sender_name || msg.senderName,
          receiverId: msg.receiver_id || msg.receiverId,
          timestamp: msg.created_at || msg.timestamp,
          roomId: msg.room_id || msg.roomId,
          isAttachment: msg.is_attachment === true || msg.isAttachment === true,
          attachmentType: msg.attachment_type || msg.attachmentType,
          fileUrl: msg.file_url || msg.fileUrl,
          fileName: msg.file_name || msg.fileName,
          fileType: msg.file_type || msg.fileType,
          fileSize: msg.file_size || msg.fileSize,
        }));

        // Find the latest message timestamp
        if (formattedMessages.length > 0) {
          const latestMsg = formattedMessages.reduce((latest, msg) => {
            const msgTime = new Date(msg.timestamp);
            const latestTime = new Date(latest.timestamp);
            return msgTime > latestTime ? msg : latest;
          }, formattedMessages[0]);
          
          setLastMessageTimestamp(latestMsg.timestamp);
        }

        // Update both the current messages and the chat history
        setMessages(formattedMessages);
        setChatHistory(prev => ({
          ...prev,
          [roomId]: formattedMessages,
        }));
      }
    } catch (error) {
      console.error('Error fetching message history:', error);
      Alert.alert('Error', 'Failed to load message history.');
    }
  };

  // Function for pull-to-refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLatestMessages();
    setRefreshing(false);
  };

  // Search functionality
  const searchUsers = async query => {
  if (!query.trim() || query.length < 3) {
    setSearchResults([]);
    setNoResultsFound(false);
    return;
  }

  try {
    setSearching(true);

    const token = await getToken();
    const response = await axios.get(
      `${API_URL}/api/users/search-users?query=${encodeURIComponent(query.trim())}`,
      {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      },
    );

    // Filter out current user and include avatar_url in each result
    const filteredResults = response.data
      .filter(result => result.id !== user?.id)
      .map(result => ({
        ...result,
        avatar_url: result.avatar_url || null, // Ensure avatar_url is included
      }));

    console.log('Search results:', filteredResults.length);
    setSearchResults(filteredResults);
    setNoResultsFound(filteredResults.length === 0);
  } catch (error) {
    console.error('Error searching users:', error);
    setSearchResults([]);
    setNoResultsFound(true);
  } finally {
    setSearching(false);
  }
};

  // Handle search input changes
  const handleSearchChange = text => {
    setSearchQuery(text);
    debouncedSearch(text);
  };

  // Get auth token for file uploads
  const getAuthToken = async () => {
    try {
      // Try to get from AsyncStorage first
      let token = await AsyncStorage.getItem('@token');
      if (!token) {
        token = await AsyncStorage.getItem('token');
      }

      if (token) {
        // Make sure token has proper format
        return token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      }

      // If not in AsyncStorage, try to get from context
      if (user && user.token) {
        return user.token.startsWith('Bearer ')
          ? user.token
          : `Bearer ${user.token}`;
      }

      console.error('No valid auth token found');
      return null;
    } catch (error) {
      console.error('Failed to get auth token:', error);
      return null;
    }
  };

  // Functions for handling attachments
  const pickDocument = () => {
    setShowAttachmentOptions(false);
    setWebViewPickerVisible(true);
  };

  const handleWebViewFilesSelected = async files => {
    setWebViewPickerVisible(false);

    if (files && files.length > 0) {
      const file = files[0]; // Just use the first file for simplicity
      await sendFileMessage(file);
    }
  };

  const takePhoto = () => {
    setShowAttachmentOptions(false);

    const options = {
      mediaType: 'photo',
      quality: 0.8,
    };

    ImagePicker.launchCamera(options, async response => {
      if (response.didCancel) {
        console.log('User cancelled camera');
      } else if (response.errorCode) {
        Alert.alert('Error', 'Camera Error: ' + response.errorMessage);
      } else {
        const asset = response.assets[0];
        const file = {
          name: `Photo_${new Date().toISOString()}.jpg`,
          type: asset.type,
          uri: asset.uri,
          size: asset.fileSize,
        };
        await sendFileMessage(file);
      }
    });
  };

  const pickFromGallery = () => {
    setShowAttachmentOptions(false);

    const options = {
      mediaType: 'photo',
      quality: 0.8,
    };

    ImagePicker.launchImageLibrary(options, async response => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        Alert.alert('Error', 'ImagePicker Error: ' + response.errorMessage);
      } else {
        const asset = response.assets[0];
        const file = {
          name: asset.fileName || `Image_${new Date().toISOString()}.jpg`,
          type: asset.type,
          uri: asset.uri,
          size: asset.fileSize,
        };
        await sendFileMessage(file);
      }
    });
  };

  const sendFileMessage = async file => {
    if (!selectedDoctor || !user) return;

    try {
      setUploading(true);

      // Upload the file first
      const token = await getAuthToken();
      if (!token) {
        Alert.alert('Error', 'Authentication required');
        return;
      }

      // Create form data with proper structure for express-fileupload
      const formData = new FormData();

      // IMPORTANT: The field name must be 'document' to match server expectations
      formData.append('document', {
        uri: Platform.OS === 'ios' ? file.uri.replace('file://', '') : file.uri,
        type: file.type || 'application/octet-stream',
        name: file.name || `file-${Date.now()}.${file.uri.split('.').pop()}`,
      });

      // Use the API_URL correctly without the /api prefix in the URL, as it's already included
      const response = await fetch(
        `${API_URL}/api/uploads/chat-document?userId=${user.id}`,
        {
          method: 'POST',
          headers: {
            Authorization: token,
            // DO NOT set Content-Type header - let fetch set it automatically
          },
          body: formData,
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload failed:', errorText);
        throw new Error(`Upload failed: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log('File upload result:', result);

      // Use consistent room ID logic
      let roomId;
      if (selectedDoctor.isAdminSupport) {
        roomId = `66768b81-2d00-4eca-9145-4cf11f687fe8-${user.id}`;
      } else {
        roomId = [user.id, selectedDoctor.id].sort().join('-');
      }

      const tempId = `temp-${Date.now()}`;
      const isImage = file.type && file.type.includes('image');

      const messageData = {
        text: isImage ? '📷 Image' : '📎 Document: ' + file.name,
        content: isImage ? '📷 Image' : '📎 Document: ' + file.name,
        senderId: user.id,
        sender_id: user.id,
        senderName: user.name,
        sender_name: user.name,
        receiverId: selectedDoctor.isAdminSupport
          ? '66768b81-2d00-4eca-9145-4cf11f687fe8'
          : selectedDoctor.id,
        receiver_id: selectedDoctor.isAdminSupport
          ? '66768b81-2d00-4eca-9145-4cf11f687fe8'
          : selectedDoctor.id,
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
        roomId: roomId,
        room_id: roomId,
        // Add file metadata
        fileType: file.type,
        fileName: file.name,
        fileUrl: result.url,
        file_size: file.size,
        is_attachment: true,
        isAttachment: true,
        attachment_type: isImage ? 'image' : 'document',
        file_type: file.type,
        file_name: file.name,
        file_url: result.url,
        file_size: file.size,
      };

      // Create temporary message
      const tempMessage = {
        ...messageData,
        id: tempId,
        pending: true,
      };

      // Update UI immediately
      setMessages(prevMessages => [tempMessage, ...prevMessages]);

      // Update chat history
      setChatHistory(prev => {
        const currentMessages = prev[roomId] || [];
        return {
          ...prev,
          [roomId]: [tempMessage, ...currentMessages],
        };
      });

      // Send via socket or HTTP
      if (socketConnected) {
        try {
          socketRef.current.emit('send_message', {...messageData, tempId});
        } catch (socketError) {
          console.error('Error sending file message via socket:', socketError);
          sendMessageViaHttp(messageData, tempId);
        }
      } else {
        sendMessageViaHttp(messageData, tempId);
      }

      // Refresh the chat list after sending a message
      setTimeout(() => {
        fetchRecentChats();
      }, 500);
    } catch (error) {
      console.error('Error sending file message:', error);
      Alert.alert('Error', 'Failed to send file: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const sendMessage = () => {
    if (newMessage.trim().length === 0 || !selectedDoctor || !user) {
      return;
    }

    let roomId;
    if (selectedDoctor.isAdminSupport) {
      roomId = `66768b81-2d00-4eca-9145-4cf11f687fe8-${user.id}`;
    } else {
      roomId = [user.id, selectedDoctor.id].sort().join('-');
    }

    const tempId = `temp-${Date.now()}`;

    const messageData = {
      text: newMessage.trim(),
      content: newMessage.trim(),
      senderId: user.id,
      sender_id: user.id,
      senderName: user.name,
      sender_name: user.name,
      receiverId: selectedDoctor.isAdminSupport
        ? '66768b81-2d00-4eca-9145-4cf11f687fe8'
        : selectedDoctor.id,
      receiver_id: selectedDoctor.isAdminSupport
        ? '66768b81-2d00-4eca-9145-4cf11f687fe8'
        : selectedDoctor.id,
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
      roomId: roomId,
      room_id: roomId,
      messageType: 'text',
      message_type: 'text',
    };

    // Clear input field immediately
    setNewMessage('');

    // Create temporary message with pending status to display immediately
    const tempMessage = {
      ...messageData,
      id: tempId,
      pending: true,
    };

    // Add message to UI immediately
    setMessages(prevMessages => [tempMessage, ...prevMessages]);

    // Also update chat history
    setChatHistory(prev => {
      const currentMessages = prev[roomId] || [];
      return {
        ...prev,
        [roomId]: [tempMessage, ...currentMessages],
      };
    });

    // Try to send via socket first
    if (socketConnected) {
      try {
        // Add the temp ID to help with matching the response later
        socketRef.current.emit('send_message', {...messageData, tempId});
      } catch (socketError) {
        console.error('Error sending message via socket:', socketError);
        // Fall back to HTTP if socket fails
        sendMessageViaHttp(messageData, tempId);
      }
    } else {
      // Socket not connected, use HTTP
      sendMessageViaHttp(messageData, tempId);
    }

    // Refresh the chat list after sending a message
    setTimeout(() => {
      fetchRecentChats();
    }, 500);
  };

  // Fallback HTTP method to send messages
  const sendMessageViaHttp = async (messageData, tempId) => {
    try {
      const response = await axios.post(`${API_URL}/api/messages`, messageData);

      if (response.data && response.data.success) {
        // Replace the pending message with the confirmed one
        const confirmedMessage = {
          ...messageData,
          id: response.data.id || messageData.id,
          tempId: tempId, // Include tempId to help with matching
          pending: false,
        };

        updateMessageStatus(confirmedMessage);
      }
    } catch (error) {
      console.error('Error sending message via HTTP:', error);
      Alert.alert(
        'Message Delivery Issue',
        'Your message may not have been saved. Please try again.',
      );
    }
  };

  // Update message status function
  const updateMessageStatus = confirmedMessage => {
    console.log('Updating message status:', confirmedMessage);
    const roomId = confirmedMessage.roomId || confirmedMessage.room_id;
    const tempId = confirmedMessage.tempId; // Look for tempId if available

    // Ensure we have a valid room ID
    if (!roomId) {
      console.error('No room ID in confirmed message:', confirmedMessage);
      return;
    }

    // Create the confirmed message object with consistent field names
    const updatedMessage = {
      id: confirmedMessage.id,
      text: confirmedMessage.text || confirmedMessage.content,
      senderId: confirmedMessage.senderId || confirmedMessage.sender_id,
      senderName: confirmedMessage.senderName || confirmedMessage.sender_name,
      receiverId: confirmedMessage.receiverId || confirmedMessage.receiver_id,
      timestamp: confirmedMessage.timestamp || confirmedMessage.created_at,
      roomId: confirmedMessage.roomId || confirmedMessage.room_id,
      documentUrl:
        confirmedMessage.documentUrl || confirmedMessage.document_url,
      documentName:
        confirmedMessage.documentName || confirmedMessage.document_name,
      documentType:
        confirmedMessage.documentType || confirmedMessage.document_type,
      messageType:
        confirmedMessage.messageType ||
        confirmedMessage.message_type ||
        (confirmedMessage.documentUrl || confirmedMessage.document_url
          ? 'document'
          : 'text'),
      pending: false,
      isAttachment:
        confirmedMessage.isAttachment ||
        confirmedMessage.is_attachment ||
        false,
      attachmentType:
        confirmedMessage.attachmentType || confirmedMessage.attachment_type,
      fileUrl: confirmedMessage.fileUrl || confirmedMessage.file_url,
      fileName: confirmedMessage.fileName || confirmedMessage.file_name,
      fileType: confirmedMessage.fileType || confirmedMessage.file_type,
      fileSize: confirmedMessage.fileSize || confirmedMessage.file_size,
    };

    // Update displayed messages if this is the current room
    if (currentRoomIdRef.current === roomId) {
      setMessages(prevMessages => {
        return prevMessages.map(msg => {
          // Match by tempId if available, otherwise by content and sender
          if (
            (tempId && msg.id === tempId) ||
            (msg.pending &&
              msg.text === updatedMessage.text &&
              msg.senderId === updatedMessage.senderId)
          ) {
            return updatedMessage;
          }
          return msg;
        });
      });
    }

    // Always update the chat history
    setChatHistory(prev => {
      const roomMessages = prev[roomId] || [];

      // Update pending messages in this room
      const updatedRoomMessages = roomMessages.map(msg => {
        // Match by tempId if available, otherwise by content and sender
        if (
          (tempId && msg.id === tempId) ||
          (msg.pending &&
            msg.text === updatedMessage.text &&
            msg.senderId === updatedMessage.senderId)
        ) {
          return updatedMessage;
        }
        return msg;
      });

      return {
        ...prev,
        [roomId]: updatedRoomMessages,
      };
    });
  };

  // Search functionality
  const getFilteredMessages = () => {
    if (!searchQuery.trim()) return messages;

    return messages.filter(message =>
      message.text.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  };

  const toggleSearch = () => {
    setSearchVisible(!searchVisible);
    if (searchVisible) {
      setSearchQuery('');
    }
  };

  // Function to retry connecting to the server
  const retryConnection = () => {
    if (socketRef.current) {
      console.log('Manually retrying connection...');
      socketRef.current.connect();
    }
  };

  // Fetch recent chats
  const fetchRecentChats = useCallback(async () => {
  if (!user) return;

  try {
    console.log('Fetching recent chats for user:', user.id);
    const response = await axios.get(`${API_URL}/api/chat-rooms/${user.id}`);

    if (response.data && Array.isArray(response.data)) {
      console.log(`Found ${response.data.length} recent chats`);

      // Transform the chat rooms into a format suitable for display
      const processedChats = response.data.map(room => {
        // Determine the other user in the conversation
        const otherUser = room.user1_id === user.id ? room.user2 : room.user1;

        return {
          id: otherUser?.id || 'unknown',
          name: otherUser?.name || 'Unknown User',
          role: otherUser?.role || 'user',
          avatar_url: otherUser?.avatar_url || null, // Include avatar_url
          roomId: room.id,
          lastMessage: room.last_message?.content || null,
          lastMessageTime:
            room.last_message?.created_at ||
            room.updated_at ||
            room.created_at,
          unreadCount: room.unread_count || 0,
          isAdminSupport:
            otherUser?.role === 'admin' || room.room_id?.startsWith('admin-'),
        };
      });

      setRecentChats(processedChats);
    }
  } catch (error) {
    console.error('Error fetching recent chats:', error);
  }
}, [user?.id]);

  // Call fetchRecentChats on initial load and after sending a message
  useEffect(() => {
    fetchRecentChats();
  }, [fetchRecentChats]);

  // UI Components
  const renderDoctor = ({item}) => (
  <TouchableOpacity
    style={[
      styles.doctorItem,
      selectedDoctor?.id === item.id && styles.selectedDoctor,
      item.isAdminSupport && styles.adminSupportItem,
    ]}
    onPress={() => setSelectedDoctor({
      ...item,
      avatar_url: item.avatar_url, // Make sure to pass avatar_url
    })}>
    <View
      style={[
        styles.avatarContainer,
        item.isAdminSupport && styles.adminAvatarContainer,
      ]}>
      {item.isAdminSupport ? (
        <Icon name="headset" size={26} color="#fff" />
      ) : item.avatar_url ? (
        <Image 
          source={{uri: item.avatar_url}} 
          style={styles.doctorAvatarImage}
          onError={() => console.log(`Failed to load avatar for doctor ${item.name}`)}
        />
      ) : (
        <Text style={styles.avatarText}>
          {item.name ? item.name.charAt(0).toUpperCase() : '?'}
        </Text>
      )}
    </View>
    <View style={styles.doctorInfo}>
      <Text
        style={[
          styles.doctorName,
          selectedDoctor?.id === item.id && styles.selectedDoctorText,
        ]}>
        {item.name || 'Unknown'}
      </Text>
      <Text
        style={[
          styles.doctorSpecialization,
          selectedDoctor?.id === item.id && styles.selectedDoctorText,
        ]}>
        {item.isAdminSupport ? 'Technical Support' : item.degree || 'General'}
      </Text>
    </View>
  </TouchableOpacity>
);

  const renderMessage = ({item, index}) => {
    // Keep date separator logic
    const currentDate = new Date(item.timestamp);
    const currentDateStr = currentDate.toDateString();
    const messages = getFilteredMessages();
    const nextMessage =
      index < messages.length - 1 ? messages[index + 1] : null;
    const nextDateStr = nextMessage
      ? new Date(nextMessage.timestamp).toDateString()
      : null;
    const showDateSeparator =
      nextDateStr === null || currentDateStr !== nextDateStr;
    const formattedDate = currentDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    
    // Helper function to handle attachment press
    const handleAttachmentPress = (message) => {
      // Reuse the existing openPreview function
      openPreview(message);
    };

    // Normalize message data structure to match what MessageItem expects
    const normalizedMessage = {
      id: item.id,
      content: item.text || item.content,
      sender_id: item.senderId || item.sender_id,
      sender_name: item.senderName || item.sender_name,
      receiver_id: item.receiverId || item.receiver_id,
      created_at: item.timestamp || item.created_at,
      is_attachment: item.isAttachment || item.is_attachment || false,
      attachment_type: item.attachmentType || item.attachment_type,
      file_url: item.fileUrl || item.file_url,
      file_name: item.fileName || item.file_name,
      file_type: item.fileType || item.file_type,
      file_size: item.fileSize || item.file_size,
      pending: item.pending || false
    };

    return (
      <>
      <MessageItem 
        message={normalizedMessage}
        currentUserId={user?.id}
        onAttachmentPress={handleAttachmentPress}
      />
      
      {showDateSeparator && (
        <View style={styles.dateSeparator}>
          <View style={styles.line} />
          <Text style={styles.dateSeparatorText}>{formattedDate}</Text>
          <View style={styles.line} />
        </View>
      )}
      </>
    );
  };
const renderChatHeader = () => {
  if (!selectedDoctor) return null;

  return (
    <View style={styles.chatHeader}>
      <TouchableOpacity
        style={styles.headerBackButton}
        onPress={() => setSelectedDoctor(null)}>
        <Icon name="arrow-left" size={24} color="#333" />
      </TouchableOpacity>

      {/* Updated Avatar Container */}
      <View style={styles.avatarContainer}>
        {selectedDoctor.isAdminSupport ? (
          // Admin support shows headset icon
          <Icon name="headset" size={26} color="#fff" />
        ) : selectedDoctor.avatar_url ? (
          // Doctor with profile picture
          <Image 
            source={{ uri: selectedDoctor.avatar_url }} 
            style={styles.headerAvatarImage}
            onError={(e) => {
              console.log('Failed to load header avatar:', e.nativeEvent.error);
            }}
          />
        ) : (
          // Fallback to initials
          <Text style={styles.avatarText}>
            {selectedDoctor.name ? selectedDoctor.name.charAt(0).toUpperCase() : '?'}
          </Text>
        )}
      </View>

      {/* Make the title container clickable */}
      <TouchableOpacity 
        style={styles.headerTitleContainer}
        onPress={() => setProfileModalVisible(true)}>
        <Text style={styles.headerTitle}>{selectedDoctor.name}</Text>
        <Text style={styles.headerSubtitle}>
          {socketConnected ? 'online' : 'offline'}
        </Text>
      </TouchableOpacity>

      <View style={styles.headerActions}>
        <TouchableOpacity style={styles.headerButton} onPress={toggleSearch}>
          <Icon name="magnify" size={22} color="#666" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerButton}>
          <Icon name="dots-vertical" size={22} color="#666" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

  const renderUserSearchResult = ({item}) => (
  <TouchableOpacity
    style={styles.searchResultItem}
    onPress={() => {
      setSelectedDoctor({
        ...item,
        avatar_url: item.avatar_url, // Make sure avatar_url is included
      });
      setSearchVisible(false);
      setSearchQuery('');
    }}>
    
    {/* Search Result Profile Picture */}
    <View style={styles.avatarContainer}>
      {item.avatar_url ? (
        <Image 
          source={{uri: item.avatar_url}} 
          style={styles.searchResultAvatarImage}
          onError={() => console.log(`Failed to load search result avatar for ${item.name}`)}
        />
      ) : (
        <Text style={styles.avatarText}>
          {item.name ? item.name.charAt(0).toUpperCase() : '?'}
        </Text>
      )}
    </View>

    <View style={styles.searchResultInfo}>
      <Text style={styles.searchResultName}>
        {item.name || 'Unnamed User'}
      </Text>
      <Text style={styles.searchResultDetail}>
        {item.degree && <Text style={styles.degreeText}>{item.degree} • </Text>}
        {item.email || item.phone || 'No contact info'}
      </Text>
    </View>

    <Icon name="message-text-outline" size={20} color="#2e7af5" />
  </TouchableOpacity>
);

  // Update the renderSearchInterface function with these changes:

const renderSearchInterface = () => (
  <View style={styles.searchInterfaceContainer}>
    <Text style={styles.searchTitle}>Connect Here!</Text>
    <Text style={styles.searchSubtitle}>
      Search for a doctor by email or phone to start a conversation
    </Text>

    <View style={styles.searchBarContainer}>
      <Icon name="magnify" size={20} color="#666" style={styles.searchIcon} />
      <TextInput
        ref={searchInputRef}
        style={styles.searchBarInput}
        placeholder="Search by email or phone number"
        placeholderTextColor="#999999" 
        value={searchQuery}
        onChangeText={handleSearchChange}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      {searchQuery.length > 0 && (
        <TouchableOpacity
          onPress={() => {
            setSearchQuery('');
            setSearchResults([]);
            setNoResultsFound(false);
          }}
          style={styles.clearButton}>
          <Icon name="close-circle" size={18} color="#888" />
        </TouchableOpacity>
      )}
    </View>

    {searching ? (
      <View style={styles.searchStatusContainer}>
        <ActivityIndicator size="small" color="#2e7af5" />
        <Text style={styles.searchingText}>Searching...</Text>
      </View>
    ) : searchQuery.length > 0 ? (
      // Show search results only when there's a search query
      noResultsFound ? (
        <View style={styles.searchStatusContainer}>
          <Icon name="account-search-outline" size={40} color="#ccc" />
          <Text style={styles.noResultsText}>No matching users found</Text>
          <Text style={styles.noResultsSubText}>
            Try a different email address or phone number
          </Text>
        </View>
      ) : searchResults.length > 0 ? (
        // Display search results when available
        <View style={styles.searchResultsSection}>
          <Text style={styles.resultsHeader}>Search Results</Text>
          <FlatList
            data={searchResults}
            renderItem={renderUserSearchResult}
            keyExtractor={item => item.id}
            style={styles.searchResultsList}
          />
        </View>
      ) : null
    ) : (
      // Show recent chats only when not searching
      recentChats.length > 0 && (
        <>
          <Text style={styles.recentChatsHeader}>Recent Conversations</Text>
          <FlatList
            data={recentChats}
            renderItem={renderRecentChat}
            keyExtractor={item => item.id}
            style={styles.recentChatsList}
          />
        </>
      )
    )}

    {/* Only show admin support option when not actively searching */}
    {!searchQuery.length > 0 && (
      <View style={styles.adminSupportContainer}>
        <Text style={styles.orDivider}>OR</Text>
        <TouchableOpacity
          style={styles.adminSupportButton}
          onPress={() =>
            setSelectedDoctor({
              id: 'admin',
              name: 'Support Team',
              role: 'admin',
              isAdminSupport: true,
            })
          }>
          <Icon name="headset" size={24} color="#fff" />
          <Text style={styles.adminSupportButtonText}>
            Contact Admin Support
          </Text>
        </TouchableOpacity>
      </View>
    )}
  </View>
);

  // Add a new render function for recent chats
 const renderRecentChat = ({item}) => {
  const isAdminChat = item.isAdminSupport;

  return (
    <TouchableOpacity
      style={styles.recentChatItem}
      onPress={() =>
        setSelectedDoctor({
          id: item.id,
          name: item.name,
          role: item.role,
          isAdminSupport: isAdminChat,
          avatar_url: item.avatar_url, // Include avatar_url
        })
      }>
      <View
        style={[
          styles.avatarContainer,
          isAdminChat && styles.adminAvatarContainer,
        ]}>
        {isAdminChat ? (
          <Icon name="headset" size={26} color="#fff" />
        ) : item.avatar_url ? (
          <Image 
            source={{uri: item.avatar_url}} 
            style={styles.recentChatAvatarImage}
            onError={() => console.log(`Failed to load avatar for ${item.name}`)}
          />
        ) : (
          <Text style={styles.avatarText}>
            {item.name ? item.name.charAt(0).toUpperCase() : '?'}
          </Text>
        )}
      </View>

      <View style={styles.chatInfo}>
        <View style={styles.chatTopRow}>
          <Text style={styles.chatName}>{item.name}</Text>
          {item.lastMessageTime && (
            <Text style={styles.chatTime}>
              {formatChatTime(new Date(item.lastMessageTime))}
            </Text>
          )}
        </View>

        {item.lastMessage && (
          <Text style={styles.chatPreview} numberOfLines={1}>
            {item.lastMessage}
          </Text>
        )}
      </View>

      {item.unreadCount > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadCount}>{item.unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

  // Helper function to format chat times
  const formatChatTime = date => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (date >= today) {
      // Today - show time only
      return date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
    } else if (date >= new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000)) {
      // Within the last week - show day name
      return date.toLocaleDateString([], {weekday: 'short'});
    } else {
      // Older - show date
      return date.toLocaleDateString([], {month: 'short', day: 'numeric'});
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#128C7E" />
      </View>
    );
  }

  // Main Component Render
  return (
    <SafeAreaView style={[styles.container, {paddingTop: insets.top}]}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />

      {selectedDoctor ? (
        <View style={styles.container}>
          {renderChatHeader()}

          {searchVisible && (
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search messages..."
                autoFocus
              />
              <TouchableOpacity
                style={styles.searchCancelButton}
                onPress={toggleSearch}>
                <Text style={styles.searchCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}

          <FlatList
            ref={flatListRef}
            data={getFilteredMessages()}
            renderItem={renderMessage}
            keyExtractor={(item, index) =>
              item.id?.toString() || `${item.timestamp}-${index}`
            }
            inverted
            style={styles.messagesList}
            contentContainerStyle={styles.messagesListContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={["#2e7af5"]}
                tintColor="#2e7af5"
              />
            }
            ListEmptyComponent={
              <Text style={styles.emptyMessagesText}>
                {searchQuery
                  ? 'No messages match your search'
                  : 'No messages yet'}
              </Text>
            }
          />

          {uploading && (
            <View style={styles.uploadingContainer}>
              <ActivityIndicator size="small" color="#2e7af5" />
              <Text style={styles.uploadingText}>Uploading document...</Text>
            </View>
          )}

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            style={styles.inputContainer}>
            <View style={styles.inputRow}>
              <TouchableOpacity
                style={styles.attachButton}
                onPress={() => setShowAttachmentOptions(true)}>
                <Icon name="attachment" size={24} color="#757575" />
              </TouchableOpacity>

              <TextInput
                style={styles.input}
                value={newMessage}
                onChangeText={setNewMessage}
                placeholder="Message"
                multiline
              />

              <TouchableOpacity
                style={styles.sendButton}
                onPress={sendMessage}
                disabled={!newMessage.trim() || uploading}>
                {uploading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.sendButtonIcon}>
                    {newMessage.trim() ? '➤' : '➤'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>

          <Modal
            transparent={true}
            visible={showAttachmentOptions}
            animationType="slide"
            onRequestClose={() => setShowAttachmentOptions(false)}>
            <TouchableOpacity
              style={styles.attachmentModalOverlay}
              activeOpacity={1}
              onPress={() => setShowAttachmentOptions(false)}>
              <View style={styles.attachmentModalContainer}>
                <TouchableOpacity
                  style={styles.attachmentOption}
                  onPress={pickDocument}>
                  <Icon
                    name="file-document-outline"
                    size={28}
                    color="#2e7af5"
                  />
                  <Text style={styles.attachmentOptionText}>Document</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.attachmentOption}
                  onPress={takePhoto}>
                  <Icon name="camera" size={28} color="#2e7af5" />
                  <Text style={styles.attachmentOptionText}>Camera</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.attachmentOption}
                  onPress={pickFromGallery}>
                  <Icon name="image" size={28} color="#2e7af5" />
                  <Text style={styles.attachmentOptionText}>Gallery</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>

          <WebViewDocumentPicker
            visible={webViewPickerVisible}
            onClose={() => setWebViewPickerVisible(false)}
            onFilesSelected={handleWebViewFilesSelected}
          />

          {/* Enhanced Profile Modal */}
          <Modal
            visible={profileModalVisible}
            transparent={false}
            animationType="slide"
            onRequestClose={() => setProfileModalVisible(false)}>
            <SafeAreaView style={styles.profileModalContainer}>
              {/* Profile Modal Header */}
              <View style={styles.profileModalHeader}>
                <TouchableOpacity
                  style={styles.profileModalBackButton}
                  onPress={() => setProfileModalVisible(false)}>
                  <Icon name="arrow-left" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.profileModalTitle}>Doctor Profile</Text>
              </View>

              {/* Profile Content */}
              <ScrollView style={styles.profileModalContent}>
                {!contactDetails ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2e7af5" />
                    <Text style={styles.loadingText}>Loading profile...</Text>
                  </View>
                ) : (
                  <View style={styles.profileDetailsContainer}>
                    {/* Profile Header with Avatar */}
                    <View style={styles.profileHeaderSection}>
                      <View style={styles.profileAvatarLarge}>
                        {contactDetails.avatar_url ? (
                          <Image
                            source={{ uri: contactDetails.avatar_url }}
                            style={styles.profileAvatarImage}
                          />
                        ) : (
                          <Text style={styles.profileAvatarText}>
                            {contactDetails.name ? contactDetails.name.charAt(0) : '?'}
                          </Text>
                        )}
                      </View>
                      
                      <Text style={styles.profileName}>{contactDetails.name}</Text>
                      
                      <View style={styles.profileRoleBadge}>
                        <Text style={styles.profileRoleText}>
                          {contactDetails.role === 'doctor' ? 'Healthcare Professional' : 
                           contactDetails.role === 'pharma' ? 'Pharmaceutical Rep' : 
                           contactDetails.role}
                        </Text>
                      </View>

                      {/* Verification Status */}
                      <View style={styles.verificationContainer}>
                        {contactDetails.verified ? (
                          <View style={styles.verifiedBadge}>
                            <Icon name="check-decagram" size={16} color="#4CAF50" />
                            <Text style={styles.verifiedText}>Verified</Text>
                          </View>
                        ) : (
                          <View style={styles.unverifiedBadge}>
                            <Icon name="clock-outline" size={16} color="#FF9800" />
                            <Text style={styles.unverifiedText}>Pending Verification</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Contact Information Section */}
                    <View style={styles.profileSection}>
                      <Text style={styles.profileSectionTitle}>
                        Contact Information
                      </Text>

                      <View style={styles.profileInfoItem}>
                        <Icon name="email-outline" size={20} color="#666" />
                        <View style={styles.profileInfoContent}>
                          <Text style={styles.profileInfoLabel}>Email</Text>
                          <Text style={styles.profileInfoText}>
                            {contactDetails.email}
                          </Text>
                        </View>
                      </View>

                      {contactDetails.phone && (
                        <View style={styles.profileInfoItem}>
                          <Icon name="phone-outline" size={20} color="#666" />
                          <View style={styles.profileInfoContent}>
                            <Text style={styles.profileInfoLabel}>Phone</Text>
                            <Text style={styles.profileInfoText}>
                              {contactDetails.phone}
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>

                    {/* Professional Information Section - Enhanced for Doctors */}
                    {contactDetails.role === 'doctor' && (
                      <View style={styles.profileSection}>
                        <Text style={styles.profileSectionTitle}>
                          Professional Information
                        </Text>

                        {contactDetails.degree && (
                          <View style={styles.profileInfoItem}>
                            <Icon
                              name="school-outline"
                              size={20}
                              color="#666"
                            />
                            <View style={styles.profileInfoContent}>
                              <Text style={styles.profileInfoLabel}>
                                Medical Specialty
                              </Text>
                              <Text style={styles.profileInfoText}>
                                {contactDetails.degree}
                              </Text>
                            </View>
                          </View>
                        )}

                        {/* Medical License/Registration Info */}
                        <View style={styles.profileInfoItem}>
                          <Icon
                            name="card-account-details-outline"
                            size={20}
                            color="#666"
                          />
                          <View style={styles.profileInfoContent}>
                            <Text style={styles.profileInfoLabel}>
                              Documents Uploaded
                            </Text>
                            <Text style={styles.profileInfoText}>
                              {contactDetails.totalDocuments || 0} documents
                              {contactDetails.verifiedDocuments > 0 &&
                                ` (${contactDetails.verifiedDocuments} verified)`}
                            </Text>
                          </View>
                        </View>

                        {/* Email Verification Status */}
                        <View style={styles.profileInfoItem}>
                          <Icon
                            name="email-check-outline"
                            size={20}
                            color="#666"
                          />
                          <View style={styles.profileInfoContent}>
                            <Text style={styles.profileInfoLabel}>
                              Email Status
                            </Text>
                            <Text
                              style={[
                                styles.profileInfoText,
                                contactDetails.email_verified
                                  ? styles.verifiedTextGreen
                                  : styles.unverifiedTextOrange,
                              ]}>
                              {contactDetails.email_verified
                                ? 'Verified'
                                : 'Unverified'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    )}

                    {/* Company Information Section - Enhanced for Pharma */}
                    {contactDetails.role === 'pharma' && (
                      <View style={styles.profileSection}>
                        <Text style={styles.profileSectionTitle}>
                          Company Information
                        </Text>

                        {contactDetails.company && (
                          <View style={styles.profileInfoItem}>
                            <Icon name="domain" size={20} color="#666" />
                            <View style={styles.profileInfoContent}>
                              <Text style={styles.profileInfoLabel}>
                                Company
                              </Text>
                              <Text style={styles.profileInfoText}>
                                {contactDetails.company}
                              </Text>
                            </View>
                          </View>
                        )}

                        {contactDetails.role_in_company && (
                          <View style={styles.profileInfoItem}>
                            <Icon
                              name="briefcase-outline"
                              size={20}
                              color="#666"
                            />
                            <View style={styles.profileInfoContent}>
                              <Text style={styles.profileInfoLabel}>
                                Position
                              </Text>
                              <Text style={styles.profileInfoText}>
                                {contactDetails.role_in_company}
                              </Text>
                            </View>
                          </View>
                        )}

                        {/* Company Documents Info */}
                        <View style={styles.profileInfoItem}>
                          <Icon
                            name="file-document-multiple-outline"
                            size={20}
                            color="#666"
                          />
                          <View style={styles.profileInfoContent}>
                            <Text style={styles.profileInfoLabel}>
                              Company Documents
                            </Text>
                            <Text style={styles.profileInfoText}>
                              {contactDetails.totalDocuments || 0} documents
                              uploaded
                            </Text>
                          </View>
                        </View>
                      </View>
                    )}

                    {/* Achievements Section - Enhanced */}
                    {contactDetails.achievements &&
                      contactDetails.achievements.length > 0 && (
                        <View style={styles.profileSection}>
                          <Text style={styles.profileSectionTitle}>
                            Achievements & Certifications
                          </Text>

                          {contactDetails.achievements.map(
                            (achievement, index) => (
                              <View key={index} style={styles.achievementItem}>
                                <Icon
                                  name="trophy-outline"
                                  size={20}
                                  color="#E6A817"
                                />
                                <View style={styles.achievementContent}>
                                  {achievement.title && (
                                    <Text style={styles.achievementTitle}>
                                      {achievement.title}
                                    </Text>
                                  )}
                                  {achievement.description && (
                                    <Text style={styles.achievementDescription}>
                                      {achievement.description}
                                    </Text>
                                  )}
                                  {achievement.year && (
                                    <Text style={styles.achievementYear}>
                                      Year: {achievement.year}
                                    </Text>
                                  )}
                                  {achievement.institution && (
                                    <Text style={styles.achievementInstitution}>
                                      Institution: {achievement.institution}
                                    </Text>
                                  )}
                                </View>
                              </View>
                            ),
                          )}
                        </View>
                      )}

                    {/* Account Information Section - Enhanced */}
                    <View style={styles.profileSection}>
                      <Text style={styles.profileSectionTitle}>
                        Account Information
                      </Text>

                      <View style={styles.profileInfoItem}>
                        <Icon name="calendar-outline" size={20} color="#666" />
                        <View style={styles.profileInfoContent}>
                          <Text style={styles.profileInfoLabel}>
                            Member Since
                          </Text>
                          <Text style={styles.profileInfoText}>
                            {new Date(
                              contactDetails.created_at,
                            ).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.profileInfoItem}>
                        <Icon name="update" size={20} color="#666" />
                        <View style={styles.profileInfoContent}>
                          <Text style={styles.profileInfoLabel}>
                            Last Updated
                          </Text>
                          <Text style={styles.profileInfoText}>
                            {new Date(
                              contactDetails.updated_at,
                            ).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </Text>
                        </View>
                      </View>

                      {/* Overall Verification Status */}
                      <View style={styles.profileInfoItem}>
                        <Icon
                          name="shield-check-outline"
                          size={20}
                          color="#666"
                        />
                        <View style={styles.profileInfoContent}>
                          <Text style={styles.profileInfoLabel}>
                            Verification Status
                          </Text>
                          <View style={styles.verificationStatusContainer}>
                            {contactDetails.verified ? (
                              <View style={styles.statusBadgeGreen}>
                                <Icon name="check" size={14} color="#fff" />
                                <Text style={styles.statusBadgeText}>
                                  Fully Verified
                                </Text>
                              </View>
                            ) : (
                              <View style={styles.statusBadgeOrange}>
                                <Icon name="clock" size={14} color="#fff" />
                                <Text style={styles.statusBadgeText}>
                                  Under Review
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Quick Stats Section */}
                    <View style={styles.profileSection}>
                      <Text style={styles.profileSectionTitle}>
                        Quick Stats
                      </Text>

                      <View style={styles.statsContainer}>
                        <View style={styles.statItem}>
                          <Icon
                            name="file-document-outline"
                            size={24}
                            color="#2e7af5"
                          />
                          <Text style={styles.statNumber}>
                            {contactDetails.totalDocuments || 0}
                          </Text>
                          <Text style={styles.statLabel}>Documents</Text>
                        </View>

                        <View style={styles.statItem}>
                          <Icon
                            name="check-circle-outline"
                            size={24}
                            color="#4CAF50"
                          />
                          <Text style={styles.statNumber}>
                            {contactDetails.verifiedDocuments || 0}
                          </Text>
                          <Text style={styles.statLabel}>Verified</Text>
                        </View>

                        <View style={styles.statItem}>
                          <Icon
                            name="trophy-outline"
                            size={24}
                            color="#E6A817"
                          />
                          <Text style={styles.statNumber}>
                            {(contactDetails.achievements &&
                              contactDetails.achievements.length) ||
                              0}
                          </Text>
                          <Text style={styles.statLabel}>Achievements</Text>
                        </View>
                      </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.profileActionsContainer}>
                      <TouchableOpacity
                        style={styles.profileActionButton}
                        onPress={() => {
                          setProfileModalVisible(false);
                          // Continue in the chat
                        }}>
                        <Icon name="chat" size={22} color="#fff" />
                        <Text style={styles.profileActionButtonText}>
                          Continue Chat
                        </Text>
                      </TouchableOpacity>

                      {contactDetails.phone && (
                        <TouchableOpacity
                          style={styles.profileActionButtonSecondary}
                          onPress={() => {
                            // You can add phone call functionality here
                            Alert.alert(
                              'Contact',
                              `Call ${contactDetails.phone}?`,
                            );
                          }}>
                          <Icon name="phone" size={22} color="#2e7af5" />
                          <Text style={styles.profileActionButtonTextSecondary}>
                            Call
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}
              </ScrollView>
            </SafeAreaView>
          </Modal>
        </View>
      ) : (
        renderSearchInterface()
      )}

      <Modal
        visible={previewVisible}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setPreviewVisible(false)}>
        <SafeAreaView style={styles.previewContainer}>
          <View style={styles.previewHeader}>
            <TouchableOpacity
              style={styles.previewCloseButton}
              onPress={() => setPreviewVisible(false)}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.previewContent}>
            {previewItem &&
            previewItem.fileType &&
            previewItem.fileType.includes('image') ? (
              <Image
                source={{uri: previewItem.fileUrl}}
                style={styles.previewImage}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.documentPreview}>
                <Icon name="file-document-outline" size={64} color="#2e7af5" />
                <Text style={styles.documentPreviewName}>
                  {previewItem?.fileName || 'Document'}
                </Text>
                <Text style={styles.documentPreviewSize}>
                  {previewItem?.fileSize
                    ? `${(previewItem.fileSize / 1024).toFixed(1)} KB`
                    : 'Size: Unknown'}
                </Text>

                <TouchableOpacity
                  style={styles.openExternalButton}
                  onPress={() => {
                    Linking.openURL(previewItem.fileUrl);
                  }}>
                  <Text style={styles.openExternalButtonText}>
                    Open in Browser
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 16,
    color: '#666',
  },
  doctorsListContent: {
    paddingVertical: 8,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  previewCloseButton: {
    padding: 8,
  },
  previewShareButton: {
    padding: 8,
  },
  previewTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  previewContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f7f9fc',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f7f9fc',
  },
  documentPreview: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  documentPreviewName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    textAlign: 'center',
  },
  documentPreviewSize: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  openExternalButton: {
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#2e7af5',
    borderRadius: 8,
  },
  openExternalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  doctorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
  },
  selectedDoctor: {
    backgroundColor: '#EBEBEB',
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 20,
    backgroundColor: '#2e7af5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#000000',
  },
  doctorSpecialization: {
    fontSize: 14,
    color: '#666666',
    marginTop: 2,
  },
  selectedDoctorText: {
    color: '#075E54',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  headerBackButton: {
    padding: 8,
  },
  headerBackIcon: {
    fontSize: 24,
    color: 'black',
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8, // Add some padding for a better touch target
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginRight: 4, // Add a little space for the icon
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'grey',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: 8,
    marginLeft: 5,
  },
  headerIcon: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  searchContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
  },
  searchCancelButton: {
    paddingHorizontal: 10,
  },
  searchCancelText: {
    color: '#075E54',
    fontSize: 16,
  },
  messagesList: {
    flex: 1,
    backgroundColor: '#edf6f9', // Add this line
  },
  messagesListContent: {
    padding: 10,
  },
  messageContainer: {
    borderRadius: 8,
    marginVertical: 2,
    maxWidth: '80%',
    padding: 8,
    paddingBottom: 4,
  },
  ownMessage: {
    backgroundColor: '#d6e5fd', //'#DCF8C6',
    borderRadius: 10,
    alignSelf: 'flex-end',
    marginLeft: '15%',
  },
  otherMessage: {
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
    marginRight: '15%',
  },
  pendingMessage: {
    opacity: 0.7,
  },
  messageText: {
    fontSize: 16,
    color: '#000000',
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 2,
  },
  timestamp: {
    fontSize: 11,
    color: '#7C7C7C',
    marginRight: 4,
  },
  statusIcon: {
    fontSize: 12,
    marginLeft: 2,
  },
  pendingIcon: {
    color: '#7C7C7C',
  },
  deliveredIcon: {
    color: '#53BDEB',
  },
  inputContainer: {
    backgroundColor: '#F0F0F0',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#2e7af5', //'#128C7E',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonIcon: {
    color: '#FFFFFF',
    fontSize: 18,
  },
  emptyListText: {
    padding: 20,
    textAlign: 'center',
    color: '#666666',
    fontSize: 16,
  },
  emptyMessagesText: {
    padding: 20,
    textAlign: 'center',
    color: '#666666',
    fontSize: 16,
  },
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    gap: 10, // For spacing between line and text (React Native 0.71+), else use marginHorizontal
  },

  dateSeparatorText: {
    backgroundColor: '#f4edff',
    color: '#575657',
    fontSize: 13,
    fontWeight: '500',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    textAlign: 'center',
  },

  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#ccc',
  },

  attachButton: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachmentModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  attachmentModalContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  attachmentOption: {
    alignItems: 'center',
    padding: 16,
  },
  attachmentOptionText: {
    marginTop: 8,
    color: '#333',
    fontSize: 14,
  },
  // imageContainer: {
  //   borderRadius: 8,
  //   overflow: 'hidden',
  // },
  // attachedImage: {
  //   width: '100%',
  //   height: 200,
  //   borderRadius: 8,
  //   marginBottom: 8,
  // },
  imageContainer: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 4,
    backgroundColor: '#f0f0f0',
    position: 'relative', // Important for positioning the overlay
  },
  attachedImage: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
  },
  imagePressIndicator: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  imagePressText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  fallbackImageContainer: {
    width: '100%',
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  fallbackImageText: {
    marginTop: 8,
    color: '#888',
    fontSize: 14,
  },
  documentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  documentIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  documentSize: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  imageLoadingContainer: {
    width: '100%',
    height: 200,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  imageLoadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  // imageContainer: {
  //   width: '100%',
  //   borderRadius: 8,
  //   overflow: 'hidden',
  //   backgroundColor: '#f0f0f0',
  // },
  // attachedImage: {
  //   width: '100%',
  //   height: 200,
  //   borderRadius: 4,
  //   backgroundColor: '#f0f0f0',
  // },
  adminSupportItem: {
    borderLeftWidth: 3,
    borderLeftColor: '#2e7af5',
  },
  adminAvatarContainer: {
    backgroundColor: '#2e7af5',
  },
  searchInterfaceContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  searchTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  searchSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchBarInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 4,
  },
  searchStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
searchResultsSection: {
  flex: 1,
  marginTop: 8,
  marginBottom: 16,
},
  searchingText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#666',
  },
  noResultsText: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  noResultsSubText: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
  resultsHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  searchResultsList: {
    flex: 1,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f2',
  },
  searchResultInfo: {
    flex: 1,
    marginLeft: 12,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  searchResultDetail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  adminSupportContainer: {
    alignItems: 'center',
    marginTop: 24,
  },
  orDivider: {
    fontSize: 14,

    color: '#999',
    marginBottom: 8,
  },
  adminSupportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2e7af5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  adminSupportButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
  },
  recentChatsHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 24,
    marginBottom: 8,
  },
  recentChatsList: {
    flex: 1,
    maxHeight: 350, // Limit height so it doesn't push admin support button off screen
  },
  recentChatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f2',
  },
  chatInfo: {
    flex: 1,
    marginLeft: 12,
  },
  chatTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  chatTime: {
    fontSize: 12,
    color: '#888',
  },
  chatPreview: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  unreadBadge: {
    backgroundColor: '#2e7af5',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
    paddingHorizontal: 4,
  },
  unreadCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Add to your existing styles
  profileModalContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  profileModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  profileModalBackButton: {
    padding: 8,
  },
  profileModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 12,
    color: '#333',
  },
  profileModalContent: {
    flex: 1,
  },
  profileDetailsContainer: {
    padding: 16,
  },
  profileHeaderSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profileAvatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#2e7af5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  profileAvatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  profileRoleBadge: {
    backgroundColor: '#2e7af5',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  profileRoleText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  profileSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  profileSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  profileInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileInfoText: {
    fontSize: 16,
    color: '#444',
    marginLeft: 12,
    flex: 1,
  },
  achievementItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  achievementContent: {
    marginLeft: 12,
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  achievementYear: {
    fontSize: 14,
    color: '#888',
  },
  profileActionsContainer: {
    marginTop: 8,
    marginBottom: 24,
  },
  profileActionButton: {
    backgroundColor: '#2e7af5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
  },
  profileActionButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  contactAvatarImage: {
    width: 50,
    height: 50,
    borderRadius: 20,
    backgroundColor: '#e1e1e1',
  },
  // Add these enhanced styles to your existing styles object
  verificationContainer: {
    marginTop: 12,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  verifiedText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  unverifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  unverifiedText: {
    color: '#FF9800',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  profileInfoContent: {
    marginLeft: 12,
    flex: 1,
  },
  profileInfoLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
    fontWeight: '500',
  },
  verifiedTextGreen: {
    color: '#4CAF50',
    fontWeight: '500',
  },
  unverifiedTextOrange: {
    color: '#FF9800',
    fontWeight: '500',
  },
  verificationStatusContainer: {
    marginTop: 4,
  },
  statusBadgeGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusBadgeOrange: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF9800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  achievementInstitution: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  profileActionButtonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#2e7af5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    marginTop: 12,
  },
  profileActionButtonTextSecondary: {
    color: '#2e7af5',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  // Add these to your existing styles
  headerAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    backgroundColor: '#e1e1e1',
  },
  doctorAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    backgroundColor: '#e1e1e1',
  },
  recentChatAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    backgroundColor: '#e1e1e1',
  },
  searchResultAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    backgroundColor: '#e1e1e1',
  },
  degreeText: {
    color: '#2e7af5',
    fontWeight: '500',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
});

export default ChatScreen;
