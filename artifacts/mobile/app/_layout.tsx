import React, { useEffect, useLayoutEffect } from "react";
import { Text, View } from "react-native";
import { ClerkLoaded, ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { FinanceProvider } from "@/contexts/FinanceContext";
import { ClerkSessionProvider, LocalSessionProvider } from "@/contexts/SessionContext";
import { OnboardingModal } from "@/components/OnboardingModal";
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from "@expo-google-fonts/inter";
import { Redirect, Stack, useSegments } from "expo-router";
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

const LOCAL_USER_ID = "local-dev-user";
const localGetToken = async () => null;

function isEnabled(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

function RootNavigator() {
  return (
    <>
      <Stack screenOptions={{ headerBackTitle: "Back" }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="assistant" options={{ headerShown: false }} />
      </Stack>
      <OnboardingModal />
    </>
  );
}

type AuthenticatedAppProps = {
  isSignedIn: boolean;
  userId: string | null;
  getToken: () => Promise<string | null>;
};

function AuthenticatedApp({ isSignedIn, userId, getToken }: AuthenticatedAppProps) {
  const segments = useSegments();
  const isAuthRoute = segments[0] === "(auth)";

  useLayoutEffect(() => {
    queryClient.clear();
    setAuthTokenGetter(isSignedIn ? () => getToken() : null);
    return () => setAuthTokenGetter(null);
  }, [getToken, isSignedIn, userId]);

  if (!isSignedIn && !isAuthRoute) {
    return <Redirect href="/(auth)/sign-in" />;
  }
  if (isSignedIn && isAuthRoute) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <FinanceProvider key={userId ?? "signed-out"} userId={isSignedIn ? userId ?? null : null}>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <RootNavigator />
        </QueryClientProvider>
      </ErrorBoundary>
    </FinanceProvider>
  );
}

function ClerkAuthenticatedApp() {
  const { isSignedIn, userId, getToken } = useAuth();

  return (
    <ClerkSessionProvider>
      <AuthenticatedApp
        isSignedIn={Boolean(isSignedIn)}
        userId={userId ?? null}
        getToken={getToken}
      />
    </ClerkSessionProvider>
  );
}

function LocalAuthenticatedApp() {
  return (
    <LocalSessionProvider>
      <AuthenticatedApp isSignedIn userId={LOCAL_USER_ID} getToken={localGetToken} />
    </LocalSessionProvider>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <SafeAreaProvider>{children}</SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

function MissingAuthConfiguration() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 28, backgroundColor: "#F5F6F1" }}>
      <Text style={{ color: "#1B2923", fontSize: 21, fontWeight: "700", textAlign: "center" }}>
        Sign-in is temporarily unavailable
      </Text>
      <Text style={{ color: "#65736B", fontSize: 14, lineHeight: 21, textAlign: "center", marginTop: 10 }}>
        Authentication is not configured for this build. Please restart the app workflow or rebuild it.
      </Text>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();

  useEffect(() => {
    if (fontsLoaded || fontError) void SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  const hasPlaceholderKey = !publishableKey || /^your[_-]?key/i.test(publishableKey);
  const bypassClerk =
    isEnabled(process.env.EXPO_PUBLIC_CLERK_DEV_BYPASS) || (__DEV__ && hasPlaceholderKey);

  if (bypassClerk) {
    return (
      <AppShell>
        <LocalAuthenticatedApp />
      </AppShell>
    );
  }

  if (!publishableKey) return <MissingAuthConfiguration />;

  return (
    <AppShell>
      {/* REMINDER: Go to the Clerk Dashboard and enable 'Native API' under the 'Native applications' tab. */}
      <ClerkProvider
        publishableKey={publishableKey}
        tokenCache={tokenCache}
        proxyUrl={process.env.EXPO_PUBLIC_CLERK_PROXY_URL || undefined}
      >
        <ClerkLoaded>
          <ClerkAuthenticatedApp />
        </ClerkLoaded>
      </ClerkProvider>
    </AppShell>
  );
}
