import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StatusBar,
  Platform,
  Alert,
  Switch,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import {useAuth} from '../context/AuthContext';
import {eventService, userService} from '../services/api';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Picker} from '@react-native-picker/picker';
import CheckBox from '@react-native-community/checkbox';

const CreateConferenceScreen = ({navigation}) => {
  const insets = useSafeAreaInsets();
  const {user} = useAuth();
  const isAdmin = user && user.role === 'admin';
  
  // Basic event details
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [venue, setVenue] = useState('');
  const [organizerName, setOrganizerName] = useState('');
  const [organizerEmail, setOrganizerEmail] = useState('');
  const [organizerPhone, setOrganizerPhone] = useState('');
  const [conferenceType, setConferenceType] = useState('Conference');
  const [conferenceMode, setConferenceMode] = useState('In-Person');
  const [capacity, setCapacity] = useState('');
  const [website, setWebsite] = useState('');
  const [regFee, setRegFee] = useState('');
  const [isFree, setIsFree] = useState(false);
  const [tags, setTags] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Multi-day event states
  const [numberOfDays, setNumberOfDays] = useState(1);
  const [eventDays, setEventDays] = useState([{
    id: 1,
    date: new Date(),
    startTime: new Date(),
    endTime: new Date(new Date().setHours(new Date().getHours() + 2)),
    venue: '',
    venueAddress: '',
    description: '',
    capacity: '',
    specialNotes: '',
    showDatePicker: false,
    showStartTimePicker: false,
    showEndTimePicker: false,
  }]);

  // Sponsors and speakers states
  const [sponsors, setSponsors] = useState([]);
  const [newSponsorName, setNewSponsorName] = useState('');
  const [newSponsorLevel, setNewSponsorLevel] = useState('');
  const [speakers, setSpeakers] = useState([]);
  const [newSpeakerName, setNewSpeakerName] = useState('');
  const [newSpeakerTitle, setNewSpeakerTitle] = useState('');
  const [newSpeakerBio, setNewSpeakerBio] = useState('');

  // Pharma companies state
  const [pharmaCompanies, setPharmaCompanies] = useState([]);
  const [selectedPharmaIds, setSelectedPharmaIds] = useState([]);
  const [loadingPharma, setLoadingPharma] = useState(false);
  const [sponsorSearchQuery, setSponsorSearchQuery] = useState('');
  const [filteredPharmaCompanies, setFilteredPharmaCompanies] = useState([]);
  const [showSponsorDropdown, setShowSponsorDropdown] = useState(false);

  // Private event states
  const [isPrivateEvent, setIsPrivateEvent] = useState(false);
  const [invitedMembers, setInvitedMembers] = useState([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [availableUsers, setAvailableUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Handle number of days change
  const handleNumberOfDaysChange = (days) => {
    const numDays = parseInt(days) || 1;
    setNumberOfDays(numDays);
    
    const newEventDays = [];
    for (let i = 0; i < numDays; i++) {
      if (eventDays[i]) {
        // Keep existing data if available
        newEventDays.push(eventDays[i]);
      } else {
        // Create new day with default values
        const baseDate = eventDays[0]?.date || new Date();
        const dayDate = new Date(baseDate);
        dayDate.setDate(baseDate.getDate() + i);
        
        newEventDays.push({
          id: i + 1,
          date: dayDate,
          startTime: new Date(),
          endTime: new Date(new Date().setHours(new Date().getHours() + 2)),
          venue: '',
          venueAddress: '',
          description: '',
          capacity: '',
          specialNotes: '',
          showDatePicker: false,
          showStartTimePicker: false,
          showEndTimePicker: false,
        });
      }
    }
    setEventDays(newEventDays);
  };

  // Update event day data
  const updateEventDay = (dayIndex, field, value) => {
    setEventDays(prevDays => {
      const updatedDays = [...prevDays];
      updatedDays[dayIndex] = {
        ...updatedDays[dayIndex],
        [field]: value,
      };
      return updatedDays;
    });
  };
  
  // Replace your existing handleDateChange function
const handleDateChange = (dayIndex, event, selectedDate) => {
  // Always close the picker first
  updateEventDay(dayIndex, 'showDatePicker', false);
  
  // Only update the date if user pressed OK and selected a date
  if (event.type === 'set' && selectedDate) {
    updateEventDay(dayIndex, 'date', selectedDate);
  }
  // If user canceled (event.type === 'dismissed'), do nothing - just close the picker
};

// Replace your existing handleTimeChange function
const handleTimeChange = (dayIndex, timeType, event, selectedTime) => {
  // Always close the picker first
  updateEventDay(dayIndex, `show${timeType}TimePicker`, false);
  
  // Only update the time if user pressed OK and selected a time
  if (event.type === 'set' && selectedTime) {
    updateEventDay(dayIndex, timeType === 'Start' ? 'startTime' : 'endTime', selectedTime);
  }
  // If user canceled (event.type === 'dismissed'), do nothing - just close the picker
};

  const formatDate = date => {
    return `${date.getFullYear()}-${(date.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  };

  const formatTime = date => {
    return `${date.getHours().toString().padStart(2, '0')}:${date
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;
  };

  const validateEmail = email => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  // Sponsors and speakers functions (keep existing ones)
  const addSponsor = () => {
    if (newSponsorName.trim() === '') {
      Alert.alert('Missing Information', 'Please enter sponsor name.');
      return;
    }

    const newSponsor = {
      id: Date.now().toString(),
      name: newSponsorName.trim(),
      level: newSponsorLevel.trim() || 'Standard',
    };

    setSponsors([...sponsors, newSponsor]);
    setNewSponsorName('');
    setNewSponsorLevel('');
  };

  const removeSponsor = sponsorId => {
    setSponsors(sponsors.filter(sponsor => sponsor.id !== sponsorId));
  };

  const addSpeaker = () => {
    if (newSpeakerName.trim() === '') {
      Alert.alert('Missing Information', 'Please enter speaker name.');
      return;
    }

    const newSpeaker = {
      id: Date.now().toString(),
      name: newSpeakerName.trim(),
      title: newSpeakerTitle.trim(),
      bio: newSpeakerBio.trim(),
    };

    setSpeakers([...speakers, newSpeaker]);
    setNewSpeakerName('');
    setNewSpeakerTitle('');
    setNewSpeakerBio('');
  };

  const removeSpeaker = speakerId => {
    setSpeakers(speakers.filter(speaker => speaker.id !== speakerId));
  };

  // Pharma companies functions (keep existing ones)
  useEffect(() => {
    fetchPharmaCompanies();
  }, []);

  const fetchPharmaCompanies = async () => {
    try {
      setLoadingPharma(true);
      const data = await eventService.getPharmaCompanies();
      setPharmaCompanies(data);
    } catch (error) {
      console.error('Failed to fetch pharma companies:', error);
      Alert.alert('Error', 'Failed to load pharmaceutical companies');
    } finally {
      setLoadingPharma(false);
    }
  };

  const handleSponsorSearch = query => {
    setSponsorSearchQuery(query);
    if (query.trim() === '') {
      setFilteredPharmaCompanies([]);
      setShowSponsorDropdown(false);
    } else {
      const filtered = pharmaCompanies.filter(pharma =>
        (pharma.company || pharma.name)
          .toLowerCase()
          .includes(query.toLowerCase()),
      );
      setFilteredPharmaCompanies(filtered);
      setShowSponsorDropdown(true);
    }
  };

  const addSelectedSponsor = pharma => {
    if (selectedPharmaIds.includes(pharma.id)) {
      Alert.alert('Already Added', 'This sponsor has already been added.');
      return;
    }

    setSelectedPharmaIds([...selectedPharmaIds, pharma.id]);
    setSponsorSearchQuery('');
    setFilteredPharmaCompanies([]);
    setShowSponsorDropdown(false);
  };

  const removeSelectedSponsor = pharmaId => {
    setSelectedPharmaIds(selectedPharmaIds.filter(id => id !== pharmaId));
  };

  // Fetch users when private event is toggled
  useEffect(() => {
    if (isPrivateEvent) fetchAvailableUsers();
  }, [isPrivateEvent]);

  // Update the fetchAvailableUsers function
const fetchAvailableUsers = async () => {
  setLoadingUsers(true);
  try {
    console.log('📱 CreateConference: Fetching available users for private event invitations');
    console.log('📱 CreateConference: User context:', { id: user?.id, role: user?.role });
    
    // Use eventService instead of direct api call
    const response = await eventService.getAvailableUsers();
    console.log('📱 CreateConference: Available users response:', {
      count: response?.length || 0,
      users: response?.map(u => ({ id: u.id, name: u.name, email: u.email }))
    });
    
    setAvailableUsers(response || []);
  } catch (error) {
    console.error('❌ CreateConference: Failed to fetch available users:', error);
    
    let errorMessage = 'Failed to load available users. ';
    if (error.response?.status === 400) {
      errorMessage += 'Bad request - please try again.';
    } else if (error.response?.status === 401) {
      errorMessage += 'Please log in again.';
    } else if (error.response?.status === 500) {
      errorMessage += 'Server error. Please try again later.';
    } else {
      errorMessage += 'Please check your connection.';
    }
    
    Alert.alert('Error', errorMessage);
    setAvailableUsers([]);
  } finally {
    setLoadingUsers(false);
  }
};

  const handleMemberSearch = (query) => {
    setMemberSearchQuery(query);
    if (query.trim().length < 2) {
      setFilteredUsers([]);
      setShowMemberDropdown(false);
      return;
    }
    const searchTerm = query.toLowerCase();
    const filtered = availableUsers.filter(
      user =>
        user.name.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm)
    );
    setFilteredUsers(filtered);
    setShowMemberDropdown(true);
  };

  const addMember = (user) => {
    if (!invitedMembers.some(member => member.id === user.id)) {
      setInvitedMembers([...invitedMembers, user]);
    }
    setMemberSearchQuery('');
    setFilteredUsers([]);
    setShowMemberDropdown(false);
  };

  const removeMember = (userId) => {
    setInvitedMembers(invitedMembers.filter(member => member.id !== userId));
  };

  const handleCreateConference = async () => {
    // Validate basic fields - UPDATED: Only title is required
    if (!title) {
      Alert.alert('Missing Information', 'Please enter an event title.');
      return;
    }

    // Validate event days
    for (let i = 0; i < eventDays.length; i++) {
      const day = eventDays[i];
      if (!day.date) {
        Alert.alert('Missing Information', `Please set date for Day ${i + 1}.`);
        return;
      }
      if (day.endTime <= day.startTime) {
        Alert.alert('Invalid Time', `End time must be after start time for Day ${i + 1}.`);
        return;
      }
    }

    if (isAdmin) {
      if (organizerEmail && !validateEmail(organizerEmail)) {
        Alert.alert('Invalid Email', 'Please enter a valid email address.');
        return;
      }

      if (!agreeToTerms) {
        Alert.alert(
          'Terms and Conditions',
          'You must agree to the terms and conditions to create an event.',
        );
        return;
      }
    }

    // Prepare event days data
    const eventDaysData = eventDays.map((day, index) => ({
      dayNumber: index + 1,
      date: formatDate(day.date),
      startTime: formatTime(day.startTime),
      endTime: formatTime(day.endTime),
      venue: day.venue || '',
      venueAddress: day.venueAddress || '',
      description: day.description || '',
      capacity: day.capacity ? parseInt(day.capacity) : null,
      specialNotes: day.specialNotes || '',
    }));

    // Combine manual sponsors and selected pharma sponsors
    const pharmaSponsors = selectedPharmaIds.map(id => {
      const pharma = pharmaCompanies.find(p => p.id === id);
      return {
        id: pharma.id,
        name: pharma.company || pharma.name,
        level: 'Standard',
        contactPerson: pharma.name,
        contactEmail: pharma.email || '',
        pharma_id: pharma.id,
        type: 'pharma_company',
        approved: false,
      };
    });

    const allSponsors = [...sponsors, ...pharmaSponsors];

    // Create event object
    const newEvent = {
      title,
      description: description || '', // Allow empty description
      venue: venue || eventDays[0]?.venue || '',
      organizerName,
      organizerEmail,
      organizerPhone,
      // Use first and last day for overall event dates
      startDate: new Date(eventDays[0].date).toISOString(),
      endDate: new Date(eventDays[eventDays.length - 1].date).toISOString(),
      start_time: formatTime(eventDays[0].startTime),
      end_time: formatTime(eventDays[eventDays.length - 1].endTime),
      type: conferenceType,
      mode: conferenceMode,
      capacity: capacity ? parseInt(capacity, 10) : null,
      website,
      registrationFee: isFree ? '0' : regFee,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      termsAndConditions,
      sponsors: allSponsors,
      speakers,
      // Add event days data
      eventDays: eventDaysData,
    };

    console.log('Submitting event with days:', newEvent);

    try {
      setIsSubmitting(true);

      if (isPrivateEvent) {
        // CREATE PRIVATE MEETING
        const privateMeetingData = {
          title,
          description: description || '',
          organizerName: user?.name || 'Event Organizer',
          startDate: new Date(eventDays[0].date).toISOString(),
          endDate: new Date(eventDays[eventDays.length - 1].date).toISOString(),
          startTime: formatTime(eventDays[0].startTime),
          endTime: formatTime(eventDays[eventDays.length - 1].endTime),
          venue: venue || eventDays[0]?.venue || 'TBD',
          mode: conferenceMode === 'Virtual' ? 'Virtual' : 'In-Person',
          meetingLink: conferenceMode === 'Virtual' ? website : null,
          invitedMembers: invitedMembers, // Use invitedMembers instead of invitedDoctors
        };

        console.log('Creating private meeting:', privateMeetingData);
        const result = await userService.createPrivateMeeting(privateMeetingData);

        Alert.alert(
          'Success',
          'Your private meeting has been created successfully! Invited members have been notified.',
          [{text: 'OK', onPress: () => navigation.goBack()}],
        );
      } else {
        const result = await eventService.createEvent(newEvent);

        if (selectedPharmaIds.length > 0) {
          try {
            await eventService.sendSponsorshipRequests(
              result.event.id,
              selectedPharmaIds,
            );
            console.log('Sponsorship requests sent successfully');
          } catch (sponsorError) {
            console.error('Error sending sponsorship requests:', sponsorError);
          }
        }

        Alert.alert(
          'Success',
          result.requiresApproval
            ? 'Your event has been submitted for approval. You will be notified once it is reviewed.'
            : 'Your event has been created successfully!',
          [{text: 'OK', onPress: () => navigation.goBack()}],
        );
      }
    } catch (error) {
      console.log('Error creating event/meeting:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to create event. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render event day component
  const renderEventDay = (day, index) => (
    <View key={day.id} style={styles.eventDayContainer}>
      <Text style={styles.dayTitle}>Day {index + 1}</Text>
      
      {/* Date Selection */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Date*</Text>
        <TouchableOpacity
          style={styles.dateInput}
          onPress={() => updateEventDay(index, 'showDatePicker', true)}>
          <Text>{formatDate(day.date)}</Text>
          <Icon name="calendar" size={18} color="#666" />
        </TouchableOpacity>
        {day.showDatePicker && (
          <DateTimePicker
            value={day.date}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => handleDateChange(index, event, selectedDate)}
            minimumDate={new Date()}
          />
        )}
      </View>

      {/* Time Selection */}
      <View style={styles.timeContainer}>
        <View style={styles.timeGroup}>
          <Text style={styles.inputLabel}>Start Time*</Text>
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => updateEventDay(index, 'showStartTimePicker', true)}>
            <Text>{formatTime(day.startTime)}</Text>
            <Icon name="clock-outline" size={18} color="#666" />
          </TouchableOpacity>
          {day.showStartTimePicker && (
            <DateTimePicker
              value={day.startTime}
              mode="time"
              display="default"
              onChange={(event, selectedTime) => handleTimeChange(index, 'Start', event, selectedTime)}
            />
          )}
        </View>

        <View style={styles.timeGroup}>
          <Text style={styles.inputLabel}>End Time*</Text>
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => updateEventDay(index, 'showEndTimePicker', true)}>
            <Text>{formatTime(day.endTime)}</Text>
            <Icon name="clock-outline" size={18} color="#666" />
          </TouchableOpacity>
          {day.showEndTimePicker && (
            <DateTimePicker
              value={day.endTime}
              mode="time"
              display="default"
              onChange={(event, selectedTime) => handleTimeChange(index, 'End', event, selectedTime)}
            />
          )}
        </View>
      </View>

      {/* Note for admin editing */}
      <View style={styles.adminNoteContainer}>
        <Icon name="information" size={16} color="#2e7af5" />
        <Text style={styles.adminNoteText}>
          Additional details like venue and capacity for each day can be set by admin during approval.
        </Text>
      </View>
    </View>
  );

  // Render functions for sponsors and speakers (keep existing ones)
  const renderSponsorItem = ({item}) => (
    <View style={styles.listItem}>
      <View style={styles.listItemContent}>
        <Text style={styles.listItemTitle}>{item.name}</Text>
        <Text style={styles.listItemSubtitle}>Level: {item.level}</Text>
      </View>
      <TouchableOpacity onPress={() => removeSponsor(item.id)}>
        <Icon name="delete" size={24} color="#ff6b6b" />
      </TouchableOpacity>
    </View>
  );

  const renderSpeakerItem = ({item}) => (
    <View style={styles.listItem}>
      <View style={styles.listItemContent}>
        <Text style={styles.listItemTitle}>{item.name}</Text>
        {item.title ? (
          <Text style={styles.listItemSubtitle}>{item.title}</Text>
        ) : null}
        {item.bio ? (
          <Text style={styles.listItemDescription} numberOfLines={2}>
            {item.bio}
          </Text>
        ) : null}
      </View>
      <TouchableOpacity onPress={() => removeSpeaker(item.id)}>
        <Icon name="delete" size={24} color="#ff6b6b" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, {paddingTop: insets.top}]}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#2e7af5" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create New Event</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.formContainer}>
          {/* Event Visibility Toggle - Available for ALL users, not just admin */}
          <Text style={styles.sectionTitle}>Event Visibility</Text>
          <View style={styles.toggleSection}>
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[
                  styles.visibilityButton,
                  !isPrivateEvent && styles.visibilityButtonActive,
                ]}
                onPress={() => {
                  setIsPrivateEvent(false);
                  setInvitedMembers([]);
                  setMemberSearchQuery('');
                  setShowMemberDropdown(false);
                }}>
                <Icon
                  name="earth"
                  size={18}
                  color={!isPrivateEvent ? '#fff' : '#666'}
                />
                <Text
                  style={[
                    styles.visibilityButtonText,
                    !isPrivateEvent && styles.visibilityButtonTextActive,
                  ]}>
                  Public Event
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.visibilityButton,
                  isPrivateEvent && styles.visibilityButtonActive,
                ]}
                onPress={() => setIsPrivateEvent(true)}>
                <Icon
                  name="lock"
                  size={18}
                  color={isPrivateEvent ? '#fff' : '#666'}
                />
                <Text
                  style={[
                    styles.visibilityButtonText,
                    isPrivateEvent && styles.visibilityButtonTextActive,
                  ]}>
                  Private Event
                </Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.visibilityDescription}>
              {isPrivateEvent 
                ? 'Only invited members will be able to see and register for this event'
                : 'You can invite specific members or make it available to everyone'
              }
            </Text>
          </View>

          {/* Member Invitation Section - Show for both private and public events */}
          {(isPrivateEvent || (!isPrivateEvent && user?.role !== 'admin')) && (
            <>
              <Text style={styles.sectionTitle}>
                {isPrivateEvent ? 'Invite Members' : 'Invite Specific Members (Optional)'}
              </Text>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Search and Add Members*</Text>
                <View style={styles.searchContainer}>
                  <View style={styles.searchInputContainer}>
                    <Icon name="account-search" size={20} color="#666" style={styles.searchIcon} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search users by name or email (min 2 characters)..."
                      placeholderTextColor="#999"
                      value={memberSearchQuery}
                      onChangeText={handleMemberSearch}
                      onFocus={() => memberSearchQuery.trim().length >= 2 && setShowMemberDropdown(true)}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                    {memberSearchQuery.length > 0 && (
                      <TouchableOpacity
                        onPress={() => {
                          setMemberSearchQuery('');
                          setFilteredUsers([]);
                          setShowMemberDropdown(false);
                        }}
                        style={styles.clearSearchButton}>
                        <Icon name="close-circle" size={18} color="#888" />
                      </TouchableOpacity>
                    )}
                  </View>
                  {showMemberDropdown && memberSearchQuery.trim().length >= 2 && (
                    <View style={styles.searchDropdown}>
                      {filteredUsers.length > 0 ? (
                        filteredUsers.map(user => (
                          <TouchableOpacity
                            key={user.id}
                            style={styles.searchResultItem}
                            onPress={() => addMember(user)}
                          >
                            <Text style={styles.searchResultText}>{user.name} ({user.email})</Text>
                          </TouchableOpacity>
                        ))
                      ) : (
                        <Text style={styles.noResultsText}>No users found</Text>
                      )}
                    </View>
                  )}
                </View>
              </View>
              {/* Invited Members */}
              {invitedMembers.length > 0 && (
                <View style={styles.invitedMembersContainer}>
                  <Text style={styles.invitedMembersTitle}>
                    Invited Members ({invitedMembers.length})
                  </Text>
                  <View style={styles.membersList}>
                    {invitedMembers.map(member => (
                      <View key={member.id} style={styles.memberChip}>
                        <Text>{member.name} ({member.email})</Text>
                        <TouchableOpacity onPress={() => removeMember(member.id)}>
                          <Icon name="close" size={16} color="#666" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </>
          )}

          {/* Conference Type Selection */}
          <Text style={styles.sectionTitle}>Event Type</Text>
          <View style={styles.radioContainer}>
            <TouchableOpacity
              style={[
                styles.radioButton,
                conferenceType === 'Conference' && styles.radioButtonSelected,
              ]}
              onPress={() => setConferenceType('Conference')}>
              <View style={styles.radioCircle}>
                {conferenceType === 'Conference' && (
                  <View style={styles.radioDot} />
                )}
              </View>
              <Text style={styles.radioText}>Conference</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.radioButton,
                conferenceType === 'Meeting' && styles.radioButtonSelected,
              ]}
              onPress={() => setConferenceType('Meeting')}>
              <View style={styles.radioCircle}>
                {conferenceType === 'Meeting' && (
                  <View style={styles.radioDot} />
                )}
              </View>
              <Text style={styles.radioText}>Meeting</Text>
            </TouchableOpacity>
          </View>

          {/* Conference Mode Selection */}
          <Text style={styles.sectionTitle}>Event Mode</Text>
          <View style={styles.radioContainer}>
            <TouchableOpacity
              style={[
                styles.radioButton,
                conferenceMode === 'In-Person' && styles.radioButtonSelected,
              ]}
              onPress={() => setConferenceMode('In-Person')}>
              <View style={styles.radioCircle}>
                {conferenceMode === 'In-Person' && (
                  <View style={styles.radioDot} />
                )}
              </View>
              <Text style={styles.radioText}>In-Person</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.radioButton,
                conferenceMode === 'Virtual' && styles.radioButtonSelected,
              ]}
              onPress={() => setConferenceMode('Virtual')}>
              <View style={styles.radioCircle}>
                {conferenceMode === 'Virtual' && (
                  <View style={styles.radioDot} />
                )}
              </View>
              <Text style={styles.radioText}>Virtual</Text>
            </TouchableOpacity>
          </View>

          {/* Basic Information */}
          <Text style={styles.sectionTitle}>Basic Information</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Event Title*</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter a descriptive title"
              placeholderTextColor={'#999'}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Describe the purpose and topics of your event"
              placeholderTextColor={'#999'}
              value={description}
              onChangeText={setDescription}
              multiline={true}
              numberOfLines={4}
            />
          </View>

          {isAdmin && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Tags (comma separated)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., healthcare, technology, education"
                placeholderTextColor={'#999'}
                value={tags}
                onChangeText={setTags}
              />
              <Text style={styles.adminOnlyLabel}>Admin only field</Text>
            </View>
          )}

          {/* Number of Days Selection */}
          <Text style={styles.sectionTitle}>Event Duration</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Number of Days*</Text>
            <View style={styles.daysContainer}>
              {[1, 2, 3, 4, 5, 6, 7].map((days) => (
                <TouchableOpacity
                  key={days}
                  style={[
                    styles.dayButton,
                    numberOfDays === days && styles.dayButtonSelected,
                  ]}
                  onPress={() => handleNumberOfDaysChange(days)}>
                  <Text
                    style={[
                      styles.dayButtonText,
                      numberOfDays === days && styles.dayButtonTextSelected,
                    ]}>
                    {days}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Event Days Section */}
          <Text style={styles.sectionTitle}>Event Schedule</Text>
          {eventDays.map((day, index) => renderEventDay(day, index))}

          {/* General Venue (if admin) */}
          {isAdmin && (
            <>
              <Text style={styles.sectionTitle}>General Event Information</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Main Venue/Platform
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={
                    conferenceMode === 'Virtual'
                      ? 'e.g., Zoom, Google Meet, or platform link'
                      : 'Enter the main venue or address'
                  }
                  placeholderTextColor={'#999'}
                  value={venue}
                  onChangeText={setVenue}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Overall Capacity</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Maximum number of attendees overall"
                  placeholderTextColor={'#999'}
                  value={capacity}
                  onChangeText={setCapacity}
                  keyboardType="number-pad"
                />
              </View>
            </>
          )}

          {/* Speakers Section */}
          {isAdmin && (
            <>
              <Text style={styles.sectionTitle}>
                Speakers <Text style={styles.adminOnlyText}>(Admin Only)</Text>
              </Text>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Speaker Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter speaker name"
                  placeholderTextColor={'#999'}
                  value={newSpeakerName}
                  onChangeText={setNewSpeakerName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Speaker Title/Role</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Professor of Computer Science, CEO"
                  placeholderTextColor={'#999'}
                  value={newSpeakerTitle}
                  onChangeText={setNewSpeakerTitle}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Speaker Bio</Text>
                <TextInput
                  style={[styles.input, styles.textarea]}
                  placeholder="Brief background about the speaker"
                  placeholderTextColor={'#999'}
                  value={newSpeakerBio}
                  onChangeText={setNewSpeakerBio}
                  multiline={true}
                  numberOfLines={3}
                />
              </View>

              <TouchableOpacity style={styles.addButton} onPress={addSpeaker}>
                <Icon name="plus" size={20} color="white" />
                <Text style={styles.addButtonText}>Add Speaker</Text>
              </TouchableOpacity>

              {speakers.length > 0 && (
                <View style={styles.listContainer}>
                  <FlatList
                    data={speakers}
                    renderItem={renderSpeakerItem}
                    keyExtractor={item => item.id}
                    scrollEnabled={false}
                  />
                </View>
              )}
            </>
          )}

          {/* Sponsors Section */}
          <Text style={styles.sectionTitle}>Sponsors</Text>

          {/* Sponsor Search */}
          <View style={[styles.inputGroup]}>
            {/* Search Input */}
            <View style={styles.searchContainer}>
              <View style={styles.searchInputContainer}>
                <Icon name="magnify" size={20} color="#666" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Add pharmaceutical companies by search"
                  placeholderTextColor="#999"
                  value={sponsorSearchQuery}
                  onChangeText={handleSponsorSearch}
                  onFocus={() => sponsorSearchQuery && setShowSponsorDropdown(true)}
                />
                {sponsorSearchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      setSponsorSearchQuery('');
                      setFilteredPharmaCompanies([]);
                      setShowSponsorDropdown(false);
                    }}
                    style={styles.clearSearchButton}>
                    <Icon name="close" size={20} color="#999" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Search Results Dropdown */}
              {showSponsorDropdown && filteredPharmaCompanies.length > 0 && (
                <View style={styles.searchDropdown}>
                  {filteredPharmaCompanies.map((pharma) => (
                    <TouchableOpacity
                      key={pharma.id}
                      style={[
                        styles.searchResultItem,
                        selectedPharmaIds.includes(pharma.id) && styles.searchResultItemSelected
                      ]}
                      onPress={() => addSelectedSponsor(pharma)}
                      disabled={selectedPharmaIds.includes(pharma.id)}
                    >
                      <View style={styles.searchResultContent}>
                        <Text style={[
                          styles.searchResultText,
                          selectedPharmaIds.includes(pharma.id) && styles.searchResultTextSelected
                        ]}>
                          {pharma.company || pharma.name}
                        </Text>
                        {selectedPharmaIds.includes(pharma.id) && (
                          <Icon name="check-circle" size={20} color="#4caf50" />
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* No Results Message */}
              {showSponsorDropdown && filteredPharmaCompanies.length === 0 && sponsorSearchQuery.trim() !== '' && (
                <View style={styles.noResultsContainer}>
                  <Text style={styles.noResultsText}>
                    No pharmaceutical companies found matching "{sponsorSearchQuery}"
                  </Text>
                </View>
              )}
            </View>

            {/* Loading State */}
            {loadingPharma && (
              <ActivityIndicator
                size="small"
                color="#2e7af5"
                style={{marginVertical: 10}}
              />
            )}
          </View>

          {/* Selected Sponsors Display */}
          {selectedPharmaIds.length > 0 && (
            <View style={styles.selectedSponsorsContainer}>
              <Text style={styles.selectedSponsorsTitle}>
                Selected Sponsors ({selectedPharmaIds.length})
              </Text>
              
              <View style={styles.selectedSponsorsList}>
                {selectedPharmaIds.map(id => {
                  const pharma = pharmaCompanies.find(p => p.id === id);
                  if (!pharma) return null;
                  
                  return (
                    <View key={id} style={styles.selectedSponsorChip}>
                      <Text style={styles.selectedSponsorName}>
                        {pharma.company || pharma.name}
                      </Text>
                      <TouchableOpacity
                        onPress={() => removeSelectedSponsor(id)}
                        style={styles.removeSponsorButton}
                      >
                        <Icon name="close" size={16} color="#666" />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Current Manual Sponsors List */}
          {sponsors.length > 0 && (
            <View style={styles.listContainer}>
              <Text style={styles.sponsorListTitle}>
                Added Manual Sponsors:
              </Text>
              <FlatList
                data={sponsors}
                renderItem={renderSponsorItem}
                keyExtractor={item => item.id}
                scrollEnabled={false}
              />
            </View>
          )}

          {/* Registration */}
          {isAdmin && (
            <>
              <Text style={styles.sectionTitle}>
                Registration{' '}
                <Text style={styles.adminOnlyText}>(Admin Only)</Text>
              </Text>
              <View style={styles.inputGroup}>
                <View style={styles.switchContainer}>
                  <Text style={styles.inputLabel}>Free Event</Text>
                  <Switch
                    value={isFree}
                    onValueChange={setIsFree}
                    trackColor={{false: '#767577', true: '#81b0ff'}}
                    thumbColor={isFree ? '#2e7af5' : '#f4f3f4'}
                  />
                </View>
              </View>

              {!isFree && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Registration Fee</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter amount (e.g., 99.99)"
                    placeholderTextColor={'#999'}
                    value={regFee}
                    onChangeText={setRegFee}
                    keyboardType="decimal-pad"
                  />
                </View>
              )}
            </>
          )}

          {/* Organizer */}
          {isAdmin && (
            <>
              <Text style={styles.sectionTitle}>
                Organizer <Text style={styles.adminOnlyText}>(Admin Only)</Text>
              </Text>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Organizer Name*</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., American Medical Association"
                  placeholderTextColor={'#999'}
                  value={organizerName}
                  onChangeText={setOrganizerName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Organizer Email*</Text>
                <TextInput
                  style={styles.input}
                  placeholder="contact@example.com"
                  placeholderTextColor={'#999'}
                  value={organizerEmail}
                  onChangeText={setOrganizerEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Organizer Phone</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., +1 (555) 123-4567"
                  placeholderTextColor={'#999'}
                  value={organizerPhone}
                  onChangeText={setOrganizerPhone}
                  keyboardType="phone-pad"
                />
              </View>
            </>
          )}

          {/* Terms and Conditions */}
          {isAdmin && (
            <>
              <Text style={styles.sectionTitle}>Terms and Conditions</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Terms and Conditions</Text>
                <TextInput
                  style={[styles.input, styles.termsTextarea]}
                  placeholder="Enter the terms and conditions for your event"
                  placeholderTextColor={'#999'}
                  value={termsAndConditions}
                  onChangeText={setTermsAndConditions}
                  multiline={true}
                  numberOfLines={6}
                />
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.checkboxContainer}>
                  <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() => setAgreeToTerms(!agreeToTerms)}>
                    {agreeToTerms && (
                      <Icon name="check" size={16} color="#2e7af5" />
                    )}
                  </TouchableOpacity>
                  <Text style={styles.checkboxLabel}>
                    I agree to the terms and conditions for creating this event
                  </Text>
                </View>
              </View>
            </>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreateConference}
            disabled={isSubmitting}>
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.createButtonText}>
                {isPrivateEvent ? 'Create Private Meeting' : 'Create Event'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 16,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  backButton: {
    marginRight: 16,
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    padding: 16,
    paddingBottom: 100, // Extra padding for the bottom button
  },
  
  // Section styling
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 24,
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6',
  },
  
  // Card styling for sections
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  
  // Event visibility toggle
  toggleSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  visibilityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
  },
  visibilityButtonActive: {
    backgroundColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  visibilityButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginLeft: 8,
  },
  visibilityButtonTextActive: {
    color: '#fff',
  },
  visibilityDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    textAlign: 'center',
  },
  
  // Radio buttons
  radioContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 4,
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
  },
  radioButtonSelected: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  radioCircle: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  radioDot: {
    height: 10,
    width: 10,
    borderRadius: 5,
    backgroundColor: '#3b82f6',
  },
  radioText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  
  // Input styling
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1e293b',
  },
  inputFocused: {
    borderColor: '#3b82f6',
    backgroundColor: '#fafbff',
  },
  textarea: {
    height: 120,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  termsTextarea: {
    height: 160,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  
  // Admin only styling
  adminOnlyLabel: {
    fontSize: 12,
    color: '#3b82f6',
    marginTop: 6,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  adminOnlyText: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '600',
    fontStyle: 'italic',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  
  // Days selection
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  dayButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  dayButtonSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  dayButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748b',
  },
  dayButtonTextSelected: {
    color: '#fff',
  },
  
  // Event day container
  eventDayContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3b82f6',
    marginBottom: 20,
    textAlign: 'center',
    backgroundColor: '#eff6ff',
    paddingVertical: 12,
    borderRadius: 10,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  timeGroup: {
    flex: 1,
  },
  dateInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  // Search container
  searchContainer: {
    position: 'relative',
    zIndex: 1000,
  },
  searchInputContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
  },
  clearSearchButton: {
    padding: 8,
  },
  searchDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1001,
    maxHeight: 200,
  },
  searchResultItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  searchResultItemSelected: {
    backgroundColor: '#eff6ff',
  },
  searchResultContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchResultText: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },
  searchResultTextSelected: {
    fontWeight: '600',
    color: '#3b82f6',
  },
  noResultsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  
  // Member chips
  invitedMembersContainer: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  invitedMembersTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: 12,
  },
  membersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  memberChip: {
    backgroundColor: '#dbeafe',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#93c5fd',
  },
  memberChipText: {
    fontSize: 14,
    color: '#1e40af',
    fontWeight: '500',
    marginRight: 8,
  },
  
  // Sponsor chips
  selectedSponsorsContainer: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  selectedSponsorsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 12,
  },
  selectedSponsorsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectedSponsorChip: {
    backgroundColor: '#dcfce7',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#86efac',
  },
  selectedSponsorName: {
    fontSize: 14,
    color: '#166534',
    fontWeight: '500',
    marginRight: 8,
  },
  removeSponsorButton: {
    padding: 2,
  },
  
  // Buttons
  addButton: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  
  // Main create button - FIXED
  createButton: {
    backgroundColor: '#10b981',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    marginBottom: 20,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  
  // Switch container
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
  },
  
  // Checkbox
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#3b82f6',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: '#fff',
  },
  checkboxSelected: {
    backgroundColor: '#3b82f6',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
    lineHeight: 22,
  },
  
  // List containers
  listContainer: {
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  listItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    alignItems: 'center',
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  listItemSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  listItemDescription: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
    lineHeight: 18,
  },
  
  // Admin note
  adminNoteContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  adminNoteText: {
    fontSize: 14,
    color: '#1e40af',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  
  // Loading states
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  
  // Sponsor list title
  sponsorListTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
});

export default CreateConferenceScreen;
