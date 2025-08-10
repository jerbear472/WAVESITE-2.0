module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // React Native Reanimated plugin must be listed last
    'react-native-reanimated/plugin',
  ],
  env: {
    production: {
      plugins: [
        // Remove console statements in production
        'transform-remove-console',
        // Optimize React for production
        '@babel/plugin-transform-react-constant-elements',
        '@babel/plugin-transform-react-inline-elements',
      ],
    },
  },
};