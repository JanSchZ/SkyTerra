import React, { useMemo, useState } from 'react';
import { Alert, Linking, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import {
  OperatorJobDeliverables,
  uploadJobDeliverables,
} from '@services/operatorJobs';
import { getErrorMessage } from '@utils/errorMessages';
import { useTheme, ThemeColors } from '@theme';

interface DeliverablesUploaderProps {
  jobId: number;
  deliverables?: OperatorJobDeliverables;
  onUpload?: (result: OperatorJobDeliverables) => void;
}

const statusCopy: Record<OperatorJobDeliverables['status'], { label: string; description: string }> = {
  pending: {
    label: 'Pendiente',
    description: 'Debes subir el material final para el cliente.',
  },
  processing: {
    label: 'Procesando',
    description: 'Estamos revisando la entrega recibida.',
  },
  submitted: {
    label: 'Enviado',
    description: 'Tu envío fue recibido y está en revisión.',
  },
  approved: {
    label: 'Aprobado',
    description: '¡Excelente! El cliente aprobó el material.',
  },
  rejected: {
    label: 'Rechazado',
    description: 'Revisa los comentarios del cliente y vuelve a subir el contenido.',
  },
};

const DeliverablesUploader: React.FC<DeliverablesUploaderProps> = ({ jobId, deliverables, onUpload }) => {
  const [uploading, setUploading] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const statusInfo = useMemo(() => {
    if (deliverables) {
      return statusCopy[deliverables.status];
    }
    return statusCopy.pending;
  }, [deliverables]);

  const statusTone = useMemo(() => {
    switch (deliverables?.status) {
      case 'approved':
        return colors.success;
      case 'processing':
      case 'submitted':
        return colors.primary;
      case 'rejected':
        return colors.danger;
      case 'pending':
      default:
        return colors.warning;
    }
  }, [colors, deliverables?.status]);

  const placeholderColor = isDark ? 'rgba(226,232,240,0.5)' : 'rgba(100,116,139,0.6)';

  const handleUpload = async () => {
    setError(null);
    setSuccess(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/zip',
          'application/x-zip-compressed',
          'application/x-7z-compressed',
          'application/octet-stream',
          'application/x-tar',
          'application/gzip',
        ],
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.type !== 'success' || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      if (!asset.name?.toLowerCase().endsWith('.zip') && !asset.name?.toLowerCase().endsWith('.tar')) {
        const confirm = await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Formato no estándar',
            'Idealmente sube un archivo .zip con fotos y videos. ¿Deseas subir este archivo de todas formas?',
            [
              { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Subir', onPress: () => resolve(true) },
            ]
          );
        });
        if (!confirm) {
          return;
        }
      }

      setUploading(true);
      const payloadNotes = notes.trim().length > 0 ? notes.trim() : undefined;
      const response = await uploadJobDeliverables(jobId, {
        uri: asset.uri,
        name: asset.name ?? `entrega-${jobId}.zip`,
        mimeType: asset.mimeType ?? 'application/zip',
        notes: payloadNotes,
      });

      setNotes('');
      setSuccess('Entrega subida correctamente.');
      onUpload?.(response);
    } catch (err) {
      const message = getErrorMessage(err, 'No pudimos subir el archivo. Intenta nuevamente.');
      setError(message);
    } finally {
      setUploading(false);
    }
  };

  const handleOpenDownload = () => {
    if (deliverables?.download_url) {
      Linking.openURL(deliverables.download_url).catch(() => {
        setError('No pudimos abrir el enlace de descarga.');
      });
    }
  };

  const lastUploadLabel = deliverables?.last_uploaded_at
    ? new Date(deliverables.last_uploaded_at).toLocaleString()
    : null;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.iconBadge}>
          <Ionicons name="cloud-upload-outline" size={20} color={colors.primaryOn} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Entrega de contenido</Text>
          <Text style={styles.statusLabel}>
            Estado: <Text style={[styles.statusValue, { color: statusTone }]}>{statusInfo.label}</Text>
          </Text>
          <Text style={styles.statusDescription}>{statusInfo.description}</Text>
          {lastUploadLabel ? <Text style={styles.meta}>Última carga: {lastUploadLabel}</Text> : null}
        </View>
      </View>

      <View style={styles.notesBox}>
        <Text style={styles.notesLabel}>Notas para operaciones</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="Ej: incluye fotos del panel sur y panorámicas en 4K"
          placeholderTextColor={placeholderColor}
          multiline
          value={notes}
          onChangeText={setNotes}
          editable={!uploading}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {success ? <Text style={styles.success}>{success}</Text> : null}

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.primary, uploading && styles.disabled]}
          onPress={handleUpload}
          disabled={uploading}
        >
          <Ionicons name="arrow-up-circle-outline" size={18} color={colors.primaryOn} />
          <Text style={styles.primaryLabel}>{uploading ? 'Subiendo…' : 'Subir archivo ZIP'}</Text>
        </TouchableOpacity>
        {deliverables?.download_url ? (
          <TouchableOpacity style={styles.secondary} onPress={handleOpenDownload}>
            <Ionicons name="download-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.secondaryLabel}>Descargar última entrega</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      borderRadius: 28,
      padding: 20,
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      gap: 18,
    },
    headerRow: {
      flexDirection: 'row',
      gap: 14,
    },
    iconBadge: {
      width: 42,
      height: 42,
      borderRadius: 16,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerText: {
      flex: 1,
      gap: 4,
    },
    title: {
      color: colors.heading,
      fontSize: 18,
      fontWeight: '700',
    },
    statusLabel: {
      color: colors.textSecondary,
      fontSize: 13,
    },
    statusValue: {
      fontWeight: '700',
    },
    statusDescription: {
      color: colors.textSecondary,
      fontSize: 14,
    },
    meta: {
      color: colors.textMuted,
      fontSize: 12,
      marginTop: 4,
    },
    notesBox: {
      gap: 8,
    },
    notesLabel: {
      color: colors.textPrimary,
      fontWeight: '600',
    },
    notesInput: {
      minHeight: 80,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: 14,
      color: colors.textPrimary,
      fontSize: 14,
      backgroundColor: colors.surfaceMuted,
    },
    actions: {
      gap: 12,
    },
    primary: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderRadius: 18,
      paddingVertical: 16,
      backgroundColor: colors.primary,
    },
    disabled: {
      opacity: 0.6,
    },
    primaryLabel: {
      color: colors.primaryOn,
      fontWeight: '700',
    },
    secondary: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderRadius: 18,
      paddingVertical: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.surfaceMuted,
    },
    secondaryLabel: {
      color: colors.textPrimary,
      fontWeight: '600',
    },
    error: {
      color: colors.danger,
    },
    success: {
      color: colors.success,
    },
  });

export default DeliverablesUploader;
