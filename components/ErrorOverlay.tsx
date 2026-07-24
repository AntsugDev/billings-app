import React from 'react';
import { StyleSheet, View, Text, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGlobalError } from '@/scripts/store/ErrorStore';
import { Button } from './Button';

export function ErrorOverlay() {
  const { error, clearError } = useGlobalError();

  return (
    <Modal
      visible={error !== null}
      transparent={true}
      animationType="fade"
      onRequestClose={clearError}
    >
      <View style={styles.backdrop}>
        <View style={styles.container}>
          <View style={styles.iconContainer}>
            <Ionicons name="alert-circle" size={54} color="#EF4444" />
          </View>
          <Text style={styles.title}>Si è verificato un errore</Text>
          <Text style={styles.message}>{error}</Text>
          <Button 
            title="Chiudi"
            variant="danger" 
            onPress={clearError} 
            style={styles.button}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)', // transparent slate-900 background
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  button: {
    marginVertical: 0,
    height: 44,
  },
});
