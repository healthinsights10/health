import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Base URL for API calls
const API_URL = 'http://192.168.1.4:5000/api';

// Create axios instance with better configuration
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // Increased timeout
});

// Add an interceptor to add the token to every request
api.interceptors.request.use(
  async config => {
    try {
      const token = await AsyncStorage.getItem('@token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      console.log(`Making request to: ${config.baseURL}${config.url}`);
      return config;
    } catch (error) {
      console.error('Request interceptor error:', error);
      return Promise.reject(error);
    }
  },
  error => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  },
);

// Error handling interceptor with better logging
api.interceptors.response.use(
  response => {
    console.log(`Response from ${response.config.url}: ${response.status}`);
    return response;
  },
  error => {
    // console.error('API Error Details:', {
    //   url: error.config?.url,
    //   method: error.config?.method,
    //   status: error.response?.status,
    //   statusText: error.response?.statusText,
    //   message: error.message,
    //   code: error.code,
    // });

    // Provide more specific error messages
    if (error.code === 'ECONNABORTED') {
      error.message = 'Request timeout - server took too long to respond';
    } else if (error.code === 'NETWORK_ERROR' || !error.response) {
      error.message = 'Network error - check your connection and server status';
    } else if (error.response?.status === 404) {
      error.message =
        'Endpoint not found - please check the server configuration';
    }

    return Promise.reject(error);
  },
);

// Authentication services
export const authService = {
  login: async (email, password) => {
    try {
      const response = await api.post('/auth/login', {email, password});
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  signup: async userData => {
    try {
      // Make sure all fields from the form are included
      const response = await api.post('/auth/signup', userData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  setAuthToken: token => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  },

  resendVerificationEmail: async email => {
    try {
      const response = await api.post('/auth/resend-verification', {email});
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  verifyEmail: async token => {
    try {
      const response = await api.get(`/auth/verify-email?token=${token}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

// Admin services
export const adminService = {
  // Get dashboard statistics
  getDashboardStats: async () => {
    try {
      const response = await api.get('/admin/dashboard');
      return response.data;
    } catch (error) {
      console.error('Dashboard stats error:', error);
      throw error;
    }
  },

  // Get all doctors
  getDoctors: async () => {
    try {
      const response = await api.get('/admin/doctors');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Verify a doctor
  // verifyDoctor: async doctorId => {
  //   try {
  //     const response = await api.put(`/admin/doctors/${doctorId}/verify`);
  //     return response.data;
  //   } catch (error) {
  //     throw error;
  //   }
  // },

  // Delete a doctor
  deleteDoctor: async doctorId => {
    try {
      const response = await api.delete(`/admin/doctors/${doctorId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get doctor details
  // getDoctorDetails: async doctorId => {
  //   try {
  //     const response = await api.get(`/admin/doctors/${doctorId}`);
  //     return response.data;
  //   } catch (error) {
  //     throw error;
  //   }
  // },

  // Get doctor documents
  // getDoctorDocuments: async doctorId => {
  //   try {
  //     const response = await api.get(`/admin/doctors/${doctorId}/documents`);
  //     return response.data;
  //   } catch (error) {
  //     throw error;
  //   }
  // },

  // Verify a document
  // verifyDocument: async (doctorId, documentId, notes = '') => {
  //   try {
  //     const response = await api.put(
  //       `/admin/doctors/${doctorId}/documents/${documentId}/verify`,
  //       {notes},
  //     );
  //     return response.data;
  //   } catch (error) {
  //     throw error;
  //   }
  // },

  // Reject a document
  // rejectDocument: async (doctorId, documentId, notes = '') => {
  //   try {
  //     const response = await api.put(
  //       `/admin/doctors/${doctorId}/documents/${documentId}/reject`,
  //       {notes},
  //     );
  //     return response.data;
  //   } catch (error) {
  //     throw error;
  //   }
  // },
  // Get pending doctors that need verification
  getPendingDoctors: async () => {
    try {
      const response = await api.get('/admin/doctors/pending');
      return response.data;
    } catch (error) {
      console.error('Get pending doctors error:', error);
      throw error;
    }
  },

  // Get doctor details by ID
  getDoctorDetails: async doctorId => {
    try {
      const response = await api.get(`/admin/doctors/${doctorId}`);
      return response.data;
    } catch (error) {
      console.error('Get doctor details error:', error);
      throw error;
    }
  },

  // Get doctor documents by doctor ID
  getDoctorDocuments: async doctorId => {
    try {
      const response = await api.get(`/admin/doctors/${doctorId}/documents`);
      return response.data;
    } catch (error) {
      console.error('Get doctor documents error:', error);
      throw error;
    }
  },

  // Verify a doctor
  verifyDoctor: async (doctorId, notes = '') => {
    try {
      const response = await api.put(`/admin/doctors/${doctorId}/verify`, {
        notes,
      });
      return response.data;
    } catch (error) {
      console.error('Verify doctor error:', error);
      throw error;
    }
  },

  // Reject a doctor
  rejectDoctor: async (doctorId, notes) => {
    try {
      const response = await api.put(`/admin/doctors/${doctorId}/reject`, {
        notes,
      });
      return response.data;
    } catch (error) {
      console.error('Reject doctor error:', error);
      throw error;
    }
  },

  // Verify a specific document
  verifyDocument: async (doctorId, documentId, notes = '') => {
    try {
      const response = await api.put(
        `/admin/doctors/${doctorId}/documents/${documentId}/verify`,
        {notes},
      );
      return response.data;
    } catch (error) {
      console.error('Verify document error:', error);
      throw error;
    }
  },

  // Reject a specific document
  rejectDocument: async (doctorId, documentId, notes) => {
    try {
      const response = await api.put(
        `/admin/doctors/${doctorId}/documents/${documentId}/reject`,
        {notes},
      );
      return response.data;
    } catch (error) {
      console.error('Reject document error:', error);
      throw error;
    }
  },
  // Get all pharma representatives
  getPharmaReps: async () => {
    try {
      const response = await api.get('/admin/pharma');
      return response.data;
    } catch (error) {
      console.error('Get pharma representatives error:', error);
      throw error;
    }
  },

  // Get pharma details by ID
  getPharmaDetails: async pharmaId => {
    try {
      console.log('Fetching pharma details for ID:', pharmaId);
      const response = await api.get(`/admin/pharma/${pharmaId}`);
      return response.data;
    } catch (error) {
      console.error(`Get pharma details error for ID ${pharmaId}:`, error);
      throw error;
    }
  },

  // Delete a pharma representative
  deletePharma: async pharmaId => {
    try {
      const response = await api.delete(`/admin/pharma/${pharmaId}`);
      return response.data;
    } catch (error) {
      console.error('Delete pharma representative error:', error);
      throw error;
    }
  },

  // Verify a pharma representative
  verifyPharma: async (pharmaId, notes = '') => {
    try {
      const response = await api.put(`/admin/pharma/${pharmaId}/verify`, {
        notes,
      });
      return response.data;
    } catch (error) {
      console.error('Verify pharma representative error:', error);
      throw error;
    }
  },

  // Add these methods to adminService for event management
  getAllEvents: async () => {
    try {
      const response = await api.get('/admin/events');
      return response.data;
    } catch (error) {
      console.error('Get all events error:', error);
      throw error;
    }
  },

  getEventRegistrations: async eventId => {
    try {
      const response = await api.get(`/admin/events/${eventId}/registrations`);
      return response.data;
    } catch (error) {
      console.error('Get event registrations error:', error);
      throw error;
    }
  },

  updateEventAfterApproval: async (eventId, eventData) => {
    try {
      const response = await api.put(
        `/admin/events/${eventId}/update`,
        eventData,
      );
      return response.data;
    } catch (error) {
      console.error('Admin update event error:', error);
      throw error;
    }
  },

  cancelEventRegistration: async (eventId, userId) => {
    try {
      const response = await api.delete(
        `/admin/events/${eventId}/registrations/${userId}`,
      );
      return response.data;
    } catch (error) {
      console.error('Cancel registration error:', error);
      throw error;
    }
  },

  exportEventRegistrations: async eventId => {
    try {
      const response = await api.get(
        `/admin/events/${eventId}/registrations/export`,
      );
      return response.data;
    } catch (error) {
      console.error('Export registrations error:', error);
      throw error;
    }
  },

  getEventById: async eventId => {
    try {
      const response = await api.get(`/admin/events/${eventId}`);
      return response.data;
    } catch (error) {
      console.error('Get event details error:', error);
      throw error;
    }
  },
};

// Event services
export const eventService = {
  // Create a new event
  createEvent: async eventData => {
    try {
      console.log('Attempting to create event with data:', eventData);

      // Use the API to send to backend, not directly to Supabase
      const response = await api.post('/events', eventData);
      console.log('Event created successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Create event error:', error);
      throw error;
    }
  },

  registerForEvent: async (eventId, registrationData) => {
    try {
      const response = await api.post(
        `/events/${eventId}/register`,
        registrationData,
      );
      return response.data;
    } catch (error) {
      console.error('Error registering for event:', error);
      throw error;
    }
  },

  // Get all events
  getAllEvents: async () => {
    try {
      const response = await api.get('/events'); // Call the backend API
      return response.data;
    } catch (error) {
      console.error('Get all events error:', error);
      throw error;
    }
  },

  // Get events for current user
  getMyEvents: async () => {
    try {
      const response = await api.get('/events/my-events');
      return response.data;
    } catch (error) {
      console.error('Get my events error:', error);
      throw error;
    }
  },

  // Get ongoing events
  getOngoingEvents: async () => {
    try {
      const response = await api.get('/events/ongoing');
      return response.data;
    } catch (error) {
      console.error('Get ongoing events error:', error);
      throw error;
    }
  },

  // Get recommended events (you may need to create a new endpoint for this)
  getRecommendedEvents: async () => {
    try {
      // This is a placeholder - You might want to create a dedicated endpoint
      const response = await api.get('/events?recommended=true');
      return response.data;
    } catch (error) {
      console.error('Get recommended events error:', error);
      throw error;
    }
  },

  // Get events the user is registered for
  getRegisteredEvents: async () => {
    try {
      const response = await api.get('/events/registered');
      return response.data;
    } catch (error) {
      console.error('Get registered events error:', error);
      throw error;
    }
  },

  // Get pending events (admin only)
  getPendingEvents: async () => {
    try {
      const response = await api.get('/events/pending');
      return response.data;
    } catch (error) {
      console.error('Get pending events error:', error);
      throw error;
    }
  },

  // Get event by ID
  getEventById: async eventId => {
    try {
      const response = await api.get(`/events/${eventId}`);
      return response.data;
    } catch (error) {
      console.error('Get event details error:', error);
      throw error;
    }
  },

  // Approve an event (admin only)
  approveEvent: async (eventId, notes = '') => {
    if (!eventId) {
      throw new Error('Event ID is required');
    }

    try {
      const response = await api.put(`/admin/events/${eventId}/approve`, {
        notes,
      });
      return response.data;
    } catch (error) {
      console.error('Approve event error:', error);
      throw error;
    }
  },

  // Reject an event (admin only)
  rejectEvent: async (eventId, notes = '') => {
    try {
      const response = await api.put(`/events/${eventId}/reject`, {notes});
      return response.data;
    } catch (error) {
      console.error('Reject event error:', error);
      throw error;
    }
  },

  // updateEvent: async (eventId, eventData) => {
  //   try {
  //     const response = await api.put(`/events/${eventId}`, eventData);
  //     return response.data;
  //   } catch (error) {
  //     console.error('Update event error:', error);
  //     throw error;
  //   }
  // },

  updateEvent: async (eventId, eventData) => {
    try {
      console.log(
        'Updating event with data:',
        JSON.stringify({
          ...eventData,
          brochure: eventData.brochure,
        }),
      );

      const response = await api.put(`/events/${eventId}`, eventData);
      return response.data;
    } catch (error) {
      console.error('Update event error:', error);
      throw error;
    }
  },

  // Approve event with additional data
  approveEventWithChanges: async (eventId, eventData) => {
    try {
      // First update the event
      await api.put(`/events/${eventId}`, eventData);

      // Then approve it
      const response = await api.put(`/admin/events/${eventId}/approve`, {
        notes: 'Event edited and approved by admin',
      });

      return response.data;
    } catch (error) {
      console.error('Approve event with changes error:', error);
      throw error;
    }
  },

  // Delete an event
  deleteEvent: async eventId => {
    try {
      const response = await api.delete(`/events/${eventId}`);
      return response.data;
    } catch (error) {
      console.error('Delete event error:', error);
      throw error;
    }
  },

  // Register for an event
  registerForEvent: async eventId => {
    try {
      const response = await api.post(`/events/${eventId}/register`);
      return response.data;
    } catch (error) {
      console.error('Event registration error:', error);
      throw error;
    }
  },

  // Get event brochure
  getEventBrochure: async eventId => {
    try {
      const response = await api.get(`/events/${eventId}/brochure`);
      return response.data;
    } catch (error) {
      // If 404, it means no brochure found, which is not an error
      if (error.response && error.response.status === 404) {
        return null;
      }
      throw error;
    }
  },

  // Add these methods to your eventService object

  // Get all pharma companies (for sponsor dropdown)
  getPharmaCompanies: async () => {
    try {
      const response = await api.get('/events/pharma-companies');
      return response.data;
    } catch (error) {
      console.error('Get pharma companies error:', error);
      throw error;
    }
  },

  // Send sponsorship requests for an event
  sendSponsorshipRequests: async (eventId, pharmaIds) => {
    try {
      const response = await api.post(
        `/events/${eventId}/sponsorship-requests`,
        {pharmaIds},
      );
      return response.data;
    } catch (error) {
      console.error('Send sponsorship requests error:', error);
      throw error;
    }
  },

  // Get all sponsorship requests (for pharma or doctor)
  getSponsorshipRequests: async () => {
    try {
      const response = await api.get('/events/sponsorship-requests');
      return response.data;
    } catch (error) {
      console.error('Get sponsorship requests error:', error);
      throw error;
    }
  },

  // Respond to a sponsorship request (for pharma)
  respondToSponsorshipRequest: async (requestId, status) => {
    try {
      const response = await api.put(
        `/events/sponsorship-requests/${requestId}`,
        {status},
      );
      return response.data;
    } catch (error) {
      console.error('Respond to sponsorship request error:', error);
      throw error;
    }
  },
};

// User services
export const userService = {
  // Get current user's documents
  getMyDocuments: async () => {
    try {
      const response = await api.get('/users/my-documents');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Upload new documents
  uploadDocuments: async documents => {
    try {
      const response = await api.post('/users/documents', {documents});
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

// Private Meetings API methods
export const meetingService = {
  // Create a new private meeting
  createPrivateMeeting: async meetingData => {
    try {
      // Ensure we have an organizer name
      if (!meetingData.organizerName) {
        try {
          const userString = await AsyncStorage.getItem('user');
          if (userString) {
            const userData = JSON.parse(userString);
            meetingData.organizerName =
              userData.name || 'Pharmaceutical Representative';
          } else {
            meetingData.organizerName = 'Pharmaceutical Representative';
          }
        } catch (e) {
          // Fallback if AsyncStorage access fails
          meetingData.organizerName = 'Pharmaceutical Representative';
        }
      }

      console.log(
        'Creating private meeting with data:',
        JSON.stringify(meetingData),
      );
      const response = await api.post('/private-meetings', meetingData);
      console.log('Private meeting created successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Create private meeting error:', error);
      console.error('Error details:', error.response?.data || error.message);
      throw error;
    }
  },

  // Get meetings organized by the current pharma user
  getOrganizedMeetings: async () => {
    try {
      const response = await api.get('/private-meetings/organized');
      return response.data;
    } catch (error) {
      console.error('Get organized meetings error:', error);
      throw error;
    }
  },

  // Get meetings to which the doctor is invited
  getInvitedMeetings: async () => {
    try {
      const response = await api.get('/private-meetings/invited');
      return response.data;
    } catch (error) {
      console.error('Get invited meetings error:', error);
      throw error;
    }
  },

  // Get all meetings (admin only)
  getAllMeetings: async () => {
    try {
      const response = await api.get('/private-meetings/all');
      return response.data;
    } catch (error) {
      console.error('Get all meetings error:', error);
      throw error;
    }
  },

  // Get meeting details
  getMeetingById: async meetingId => {
    try {
      const response = await api.get(`/private-meetings/${meetingId}`);
      return response.data;
    } catch (error) {
      console.error('Get meeting details error:', error);
      throw error;
    }
  },

  // Update invitation status (accept/decline)
  updateInvitationStatus: async (invitationId, status) => {
    try {
      const response = await api.put(
        `/private-meetings/invitation/${invitationId}`,
        {status},
      );
      return response.data;
    } catch (error) {
      console.error('Update invitation status error:', error);
      throw error;
    }
  },

  // Cancel a meeting
  cancelMeeting: async meetingId => {
    try {
      const response = await api.put(`/private-meetings/${meetingId}/cancel`);
      return response.data;
    } catch (error) {
      console.error('Cancel meeting error:', error);
      throw error;
    }
  },

  // Get available doctors for invitations
  getAllDoctors: async () => {
    try {
      const response = await api.get('/private-meetings/doctors/available');
      return response.data;
    } catch (error) {
      console.error('Get available doctors error:', error);
      throw error;
    }
  },
};

export const courseService = {
  // Create a new course
  createCourse: async courseData => {
    try {
      const response = await api.post('/courses', courseData);
      return response.data;
    } catch (error) {
      console.error('Create course error:', error);
      throw error;
    }
  },

  // Get all courses
  getAllCourses: async () => {
    try {
      const response = await api.get('/courses');
      return response.data;
    } catch (error) {
      console.error('Get all courses error:', error);
      throw error;
    }
  },

  // Get course by id
  getCourseById: async courseId => {
    try {
      const response = await api.get(`/courses/${courseId}`);
      return response.data;
    } catch (error) {
      console.error('Get course error:', error);
      throw error;
    }
  },

  // Upload course video - Fixed express-fileupload eligibility issue
  // Update the uploadCourseVideo function
  uploadCourseVideo: async (videoFile, onProgress) => {
    try {
      // Get token
      const token =
        (await AsyncStorage.getItem('token')) ||
        (await AsyncStorage.getItem('@token'));

      if (!token) {
        throw new Error(
          'Authentication token is missing. Please log in again.',
        );
      }

      // Prepare properly formatted token
      const authToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

      console.log('[VIDEO DEBUG] Starting upload with file:', {
        name: videoFile.name,
        type: videoFile.type,
        size: videoFile.size
          ? `${(videoFile.size / 1024 / 1024).toFixed(2)}MB`
          : 'unknown',
      });

      // Create form data with the video file
      const formData = new FormData();

      // IMPORTANT: Key must be 'file' to match what express-fileupload looks for
      formData.append('file', {
        uri:
          Platform.OS === 'ios'
            ? videoFile.uri.replace('file://', '')
            : videoFile.uri,
        type: videoFile.type || 'video/mp4',
        name: videoFile.name || `video-${Date.now()}.mp4`,
      });

      // Use XMLHttpRequest for better multipart handling and progress tracking
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        // Track upload progress
        xhr.upload.onprogress = event => {
          if (event.lengthComputable) {
            const percentComplete = (event.loaded / event.total) * 100;
            console.log(
              `[VIDEO DEBUG] Upload progress: ${percentComplete.toFixed(2)}%`,
            );

            // Call the progress callback if provided
            if (onProgress && typeof onProgress === 'function') {
              onProgress(percentComplete);
            }
          }
        };

        xhr.open('POST', `${API_URL}/uploads/course-video`);
        xhr.setRequestHeader('Authorization', authToken);
        // DO NOT set Content-Type header - let XMLHttpRequest set it properly with boundary

        // Set timeout for larger files
        xhr.timeout = 300000; // 5 minutes

        xhr.onload = function () {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              resolve(data);
            } catch (e) {
              reject(new Error(`Invalid server response: ${xhr.responseText}`));
            }
          } else {
            reject(
              new Error(`Upload failed: ${xhr.status} ${xhr.responseText}`),
            );
          }
        };

        xhr.onerror = function () {
          reject(new Error('Network error occurred during upload'));
        };

        xhr.ontimeout = function () {
          reject(new Error('Upload timed out'));
        };

        xhr.send(formData);
      });
    } catch (error) {
      console.error('Upload course video error:', error);
      throw error;
    }
  },

  // Upload course thumbnail - Fixed express-fileupload eligibility issue
  uploadCourseThumbnail: async imageFile => {
    try {
      // Get token
      const token =
        (await AsyncStorage.getItem('token')) ||
        (await AsyncStorage.getItem('@token'));

      if (!token) {
        throw new Error(
          'Authentication token is missing. Please log in again.',
        );
      }

      // Prepare properly formatted token
      const authToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

      console.log('[THUMB DEBUG] Starting upload with file:', {
        name: imageFile.name,
        type: imageFile.type,
        size: imageFile.size
          ? `${(imageFile.size / 1024).toFixed(2)}KB`
          : 'unknown',
      });

      // Create form data with the image file
      const formData = new FormData();

      // IMPORTANT: Key must be 'file' to match what express-fileupload looks for
      formData.append('file', {
        uri:
          Platform.OS === 'ios'
            ? imageFile.uri.replace('file://', '')
            : imageFile.uri,
        type: imageFile.type || 'image/jpeg',
        name: imageFile.name || `image-${Date.now()}.jpg`,
      });

      // Use XMLHttpRequest for better multipart handling
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.open('POST', `${API_URL}/uploads/course-thumbnail`);
        xhr.setRequestHeader('Authorization', authToken);
        // DO NOT set Content-Type header - let XMLHttpRequest set it properly with boundary

        xhr.onload = function () {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              resolve(data);
            } catch (e) {
              reject(new Error(`Invalid server response: ${xhr.responseText}`));
            }
          } else {
            reject(
              new Error(`Upload failed: ${xhr.status} ${xhr.responseText}`),
            );
          }
        };

        xhr.onerror = function () {
          reject(new Error('Network error occurred during upload'));
        };

        xhr.send(formData);
      });
    } catch (error) {
      console.error('Upload course thumbnail error:', error);
      throw error;
    }
  },

  // Add video to course
  addVideoToCourse: async (courseId, videoData) => {
    try {
      const response = await api.post(`/courses/${courseId}/videos`, videoData);
      return response.data;
    } catch (error) {
      console.error('Add video to course error:', error);
      throw error;
    }
  },

  // Delete course
  deleteCourse: async courseId => {
    try {
      const response = await api.delete(`/courses/${courseId}`);
      return response.data;
    } catch (error) {
      console.error('Delete course error:', error);
      throw error;
    }
  },

  // Delete video from course
  deleteVideoFromCourse: async (courseId, videoId) => {
    try {
      const response = await api.delete(
        `/courses/${courseId}/videos/${videoId}`,
      );
      return response.data;
    } catch (error) {
      console.error('Delete video from course error:', error);
      throw error;
    }
  },

  // Add these methods to the courseService object

  // Get discussions for a course
  getCourseDiscussions: async (courseId, videoId = null) => {
    try {
      let url = `/courses/${courseId}/discussions`;
      
      // Only add videoId as query param if it exists and isn't null/undefined
      if (videoId && videoId !== 'null' && videoId !== 'undefined') {
        url += `?video_id=${videoId}`;
      }
      
      console.log('Requesting discussions from:', url);
      
      const response = await api.get(url);
      console.log(`Retrieved ${response.data?.length || 0} discussions`);
      
      return response.data || [];
    } catch (error) {
      console.error('Error fetching course discussions:', error);
      throw error;
    }
  },

  // Update the addCourseDiscussion method
  addCourseDiscussion: async (courseId, discussionData) => {
    try {
      console.log('Adding discussion with data:', discussionData);

      const response = await api.post(
        `/courses/${courseId}/discussions`,
        discussionData,
      );

      console.log('Add discussion response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Add course discussion error:', error);
      throw error;
    }
  },

  // Delete a discussion from a course
  deleteCourseDiscussion: async (courseId, discussionId) => {
    try {
      const response = await api.delete(
        `/courses/${courseId}/discussions/${discussionId}`,
      );
      return response.data;
    } catch (error) {
      console.error('Delete course discussion error:', error);
      throw error;
    }
  },

  // Get course comments
  getCourseComments: async (courseId) => {
    try {
      const response = await api.get(`/courses/${courseId}/comments`);
      return response.data;
    } catch (error) {
      console.error('Error getting course comments:', error);
      throw error;
    }
  },

  // Add a comment to a course
  addCourseComment: async (courseId, content) => {
    try {
      const response = await api.post(`/courses/${courseId}/comments`, {
        content,
      });
      return response.data;
    } catch (error) {
      console.error('Error adding course comment:', error);
      throw error;
    }
  },

  // Get video comments
  getVideoComments: async (courseId, videoId) => {
    try {
      const response = await api.get(`/courses/${courseId}/videos/${videoId}/comments`);
      return response.data;
    } catch (error) {
      console.error('Error getting video comments:', error);
      throw error;
    }
  },

  // Add a comment to a video
  addVideoComment: async (courseId, videoId, content) => {
    try {
      const response = await api.post(`/courses/${courseId}/videos/${videoId}/comments`, {
        content,
      });
      return response.data;
    } catch (error) {
      console.error('Error adding video comment:', error);
      throw error;
    }
  },
};

export default api;
