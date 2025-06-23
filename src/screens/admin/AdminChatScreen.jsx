import React, {useState, useEffect, useRef} from 'react';
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
  Image,
  StatusBar,
  SafeAreaView,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'react-native-image-picker';
import WebViewDocumentPicker from '../../components/WebViewDocumentPicker';
import io from 'socket.io-client';
import axios from 'axios';
import {useAuth} from '../../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Linking} from 'react-native';
import RNFS from 'react-native-fs';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const SOCKET_URL = 'http://192.168.1.4:5000';
const API_URL = 'http://192.168.1.4:5000';

const AdminChatScreen = ({navigation}) => {
  const {user} = useAuth();
  const [messages, setMessages] = useState([]);
  const [chatHistory, setChatHistory] = useState({});
  const [newMessage, setNewMessage] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const currentRoomIdRef = useRef(null);
  const flatListRef = useRef(null);
  const [showAttachmentOptions, setShowAttachmentOptions] = useState(false);
  const [webViewPickerVisible, setWebViewPickerVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cachedImages, setCachedImages] = useState({});
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);
  const insets = useSafeAreaInsets();
  const [allUsers, setAllUsers] = useState([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMoreUsers, setHasMoreUsers] = useState(true);
  const [fetchingMore, setFetchingMore] = useState(false);
  // At the very beginning of your component, add these debug statements:
  useEffect(() => {
    console.log('AdminChatScreen mounted');
    console.log('Current user:', user);
    // Check if token exists
    AsyncStorage.getItem('@token').then(token => {
      console.log('Token exists:', !!token);
      if (token) {
        console.log('Token first 20 chars:', token.substring(0, 20));
      }
    });
  }, []);

  // Replace the fetchUsers function with this improved version

  const fetchUsers = async (isInitial = true) => {
    try {
      if (isInitial) {
        console.log('Fetching initial users...');
        setLoading(true);
        setPage(0);
      } else {
        setFetchingMore(true);
      }

      const token = await AsyncStorage.getItem('@token');
      if (!token) {
        console.error('No auth token found');
        Alert.alert('Authentication Error', 'Please log in again');
        navigation.navigate('AdminLogin');
        return;
      }

      console.log(`Fetching users page ${isInitial ? 0 : page + 1}`);

      // Try multiple endpoints with fallback
      let response;
      let usedEndpoint = '';

      try {
        // Try the simple endpoint first
        console.log('Trying simple users endpoint...');
        usedEndpoint = 'users-simple';
        response = await axios.get(`${API_URL}/api/admin/users-simple`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        });
      } catch (simpleError) {
        console.log(
          'Simple endpoint failed, trying main endpoint...',
          simpleError.message,
        );

        try {
          // Fallback to main endpoint
          usedEndpoint = 'all-users';
          response = await axios.get(
            `${API_URL}/api/admin/all-users?page=0&limit=50`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              timeout: 15000,
            },
          );
        } catch (mainError) {
          console.log(
            'Main endpoint failed, trying platform users...',
            mainError.message,
          );

          // Try platform users endpoint as last resort
          usedEndpoint = 'all-platform-users';
          response = await axios.get(
            `${API_URL}/api/admin/all-platform-users`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              timeout: 15000,
            },
          );
        }
      }

      console.log(`Successfully used endpoint: ${usedEndpoint}`);
      console.log('API Response:', response.data);

      // Handle different response formats
      let newUsers = [];
      if (response.data.users) {
        newUsers = response.data.users;
      } else if (Array.isArray(response.data)) {
        newUsers = response.data;
      }

      console.log(`Received ${newUsers.length} users`);

      // Update state
      setUsers(newUsers);
      setHasMoreUsers(false); // Simple endpoint doesn't support pagination
    } catch (error) {
      console.error('All endpoints failed:', error);

      let errorMessage = 'Failed to load users';
      let retryAction = () => fetchUsers(isInitial);

      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        errorMessage = 'Request timeout. Server is taking too long to respond.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Session expired. Please log in again.';
        retryAction = () => navigation.navigate('AdminLogin');
      } else if (error.response?.status === 403) {
        errorMessage = 'Access denied. Admin privileges required.';
        retryAction = () => navigation.goBack();
      } else if (
        error.message?.includes('Network') ||
        error.code === 'NETWORK_ERROR'
      ) {
        errorMessage =
          'Network error. Please check your connection and server status.';
      } else if (error.response?.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      }

      Alert.alert('Error', errorMessage, [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Retry', onPress: retryAction},
      ]);

      // Don't reset users array if we already have some data
      if (isInitial && users.length === 0) {
        setUsers([]);
      }
    } finally {
      setLoading(false);
      setFetchingMore(false);
    }
  };

  // Add this fallback function
  const fetchUsersSimple = async () => {
    console.log('Trying simple users endpoint...');

    const token = await AsyncStorage.getItem('@token');
    if (!token) {
      throw new Error('No authentication token');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(`${API_URL}/api/admin/users-simple`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Simple API Response:', data);

      setUsers(data.users || []);
      setHasMoreUsers(false); // Simple endpoint doesn't support pagination
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  };

  // Add this function to test connectivity
  const testConnection = async () => {
    try {
      console.log('Testing admin connection...');
      const token = await AsyncStorage.getItem('@token');

      if (!token) {
        console.error('No token available for connection test');
        return false;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('Connection test timeout');
        controller.abort();
      }, 10000); // 10 second timeout for connection test

      try {
        const response = await fetch(`${API_URL}/api/admin/test-connection`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const result = await response.json();
          console.log('Connection test successful:', result);
          return true;
        } else {
          console.error('Connection test failed with status:', response.status);
          return false;
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);

        if (fetchError.name === 'AbortError') {
          console.error('Connection test timed out');
        } else {
          console.error('Connection test fetch error:', fetchError);
        }
        return false;
      }
    } catch (error) {
      console.error('Connection test error:', error);
      return false;
    }
  };

  // Add this function to test the connection before fetching users

  const testServerConnection = async () => {
    try {
      console.log('Testing server connection...');

      // Test basic connectivity first
      const response = await fetch(`${API_URL}/api/health`, {
        method: 'GET',
        timeout: 5000,
      });

      if (response.ok) {
        console.log('Basic server connection successful');
        return true;
      } else {
        console.error('Server health check failed:', response.status);
        return false;
      }
    } catch (error) {
      console.error('Server connection test failed:', error);
      return false;
    }
  };

  // Check admin role and fetch users
  useEffect(() => {
    console.log('AdminChatScreen - checking user:', user);

    if (!user) {
      console.log('No user found, redirecting to login');
      Alert.alert(
        'Authentication Required',
        'Please log in to access admin features',
        [{text: 'OK', onPress: () => navigation.navigate('AdminLogin')}],
      );
      return;
    }

    if (user.role !== 'admin') {
      console.log('User role is not admin:', user.role);
      Alert.alert(
        'Access Denied',
        'You need admin privileges to access this feature',
        [{text: 'OK', onPress: () => navigation.goBack()}],
      );
      return;
    }

    console.log('User verified as admin, testing server connection...');

    // Test server connection before fetching users
    testServerConnection()
      .then(connectionOk => {
        if (connectionOk) {
          console.log('Connection test passed, fetching users...');
          fetchUsers(true);
        } else {
          Alert.alert(
            'Connection Error',
            'Cannot connect to the server. Please check your network connection and ensure the server is running.',
            [
              {text: 'Cancel', style: 'cancel'},
              {text: 'Retry', onPress: () => fetchUsers(true)},
            ],
          );
        }
      })
      .catch(error => {
        console.error('Connection test error:', error);
        Alert.alert(
          'Connection Error',
          'Network error occurred. Please check your connection.',
          [
            {text: 'Cancel', style: 'cancel'},
            {text: 'Retry', onPress: () => fetchUsers(true)},
          ],
        );
      });
  }, [user?.id, user?.role]);
  const loadMoreUsers = () => {
    if (hasMoreUsers && !fetchingMore && !loading) {
      fetchUsers(false);
    }
  };

  // Function to download and cache images
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

      // Check if the file already exists
      const exists = await RNFS.exists(localPath);
      if (exists) {
        console.log('Image already cached:', localPath);
        return `file://${localPath}`;
      }

      // Download the file
      await RNFS.downloadFile({
        fromUrl: imageUrl,
        toFile: localPath,
      }).promise;

      return `file://${localPath}`;
    } catch (error) {
      console.error('Error downloading/caching image:', error);
      return null;
    }
  };

  // Opening document/image preview
  const openPreview = item => {
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

  // Fetch all users who have contacted admin
  useEffect(() => {
    fetchUsers();
  }, [user?.id]);

  // Update currentRoomIdRef when selectedUser changes
  useEffect(() => {
    if (selectedUser && user) {
      // Always put admin ID first for consistency
      const roomId = `${user.id}-${selectedUser.id}`;
      currentRoomIdRef.current = roomId;
      console.log('Current room ID set to:', roomId);
    } else {
      currentRoomIdRef.current = null;
    }
  }, [selectedUser, user]);

  // Fetch message history when selecting a user
  useEffect(() => {
    if (selectedUser) {
      fetchMessageHistory();
    }
  }, [selectedUser]);

  // Update fetchMessageHistory function
  const fetchMessageHistory = async () => {
    if (!selectedUser || !user) return;

    try {
      // Use consistent room ID format: admin-user
      const roomId = `${user.id}-${selectedUser.id}`;
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

  // Socket connection for real-time messaging
  useEffect(() => {
    if (selectedUser && user) {
      // Clean up previous connection if any
      if (socketRef.current) {
        socketRef.current.disconnect();
      }

      // Clear any pending reconnect timeouts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      console.log('Admin connecting to socket at:', SOCKET_URL);

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

        // Use consistent room ID format
        const roomId = `${user.id}-${selectedUser.id}`;
        console.log('Admin joining room:', roomId);
        socketRef.current.emit('join_room', roomId);
      });

      socketRef.current.on('receive_message', message => {
        console.log('Admin received message:', message);

        const newMessage = {
          id: message.id,
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

        // Only update messages if this is NOT our own message that we just sent
        // Our own messages are already added to UI immediately in sendMessage
        const isOwnMessage = newMessage.senderId === user?.id;

        if (!isOwnMessage) {
          setMessages(prevMessages => {
            // Check if message already exists
            const messageExists = prevMessages.some(
              msg => msg.id === newMessage.id,
            );

            if (!messageExists) {
              const updatedMessages = [newMessage, ...prevMessages];

              // Also update chat history for messages from others
              setChatHistory(prev => ({
                ...prev,
                [newMessage.roomId]: updatedMessages,
              }));

              return updatedMessages;
            }
            return prevMessages;
          });
        }
      });

      // Listen for message confirmation
      socketRef.current.on('message_confirmed', confirmedMessage => {
        console.log('Message confirmed:', confirmedMessage);
        updateMessageStatus(confirmedMessage);
      });

      // Error and disconnect handling
      socketRef.current.on('connect_error', error => {
        console.error('Socket connection error:', error);
        setSocketConnected(false);
      });

      socketRef.current.on('disconnect', reason => {
        console.log('Socket disconnected:', reason);
        setSocketConnected(false);
      });

      return () => {
        console.log('Disconnecting admin socket');
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
        setSocketConnected(false);
      };
    }
  }, [selectedUser, user]);

  // Load and cache images
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

  // Send an attachment
  const getAuthToken = async () => {
    try {
      if (user && user.token) {
        return user.token.startsWith('Bearer ')
          ? user.token
          : `Bearer ${user.token}`;
      }
      return null;
    } catch (error) {
      console.error('Failed to get auth token:', error);
      return null;
    }
  };

  const sendFileMessage = async file => {
    if (!selectedUser || !user) return;

    try {
      setUploading(true);

      // Upload the file first
      const token = await getAuthToken();
      if (!token) {
        Alert.alert('Error', 'Authentication required');
        return;
      }

      // Create form data
      const formData = new FormData();
      formData.append('document', {
        uri: Platform.OS === 'ios' ? file.uri.replace('file://', '') : file.uri,
        type: file.type || 'application/octet-stream',
        name: file.name || `file-${Date.now()}.${file.uri.split('.').pop()}`,
      });

      const response = await fetch(
        `${API_URL}/api/uploads/chat-document?userId=${user.id}`,
        {
          method: 'POST',
          headers: {
            Authorization: token,
          },
          body: formData,
        },
      );

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      const result = await response.json();

      // Prepare message data
      const roomId = ['admin', selectedUser.id].sort().join('-');
      const tempId = `temp-${Date.now()}`;
      const isImage =
        file.type?.includes('image') ||
        file.uri.match(/\.(jpeg|jpg|gif|png)$/i);

      const messageData = {
        text: `📎 ${isImage ? 'Image' : 'Document'}`,
        content: `📎 ${isImage ? 'Image' : 'Document'}`,
        senderId: user.id,
        sender_id: user.id,
        senderName: 'Admin Support',
        sender_name: 'Admin Support',
        receiverId: selectedUser.id,
        receiver_id: selectedUser.id,
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
        roomId: roomId,
        room_id: roomId,
        isAttachment: true,
        is_attachment: true,
        attachmentType: isImage ? 'image' : 'document',
        attachment_type: isImage ? 'image' : 'document',
        fileUrl: result.url,
        file_url: result.url,
        fileName: file.name || result.fileName,
        file_name: file.name || result.fileName,
        fileType: file.type || result.fileType,
        file_type: file.type || result.fileType,
        fileSize: file.size || result.size,
        file_size: file.size || result.size,
      };

      // Temp message for UI
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
    } catch (error) {
      console.error('Error sending file message:', error);
      Alert.alert('Error', 'Failed to send file: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  // Attachment handling
  const pickDocument = () => {
    setShowAttachmentOptions(false);
    setWebViewPickerVisible(true);
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
        Alert.alert('Error', 'Image Picker Error: ' + response.errorMessage);
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

  const handleWebViewFilesSelected = async files => {
    if (files && files.length > 0) {
      const file = files[0];
      await sendFileMessage(file);
    }
  };

  // Send text message
  const sendMessage = () => {
    if (newMessage.trim().length === 0 || !selectedUser || !user) {
      return;
    }

    // Use consistent room ID format
    const roomId = `${user.id}-${selectedUser.id}`;
    const tempId = `temp-${Date.now()}`;

    const messageData = {
      text: newMessage.trim(),
      content: newMessage.trim(),
      senderId: user.id,
      sender_id: user.id,
      senderName: 'Support Team',
      sender_name: 'Support Team',
      receiverId: selectedUser.id,
      receiver_id: selectedUser.id,
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
      roomId: roomId,
      room_id: roomId,
    };

    console.log('Admin sending message:', messageData);

    // Clear input field immediately
    setNewMessage('');

    // Create temporary message with pending status
    const tempMessage = {
      ...messageData,
      id: tempId,
      pending: true,
    };

    // Add message to UI immediately
    setMessages(prevMessages => [tempMessage, ...prevMessages]);

    // Update chat history
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
        socketRef.current.emit('send_message', {...messageData, tempId});
      } catch (socketError) {
        console.error('Error sending message via socket:', socketError);
        sendMessageViaHttp(messageData, tempId);
      }
    } else {
      // Socket not connected, use HTTP
      sendMessageViaHttp(messageData, tempId);
    }
  };

  // Fallback HTTP method to send messages
  const sendMessageViaHttp = async (messageData, tempId) => {
    try {
      const response = await axios.post(`${API_URL}/api/messages`, messageData);
      console.log('Message sent via HTTP fallback:', response.data);

      if (response.data && response.data.success) {
        // Replace the pending message with the confirmed one
        const confirmedMessage = {
          ...messageData,
          id: response.data.id || messageData.id,
          tempId: tempId,
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

  // Update message status
  const updateMessageStatus = confirmedMessage => {
    console.log('Updating message status:', confirmedMessage);
    const roomId = confirmedMessage.roomId || confirmedMessage.room_id;
    const tempId = confirmedMessage.tempId;

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
      const updatedRoomMessages = roomMessages.map(msg => {
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

  // Add a function to filter users based on search query
  const getFilteredUsers = () => {
    if (!userSearchQuery.trim()) return users;

    const query = userSearchQuery.toLowerCase().trim();
    return users.filter(
      user =>
        user.name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.role?.toLowerCase().includes(query) ||
        user.company?.toLowerCase().includes(query) ||
        user.degree?.toLowerCase().includes(query),
    );
  };

  // Update the renderUser function

  const renderUser = ({item}) => {
    // Choose icon and color based on role
    const getRoleInfo = role => {
      switch (role) {
        case 'admin':
          return {icon: 'shield-account', color: '#8e44ad'};
        case 'doctor':
          return {icon: 'stethoscope', color: '#2e86de'};
        case 'pharma':
          return {icon: 'pill', color: '#10ac84'};
        default:
          return {icon: 'account', color: '#7f8c8d'};
      }
    };

    const roleInfo = getRoleInfo(item.role);

    return (
      <TouchableOpacity
        style={[
          styles.userItem,
          selectedUser?.id === item.id && styles.selectedUser,
          item.hasMessages && styles.userWithMessages,
        ]}
        onPress={() => setSelectedUser(item)}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {item.name ? item.name.charAt(0).toUpperCase() : '?'}
          </Text>
          {item.hasMessages && (
            <View style={styles.messageBadge}>
              <Icon name="message" size={10} color="#fff" />
            </View>
          )}
        </View>

        <View style={styles.userInfo}>
          <View style={styles.nameContainer}>
            <Text
              style={[
                styles.userName,
                selectedUser?.id === item.id && styles.selectedUserText,
              ]}>
              {item.name || 'Unknown User'}
            </Text>
            <View style={[styles.roleBadge, {backgroundColor: roleInfo.color}]}>
              <Icon
                name={roleInfo.icon}
                size={12}
                color="#fff"
                style={styles.roleIcon}
              />
              <Text style={styles.roleBadgeText}>{item.role}</Text>
            </View>
          </View>

          <Text
            style={[
              styles.userSubinfo,
              selectedUser?.id === item.id && styles.selectedUserText,
            ]}>
            {item.email}
          </Text>

          <Text style={styles.userDetails}>
            {item.role === 'doctor'
              ? item.degree || 'Doctor'
              : item.role === 'pharma'
              ? item.company || 'Pharmaceutical Rep'
              : item.role === 'admin'
              ? 'Administrator'
              : 'User'}
          </Text>
        </View>

        {item.hasMessages && (
          <View style={styles.messageIndicator}>
            <Icon name="message-text" size={16} color="#2e7af5" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Render individual messages
  const renderMessage = ({item, index}) => {
    const isOwnMessage = item.senderId === user?.id;
    const messageTime = new Date(item.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Date separator logic
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

    // Check if this is an image attachment
    const isAttachment =
      item.isAttachment === true || item.is_attachment === true;

    const isImage =
      item.attachmentType === 'image' ||
      item.attachment_type === 'image' ||
      (item.fileType && item.fileType.includes('image')) ||
      (item.file_type && item.file_type.includes('image'));

    // Get image URL and check if it's cached
    const imageUrl = item.fileUrl || item.file_url;
    const cachedImageUri = imageUrl && cachedImages[imageUrl];

    const handleImagePress = () => {
      if (isImage && imageUrl) {
        openPreview(item);
      }
    };

    return (
      <>
        <View
          style={[
            styles.messageContainer,
            isOwnMessage ? styles.ownMessage : styles.otherMessage,
            item.pending && styles.pendingMessage,
          ]}>
          {/* For image messages, display the actual image */}
          {isAttachment && isImage && (imageUrl || cachedImageUri) ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleImagePress}
              style={styles.imageContainer}>
              <Image
                source={{uri: cachedImageUri || imageUrl}}
                style={styles.attachedImage}
                resizeMode="cover"
                onError={e => {
                  console.error(
                    `Image load error for ${imageUrl?.substring(0, 30)}`,
                  );
                }}
              />

              <View style={styles.imagePressIndicator}>
                <Icon name="eye" size={16} color="#fff" />
                <Text style={styles.imagePressText}>View</Text>
              </View>
            </TouchableOpacity>
          ) : !isAttachment || !isImage ? (
            <Text style={styles.messageText}>{item.text || item.content}</Text>
          ) : (
            <View style={styles.fallbackImageContainer}>
              <Icon name="image-off" size={32} color="#888" />
              <Text style={styles.fallbackImageText}>Image unavailable</Text>
            </View>
          )}

          <View style={styles.messageFooter}>
            <Text style={styles.timestamp}>{messageTime}</Text>
            {isOwnMessage && (
              <Text
                style={[
                  styles.statusIcon,
                  item.pending ? styles.pendingIcon : styles.deliveredIcon,
                ]}>
                {item.pending ? '⌛' : '✓✓'}
              </Text>
            )}
          </View>
        </View>

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

  // Render chat header with user name
  const renderChatHeader = () => {
    if (!selectedUser) return null;

    const getRoleColor = role => {
      switch (role) {
        case 'admin':
          return '#8e44ad';
        case 'doctor':
          return '#2e86de';
        case 'pharma':
          return '#10ac84';
        default:
          return '#7f8c8d';
      }
    };

    return (
      <View style={styles.chatHeader}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => setSelectedUser(null)}>
          <Icon name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>

        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {selectedUser.name
              ? selectedUser.name.charAt(0).toUpperCase()
              : '?'}
          </Text>
        </View>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{selectedUser.name}</Text>
          <View style={styles.headerSubtitleContainer}>
            <View
              style={[
                styles.roleIndicator,
                {backgroundColor: getRoleColor(selectedUser.role)},
              ]}>
              <Text style={styles.roleIndicatorText}>{selectedUser.role}</Text>
            </View>
            <Text style={styles.headerEmail}>{selectedUser.email}</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton} onPress={toggleSearch}>
            <Icon name="magnify" size={24} color="#2e7af5" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Send test message
  const sendTestMessage = () => {
    if (!selectedUser || !user) return;

    const roomId = ['admin', selectedUser.id].sort().join('-');
    const messageData = {
      text: 'Hello from Admin',
      content: 'Hello from Admin',
      senderId: user.id,
      sender_id: user.id,
      senderName: 'Admin',
      sender_name: 'Admin',
      receiverId: selectedUser.id,
      receiver_id: selectedUser.id,
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
      roomId: roomId,
      room_id: roomId,
    };

    // Send via socket
    if (socketConnected) {
      socketRef.current.emit('send_message', messageData);
    } else {
      // Fallback to HTTP
      axios.post(`${API_URL}/api/messages`, messageData);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2e7af5" />
        <Text style={styles.loadingText}>Loading chats...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, {paddingTop: insets.top}]}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />

      {!selectedUser ? (
        // User list view
        <>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.navigate('AdminDashboard')}>
              <Icon name="arrow-left" size={24} color="#2e7af5" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Support Chats</Text>
          </View>

          <View style={styles.userSearchContainer}>
            <View style={styles.searchInputContainer}>
              <Icon
                name="magnify"
                size={20}
                color="#666"
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.userSearchInput}
                placeholder="Search users by name, email or role..."
                value={userSearchQuery}
                onChangeText={setUserSearchQuery}
              />
              {userSearchQuery ? (
                <TouchableOpacity
                  style={styles.clearSearchButton}
                  onPress={() => setUserSearchQuery('')}>
                  <Icon name="close-circle" size={16} color="#999" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <FlatList
            data={getFilteredUsers()}
            renderItem={renderUser}
            keyExtractor={item => item.id?.toString()}
            style={styles.usersList}
            onEndReached={loadMoreUsers}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              fetchingMore ? (
                <View style={styles.loadingMore}>
                  <ActivityIndicator size="small" color="#2e7af5" />
                  <Text style={styles.loadingMoreText}>
                    Loading more users...
                  </Text>
                </View>
              ) : null
            }
            ListEmptyComponent={
              !loading ? (
                <View style={styles.emptyContainer}>
                  <Icon name="account-multiple" size={64} color="#ccc" />
                  <Text style={styles.emptyText}>No users found</Text>
                  <TouchableOpacity
                    style={styles.refreshButton}
                    onPress={() => fetchUsers(true)}>
                    <Icon name="refresh" size={18} color="#fff" />
                    <Text style={styles.refreshButtonText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : null
            }
          />
        </>
      ) : (
        // Individual chat view
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
            ListEmptyComponent={
              <Text style={styles.emptyMessagesText}>
                {searchQuery
                  ? 'No messages match your search'
                  : 'No messages yet. Send a message to start the conversation.'}
              </Text>
            }
          />

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
                  <Icon name="send" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>

          {/* Attachment options modal */}
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

          {/* WebView Document Picker */}
          <WebViewDocumentPicker
            visible={webViewPickerVisible}
            onClose={() => setWebViewPickerVisible(false)}
            onFilesSelected={handleWebViewFilesSelected}
          />

          {/* Preview modal for images/documents */}
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
                <Text style={styles.previewTitle} numberOfLines={1}>
                  {previewItem?.fileName || 'Preview'}
                </Text>
                <TouchableOpacity
                  style={styles.previewShareButton}
                  onPress={() =>
                    previewItem?.fileUrl && Linking.openURL(previewItem.fileUrl)
                  }>
                  <Icon name="open-in-new" size={24} color="#2e7af5" />
                </TouchableOpacity>
              </View>
              <View style={styles.previewContent}>
                {previewItem &&
                  (previewItem.fileType &&
                  previewItem.fileType.includes('image') ? (
                    // Image preview
                    <Image
                      source={{
                        uri:
                          cachedImages[previewItem.fileUrl] ||
                          previewItem.fileUrl,
                      }}
                      style={styles.previewImage}
                      resizeMode="contain"
                    />
                  ) : (
                    // Document preview
                    <View style={styles.documentPreview}>
                      <Icon name="file-document" size={64} color="#2e7af5" />
                      <Text style={styles.documentPreviewName}>
                        {previewItem.fileName}
                      </Text>
                      <Text style={styles.documentPreviewSize}>
                        {previewItem.fileSize
                          ? `${(previewItem.fileSize / 1024).toFixed(2)} KB`
                          : ''}
                      </Text>
                      <TouchableOpacity
                        style={styles.openExternalButton}
                        onPress={() => Linking.openURL(previewItem.fileUrl)}>
                        <Text style={styles.openExternalButtonText}>
                          Open in Browser
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))}
              </View>
            </SafeAreaView>
          </Modal>
        </View>
      )}
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
    backgroundColor: '#f7f9fc',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 80,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
  },
  usersList: {
    flex: 1,
    backgroundColor: '#fff',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedUser: {
    backgroundColor: '#f0f7ff',
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2e7af5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#333',
  },
  userRole: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  selectedUserText: {
    color: '#2e7af5',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerBackButton: {
    marginRight: 8,
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 8,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    alignItems: 'center',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    marginRight: 8,
  },
  searchCancelButton: {
    paddingHorizontal: 8,
  },
  searchCancelText: {
    color: '#2e7af5',
    fontSize: 16,
  },
  messagesList: {
    flex: 1,
    backgroundColor: '#f7f9fc',
  },
  messagesListContent: {
    padding: 10,
    paddingBottom: 30,
  },
  emptyMessagesText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 40,
    fontSize: 16,
  },
  messageContainer: {
    borderRadius: 8,
    marginVertical: 2,
    maxWidth: '80%',
    padding: 10,
    paddingBottom: 6,
  },
  ownMessage: {
    backgroundColor: '#d6e5fd',
    alignSelf: 'flex-end',
    marginLeft: '15%',
  },
  otherMessage: {
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
    marginRight: '15%',
  },
  pendingMessage: {
    opacity: 0.7,
  },
  messageText: {
    fontSize: 16,
    color: '#333',
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
  },
  timestamp: {
    fontSize: 11,
    color: '#888',
    marginRight: 4,
  },
  statusIcon: {
    fontSize: 12,
    marginLeft: 2,
  },
  pendingIcon: {
    color: '#888',
  },
  deliveredIcon: {
    color: '#2e7af5',
  },
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dateSeparatorText: {
    fontSize: 12,
    color: '#888',
    marginHorizontal: 10,
  },
  inputContainer: {
    backgroundColor: '#f0f0f0',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  attachButton: {
    padding: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#2e7af5',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachmentModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  attachmentModalContainer: {
    backgroundColor: '#fff',
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
  imageContainer: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 4,
    backgroundColor: '#f0f0f0',
    position: 'relative',
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
  imageLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(240, 240, 240, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
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
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
    marginHorizontal: 32,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2e7af5',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 24,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  userWithMessages: {
    borderLeftWidth: 3,
    borderLeftColor: '#2e7af5',
  },
  messageBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#2e7af5',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  messageIndicator: {
    marginLeft: 8,
  },
  userSearchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  userSearchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
    color: '#333',
  },
  clearSearchButton: {
    padding: 6,
  },
  clearSearchText: {
    color: '#2e7af5',
    fontWeight: '500',
    fontSize: 14,
    marginTop: 12,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginLeft: 8,
  },
  roleBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 3,
  },
  roleIcon: {
    marginRight: 2,
  },
  userSubinfo: {
    fontSize: 13,
    color: '#666',
    marginTop: 3,
  },
  userDetails: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  headerSubtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  roleIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 8,
  },
  roleIndicatorText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  headerEmail: {
    fontSize: 12,
    color: '#666',
  },
  loadingMore: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingMoreText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
});

export default AdminChatScreen;