import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import DashboardScreen from '@screens/DashboardScreen';
import JobListScreen from '@screens/JobListScreen';
import ScheduleScreen from '@screens/ScheduleScreen';
import ResourcesScreen from '@screens/ResourcesScreen';
import ProfileScreen from '@screens/ProfileScreen';
import { useTheme, ThemeColors } from '@theme';

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

const MainTabsNavigator = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.tabBar.active,
        tabBarInactiveTintColor: colors.tabBar.inactive,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.item,
        tabBarBackground: () => <View style={[StyleSheet.absoluteFillObject, styles.tabBarBackground]} />,
        tabBarIcon: ({ color, focused, size }) => {
          const map = iconMap[route.name as keyof MainTabParamList];
          const iconName = focused ? map.focused : map.default;
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
      sceneContainerStyle={styles.scene}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Inicio' }} />
      <Tab.Screen name="Jobs" component={JobListScreen} options={{ title: 'Ofertas' }} />
      <Tab.Screen name="Schedule" component={ScheduleScreen} options={{ title: 'Agenda' }} />
      <Tab.Screen name="Resources" component={ResourcesScreen} options={{ title: 'Recursos' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Menú' }} />
    </Tab.Navigator>
  );
};

export default MainTabsNavigator;

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    tabBar: {
      position: 'absolute',
      marginHorizontal: 24,
      marginBottom: 16,
      borderRadius: 28,
      borderTopWidth: 0,
      height: 80,
      paddingBottom: 18,
      paddingTop: 12,
      backgroundColor: colors.tabBar.background,
      borderWidth: 1,
      borderColor: colors.tabBar.border,
      elevation: 0,
    },
    tabBarBackground: {
      backgroundColor: colors.tabBar.background,
      borderRadius: 28,
    },
    item: {
      padding: 4,
    },
    scene: {
      backgroundColor: colors.background,
    },
  });
