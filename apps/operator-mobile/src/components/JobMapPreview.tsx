import React, { useMemo } from 'react';
import { Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { OperatorJobLocation, OperatorJobTravelEstimate } from '@services/operatorJobs';
import { useTheme, ThemeColors } from '@theme';

interface JobMapPreviewProps {
  location?: OperatorJobLocation;
  travelEstimate?: OperatorJobTravelEstimate;
  fallbackDistanceKm?: number | null;
  fallbackDurationMinutes?: number | null;
}

const formatDistance = (value?: number | null) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '—';
  }
  if (value >= 100) {
    return `${value.toFixed(0)} km`;
  }
  if (value >= 10) {
    return `${value.toFixed(1)} km`;
  }
  return `${value.toFixed(2)} km`;
};

const formatDuration = (value?: number | null) => {
  if (typeof value !== 'number' || Number.isNaN(value) || value <= 0) {
    return '—';
  }
  if (value < 60) {
    return `${Math.max(1, Math.round(value))} min`;
  }
  const hours = Math.floor(value / 60);
  const minutes = Math.round(value % 60);
  if (minutes === 0) {
    return `${hours} h`;
  }
  return `${hours} h ${minutes} min`;
};

const JobMapPreview: React.FC<JobMapPreviewProps> = ({
  location,
  travelEstimate,
  fallbackDistanceKm,
  fallbackDurationMinutes,
}) => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const distance = travelEstimate?.distance_km ?? fallbackDistanceKm ?? null;
  const duration = travelEstimate?.duration_minutes ?? fallbackDurationMinutes ?? null;

  const formattedAddress = useMemo(() => {
    if (!location) return 'Dirección por confirmar';
    return (
      location.formatted_address ||
      [location.address_line, location.city, location.region].filter(Boolean).join(', ') ||
      'Dirección por confirmar'
    );
  }, [location]);

  const handleOpenMaps = () => {
    const query =
      location?.latitude && location?.longitude
        ? `${location.latitude},${location.longitude}`
        : formattedAddress;

    if (!query || query === 'Dirección por confirmar') {
      return;
    }

    const encoded = encodeURIComponent(query);
    const url = Platform.select({
      ios: `http://maps.apple.com/?q=${encoded}`,
      default: `https://www.google.com/maps/search/?api=1&query=${encoded}`,
    });

    if (url) {
      Linking.openURL(url).catch(() => {
        /* ignore */
      });
    }
  };

  const gradientColors = isDark
    ? ['rgba(15,23,42,0.85)', 'rgba(15,23,42,0.35)']
    : ['rgba(2,132,199,0.22)', 'rgba(2,132,199,0.08)'];

  return (
    <View style={styles.wrapper}>
      <LinearGradient colors={gradientColors} style={styles.gradient}>
        <View style={styles.mapMock}>
          <Ionicons
            name="navigate"
            size={54}
            color={isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.12)'}
          />
        </View>
      </LinearGradient>
      <View style={styles.overlay}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={styles.iconBadge}>
              <Ionicons name="location-outline" size={18} color={colors.primaryOn} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>Punto de vuelo</Text>
              <Text style={styles.subtitle}>{formattedAddress}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.openButton} onPress={handleOpenMaps}>
            <Ionicons name="open-outline" size={16} color={colors.primaryOn} />
            <Text style={styles.openLabel}>Ver en mapas</Text>
          </TouchableOpacity>
        </View>

        {location?.reference_point ? (
          <View style={styles.referenceBox}>
            <Ionicons name="flag-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.referenceText}>{location.reference_point}</Text>
          </View>
        ) : null}

        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Distancia</Text>
            <Text style={styles.metricValue}>{formatDistance(distance)}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Traslado estimado</Text>
            <Text style={styles.metricValue}>{formatDuration(duration)}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    wrapper: {
      borderRadius: 28,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    gradient: {
      height: 180,
      position: 'relative',
    },
    mapMock: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    overlay: {
      position: 'absolute',
      inset: 0,
      padding: 20,
      justifyContent: 'space-between',
      backgroundColor: 'transparent',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 16,
    },
    titleRow: {
      flexDirection: 'row',
      gap: 12,
      flex: 1,
    },
    iconBadge: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerText: {
      flex: 1,
      gap: 4,
    },
    title: {
      color: colors.textInverse,
      fontWeight: '700',
      fontSize: 16,
    },
    subtitle: {
      color: colors.textInverse,
      opacity: 0.85,
      fontSize: 14,
    },
    openButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: colors.primary,
    },
    openLabel: {
      color: colors.primaryOn,
      fontWeight: '600',
      fontSize: 13,
    },
    referenceBox: {
      marginTop: 18,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.surfaceMuted,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    referenceText: {
      color: colors.textSecondary,
      flex: 1,
      fontSize: 13,
    },
    metricsRow: {
      flexDirection: 'row',
      gap: 16,
      backgroundColor: colors.surface,
      borderRadius: 18,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    metric: {
      flex: 1,
      gap: 6,
    },
    metricLabel: {
      color: colors.textMuted,
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    metricValue: {
      color: colors.heading,
      fontWeight: '600',
      fontSize: 16,
    },
  });

export default JobMapPreview;
