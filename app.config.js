import "dotenv/config";

export default {
  expo: {
    // ... other settings ...
    ios: {
      bundleIdentifier: "com.safetyonspeed.app",
      config: {
        // MUST MATCH YOUR .env NAME
        googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_API_KEY,
      },
      infoPlist: {
        UIViewControllerBasedStatusBarAppearance: true,
      },
    },
    android: {
      package: "com.safetyonspeed.app",
      config: {
        googleMaps: {
          // MUST MATCH YOUR .env NAME
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_API_KEY,
        },
      },
      // ... permissions ...
    },
  },
};
