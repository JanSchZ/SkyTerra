import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useToast } from '@context/ToastContext';
import Toast from './Toast';

export const ToastContainer: React.FC = () => {
  const { toasts, hideToast } = useToast();

  return (
    <View style={styles.container}>
      {toasts.map((toast, index) => (
        <View
          key={toast.id}
          style={[
            styles.toastWrapper,
            { top: 60 + index * 60 }, // Stack toasts with offset
          ]}
        >
          <Toast
            visible={true}
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onHide={() => hideToast(toast.id)}
          />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 10,
  },
  toastWrapper: {
    position: 'absolute',
    left: 20,
    right: 20,
  },
});

export default ToastContainer;
