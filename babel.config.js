module.exports = function (api) {
  const isTest = api.env("test");
  api.cache.using(() => (isTest ? "test" : "default"));
  return {
    presets: isTest
      ? ["babel-preset-expo"]
      : [
          ["babel-preset-expo", { jsxImportSource: "nativewind" }],
          "nativewind/babel",
        ],
    plugins: ["react-native-reanimated/plugin"],
  };
};
