const { withProjectBuildGradle } = require("@expo/config-plugins");

/**
 * Expo Config Plugin to resolve AndroidX/Support library conflicts.
 * This is necessary because some legacy React Native libraries still 
 * pull in the old com.android.support group, which conflicts with 
 * modern androidx libraries in Expo 50+.
 */
module.exports = function withAndroidXFix(config) {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === "groovy") {
      config.modResults.contents = addExclusionRules(config.modResults.contents);
    }
    return config;
  });
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
    }
}
`;
  // Append to the end of the file if not already present
  if (!src.includes("androidx.core:core")) {
    return src + exclusionRules;
  }
  return src;
}
