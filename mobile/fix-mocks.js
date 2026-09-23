const fs = require('fs');
fs.writeFileSync('src/__tests__/__mocks__/hugeicons.ts', 'const React = require("react");\nconst { View } = require("react-native");\nmodule.exports = new Proxy({}, { get: function() { return function MockIcon() { return React.createElement(View); }; } });', 'utf8');
