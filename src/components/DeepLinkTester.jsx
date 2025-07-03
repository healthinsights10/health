import React from 'react';
import {View, Button, StyleSheet, Alert} from 'react-native';
import {Linking} from 'react-native';

const DeepLinkTester = () => {
  // Only show in development
  if (!__DEV__) return null;

  const testDeepLink = async (type, id) => {
    try {
      const url = `medevents://${type}/${id}`;
      console.log('[DeepLinkTest] Testing link:', url);
      const supported = await Linking.canOpenURL(url);
      
      if (supported) {
        await Linking.openURL(url);
      } else {
        console.log('[DeepLinkTest] URL not supported:', url);
        Alert.alert(`Cannot open: ${url}`);
      }
    } catch (error) {
      console.error('[DeepLinkTest] Error:', error);
      Alert.alert(`Error: ${error.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <Button 
        title="Test Event Link"
        onPress={() => testDeepLink('event', '1e62af7d-48cb-4e74-a1c5-c1c314467b81')}
      />
      <Button 
        title="Test Meeting Link (→ Event)"
        onPress={() => testDeepLink('meeting', '1e62af7d-48cb-4e74-a1c5-c1c314467b81')}
      />
      <Button 
        title="Test Chat Link"
        onPress={() => testDeepLink('chat', '456')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    zIndex: 999,
    gap: 10,
  },
});

export default DeepLinkTester;