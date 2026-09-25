import React from "react";
import { View } from "react-native";

const MockIcon = () => React.createElement(View);

export default new Proxy({}, { get: () => MockIcon });