import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '@context/AuthContext';
import AuthLayout from '@components/AuthLayout';
import { RootStackParamList } from '@navigation/RootNavigator';
import { getErrorMessage } from '@utils/errorMessages';

type Props = NativeStackScreenProps<RootStackParamList, 'SignIn'>;

const SignInScreen: React.FC<Props> = ({ navigation, route }) => {
  const { signInWithCredentials, loading } = useAuth();
  const [email, setEmail] = useState(route?.params?.email ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

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
          <Ionicons name="mail-outline" size={18} color="#D1D5DB" />
          <TextInput
            style={styles.input}
            placeholder="nombre@skyterra.cl"
            placeholderTextColor="rgba(148, 163, 184, 0.75)"
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
          <Ionicons name="lock-closed-outline" size={18} color="#D1D5DB" />
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="rgba(148, 163, 184, 0.75)"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            editable={!isDisabled}
          />
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.button, isDisabled && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={isDisabled}
        activeOpacity={0.9}
      >
        {loading ? <ActivityIndicator color="#111827" /> : <Text style={styles.buttonText}>Iniciar sesión</Text>}
      </TouchableOpacity>
    </AuthLayout>
  );
};

const styles = StyleSheet.create({
  fieldGroup: {
    gap: 8,
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
    textAlign: 'center',
  },
});

export default SignInScreen;
