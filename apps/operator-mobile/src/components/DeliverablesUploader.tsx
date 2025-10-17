import React, { useMemo, useState } from 'react';
import { Alert, Linking, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import {
  OperatorJobDeliverables,
  uploadJobDeliverables,
} from '@services/operatorJobs';
import { getErrorMessage } from '@utils/errorMessages';

interface DeliverablesUploaderProps {
  jobId: number;
  deliverables?: OperatorJobDeliverables;
  onUpload?: (result: OperatorJobDeliverables) => void;
}

const statusCopy: Record<OperatorJobDeliverables['status'], { label: string; description: string; tone: string }> = {
  pending: {
    label: 'Pendiente',
    description: 'Debes subir el material final para el cliente.',
    tone: '#FBBF24',
  },
  processing: {
    label: 'Procesando',
    description: 'Estamos revisando la entrega recibida.',
    tone: '#38BDF8',
  },
  submitted: {
    label: 'Enviado',
    description: 'Tu envío fue recibido y está en revisión.',
    tone: '#38BDF8',
  },
  approved: {
    label: 'Aprobado',
    description: '¡Excelente! El cliente aprobó el material.',
    tone: '#34D399',
  },
  rejected: {
    label: 'Rechazado',
    description: 'Revisa los comentarios del cliente y vuelve a subir el contenido.',
    tone: '#F87171',
  },
};

const DeliverablesUploader: React.FC<DeliverablesUploaderProps> = ({ jobId, deliverables, onUpload }) => {
  const [uploading, setUploading] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const statusInfo = useMemo(() => {
    if (deliverables) {
      return statusCopy[deliverables.status];
    }
    return statusCopy.pending;
  }, [deliverables]);

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
    <BlurView intensity={85} tint="dark" style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.iconBadge}>
          <Ionicons name="cloud-upload-outline" size={20} color="#0F172A" />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Entrega de contenido</Text>
          <Text style={styles.statusLabel}>
            Estado: <Text style={[styles.statusValue, { color: statusInfo.tone }]}>{statusInfo.label}</Text>
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
          placeholderTextColor="rgba(226,232,240,0.5)"
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
          <Ionicons name="arrow-up-circle-outline" size={18} color="#0F172A" />
          <Text style={styles.primaryLabel}>{uploading ? 'Subiendo…' : 'Subir archivo ZIP'}</Text>
        </TouchableOpacity>
        {deliverables?.download_url ? (
          <TouchableOpacity style={styles.secondary} onPress={handleOpenDownload}>
            <Ionicons name="download-outline" size={18} color="#E5E7EB" />
            <Text style={styles.secondaryLabel}>Descargar última entrega</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </BlurView>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    padding: 20,
    backgroundColor: 'rgba(15,17,23,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
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
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
  },
  statusLabel: {
    color: '#CBD5F5',
    fontSize: 13,
  },
  statusValue: {
    fontWeight: '700',
  },
  statusDescription: {
    color: '#CBD5F5',
    fontSize: 14,
  },
  meta: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
  },
  notesBox: {
    gap: 8,
  },
  notesLabel: {
    color: '#E2E8F0',
    fontWeight: '600',
  },
  notesInput: {
    minHeight: 80,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.35)',
    padding: 14,
    color: '#F8FAFC',
    fontSize: 14,
    backgroundColor: 'rgba(15,23,42,0.45)',
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
    backgroundColor: '#F8FAFC',
  },
  disabled: {
    opacity: 0.6,
  },
  primaryLabel: {
    color: '#0F172A',
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
    borderColor: 'rgba(148,163,184,0.45)',
    backgroundColor: 'transparent',
  },
  secondaryLabel: {
    color: '#E5E7EB',
    fontWeight: '600',
  },
  error: {
    color: '#F87171',
  },
  success: {
    color: '#34D399',
  },
});

export default DeliverablesUploader;
