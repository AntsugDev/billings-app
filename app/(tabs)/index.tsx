import React, {useState, useEffect} from 'react';
import {
    StyleSheet,
    View,
    Text,
} from 'react-native';

import {Screen} from '@/components/Screen';
import {getDataUser, isValid, User} from "@/scripts/store/AuthStore";


export default function UtenzeScreen() {

    const [user, setUser] = useState<User | null>(null)

    useEffect(() => {

        const _user = async () => {
            if (await !isValid()) return;
            const data: User | null = await getDataUser()
            if (data)
                setUser(data)
            else return;
        }
        _user()
    }, []);


    return (
        <Screen style={styles.container}>
            <>
                {
                    user && <>

                        <View style={styles.container}>
                            <View style={styles.cardHeader}>
                                <Text>{user.name}</Text>
                            </View>

                        </View></>
                }
            </>

        </Screen>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingBottom: 0,
    },
    headerRow: {
        marginBottom: 16,
    },
    subtitle: {
        fontSize: 14,
        color: '#64748B',
        lineHeight: 20,
    },
    listContainer: {
        paddingBottom: 80,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        marginBottom: 12,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    utilityName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
    },
    utilityCompany: {
        fontSize: 14,
        color: '#64748B',
        marginTop: 2,
    },
    actionContainer: {
        flexDirection: 'row',
    },
    actionButton: {
        padding: 8,
        marginLeft: 8,
    },
    cardDivider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginVertical: 12,
    },
    cardDetails: {
        gap: 8,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    detailText: {
        fontSize: 14,
        color: '#475569',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        paddingHorizontal: 24,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#475569',
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubText: {
        fontSize: 14,
        color: '#94A3B8',
        textAlign: 'center',
        lineHeight: 20,
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        backgroundColor: '#0D9488',
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 5,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 24,
        maxHeight: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0F172A',
    },
    formScroll: {
        marginBottom: 10,
    },
    saveButton: {
        marginTop: 16,
        marginBottom: 24,
    },
});
