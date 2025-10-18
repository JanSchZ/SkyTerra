import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OperatorJobRequirement } from '@services/operatorJobs';
import { useTheme, ThemeColors } from '@theme';

interface RequirementChecklistProps {
  requirements?: OperatorJobRequirement[];
  onToggle?: (requirement: OperatorJobRequirement, nextValue: boolean) => void;
  loadingId?: number | null;
}

const RequirementChecklist: React.FC<RequirementChecklistProps> = ({
  requirements,
  onToggle,
  loadingId,
}) => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  if (!requirements || requirements.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Ionicons name="checkmark-done-outline" size={20} color={colors.textSecondary} />
        <Text style={styles.emptyText}>No hay requisitos pendientes para este vuelo.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {requirements.map((requirement) => {
        const isComplete = Boolean(requirement.is_complete);
        const isLoading = loadingId === requirement.id;
        return (
          <View
            key={requirement.id}
            style={[styles.card, isComplete && styles.cardComplete]}
          >
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => onToggle?.(requirement, !isComplete)}
              disabled={isLoading}
            >
              <View style={[styles.checkboxInner, isComplete && styles.checkboxInnerActive]}>
                {isComplete ? <Ionicons name="checkmark" size={16} color={colors.textInverse} /> : null}
              </View>
            </TouchableOpacity>
            <View style={styles.texts}>
              <Text style={styles.title}>{requirement.title}</Text>
              {requirement.description ? (
                <Text style={styles.description}>{requirement.description}</Text>
              ) : null}
              {requirement.completed_at ? (
                <Text style={styles.meta}>Marcado el {new Date(requirement.completed_at).toLocaleString()}</Text>
              ) : null}
            </View>
            {isLoading ? <Ionicons name="reload-outline" size={18} color={colors.textSecondary} /> : null}
          </View>
        );
      })}
    </View>
  );
};

const createStyles = (colors: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    container: {
      gap: 12,
    },
    card: {
      borderRadius: 22,
      padding: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 14,
    },
    cardComplete: {
      borderColor: isDark ? 'rgba(34,197,94,0.55)' : 'rgba(34,197,94,0.45)',
      backgroundColor: isDark ? 'rgba(34,197,94,0.22)' : 'rgba(34,197,94,0.12)',
    },
    checkbox: {
      paddingTop: 2,
    },
    checkboxInner: {
      width: 24,
      height: 24,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: colors.cardBorderStrong,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'transparent',
    },
    checkboxInnerActive: {
      backgroundColor: colors.success,
      borderColor: colors.success,
    },
    texts: {
      flex: 1,
      gap: 4,
    },
    title: {
      color: colors.textPrimary,
      fontWeight: '600',
      fontSize: 15,
    },
    description: {
      color: colors.textSecondary,
      fontSize: 13,
      lineHeight: 18,
    },
    meta: {
      color: colors.textMuted,
      fontSize: 12,
      marginTop: 6,
    },
    emptyCard: {
      borderRadius: 22,
      padding: 18,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    emptyText: {
      color: colors.textSecondary,
      flex: 1,
    },
  });

export default RequirementChecklist;
