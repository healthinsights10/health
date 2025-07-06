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
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [venue, setVenue] = useState('');
  const [organizerName, setOrganizerName] = useState('');
  const [organizerEmail, setOrganizerEmail] = useState('');
  const [organizerPhone, setOrganizerPhone] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(
    new Date(new Date().setDate(new Date().getDate() + 1)),
  );
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [conferenceType, setConferenceType] = useState('Conference'); // or Meeting
  const [conferenceMode, setConferenceMode] = useState('In-Person'); // or Virtual
  const [capacity, setCapacity] = useState('');
  const [website, setWebsite] = useState('');
  const [regFee, setRegFee] = useState('');
  const [isFree, setIsFree] = useState(false);
  const [tags, setTags] = useState('');
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(
    new Date(new Date().setHours(new Date().getHours() + 2)),
  );
  const [termsAndConditions, setTermsAndConditions] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Sponsors state
  const [sponsors, setSponsors] = useState([]);
  const [newSponsorName, setNewSponsorName] = useState('');
  const [newSponsorLevel, setNewSponsorLevel] = useState('');

  // Speakers state
  const [speakers, setSpeakers] = useState([]);
  const [newSpeakerName, setNewSpeakerName] = useState('');
  const [newSpeakerTitle, setNewSpeakerTitle] = useState('');
  const [newSpeakerBio, setNewSpeakerBio] = useState('');

  // Pharma companies state
  const [pharmaCompanies, setPharmaCompanies] = useState([]);
  const [selectedPharmaIds, setSelectedPharmaIds] = useState([]);
  const [loadingPharma, setLoadingPharma] = useState(false);

  // Add these new state variables for search functionality
  const [sponsorSearchQuery, setSponsorSearchQuery] = useState('');
  const [filteredPharmaCompanies, setFilteredPharmaCompanies] = useState([]);
  const [showSponsorDropdown, setShowSponsorDropdown] = useState(false);

  const formatDate = date => {
    return `${date.getFullYear()}-${(date.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  };

  const formatTime = date => {
    return `${date.getHours().toString().padStart(2, '0')}:${date
      .getMinutes()
      .toString()
      .padStart(2, '0')}:00`;
  };

  const handleStartDateChange = (event, selectedDate) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      setStartDate(selectedDate);
      // If end date is before new start date, update end date
      if (endDate < selectedDate) {
        setEndDate(new Date(selectedDate.setDate(selectedDate.getDate() + 1)));
      }
    }
  };

  const handleEndDateChange = (event, selectedDate) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

  const handleStartTimeChange = (event, selectedTime) => {
    setShowStartTimePicker(false);
    if (selectedTime) {
      setStartTime(selectedTime);
    }
  };

  const handleEndTimeChange = (event, selectedTime) => {
    setShowEndTimePicker(false);
    if (selectedTime) {
      setEndTime(selectedTime);
    }
  };

  const validateEmail = email => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  // Add a new sponsor
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

  // Remove a sponsor
  const removeSponsor = sponsorId => {
    setSponsors(sponsors.filter(sponsor => sponsor.id !== sponsorId));
  };

  // Add a new speaker
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

  // Remove a speaker
  const removeSpeaker = speakerId => {
    setSpeakers(speakers.filter(speaker => speaker.id !== speakerId));
  };

  // Fetch pharmaceutical companies
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

  // Toggle pharmaceutical company selection
  const togglePharmaSelection = pharmaId => {
    if (selectedPharmaIds.includes(pharmaId)) {
      setSelectedPharmaIds(selectedPharmaIds.filter(id => id !== pharmaId));
    } else {
      setSelectedPharmaIds([...selectedPharmaIds, pharmaId]);
    }
  };

  // Update the pharma companies search functionality
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

  // Function to add a selected sponsor
  const addSelectedSponsor = pharma => {
    // Check if already added
    if (selectedPharmaIds.includes(pharma.id)) {
      Alert.alert('Already Added', 'This sponsor has already been added.');
      return;
    }

    // Add to selected sponsors
    setSelectedPharmaIds([...selectedPharmaIds, pharma.id]);

    // Clear search
    setSponsorSearchQuery('');
    setFilteredPharmaCompanies([]);
    setShowSponsorDropdown(false);
  };

  // Function to remove a selected sponsor
  const removeSelectedSponsor = pharmaId => {
    setSelectedPharmaIds(selectedPharmaIds.filter(id => id !== pharmaId));
  };

  const handleCreateConference = async () => {
    // Validate form
    if (!title) {
      Alert.alert('Missing Information', 'Please fill all required fields.');
      return;
    }

    if (isAdmin && !venue) {
      if (!validateEmail(organizerEmail)) {
        Alert.alert('Invalid Email', 'Please enter a valid email address.');
        return;
      }

      if (endDate < startDate) {
        Alert.alert('Invalid Dates', 'End date must be after start date.');
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

    // Combine date and time for start and end dates
    const combinedStartDate = new Date(startDate);
    combinedStartDate.setHours(
      startTime.getHours(),
      startTime.getMinutes(),
      0,
      0,
    );

    const combinedEndDate = new Date(endDate);
    combinedEndDate.setHours(endTime.getHours(), endTime.getMinutes(), 0, 0);

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
      venue,
      organizerName,
      organizerEmail,
      organizerPhone,
      startDate: combinedStartDate.toISOString(),
      endDate: combinedEndDate.toISOString(),
      start_time: formatTime(startTime), // Must match backend field name
      end_time: formatTime(endTime), // Must match backend field name
      type: conferenceType,
      mode: conferenceMode,
      capacity: capacity ? parseInt(capacity, 10) : null,
      website,
      registrationFee: isFree ? '0' : regFee,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      termsAndConditions,
      sponsors: allSponsors, // <-- send all sponsors
      speakers,
    };

    console.log('Submitting event:', newEvent);

    // Submit event
    try {
      setIsSubmitting(true);
      const result = await eventService.createEvent(newEvent);

      // If there are selected pharma companies, send sponsorship requests
      if (selectedPharmaIds.length > 0) {
        try {
          await eventService.sendSponsorshipRequests(
            result.event.id,
            selectedPharmaIds,
          );
          console.log('Sponsorship requests sent successfully');
        } catch (sponsorError) {
          console.error('Error sending sponsorship requests:', sponsorError);
          // Continue with event creation even if sponsorship requests fail
        }
      }

      // Show success message
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

  // Render sponsor item for FlatList
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

  // Render speaker item for FlatList
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

          {/* Date and Time */}
          <Text style={styles.sectionTitle}>Date and Time</Text>
          <View style={styles.dateContainer}>
            <View style={styles.dateGroup}>
              <Text style={styles.inputLabel}>Start Date*</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => setShowStartDatePicker(true)}>
                <Text>{formatDate(startDate)}</Text>
                <Icon name="calendar" size={18} color="#666" />
              </TouchableOpacity>
              {showStartDatePicker && (
                <DateTimePicker
                  value={startDate}
                  mode="date"
                  display="default"
                  onChange={handleStartDateChange}
                  minimumDate={new Date()}
                />
              )}
            </View>

            <View style={styles.dateGroup}>
              <Text style={styles.inputLabel}>End Date*</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => setShowEndDatePicker(true)}>
                <Text>{formatDate(endDate)}</Text>
                <Icon name="calendar" size={18} color="#666" />
              </TouchableOpacity>
              {showEndDatePicker && (
                <DateTimePicker
                  value={endDate}
                  mode="date"
                  display="default"
                  onChange={handleEndDateChange}
                  minimumDate={startDate}
                />
              )}
            </View>
          </View>

          <View style={styles.dateContainer}>
            <View style={styles.dateGroup}>
              <Text style={styles.inputLabel}>Start Time</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => setShowStartTimePicker(true)}>
                <Text>{formatTime(startTime)}</Text>
                <Icon name="clock-outline" size={18} color="#666" />
              </TouchableOpacity>
              {showStartTimePicker && (
                <DateTimePicker
                  value={startTime}
                  mode="time"
                  display="default"
                  onChange={handleStartTimeChange}
                />
              )}
            </View>

            <View style={styles.dateGroup}>
              <Text style={styles.inputLabel}>End Time</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => setShowEndTimePicker(true)}>
                <Text>{formatTime(endTime)}</Text>
                <Icon name="clock-outline" size={18} color="#666" />
              </TouchableOpacity>
              {showEndTimePicker && (
                <DateTimePicker
                  value={endTime}
                  mode="time"
                  display="default"
                  onChange={handleEndTimeChange}
                />
              )}
            </View>
          </View>

          {/* Location */}
          {isAdmin && (
            <>
              <Text style={styles.sectionTitle}>Location</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {conferenceMode === 'Virtual'
                    ? 'Platform/Link*'
                    : 'Venue/Address*'}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={
                    conferenceMode === 'Virtual'
                      ? 'e.g., Zoom, Google Meet, or platform link'
                      : 'Enter the full address of the venue'
                  }
                  placeholderTextColor={'#999'}
                  value={venue}
                  onChangeText={setVenue}
                />
              </View>

              {conferenceMode === 'In-Person' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Capacity</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Maximum number of attendees"
                    placeholderTextColor={'#999'}
                    value={capacity}
                    onChangeText={setCapacity}
                    keyboardType="number-pad"
                  />
                </View>
              )}
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
          <View style={[styles.inputGroup, ]}>
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

          {/* Current Manual Sponsors List (keep existing manual sponsor functionality) */}
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
    //paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
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
  dateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dateGroup: {
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
  pharmaList: {
    marginTop: 10,
  },
  pharmaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pharmaName: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  noPharmaText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 10,
  },
  inputDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  sponsorListTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  selectedPharmaContainer: {
    marginTop: 16,
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
  },
  selectedPharmaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  selectedPharmaName: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
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
