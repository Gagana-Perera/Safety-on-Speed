const { withProjectBuildGradle, withAppBuildGradle } = require("@expo/config-plugins");

/**
 * Expo Config Plugin to resolve AndroidX/Support library conflicts.
 * This is necessary because some legacy React Native libraries still 
 * pull in the old com.android.support group, which conflicts with 
 * modern androidx libraries in Expo SDK 54+ (Gradle 8+).
 */
module.exports = function withAndroidXFix(config) {
  // 1. Fix project-level resolution strategy
  config = withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === "groovy") {
      config.modResults.contents = addExclusionRules(config.modResults.contents);
    }
    return config;
  });

  // 2. Fix app-level packaging options for all duplicate version/metadata files
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
            force 'androidx.customview:customview:1.1.0'
            force 'androidx.localbroadcastmanager:localbroadcastmanager:1.0.0'
        }
        // AGGRESSIVE: Exclude the entire legacy support group to prevent transitive duplicates
        exclude group: "com.android.support"
    }
}
`;
  if (!src.includes("androidx.core:core")) {
    return src + exclusionRules;
  }
  return src;
}

function addPackagingOptions(src) {
  // Expanded rules to catch any version or metadata conflict under META-INF
  const packagingRules = `
    packagingOptions {
        pickFirst 'META-INF/*.version'
        pickFirst 'META-INF/androidx.*'
        pickFirst 'META-INF/android.*'
        pickFirst 'META-INF/com.android.*'
        pickFirst 'META-INF/proguard/**'
        pickFirst 'META-INF/*.kotlin_module'
    }
`;
  
  // Find the android { ... } block and insert packagingOptions
  // We use a regex match to avoid duplicate insertions if run multiple times
  if (!src.includes("pickFirst 'META-INF/*.version'") && src.includes("android {")) {
    return src.replace("android {", `android {${packagingRules}`);
  }
  return src;
}
