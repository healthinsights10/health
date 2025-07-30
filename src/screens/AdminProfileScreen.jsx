import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useAuth} from '../context/AuthContext';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const AdminProfileScreen = ({navigation}) => {
  const {user, logout} = useAuth();
  const insets = useSafeAreaInsets();
  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          onPress: async () => {
            try {
              await logout();
              // Navigation will be handled by AppNavigator based on auth state
            } catch (error) {
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ],
      {cancelable: true},
    );
  };

  return (
    <SafeAreaView style={[styles.container, {paddingTop: insets.top}]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f7f9fc" />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <View style={{width: 24}} />
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.profileSection}>
          <View style={styles.profileIconLarge}>
            <Text style={styles.profileInitial}>
              {user?.name?.charAt(0) || 'A'}
            </Text>
          </View>
          <Text style={styles.profileName}>
            {user?.name || 'Administrator'}
          </Text>
          <View style={styles.roleBadge}>
            <Icon name="shield-account" size={16} color="#2e7af5" />
            <Text style={styles.roleText}>System Administrator</Text>
          </View>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Account Information</Text>

          <View style={styles.infoItem}>
            <Icon
              name="email-outline"
              size={22}
              color="#666"
              style={styles.infoIcon}
            />
            <View>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoText}>
                {user?.email || 'admin@medevent.com'}
              </Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <Icon
              name="office-building"
              size={22}
              color="#666"
              style={styles.infoIcon}
            />
            <View>
              <Text style={styles.infoLabel}>Department</Text>
              <Text style={styles.infoText}>
                {user?.department || 'Administration'}
              </Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <Icon
              name="clock-time-four-outline"
              size={22}
              color="#666"
              style={styles.infoIcon}
            />
            <View>
              <Text style={styles.infoLabel}>Account Created</Text>
              <Text style={styles.infoText}>
                {user?.createdAt
                  ? new Date(user.createdAt).toLocaleDateString()
                  : 'Apr 15, 2025'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Account Settings</Text>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => navigation.navigate('EditProfile')}>
            <Icon
              name="account-edit"
              size={22}
              color="#2e7af5"
              style={styles.actionIcon}
            />
            <Text style={styles.actionText}>Edit Profile</Text>
            <Icon name="chevron-right" size={22} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => navigation.navigate('ChangePassword')}>
            <Icon
              name="lock-outline"
              size={22}
              color="#2e7af5"
              style={styles.actionIcon}
            />
            <Text style={styles.actionText}>Change Password</Text>
            <Icon name="chevron-right" size={22} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => navigation.navigate('Notifications')}>
            <Icon
              name="bell-outline"
              size={22}
              color="#2e7af5"
              style={styles.actionIcon}
            />
            <Text style={styles.actionText}>Notification Settings</Text>
            <Icon name="chevron-right" size={22} color="#ccc" />
          </TouchableOpacity>
        </View>

        {/* <View style={styles.supportSection}>
          <Text style={styles.sectionTitle}>Support</Text>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => navigation.navigate('Help')}>
            <Icon
              name="help-circle-outline"
              size={22}
              color="#2e7af5"
              style={styles.actionIcon}
            />
            <Text style={styles.actionText}>Help & FAQ</Text>
            <Icon name="chevron-right" size={22} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => navigation.navigate('Contact')}>
            <Icon
              name="message-text-outline"
              size={22}
              color="#2e7af5"
              style={styles.actionIcon}
            />
            <Text style={styles.actionText}>Contact Support</Text>
            <Icon name="chevron-right" size={22} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => navigation.navigate('About')}>
            <Icon
              name="information-outline"
              size={22}
              color="#2e7af5"
              style={styles.actionIcon}
            />
            <Text style={styles.actionText}>About MedEvent</Text>
            <Icon name="chevron-right" size={22} color="#ccc" />
          </TouchableOpacity>
        </View> */}

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Icon name="logout" size={20} color="#fff" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>MedEvent Admin v1.0.0</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  scrollView: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  profileIconLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2e7af5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileInitial: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  roleText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
    color: '#2e7af5',
  },
  infoSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'center',
  },
  infoIcon: {
    marginRight: 16,
    width: 26,
    textAlign: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  infoText: {
    fontSize: 16,
    color: '#333',
  },
  actionsSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 16,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionIcon: {
    marginRight: 16,
    width: 26,
    textAlign: 'center',
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  supportSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 24,
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: '#f44336',
    borderRadius: 8,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginBottom: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  versionContainer: {
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 24,
  },
  versionText: {
    fontSize: 14,
    color: '#999',
  },
});

export default AdminProfileScreen;
