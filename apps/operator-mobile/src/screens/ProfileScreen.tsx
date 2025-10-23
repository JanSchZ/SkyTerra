import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '@context/AuthContext';
import LocationSelector from '@components/LocationSelector';
import {
  PilotDocument,
  PilotProfile,
  fetchPilotProfile,
  updatePilotProfile,
  uploadPilotDocument,
} from '@services/operatorJobs';
import { persistPreferredName } from '@services/apiClient';
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

const DEFAULT_COVERAGE_RADIUS = 50;

const DRONE_MODELS = [
  'DJI Mini 3 Pro',
  'DJI Mini 4 Pro',
  'DJI Air 3',
  'DJI Mavic 3 Classic',
  'DJI Mavic 3 Pro',
  'DJI Mavic 3 Pro Cine',
  'DJI Mavic 4',
  'DJI Mavic 4 Pro',
  'DJI Inspire 2',
  'DJI Inspire 3',
];

const extractFileName = (url?: string | null) => {
  if (!url) return null;
  try {
    const decoded = decodeURIComponent(url.split('?')[0] ?? url);
    const segments = decoded.split('/');
    return segments[segments.length - 1] || decoded;
  } catch {
    return url;
  }
};

const ProfileScreen = () => {
  const { user, signOut, preferredName } = useAuth();
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
  const profileStatusMeta = useMemo(
    () => ({
      approved: { label: 'Activo', tone: colors.success },
      pending: { label: 'En revisión', tone: colors.warning },
      rejected: { label: 'Rechazado', tone: colors.danger },
      suspended: { label: 'Suspendido', tone: colors.textSecondary },
    }),
    [colors.success, colors.warning, colors.danger, colors.textSecondary]
  );
  const [themeSaving, setThemeSaving] = useState<ThemeMode | null>(null);
  const [droneSelectorVisible, setDroneSelectorVisible] = useState(false);

  const [uploadingType, setUploadingType] = useState<PilotDocument['doc_type'] | null>(null);
  const [documentStates, setDocumentStates] = useState<
    Record<PilotDocument['doc_type'], { status: 'idle' | 'uploading' | 'success' | 'error'; message?: string }>
  >({});

  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const [form, setForm] = useState({
    display_name: '',
    phone_number: '',
    base_city: '',
    drone_model: '',
    experience_years: '',
    website: '',
    portfolio_url: '',
  });

  const normalizedPreferredName = useMemo(() => {
    if (preferredName?.trim()) {
      return preferredName.trim();
    }
    const first = user?.first_name?.trim();
    const last = user?.last_name?.trim();
    const parts = [first, last].filter((part): part is string => Boolean(part && part.length));
    return parts.join(' ').trim();
  }, [preferredName, user?.first_name, user?.last_name]);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchPilotProfile();
      const profileName = [data.user?.first_name, data.user?.last_name]
        .filter(Boolean)
        .join(' ')
        .trim();
      const resolvedName =
        data.display_name?.trim().length ? data.display_name.trim() : profileName || normalizedPreferredName;
      setProfile(data);
      setForm({
        display_name: resolvedName,
        phone_number: data.phone_number ?? '',
        base_city: data.base_city ?? '',
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
  }, [normalizedPreferredName]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const getDocument = (docType: PilotDocument['doc_type']) =>
    profile?.documents?.find((item) => item.doc_type === docType) ?? null;

  const pendingRequirements = profile?.pending_requirements ?? [];

  const handleChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

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

  const coverageRadius = useMemo(() => {
    const raw = profile?.coverage_radius_km;
    if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
      return Math.round(raw);
    }
    if (typeof raw === 'string') {
      const numeric = Number(raw);
      if (Number.isFinite(numeric) && numeric > 0) {
        return Math.round(numeric);
      }
    }
    return DEFAULT_COVERAGE_RADIUS;
  }, [profile?.coverage_radius_km]);

  const handleSave = async () => {
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const displayName = form.display_name.trim();
      const phone = form.phone_number.trim();
      const baseCity = form.base_city.trim();
      const droneModel = form.drone_model.trim();
      const website = form.website.trim();
      const portfolio = form.portfolio_url.trim();

      const payload: Partial<PilotProfile> = {
        display_name: displayName,
        phone_number: phone || '',
        base_city: baseCity || '',
        drone_model: droneModel || '',
        experience_years: form.experience_years ? Number(form.experience_years) : null,
        website: website || '',
        portfolio_url: portfolio || '',
        location_latitude: location?.latitude ?? null,
        location_longitude: location?.longitude ?? null,
      };

      const updated = await updatePilotProfile(payload);
      setProfile(updated);
      const updatedFallbackName =
        [updated.user?.first_name, updated.user?.last_name]
          .filter(Boolean)
          .join(' ')
          .trim() || normalizedPreferredName || null;
      const nextPreferredName =
        updated.display_name?.trim() ||
        form.display_name.trim() ||
        updatedFallbackName ||
        null;
      await persistPreferredName(nextPreferredName);
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

  const handleUploadDocument = async (
    docType: PilotDocument['doc_type'],
    acceptedTypes: string[]
  ) => {
    setError(null);
    setSuccess(null);
    setUploadingType(docType);
    setDocumentStates((prev) => ({
      ...prev,
      [docType]: { status: 'uploading', message: 'Subiendo documento…' },
    }));
    try {
      const picker = await DocumentPicker.getDocumentAsync({
        type: acceptedTypes,
        copyToCacheDirectory: true,
        multiple: false,
      });

      const normalizedPicker = picker as Awaited<ReturnType<typeof DocumentPicker.getDocumentAsync>> & {
        type?: string;
        assets?: DocumentPicker.DocumentPickerAsset[];
        canceled?: boolean;
        uri?: string;
        name?: string;
        mimeType?: string;
        size?: number;
      };
      const assets = Array.isArray(normalizedPicker.assets) ? normalizedPicker.assets : [];
      const wasCancelled =
        normalizedPicker.canceled === true ||
        (typeof normalizedPicker.type === 'string' && normalizedPicker.type !== 'success');

      let asset: DocumentPicker.DocumentPickerAsset | null = null;
      if (!wasCancelled) {
        if (assets.length) {
          asset = assets[0] ?? null;
        } else if (typeof normalizedPicker.uri === 'string') {
          asset = {
            uri: normalizedPicker.uri,
            name: normalizedPicker.name ?? `${docType}.pdf`,
            mimeType: normalizedPicker.mimeType ?? acceptedTypes[0] ?? 'application/pdf',
            size: normalizedPicker.size,
          } as DocumentPicker.DocumentPickerAsset;
        }
      }

      if (wasCancelled) {
        setUploadingType(null);
        setDocumentStates((prev) => {
          const next = { ...prev };
          delete next[docType];
          return next;
        });
        return;
      }

      if (!asset) {
        const message = 'No pudimos leer el archivo seleccionado. Intenta nuevamente.';
        setError(message);
        setDocumentStates((prev) => ({
          ...prev,
          [docType]: { status: 'error', message },
        }));
        setUploadingType(null);
        return;
      }
      const response = await uploadPilotDocument({
        doc_type: docType,
        file: {
          uri: asset.uri,
          name: asset.name ?? `${docType}.pdf`,
          mimeType: asset.mimeType ?? acceptedTypes[0] ?? 'application/pdf',
        },
      });

      setProfile((prev) => {
        if (!prev) return prev;
        const otherDocs = prev.documents?.filter((doc) => doc.doc_type !== docType) ?? [];
        return {
          ...prev,
          documents: [...otherDocs, response],
        };
      });
      const successMessage = `Documento actualizado el ${new Date().toLocaleString()}.`;
      setSuccess(successMessage);
      setDocumentStates((prev) => ({
        ...prev,
        [docType]: { status: 'success', message: successMessage },
      }));
    } catch (err) {
      const message = getErrorMessage(err, 'No pudimos subir el documento. Intenta nuevamente.');
      setError(message);
      setDocumentStates((prev) => ({
        ...prev,
        [docType]: { status: 'error', message },
      }));
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
    const approvedCount =
      profile?.documents?.filter((doc) => doc.status === 'approved' && !doc.is_expired).length ?? 0;
    return `${approvedCount}/${DOCUMENT_TOTAL} documentos aprobados`;
  }, [profile?.documents]);

  const registeredFullName = useMemo(() => {
    const fromProfile = [profile?.user?.first_name, profile?.user?.last_name]
      .filter(Boolean)
      .join(' ')
      .trim();
    if (fromProfile.length) {
      return fromProfile;
    }
    return normalizedPreferredName;
  }, [profile?.user?.first_name, profile?.user?.last_name, normalizedPreferredName]);

  const headerDisplayName = form.display_name?.trim() || registeredFullName || 'Tu perfil';

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
                  <Text style={styles.headerTitle}>{headerDisplayName}</Text>
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
                  {(() => {
                    const meta = profileStatusMeta[profile?.status ?? 'pending'];
                    const label = profile?.status_label ?? meta?.label ?? 'En revisión';
                    const tone = meta?.tone ?? colors.warning;
                    return <Text style={[styles.metaValue, { color: tone }]}>{label}</Text>;
                  })()}
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
                <Text style={styles.label}>Nombre del piloto</Text>
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
              <View style={styles.fieldGroup}>
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

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Ubicación base</Text>
                <Text style={styles.helperText}>Selecciona tu punto de partida para calcular distancias.</Text>
                <LocationSelector value={location} radiusKm={coverageRadius} onChange={setLocation} />
                <Text style={styles.locationHint}>
                  {location
                    ? `Coordenadas: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                    : 'Toca el mapa para guardar tu ubicación de referencia.'}
                </Text>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Modelo de dron principal</Text>
                <TouchableOpacity
                  style={styles.selectInput}
                  onPress={() => setDroneSelectorVisible(true)}
                  activeOpacity={0.85}
                >
                  <Text style={form.drone_model ? styles.selectValue : styles.selectPlaceholder}>
                    {form.drone_model || 'Selecciona tu dron principal'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Sitio web (opcional)</Text>
                <TextInput
                  value={form.website}
                  onChangeText={(value) => handleChange('website', value)}
                  placeholder="https://portafolio.com"
                  placeholderTextColor={placeholderColor}
                  style={styles.input}
                  autoCapitalize="none"
                />
                <Text style={styles.helperText}>Comparte tu sitio web si lo tienes disponible.</Text>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Portafolio o redes (opcional)</Text>
                <TextInput
                  value={form.portfolio_url}
                  onChangeText={(value) => handleChange('portfolio_url', value)}
                  placeholder="https://instagram.com/tuestudio"
                  placeholderTextColor={placeholderColor}
                  style={styles.input}
                  autoCapitalize="none"
                />
                <Text style={styles.helperText}>Puedes dejar este campo en blanco si aún no tienes portafolio.</Text>
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
                const isExpired = Boolean(current?.is_expired);
                const statusLabel = current?.status_label ?? statusInfo?.label ?? 'En revisión';
                const statusTone = isExpired ? statusCopy.expired.tone : statusInfo?.tone ?? colors.warning;
                const docState = documentStates[doc.type];
                const fileName = extractFileName(current?.file_url);
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
                          <Ionicons name="ellipse" size={10} color={statusTone} />
                          <Text style={[styles.documentStatusText, { color: statusTone }]}>
                            {statusLabel}
                          </Text>
                        </View>
                      ) : null}
                      {current?.expires_at ? (
                        <View style={styles.documentMeta}>
                          <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                          <Text style={styles.documentMetaText}>
                            {isExpired
                              ? `Venció el ${new Date(current.expires_at).toLocaleDateString()}`
                              : `Vence el ${new Date(current.expires_at).toLocaleDateString()}`}
                          </Text>
                        </View>
                      ) : null}
                      {isExpired ? (
                        <Text style={styles.documentWarning}>Actualiza este documento para mantenerte activo.</Text>
                      ) : null}
                      {current?.file_url ? (
                        <TouchableOpacity
                          style={styles.documentFile}
                          onPress={() =>
                            Linking.openURL(current.file_url!)
                              .catch(() =>
                                setError('No pudimos abrir el documento. Intenta nuevamente.')
                              )
                          }
                          activeOpacity={0.85}
                        >
                          <Ionicons name="document-outline" size={16} color={colors.primary} />
                          <View style={styles.documentFileTexts}>
                            <Text style={styles.documentFileName} numberOfLines={1}>
                              {fileName ?? 'Documento actual'}
                            </Text>
                            <Text style={styles.documentFileHint}>Toca para abrir</Text>
                          </View>
                        </TouchableOpacity>
                      ) : null}
                      {docState?.status === 'uploading' ? (
                        <View style={styles.documentFeedbackRow}>
                          <ActivityIndicator size="small" color={colors.primary} />
                          <Text style={styles.documentFeedbackText}>{docState.message}</Text>
                        </View>
                      ) : null}
                      {docState?.status === 'success' ? (
                        <Text style={styles.documentFeedbackSuccess}>{docState.message}</Text>
                      ) : null}
                      {docState?.status === 'error' ? (
                        <Text style={styles.documentFeedbackError}>{docState.message}</Text>
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
        <Modal
          transparent
          animationType="fade"
          visible={droneSelectorVisible}
          onRequestClose={() => setDroneSelectorVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={() => setDroneSelectorVisible(false)}
            />
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Selecciona tu dron</Text>
              <Text style={styles.modalSubtitle}>
                Solo mostramos equipos certificados para las misiones de SkyTerra.
              </Text>
              <ScrollView
                style={styles.modalOptions}
                contentContainerStyle={styles.modalOptionsContent}
                showsVerticalScrollIndicator={false}
              >
                {DRONE_MODELS.map((model) => {
                  const selected = form.drone_model === model;
                  return (
                    <TouchableOpacity
                      key={model}
                      style={[styles.modalOption, selected && styles.modalOptionSelected]}
                      onPress={() => {
                        handleChange('drone_model', model);
                        setDroneSelectorVisible(false);
                      }}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.modalOptionLabel}>{model}</Text>
                      {selected ? (
                        <Ionicons name="checkmark" size={18} color={colors.primary} />
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setDroneSelectorVisible(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.modalCloseLabel}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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
    modalOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
      position: 'relative',
    },
    modalBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
    modalCard: {
      width: '100%',
      borderRadius: 24,
      padding: 20,
      gap: 16,
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      zIndex: 1,
    },
    modalTitle: {
      color: colors.heading,
      fontSize: 18,
      fontWeight: '700',
    },
    modalSubtitle: {
      color: colors.textSecondary,
      fontSize: 13,
    },
    modalOptions: {
      maxHeight: 320,
    },
    modalOptionsContent: {
      gap: 10,
    },
    modalOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.surface,
    },
    modalOptionSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    modalOptionLabel: {
      flex: 1,
      marginRight: 12,
      color: colors.textPrimary,
      fontWeight: '600',
    },
    modalCloseButton: {
      paddingVertical: 12,
      alignItems: 'center',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.surfaceMuted,
    },
    modalCloseLabel: {
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
      color: colors.textSecondary,
      textTransform: 'none',
      letterSpacing: 0.4,
      fontSize: 11,
      fontWeight: '500',
    },
    metaValue: {
      color: colors.heading,
      fontSize: 16,
      fontWeight: '600',
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
    selectInput: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    selectValue: {
      color: colors.textPrimary,
      fontWeight: '600',
    },
    selectPlaceholder: {
      color: colors.textMuted,
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
    documentWarning: {
      marginTop: 6,
      color: colors.warning,
      fontSize: 12,
      fontWeight: '600',
    },
    documentFile: {
      marginTop: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.surface,
    },
    documentFileTexts: {
      flex: 1,
      gap: 2,
    },
    documentFileName: {
      color: colors.textPrimary,
      fontWeight: '600',
    },
    documentFileHint: {
      color: colors.textMuted,
      fontSize: 12,
    },
    documentFeedbackRow: {
      marginTop: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    documentFeedbackText: {
      color: colors.textSecondary,
      fontSize: 13,
    },
    documentFeedbackSuccess: {
      marginTop: 8,
      color: colors.success,
      fontSize: 13,
      fontWeight: '600',
    },
    documentFeedbackError: {
      marginTop: 8,
      color: colors.danger,
      fontSize: 13,
      fontWeight: '600',
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
