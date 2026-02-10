import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import {
  HomeIcon, CalendarIcon, CheckSquareIcon, TargetIcon, MenuIcon,
  BarChartIcon, ClipboardCheckIcon, UsersIcon
} from '../components/Icons';
import { colors } from '../theme';
import { BrandingProvider } from '../contexts/BrandingContext';
import { ViewProvider } from '../contexts/ViewContext';

// Onboarding Screens
import { OnboardingWelcomeScreen } from '../screens/onboarding/OnboardingWelcomeScreen';
import { OnboardingSkillsScreen } from '../screens/onboarding/OnboardingSkillsScreen';
import { OnboardingPreferencesScreen } from '../screens/onboarding/OnboardingPreferencesScreen';

// Worker Screens
import { LoginScreen } from '../screens/LoginScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { ScheduleOverviewScreen } from '../screens/schedule/ScheduleOverviewScreen';
import { ClockInOutScreen } from '../screens/schedule/ClockInOutScreen';
import { ShiftDetailScreen } from '../screens/schedule/ShiftDetailScreen';
import { ShiftSwapScreen } from '../screens/schedule/ShiftSwapScreen';
import { ShiftSwapSelectPersonScreen } from '../screens/schedule/ShiftSwapSelectPersonScreen';
import { ShiftSwapConfirmScreen } from '../screens/schedule/ShiftSwapConfirmScreen';
import { TimeOffRequestScreen } from '../screens/schedule/TimeOffRequestScreen';
import { TimeOffCalendarScreen } from '../screens/schedule/TimeOffCalendarScreen';
import { TasksScreen } from '../screens/TasksScreen';
import { TaskDetailScreen } from '../screens/tasks/TaskDetailScreen';
import { TaskExecutionScreen } from '../screens/tasks/TaskExecutionScreen';
import { TaskCompletionScreen } from '../screens/tasks/TaskCompletionScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { FeedScreen } from '../screens/feed/FeedScreen';
import { CreatePostScreen } from '../screens/feed/CreatePostScreen';
import { RewardsScreen } from '../screens/rewards/RewardsScreen';
import { CareerPathScreen } from '../screens/career/CareerPathScreen';
import { LeaderboardScreen } from '../screens/gamification/LeaderboardScreen';
import { BadgesScreen } from '../screens/gamification/BadgesScreen';
import { ShiftMarketplaceScreen } from '../screens/ShiftMarketplaceScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { ExpensesScreen } from '../screens/ExpensesScreen';
import { PayslipsScreen } from '../screens/PayslipsScreen';
import { ComplianceScreen } from '../screens/ComplianceScreen';
import { IntegrationsScreen } from '../screens/IntegrationsScreen';
import { HelpScreen } from '../screens/HelpScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { MoreScreen } from '../screens/MoreScreen';
import { LearningScreen } from '../screens/LearningScreen';
import { DocumentsScreen } from '../screens/DocumentsScreen';
import { PerformanceScreen } from '../screens/PerformanceScreen';
import { SurveysScreen } from '../screens/SurveysScreen';

// Manager Screens
import { ManagerDashboardScreen } from '../screens/manager/DashboardScreen';
import { TeamScheduleScreen } from '../screens/manager/TeamScheduleScreen';
import { SkillsVerificationScreen } from '../screens/manager/SkillsVerificationScreen';
import { JobPostingsScreen } from '../screens/manager/JobPostingsScreen';
import { ReportsScreen } from '../screens/manager/ReportsScreen';
import { ScheduleBuilderScreen } from '../screens/manager/ScheduleBuilderScreen';
import { ExpenseApprovalsScreen } from '../screens/manager/ExpenseApprovalsScreen';
import { ApprovalsScreen } from '../screens/manager/ApprovalsScreen';
import { ManagerMoreScreen } from '../screens/manager/MoreScreen';
import { AIInsightsScreen } from '../screens/manager/AIInsightsScreen';
import { RewardCatalogScreen } from '../screens/manager/RewardCatalogScreen';
import { TeamPerformanceScreen } from '../screens/manager/TeamPerformanceScreen';
import { OffboardingScreen } from '../screens/manager/OffboardingScreen';

// Navigators
const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const ScheduleStack = createStackNavigator();
const TasksStack = createStackNavigator();
const FeedStack = createStackNavigator();
const ProfileStack = createStackNavigator();
const CareerStack = createStackNavigator();
const ManagerScheduleStack = createStackNavigator();
const ApprovalsStack = createStackNavigator();

// Tab bar styling - larger, easier to tap
const tabBarStyle = {
  paddingBottom: 24,
  paddingTop: 8,
  height: 84,
  borderTopWidth: 1,
  borderTopColor: colors.slate200,
  backgroundColor: colors.background,
};

const tabBarLabelStyle = {
  fontSize: 12,
  fontWeight: '600' as const,
  marginTop: 2
};

// ========== WORKER STACKS ==========

const ScheduleNavigator = () => (
  <ScheduleStack.Navigator screenOptions={{ headerShown: false }}>
    <ScheduleStack.Screen name="ScheduleOverview" component={ScheduleOverviewScreen} />
    <ScheduleStack.Screen name="ClockInOut" component={ClockInOutScreen} />
    <ScheduleStack.Screen name="ShiftDetail" component={ShiftDetailScreen} />
    <ScheduleStack.Screen name="ShiftMarketplace" component={ShiftMarketplaceScreen} />
    <ScheduleStack.Screen name="ShiftSwap" component={ShiftSwapScreen} />
    <ScheduleStack.Screen name="ShiftSwapSelectPerson" component={ShiftSwapSelectPersonScreen} />
    <ScheduleStack.Screen name="ShiftSwapConfirm" component={ShiftSwapConfirmScreen} />
    <ScheduleStack.Screen name="TimeOffRequest" component={TimeOffRequestScreen} />
    <ScheduleStack.Screen name="TimeOffCalendar" component={TimeOffCalendarScreen} />
  </ScheduleStack.Navigator>
);

const TasksNavigator = () => (
  <TasksStack.Navigator screenOptions={{ headerShown: false }}>
    <TasksStack.Screen name="TasksList" component={TasksScreen} />
    <TasksStack.Screen name="TaskDetail" component={TaskDetailScreen} />
    <TasksStack.Screen name="TaskExecution" component={TaskExecutionScreen} />
    <TasksStack.Screen name="TaskCompletion" component={TaskCompletionScreen} />
  </TasksStack.Navigator>
);

const CareerNavigator = () => (
  <CareerStack.Navigator screenOptions={{ headerShown: false }}>
    <CareerStack.Screen name="CareerPath" component={CareerPathScreen} />
    <CareerStack.Screen name="Rewards" component={RewardsScreen} />
    <CareerStack.Screen name="Leaderboard" component={LeaderboardScreen} />
    <CareerStack.Screen name="Badges" component={BadgesScreen} />
  </CareerStack.Navigator>
);

const FeedNavigator = () => (
  <FeedStack.Navigator screenOptions={{ headerShown: false }}>
    <FeedStack.Screen name="FeedHome" component={FeedScreen} />
    <FeedStack.Screen name="CreatePost" component={CreatePostScreen} />
    <FeedStack.Screen name="Notifications" component={NotificationsScreen} />
  </FeedStack.Navigator>
);

const ProfileNavigator = () => (
  <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
    <ProfileStack.Screen name="ProfileHome" component={ProfileScreen} />
    <ProfileStack.Screen name="Expenses" component={ExpensesScreen} />
    <ProfileStack.Screen name="Payslips" component={PayslipsScreen} />
    <ProfileStack.Screen name="Compliance" component={ComplianceScreen} />
    <ProfileStack.Screen name="Integrations" component={IntegrationsScreen} />
    <ProfileStack.Screen name="Help" component={HelpScreen} />
    <ProfileStack.Screen name="Learning" component={LearningScreen} />
    <ProfileStack.Screen name="Documents" component={DocumentsScreen} />
    <ProfileStack.Screen name="MyPerformance" component={PerformanceScreen} />
    <ProfileStack.Screen name="MySurveys" component={SurveysScreen} />
  </ProfileStack.Navigator>
);

// ========== MANAGER STACKS ==========

const ManagerScheduleNavigator = () => (
  <ManagerScheduleStack.Navigator screenOptions={{ headerShown: false }}>
    <ManagerScheduleStack.Screen name="ScheduleBuilder" component={ScheduleBuilderScreen} />
    <ManagerScheduleStack.Screen name="TeamSchedule" component={TeamScheduleScreen} />
    <ManagerScheduleStack.Screen name="ClockInOut" component={ClockInOutScreen} />
    <ManagerScheduleStack.Screen name="ScheduleOverview" component={ScheduleOverviewScreen} />
    <ManagerScheduleStack.Screen name="MyScheduleView" component={ScheduleOverviewScreen} />
    <ManagerScheduleStack.Screen name="ShiftDetail" component={ShiftDetailScreen} />
    <ManagerScheduleStack.Screen name="ShiftMarketplace" component={ShiftMarketplaceScreen} />
    <ManagerScheduleStack.Screen name="TimeOffRequest" component={TimeOffRequestScreen} />
  </ManagerScheduleStack.Navigator>
);

const ApprovalsNavigator = () => (
  <ApprovalsStack.Navigator screenOptions={{ headerShown: false }}>
    <ApprovalsStack.Screen name="ApprovalsList" component={ApprovalsScreen} />
    <ApprovalsStack.Screen name="TeamRequests" component={TeamScheduleScreen} />
    <ApprovalsStack.Screen name="ExpenseApprovals" component={ExpenseApprovalsScreen} />
    <ApprovalsStack.Screen name="SkillsVerification" component={SkillsVerificationScreen} />
    <ApprovalsStack.Screen name="MyTasksView" component={TasksScreen} />
    <ApprovalsStack.Screen name="TaskDetail" component={TaskDetailScreen} />
    <ApprovalsStack.Screen name="TaskExecution" component={TaskExecutionScreen} />
    <ApprovalsStack.Screen name="TaskCompletion" component={TaskCompletionScreen} />
    <ApprovalsStack.Screen name="MyRewardsView" component={RewardsScreen} />
  </ApprovalsStack.Navigator>
);

// ========== WORKER TABS (5 tabs) ==========

const WorkerTabs = () => {
  const { t } = useTranslation();
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.momentum,
        tabBarInactiveTintColor: colors.slate400,
        tabBarStyle,
        tabBarLabelStyle,
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: t('navigation.home', 'Home'),
          tabBarIcon: ({ color }) => <HomeIcon size={26} color={color} />,
        }}
      />
      <Tab.Screen
        name="Schedule"
        component={ScheduleNavigator}
        options={{
          tabBarLabel: t('navigation.schedule', 'Schedule'),
          tabBarIcon: ({ color }) => <CalendarIcon size={26} color={color} />,
        }}
      />
      <Tab.Screen
        name="Tasks"
        component={TasksNavigator}
        options={{
          tabBarLabel: t('navigation.tasks', 'Tasks'),
          tabBarIcon: ({ color }) => <CheckSquareIcon size={26} color={color} />,
        }}
      />
      <Tab.Screen
        name="Career"
        component={CareerNavigator}
        options={{
          tabBarLabel: t('navigation.career', 'Career'),
          tabBarIcon: ({ color }) => <TargetIcon size={26} color={color} />,
        }}
      />
      <Tab.Screen
        name="More"
        component={MoreScreen}
        options={{
          tabBarLabel: t('navigation.more', 'More'),
          tabBarIcon: ({ color }) => <MenuIcon size={26} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
};

// ========== MANAGER TABS (5 tabs) ==========

const ManagerTabs = () => {
  const { t } = useTranslation();
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.momentum,
        tabBarInactiveTintColor: colors.slate400,
        tabBarStyle,
        tabBarLabelStyle,
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={ManagerDashboardScreen}
        options={{
          tabBarLabel: t('navigation.dashboard', 'Dashboard'),
          tabBarIcon: ({ color }) => <BarChartIcon size={26} color={color} />,
        }}
      />
      <Tab.Screen
        name="Schedule"
        component={ManagerScheduleNavigator}
        options={{
          tabBarLabel: t('navigation.schedule', 'Schedule'),
          tabBarIcon: ({ color }) => <CalendarIcon size={26} color={color} />,
        }}
      />
      <Tab.Screen
        name="Tasks"
        component={TasksNavigator}
        options={{
          tabBarLabel: t('navigation.tasks', 'Tasks'),
          tabBarIcon: ({ color }) => <CheckSquareIcon size={26} color={color} />,
        }}
      />
      <Tab.Screen
        name="Team"
        component={JobPostingsScreen}
        options={{
          tabBarLabel: t('navigation.team', 'Team'),
          tabBarIcon: ({ color }) => <UsersIcon size={26} color={color} />,
        }}
      />
      <Tab.Screen
        name="More"
        component={ManagerMoreScreen}
        options={{
          tabBarLabel: t('navigation.more', 'More'),
          tabBarIcon: ({ color }) => <MenuIcon size={26} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
};

// ========== MAIN APP NAVIGATION ==========

export const AppNavigation = () => {
  const { isAuthenticated, user, onboardingComplete, checkOnboarding } = useAuthStore();

  React.useEffect(() => {
    checkOnboarding();
  }, []);

  return (
    <BrandingProvider>
    <ViewProvider>
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated && !onboardingComplete ? (
          <Stack.Group>
            <Stack.Screen name="OnboardingWelcome" component={OnboardingWelcomeScreen} />
            <Stack.Screen name="OnboardingSkills" component={OnboardingSkillsScreen} />
            <Stack.Screen name="OnboardingPreferences" component={OnboardingPreferencesScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
          </Stack.Group>
        ) : !isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : user?.role === 'manager' || user?.role === 'admin' ? (
          <Stack.Group>
            <Stack.Screen name="ManagerApp" component={ManagerTabs} />
            <Stack.Screen name="Chat" component={ChatScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name="Feed" component={FeedNavigator} />
            <Stack.Screen name="MyFeed" component={FeedNavigator} />
            <Stack.Screen name="MyTasks" component={TasksNavigator} />
            <Stack.Screen name="MyCareer" component={CareerNavigator} />
            <Stack.Screen name="MyRewards" component={RewardsScreen} />
            <Stack.Screen name="MySchedule" component={ScheduleNavigator} />
            <Stack.Screen name="Profile" component={ProfileNavigator} />
            <Stack.Screen name="Reports" component={ReportsScreen} />
            <Stack.Screen name="JobPostings" component={JobPostingsScreen} />
            <Stack.Screen name="Approvals" component={ApprovalsNavigator} />
            <Stack.Screen name="AIInsights" component={AIInsightsScreen} />
            <Stack.Screen name="RewardCatalog" component={RewardCatalogScreen} />
            <Stack.Screen name="TeamPerformance" component={TeamPerformanceScreen} />
            <Stack.Screen name="Offboarding" component={OffboardingScreen} />
          </Stack.Group>
        ) : (
          <Stack.Group>
            <Stack.Screen name="WorkerApp" component={WorkerTabs} />
            <Stack.Screen name="Chat" component={ChatScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name="Feed" component={FeedNavigator} />
            <Stack.Screen name="Profile" component={ProfileNavigator} />
            <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
            <Stack.Screen name="Badges" component={BadgesScreen} />
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
    </ViewProvider>
    </BrandingProvider>
  );
};
