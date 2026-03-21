require("dotenv/config");

module.exports = ({ config }) => ({
  ...config,
  name: "Safety On Speed",
  slug: "SOS",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/oc/logo.jpg",
  scheme: "safetyonspeed",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    ...config.ios,
    bundleIdentifier: "com.safetyonspeed.app",
    supportsTablet: true,
    config: {
      ...(config.ios?.config ?? {}),
      googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_API_KEY,
    },
    infoPlist: {
      ...(config.ios?.infoPlist ?? {}),
      UIViewControllerBasedStatusBarAppearance: true,
    },
  },
  android: {
    ...config.android,
    adaptiveIcon: {
      ...(config.android?.adaptiveIcon ?? {}),
      backgroundColor: "#002747",
    },
    config: {
      ...(config.android?.config ?? {}),
      googleMaps: {
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_API_KEY,
      },
    },
    edgeToEdgeEnabled: true,
    package: "com.safetyonspeed.app",
    predictiveBackGestureEnabled: false,
  },
  web: {
    ...(config.web ?? {}),
    output: "static",
  },
  plugins: [
    "expo-router",
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission:
          "Allow Safety On Speed to share your live location with your guardians during an SOS alert.",
        locationWhenInUsePermission:
          "Allow Safety On Speed to access your location so live sharing works when you need help.",
        isIosBackgroundLocationEnabled: true,
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true,
      },
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/oc/logo.jpg",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: {
          backgroundColor: "#000000",
        },
      },
    ],
    "expo-secure-store",
    "expo-font",
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    ...(config.extra ?? {}),
    EXPO_PUBLIC_GOOGLE_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_API_KEY,
    EXPO_PUBLIC_SOS_ALERT_WEBHOOK_URL:
      process.env.EXPO_PUBLIC_SOS_ALERT_WEBHOOK_URL,
    EXPO_PUBLIC_SOS_CONFERENCE_WEBHOOK_URL:
      process.env.EXPO_PUBLIC_SOS_CONFERENCE_WEBHOOK_URL,
    EXPO_PUBLIC_SUPABASE_KEY: process.env.EXPO_PUBLIC_SUPABASE_KEY,
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  },
});
