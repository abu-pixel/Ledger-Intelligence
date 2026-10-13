import React, { useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useColors } from '@/hooks/useColors';
import { addDaysToDate, useFinance } from '@/contexts/FinanceContext';
import { PrimaryButton } from '@/components/FinanceUI';
import { getCurrencySymbol, parseLocalizedAmount } from '@/lib/localization';

const EXPENSE_CATEGORIES = ['Supplies', 'Rent', 'Software', 'Travel', 'Payroll', 'Other'];

function SheetFrame({
  visible,
  title,
  caption,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  caption: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          <View style={styles.sheetTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>{title}</Text>
              <Text style={[styles.sheetCaption, { color: colors.mutedForeground }]}>{caption}</Text>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={({ pressed }) => [styles.closeButton, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Feather name="x" size={21} color={colors.foreground} />
            </Pressable>
          </View>
          <KeyboardAwareScrollViewCompat
            style={{ flex: 1 }}
            contentContainerStyle={styles.formContent}
            keyboardShouldPersistTaps="handled"
            bottomOffset={28}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </KeyboardAwareScrollViewCompat>
        </View>
      </View>
    </Modal>
  );
}

export function ExpenseComposer({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const colors = useColors();
  const { addTransaction, state } = useFinance();
  const [vendor, setVendor] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [receiptUri, setReceiptUri] = useState<string | undefined>();
  const [error, setError] = useState('');

  function resetAndClose() {
    setVendor('');
    setAmount('');
    setCategory(EXPENSE_CATEGORIES[0]);
    setReceiptUri(undefined);
    setError('');
    onClose();
  }

  async function captureReceipt() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      const settingsAction =
        Platform.OS !== 'web'
          ? [{ text: 'Open Settings', onPress: () => void Linking.openSettings().catch(() => undefined) }]
          : [];
      Alert.alert(
        'Camera access needed',
        'Allow camera access in Settings, or attach a photo from your library instead.',
        [{ text: 'Not now', style: 'cancel' }, ...settingsAction],
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.75,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) setReceiptUri(result.assets[0].uri);
  }

  async function chooseReceipt() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.75,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) setReceiptUri(result.assets[0].uri);
  }

  function saveExpense() {
    const parsedAmount = parseLocalizedAmount(amount, state.countryCode);
    if (!vendor.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Enter a description and an amount greater than zero.');
      return;
    }
    addTransaction({
      title: vendor.trim(),
      category,
      amount: parsedAmount,
      kind: 'expense',
      receiptUri,
    });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    resetAndClose();
  }

  return (
    <SheetFrame
      visible={visible}
      title="Add an expense"
      caption="Record a payment and attach its receipt."
      onClose={resetAndClose}
    >
      <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Description</Text>
      <TextInput
        value={vendor}
        onChangeText={setVendor}
        placeholder="e.g. Studio supplies"
        placeholderTextColor={colors.mutedForeground}
        style={[styles.input, { backgroundColor: colors.card, borderColor: colors.input, color: colors.foreground }]}
        returnKeyType="next"
        testID="expense-description"
      />

      <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Amount</Text>
      <View style={[styles.amountInputRow, { backgroundColor: colors.card, borderColor: colors.input }]}>
        <Text style={[styles.currencyPrefix, { color: colors.mutedForeground }]}>
          {getCurrencySymbol(state.currencyCode, state.countryCode)}
        </Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="decimal-pad"
          style={[styles.amountInput, { color: colors.foreground }]}
          testID="expense-amount"
        />
      </View>

      <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Category</Text>
      <View style={styles.choiceWrap}>
        {EXPENSE_CATEGORIES.map((item) => {
          const selected = category === item;
          return (
            <Pressable
              key={item}
              onPress={() => setCategory(item)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[
                styles.choice,
                {
                  backgroundColor: selected ? colors.primary : colors.card,
                  borderColor: selected ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={{ color: selected ? colors.primaryForeground : colors.foreground, fontSize: 12, fontWeight: '600' }}>
                {item}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Receipt photo</Text>
      {receiptUri ? (
        <View style={styles.receiptPreview}>
          <Image source={{ uri: receiptUri }} style={styles.receiptImage} />
          <Pressable onPress={() => setReceiptUri(undefined)} style={styles.removeReceipt} accessibilityLabel="Remove receipt">
            <Feather name="x" size={16} color="#FFFFFF" />
          </Pressable>
        </View>
      ) : (
        <View style={styles.receiptActions}>
          {Platform.OS !== 'web' ? (
            <Pressable
              onPress={() => void captureReceipt()}
              style={[styles.receiptButton, { backgroundColor: colors.card, borderColor: colors.border }]}
              accessibilityRole="button"
              testID="receipt-camera"
            >
              <Feather name="camera" size={18} color={colors.primary} />
              <Text style={[styles.receiptButtonText, { color: colors.foreground }]}>Take photo</Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => void chooseReceipt()}
            style={[styles.receiptButton, { backgroundColor: colors.card, borderColor: colors.border }]}
            accessibilityRole="button"
            testID="receipt-library"
          >
            <Feather name="image" size={18} color={colors.primary} />
            <Text style={[styles.receiptButtonText, { color: colors.foreground }]}>Choose photo</Text>
          </Pressable>
        </View>
      )}
      <Text style={[styles.hint, { color: colors.mutedForeground }]}>
        Photos are kept on this device. Receipt text is not scanned in this version.
      </Text>
      {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
      <PrimaryButton title="Save expense" icon="check" onPress={saveExpense} testID="save-expense" />
    </SheetFrame>
  );
}

export function InvoiceComposer({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const colors = useColors();
  const { addInvoice, state } = useFinance();
  const [client, setClient] = useState('');
  const [amount, setAmount] = useState('');
  const [dueInDays, setDueInDays] = useState('14');
  const [error, setError] = useState('');

  function resetAndClose() {
    setClient('');
    setAmount('');
    setDueInDays('14');
    setError('');
    onClose();
  }

  function saveInvoice() {
    const parsedAmount = parseLocalizedAmount(amount, state.countryCode);
    const days = Number(dueInDays);
    if (!client.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Enter a client name and an amount greater than zero.');
      return;
    }
    if (!Number.isInteger(days) || days < 0 || days > 365) {
      setError('Choose a due date from today through 365 days from now.');
      return;
    }
    addInvoice({
      client: client.trim(),
      amount: parsedAmount,
      dueDate: addDaysToDate(days),
    });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    resetAndClose();
  }

  return (
    <SheetFrame
      visible={visible}
      title="Create an invoice"
      caption="Track an amount due from a client."
      onClose={resetAndClose}
    >
      <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Client</Text>
      <TextInput
        value={client}
        onChangeText={setClient}
        placeholder="Business or customer name"
        placeholderTextColor={colors.mutedForeground}
        style={[styles.input, { backgroundColor: colors.card, borderColor: colors.input, color: colors.foreground }]}
        testID="invoice-client"
      />

      <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Amount due</Text>
      <View style={[styles.amountInputRow, { backgroundColor: colors.card, borderColor: colors.input }]}>
        <Text style={[styles.currencyPrefix, { color: colors.mutedForeground }]}>
          {getCurrencySymbol(state.currencyCode, state.countryCode)}
        </Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="decimal-pad"
          style={[styles.amountInput, { color: colors.foreground }]}
          testID="invoice-amount"
        />
      </View>

      <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Due in (days)</Text>
      <TextInput
        value={dueInDays}
        onChangeText={setDueInDays}
        keyboardType="number-pad"
        style={[styles.input, { backgroundColor: colors.card, borderColor: colors.input, color: colors.foreground }]}
        testID="invoice-due-days"
      />
      {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
      <PrimaryButton title="Save invoice" icon="file-plus" onPress={saveInvoice} testID="save-invoice" />
    </SheetFrame>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(14, 25, 19, 0.44)',
  },
  sheet: {
    height: '91%',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 23,
    paddingHorizontal: 22,
    paddingBottom: Platform.OS === 'web' ? 34 : 16,
  },
  sheetTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    paddingBottom: 20,
  },
  sheetTitle: { fontSize: 24, lineHeight: 30, fontWeight: '700', letterSpacing: -0.7 },
  sheetCaption: { fontSize: 13, marginTop: 4 },
  closeButton: { padding: 6, marginTop: 1 },
  formContent: { gap: 11, paddingBottom: 24 },
  fieldLabel: { fontSize: 13, fontWeight: '700', marginTop: 5 },
  input: {
    minHeight: 51,
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 15,
    fontSize: 15,
  },
  amountInputRow: {
    minHeight: 56,
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currencyPrefix: { fontSize: 18, fontWeight: '600' },
  amountInput: { flex: 1, fontSize: 18, fontWeight: '700', paddingVertical: 12 },
  choiceWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { paddingVertical: 9, paddingHorizontal: 12, borderRadius: 99, borderWidth: 1 },
  receiptActions: { flexDirection: 'row', gap: 10 },
  receiptButton: {
    flex: 1,
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  receiptButtonText: { fontSize: 12, fontWeight: '600' },
  receiptPreview: { height: 152, borderRadius: 17, overflow: 'hidden' },
  receiptImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  removeReceipt: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(20,30,24,0.72)',
    padding: 7,
    borderRadius: 99,
  },
  hint: { fontSize: 11, lineHeight: 16, marginBottom: 3 },
  error: { fontSize: 12, fontWeight: '600', lineHeight: 17 },
});
