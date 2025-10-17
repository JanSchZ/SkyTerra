import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import AuthLayout from '@components/AuthLayout';
import { RootStackParamList } from '@navigation/RootNavigator';
import { signUp } from '@services/apiClient';
import { useAuth } from '@context/AuthContext';
import { getErrorMessage } from '@utils/errorMessages';

type Props = NativeStackScreenProps<RootStackParamList, 'SignUp'>;

const SignUpScreen: React.FC<Props> = ({ navigation }) => {
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
            <Ionicons name="person-outline" size={18} color="#D1D5DB" />
            <TextInput
              style={styles.input}
              placeholder="Nombre"
              placeholderTextColor="rgba(148, 163, 184, 0.75)"
              value={firstName}
              onChangeText={setFirstName}
              editable={!loading}
            />
          </View>
        </View>
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Apellido</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="person-circle-outline" size={18} color="#D1D5DB" />
            <TextInput
              style={styles.input}
              placeholder="Apellido"
              placeholderTextColor="rgba(148, 163, 184, 0.75)"
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
          <Ionicons name="mail-outline" size={18} color="#D1D5DB" />
          <TextInput
            style={styles.input}
            placeholder="nombre@skyterra.cl"
            placeholderTextColor="rgba(148, 163, 184, 0.75)"
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
          <Ionicons name="lock-closed-outline" size={18} color="#D1D5DB" />
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="rgba(148, 163, 184, 0.75)"
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
          <Ionicons name="shield-checkmark-outline" size={18} color="#D1D5DB" />
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="rgba(148, 163, 184, 0.75)"
            secureTextEntry={!showConfirmPassword}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            editable={!loading}
          />
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {success ? <Text style={styles.success}>{success}</Text> : null}

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
        activeOpacity={0.9}
      >
        {loading ? <ActivityIndicator color="#111827" /> : <Text style={styles.buttonText}>Crear cuenta</Text>}
      </TouchableOpacity>

      <Text style={styles.terms}>
        Al crear una cuenta aceptas recibir comunicaciones operativas y cumplir las políticas de seguridad de vuelo de
        SkyTerra.
      </Text>
    </AuthLayout>
  );
};

const styles = StyleSheet.create({
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
    color: '#F3F4F6',
    fontWeight: '600',
  },
  toggleSecure: {
    color: '#E5E7EB',
    fontSize: 13,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    gap: 12,
  },
  input: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 16,
  },
  button: {
    marginTop: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 18,
    borderRadius: 22,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#111827',
    fontWeight: '700',
    fontSize: 16,
  },
  error: {
    color: '#F87171',
    textAlign: 'center',
  },
  success: {
    color: '#A7F3D0',
    textAlign: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    color: '#E5E7EB',
  },
  footerLink: {
    color: '#F9FAFB',
    fontWeight: '600',
  },
  terms: {
    marginTop: 4,
    color: '#D1D5DB',
    fontSize: 12,
    textAlign: 'center',
  },
});

export default SignUpScreen;
