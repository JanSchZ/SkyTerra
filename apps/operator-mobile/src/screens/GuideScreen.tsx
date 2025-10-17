import React, { useMemo } from 'react';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { guides, GuideId } from '@content/guides';
import { useTheme, ThemeColors } from '@theme';
import { RootStackParamList } from '@navigation/RootNavigator';

type GuideRoute = RouteProp<RootStackParamList, 'Guide'>;
type GuideNav = NativeStackNavigationProp<RootStackParamList, 'Guide'>;

const GuideScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<GuideNav>();
  const route = useRoute<GuideRoute>();
  const data = guides[(route.params?.guideId as GuideId) || 'preflight'];
  const backgroundGradient = useMemo(
    () => (isDark ? ['#050608', '#0b0d11'] : [colors.background, colors.backgroundAlt]),
    [colors.background, colors.backgroundAlt, isDark]
  );

  return (
    <LinearGradient colors={backgroundGradient} style={styles.gradient}>
      <StatusBar style={colors.statusBarStyle} backgroundColor={backgroundGradient[0]} />
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content}>
          <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={18} color={colors.primary} />
            <Text style={styles.backLabel}>Volver</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>{data.title}</Text>
            {data.description ? <Text style={styles.subtitle}>{data.description}</Text> : null}
          </View>

          {data.sections.map((section, idx) => (
            <View key={`${section.title}-${idx}`} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.body ? <Text style={styles.body}>{section.body}</Text> : null}
              {section.bullets?.map((b, i) => (
                <View key={i} style={styles.bulletRow}>
                  <View style={styles.dot} />
                  <Text style={styles.bullet}>{b}</Text>
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

export default GuideScreen;

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    gradient: { flex: 1 },
    safe: { flex: 1, backgroundColor: colors.background },
    content: { padding: 20, gap: 16, paddingBottom: 120 },
    back: { flexDirection: 'row', gap: 6, alignItems: 'center' },
    backLabel: { color: colors.primary, fontWeight: '700' },
    header: { gap: 8, marginTop: 4 },
    title: { color: colors.heading, fontSize: 24, fontWeight: '800' },
    subtitle: { color: colors.textSecondary },
    section: {
      borderRadius: 18,
      padding: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      gap: 8,
    },
    sectionTitle: { color: colors.textPrimary, fontWeight: '700', fontSize: 16 },
    body: { color: colors.textSecondary, lineHeight: 20 },
    bulletRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.textSecondary, marginTop: 8 },
    bullet: { color: colors.textPrimary, flex: 1, lineHeight: 20 },
  });

