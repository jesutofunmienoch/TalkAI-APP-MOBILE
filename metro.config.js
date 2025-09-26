const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

module.exports = (async () => {
  const config = await getDefaultConfig(__dirname);

  // Keep your blockList rule
  config.resolver.blockList = [/InternalBytecode\.js/];

  // Enable NativeWind with global.css
  return withNativeWind(config, { input: "./styles/global.css" });
})();
