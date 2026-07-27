import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  Modal, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { CallApi } from '@/scripts/api';
import {setDataUtilities} from "@/scripts/store/ExtraStore";

interface Utility {
  id: number;
  name: string;
  company: string;
  note: string | null;
  date_contract: string | null;
  unit_of_measurement: string | null;
  price: string | null;
  formula: string | null;
}

export default function UtenzeScreen() {
  const [utilities, setUtilities] = useState<Utility[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedUtilityId, setSelectedUtilityId] = useState<number | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [dateContract, setDateContract] = useState('');
  const [unitOfMeasurement, setUnitOfMeasurement] = useState('');
  const [price, setPrice] = useState('');
  const [formula, setFormula] = useState('');
  const [note, setNote] = useState('');
  
  // Field Validation Errors
  const [nameError, setNameError] = useState('');
  const [companyError, setCompanyError] = useState('');

  useEffect(() => {
    fetchUtilities();
  }, []);

  const fetchUtilities = async () => {
    setLoading(true);
    try {
      const res = await CallApi({
        url: '/residential_utilities',
        method: 'GET',
      });
      
      let listData: Utility[] = [];
      if (Array.isArray(res.data)) {
        listData = res.data;
      } else if (res.data && Array.isArray(res.data.data)) {
        listData = res.data.data;
      }
      await setDataUtilities(JSON.stringify(listData))
      setUtilities(listData);
    } catch (err) {
      console.log('Errore fetch utilities:', err);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setIsEditing(false);
    setSelectedUtilityId(null);
    setName('');
    setCompany('');
    setDateContract('');
    setUnitOfMeasurement('');
    setPrice('');
    setFormula('');
    setNote('');
    setNameError('');
    setCompanyError('');
    setModalVisible(true);
  };

  const openEditModal = (item: Utility) => {
    setIsEditing(true);
    setSelectedUtilityId(item.id);
    setName(item.name || '');
    setCompany(item.company || '');
    
    // Parse contract date back if present
    if (item.date_contract) {
      const parts = item.date_contract.split('/');
      if (parts.length === 3) {
        setDateContract(`${parts[2]}-${parts[1]}-${parts[0]}`); // convert DD/MM/YYYY to YYYY-MM-DD
      } else {
        setDateContract(item.date_contract);
      }
    } else {
      setDateContract('');
    }
    
    setUnitOfMeasurement(item.unit_of_measurement || '');
    // Remove formatting from price if needed, replace comma with dot
    setPrice(item.price ? item.price.replace(/\./g, '').replace(',', '.') : '');
    setFormula(item.formula || '');
    setNote(item.note || '');
    setNameError('');
    setCompanyError('');
    setModalVisible(true);
  };

  const handleSave = async () => {
    let valid = true;
    if (!name.trim()) {
      setNameError('Il nome utenza è obbligatorio');
      valid = false;
    } else {
      setNameError('');
    }

    if (!company.trim()) {
      setCompanyError('L\'azienda è obbligatoria');
      valid = false;
    } else {
      setCompanyError('');
    }

    if (!valid) return;

    const payload = {
      name: name.trim(),
      company: company.trim(),
      note: note.trim() || null,
      date_contract: dateContract.trim() || null,
      unit_of_measurement: unitOfMeasurement.trim() || null,
      price: price.trim() ? parseFloat(price.trim()) : null,
      formula: formula.trim() || null,
    };

    try {
      if (isEditing && selectedUtilityId) {
        await CallApi({
          url: `/residential_utilities/${selectedUtilityId}`,
          method: 'PUT',
          body: payload,
        });
      } else {
        await CallApi({
          url: '/residential_utilities',
          method: 'POST',
          body: payload,
        });
      }
      setModalVisible(false);
      fetchUtilities();
    } catch (err) {
      console.log('Errore salvataggio:', err);
    }
  };

  const handleDelete = (id: number, name: string) => {
    Alert.alert(
      'Elimina Utenza',
      `Sei sicuro di voler eliminare l'utenza "${name}"? Verranno eliminate anche tutte le fatture collegate.`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            try {
              await CallApi({
                url: `/residential_utilities/${id}`,
                method: 'DELETE',
              });
              fetchUtilities();
            } catch (err) {
              console.log('Errore eliminazione:', err);
            }
          }
        }
      ]
    );
  };

  const renderUtilityCard = ({ item }: { item: Utility }) => (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.utilityName}>{item.name}</Text>
          <Text style={styles.utilityCompany}>{item.company}</Text>
        </View>
        <View style={styles.actionContainer}>
          <TouchableOpacity onPress={() => openEditModal(item)} style={styles.actionButton}>
            <Ionicons name="create-outline" size={22} color="#0D9488" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item.id, item.name)} style={styles.actionButton}>
            <Ionicons name="trash-outline" size={22} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.cardDivider} />
      
      <View style={styles.cardDetails}>
        {item.date_contract && (
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color="#64748B" />
            <Text style={styles.detailText}>Contratto del: {item.date_contract}</Text>
          </View>
        )}
        
        {item.price && (
          <View style={styles.detailRow}>
            <Ionicons name="pricetag-outline" size={16} color="#64748B" />
            <Text style={styles.detailText}>
              Prezzo unitario: {item.price} € {item.unit_of_measurement ? `/${item.unit_of_measurement}` : ''}
            </Text>
          </View>
        )}

        {item.formula && (
          <View style={styles.detailRow}>
            <Ionicons name="calculator-outline" size={16} color="#64748B" />
            <Text style={styles.detailText}>Formula: {item.formula}</Text>
          </View>
        )}

        {item.note && (
          <View style={styles.detailRow}>
            <Ionicons name="document-text-outline" size={16} color="#64748B" />
            <Text style={styles.detailText}>Note: {item.note}</Text>
          </View>
        )}
      </View>
    </Card>
  );

  return (
    <Screen style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.subtitle}>Configura le utenze attive per contratti di Luce, Gas, Acqua, ecc.</Text>
      </View>

      {loading && utilities.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#0D9488" />
        </View>
      ) : (
        <FlatList
          data={utilities}
          renderItem={renderUtilityCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="business-outline" size={60} color="#94A3B8" />
              <Text style={styles.emptyText}>Nessuna utenza registrata.</Text>
              <Text style={styles.emptySubText}>Clicca sul pulsante in basso per aggiungere la tua prima utenza (es. Luce, Gas, Acqua).</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity 
        style={styles.fab} 
        onPress={openAddModal}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

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
                {isEditing ? 'Modifica Utenza' : 'Aggiungi Nuova Utenza'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.formScroll}>
              <Input
                label="Nome Utenza *"
                placeholder="es: Luce, Gas, Acqua"
                value={name}
                onChangeText={setName}
                error={nameError}
              />

              <Input
                label="Azienda Fornitrice *"
                placeholder="es: Enel Energia, Eni Plenitude"
                value={company}
                onChangeText={setCompany}
                error={companyError}
              />

              <Input
                label="Data Contratto"
                placeholder="AAAA-MM-GG"
                value={dateContract}
                onChangeText={setDateContract}
              />

              <Input
                label="Unità di Misura"
                placeholder="es: kWh, Smc, mc"
                value={unitOfMeasurement}
                onChangeText={setUnitOfMeasurement}
              />

              <Input
                label="Prezzo Unitario (€)"
                placeholder="es: 0.231"
                keyboardType="numeric"
                value={price}
                onChangeText={setPrice}
              />

              <Input
                label="Formula di calcolo"
                placeholder="es: PUN * 1.1 + 0.02"
                value={formula}
                onChangeText={setFormula}
              />

              <Input
                label="Note aggiuntive"
                placeholder="Scrivi qui eventuali note..."
                multiline
                numberOfLines={3}
                value={note}
                onChangeText={setNote}
              />

              <Button
                title={isEditing ? 'Salva Modifiche' : 'Crea Utenza'}
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
    shadowOffset: { width: 0, height: 4 },
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
