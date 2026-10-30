import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useColors } from '@/hooks/useColors';
import { useFinance } from '@/contexts/FinanceContext';
import { getCountryName } from '@/lib/localization';

type ChatMessage = {
  id: string;
  role: 'assistant' | 'user';
  text: string;
};

export default function AssistantScreen() {
  const router = useRouter();
  const colors = useColors();
  const { state, setAiConsentAccepted } = useFinance();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Ask a general bookkeeping question or ask for help interpreting the totals recorded in this ledger.',
    },
  ]);

  const requestSummary = useMemo(() => {
    const now = new Date();
    const currentMonth = state.transactions.filter((item) => {
      const date = new Date(item.date);
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    });
    const currentMonthIncome = currentMonth
      .filter((item) => item.kind === 'income')
      .reduce((sum, item) => sum + item.amount, 0);
    const currentMonthExpense = currentMonth
      .filter((item) => item.kind === 'expense')
      .reduce((sum, item) => sum + item.amount, 0);
    const unpaidInvoices = state.invoices.filter((item) => item.status === 'unpaid');

    return {
      countryCode: state.countryCode,
      countryName: getCountryName(state.countryCode),
      currencyCode: state.currencyCode,
      cashBalance: state.openingCash + state.transactions.reduce(
        (sum, item) => sum + (item.kind === 'income' ? item.amount : -item.amount),
        0,
      ),
      currentMonthIncome,
      currentMonthExpense,
      outstandingInvoiceAmount: unpaidInvoices.reduce((sum, item) => sum + item.amount, 0),
      unpaidInvoiceCount: unpaidInvoices.length,
    };
  }, [state]);

  const orderedMessages = useMemo(() => [...messages].reverse(), [messages]);
  const groqApiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY?.trim();

  const quickPrompts = [
    'Summarize my cash flow this month',
    'How should I handle my unpaid invoices?',
    'What is my estimated monthly profit margin?',
    `Bookkeeping tips for ${getCountryName(state.countryCode)}`,
  ];

  async function sendQuestion(customText?: string) {
    const question = (customText ?? draft).trim();
    if (!question || isSending || !state.aiConsentAccepted) return;
    if (question.length > 1200) return;

    setDraft('');
    setMessages((current) => [
      ...current,
      { id: `user-${Date.now()}`, role: 'user', text: question },
    ]);

    const apiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY?.trim();
    if (!apiKey) {
      setMessages((current) => [
        ...current,
        { id: `error-${Date.now()}`, role: 'assistant', text: 'Groq returned no content. Check API key and model.' },
      ]);
      return;
    }

    setIsSending(true);

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: `You are Ledgerly's general accounting assistant for small businesses. Context: Country: ${requestSummary.countryName} (${requestSummary.countryCode}), Currency: ${requestSummary.currencyCode}, Cash Balance: ${requestSummary.cashBalance}, Monthly Income: ${requestSummary.currentMonthIncome}, Monthly Expenses: ${requestSummary.currentMonthExpense}, Outstanding Invoices: ${requestSummary.outstandingInvoiceAmount} (${requestSummary.unpaidInvoiceCount} unpaid). Keep responses clear, practical, and concise.`,
            },
            {
              role: 'user',
              content: question,
            },
          ],
        }),
      });

      const data = await response.json();
      console.log("GROQ RAW:", JSON.stringify(data));

      if (!response.ok) {
        const errorMsg = data?.error?.message || `Groq API error (${response.status})`;
        throw new Error(errorMsg);
      }

      const replyText = data?.choices?.[0]?.message?.content;
      if (!replyText || !replyText.trim()) {
        throw new Error('Groq returned no content. Check API key and model.');
      }

      setMessages((current) => [
        ...current,
        { id: `assistant-${Date.now()}`, role: 'assistant', text: replyText.trim() },
      ]);
    } catch (error: any) {
      console.log("GROQ ERROR:", error);
      setMessages((current) => [
        ...current,
        { id: `error-${Date.now()}`, role: 'assistant', text: error?.message || 'Groq returned no content. Check API key and model.' },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={[styles.headerButton, { backgroundColor: colors.secondary }]}
        >
          <Feather name="arrow-left" size={19} color={colors.secondaryForeground} />
        </Pressable>
        <View style={styles.headerTitleBlock}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Accounting assistant</Text>
          <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>General guidance · not tax advice</Text>
        </View>
        <View style={[styles.statusDot, { backgroundColor: Boolean(groqApiKey) ? colors.primary : colors.mutedForeground }]} />
      </View>

      <KeyboardAvoidingView
        style={styles.chat}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      >
        <FlatList
          data={orderedMessages}
          inverted
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={styles.messageList}
          renderItem={({ item }) => {
            const isUser = item.role === 'user';
            return (
              <View
                style={[
                  styles.messageRow,
                  { justifyContent: isUser ? 'flex-end' : 'flex-start' },
                ]}
              >
                <View
                  style={[
                    styles.messageBubble,
                    {
                      backgroundColor: isUser ? colors.primary : colors.card,
                      borderColor: isUser ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={{ color: isUser ? colors.primaryForeground : colors.foreground, fontSize: 14, lineHeight: 21 }}>
                    {item.text}
                  </Text>
                </View>
              </View>
            );
          }}
          ListHeaderComponent={
            isSending ? (
              <View style={styles.pendingRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.pendingText, { color: colors.mutedForeground }]}>Preparing a response…</Text>
              </View>
            ) : null
          }
        />

        {!state.aiConsentAccepted ? (
          <View style={[styles.notice, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.noticeIcon, { backgroundColor: colors.accent }]}>
              <Feather name="shield" size={17} color={colors.accentForeground} />
            </View>
            <Text style={[styles.noticeTitle, { color: colors.foreground }]}>Choose whether to share a limited summary</Text>
            <Text style={[styles.noticeBody, { color: colors.mutedForeground }]}>
              Your question, country/currency, and aggregate cash-flow and invoice totals will be sent to the AI assistant through the app server. Receipt images, customer names, and transaction descriptions are not sent. Chat history is not saved by the app.
            </Text>
            <Pressable
              onPress={() => setAiConsentAccepted(true)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.allowButton, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={[styles.allowButtonText, { color: colors.primaryForeground }]}>Allow and continue</Text>
            </Pressable>
            <Pressable onPress={handleBack} accessibilityRole="button" style={styles.notNowButton}>
              <Text style={[styles.notNowText, { color: colors.mutedForeground }]}>Not now</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            <FlatList
              data={quickPrompts}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item}
              contentContainerStyle={{ paddingHorizontal: 14, gap: 8 }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => void sendQuestion(item)}
                  disabled={isSending}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.chip,
                    {
                      backgroundColor: colors.secondary,
                      borderColor: colors.border,
                      opacity: isSending ? 0.5 : pressed ? 0.75 : 1,
                    },
                  ]}
                >
                  <Feather name="zap" size={12} color={colors.primary} />
                  <Text style={[styles.chipText, { color: colors.secondaryForeground }]}>{item}</Text>
                </Pressable>
              )}
            />

            <View style={[styles.composer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Ask an accounting question…"
                placeholderTextColor={colors.mutedForeground}
                multiline
                maxLength={1200}
                editable={!isSending}
                style={[styles.composerInput, { color: colors.foreground }]}
                returnKeyType="send"
                onSubmitEditing={() => void sendQuestion()}
                accessibilityLabel="Accounting question"
              />
              <Pressable
                onPress={() => void sendQuestion()}
                disabled={!draft.trim() || isSending}
                accessibilityRole="button"
                accessibilityLabel="Send question"
                style={({ pressed }) => [
                  styles.sendButton,
                  {
                    backgroundColor: colors.primary,
                    opacity: !draft.trim() || isSending ? 0.45 : pressed ? 0.8 : 1,
                  },
                ]}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color={colors.primaryForeground} />
                ) : (
                  <Feather name="arrow-up" size={19} color={colors.primaryForeground} />
                )}
              </Pressable>
            </View>
          </View>
        )}
        <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
          AI can make mistakes. Verify tax, payroll, and filing decisions with a qualified professional.
        </Text>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  header: { minHeight: 66, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: StyleSheet.hairlineWidth },
  headerButton: { width: 39, height: 39, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  headerTitleBlock: { flex: 1, gap: 3 },
  headerTitle: { fontSize: 15, fontWeight: '700' },
  headerSubtitle: { fontSize: 10 },
  statusDot: { width: 8, height: 8, borderRadius: 99 },
  chat: { flex: 1 },
  messageList: { paddingHorizontal: 16, paddingVertical: 16, gap: 12 },
  messageRow: { flexDirection: 'row' },
  messageBubble: { maxWidth: '88%', borderRadius: 18, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 11 },
  pendingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 8, paddingBottom: 8 },
  pendingText: { fontSize: 11 },
  notice: { marginHorizontal: 16, marginBottom: 8, padding: 15, borderWidth: 1, borderRadius: 18, gap: 9 },
  noticeIcon: { width: 35, height: 35, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  noticeTitle: { fontSize: 14, fontWeight: '700', lineHeight: 19 },
  noticeBody: { fontSize: 11, lineHeight: 17 },
  allowButton: { minHeight: 43, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  allowButtonText: { fontSize: 12, fontWeight: '700' },
  notNowButton: { minHeight: 35, alignItems: 'center', justifyContent: 'center' },
  notNowText: { fontSize: 11, fontWeight: '600' },
  retryButton: { minHeight: 39, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  retryText: { fontSize: 12, fontWeight: '700' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 99, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '600' },
  composer: { minHeight: 54, marginHorizontal: 14, borderWidth: 1, borderRadius: 18, padding: 6, flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  composerInput: { flex: 1, maxHeight: 110, minHeight: 40, paddingHorizontal: 10, paddingTop: 10, paddingBottom: 7, fontSize: 14, lineHeight: 20 },
  sendButton: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  disclaimer: { fontSize: 9, lineHeight: 13, textAlign: 'center', paddingHorizontal: 24, paddingTop: 9, paddingBottom: Platform.OS === 'ios' ? 8 : 12 },
});
