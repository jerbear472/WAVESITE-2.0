module.exports = {
  dependencies: {
    '@react-native-ml-kit/text-recognition': {
      platforms: {
        ios: process.env.EXCLUDE_MLKIT ? null : {},
      },
    },
  },
};