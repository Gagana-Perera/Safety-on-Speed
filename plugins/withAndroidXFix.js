const { withProjectBuildGradle, withAppBuildGradle } = require("@expo/config-plugins");

/**
 * Expo Config Plugin to resolve AndroidX/Support library conflicts.
 * This is necessary because some legacy React Native libraries still 
 * pull in the old com.android.support group, which conflicts with 
 * modern androidx libraries in Expo 50+.
 */
module.exports = function withAndroidXFix(config) {
  // Fix project-level resolution strategy
  config = withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === "groovy") {
      config.modResults.contents = addExclusionRules(config.modResults.contents);
    }
    return config;
  });

  // Fix app-level packaging options for duplicate META-INF files
  config = withAppBuildGradle(config, (config) => {
    if (config.modResults.language === "groovy") {
      config.modResults.contents = addPackagingOptions(config.modResults.contents);
    }
    return config;
  });

  return config;
};

function addExclusionRules(src) {
  const exclusionRules = `
allprojects {
    configurations.all {
        resolutionStrategy {
            // Force resolution of these common conflicting packages to AndroidX
            force 'androidx.core:core:1.16.0'
            force 'androidx.versionedparcelable:versionedparcelable:1.1.1'
            force 'androidx.annotation:annotation:1.9.1'
        }
        // Exclude the legacy support library group entirely to prevent duplicates
        exclude group: "com.android.support", module: "support-compat"
        exclude group: "com.android.support", module: "versionedparcelable"
        exclude group: "com.android.support", module: "localbroadcastmanager"
    }
}
`;
  if (!src.includes("androidx.core:core")) {
    return src + exclusionRules;
  }
  return src;
}

function addPackagingOptions(src) {
  const packagingRules = `
    packagingOptions {
        pickFirst 'META-INF/androidx.localbroadcastmanager_localbroadcastmanager.version'
        pickFirst 'META-INF/androidx.*'
        pickFirst 'META-INF/android.*'
    }
`;
  
  // Find the android { ... } block and insert packagingOptions
  if (!src.includes("packagingOptions") && src.includes("android {")) {
    return src.replace("android {", `android {${packagingRules}`);
  }
  return src;
}
