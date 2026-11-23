// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/*', '.claude/*', 'replica/*'] },
  {
    // keep the download small: these package entry points pull in far more than we use
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/ui/icons.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'lucide-react-native', message: 'Import icons from @/ui/icons (one module per icon).', allowTypeImports: true },
            { name: '@expo-google-fonts/inter', message: 'Import one weight, e.g. @expo-google-fonts/inter/400Regular.' },
          ],
        },
      ],
    },
  },
]);
