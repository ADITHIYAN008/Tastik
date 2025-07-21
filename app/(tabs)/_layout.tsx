import { Redirect, Slot } from "expo-router";
import React from "react";

export default function _layout() {
  const isAuthenticated = true;
  if (!isAuthenticated) return <Redirect href="/(auth)/sign-in" />;
  return <Slot />;
}
