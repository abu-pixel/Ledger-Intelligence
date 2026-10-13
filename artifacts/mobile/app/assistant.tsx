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
import { router } from 'expo-router';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useAskAccountingAssistant, useGetAiStatus } from '@workspace/api-client-react';
import type { AccountingGuidanceRequest } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useFinance } from '@/contexts/FinanceContext';
import { getCountryName } from '@/lib/localization';

type ChatMessage = {
  id: string;
  role: 'assistant' | 'user';
  text: string;
};

function describeRequestError(error: unknown) {
  const status = typeof error === 'object' && error !== null && 'status' in error
    ? Number((error as { status?: unknown }).status)
    : undefined;
  if (status === 503) return 'The AI assistant is not configured yet. Add the OpenAI API key through Replit Secrets.';
  if (status === 429) return 'The assistant is receiving too many requests right now. Please wait and try again.';
  if (status && status >= 500) return 'The assistant could not respond. Check your connection and try again shortly.';
  return 'The request could not be sent. Check your connection and try again.';
}

export default function AssistantScreen() {
  const colors = useColors();
  const { state, setAiConsentAccepted } = useFinance();
  const statusQuery = useGetAiStatus();
  const assistantMutation = useAskAccountingAssistant();
  const [draft, setDraft] = useState('');
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
  const assistantAvailable = statusQuery.data?.available === true;
  const isSending = assistantMutation.isPending;

  async function sendQuestion() {
    const question = draft.trim();
    if (!question || isSending || !assistantAvailable || !state.aiConsentAccepted) return;
    if (question.length > 1200) return;

    setDraft('');
    setMessages((current) => [
      ...current,
      { id: `user-${Date.now()}`, role: 'user', text: question },
    ]);

    const request: AccountingGuidanceRequest = { question, ...requestSummary };
    try {
      const result = await assistantMutation.mutateAsync({ data: request });
      setMessages((current) => [
        ...current,
        { id: `assistant-${Date.now()}`, role: 'assistant', text: result.answer },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        { id: `error-${Date.now()}`, role: 'assistant', text: describeRequestError(error) },
      ]);
    }
  }

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => router.back()}
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
        <View style={[styles.statusDot, { backgroundColor: assistantAvailable ? colors.primary : colors.mutedForeground }]} />
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
              Your question, country/currency, and aggregate cash-flow and invoice totals will be sent to OpenAI through the app server. Receipt images, customer names, and transaction descriptions are not sent. Chat history is not saved by the app.
            </Text>
            <Pressable
              onPress={() => setAiConsentAccepted(true)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.allowButton, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={[styles.allowButtonText, { color: colors.primaryForeground }]}>Allow and continue</Text>
            </Pressable>
            <Pressable onPress={() => router.back()} accessibilityRole="button" style={styles.notNowButton}>
              <Text style={[styles.notNowText, { color: colors.mutedForeground }]}>Not now</Text>
            </Pressable>
          </View>
        ) : statusQuery.isLoading ? (
          <View style={[styles.notice, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.noticeBody, { color: colors.mutedForeground }]}>Checking AI availability…</Text>
          </View>
        ) : !assistantAvailable ? (
          <View style={[styles.notice, { backgroundColor: colors.warningSurface, borderColor: colors.border }]}>
            <Feather name={statusQuery.isError ? 'wifi-off' : 'settings'} size={18} color={colors.primary} />
            <Text style={[styles.noticeTitle, { color: colors.foreground }]}>
              {statusQuery.isError ? 'Could not reach the AI service' : 'Assistant setup is incomplete'}
            </Text>
            <Text style={[styles.noticeBody, { color: colors.mutedForeground }]}>
              {statusQuery.isError
                ? 'Check your connection and try the status check again.'
                : 'Add OPENAI_API_KEY in Replit Secrets. The key stays on the server and is never included in the mobile app.'}
            </Text>
            <Pressable
              onPress={() => void statusQuery.refetch()}
              accessibilityRole="button"
              style={[styles.retryButton, { backgroundColor: colors.secondary }]}
            >
              <Text style={[styles.retryText, { color: colors.secondaryForeground }]}>Check again</Text>
            </Pressable>
          </View>
        ) : (
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
  composer: { minHeight: 54, marginHorizontal: 14, borderWidth: 1, borderRadius: 18, padding: 6, flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  composerInput: { flex: 1, maxHeight: 110, minHeight: 40, paddingHorizontal: 10, paddingTop: 10, paddingBottom: 7, fontSize: 14, lineHeight: 20 },
  sendButton: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  disclaimer: { fontSize: 9, lineHeight: 13, textAlign: 'center', paddingHorizontal: 24, paddingTop: 9, paddingBottom: Platform.OS === 'ios' ? 8 : 12 },
});
