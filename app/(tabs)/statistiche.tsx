import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';

import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { CallApi } from '@/scripts/api';

// ─── Interfaces ─────────────────────────────────────────────────────────────

interface Utility {
  id: number;
  name: string;
  company: string;
  unit_of_measurement: string | null;
}

interface StatisticItem {
  id: number;
  response_calculate: string | null;
  description: string | null;
  year: string;
  month: string | null;
  residential_utilities?: {
    id: number;
    name: string;
    company: string;
    unit_of_measurement: string | null;
  };
}

interface Pagination {
  page: number;
  size: number;
  totalPages: number;
  totalElements: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PAGE_SIZE_OPTIONS = [5, 10, 20];

const MONTHS = [
  { value: '01', label: 'Gennaio' },
  { value: '02', label: 'Febbraio' },
  { value: '03', label: 'Marzo' },
  { value: '04', label: 'Aprile' },
  { value: '05', label: 'Maggio' },
  { value: '06', label: 'Giugno' },
  { value: '07', label: 'Luglio' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Settembre' },
  { value: '10', label: 'Ottobre' },
  { value: '11', label: 'Novembre' },
  { value: '12', label: 'Dicembre' },
];

const normalizePagination = (
  data: any,
  fallbackPage: number,
  fallbackSize: number,
  fallbackCount: number,
): Pagination => {
  const source = data?.pagination ?? data?.pageable ?? {};
  const page = Number(source.page ?? data?.page ?? fallbackPage);
  const size = Number(source.size ?? data?.size ?? fallbackSize);
  const totalElements = Number(
    source.totalElements ?? source.total ?? data?.totalElements ?? fallbackCount,
  );
  const totalPages = Number(
    source.totalPages ?? data?.totalPages ?? Math.max(1, Math.ceil(totalElements / Math.max(size, 1))),
  );
  return {
    page: Number.isFinite(page) ? page : fallbackPage,
    size: Number.isFinite(size) && size > 0 ? size : fallbackSize,
    totalElements: Number.isFinite(totalElements) ? totalElements : fallbackCount,
    totalPages: Number.isFinite(totalPages) && totalPages > 0 ? totalPages : 1,
  };
};

const getMonthName = (m: string | null): string => {
  if (!m) return '';
  return MONTHS.find(mo => mo.value === m)?.label ?? m;
};

const getUtilityIcon = (name: string): { icon: string; color: string } => {
  const lower = name.toLowerCase();
  //console.log('lower',lower)
  if (lower.includes('luce') || lower.includes('elettr')) return { icon: 'flash', color: '#F59E0B' };
  if (lower.includes('gas')) return { icon: 'flame', color: '#EF4444' };
  if (lower.includes('acq')) return { icon: 'water', color: '#3B82F6' };
  return { icon: 'business', color: '#0D9488' };
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function StatisticheScreen() {
  // Utilities
  const [utilities, setUtilities] = useState<Utility[]>([]);
  const [utilitiesLoading, setUtilitiesLoading] = useState(false);

  // List
  const [stats, setStats] = useState<StatisticItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<Pagination>({
    page: 0,
    size: 5,
    totalPages: 1,
    totalElements: 0,
  });

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [selectedUtility, setSelectedUtility] = useState<Utility | null>(null);
  const [year, setYear] = useState(dayjs().format('YYYY'));
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [calcValue1, setCalcValue1] = useState('');
  const [calcValue2, setCalcValue2] = useState('');
  const [description, setDescription] = useState('');

  // Form picker sub-modal for month & utility
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);
  const [utilityPickerVisible, setUtilityPickerVisible] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── on mount ─────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchUtilities();
    fetchStats(0, 5);
  }, []);

  // ── API ───────────────────────────────────────────────────────────────────

  const fetchUtilities = async () => {
    setUtilitiesLoading(true);
    try {
      const res = await CallApi({ url: '/residential_utilities', method: 'GET' });
      let list: Utility[] = [];
      if (Array.isArray(res.data)) list = res.data;
      else if (res.data && Array.isArray(res.data.data)) list = res.data.data;
      else if (res.data && Array.isArray(res.data.content)) list = res.data.content;
      setUtilities(list);
    } catch (e) {
      console.log('Errore fetch utenze:', e);
    } finally {
      setUtilitiesLoading(false);
    }
  };

  const fetchStats = useCallback(async (page: number, size: number) => {
    setLoading(true);
    try {
      const res = await CallApi({
        url: '/statistics',
        method: 'GET',
        queryString: { page, size },
      });

      let list: StatisticItem[] = [];
      if (res.data && Array.isArray(res.data.content)) list = res.data.content;
      else if (Array.isArray(res.data)) list = res.data;
      else if (res.data && Array.isArray(res.data.data)) list = res.data.data;

      const pag = normalizePagination(res.data, page, size, list.length);
      setStats(list);
      setPagination(pag);
    } catch (e) {
      console.log('Errore fetch statistiche:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Pagination ────────────────────────────────────────────────────────────

  const goToPage = (next: number) => {
    const bounded = Math.max(0, Math.min(next, pagination.totalPages - 1));
    if (bounded !== pagination.page) fetchStats(bounded, pagination.size);
  };

  const changePageSize = (size: number) => {
    if (size !== pagination.size) fetchStats(0, size);
  };

  // ── Form helpers ─────────────────────────────────────────────────────────

  const openModal = () => {
    setSelectedUtility(null);
    setYear(dayjs().format('YYYY'));
    setSelectedMonth('');
    setCalcValue1('');
    setCalcValue2('');
    setDescription('');
    setErrors({});
    setModalVisible(true);
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!selectedUtility) e.utility = "Seleziona un'utenza";
    if (!year.trim() || !/^\d{4}$/.test(year.trim())) e.year = 'Anno non valido (es. 2026)';
    if (!selectedMonth) e.month = 'Seleziona il mese';
    if (!calcValue1.trim() || isNaN(parseFloat(calcValue1)))
      e.calcValue1 = 'Inserisci un valore decimale valido (es. 12.5)';
    if (!calcValue2.trim() || isNaN(parseFloat(calcValue2)))
      e.calcValue2 = 'Inserisci un valore decimale valido (es. 0.23)';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await CallApi({
        url: '/statistics',
        method: 'POST',
        body: {
          residential_utility_id: selectedUtility!.id,
          year: year.trim(),
          month: selectedMonth,
          calculate_data: [
            parseFloat(calcValue1.trim()),
            parseFloat(calcValue2.trim()),
          ],
          description: description.trim() || null,
        },
      });
      setModalVisible(false);
      // Reload first page
      fetchStats(0, pagination.size);
    } catch (e) {
      console.log('Errore salvataggio statistica:', e);
    } finally {
      setSaving(false);
    }
  };

  // ── Render list card ──────────────────────────────────────────────────────

  const renderItem = ({ item }: { item: StatisticItem }) => {
    const utilityName = item.residential_utilities?.name ?? '—';
    const company = item.residential_utilities?.company ?? '';
    const { icon, color } = getUtilityIcon(utilityName);
    const monthLabel = getMonthName(item.month);
    const isCurrency =
      item.description?.toLowerCase().includes('costo') ||
      item.description?.toLowerCase().includes('spes');

    return (
      <Card style={styles.statCard}>
        <View style={styles.cardHeaderRow}>
          {/* Utility badge */}
          <View style={[styles.utilityBadge, { backgroundColor: `${color}15` }]}>
            <Ionicons name={icon as any} size={14} color={color} />
            <Text style={[styles.utilityBadgeTxt, { color }]}>{utilityName}</Text>
          </View>

          {/* Period */}
          <Text style={styles.periodTxt}>
            {monthLabel} {item.year}
          </Text>

          {/* Value */}
          {item.response_calculate != null && (
            <View style={styles.valueBadge}>
              <Text style={styles.valueTxt}>
                Costo per il mese calcolato:{item.response_calculate} {isCurrency ? '€' : item.residential_utilities?.unit_of_measurement ?? ''}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.cardDivider} />

        {item.description ? (
          <View style={styles.descRow}>
            <Ionicons name="trending-up-outline" size={15} color="#0D9488" />
            <Text style={styles.descTxt}>{item.description}</Text>
          </View>
        ) : null}

        {company ? <Text style={styles.companyTxt}>Fornitore: {company}</Text> : null}
      </Card>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Screen style={styles.container}>

      {/* Toolbar */}
      <View style={styles.toolbar}>
        <View>
          <Text style={styles.screenTitle}>Statistiche</Text>
          <Text style={styles.toolbarMeta}>
            {loading ? 'Caricamento...' : `${pagination.totalElements} record · Pag. ${pagination.page + 1}/${pagination.totalPages}`}
          </Text>
        </View>
        <View style={styles.toolbarRight}>
          {/* Page size pills */}
          {PAGE_SIZE_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt}
              style={[styles.pageSizeBtn, pagination.size === opt && styles.pageSizeBtnActive]}
              onPress={() => changePageSize(opt)}
              disabled={loading}
            >
              <Text style={[styles.pageSizeTxt, pagination.size === opt && styles.pageSizeTxtActive]}>
                {opt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* List */}
      {loading && stats.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#0D9488" />
        </View>
      ) : (
        <FlatList
          data={stats}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="bar-chart-outline" size={60} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>Nessuna statistica</Text>
              <Text style={styles.emptySub}>
                Clicca sul pulsante + per inserire il primo record.
              </Text>
            </View>
          }
        />
      )}

      {/* Pagination footer */}
      <View style={styles.paginationBar}>
        <TouchableOpacity
          style={[styles.navBtn, (loading || pagination.page <= 0) && styles.navBtnDisabled]}
          onPress={() => goToPage(pagination.page - 1)}
          disabled={loading || pagination.page <= 0}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={20} color={pagination.page <= 0 ? '#CBD5E1' : '#0D9488'} />
        </TouchableOpacity>

        <View style={styles.pageIndicatorBox}>
          {loading ? (
            <ActivityIndicator size="small" color="#0D9488" />
          ) : (
            <>
              <Text style={styles.pageIndicatorMain}>
                {pagination.page + 1} / {pagination.totalPages}
              </Text>
              <Text style={styles.pageIndicatorSub}>{pagination.totalElements} elementi</Text>
            </>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.navBtn,
            (loading || pagination.page >= pagination.totalPages - 1) && styles.navBtnDisabled,
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

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openModal} activeOpacity={0.8}>
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* ══════════════════════════════════════════════════════════════════════
          INSERT MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>

            {/* Modal header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nuova Statistica</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              {/* ── Utenza ── */}
              <Text style={styles.fieldLabel}>Utenza Residenziale *</Text>
              {utilitiesLoading ? (
                <ActivityIndicator size="small" color="#0D9488" style={{ marginBottom: 16 }} />
              ) : (
                <>
                  <TouchableOpacity
                    style={[styles.pickerButton, errors.utility ? styles.pickerButtonError : null]}
                    onPress={() => setUtilityPickerVisible(true)}
                  >
                    <Ionicons
                      name={selectedUtility ? (getUtilityIcon(selectedUtility.name).icon as any) : 'business-outline'}
                      size={18}
                      color={selectedUtility ? getUtilityIcon(selectedUtility.name).color : '#94A3B8'}
                    />
                    <Text style={[styles.pickerButtonText, !selectedUtility && styles.pickerPlaceholder]}>
                      {selectedUtility ? `${selectedUtility.name} — ${selectedUtility.company}` : 'Seleziona utenza...'}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color="#94A3B8" />
                  </TouchableOpacity>
                  {errors.utility ? <Text style={styles.errorText}>{errors.utility}</Text> : null}
                </>
              )}

              {/* ── Anno ── */}
              <Input
                label="Anno *"
                placeholder="es. 2026"
                value={year}
                onChangeText={setYear}
                error={errors.year}
                keyboardType="numeric"
                maxLength={4}
              />

              {/* ── Mese ── */}
              <Text style={styles.fieldLabel}>Mese *</Text>
              <TouchableOpacity
                style={[styles.pickerButton, errors.month ? styles.pickerButtonError : null]}
                onPress={() => setMonthPickerVisible(true)}
              >
                <Ionicons name="calendar-outline" size={18} color={selectedMonth ? '#0D9488' : '#94A3B8'} />
                <Text style={[styles.pickerButtonText, !selectedMonth && styles.pickerPlaceholder]}>
                  {selectedMonth
                    ? `${selectedMonth} — ${getMonthName(selectedMonth)}`
                    : 'Seleziona mese...'}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#94A3B8" />
              </TouchableOpacity>
              {errors.month ? <Text style={styles.errorText}>{errors.month}</Text> : null}

              {/* ── Dati calcolati (due double) ── */}
              <View style={styles.doubleFieldRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Input
                    label="Valore 1 *"
                    placeholder="es. 12.5"
                    value={calcValue1}
                    onChangeText={setCalcValue1}
                    error={errors.calcValue1}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Input
                    label="Valore 2 *"
                    placeholder="es. 0.23"
                    value={calcValue2}
                    onChangeText={setCalcValue2}
                    error={errors.calcValue2}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Info chip */}
              <View style={styles.infoChip}>
                <Ionicons name="information-circle-outline" size={15} color="#0D9488" />
                <Text style={styles.infoChipText}>
                  I due valori vengono inviati come coppia di dati numerici per il calcolo statistico.
                </Text>
              </View>

              {/* ── Descrizione (opzionale) ── */}
              <Input
                label="Descrizione (opzionale)"
                placeholder="es. Media consumi annuali, costo medio kWh..."
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />

              <Button
                title="Inserisci Statistica"
                onPress={handleSave}
                loading={saving}
                style={styles.saveButton}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════════
          UTILITY PICKER MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={utilityPickerVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setUtilityPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.pickerBackdrop}
          activeOpacity={1}
          onPress={() => setUtilityPickerVisible(false)}
        >
          <View style={styles.pickerSheet}>
            <View style={styles.pickerSheetHeader}>
              <Text style={styles.pickerSheetTitle}>Seleziona Utenza</Text>
              <TouchableOpacity onPress={() => setUtilityPickerVisible(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {utilities.map(u => {
                const { icon, color } = getUtilityIcon(u.name);
                const isSelected = selectedUtility?.id === u.id;
                return (
                  <TouchableOpacity
                    key={u.id}
                    style={[styles.pickerOption, isSelected && styles.pickerOptionActive]}
                    onPress={() => {
                      setSelectedUtility(u);
                      setUtilityPickerVisible(false);
                    }}
                  >
                    <View style={[styles.pickerOptionIcon, { backgroundColor: `${color}18` }]}>
                      <Ionicons name={icon as any} size={20} color={color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.pickerOptionTitle, isSelected && styles.pickerOptionTitleActive]}>
                        {u.name}
                      </Text>
                      <Text style={styles.pickerOptionSub}>{u.company}</Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color="#0D9488" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════════
          MONTH PICKER MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={monthPickerVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setMonthPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.pickerBackdrop}
          activeOpacity={1}
          onPress={() => setMonthPickerVisible(false)}
        >
          <View style={styles.pickerSheet}>
            <View style={styles.pickerSheetHeader}>
              <Text style={styles.pickerSheetTitle}>Seleziona Mese</Text>
              <TouchableOpacity onPress={() => setMonthPickerVisible(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>
            {/* Grid 3 columns */}
            <View style={styles.monthGrid}>
              {MONTHS.map(m => {
                const isSelected = selectedMonth === m.value;
                return (
                  <TouchableOpacity
                    key={m.value}
                    style={[styles.monthCell, isSelected && styles.monthCellActive]}
                    onPress={() => {
                      setSelectedMonth(m.value);
                      setMonthPickerVisible(false);
                    }}
                  >
                    <Text style={[styles.monthCellNum, isSelected && styles.monthCellNumActive]}>
                      {m.value}
                    </Text>
                    <Text style={[styles.monthCellLabel, isSelected && styles.monthCellLabelActive]}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

    </Screen>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { paddingBottom: 0, paddingTop: 16 },

  // Toolbar
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  toolbarMeta: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  toolbarRight: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingTop: 4 },
  pageSizeBtn: {
    minWidth: 38,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
  },
  pageSizeBtnActive: { borderColor: '#0D9488', backgroundColor: '#E6F4F1' },
  pageSizeTxt: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  pageSizeTxtActive: { color: '#0D9488' },

  // List
  list: { paddingBottom: 110 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 200 },

  // Stat card
  statCard: { marginBottom: 12, padding: 16 },
  cardHeaderRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    justifyContent:'flex-start',
    gap: 8,
  },
  utilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 5,
  },
  utilityBadgeTxt: { fontSize: 12, fontWeight: '700' },
  periodTxt: { fontSize: 14, fontWeight: '700', color: '#334155', flex: 1 },
  valueBadge: {
    backgroundColor: '#51A2FF',
    borderWidth: 1,
    borderColor: '#B8E6FE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  valueTxt: { fontSize: 13, fontWeight: '800', color: '#ffffff' },
  cardDivider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 10 },
  descRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  descTxt: { fontSize: 14, color: '#334155', lineHeight: 20, flex: 1 },
  companyTxt: { fontSize: 12, color: '#94A3B8', marginTop: 6 },

  // Empty
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 70,
    paddingHorizontal: 24,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#475569', marginTop: 14, marginBottom: 6 },
  emptySub: { fontSize: 14, color: '#94A3B8', textAlign: 'center', lineHeight: 20 },

  // Pagination bar
  paginationBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 20,
    paddingVertical: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 10,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#0D9488',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E6F4F1',
  },
  navBtnDisabled: { borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  pageIndicatorBox: {
    alignItems: 'center',
    minWidth: 100,
    minHeight: 36,
    justifyContent: 'center',
  },
  pageIndicatorMain: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  pageIndicatorSub: { fontSize: 11, color: '#94A3B8', marginTop: 1 },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 70,
    right: 20,
    backgroundColor: '#0D9488',
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },

  // Insert modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '92%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },

  // Field label
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },

  // Picker button
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    height: 50,
    gap: 10,
    marginBottom: 16,
  },
  pickerButtonError: { borderColor: '#EF4444' },
  pickerButtonText: { flex: 1, fontSize: 15, color: '#0F172A' },
  pickerPlaceholder: { color: '#94A3B8' },
  errorText: { color: '#EF4444', fontSize: 12, fontWeight: '500', marginTop: -12, marginBottom: 14 },

  // Double field row
  doubleFieldRow: { flexDirection: 'row' },

  // Info chip
  infoChip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#E6F4F1',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  infoChipText: { fontSize: 12, color: '#0F766E', flex: 1, lineHeight: 18 },

  saveButton: { marginTop: 8, marginBottom: 32 },

  // Picker sheet (utility + month)
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  pickerSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  pickerSheetTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },

  // Utility picker options
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: '#F8FAFC',
    gap: 12,
  },
  pickerOptionActive: { backgroundColor: '#E6F4F1', borderWidth: 1, borderColor: '#99F6E4' },
  pickerOptionIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerOptionTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  pickerOptionTitleActive: { color: '#0D9488' },
  pickerOptionSub: { fontSize: 12, color: '#64748B', marginTop: 2 },

  // Month grid
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 16,
  },
  monthCell: {
    width: '30%',
    flexGrow: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  monthCellActive: { backgroundColor: '#0D9488', borderColor: '#0D9488' },
  monthCellNum: { fontSize: 16, fontWeight: '800', color: '#334155' },
  monthCellNumActive: { color: '#FFFFFF' },
  monthCellLabel: { fontSize: 11, color: '#64748B', marginTop: 2 },
  monthCellLabelActive: { color: '#CCF5F0' },
});
