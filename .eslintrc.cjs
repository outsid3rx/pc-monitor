const { configure, presets } = require('eslint-kit')

module.exports = configure({
  presets: [
    presets.imports({
      sort: {
        newline: false,
      },
    }),
    presets.typescript(),
    presets.prettier(),
    presets.node(),
  ],
  extend: {
    rules: {
      '@typescript-eslint/ban-types': 'off',
    }
  }
})