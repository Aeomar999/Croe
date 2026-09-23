const React = require("react");
const { View } = require("react-native");
module.exports = new Proxy({}, { get: function() { return function MockIcon() { return React.createElement(View); }; } });