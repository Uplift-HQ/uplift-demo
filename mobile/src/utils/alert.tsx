import React, { createContext, useContext, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Platform, Alert } from 'react-native';
import { colors, typography, spacing, borderRadius } from '../theme';

type AlertButton = {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

type AlertState = {
  visible: boolean;
  title: string;
  message?: string;
  buttons: AlertButton[];
};

type AlertContextType = {
  showAlert: (title: string, message?: string, buttons?: AlertButton[]) => void;
};

const AlertContext = createContext<AlertContextType>({
  showAlert: () => {},
});

export const useAlert = () => useContext(AlertContext);

// Global ref so showAlert can be called outside React components
let globalShowAlert: ((title: string, message?: string, buttons?: AlertButton[]) => void) | null = null;

export function showAlert(title: string, message?: string, buttons?: AlertButton[]) {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }
  if (globalShowAlert) {
    globalShowAlert(title, message, buttons);
  } else {
    // Fallback if provider not mounted yet
    window.alert(message ? `${title}\n\n${message}` : title);
  }
}

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [alert, setAlert] = useState<AlertState>({
    visible: false,
    title: '',
    message: undefined,
    buttons: [],
  });

  const handleShow = useCallback((title: string, message?: string, buttons?: AlertButton[]) => {
    setAlert({
      visible: true,
      title,
      message,
      buttons: buttons && buttons.length > 0 ? buttons : [{ text: 'OK' }],
    });
  }, []);

  // Register global ref
  React.useEffect(() => {
    globalShowAlert = handleShow;
    return () => { globalShowAlert = null; };
  }, [handleShow]);

  const dismiss = useCallback((button?: AlertButton) => {
    setAlert(prev => ({ ...prev, visible: false }));
    if (button?.onPress) {
      button.onPress();
    }
  }, []);

  const cancelBtn = alert.buttons.find(b => b.style === 'cancel');
  const actionBtns = alert.buttons.filter(b => b.style !== 'cancel');

  return (
    <AlertContext.Provider value={{ showAlert: handleShow }}>
      {children}
      <Modal
        visible={alert.visible}
        transparent
        animationType="fade"
        onRequestClose={() => dismiss(cancelBtn)}
      >
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.title}>{alert.title}</Text>
            {alert.message ? <Text style={styles.message}>{alert.message}</Text> : null}
            <View style={styles.buttonRow}>
              {cancelBtn && (
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => dismiss(cancelBtn)}
                >
                  <Text style={[styles.buttonText, styles.cancelText]}>{cancelBtn.text || 'Cancel'}</Text>
                </TouchableOpacity>
              )}
              {actionBtns.map((btn, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.button,
                    styles.actionButton,
                    btn.style === 'destructive' && styles.destructiveButton,
                  ]}
                  onPress={() => dismiss(btn)}
                >
                  <Text style={[
                    styles.buttonText,
                    styles.actionText,
                    btn.style === 'destructive' && styles.destructiveText,
                  ]}>
                    {btn.text || 'OK'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </AlertContext.Provider>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  dialog: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    ...typography.h3,
    color: colors.slate900,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    ...typography.body,
    color: colors.slate600,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.slate100,
  },
  actionButton: {
    backgroundColor: colors.momentum,
  },
  destructiveButton: {
    backgroundColor: '#FEE2E2',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  cancelText: {
    color: colors.slate600,
  },
  actionText: {
    color: colors.background,
  },
  destructiveText: {
    color: '#DC2626',
  },
});
