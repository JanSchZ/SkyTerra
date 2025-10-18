import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import AuthLayout from '@components/AuthLayout';
import { RootStackParamList } from '@navigation/RootNavigator';
import { signUp } from '@services/apiClient';
import { useAuth } from '@context/AuthContext';
import { getErrorMessage } from '@utils/errorMessages';
import { useTheme, ThemeColors } from '@theme';

type Props = NativeStackScreenProps<RootStackParamList, 'SignUp'>;

const SignUpScreen: React.FC<Props> = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const placeholderColor = isDark ? 'rgba(148,163,184,0.75)' : 'rgba(71,85,105,0.6)';
  const iconColor = isDark ? 'rgba(226,232,240,0.85)' : colors.textMuted;
  const { signInWithCredentials } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async () => {
    const trimmedEmail = email.trim();
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();

    if (!trimmedEmail || !password || !confirmPassword) {
      setError('Completa correo y contraseñas.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await signUp({
        email: trimmedEmail,
        username: trimmedEmail,
        password1: password,
        password2: confirmPassword,
        first_name: trimmedFirst || undefined,
        last_name: trimmedLast || undefined,
      });

      if (result.tokens) {
        try {
          await signInWithCredentials({ email: trimmedEmail, password });
          return;
        } catch (authError) {
          console.warn('Auto-login tras registro falló', authError);
        }
      }

      const message =
        result.detail ??
        (result.requiresVerification
          ? 'Revisa tu correo para confirmar tu cuenta.'
          : 'Cuenta creada con éxito. Inicia sesión para continuar.');

      setSuccess(message);
      setTimeout(() => navigation.replace('SignIn', { email: trimmedEmail }), 1200);
    } catch (err) {
      console.warn('Fallo al registrar operador', err);
      const message = getErrorMessage(err, 'No pudimos crear la cuenta. Intenta nuevamente.');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Crea tu cuenta"
      subtitle="Ingresa al programa de operadores SkyTerra"
      footer={
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>¿Ya tienes cuenta?</Text>
          <TouchableOpacity onPress={() => navigation.replace('SignIn')}>
            <Text style={styles.footerLink}>Inicia sesión</Text>
          </TouchableOpacity>
        </View>
      }
    >
      <View style={styles.doubleField}>
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Nombre</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="person-outline" size={18} color={iconColor} />
            <TextInput
              style={styles.input}
              placeholder="Nombre"
              placeholderTextColor={placeholderColor}
              value={firstName}
              onChangeText={setFirstName}
              editable={!loading}
            />
          </View>
        </View>
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Apellido</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="person-circle-outline" size={18} color={iconColor} />
            <TextInput
              style={styles.input}
              placeholder="Apellido"
              placeholderTextColor={placeholderColor}
              value={lastName}
              onChangeText={setLastName}
              editable={!loading}
            />
          </View>
        </View>
      </View>

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
            editable={!loading}
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
            editable={!loading}
          />
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>Confirmar contraseña</Text>
          <TouchableOpacity onPress={() => setShowConfirmPassword((prev) => !prev)}>
            <Text style={styles.toggleSecure}>{showConfirmPassword ? 'Ocultar' : 'Mostrar'}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.inputWrapper}>
          <Ionicons name="shield-checkmark-outline" size={18} color={iconColor} />
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={placeholderColor}
            secureTextEntry={!showConfirmPassword}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            editable={!loading}
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
      {success ? <Text style={styles.success}>{success}</Text> : null}

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
        activeOpacity={0.9}
      >
        {loading ? <ActivityIndicator color={colors.primaryOn} /> : <Text style={styles.buttonText}>Crear cuenta</Text>}
      </TouchableOpacity>

      <Text style={styles.terms}>
        Al crear una cuenta aceptas recibir comunicaciones operativas y cumplir las políticas de seguridad de vuelo de
        SkyTerra.
      </Text>
    </AuthLayout>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    fieldGroup: {
      gap: 8,
      flex: 1,
      minWidth: '48%',
    },
    doubleField: {
      flexDirection: 'row',
      gap: 12,
      flexWrap: 'wrap',
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
      marginTop: 8,
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
    success: {
      color: colors.success,
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
    },
    terms: {
      marginTop: 4,
      color: colors.textMuted,
      fontSize: 12,
      textAlign: 'center',
    },
  });

export default SignUpScreen;
