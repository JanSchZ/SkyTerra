import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '@context/AuthContext';
import {
  PilotDocument,
  PilotProfile,
  fetchPilotProfile,
  updatePilotProfile,
  uploadPilotDocument,
} from '@services/operatorJobs';
import { getErrorMessage } from '@utils/errorMessages';

const documentBlueprints: Array<{
  type: PilotDocument['type'];
  title: string;
  description: string;
  acceptedTypes: string[];
}> = [
  {
    type: 'id',
    title: 'Documento de identidad',
    description: 'Cédula o pasaporte vigente en formato PDF, JPG o PNG.',
    acceptedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
  },
  {
    type: 'license',
    title: 'Licencia de operador',
    description: 'Licencia DGAC o equivalente, incluye reverso si aplica.',
    acceptedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
  },
  {
    type: 'insurance',
    title: 'Seguro de responsabilidad',
    description: 'Certificado de cobertura actualizado para operaciones RPAS.',
    acceptedTypes: ['application/pdf', 'image/jpeg'],
  },
  {
    type: 'drone_registration',
    title: 'Registro de aeronave',
    description: 'Documento de inscripción del dron principal y número de serie.',
    acceptedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
  },
];

const statusCopy: Record<NonNullable<PilotDocument['status']>, { label: string; tone: string }> = {
  pending: { label: 'En revisión', tone: '#FBBF24' },
  approved: { label: 'Aprobado', tone: '#34D399' },
  rejected: { label: 'Rechazado', tone: '#F87171' },
  expired: { label: 'Vencido', tone: '#FB7185' },
};

const ProfileScreen = () => {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<PilotProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadingType, setUploadingType] = useState<PilotDocument['type'] | null>(null);

  const [form, setForm] = useState({
    display_name: '',
    phone_number: '',
    base_city: '',
    coverage_radius_km: '',
    drone_model: '',
    experience_years: '',
    website: '',
    portfolio_url: '',
  });

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await fetchPilotProfile();
      setProfile(data);
      setForm({
        display_name: data.display_name ?? '',
        phone_number: data.phone_number ?? '',
        base_city: data.base_city ?? '',
        coverage_radius_km:
          typeof data.coverage_radius_km === 'number' ? String(data.coverage_radius_km) : '',
        drone_model: data.drone_model ?? '',
        experience_years:
          typeof data.experience_years === 'number' ? String(data.experience_years) : '',
        website: data.website ?? '',
        portfolio_url: data.portfolio_url ?? data.website ?? '',
      });
    } catch (err) {
      console.error('Profile load error', err);
      setError('No pudimos cargar tu perfil. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const getDocument = (type: PilotDocument['type']) =>
    profile?.documents?.find((item) => item.type === type) ?? null;

  const pendingRequirements = profile?.pending_requirements ?? [];

  const handleChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const payload: Partial<PilotProfile> = {
        display_name: form.display_name.trim(),
        phone_number: form.phone_number.trim() || null,
        base_city: form.base_city.trim() || null,
        coverage_radius_km: form.coverage_radius_km ? Number(form.coverage_radius_km) : null,
        drone_model: form.drone_model.trim() || null,
        experience_years: form.experience_years ? Number(form.experience_years) : null,
        website: form.website.trim() || null,
        portfolio_url: form.portfolio_url.trim() || null,
      };

      const updated = await updatePilotProfile(payload);
      setProfile(updated);
      setSuccess('Perfil actualizado correctamente.');
    } catch (err) {
      const message = getErrorMessage(err, 'No pudimos guardar los cambios. Intenta nuevamente.');
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleUploadDocument = async (type: PilotDocument['type'], acceptedTypes: string[]) => {
    setError(null);
    setSuccess(null);
    setUploadingType(type);
    try {
      const picker = await DocumentPicker.getDocumentAsync({
        type: acceptedTypes,
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (picker.type !== 'success' || !picker.assets || !picker.assets.length) {
        setUploadingType(null);
        return;
      }

      const asset = picker.assets[0];
      const response = await uploadPilotDocument({
        type,
        file: {
          uri: asset.uri,
          name: asset.name ?? `${type}.pdf`,
          mimeType: asset.mimeType ?? acceptedTypes[0] ?? 'application/pdf',
        },
      });

      setProfile((prev) => {
        if (!prev) return prev;
        const otherDocs = prev.documents?.filter((doc) => doc.type !== type) ?? [];
        return {
          ...prev,
          documents: [...otherDocs, response],
        };
      });
      setSuccess('Documento subido correctamente.');
    } catch (err) {
      const message = getErrorMessage(err, 'No pudimos subir el documento. Intenta nuevamente.');
      setError(message);
    } finally {
      setUploadingType(null);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Cerrar sesión', '¿Deseas salir de tu cuenta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: () => {
          signOut();
        },
      },
    ]);
  };

  const documentsSummary = useMemo(() => {
    const approved = profile?.documents?.filter((doc) => doc.status === 'approved').length ?? 0;
    const total = documentBlueprints.length;
    return `${approved}/${total} documentos aprobados`;
  }, [profile?.documents]);

  return (
    <LinearGradient colors={['#050608', '#0b0d11']} style={styles.gradient}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe}>
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>Preparando tu perfil…</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            <BlurView intensity={90} tint="dark" style={styles.headerCard}>
              <View style={styles.headerRow}>
                <View>
                  <Text style={styles.headerTitle}>{form.display_name || 'Tu perfil'}</Text>
                  <Text style={styles.headerSubtitle}>{user?.email}</Text>
                </View>
                <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
                  <Ionicons name="log-out-outline" size={18} color="#F9FAFB" />
                  <Text style={styles.signOutLabel}>Salir</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.headerMeta}>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Score</Text>
                  <Text style={styles.metaValue}>
                    {typeof profile?.score === 'number' ? profile.score.toFixed(1) : '—'}
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Estado</Text>
                  <Text style={styles.metaValue}>
                    {profile?.status === 'active' ? 'Activo' : 'En revisión'}
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Documentos</Text>
                  <Text style={styles.metaValue}>{documentsSummary}</Text>
                </View>
              </View>
              {pendingRequirements.length ? (
                <View style={styles.requirementsBox}>
                  <Ionicons name="warning-outline" size={18} color="#FBBF24" />
                  <View style={styles.requirementsText}>
                    <Text style={styles.requirementsTitle}>Requisitos pendientes</Text>
                    {pendingRequirements.map((item) => (
                      <Text key={item} style={styles.requirementsItem}>
                        • {item}
                      </Text>
                    ))}
                  </View>
                </View>
              ) : null}
            </BlurView>

            <BlurView intensity={85} tint="dark" style={styles.formCard}>
              <Text style={styles.sectionTitle}>Datos personales</Text>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Nombre para clientes</Text>
                <TextInput
                  value={form.display_name}
                  onChangeText={(value) => handleChange('display_name', value)}
                  placeholder="Ej: Juan Pérez"
                  placeholderTextColor="rgba(148,163,184,0.65)"
                  style={styles.input}
                />
              </View>
              <View style={styles.rowFields}>
                <View style={styles.fieldGroupHalf}>
                  <Text style={styles.label}>Teléfono</Text>
                  <TextInput
                    value={form.phone_number}
                    onChangeText={(value) => handleChange('phone_number', value)}
                    placeholder="+56 9 1234 5678"
                    placeholderTextColor="rgba(148,163,184,0.65)"
                    style={styles.input}
                    keyboardType="phone-pad"
                  />
                </View>
                <View style={styles.fieldGroupHalf}>
                  <Text style={styles.label}>Ciudad base</Text>
                  <TextInput
                    value={form.base_city}
                    onChangeText={(value) => handleChange('base_city', value)}
                    placeholder="Santiago, Valparaíso…"
                    placeholderTextColor="rgba(148,163,184,0.65)"
                    style={styles.input}
                  />
                </View>
              </View>
              <View style={styles.rowFields}>
                <View style={styles.fieldGroupHalf}>
                  <Text style={styles.label}>Radio de cobertura (km)</Text>
                  <TextInput
                    value={form.coverage_radius_km}
                    onChangeText={(value) => handleChange('coverage_radius_km', value.replace(/[^0-9.]/g, ''))}
                    placeholder="50"
                    placeholderTextColor="rgba(148,163,184,0.65)"
                    style={styles.input}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.fieldGroupHalf}>
                  <Text style={styles.label}>Años de experiencia</Text>
                  <TextInput
                    value={form.experience_years}
                    onChangeText={(value) => handleChange('experience_years', value.replace(/[^0-9]/g, ''))}
                    placeholder="5"
                    placeholderTextColor="rgba(148,163,184,0.65)"
                    style={styles.input}
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Modelo de dron principal</Text>
                <TextInput
                  value={form.drone_model}
                  onChangeText={(value) => handleChange('drone_model', value)}
                  placeholder="DJI Mavic 3 Cine"
                  placeholderTextColor="rgba(148,163,184,0.65)"
                  style={styles.input}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Sitio web</Text>
                <TextInput
                  value={form.website}
                  onChangeText={(value) => handleChange('website', value)}
                  placeholder="https://portafolio.com"
                  placeholderTextColor="rgba(148,163,184,0.65)"
                  style={styles.input}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Portafolio o redes</Text>
                <TextInput
                  value={form.portfolio_url}
                  onChangeText={(value) => handleChange('portfolio_url', value)}
                  placeholder="https://instagram.com/tuestudio"
                  placeholderTextColor="rgba(148,163,184,0.65)"
                  style={styles.input}
                  autoCapitalize="none"
                />
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}
              {success ? <Text style={styles.success}>{success}</Text> : null}

              <TouchableOpacity
                style={[styles.saveButton, saving && styles.disabled]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#0F172A" />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={18} color="#0F172A" />
                    <Text style={styles.saveButtonLabel}>Guardar cambios</Text>
                  </>
                )}
              </TouchableOpacity>
            </BlurView>

            <BlurView intensity={85} tint="dark" style={styles.documentsCard}>
              <Text style={styles.sectionTitle}>Documentos y certificaciones</Text>
              <Text style={styles.sectionSubtitle}>
                Asegúrate de mantener cada documento actualizado para acelerar la aprobación de nuevas misiones.
              </Text>
              {documentBlueprints.map((doc) => {
                const current = getDocument(doc.type);
                const statusInfo = current?.status ? statusCopy[current.status] : null;
                return (
                  <View key={doc.type} style={styles.documentRow}>
                    <View style={styles.documentInfo}>
                      <Text style={styles.documentTitle}>{doc.title}</Text>
                      <Text style={styles.documentDescription}>{doc.description}</Text>
                      <View style={styles.documentMeta}>
                        <Ionicons name="time-outline" size={14} color="#CBD5F5" />
                        <Text style={styles.documentMetaText}>
                          {current?.uploaded_at
                            ? `Última carga: ${new Date(current.uploaded_at).toLocaleDateString()}`
                            : 'Aún no cargado'}
                        </Text>
                      </View>
                      {current?.status ? (
                        <View style={styles.documentStatus}>
                          <Ionicons name="ellipse" size={10} color={statusInfo?.tone ?? '#FBBF24'} />
                          <Text style={[styles.documentStatusText, { color: statusInfo?.tone ?? '#FBBF24' }]}>
                            {statusInfo?.label ?? 'En revisión'}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <TouchableOpacity
                      style={[styles.uploadButton, uploadingType === doc.type && styles.disabled]}
                      onPress={() => handleUploadDocument(doc.type, doc.acceptedTypes)}
                      disabled={uploadingType === doc.type}
                    >
                      {uploadingType === doc.type ? (
                        <ActivityIndicator color="#0F172A" />
                      ) : (
                        <>
                          <Ionicons name="arrow-up-circle-outline" size={18} color="#0F172A" />
                          <Text style={styles.uploadButtonLabel}>
                            {current ? 'Actualizar documento' : 'Subir documento'}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })}
            </BlurView>
          </ScrollView>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
};

export default ProfileScreen;

const baseInput = {
  backgroundColor: 'rgba(255,255,255,0.06)',
  borderRadius: 18,
  paddingHorizontal: 18,
  paddingVertical: 16,
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.14)',
  color: '#F8FAFC',
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#E5E7EB',
  },
  content: {
    padding: 20,
    paddingBottom: 120,
    gap: 24,
  },
  headerCard: {
    borderRadius: 32,
    padding: 24,
    backgroundColor: 'rgba(15,17,23,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 18,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#F9FAFB',
    fontSize: 22,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#CBD5F5',
    marginTop: 4,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  signOutLabel: {
    color: '#F9FAFB',
    fontWeight: '600',
  },
  headerMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaItem: {
    flex: 1,
    gap: 4,
  },
  metaLabel: {
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 12,
  },
  metaValue: {
    color: '#F9FAFB',
    fontSize: 18,
    fontWeight: '700',
  },
  requirementsBox: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'rgba(251,191,36,0.14)',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.3)',
  },
  requirementsText: {
    gap: 4,
    flex: 1,
  },
  requirementsTitle: {
    color: '#FBBF24',
    fontWeight: '700',
  },
  requirementsItem: {
    color: '#FBBF24',
  },
  formCard: {
    borderRadius: 30,
    padding: 24,
    backgroundColor: 'rgba(15,17,23,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 18,
  },
  sectionTitle: {
    color: '#F9FAFB',
    fontSize: 18,
    fontWeight: '700',
  },
  sectionSubtitle: {
    color: '#CBD5F5',
  },
  fieldGroup: {
    gap: 8,
  },
  rowFields: {
    flexDirection: 'row',
    gap: 16,
  },
  fieldGroupHalf: {
    flex: 1,
    gap: 8,
  },
  label: {
    color: '#E5E7EB',
    fontWeight: '600',
  },
  input: {
    ...baseInput,
  },
  error: {
    color: '#FCA5A5',
    textAlign: 'center',
  },
  success: {
    color: '#BBF7D0',
    textAlign: 'center',
  },
  saveButton: {
    marginTop: 4,
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  saveButtonLabel: {
    color: '#0F172A',
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.6,
  },
  documentsCard: {
    borderRadius: 30,
    padding: 24,
    backgroundColor: 'rgba(15,17,23,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 18,
  },
  documentRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
    borderRadius: 24,
    padding: 20,
    backgroundColor: 'rgba(15,23,42,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.14)',
  },
  documentInfo: {
    flex: 1,
    gap: 6,
  },
  documentTitle: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '600',
  },
  documentDescription: {
    color: '#CBD5F5',
    lineHeight: 20,
  },
  documentMeta: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    marginTop: 4,
  },
  documentMetaText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  documentStatus: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    marginTop: 4,
  },
  documentStatusText: {
    fontWeight: '600',
    fontSize: 13,
  },
  uploadButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#F9FAFB',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  uploadButtonLabel: {
    color: '#0F172A',
    fontWeight: '700',
  },
});
