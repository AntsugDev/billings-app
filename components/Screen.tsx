import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, ScrollView, ViewStyle, KeyboardAvoidingView, Platform, SafeAreaView, Keyboard } from 'react-native';
import { StatusBar } from 'expo-status-bar';

interface ScreenProps {
  children: React.ReactNode;
  style?: ViewStyle;
  scrollable?: boolean;
  scrollToEndOnKeyboard?: boolean;
}

export function Screen({ children, style, scrollable = false, scrollToEndOnKeyboard = false }: ScreenProps) {
  const [keyboardInset, setKeyboardInset] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!scrollable) return;

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardInset(event.endCoordinates.height);
      if (scrollToEndOnKeyboard) {
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
      }
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardInset(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [scrollable, scrollToEndOnKeyboard]);

  const content = scrollable ? (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={[styles.scrollContent, style, { paddingBottom: keyboardInset + 40 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="always"
      keyboardDismissMode="none"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, style]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        enabled={Platform.OS === 'ios'}
        style={styles.keyboardAvoid}
      >
        {content}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  keyboardAvoid: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#F8FAFC',
  },
});