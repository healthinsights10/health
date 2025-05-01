import React, {useState, useEffect} from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Modal,
  Image,
  ActivityIndicator,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useAuth} from '../context/AuthContext';
import api from '../services/api';

const Profile = ({navigation}) => {
  const {user, logout} = useAuth();
  const [userDocuments, setUserDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewingDocument, setViewingDocument] = useState(null);

  // Fetch doctor's documents
  const fetchDocuments = async () => {
    if (user?.role !== 'doctor') return;

    try {
      setLoading(true);
      const response = await api.get(`/users/my-documents`);
      setUserDocuments(response.data || []);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'doctor') {
      fetchDocuments();
    }
  }, [user]);

  const handleLogout = async () => {
    await logout();
    // Navigation will be handled by AppNavigator
  };

  const renderDocumentViewer = () => {
    if (!viewingDocument) return null;

    const isImage = viewingDocument.type.includes('image');

    return (
      <Modal
        visible={!!viewingDocument}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setViewingDocument(null)}>
        <SafeAreaView style={styles.documentViewerContainer}>
          <View style={styles.documentViewerHeader}>
            <TouchableOpacity
              onPress={() => setViewingDocument(null)}
              style={styles.closeButton}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.documentViewerTitle}>
              {viewingDocument.name}
            </Text>
            <View style={{width: 24}} />
          </View>

          <View style={styles.documentContent}>
            {isImage ? (
              viewingDocument.url ? (
                <Image
                  source={{uri: viewingDocument.url}}
                  style={styles.documentImage}
                  resizeMode="contain"
                  onError={e => {
                    console.error('Image loading error:', e.nativeEvent.error);
                    console.log('Failed to load URL:', viewingDocument.url);
                  }}
                  onLoad={() =>
                    console.log(
                      'Image loaded successfully:',
                      viewingDocument.url,
                    )
                  }
                />
              ) : (
                <View style={styles.pdfPlaceholder}>
                  <Icon name="image-off" size={80} color="#e53935" />
                  <Text style={styles.pdfText}>
                    Image preview not available
                  </Text>
                  <Text style={styles.pdfHint}>The image URL is missing</Text>
                </View>
              )
            ) : (
              <View style={styles.pdfPlaceholder}>
                <Icon name="file-pdf-box" size={80} color="#e53935" />
                <Text style={styles.pdfText}>{viewingDocument.name}</Text>
                <Text style={styles.pdfHint}>
                  <TouchableOpacity
                    onPress={() => Linking.openURL(viewingDocument.url)}>
                    <Text style={styles.pdfLink}>Open PDF</Text>
                  </TouchableOpacity>
                </Text>
              </View>
            )}

            <View style={styles.documentStatus}>
              <Text style={styles.documentStatusLabel}>Status:</Text>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: viewingDocument.verified
                      ? '#e8f5e9'
                      : '#fff3e0',
                  },
                ]}>
                <Icon
                  name={
                    viewingDocument.verified ? 'check-circle' : 'clock-outline'
                  }
                  size={16}
                  color={viewingDocument.verified ? '#2e7d32' : '#e65100'}
                  style={{marginRight: 4}}
                />
                <Text
                  style={[
                    styles.statusText,
                    {color: viewingDocument.verified ? '#2e7d32' : '#e65100'},
                  ]}>
                  {viewingDocument.verified
                    ? 'Verified'
                    : 'Pending Verification'}
                </Text>
              </View>
            </View>

            {viewingDocument.verificationNotes && (
              <View style={styles.notesContainer}>
                <Text style={styles.notesLabel}>Admin Notes:</Text>
                <Text style={styles.notesText}>
                  {viewingDocument.verificationNotes}
                </Text>
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <View style={{width: 24}} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.profileSection}>
          <View style={styles.profileIcon}>
            <Text style={styles.profileInitial}>
              {user?.name?.charAt(0) || 'U'}
            </Text>
          </View>
          <Text style={styles.profileName}>{user?.name || 'User'}</Text>
          <Text style={styles.profileRole}>
            {user?.role === 'doctor'
              ? 'Healthcare Professional'
              : user?.role === 'pharma'
              ? 'Pharmaceutical Representative'
              : 'User'}
          </Text>
          <Text style={styles.profileEmail}>
            {user?.email || 'email@example.com'}
          </Text>

          {user?.role === 'doctor' && (
            <View style={styles.verificationStatus}>
              <Icon
                name={user?.verified ? 'shield-check' : 'shield-alert'}
                size={20}
                color={user?.verified ? '#4caf50' : '#ff9800'}
              />
              <Text
                style={[
                  styles.verificationText,
                  {color: user?.verified ? '#4caf50' : '#ff9800'},
                ]}>
                {user?.verified ? 'Verified Doctor' : 'Verification Pending'}
              </Text>
            </View>
          )}
        </View>

        {user?.role === 'doctor' && (
          <>
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>My Events</Text>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => navigation.navigate('MyEvents')}>
                <Icon name="calendar-multiple" size={24} color="#2e7af5" />
                <Text style={styles.menuText}>Scheduled Events</Text>
                <Icon name="chevron-right" size={24} color="#ccc" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => navigation.navigate('CreateConference')}>
                <Icon name="calendar-plus" size={24} color="#2e7af5" />
                <Text style={styles.menuText}>Create New Event</Text>
                <Icon name="chevron-right" size={24} color="#ccc" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => navigation.navigate('RegisteredEvents')}>
                <Icon name="calendar-check" size={24} color="#2e7af5" />
                <Text style={styles.menuText}>Events I'm Attending</Text>
                <Icon name="chevron-right" size={24} color="#ccc" />
              </TouchableOpacity>
            </View>

            {/* Add Documents Section */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>My Documents</Text>
                <TouchableOpacity
                  style={styles.addDocButton}
                  onPress={() => navigation.navigate('UploadDocuments')}>
                  <Icon name="plus" size={16} color="#fff" />
                  <Text style={styles.addDocText}>Add Document</Text>
                </TouchableOpacity>
              </View>

              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#2e7af5" />
                  <Text style={styles.loadingText}>Loading documents...</Text>
                </View>
              ) : userDocuments.length > 0 ? (
                <>
                  {userDocuments.map((doc, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.documentItem}
                      onPress={() => setViewingDocument(doc)}>
                      <Icon
                        name={
                          doc.type.includes('image') ? 'image' : 'file-pdf-box'
                        }
                        size={24}
                        color="#2e7af5"
                      />
                      <View style={styles.documentInfo}>
                        <Text style={styles.documentName} numberOfLines={1}>
                          {doc.name}
                        </Text>
                        <Text style={styles.documentDate}>
                          Uploaded on{' '}
                          {doc.upload_date
                            ? new Date(doc.upload_date).toLocaleDateString()
                            : 'Unknown date'}
                        </Text>
                      </View>
                      {/* <View
                        style={[
                          styles.documentBadge,
                          {
                            backgroundColor: doc.verified
                              ? '#e8f5e9'
                              : '#fff3e0',
                            paddingHorizontal: 8,
                            width: 'auto',
                            height: 'auto',
                          },
                        ]}>
                        <Icon
                          name={doc.verified ? 'check-circle' : 'clock-outline'}
                          size={12}
                          color={doc.verified ? '#2e7d32' : '#e65100'}
                          style={{marginRight: 4}}
                        />
                        <Text
                          style={{
                            fontSize: 12,
                            color: doc.verified ? '#2e7d32' : '#e65100',
                            fontWeight: '500',
                          }}>
                          {doc.verified ? 'Verified' : 'Pending'}
                        </Text>
                      </View> */}
                    </TouchableOpacity>
                  ))}
                </>
              ) : (
                <View style={styles.emptyDocuments}>
                  <Icon name="file-document-outline" size={40} color="#ccc" />
                  <Text style={styles.emptyDocumentsText}>
                    No documents uploaded
                  </Text>
                  <TouchableOpacity
                    style={styles.uploadDocsButton}
                    onPress={() => navigation.navigate('UploadDocuments')}>
                    <Text style={styles.uploadDocsText}>Upload Documents</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </>
        )}

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Account</Text>

          <TouchableOpacity style={styles.menuItem}>
            <Icon name="account-edit" size={24} color="#2e7af5" />
            <Text style={styles.menuText}>Edit Profile</Text>
            <Icon name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Icon name="bell-outline" size={24} color="#2e7af5" />
            <Text style={styles.menuText}>Notifications</Text>
            <Icon name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Icon name="shield-account" size={24} color="#2e7af5" />
            <Text style={styles.menuText}>Privacy & Security</Text>
            <Icon name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Support</Text>

          <TouchableOpacity style={styles.menuItem}>
            <Icon name="help-circle-outline" size={24} color="#2e7af5" />
            <Text style={styles.menuText}>Help & Support</Text>
            <Icon name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Icon name="information-outline" size={24} color="#2e7af5" />
            <Text style={styles.menuText}>About</Text>
            <Icon name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Icon name="logout" size={24} color="#fff" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      {renderDocumentViewer()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 24,
    flex: 1,
    backgroundColor: '#f7f9fc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    padding: 24,
  },
  profileIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#2e7af5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  profileInitial: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  profileEmail: {
    fontSize: 14,
    color: '#999',
  },
  sectionContainer: {
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuText: {
    flex: 1,
    marginLeft: 16,
    fontSize: 16,
    color: '#333',
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: '#ff4757',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  verificationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
  },
  verificationText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  documentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  documentName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  documentDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  documentBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: '#666',
    fontSize: 14,
  },
  emptyDocuments: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyDocumentsText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  uploadDocsButton: {
    backgroundColor: '#2e7af5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  uploadDocsText: {
    color: 'white',
    fontWeight: '500',
  },
  documentViewerContainer: {
    flex: 1,
    backgroundColor: '#f7f9fc',
  },
  documentViewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closeButton: {
    padding: 8,
  },
  documentViewerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  documentContent: {
    flex: 1,
    padding: 16,
  },
  documentImage: {
    width: '100%',
    height: 400,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  pdfPlaceholder: {
    height: 400,
    backgroundColor: '#fff',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  pdfHint: {
    marginTop: 4,
    fontSize: 14,
    color: '#666',
  },
  pdfLink: {
    color: '#2e7af5',
    textDecorationLine: 'underline',
  },
  documentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  documentStatusLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginRight: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  notesContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#666',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addDocButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2e7af5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addDocText: {
    color: '#fff',
    fontWeight: '500',
    marginLeft: 8,
  },
});

export default Profile;
