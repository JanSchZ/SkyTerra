import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import Slider from '@react-native-community/slider';
import { useAuth } from '@context/AuthContext';
import LocationSelector from '@components/LocationSelector';
import {
  PilotDocument,
  PilotProfile,
  fetchPilotProfile,
  updatePilotProfile,
  uploadPilotDocument,
} from '@services/operatorJobs';
import { documentBlueprints, DOCUMENT_TOTAL } from '@content/documents';
import { getErrorMessage } from '@utils/errorMessages';
import { useTheme, ThemeColors, ThemeMode } from '@theme';

const statusCopy: Record<NonNullable<PilotDocument['status']>, { label: string; tone: string }> = {
  pending: { label: 'En revisión', tone: '#FBBF24' },
  approved: { label: 'Aprobado', tone: '#34D399' },
  rejected: { label: 'Rechazado', tone: '#F87171' },
  expired: { label: 'Vencido', tone: '#FB7185' },
};

const themeModeOptions: Array<{ value: ThemeMode; label: string; description: string }> = [
  { value: 'light', label: 'Claro', description: 'Fondo claro y tarjetas luminosas.' },
  { value: 'dark', label: 'Oscuro', description: 'Ideal para operar en ambientes con poca luz.' },
  { value: 'auto', label: 'Automático', description: 'Se adapta a la configuración del sistema.' },
];

const ProfileScreen = () => {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<PilotProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { colors, isDark, mode, setMode } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const backgroundGradient = useMemo(
    () => (isDark ? ['#050608', '#0b0d11'] : [colors.background, colors.backgroundAlt]),
    [colors.background, colors.backgroundAlt, isDark]
  );
  const [themeSaving, setThemeSaving] = useState<ThemeMode | null>(null);

  const [uploadingType, setUploadingType] = useState<PilotDocument['type'] | null>(null);

  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);

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

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchPilotProfile();
      setProfile(data);
      setForm({
        display_name: data.display_name ?? user?.first_name ?? '',
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
      setLocation(
        typeof data.location_latitude === 'number' && typeof data.location_longitude === 'number'
          ? { latitude: data.location_latitude, longitude: data.location_longitude }
          : null
      );
    } catch (err) {
      console.error('Profile load error', err);
      setError('No pudimos cargar tu perfil. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const getDocument = (type: PilotDocument['type']) =>
    profile?.documents?.find((item) => item.type === type) ?? null;

  const pendingRequirements = profile?.pending_requirements ?? [];

  const handleChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const coverageRadiusValue = useMemo(() => {
    const numeric = Number(form.coverage_radius_km);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return 50;
    }
    return Math.min(Math.max(Math.round(numeric), 5), 200);
  }, [form.coverage_radius_km]);

  const handleThemeChange = async (nextMode: ThemeMode) => {
    if (mode === nextMode) {
      return;
    }
    setThemeSaving(nextMode);
    try {
      await setMode(nextMode);
      setError(null);
      setSuccess('Preferencias de tema actualizadas.');
    } catch (err) {
      console.warn('Theme change failed', err);
      setError('No pudimos actualizar el tema. Intenta nuevamente.');
    } finally {
      setThemeSaving(null);
    }
  };

  const placeholderColor = isDark ? 'rgba(148,163,184,0.65)' : 'rgba(100,116,139,0.55)';

  const sliderBounds = { min: 5, max: 200 };

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
        location_latitude: location?.latitude ?? null,
        location_longitude: location?.longitude ?? null,
      };

      const updated = await updatePilotProfile(payload);
      setProfile(updated);
      setLocation(
        typeof updated.location_latitude === 'number' && typeof updated.location_longitude === 'number'
          ? { latitude: updated.location_latitude, longitude: updated.location_longitude }
          : null
      );
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
    return `${approved}/${DOCUMENT_TOTAL} documentos aprobados`;
  }, [profile?.documents]);

  return (
    <LinearGradient colors={backgroundGradient} style={styles.gradient}>
      <StatusBar style={colors.statusBarStyle} backgroundColor={backgroundGradient[0]} />
      <SafeAreaView style={styles.safe}>
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Preparando tu perfil…</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.headerCard}>
              <View style={styles.headerRow}>
                <View>
                  <Text style={styles.headerTitle}>{form.display_name || user?.first_name || 'Tu perfil'}</Text>
                  <Text style={styles.headerSubtitle}>{user?.email}</Text>
                </View>
                <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
                  <Ionicons name="log-out-outline" size={18} color={colors.textPrimary} />
                  <Text style={styles.signOutLabel}>Salir</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.headerMeta}>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Calificación</Text>
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
                  <Ionicons name="warning-outline" size={18} color={colors.warning} />
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
            </View>

            <View style={styles.formCard}>
              <Text style={styles.sectionTitle}>Datos personales</Text>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Nombre para clientes</Text>
                <TextInput
                  value={form.display_name}
                  onChangeText={(value) => handleChange('display_name', value)}
                  placeholder="Ej: Juan Pérez"
                  placeholderTextColor={placeholderColor}
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
                    placeholderTextColor={placeholderColor}
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
                    placeholderTextColor={placeholderColor}
                    style={styles.input}
                  />
                </View>
              </View>
              <View style={styles.rowFields}>
                <View style={styles.fieldGroupHalf}>
                  <Text style={styles.label}>Radio de cobertura (km)</Text>
                  <TextInput
                    value={form.coverage_radius_km}
                    onChangeText={(value) => handleChange('coverage_radius_km', value.replace(/[^0-9]/g, ''))}
                    placeholder="50"
                    placeholderTextColor={placeholderColor}
                    style={styles.input}
                    keyboardType="number-pad"
                  />
                  <View style={styles.sliderContainer}>
                    <Slider
                      value={coverageRadiusValue}
                      onValueChange={(value) => handleChange('coverage_radius_km', String(Math.round(value)))}
                      minimumValue={sliderBounds.min}
                      maximumValue={sliderBounds.max}
                      step={5}
                      thumbTintColor={isDark ? colors.surface : colors.primary}
                      minimumTrackTintColor={colors.primary}
                      maximumTrackTintColor={colors.cardBorder}
                    />
                    <View style={styles.sliderLabels}>
                      <Text style={styles.sliderValue}>{coverageRadiusValue} km</Text>
                      <Text style={styles.sliderAssist}>Rango {sliderBounds.min}–{sliderBounds.max} km</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.fieldGroupHalf}>
                  <Text style={styles.label}>Años de experiencia</Text>
                  <TextInput
                    value={form.experience_years}
                    onChangeText={(value) => handleChange('experience_years', value.replace(/[^0-9]/g, ''))}
                    placeholder="5"
                    placeholderTextColor={placeholderColor}
                    style={styles.input}
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Ubicación base</Text>
                <Text style={styles.helperText}>Selecciona tu punto de partida para calcular distancias.</Text>
                <LocationSelector value={location} radiusKm={coverageRadiusValue} onChange={setLocation} />
                <Text style={styles.locationHint}>
                  {location
                    ? `Coordenadas: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                    : 'Toca el mapa para guardar tu ubicación de referencia.'}
                </Text>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Modelo de dron principal</Text>
                <TextInput
                  value={form.drone_model}
                  onChangeText={(value) => handleChange('drone_model', value)}
                  placeholder="DJI Mavic 3 Cine"
                  placeholderTextColor={placeholderColor}
                  style={styles.input}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Sitio web</Text>
                <TextInput
                  value={form.website}
                  onChangeText={(value) => handleChange('website', value)}
                  placeholder="https://portafolio.com"
                  placeholderTextColor={placeholderColor}
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
                  placeholderTextColor={placeholderColor}
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
                  <ActivityIndicator color={colors.primaryOn} />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={18} color={colors.primaryOn} />
                    <Text style={styles.saveButtonLabel}>Guardar cambios</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.preferencesCard}>
              <Text style={styles.sectionTitle}>Preferencias de la app</Text>
              <View style={styles.themeOptions}>
                {themeModeOptions.map((option) => {
                  const isSelected = mode === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[styles.themeOption, isSelected && styles.themeOptionActive]}
                      onPress={() => handleThemeChange(option.value)}
                      activeOpacity={0.85}
                    >
                      <View style={[styles.radioOuter, isSelected && styles.radioOuterActive]}>
                        {isSelected ? <View style={styles.radioInner} /> : null}
                      </View>
                      <View style={styles.themeTexts}>
                        <Text style={styles.themeLabel}>{option.label}</Text>
                        <Text style={styles.themeDescription}>{option.description}</Text>
                      </View>
                      {themeSaving === option.value ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.documentsCard}>
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
                        <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                        <Text style={styles.documentMetaText}>
                          {current?.uploaded_at
                            ? `Última carga: ${new Date(current.uploaded_at).toLocaleDateString()}`
                            : 'Aún no cargado'}
                        </Text>
                      </View>
                      {current?.status ? (
                        <View style={styles.documentStatus}>
                          <Ionicons name="ellipse" size={10} color={statusInfo?.tone ?? colors.warning} />
                          <Text style={[styles.documentStatusText, { color: statusInfo?.tone ?? colors.warning }]}>
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
                        <ActivityIndicator color={colors.primaryOn} />
                      ) : (
                        <>
                          <Ionicons name="arrow-up-circle-outline" size={18} color={colors.primaryOn} />
                          <Text style={styles.uploadButtonLabel}>
                            {current ? 'Actualizar documento' : 'Subir documento'}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
};

export default ProfileScreen;

const createStyles = (colors: ThemeColors) => {
  const baseInput = {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    color: colors.textPrimary,
  };

  return StyleSheet.create({
    gradient: {
      flex: 1,
    },
    safe: {
      flex: 1,
      backgroundColor: colors.background,
    },
    loading: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.background,
    },
    loadingText: {
      color: colors.textSecondary,
    },
    content: {
      padding: 20,
      paddingBottom: 120,
      gap: 24,
    },
    headerCard: {
      borderRadius: 32,
      padding: 24,
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      gap: 18,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    headerTitle: {
      color: colors.heading,
      fontSize: 22,
      fontWeight: '700',
    },
    headerSubtitle: {
      color: colors.textSecondary,
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
      borderColor: colors.cardBorder,
      backgroundColor: colors.surfaceMuted,
    },
    signOutLabel: {
      color: colors.textPrimary,
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
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 1,
      fontSize: 12,
    },
    metaValue: {
      color: colors.heading,
      fontSize: 18,
      fontWeight: '700',
    },
    requirementsBox: {
      flexDirection: 'row',
      gap: 12,
      backgroundColor: colors.surfaceHighlight,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.cardBorderStrong,
      alignItems: 'center',
    },
    requirementsText: {
      gap: 4,
      flex: 1,
    },
    requirementsTitle: {
      color: colors.warning,
      fontWeight: '700',
    },
    requirementsItem: {
      color: colors.warning,
    },
    formCard: {
      borderRadius: 30,
      padding: 24,
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      gap: 18,
    },
    sectionTitle: {
      color: colors.heading,
      fontSize: 18,
      fontWeight: '700',
    },
    sectionSubtitle: {
      color: colors.textSecondary,
    },
    fieldGroup: {
      gap: 8,
    },
    helperText: {
      color: colors.textSecondary,
      fontSize: 13,
    },
    locationHint: {
      color: colors.textMuted,
      fontSize: 12,
      marginTop: 8,
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
      color: colors.textPrimary,
      fontWeight: '600',
    },
    input: baseInput,
    sliderContainer: {
      marginTop: 12,
      gap: 8,
    },
    sliderLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    sliderValue: {
      color: colors.heading,
      fontWeight: '700',
    },
    sliderAssist: {
      color: colors.textMuted,
      fontSize: 12,
    },
    error: {
      color: colors.danger,
      textAlign: 'center',
    },
    success: {
      color: colors.success,
      textAlign: 'center',
    },
    saveButton: {
      marginTop: 4,
      backgroundColor: colors.primary,
      borderRadius: 20,
      paddingVertical: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    saveButtonLabel: {
      color: colors.primaryOn,
      fontWeight: '700',
    },
    disabled: {
      opacity: 0.6,
    },
    preferencesCard: {
      borderRadius: 30,
      padding: 24,
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      gap: 16,
    },
    themeOptions: {
      gap: 12,
    },
    themeOption: {
      borderRadius: 20,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.surface,
    },
    themeOptionActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    radioOuter: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: colors.cardBorder,
      justifyContent: 'center',
      alignItems: 'center',
    },
    radioOuterActive: {
      borderColor: colors.primary,
    },
    radioInner: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: colors.primary,
    },
    themeTexts: {
      flex: 1,
      gap: 4,
    },
    themeLabel: {
      color: colors.textPrimary,
      fontWeight: '600',
    },
    themeDescription: {
      color: colors.textSecondary,
      fontSize: 13,
    },
    documentsCard: {
      borderRadius: 30,
      padding: 24,
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      gap: 18,
    },
    documentRow: {
      flexDirection: 'column',
      gap: 18,
      alignItems: 'stretch',
      borderRadius: 24,
      padding: 20,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    documentInfo: {
      gap: 8,
    },
    documentTitle: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: '600',
    },
    documentDescription: {
      color: colors.textSecondary,
      lineHeight: 20,
    },
    documentMeta: {
      flexDirection: 'row',
      gap: 6,
      alignItems: 'center',
      marginTop: 4,
    },
    documentMetaText: {
      color: colors.textMuted,
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
      color: colors.textSecondary,
    },
    uploadButton: {
      alignSelf: 'center',
      backgroundColor: colors.primary,
      borderRadius: 18,
      paddingHorizontal: 16,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      minWidth: 200,
    },
    uploadButtonLabel: {
      color: colors.primaryOn,
      fontWeight: '700',
    },
  });
};
