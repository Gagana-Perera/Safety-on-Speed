module.exports = function (api) {
  const isTest = api.env("test");
  api.cache.using(() => (isTest ? "test" : "default"));
  return {
<<<<<<< HEAD
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      "react-native-reanimated/plugin",
      [
        "module-resolver",
        {
          root: ["./"],
          alias: {
            "@": "./",
          },
        },
      ],
    ],
=======
    presets: isTest
      ? ["babel-preset-expo"]
      : [
          ["babel-preset-expo", { jsxImportSource: "nativewind" }],
          "nativewind/babel",
        ],
    plugins: ["react-native-reanimated/plugin"],
>>>>>>> d662b35177d1c7d720fff5c6e513c858af0dc113
  };
};
