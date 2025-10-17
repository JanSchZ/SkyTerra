import React from 'react';
import { StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

import DashboardScreen from '@screens/DashboardScreen';
import JobListScreen from '@screens/JobListScreen';
import ScheduleScreen from '@screens/ScheduleScreen';
import ResourcesScreen from '@screens/ResourcesScreen';
import ProfileScreen from '@screens/ProfileScreen';

export type MainTabParamList = {
  Dashboard: undefined;
  Jobs: undefined;
  Schedule: undefined;
  Resources: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const iconMap: Record<keyof MainTabParamList, { focused: keyof typeof Ionicons.glyphMap; default: keyof typeof Ionicons.glyphMap }>
  = {
    Dashboard: { focused: 'home', default: 'home-outline' },
    Jobs: { focused: 'briefcase', default: 'briefcase-outline' },
    Schedule: { focused: 'calendar', default: 'calendar-outline' },
    Resources: { focused: 'sparkles', default: 'sparkles-outline' },
    Profile: { focused: 'reorder-three', default: 'reorder-three-outline' },
  };

const MainTabsNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: '#F9FAFB',
      tabBarInactiveTintColor: 'rgba(248,250,252,0.55)',
      tabBarLabelStyle: styles.label,
      tabBarStyle: styles.tabBar,
      tabBarItemStyle: styles.item,
      tabBarBackground: () => <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFillObject} />,
      tabBarIcon: ({ color, focused, size }) => {
        const map = iconMap[route.name as keyof MainTabParamList];
        const iconName = focused ? map.focused : map.default;
        return <Ionicons name={iconName} size={size} color={color} />;
      },
    })}
    sceneContainerStyle={styles.scene}
  >
    <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Inicio' }} />
    <Tab.Screen name="Jobs" component={JobListScreen} options={{ title: 'Órdenes' }} />
    <Tab.Screen name="Schedule" component={ScheduleScreen} options={{ title: 'Agenda' }} />
    <Tab.Screen name="Resources" component={ResourcesScreen} options={{ title: 'Recursos' }} />
    <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Menú' }} />
  </Tab.Navigator>
);

export default MainTabsNavigator;

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    marginHorizontal: 24,
    marginBottom: 16,
    borderRadius: 28,
    borderTopWidth: 0,
    height: 80,
    paddingBottom: 18,
    paddingTop: 12,
    backgroundColor: 'rgba(15,17,23,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    elevation: 0,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  item: {
    padding: 4,
  },
  scene: {
    backgroundColor: 'transparent',
  },
});
