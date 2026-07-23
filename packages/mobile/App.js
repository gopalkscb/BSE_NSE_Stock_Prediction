import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, Text } from 'react-native';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import ScreenerScreen from './src/screens/ScreenerScreen';
import LiveDataScreen from './src/screens/LiveDataScreen';
import WatchlistScreen from './src/screens/WatchlistScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabIcon({ label, focused }) {
  const icons = { Screener: '📊', 'Live Data': '⚡', Watchlist: '⭐', Settings: '⚙️' };
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: 20 }}>{icons[label] || '•'}</Text>
      <Text style={{ fontSize: 10, color: focused ? '#0d9488' : '#94a3b8', marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: '#0f766e' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '600' },
        tabBarShowLabel: false,
        tabBarStyle: { height: 60, paddingBottom: 8, paddingTop: 8 },
        tabBarIcon: ({ focused }) => <TabIcon label={route.name} focused={focused} />,
      })}
    >
      <Tab.Screen name="Screener" component={ScreenerScreen} options={{ title: '📈 Screener' }} />
      <Tab.Screen name="Live Data" component={LiveDataScreen} options={{ title: '⚡ Live Data' }} />
      <Tab.Screen name="Watchlist" component={WatchlistScreen} options={{ title: '⭐ Watchlist' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: '⚙️ Settings' }} />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0fdfa' }}>
        <ActivityIndicator size="large" color="#0d9488" />
        <Text style={{ marginTop: 12, color: '#64748b' }}>Loading...</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <Stack.Screen name="Main" component={MainTabs} />
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <AppNavigator />
        <StatusBar style="light" />
      </NavigationContainer>
    </AuthProvider>
  );
}
