---
name: Expo SDK 57 platform targets
description: Native OS minimums and splash-screen configuration for this mobile app's Expo SDK.
---

Expo SDK 57 (React Native 0.86) officially supports Android 7+ and iOS 16.4+. iOS 8 is not compatible with this framework generation. If Ledgerly targets Android 8+, set the Android minimum SDK to API 26 with `expo-build-properties`; retain iOS 16.4 as the minimum unless the framework is deliberately changed.

Expo SDK 57 treats `expo.splash` as web-only. Configure native splash screens using the `expo-splash-screen` config plugin.

**Why:** Expo Doctor rejected the legacy top-level splash property, and the framework's published platform matrix rules out iOS 8 support.

**How to apply:** Check Expo's version-specific OS support table before changing minimums, use config plugins for native build properties, run Expo Doctor and a multi-platform export, and distinguish those checks from testing on physical devices.
