import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TextInputProps, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface InputProps extends TextInputProps {
  label?: string;
  iconName?: string;
  error?: string;
}

export function Input({
  label,
  iconName,
  error,
  secureTextEntry,
  style,
  ...restProps
}: InputProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const shouldSecure = Boolean(secureTextEntry && !isPasswordVisible);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View style={[styles.inputWrapper, error ? styles.inputWrapperError : null]}>
        {iconName && (
          <Ionicons
            name={iconName as any}
            size={20}
            color={error ? '#EF4444' : '#94A3B8'}
            style={styles.icon}
          />
        )}

        <TextInput
          {...restProps}
          style={[styles.input, style]}
          secureTextEntry={shouldSecure}
        />

        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setIsPasswordVisible((visible) => !visible)}
            style={styles.toggleButton}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color="#94A3B8"
            />
          </TouchableOpacity>
        )}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    height: 50,
  },
  inputWrapperError: {
    borderColor: '#EF4444',
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    color: '#0F172A',
    fontSize: 15,
  },
  toggleButton: {
    padding: 6,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
});