import React, {useState, useEffect, useCallback, useMemo, useRef} from 'react';
import {
    StyleSheet,
    View,
    Text,
    FlatList,
    Modal,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    ScrollView,
    Switch
} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import dayjs from 'dayjs';

import {Screen} from '@/components/Screen';
import {Card} from '@/components/Card';
import {Button} from '@/components/Button';
import {Input} from '@/components/Input';
import {CallApi} from '@/scripts/api';
import {getFromNameUtilities} from "@/scripts/store/ExtraStore";
import {Icon} from "expo-router/unstable-native-tabs";

export interface Utility {
    id: number;
    name: string;
    company: string;
    unit_of_measurement: string | null;
}

interface Invoice {
    id: number;
    year: string;
    billing_periods: string;
    consumption: number;
    real_consumption: string; // 'Reale' or 'Stimato'
    expense: string; // Formatted e.g. "125,50"
    unit_cost: string; // Formatted e.g. "0,23"
    residential_utilities?: {
        id: number;
        name: string;
        unit_of_measurement: string | null;
    };
}

type TabType = 'Luce' | 'Gas' | 'Acqua';

interface InvoicePagination {
    page: number;
    size: number;
    totalPages: number;
    totalElements: number;
}

const PAGE_SIZE_OPTIONS = [3, 5, 8];

const normalizePagination = (pagination: any): InvoicePagination => {
    const page = Number(pagination.page);
    const size = Number(pagination.size);
    const totalElements = Number(pagination.totalElements);
    const totalPages = Number(pagination.totalPages);

    return {
        page: page,
        size: size,
        totalElements: totalElements,
        totalPages: totalPages,
    };
};

export default function FattureScreen() {
    const [activeTab, setActiveTab] = useState<TabType>('Luce');
    const [invoices, setInvoices] = useState<{ Luce: Invoice[], Gas: Invoice[], Acqua: Invoice[] }>({
        Luce: [],
        Gas: [],
        Acqua: []
    });
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
    const [pagination, setPagination] = useState<InvoicePagination>({
        page: 1,
        size: 3,
        totalPages: 1,
        totalElements: 0,
    });

    // Form Fields
    const [year, setYear] = useState(dayjs().format('YYYY'));
    const [billingPeriod, setBillingPeriod] = useState('');
    const [consumption, setConsumption] = useState('');
    const [isReal, setIsReal] = useState(true);
    const [expense, setExpense] = useState('');

    // Field Validation Errors
    const [yearError, setYearError] = useState('');
    const [periodError, setPeriodError] = useState('');
    const [consumptionError, setConsumptionError] = useState('');
    const [expenseError, setExpenseError] = useState('');

    const refTabs = useRef({activeTab})
    // Auto-derived utility for the active tab
    const activeUtility = async () => await idTabs(true);

    const unit =  (item) => {
        return item?.residential_utilities?.unit_of_measurement ?? ""
    }

    const idTabs = async (ifResult: boolean = false): Promise<number | undefined> => {
        const filter = await getFromNameUtilities(activeTab)
        if (filter.length > 0) return !ifResult ? filter[0].id : filter[0]
        else new Error("Impossibile procedere con la richiesta di estrazione dei dati")
    }
    const fetchInvoices = useCallback(async (page: number, size: number) => {
        setLoading(true);
        if(refTabs.current.activeTab !== activeTab){
            pagination.page = 1;
            pagination.size = 3;
            setInvoices(prevState => ({
                ...prevState,
                [activeTab]: []
            }));
        }
        const q = new Map();
        q.set('page', page)
        q.set('size', size)
        const tab = await idTabs()
        if (tab)
            q.set('_f', tab)
        try {

            const resI = await CallApi({
                url: '/list_data',
                method: 'GET',
                queryString: q,
            });
            let listI: Invoice[] = resI.data.content;
            const nextPagination = normalizePagination(resI.data.pagination);
            setInvoices(prevState => ({
                ...prevState,
                [activeTab]: listI
            }));
            setPagination(nextPagination);
        } catch (e) {
            console.log('Errore fetch invoices:', e);
        } finally {
            setLoading(false);
        }
    }, [activeUtility, activeTab]);

    useEffect(() => {
        fetchInvoices(pagination.page, pagination.size);
    }, [pagination.page, pagination.size, activeTab]);

    const createUtilityShortcut = async () => {
        setLoading(true);
        try {
            const name = activeTab === 'Luce' ? 'Luce' : (activeTab === 'Gas' ? 'Gas' : 'Acqua');
            const unit = activeTab === 'Luce' ? 'kWh' : (activeTab === 'Gas' ? 'Smc' : 'mc');

            await CallApi({
                url: '/residential_utilities',
                method: 'POST',
                body: {
                    name,
                    company: `Fornitore ${name}`,
                    unit_of_measurement: unit,
                    price: null,
                    formula: null,
                    note: `Creazione automatica per tab ${name}`,
                }
            });
        } catch (e) {
            console.log('Errore creazione shortcut utenza:', e);
        } finally {
            setLoading(false);
        }
    };

    const openAddModal = () => {
        if (!activeUtility) return;
        setIsEditing(false);
        setSelectedInvoiceId(null);
        setYear(dayjs().format('YYYY'));
        setBillingPeriod('');
        setConsumption('');
        setIsReal(true);
        setExpense('');

        setYearError('');
        setPeriodError('');
        setConsumptionError('');
        setExpenseError('');
        setModalVisible(true);
    };

    const openEditModal = (item: Invoice) => {
        setIsEditing(true);
        setSelectedInvoiceId(item.id);
        setYear(item.year || '');
        setBillingPeriod(item.billing_periods || '');
        setConsumption(item.consumption ? item.consumption.toString() : '');
        setIsReal(item.real_consumption === 'Reale');
        setExpense(item.expense ? item.expense.replace(/\./g, '').replace(',', '.') : '');

        setYearError('');
        setPeriodError('');
        setConsumptionError('');
        setExpenseError('');
        setModalVisible(true);
    };

    const handleSave = async () => {
        let valid = true;
        if (!year.trim()) {
            setYearError('L\'anno è obbligatorio');
            valid = false;
        } else {
            setYearError('');
        }

        if (!billingPeriod.trim()) {
            setPeriodError('Il periodo è obbligatorio');
            valid = false;
        } else {
            setPeriodError('');
        }

        if (!consumption.trim() || isNaN(parseInt(consumption))) {
            setConsumptionError('Inserisci un valore numerico intero');
            valid = false;
        } else {
            setConsumptionError('');
        }

        if (!expense.trim() || isNaN(parseFloat(expense))) {
            setExpenseError('Inserisci un valore numerico decimale');
            valid = false;
        } else {
            setExpenseError('');
        }

        if (!valid || !activeUtility) return;

        const payload = {
            year: year.trim(),
            billing_periods: billingPeriod.trim(),
            consumption: parseInt(consumption.trim()),
            real_consumption: isReal,
            expense: parseFloat(expense.trim()),
            residential_utilities_id: activeUtility.id,
        };

        try {
            if (isEditing && selectedInvoiceId) {
                await CallApi({
                    url: `/list_data/${selectedInvoiceId}`,
                    method: 'PUT',
                    body: payload,
                });
            } else {
                await CallApi({
                    url: '/list_data',
                    method: 'POST',
                    body: payload,
                });
            }
            setModalVisible(false);
            fetchInvoices(pagination.page, pagination.size);
        } catch (e) {
            console.log('Errore salvataggio fattura:', e);
        }
    };

    const handleDelete = (id: number, period: string) => {
        Alert.alert(
            'Elimina Fattura',
            `Sei sicuro di voler eliminare la fattura per il periodo "${period}"?`,
            [
                {text: 'Annulla', style: 'cancel'},
                {
                    text: 'Elimina',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await CallApi({
                                url: `/list_data/${id}`,
                                method: 'DELETE',
                            });
                            fetchInvoices(pagination.page, pagination.size);
                        } catch (e) {
                            console.log('Errore eliminazione fattura:', e);
                        }
                    }
                }
            ]
        );
    };

    // Helper helper function to parse expense and consumption string back to numbers
    const parseExpense = (str: string): number => {
        if (!str) return 0;
        return parseFloat(str.replace(/\./g, '').replace(',', '.'));
    };

    // Calculations for current year
    const currentYear = dayjs().format('YYYY');
    const invoicesCurrentYear = invoices[activeTab].filter(inv => inv.year === currentYear);
    const totalConsumptionCurrentYear = invoicesCurrentYear.reduce((acc, inv) => acc + (inv.consumption || 0), 0);
    const totalExpenseCurrentYear = invoicesCurrentYear.reduce((acc, inv) => acc + parseExpense(inv.expense), 0);

    // Dynamic unit cost calculation in the form
    const getDynamicUnitCost = () => {
        const cons = parseFloat(consumption);
        const exp = parseFloat(expense);
        if (!isNaN(cons) && !isNaN(exp) && cons > 0) {
            return (exp / cons).toFixed(4);
        }
        return '0.00';
    };

    const goToPage = (nextPage: number) => {
        const boundedPage = Math.max(0, Math.min(nextPage, pagination.totalPages - 1));
        if (boundedPage !== pagination.page) {
            fetchInvoices(boundedPage, pagination.size);
        }
    };

    const changePageSize = (nextSize: number) => {
        if (nextSize !== pagination.size) {
            fetchInvoices(0, nextSize);
        }
    };

    const renderInvoiceCard = ({item}: { item: Invoice }) => (
        <Card style={styles.invoiceCard}>
            <View style={styles.cardHeader}>
                <View>
                    <Ionicons name="chevron-forward-outline" size={12} color="#000000">
                        {item.id}
                    </Ionicons>

                </View>
                <View>
                    <Text
                        style={styles.periodText}>{item.billing_periods !== '' ? item.billing_periods : 'Non definito'}</Text>
                    <Text style={styles.yearText}>Anno {item.year} - {item.real_consumption}</Text>
                </View>
                <View style={styles.actionContainer}>
                    <TouchableOpacity onPress={() => openEditModal(item)} style={styles.actionButton}>
                        <Ionicons name="create-outline" size={20} color="#0D9488"/>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(item.id, item.billing_periods)}
                                      style={styles.actionButton}>
                        <Ionicons name="trash-outline" size={20} color="#EF4444"/>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.cardDivider}/>

            <View style={styles.invoiceDetailsGrid}>
                <View style={styles.gridItem}>
                    <Text style={styles.gridLabel}>Consumo</Text>
                    <Text style={styles.gridValue}>
                        {item.consumption} {activeUtility?.unit_of_measurement || ''}
                    </Text>
                </View>

                <View style={styles.gridItem}>
                    <Text style={styles.gridLabel}>Spesa Totale</Text>
                    <Text style={styles.gridValue}>{item.expense} €</Text>
                </View>

                <View style={styles.gridItem}>
                    <Text style={styles.gridLabel}>Costo Unitario</Text>
                    <Text style={styles.gridValue}>
                      {parseFloat(item.unit_cost).toFixed(2)} € / {unit(item)}
                    </Text>
                </View>
            </View>
        </Card>
    );

    // @ts-ignore
    return (
        <Screen style={styles.container}>
            {/* Tab bar header */}
            <View style={styles.tabHeader}>
                <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'Luce' && styles.tabButtonActive]}
                    onPress={() => setActiveTab('Luce')}
                >
                    <Ionicons name="flash-outline" size={18} color={activeTab === 'Luce' ? '#0D9488' : '#64748B'}/>
                    <Text style={[styles.tabText, activeTab === 'Luce' && styles.tabTextActive]}>Luce</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'Gas' && styles.tabButtonActive]}
                    onPress={() => setActiveTab('Gas')}
                >
                    <Ionicons name="flame-outline" size={18} color={activeTab === 'Gas' ? '#0D9488' : '#64748B'}/>
                    <Text style={[styles.tabText, activeTab === 'Gas' && styles.tabTextActive]}>Gas</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'Acqua' && styles.tabButtonActive]}
                    onPress={() => setActiveTab('Acqua')}
                >
                    <Ionicons name="water-outline" size={18} color={activeTab === 'Acqua' ? '#0D9488' : '#64748B'}/>
                    <Text style={[styles.tabText, activeTab === 'Acqua' && styles.tabTextActive]}>Acqua</Text>
                </TouchableOpacity>
            </View>


            {loading && invoices[activeTab].length === 0 ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#0D9488"/>
                </View>
            ) : (
                <View style={{flex: 1}}>
                    <View style={styles.paginationToolbar}>
                        <View style={styles.pageSizeGroup}>
                            {PAGE_SIZE_OPTIONS.map((option) => (
                                <TouchableOpacity
                                    key={option}
                                    style={[styles.pageSizeButton, pagination.size === option && styles.pageSizeButtonActive]}
                                    onPress={() => changePageSize(option)}
                                    disabled={loading}
                                >
                                    <Text
                                        style={[styles.pageSizeText, pagination.size === option && styles.pageSizeTextActive]}>{option}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <View>
                            <Ionicons name="download-outline" size={25} color="#5EE9B5"></Ionicons>
                        </View>
                    </View>
                    <FlatList
                        data={invoices[activeTab]}
                        renderItem={renderInvoiceCard}
                        keyExtractor={(item) => item.id.toString()}
                        contentContainerStyle={styles.listContainer}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Ionicons name="receipt-outline" size={60} color="#94A3B8"/>
                                <Text style={styles.emptyText}>Nessuna fattura registrata</Text>
                                <Text style={styles.emptySubText}>
                                    Aggiungi la prima bolletta per monitorare consumi e costi.
                                </Text>
                            </View>
                        }
                    />

                    {/* Sticky bottom panel: pagination nav + summary */}
                    <View style={styles.stickyBottom}>

                        {/* Pagination row */}
                        <View style={styles.paginationRow}>
                            {/* Prev icon button */}
                            <TouchableOpacity
                                style={[
                                    styles.navIconBtn,
                                    (loading || pagination.page <= 0) && styles.navIconBtnDisabled,
                                ]}
                                onPress={() => goToPage(pagination.page - 1)}
                                disabled={loading || pagination.page <= 0}
                                activeOpacity={0.7}
                            >
                                <Ionicons
                                    name="chevron-back"
                                    size={20}
                                    color={pagination.page <= 0 ? '#CBD5E1' : '#0D9488'}
                                />
                            </TouchableOpacity>

                            {/* Page indicator / spinner */}
                            <View style={styles.pageIndicatorBox}>
                                {loading ? (
                                    <ActivityIndicator size="small" color="#0D9488"/>
                                ) : (
                                    <>
                                        <Text style={styles.pageIndicatorMain}>
                                            {pagination.page} / {pagination.totalPages}
                                        </Text>
                                        <Text style={styles.pageIndicatorSub}>
                                            {pagination.totalElements} fatture
                                        </Text>
                                    </>
                                )}
                            </View>

                            {/* Next icon button */}
                            <TouchableOpacity
                                style={[
                                    styles.navIconBtn,
                                    (loading || pagination.page >= pagination.totalPages - 1) && styles.navIconBtnDisabled,
                                ]}
                                onPress={() => goToPage(pagination.page + 1)}
                                disabled={loading || pagination.page >= pagination.totalPages - 1}
                                activeOpacity={0.7}
                            >
                                <Ionicons
                                    name="chevron-forward"
                                    size={20}
                                    color={pagination.page >= pagination.totalPages - 1 ? '#CBD5E1' : '#0D9488'}
                                />
                            </TouchableOpacity>
                        </View>

                        {/* Divider */}
                        <View style={styles.stickyDivider}/>

                        {/* Summary row */}
                        <View style={styles.summaryGrid}>
                            <View style={styles.summaryCol}>
                                <Text style={styles.summaryLabel}>Riepilogo {currentYear} — Consumo</Text>
                                <Text style={styles.summaryValue}>
                                    {totalConsumptionCurrentYear} {activeUtility.unit_of_measurement || ''}
                                </Text>
                            </View>
                            <View style={styles.summaryColRight}>
                                <Text style={[styles.summaryLabel, {textAlign: 'right'}]}>Spesa Totale</Text>
                                <Text style={[styles.summaryValue, {textAlign: 'right'}]}>
                                    {totalExpenseCurrentYear.toLocaleString('it-IT', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                    })} €
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
            )}

            <TouchableOpacity
                style={styles.fab}
                onPress={openAddModal}
                activeOpacity={0.8}
            >
                <Ionicons name="add" size={28} color="#FFFFFF"/>
            </TouchableOpacity>

            {/* Add/Edit Modal */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {isEditing ? 'Modifica Fattura' : 'Aggiungi Nuova Fattura'}
                            </Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#64748B"/>
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} style={styles.formScroll}>
                            <Input
                                label="Anno di Competenza *"
                                placeholder="es: 2026"
                                value={year}
                                onChangeText={setYear}
                                error={yearError}
                                keyboardType="numeric"
                            />

                            <Input
                                label="Periodo di Fatturazione *"
                                placeholder="es: Gennaio - Febbraio, Q1, ecc."
                                value={billingPeriod}
                                onChangeText={setBillingPeriod}
                                error={periodError}
                            />

                            <Input
                                label={`Consumo in ${activeUtility?.unit_of_measurement || 'unità'} *`}
                                placeholder="es: 150"
                                value={consumption}
                                onChangeText={setConsumption}
                                error={consumptionError}
                                keyboardType="numeric"
                            />

                            <View style={styles.switchRow}>
                                <View>
                                    <Text style={styles.switchLabel}>Fattura su Consumo Reale</Text>
                                    <Text style={styles.switchSubtitle}>Spegni per indicare consumo stimato</Text>
                                </View>
                                <Switch
                                    value={isReal}
                                    onValueChange={setIsReal}
                                    trackColor={{false: '#CBD5E1', true: '#99F6E4'}}
                                    thumbColor={isReal ? '#0D9488' : '#64748B'}
                                />
                            </View>

                            <Input
                                label="Importo Fattura (€) *"
                                placeholder="es: 85.50"
                                value={expense}
                                onChangeText={setExpense}
                                error={expenseError}
                                keyboardType="numeric"
                            />

                            {/* Display Calculated Unit Cost */}
                            <View style={styles.calculationPreview}>
                                <Ionicons name="information-circle-outline" size={18} color="#0D9488"/>
                                <Text style={styles.calculationText}>
                                    Costo Unitario Calcolato: <Text
                                    style={styles.calculationBold}>{getDynamicUnitCost()} €/{activeUtility?.unit_of_measurement || ''}</Text>
                                </Text>
                            </View>

                            <Button
                                title={isEditing ? 'Salva Modifiche' : 'Inserisci Fattura'}
                                onPress={handleSave}
                                style={styles.saveButton}
                            />
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </Screen>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingBottom: 0,
        paddingHorizontal: 0,
        paddingTop: 0,
    },
    tabHeader: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        paddingHorizontal: 12,
    },
    tabButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        gap: 6,
        borderBottomWidth: 3,
        borderBottomColor: 'transparent',
    },
    tabButtonActive: {
        borderBottomColor: '#0D9488',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
    },
    tabTextActive: {
        color: '#0D9488',
    },
    listContainer: {
        padding: 16,
        paddingBottom: 180,
    },
    paginationToolbar: {
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 10,
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-around"
    },
    paginationTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
    },
    paginationMeta: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 2,
    },
    pageSizeGroup: {
        flexDirection: 'row',
        gap: 8,
    },
    pageSizeButton: {
        minWidth: 42,
        height: 34,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#CBD5E1',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
    },
    pageSizeButtonActive: {
        borderColor: '#0D9488',
        backgroundColor: '#E6F4F1',
    },
    pageSizeText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#64748B',
    },
    pageSizeTextActive: {
        color: '#0D9488',
    },
    // ── sticky bottom panel ──────────────────────────────────────────
    stickyBottom: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 12,
        shadowColor: '#0F172A',
        shadowOffset: {width: 0, height: -3},
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 12,
    },
    paginationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    navIconBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: '#0D9488',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#E6F4F1',
    },
    navIconBtnDisabled: {
        borderColor: '#E2E8F0',
        backgroundColor: '#F8FAFC',
    },
    pageIndicatorBox: {
        alignItems: 'center',
        minWidth: 80,
        minHeight: 36,
        justifyContent: 'center',
    },
    pageIndicatorMain: {
        fontSize: 14,
        fontWeight: '800',
        color: '#0F172A',
    },
    pageIndicatorSub: {
        fontSize: 11,
        color: '#94A3B8',
        marginTop: 1,
    },
    stickyDivider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginBottom: 10,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    invoiceCard: {
        marginBottom: 12,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    periodText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
    },
    yearText: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 2,
    },
    actionContainer: {
        flexDirection: 'row',
    },
    actionButton: {
        padding: 6,
        marginLeft: 6,
    },
    cardDivider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginVertical: 12,
    },
    invoiceDetailsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    gridItem: {
        flex: 1,
    },
    gridLabel: {
        fontSize: 11,
        color: '#94A3B8',
        textTransform: 'uppercase',
        fontWeight: '600',
    },
    gridValue: {
        fontSize: 14,
        color: '#334155',
        fontWeight: '700',
        marginTop: 4,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        paddingTop: 60,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#475569',
        marginTop: 16,
        marginBottom: 8,
        textAlign: 'center',
    },
    emptySubText: {
        fontSize: 14,
        color: '#94A3B8',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 20,
    },
    shortcutButton: {
        maxWidth: 220,
    },
    fab: {
        position: 'absolute',
        bottom: 155, // above the sticky bottom panel
        right: 20,
        backgroundColor: '#0D9488',
        width: 52,
        height: 52,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 6,
    },
    summaryGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    summaryCol: {
        flex: 1,
    },
    summaryColRight: {
        flex: 1,
        alignItems: 'flex-end',
    },
    summaryLabel: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    summaryValue: {
        fontSize: 16,
        color: '#0D9488',
        fontWeight: '800',
        marginTop: 3,
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
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 10,
        padding: 12,
        marginBottom: 16,
    },
    switchLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#334155',
    },
    switchSubtitle: {
        fontSize: 11,
        color: '#64748B',
        marginTop: 2,
    },
    calculationPreview: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#E6F4F1',
        borderRadius: 10,
        padding: 12,
        marginBottom: 16,
    },
    calculationText: {
        fontSize: 13,
        color: '#0F766E',
        flex: 1,
    },
    calculationBold: {
        fontWeight: '700',
    },
    saveButton: {
        marginTop: 16,
        marginBottom: 24,
    },
});
