import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { OperatorJobRequirement } from '@services/operatorJobs';

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
  if (!requirements || requirements.length === 0) {
    return (
      <BlurView intensity={80} tint="dark" style={styles.emptyCard}>
        <Ionicons name="checkmark-done-outline" size={20} color="#E5E7EB" />
        <Text style={styles.emptyText}>No hay requisitos pendientes para este vuelo.</Text>
      </BlurView>
    );
  }

  return (
    <View style={styles.container}>
      {requirements.map((requirement) => {
        const isComplete = Boolean(requirement.is_complete);
        const isLoading = loadingId === requirement.id;
        return (
          <BlurView
            key={requirement.id}
            intensity={90}
            tint="dark"
            style={[styles.card, isComplete && styles.cardComplete]}
          >
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => onToggle?.(requirement, !isComplete)}
              disabled={isLoading}
            >
              <View style={[styles.checkboxInner, isComplete && styles.checkboxInnerActive]}>
                {isComplete ? <Ionicons name="checkmark" size={16} color="#0F172A" /> : null}
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
            {isLoading ? <Ionicons name="reload-outline" size={18} color="#F8FAFC" /> : null}
          </BlurView>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  card: {
    borderRadius: 22,
    padding: 18,
    backgroundColor: 'rgba(15,17,23,0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  cardComplete: {
    borderColor: 'rgba(134,239,172,0.35)',
    backgroundColor: 'rgba(22,101,52,0.25)',
  },
  checkbox: {
    paddingTop: 2,
  },
  checkboxInner: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(248,250,252,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  checkboxInnerActive: {
    backgroundColor: '#BBF7D0',
    borderColor: '#22C55E',
  },
  texts: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: '#F8FAFC',
    fontWeight: '600',
    fontSize: 15,
  },
  description: {
    color: '#CBD5F5',
    fontSize: 13,
    lineHeight: 18,
  },
  meta: {
    color: '#A5B4FC',
    fontSize: 12,
    marginTop: 6,
  },
  emptyCard: {
    borderRadius: 22,
    padding: 18,
    backgroundColor: 'rgba(15,17,23,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  emptyText: {
    color: '#E5E7EB',
    flex: 1,
  },
});

export default RequirementChecklist;
