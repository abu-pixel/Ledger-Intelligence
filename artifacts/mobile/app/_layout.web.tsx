import React, { useEffect, useLayoutEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { FinanceProvider } from "@/contexts/FinanceContext";
import { IdentitySessionProvider, useIdentitySession } from "@/contexts/IdentitySessionContext";
import { OnboardingModal } from "@/components/OnboardingModal";
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from "@expo-google-fonts/inter";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
    mutations: { retry: 0 },
  },
});

const apiDomain = process.env.EXPO_PUBLIC_DOMAIN?.trim();
setAuthTokenGetter(null);
if (apiDomain) {
  setBaseUrl(/^https?:\/\//i.test(apiDomain) ? apiDomain : `https://${apiDomain}`);
}

function RootNavigator({ signedIn }: { signedIn: boolean }) {
  return (
    <>
      <Stack screenOptions={{ headerBackTitle: "Back" }}>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="settings" options={{ headerShown: false }} />
          <Stack.Screen name="assistant" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
      {signedIn ? <OnboardingModal /> : null}
    </>
  );
}

type AuthenticatedAppProps = {
  isSignedIn: boolean;
  userId: string | null;
  getToken: () => Promise<string | null>;
};

function AuthenticatedApp({ isSignedIn, userId, getToken }: AuthenticatedAppProps) {
  useLayoutEffect(() => {
    queryClient.clear();
    setAuthTokenGetter(isSignedIn ? () => getToken() : null);
    return () => setAuthTokenGetter(null);
  }, [getToken, isSignedIn, userId]);

  return (
    <FinanceProvider cloudSyncEnabled={false} key={userId ?? "signed-out"} userId={isSignedIn ? userId ?? null : null}>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <RootNavigator signedIn={isSignedIn} />
        </QueryClientProvider>
      </ErrorBoundary>
    </FinanceProvider>
  );
}

function IdentityAuthenticatedApp() {
  const { identityUser, ready, recovery } = useIdentitySession();
  if (!ready) return <View style={{ flex: 1, justifyContent: "center" }}><ActivityIndicator accessibilityLabel="Restoring your session" /></View>;
  return <AuthenticatedApp isSignedIn={Boolean(identityUser) && !recovery} userId={identityUser ? `netlify:${identityUser.id}` : null} getToken={noApiToken} />;
}

// The existing cloud API uses Clerk; Identity credentials must stay on this site's auth endpoint.
const noApiToken = async () => null;

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <SafeAreaProvider>{children}</SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) void SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <AppShell>
      <IdentitySessionProvider>
        <IdentityAuthenticatedApp />
      </IdentitySessionProvider>
    </AppShell>
  );
}
