import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeColors } from '@theme';

interface GuidedTourOverlayProps {
  visible: boolean;
  onFinish: () => void;
}

interface TourStep {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const steps: TourStep[] = [
  {
    title: 'Disponibilidad',
    description: 'Activa o pausa tu perfil para recibir nuevas ofertas cerca de ti.',
    icon: 'flash-outline',
  },
  {
    title: 'Indicadores',
    description: 'Consulta tus ofertas, trabajos completados y calificación en tiempo real.',
    icon: 'stats-chart-outline',
  },
  {
    title: 'Ofertas',
    description: 'Explora y acepta ofertas desde el carrusel o visita la pestaña de Ofertas.',
    icon: 'briefcase-outline',
  },
  {
    title: 'Perfil y documentos',
    description: 'Mantén tu información y certificados al día para no perder disponibilidad.',
    icon: 'person-circle-outline',
  },
];

const GuidedTourOverlay: React.FC<GuidedTourOverlayProps> = ({ visible, onFinish }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [index, setIndex] = useState(0);
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const cardProgress = useRef(new Animated.Value(0)).current;

  const animateCard = useCallback(() => {
    cardProgress.setValue(0);
    Animated.timing(cardProgress, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [cardProgress]);

  useEffect(() => {
    if (visible) {
      overlayOpacity.setValue(0);
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }).start();
      animateCard();
    } else {
      overlayOpacity.setValue(0);
      setIndex(0);
    }
  }, [visible, overlayOpacity, animateCard]);

  useEffect(() => {
    if (visible) {
      animateCard();
    }
  }, [index, visible, animateCard]);

  if (!visible) return null;

  const step = steps[index];
  const isLast = index === steps.length - 1;

  const handleNext = () => {
    if (isLast) {
      onFinish();
    } else {
      setIndex((prev) => prev + 1);
    }
  };

  const translateY = cardProgress.interpolate({ inputRange: [0, 1], outputRange: [24, 0] });
  const cardOpacity = cardProgress;

  return (
    <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
      <Animated.View style={[styles.tourCard, { opacity: cardOpacity, transform: [{ translateY }] }]}>
        <View style={styles.iconBadge}>
          <Ionicons name={step.icon} size={24} color={colors.primaryOn} />
        </View>
        <Text style={styles.tourTitle}>{step.title}</Text>
        <Text style={styles.tourDescription}>{step.description}</Text>
        <View style={styles.tourFooter}>
          <View style={styles.dots}>
            {steps.map((_, i) => (
              <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
            ))}
          </View>
          <TouchableOpacity style={styles.primaryButton} onPress={handleNext} activeOpacity={0.85}>
            <Text style={styles.primaryLabel}>{isLast ? '¡Manos a la obra!' : 'Siguiente'}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.skip} onPress={onFinish}>
          <Ionicons name="close-outline" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};

export default GuidedTourOverlay;

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    tourCard: {
      width: '100%',
      maxWidth: 360,
      borderRadius: 24,
      padding: 24,
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      gap: 12,
      shadowColor: colors.cardShadow,
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.25,
      shadowRadius: 28,
      elevation: 12,
    },
    iconBadge: {
      width: 48,
      height: 48,
      borderRadius: 16,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'flex-start',
    },
    tourTitle: {
      color: colors.heading,
      fontSize: 20,
      fontWeight: '700',
    },
    tourDescription: {
      color: colors.textSecondary,
      lineHeight: 20,
    },
    tourFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 12,
    },
    dots: {
      flexDirection: 'row',
      gap: 6,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.cardBorder,
    },
    dotActive: {
      backgroundColor: colors.primary,
    },
    primaryButton: {
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 14,
      backgroundColor: colors.primary,
    },
    primaryLabel: {
      color: colors.primaryOn,
      fontWeight: '700',
    },
    skip: {
      position: 'absolute',
      top: 16,
      right: 16,
    },
  });
