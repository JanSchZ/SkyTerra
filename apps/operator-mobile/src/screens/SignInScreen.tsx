import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '@context/AuthContext';
import AuthLayout from '@components/AuthLayout';
import { RootStackParamList } from '@navigation/RootNavigator';
import { getErrorMessage } from '@utils/errorMessages';
import { useTheme, ThemeColors } from '@theme';

type Props = NativeStackScreenProps<RootStackParamList, 'SignIn'>;

const SignInScreen: React.FC<Props> = ({ navigation, route }) => {
  const { signInWithCredentials, loading } = useAuth();
  const [email, setEmail] = useState(route?.params?.email ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const placeholderColor = isDark ? 'rgba(148,163,184,0.75)' : 'rgba(71,85,105,0.6)';
  const iconColor = isDark ? 'rgba(226,232,240,0.85)' : colors.textMuted;

  useEffect(() => {
    if (route?.params?.email) {
      setEmail(route.params.email);
    }
  }, [route?.params?.email]);

  const isDisabled = useMemo(() => loading, [loading]);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Completa tu correo y contraseña.');
      return;
    }
    setError(null);
    try {
      await signInWithCredentials({ email: email.trim(), password });
    } catch (err) {
      console.warn('Fallo al iniciar sesión', err);
      const message = getErrorMessage(err, 'No pudimos iniciar sesión. Verifica tus credenciales o intenta nuevamente.');
      setError(message);
    }
  };

  return (
    <AuthLayout
      title="Bienvenido de vuelta"
      subtitle="Accede al hub de operadores de SkyTerra"
      footer={
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>¿Aún no tienes cuenta?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
            <Text style={styles.footerLink}>Crear una cuenta</Text>
          </TouchableOpacity>
        </View>
      }
    >
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Correo electrónico</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="mail-outline" size={18} color={iconColor} />
          <TextInput
            style={styles.input}
            placeholder="nombre@skyterra.cl"
            placeholderTextColor={placeholderColor}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            editable={!isDisabled}
          />
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>Contraseña</Text>
          <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)}>
            <Text style={styles.toggleSecure}>{showPassword ? 'Ocultar' : 'Mostrar'}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.inputWrapper}>
          <Ionicons name="lock-closed-outline" size={18} color={iconColor} />
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={placeholderColor}
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            editable={!isDisabled}
          />
        </View>
      </View>

      {error
        ? error.split(' | ').map((msg, index) => (
            <Text key={`${msg}-${index}`} style={styles.error}>
              {msg}
            </Text>
          ))
        : null}

      <TouchableOpacity
        style={[styles.button, isDisabled && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={isDisabled}
        activeOpacity={0.9}
      >
        {loading ? <ActivityIndicator color={colors.primaryOn} /> : <Text style={styles.buttonText}>Iniciar sesión</Text>}
      </TouchableOpacity>
    </AuthLayout>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    fieldGroup: {
      gap: 8,
    },
    labelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    label: {
      color: colors.textPrimary,
      fontWeight: '600',
    },
    toggleSecure: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '600',
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceMuted,
      borderRadius: 18,
      paddingHorizontal: 18,
      paddingVertical: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      gap: 12,
    },
    input: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: 16,
    },
    button: {
      backgroundColor: colors.primary,
      paddingVertical: 18,
      borderRadius: 22,
      alignItems: 'center',
      shadowColor: colors.cardShadow,
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.18,
      shadowRadius: 26,
      elevation: 6,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      color: colors.primaryOn,
      fontWeight: '700',
      fontSize: 16,
    },
    error: {
      color: colors.danger,
      textAlign: 'center',
    },
    footerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    footerText: {
      color: colors.textSecondary,
    },
    footerLink: {
      color: colors.primary,
      fontWeight: '600',
      textAlign: 'center',
    },
  });

export default SignInScreen;
