import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
  Switch,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import {eventService} from '../../services/api';
import {useAuth} from '../../context/AuthContext';
import BrochureUploader from '../../components/BrochureUploader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
const AdminEditEventScreen = ({route, navigation}) => {
  const {eventId, fromApproval} = route.params;
  const {user} = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [brochure, setBrochure] = useState(null);
  // Speaker fields
  const [newSpeakerName, setNewSpeakerName] = useState('');
  const [newSpeakerTitle, setNewSpeakerTitle] = useState('');
  const [newSpeakerBio, setNewSpeakerBio] = useState('');
  const insets = useSafeAreaInsets();
  // Form state
  const [eventData, setEventData] = useState({
    title: '',
    description: '',
    type: '',
    mode: '',
    venue: '',
    startDate: new Date(),
    endDate: new Date(),
    start_time: '',
    end_time: '',
    organizerName: '',
    organizerEmail: '',
    organizerPhone: '',
    capacity: '',
    website: '',
    registrationFee: '0',
    isFree: true,
    tags: '',
    termsAndConditions: '',
    speakers: [],
    sponsors: [],
    status: 'pending',
  });

  // Date picker states
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  // Add multi-day event states
  const [numberOfDays, setNumberOfDays] = useState(1);
  const [eventDays, setEventDays] = useState([]);

  useEffect(() => {
    fetchEventDetails();
  }, [eventId]);

  const fetchEventDetails = async () => {
    try {
      const data = await eventService.getEventById(eventId);
      
      // Fetch event days
      let eventDaysData = [];
      try {
        eventDaysData = await eventService.getEventDays(eventId);
      } catch (error) {
        console.log('No event days found for event:', eventId);
      }

      setEventData({
        ...data,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        isFree: data.registrationFee === '0' || !data.registrationFee,
        tags: Array.isArray(data.tags) ? data.tags.join(', ') : '',
        speakers: data.speakers || [],
        sponsors: data.sponsors || [],
      });

      // Set event days data
      if (eventDaysData && eventDaysData.length > 0) {
        setNumberOfDays(eventDaysData.length);
        const formattedEventDays = eventDaysData.map(day => ({
          id: day.day_number,
          date: new Date(day.date),
          startTime: new Date(`2000-01-01T${day.start_time}`),
          endTime: new Date(`2000-01-01T${day.end_time}`),
          venue: day.venue || '',
          venueAddress: day.venue_address || '',
          description: day.description || '',
          capacity: day.capacity ? day.capacity.toString() : '',
          specialNotes: day.special_notes || '',
          showDatePicker: false,
          showStartTimePicker: false,
          showEndTimePicker: false,
        }));
        setEventDays(formattedEventDays);
      } else {
        // Single day event fallback
        setNumberOfDays(1);
        setEventDays([{
          id: 1,
          date: new Date(data.startDate),
          startTime: new Date(`2000-01-01T${data.start_time}`),
          endTime: new Date(`2000-01-01T${data.end_time}`),
          venue: data.venue || '',
          venueAddress: '',
          description: '',
          capacity: data.capacity ? data.capacity.toString() : '',
          specialNotes: '',
          showDatePicker: false,
          showStartTimePicker: false,
          showEndTimePicker: false,
        }]);
      }

      // Set brochure if it exists
      if (data.brochure) {
        setBrochure(data.brochure);
      }
    } catch (error) {
      console.error('Failed to fetch event details:', error);
      Alert.alert('Error', 'Failed to load event details');
    } finally {
      setLoading(false);
    }
  };

  // Add a new speaker
  const addSpeaker = () => {
    if (!newSpeakerName.trim()) {
      Alert.alert('Error', 'Speaker name is required');
      return;
    }

    const newSpeaker = {
      id: Date.now().toString(),
      name: newSpeakerName.trim(),
      title: newSpeakerTitle.trim(),
      bio: newSpeakerBio.trim(),
    };

    setEventData(prev => ({
      ...prev,
      speakers: [...prev.speakers, newSpeaker],
    }));

    // Clear form fields
    setNewSpeakerName('');
    setNewSpeakerTitle('');
    setNewSpeakerBio('');
  };

  // Remove a speaker
  const removeSpeaker = speakerId => {
    setEventData(prev => ({
      ...prev,
      speakers: prev.speakers.filter(speaker => speaker.id !== speakerId),
    }));
  };

  const handleSave = async () => {
    try {
      setSubmitting(true);

      // Prepare event days data if multi-day event
      let eventDaysData = null;
      if (eventDays && eventDays.length > 0) {
        eventDaysData = eventDays.map((day, index) => ({
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
      }

      const updatedEventData = {
        ...eventData,
        registrationFee: eventData.isFree ? '0' : eventData.registrationFee,
        tags: eventData.tags
          ? eventData.tags.split(',').map(tag => tag.trim())
          : [],
        brochure: brochure,
        eventDays: eventDaysData, // Include event days data
      };

      console.log('Sending updated data:', JSON.stringify(updatedEventData));

      await eventService.updateEvent(eventId, updatedEventData);

      // Rest of your code remains the same
      if (fromApproval) {
        Alert.alert(
          'Event Updated',
          'Event has been updated successfully. Would you like to approve it now?',
          [
            {
              text: 'Not Yet',
              style: 'cancel',
              onPress: () => navigation.goBack(),
            },
            {
              text: 'Approve Now',
              onPress: () => handleApproveEvent(),
            },
          ],
        );
      } else {
        Alert.alert('Success', 'Event updated successfully', [
          {text: 'OK', onPress: () => navigation.goBack()},
        ]);
      }
    } catch (error) {
      console.error('Failed to update event:', error);
      Alert.alert('Error', 'Failed to update event');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveEvent = async () => {
    try {
      setSubmitting(true);
      await eventService.approveEvent(eventId);
      Alert.alert(
        'Success',
        'Event has been approved and is now visible to all users',
        [{text: 'OK', onPress: () => navigation.goBack()}],
      );
    } catch (error) {
      console.error('Failed to approve event:', error);
      Alert.alert('Error', 'Failed to approve event');
      setSubmitting(false);
    }
  };

  const handleDateChange = (event, selectedDate, type) => {
    if (event.type === 'dismissed') {
      type === 'start'
        ? setShowStartDatePicker(false)
        : setShowEndDatePicker(false);
      return;
    }

    if (selectedDate) {
      if (type === 'start') {
        setEventData(prev => ({...prev, startDate: selectedDate}));
        setShowStartDatePicker(false);
      } else {
        setEventData(prev => ({...prev, endDate: selectedDate}));
        setShowEndDatePicker(false);
      }
    }
  };

  const handleTimeChange = (event, selectedTime, type) => {
    if (event.type === 'dismissed') {
      type === 'start'
        ? setShowStartTimePicker(false)
        : setShowEndTimePicker(false);
      return;
    }

    if (selectedTime) {
      const timeString = selectedTime.toTimeString().split(' ')[0];
      if (type === 'start') {
        setEventData(prev => ({...prev, start_time: timeString}));
        setShowStartTimePicker(false);
      } else {
        setEventData(prev => ({...prev, end_time: timeString}));
        setShowEndTimePicker(false);
      }
    }
  };

  const formatDate = date => {
    return date.toISOString().split('T')[0];
  };

  const formatTime = time => {
    return time.toTimeString().split(' ')[0];
  };

  // Render speaker item for the list
  const renderSpeakerItem = ({item}) => (
    <View style={styles.speakerItem}>
      <View style={styles.speakerInfo}>
        <Text style={styles.speakerName}>{item.name}</Text>
        {item.title && <Text style={styles.speakerTitle}>{item.title}</Text>}
      </View>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => removeSpeaker(item.id)}>
        <Icon name="close-circle" size={20} color="#ff4c4c" />
      </TouchableOpacity>
    </View>
  );

  // Add these functions for multi-day handling
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
          venue: eventData.venue || '',
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

  // Add date and time change handlers
  const handleEventDayDateChange = (dayIndex, event, selectedDate) => {
    updateEventDay(dayIndex, 'showDatePicker', false);
    if (event.type === 'set' && selectedDate) {
      updateEventDay(dayIndex, 'date', selectedDate);
    }
  };

  const handleEventDayTimeChange = (dayIndex, timeType, event, selectedTime) => {
    updateEventDay(dayIndex, `show${timeType}TimePicker`, false);
    if (event.type === 'set' && selectedTime) {
      updateEventDay(dayIndex, timeType === 'Start' ? 'startTime' : 'endTime', selectedTime);
    }
  };

  // Add this function to render admin event days
  const renderAdminEventDay = (day, index) => (
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
            onChange={(event, selectedDate) => handleEventDayDateChange(index, event, selectedDate)}
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
              onChange={(event, selectedTime) => handleEventDayTimeChange(index, 'Start', event, selectedTime)}
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
              onChange={(event, selectedTime) => handleEventDayTimeChange(index, 'End', event, selectedTime)}
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
          value={day.specialNotes}
          onChangeText={(text) => updateEventDay(index, 'specialNotes', text)}
          multiline={true}
          numberOfLines={3}
        />
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2e7af5" />
        <Text style={styles.loadingText}>Loading event details...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, {paddingTop: insets.top}]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#2e7af5" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Event (Admin)</Text>
        <TouchableOpacity
          style={styles.doneButton}
          onPress={handleSave}
          disabled={submitting}>
          {submitting ? (
            <ActivityIndicator size="small" color="#2e7af5" />
          ) : (
            <Text style={styles.doneButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.formContainer}>
          {/* Event Status Badge */}
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>
              {eventData.status === 'approved'
                ? 'Approved'
                : eventData.status === 'rejected'
                ? 'Rejected'
                : 'Pending Approval'}
            </Text>
          </View>

          {/* Original Submitter */}
          <View style={styles.submitterSection}>
            <Text style={styles.submitterLabel}>Submitted by:</Text>
            <Text style={styles.submitterValue}>
              {eventData.createdBy?.name || 'Unknown'} (
              {eventData.createdBy?.role || 'user'})
            </Text>
          </View>

          {/* Event Type */}
          <Text style={styles.sectionTitle}>Event Type</Text>
          <View style={styles.radioContainer}>
            <TouchableOpacity
              style={[
                styles.radioButton,
                eventData.type === 'Conference' && styles.radioButtonSelected,
              ]}
              onPress={() =>
                setEventData(prev => ({...prev, type: 'Conference'}))
              }>
              <View style={styles.radioCircle}>
                {eventData.type === 'Conference' && (
                  <View style={styles.radioDot} />
                )}
              </View>
              <Text style={styles.radioText}>Conference</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.radioButton,
                eventData.type === 'Meeting' && styles.radioButtonSelected,
              ]}
              onPress={() =>
                setEventData(prev => ({...prev, type: 'Meeting'}))
              }>
              <View style={styles.radioCircle}>
                {eventData.type === 'Meeting' && (
                  <View style={styles.radioDot} />
                )}
              </View>
              <Text style={styles.radioText}>Meeting</Text>
            </TouchableOpacity>
          </View>

          {/* Event Mode */}
          <Text style={styles.sectionTitle}>Event Mode</Text>
          <View style={styles.radioContainer}>
            <TouchableOpacity
              style={[
                styles.radioButton,
                eventData.mode === 'In-Person' && styles.radioButtonSelected,
              ]}
              onPress={() =>
                setEventData(prev => ({...prev, mode: 'In-Person'}))
              }>
              <View style={styles.radioCircle}>
                {eventData.mode === 'In-Person' && (
                  <View style={styles.radioDot} />
                )}
              </View>
              <Text style={styles.radioText}>In-Person</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.radioButton,
                eventData.mode === 'Virtual' && styles.radioButtonSelected,
              ]}
              onPress={() =>
                setEventData(prev => ({...prev, mode: 'Virtual'}))
              }>
              <View style={styles.radioCircle}>
                {eventData.mode === 'Virtual' && (
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
              value={eventData.title}
              onChangeText={text =>
                setEventData(prev => ({...prev, title: text}))
              }
              placeholder="Enter event title"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Description*</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={eventData.description}
              onChangeText={text =>
                setEventData(prev => ({...prev, description: text}))
              }
              placeholder="Describe the event"
              multiline={true}
              numberOfLines={4}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Tags (comma separated)</Text>
            <TextInput
              style={styles.input}
              value={eventData.tags}
              onChangeText={text =>
                setEventData(prev => ({...prev, tags: text}))
              }
              placeholder="e.g., healthcare, technology, education"
            />
          </View>

          {/* Date and Time */}
          <Text style={styles.sectionTitle}>Date and Time</Text>
          <View style={styles.dateContainer}>
            <View style={styles.dateGroup}>
              <Text style={styles.inputLabel}>Start Date*</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => setShowStartDatePicker(true)}>
                <Text>{formatDate(eventData.startDate)}</Text>
                <Icon name="calendar" size={18} color="#666" />
              </TouchableOpacity>
              {showStartDatePicker && (
                <DateTimePicker
                  value={eventData.startDate}
                  mode="date"
                  display="default"
                  onChange={(e, date) => handleDateChange(e, date, 'start')}
                />
              )}
            </View>

            <View style={styles.dateGroup}>
              <Text style={styles.inputLabel}>End Date*</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => setShowEndDatePicker(true)}>
                <Text>{formatDate(eventData.endDate)}</Text>
                <Icon name="calendar" size={18} color="#666" />
              </TouchableOpacity>
              {showEndDatePicker && (
                <DateTimePicker
                  value={eventData.endDate}
                  mode="date"
                  display="default"
                  onChange={(e, date) => handleDateChange(e, date, 'end')}
                  minimumDate={eventData.startDate}
                />
              )}
            </View>
          </View>

          <View style={styles.dateContainer}>
            <View style={styles.dateGroup}>
              <Text style={styles.inputLabel}>Start Time*</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => setShowStartTimePicker(true)}>
                <Text>{eventData.start_time}</Text>
                <Icon name="clock-outline" size={18} color="#666" />
              </TouchableOpacity>
              {showStartTimePicker && (
                <DateTimePicker
                  value={
                    new Date(`2020-01-01T${eventData.start_time || '00:00:00'}`)
                  }
                  mode="time"
                  is24Hour={true}
                  display="default"
                  onChange={(e, time) => handleTimeChange(e, time, 'start')}
                />
              )}
            </View>

            <View style={styles.dateGroup}>
              <Text style={styles.inputLabel}>End Time*</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => setShowEndTimePicker(true)}>
                <Text>{eventData.end_time}</Text>
                <Icon name="clock-outline" size={18} color="#666" />
              </TouchableOpacity>
              {showEndTimePicker && (
                <DateTimePicker
                  value={
                    new Date(`2020-01-01T${eventData.end_time || '00:00:00'}`)
                  }
                  mode="time"
                  is24Hour={true}
                  display="default"
                  onChange={(e, time) => handleTimeChange(e, time, 'end')}
                />
              )}
            </View>
          </View>

          {/* Location */}
          <Text style={styles.sectionTitle}>Location</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              {eventData.mode === 'Virtual'
                ? 'Platform/Link*'
                : 'Venue/Address*'}
            </Text>
            <TextInput
              style={styles.input}
              value={eventData.venue}
              onChangeText={text =>
                setEventData(prev => ({...prev, venue: text}))
              }
              placeholder={
                eventData.mode === 'Virtual'
                  ? 'e.g., Zoom, Google Meet, or platform link'
                  : 'Enter the full address of the venue'
              }
            />
          </View>

          {eventData.mode === 'In-Person' && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Capacity</Text>
              <TextInput
                style={styles.input}
                value={eventData.capacity?.toString()}
                onChangeText={text =>
                  setEventData(prev => ({
                    ...prev,
                    capacity: text ? parseInt(text) : null,
                  }))
                }
                placeholder="Maximum number of attendees"
                keyboardType="number-pad"
              />
            </View>
          )}

          {/* Brochure Upload Section - Admin Only */}
          <View style={styles.adminSection}>
            <Text style={styles.sectionTitle}>
              Event Brochure{' '}
              <Text style={styles.adminOnlyText}>(Admin Only)</Text>
            </Text>
            <Text style={styles.sectionSubtitle}>
              Upload a PDF brochure with detailed information about the event
            </Text>

            <BrochureUploader
              currentBrochure={brochure}
              onBrochureUploaded={setBrochure}
              eventId={eventId} // Add this line
            />
          </View>

          {/* ADMIN ONLY: Speakers Section */}
          <View style={styles.adminSection}>
            <Text style={styles.sectionTitle}>
              Speakers <Text style={styles.adminOnlyText}>(Admin Only)</Text>
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Speaker Name*</Text>
              <TextInput
                style={styles.input}
                value={newSpeakerName}
                onChangeText={setNewSpeakerName}
                placeholder="Enter speaker name"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Speaker Title/Role</Text>
              <TextInput
                style={styles.input}
                value={newSpeakerTitle}
                onChangeText={setNewSpeakerTitle}
                placeholder="e.g., Professor of Medicine, CEO"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Speaker Bio</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                value={newSpeakerBio}
                onChangeText={setNewSpeakerBio}
                placeholder="Brief background about the speaker"
                multiline={true}
                numberOfLines={3}
              />
            </View>

            <TouchableOpacity style={styles.addButton} onPress={addSpeaker}>
              <Icon name="plus" size={20} color="white" />
              <Text style={styles.addButtonText}>Add Speaker</Text>
            </TouchableOpacity>

            {eventData.speakers.length > 0 && (
              <View style={styles.listContainer}>
                <Text style={styles.listTitle}>
                  Added Speakers ({eventData.speakers.length})
                </Text>
                <FlatList
                  data={eventData.speakers}
                  renderItem={renderSpeakerItem}
                  keyExtractor={item => item.id}
                  scrollEnabled={false}
                />
              </View>
            )}
          </View>

          {/* ADMIN ONLY: Registration Section */}
          <View style={styles.adminSection}>
            <Text style={styles.sectionTitle}>
              Registration{' '}
              <Text style={styles.adminOnlyText}>(Admin Only)</Text>
            </Text>

            <View style={styles.inputGroup}>
              <View style={styles.switchContainer}>
                <Text style={styles.inputLabel}>Free Event</Text>
                <Switch
                  value={eventData.isFree}
                  onValueChange={value =>
                    setEventData(prev => ({
                      ...prev,
                      isFree: value,
                      registrationFee: value ? '0' : prev.registrationFee,
                    }))
                  }
                  trackColor={{false: '#767577', true: '#81b0ff'}}
                  thumbColor={eventData.isFree ? '#2e7af5' : '#f4f3f4'}
                />
              </View>
            </View>

            {!eventData.isFree && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Registration Fee</Text>
                <TextInput
                  style={styles.input}
                  value={eventData.registrationFee}
                  onChangeText={text =>
                    setEventData(prev => ({...prev, registrationFee: text}))
                  }
                  placeholder="Enter amount (e.g., 99.99)"
                  keyboardType="decimal-pad"
                />
              </View>
            )}
          </View>

          {/* Organizer Information */}
          <Text style={styles.sectionTitle}>Organizer</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Organizer Name*</Text>
            <TextInput
              style={styles.input}
              value={eventData.organizerName}
              onChangeText={text =>
                setEventData(prev => ({...prev, organizerName: text}))
              }
              placeholder="Enter organizer name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Organizer Email*</Text>
            <TextInput
              style={styles.input}
              value={eventData.organizerEmail}
              onChangeText={text =>
                setEventData(prev => ({...prev, organizerEmail: text}))
              }
              placeholder="Enter organizer email"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Organizer Phone</Text>
            <TextInput
              style={styles.input}
              value={eventData.organizerPhone}
              onChangeText={text =>
                setEventData(prev => ({...prev, organizerPhone: text}))
              }
              placeholder="Enter organizer phone"
              keyboardType="phone-pad"
            />
          </View>

          {/* Terms and Conditions */}
          <Text style={styles.sectionTitle}>
            Terms and Conditions{' '}
            <Text style={styles.adminOnlyText}>(Admin Only)</Text>
          </Text>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Terms and Conditions</Text>
            <TextInput
              style={[styles.input, styles.termsTextarea]}
              value={eventData.termsAndConditions}
              onChangeText={text =>
                setEventData(prev => ({...prev, termsAndConditions: text}))
              }
              placeholder="Enter terms and conditions"
              multiline={true}
              numberOfLines={6}
            />
          </View>

          {/* Admin Actions */}
          {fromApproval && (
            <View style={styles.adminActionButtons}>
              <TouchableOpacity
                style={styles.approveButton}
                onPress={handleApproveEvent}
                disabled={submitting}>
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Icon name="check-circle" size={20} color="#fff" />
                    <Text style={styles.approveButtonText}>
                      Save & Approve Event
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Date and Time Section - Updated for multi-day */}
          <View style={styles.adminSection}>
            <Text style={styles.sectionTitle}>
              Event Schedule <Text style={styles.adminOnlyText}>(Admin Only)</Text>
            </Text>
            
            {/* Number of Days Selection */}
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
            {eventDays.map((day, index) => renderAdminEventDay(day, index))}
          </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  doneButton: {
    padding: 8,
  },
  doneButtonText: {
    color: '#2e7af5',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    padding: 16,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff3e0',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginBottom: 16,
  },
  statusText: {
    color: '#e65100',
    fontWeight: 'bold',
  },
  submitterSection: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitterLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  submitterValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  adminSection: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 3,
    borderLeftColor: '#2e7af5',
  },
  adminOnlyText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#ff6b6b',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
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
  radioContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  radioButtonSelected: {
    backgroundColor: '#e6f0ff',
    borderRadius: 8,
    padding: 8,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2e7af5',
  },
  radioText: {
    fontSize: 14,
    color: '#333',
  },
  dateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dateGroup: {
    flex: 1,
    marginRight: 8,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  addButton: {
    backgroundColor: '#2e7af5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  },
  listContainer: {
    marginTop: 16,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  speakerItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
    borderLeftWidth: 3,
    borderLeftColor: '#2e7af5',
  },
  speakerInfo: {
    flex: 1,
  },
  speakerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  speakerTitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  removeButton: {
    padding: 4,
  },
  adminActionButtons: {
    marginTop: 24,
  },
  approveButton: {
    backgroundColor: '#4caf50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
  },
  approveButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },

  // Add these new styles for multi-day functionality
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
  adminNoteContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  adminNoteText: {
    fontSize: 12,
    color: '#1976d2',
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },

  // ... rest of existing styles
});

export default AdminEditEventScreen;
