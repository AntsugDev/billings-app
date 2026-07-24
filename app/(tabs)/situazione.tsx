import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { CallApi } from '@/scripts/api';

// ─── Interfaces ────────────────────────────────────────────────────────────

interface Utility {
  id: number;
  name: string;
  company: string;
  unit_of_measurement: string | null;
}

interface SituationItem {
  id: number;
  year: string;
  total_consumption_year: string;
  total_expense_year: string;
  avg_consumption_year: string;
  avg_expense_year: string;
  note: string | null;
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

// ─── Helpers ────────────────────────────────────────────────────────────────

const PAGE_SIZE_OPTIONS = [5, 10, 20];

const normalizePagination = (
  data: any,
  fallbackPage: number,
  fallbackSize: number,
  fallbackCount: number,
): Pagination => {
  const source = data?.pagination ?? data?.pageable ?? data?.page ?? {};
  const page = Number(source.page ?? source.number ?? data?.page ?? fallbackPage);
  const size = Number(source.size ?? data?.size ?? fallbackSize);
  const totalElements = Number(
    source.totalElements ??
    source.total_elements ??
    source.total ??
    data?.totalElements ??
    data?.total_elements ??
    fallbackCount,
  );
  const totalPages = Number(
    source.totalPages ??
    source.total_pages ??
    data?.totalPages ??
    data?.total_pages ??
    Math.max(1, Math.ceil(totalElements / Math.max(size, 1))),
  );
  return {
    page: Number.isFinite(page) ? page : fallbackPage,
    size: Number.isFinite(size) && size > 0 ? size : fallbackSize,
    totalElements: Number.isFinite(totalElements) ? totalElements : fallbackCount,
    totalPages: Number.isFinite(totalPages) && totalPages > 0 ? totalPages : 1,
  };
};

const getUtilityIcon = (name: string): { icon: string; color: string } => {
  const lower = name.toLowerCase();
  if (lower.includes('luce') || lower.includes('elettr') || lower.includes('light'))
    return { icon: 'flash', color: '#F59E0B' };
  if (lower.includes('gas') || lower.includes('fuoc'))
    return { icon: 'flame', color: '#EF4444' };
  if (lower.includes('acq') || lower.includes('wat'))
    return { icon: 'water', color: '#3B82F6' };
  return { icon: 'business', color: '#0D9488' };
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function SituazioneScreen() {
  // Utilities selector
  const [utilities, setUtilities] = useState<Utility[]>([]);
  const [utilitiesLoading, setUtilitiesLoading] = useState(false);
  const [selectedUtility, setSelectedUtility] = useState<Utility | null>(null);

  // Data
  const [data, setData] = useState<SituationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<Pagination>({
    page: 0,
    size: 5,
    totalPages: 1,
    totalElements: 0,
  });

  // ── on mount: load utilities only ────────────────────────────────────────
  useEffect(() => {
    fetchUtilities();
  }, []);

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

  // ── fetch situation data (only when utility is chosen) ───────────────────
  const fetchSituation = useCallback(async (utilityId: number, page: number, size: number) => {
    setLoading(true);
    try {
      const res = await CallApi({
        url: '/computation_ai',
        method: 'GET',
        queryString: { page, size },
      });

      let list: SituationItem[] = [];
      if (res.data && Array.isArray(res.data.content)) list = res.data.content;
      else if (Array.isArray(res.data)) list = res.data;
      else if (res.data && Array.isArray(res.data.data)) list = res.data.data;

      // Filter by selected utility
      list = list.filter(item => item.residential_utilities?.id === utilityId);

      const nextPag = normalizePagination(res.data, page, size, list.length);
      setData(list);
      setPagination(nextPag);
    } catch (e) {
      console.log('Errore fetch situazione:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── utility selection ─────────────────────────────────────────────────────
  const handleSelectUtility = (u: Utility) => {
    setSelectedUtility(u);
    setData([]);
    setPagination({ page: 0, size: pagination.size, totalPages: 1, totalElements: 0 });
    fetchSituation(u.id, 0, pagination.size);
  };

  const goToPage = (nextPage: number) => {
    if (!selectedUtility) return;
    const bounded = Math.max(0, Math.min(nextPage, pagination.totalPages - 1));
    if (bounded !== pagination.page) fetchSituation(selectedUtility.id, bounded, pagination.size);
  };

  const changePageSize = (nextSize: number) => {
    if (!selectedUtility || nextSize === pagination.size) return;
    fetchSituation(selectedUtility.id, 0, nextSize);
  };

  // ── render card ───────────────────────────────────────────────────────────
  const renderItem = ({ item }: { item: SituationItem }) => {
    const utilityName = item.residential_utilities?.name || selectedUtility?.name || 'Utenza';
    const companyName = item.residential_utilities?.company || selectedUtility?.company || '';
    const unit = item.residential_utilities?.unit_of_measurement || selectedUtility?.unit_of_measurement || '';
    const { icon, color } = getUtilityIcon(utilityName);

    return (
      <Card style={styles.dashboardCard}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.titleWrapper}>
            <View style={[styles.iconBadge, { backgroundColor: `${color}18` }]}>
              <Ionicons name={icon as any} size={22} color={color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle} numberOfLines={1}>{utilityName}</Text>
              <Text style={styles.cardSubtitle}>{companyName}</Text>
            </View>
          </View>
          <View style={styles.yearBadge}>
            <Text style={styles.yearBadgeText}>{item.year}</Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        {/* Main metrics */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Consumo Totale</Text>
            <Text style={styles.metricValue}>{item.total_consumption_year} {unit}</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Spesa Totale</Text>
            <Text style={[styles.metricValue, { color: '#0D9488' }]}>{item.total_expense_year} €</Text>
          </View>
        </View>

        {/* Secondary metrics */}
        <View style={styles.metricsGridSub}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Media Consumo</Text>
            <Text style={styles.metricValueSub}>{item.avg_consumption_year} {unit}/boll.</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Media Spesa</Text>
            <Text style={styles.metricValueSub}>{item.avg_expense_year} €/boll.</Text>
          </View>
        </View>

        {item.note ? (
          <View style={styles.noteContainer}>
            <Ionicons name="document-text-outline" size={14} color="#64748B" />
            <Text style={styles.noteText}>{item.note}</Text>
          </View>
        ) : null}
      </Card>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <Screen style={styles.container}>

      {/* ── Section title ── */}
      <Text style={styles.screenTitle}>Situazione Attuale</Text>
      <Text style={styles.screenSubtitle}>
        Seleziona un&apos;utenza per visualizzarne la situazione annuale.
      </Text>

      {/* ── Utility selector ── */}
      <View style={styles.selectorSection}>
        <Text style={styles.selectorLabel}>
          <Ionicons name="business-outline" size={14} color="#64748B" /> Utenza
        </Text>

        {utilitiesLoading ? (
          <View style={styles.selectorLoading}>
            <ActivityIndicator size="small" color="#0D9488" />
            <Text style={styles.selectorLoadingText}>Caricamento utenze...</Text>
          </View>
        ) : utilities.length === 0 ? (
          <View style={styles.noUtilitiesBox}>
            <Ionicons name="warning-outline" size={20} color="#F59E0B" />
            <Text style={styles.noUtilitiesText}>
              Nessuna utenza trovata. Creane una nella sezione &quot;Utenze&quot;.
            </Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillsRow}
          >
            {utilities.map((u) => {
              const isSelected = selectedUtility?.id === u.id;
              const { icon, color } = getUtilityIcon(u.name);
              return (
                <TouchableOpacity
                  key={u.id}
                  style={[styles.pill, isSelected && styles.pillActive]}
                  onPress={() => handleSelectUtility(u)}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name={icon as any}
                    size={16}
                    color={isSelected ? '#FFFFFF' : color}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.pillText, isSelected && styles.pillTextActive]}>
                    {u.name}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" style={{ marginLeft: 4 }} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* ── No utility selected ── */}
      {!selectedUtility && !utilitiesLoading && (
        <View style={styles.placeholderBox}>
          <Ionicons name="analytics-outline" size={64} color="#CBD5E1" />
          <Text style={styles.placeholderTitle}>Seleziona un&apos;utenza</Text>
          <Text style={styles.placeholderSub}>
            Scegli un&apos;utenza tra quelle disponibili in cima per visualizzare
            la situazione dei consumi e delle spese per anno.
          </Text>
        </View>
      )}

      {/* ── Content once utility is selected ── */}
      {selectedUtility && (
        <View style={styles.contentWrapper}>

          {/* Page-size selector + meta */}
          <View style={styles.toolbar}>
            <Text style={styles.toolbarMeta}>
              {loading
                ? 'Caricamento...'
                : `${pagination.totalElements} record · Pag. ${pagination.page + 1}/${pagination.totalPages}`}
            </Text>
            <View style={styles.pageSizeGroup}>
              {PAGE_SIZE_OPTIONS.map((opt) => (
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
          {loading && data.length === 0 ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#0D9488" />
            </View>
          ) : (
            <FlatList
              data={data}
              renderItem={renderItem}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="analytics-outline" size={56} color="#CBD5E1" />
                  <Text style={styles.emptyText}>Nessun dato disponibile</Text>
                  <Text style={styles.emptySubText}>
                    Non ci sono ancora dati elaborati per{'\n'}
                    <Text style={{ fontWeight: '700' }}>{selectedUtility.name}</Text>.
                  </Text>
                </View>
              }
            />
          )}

          {/* ── Pagination footer ── */}
          <View style={styles.paginationBar}>
            {/* Prev */}
            <TouchableOpacity
              style={[styles.navBtn, (loading || pagination.page <= 0) && styles.navBtnDisabled]}
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

            {/* Indicator */}
            <View style={styles.pageIndicatorBox}>
              {loading ? (
                <ActivityIndicator size="small" color="#0D9488" />
              ) : (
                <>
                  <Text style={styles.pageIndicatorMain}>
                    {pagination.page + 1} / {pagination.totalPages}
                  </Text>
                  <Text style={styles.pageIndicatorSub}>
                    {pagination.totalElements} elementi
                  </Text>
                </>
              )}
            </View>

            {/* Next */}
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

        </View>
      )}
    </Screen>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    paddingBottom: 0,
    paddingTop: 16,
  },

  // Header
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  screenSubtitle: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 20,
  },

  // Selector section
  selectorSection: {
    marginBottom: 16,
  },
  selectorLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  selectorLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  selectorLoadingText: {
    fontSize: 14,
    color: '#64748B',
  },
  noUtilitiesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 12,
  },
  noUtilitiesText: {
    fontSize: 13,
    color: '#92400E',
    flex: 1,
    lineHeight: 18,
  },
  pillsRow: {
    gap: 10,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  pillActive: {
    backgroundColor: '#0D9488',
    borderColor: '#0D9488',
  },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  pillTextActive: {
    color: '#FFFFFF',
  },

  // Placeholder (no selection)
  placeholderBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  placeholderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 16,
    marginBottom: 8,
  },
  placeholderSub: {
    fontSize: 14,
    color: '#CBD5E1',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Content
  contentWrapper: {
    flex: 1,
    position: 'relative',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  toolbarMeta: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  pageSizeGroup: {
    flexDirection: 'row',
    gap: 6,
  },
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
  pageSizeBtnActive: {
    borderColor: '#0D9488',
    backgroundColor: '#E6F4F1',
  },
  pageSizeTxt: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  pageSizeTxtActive: {
    color: '#0D9488',
  },

  // List
  list: {
    paddingBottom: 90,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },

  // Dashboard card
  dashboardCard: {
    marginBottom: 14,
    padding: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  yearBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  yearBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  metricsGridSub: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 12,
  },
  metricItem: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#334155',
    marginTop: 4,
  },
  metricValueSub: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginTop: 2,
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 6,
  },
  noteText: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
    flex: 1,
  },

  // Empty state
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
    marginTop: 14,
    marginBottom: 6,
  },
  emptySubText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Pagination footer
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
  navBtnDisabled: {
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  pageIndicatorBox: {
    alignItems: 'center',
    minWidth: 100,
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
});
