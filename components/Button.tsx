import React from 'react';
import { StyleSheet, Text, TouchableOpacity, TouchableOpacityProps, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'outline' | 'secondary' | 'danger';
  loading?: boolean;
  iconName?: string;
}

export function Button({ 
  title, 
  variant = 'primary', 
  loading = false, 
  iconName, 
  disabled, 
  style, 
  ...props 
}: ButtonProps) {
  
  const getStyles = () => {
    let buttonStyle: ViewStyle = styles.primaryButton;
    let textStyle: TextStyle = styles.primaryText;
    
    switch(variant) {
      case 'outline':
        buttonStyle = styles.outlineButton;
        textStyle = styles.outlineText;
        break;
      case 'secondary':
        buttonStyle = styles.secondaryButton;
        textStyle = styles.secondaryText;
        break;
      case 'danger':
        buttonStyle = styles.dangerButton;
        textStyle = styles.dangerText;
        break;
    }
    
    if (disabled || loading) {
      buttonStyle = { ...buttonStyle, opacity: 0.6 };
    }
    
    return { buttonStyle, textStyle };
  };

  const { buttonStyle, textStyle } = getStyles();

  return (
    <TouchableOpacity
      style={[styles.button, buttonStyle, style]}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? '#0D9488' : '#FFFFFF'} size="small" />
      ) : (
        <>
          {iconName && (
            <Ionicons 
              name={iconName as any} 
              size={20} 
              color={variant === 'outline' ? '#0D9488' : (variant === 'secondary' ? '#334155' : '#FFFFFF')} 
              style={styles.icon} 
            />
          )}
          <Text style={[styles.text, textStyle]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 50,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    width: '100%',
    marginVertical: 8,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
  icon: {
    marginRight: 8,
  },
  primaryButton: {
    backgroundColor: '#0D9488', // Teal accent
  },
  primaryText: {
    color: '#FFFFFF',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#0D9488',
  },
  outlineText: {
    color: '#0D9488',
  },
  secondaryButton: {
    backgroundColor: '#E2E8F0',
    borderColor: '#E2E8F0',
  },
  secondaryText: {
    color: '#334155',
  },
  dangerButton: {
    backgroundColor: '#EF4444',
  },
  dangerText: {
    color: '#FFFFFF',
  },
});
