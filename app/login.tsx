import React, {useState, useEffect} from 'react';
import {StyleSheet, View, Text, Alert} from 'react-native';
import {useLocalSearchParams, useRouter} from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

import {Screen} from '@/components/Screen';
import {Input} from '@/components/Input';
import {Button} from '@/components/Button';
import {CallApi, logoutApi} from '@/scripts/api';

export default function LoginScreen() {
    const router = useRouter();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [biometricLoading, setBiometricLoading] = useState(false);

    // Validation States
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');

    // Check if biometric is supported and enrolled
    const [isBiometricSupported, setIsBiometricSupported] = useState(false);
    const {logout} = useLocalSearchParams()

    useEffect(() => {
        if (logout) {
            logoutApi()
            return;
        }
        checkBiometrics();
    }, []);

    const checkBiometrics = async () => {
        try {
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();
            setIsBiometricSupported(hasHardware && isEnrolled);
        } catch (e) {
            console.log('Errore verifica biometria:', e);
            setIsBiometricSupported(false);
        }
    };

    // Funzione che gestisce il cambio testo SENZA far scattare la validazione pesante
    const handleEmailChange = (val: string) => {
        setEmail(val);
        if (emailError) setEmailError(''); // Pulisce l'errore se l'utente sta scrivendo
    };

    const handlePasswordChange = (val: string) => {
        setPassword(val);
        if (passwordError) setPasswordError(''); // Pulisce l'errore se l'utente sta scrivendo
    };

    // Validazione completa richiamata solo al submit o all'uscita dal campo (onBlur)
    const validateForm = () => {
        let isValid = true;

        if (!email.trim()) {
            setEmailError('L\'email è obbligatoria');
            isValid = false;
        } else {
            const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!regex.test(email.trim())) {
                setEmailError('Inserisci un indirizzo email valido');
                isValid = false;
            }
        }

        if (!password) {
            setPasswordError('La password è obbligatoria');
            isValid = false;
        }

        return isValid;
    };

    const handleManualLogin = async () => {
        if (!validateForm()) {
            return;
        }

        setLoading(true);
        try {
            const response = await CallApi({
                url: '/login',
                method: 'POST',
                body: {
                    email: email.trim(),
                    password: password,
                },
            });

            if (response && response.status === 200) {
                await SecureStore.setItemAsync('bio_email', email.trim());
                await SecureStore.setItemAsync('bio_password', password);

                router.replace('/(tabs)');
            }
        } catch (error) {
            console.log('Login fallito:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBiometricLogin = async () => {
        if (!isBiometricSupported) {
            Alert.alert(
                'Biometria non disponibile',
                'Assicurati che il tuo dispositivo supporti l\'impronta digitale/riconoscimento facciale e sia configurato.'
            );
            return;
        }

        setBiometricLoading(true);
        try {
            const savedEmail = await SecureStore.getItemAsync('bio_email');
            const savedPassword = await SecureStore.getItemAsync('bio_password');

            if (!savedEmail || !savedPassword) {
                Alert.alert(
                    'Biometria non registrata',
                    'Accedi manualmente almeno una volta inserendo email e password per abilitare l\'accesso rapido biometrico.'
                );
                setBiometricLoading(false);
                return;
            }

            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Accedi a Billings con le tue impronte digitali',
                cancelLabel: 'Annulla',
                fallbackLabel: 'Usa password',
            });

            if (result.success) {
                const response = await CallApi({
                    url: '/login',
                    method: 'POST',
                    body: {
                        email: savedEmail,
                        password: savedPassword,
                    },
                });

                if (response && response.status === 200) {
                    router.replace('/(tabs)');
                }
            } else {
                console.log('Autenticazione biometrica fallita o annullata');
            }
        } catch (error) {
            console.log('Errore nel login biometrico:', error);
        } finally {
            setBiometricLoading(false);
        }
    };

    return (
        <Screen scrollable scrollToEndOnKeyboard style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.brandTitle}>Billings</Text>
                <Text style={styles.brandSubtitle}>Gestione utenze e fatture annuali</Text>
            </View>

            <View style={styles.formCard}>
                <Text style={styles.loginTitle}>Accedi al tuo account</Text>

                <Input
                    label="Email/Username"
                    placeholder="es: admin@admin.com"
                    iconName="mail-outline"
                    value={email}
                    onChangeText={handleEmailChange}
                    error={emailError}
                    autoCapitalize="none"
                    keyboardType="email-address"
                />

                <Input
                    label="Password"
                    placeholder="Inserisci password"
                    iconName="lock-closed-outline"
                    secureTextEntry
                    value={password}
                    onChangeText={handlePasswordChange}
                    error={passwordError}
                    autoCapitalize="none"
                />

                <Button
                    title="Accedi"
                    variant="primary"
                    onPress={handleManualLogin}
                    loading={loading}
                    style={styles.loginButton}
                />

                {isBiometricSupported && (
                    <Button
                        title="Accedi con Fingerprint"
                        variant="outline"
                        iconName="finger-print-outline"
                        onPress={handleBiometricLogin}
                        loading={biometricLoading}
                        style={styles.bioButton}
                    />
                )}
            </View>

            <View style={styles.footer}>
                <Text style={styles.footerText}>Applicazione protetta con crittografia Secure Store</Text>
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        paddingVertical: 40,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    brandTitle: {
        fontSize: 36,
        fontWeight: '900',
        color: '#0D9488',
        letterSpacing: 1,
    },
    brandSubtitle: {
        fontSize: 14,
        color: '#64748B',
        marginTop: 6,
    },
    formCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 24,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#0F172A',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    loginTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 20,
        textAlign: 'center',
    },
    loginButton: {
        marginTop: 10,
    },
    bioButton: {
        marginTop: 8,
    },
    footer: {
        alignItems: 'center',
        marginTop: 32,
    },
    footerText: {
        fontSize: 12,
        color: '#94A3B8',
        textAlign: 'center',
    },
});