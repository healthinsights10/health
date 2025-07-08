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
import {eventService} from '../services/api';
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

  const handleCreateConference = async () => {
    // Validate basic fields
    if (!title || !description) {
      Alert.alert('Missing Information', 'Please fill all required fields.');
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
      description,
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
    } catch (error) {
      console.log('Error creating event:', error);
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

      {/* Venue for this day */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Venue (Day {index + 1})</Text>
        <TextInput
          style={styles.input}
          placeholder={`Venue for day ${index + 1}`}
          placeholderTextColor="#999"
          value={day.venue}
          onChangeText={(text) => updateEventDay(index, 'venue', text)}
        />
      </View>

      {/* Venue Address */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Venue Address</Text>
        <TextInput
          style={styles.input}
          placeholder="Full address of the venue"
          placeholderTextColor="#999"
          value={day.venueAddress}
          onChangeText={(text) => updateEventDay(index, 'venueAddress', text)}
        />
      </View>

      {/* Day Description */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Day Description</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder={`What happens on day ${index + 1}?`}
          placeholderTextColor="#999"
          value={day.description}
          onChangeText={(text) => updateEventDay(index, 'description', text)}
          multiline={true}
          numberOfLines={3}
        />
      </View>

      {/* Capacity for this day */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Capacity (Day {index + 1})</Text>
        <TextInput
          style={styles.input}
          placeholder="Maximum attendees for this day"
          placeholderTextColor="#999"
          value={day.capacity}
          onChangeText={(text) => updateEventDay(index, 'capacity', text)}
          keyboardType="number-pad"
        />
      </View>

      {/* Special Notes */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Special Notes</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="Any special notes or instructions for this day"
          placeholderTextColor="#999"
          value={day.specialNotes}
          onChangeText={(text) => updateEventDay(index, 'specialNotes', text)}
          multiline={true}
          numberOfLines={3}
        />
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
            <Text style={styles.inputLabel}>Description*</Text>
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
              <Text style={styles.createButtonText}>Create Event</Text>
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
    backgroundColor: '#f7f9fc',
  },
  header: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: 'white',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    padding: 16,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 12,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  radioContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  radioButtonSelected: {},
  radioCircle: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#2e7af5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  radioDot: {
    height: 10,
    width: 10,
    borderRadius: 5,
    backgroundColor: '#2e7af5',
  },
  radioText: {
    fontSize: 16,
    color: '#333',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  textarea: {
    height: 100,
    textAlignVertical: 'top',
  },
  termsTextarea: {
    height: 150,
    textAlignVertical: 'top',
  },
  adminOnlyLabel: {
    fontSize: 12,
    color: '#2e7af5',
    marginTop: 4,
    fontStyle: 'italic',
  },
  adminOnlyText: {
    fontSize: 14,
    color: '#2e7af5',
    fontStyle: 'italic',
  },
  // New styles for multi-day functionality
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: 'white',
  },
  dayButtonSelected: {
    borderColor: '#2e7af5',
    backgroundColor: '#2e7af5',
  },
  dayButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  dayButtonTextSelected: {
    color: 'white',
  },
  eventDayContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2e7af5',
    marginBottom: 16,
    textAlign: 'center',
    backgroundColor: '#f0f6ff',
    paddingVertical: 8,
    borderRadius: 6,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  timeGroup: {
    width: '48%',
  },
  dateInput: {
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#2e7af5',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  addButton: {
    backgroundColor: '#2e7af5',
    flexDirection: 'row',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  listContainer: {
    marginBottom: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 8,
  },
  listItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  listItemSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  listItemDescription: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  createButton: {
    backgroundColor: '#2e7af5',
    borderRadius: 8,
    paddingVertical: 16,
    marginTop: 32,
    marginBottom: 32,
    alignItems: 'center',
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  sponsorListTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  searchContainer: {
    width: '100%',
    position: 'relative',
  },
  searchInputContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  clearSearchButton: {
    padding: 8,
  },
  searchDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    zIndex: 1000,
  },
  searchResultItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchResultItemSelected: {
    backgroundColor: '#e8f0fe',
  },
  searchResultContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchResultText: {
    fontSize: 16,
    color: '#333',
  },
  searchResultTextSelected: {
    fontWeight: '500',
    color: '#2e7af5',
  },
  noResultsContainer: {
    padding: 12,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  selectedSponsorsContainer: {
    marginTop: 16,
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
  },
  selectedSponsorsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  selectedSponsorsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  selectedSponsorChip: {
    backgroundColor: '#e1f5fe',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 8,
  },
  selectedSponsorName: {
    fontSize: 14,
    color: '#333',
    marginRight: 8,
  },
  removeSponsorButton: {
    padding: 4,
  },
});

export default CreateConferenceScreen;
