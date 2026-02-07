import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  Animated,
  Dimensions,
  Image,
  ImageStyle,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useMySkills, useJobPostings } from '../../hooks/useData';
import {
  TrendingUpIcon,
  StarIcon,
  BriefcaseIcon,
  CheckCircleIcon,
  TargetIcon,
  AwardIcon,
  ClockIcon,
  BookOpenIcon,
  UsersIcon,
  ChevronRightIcon,
  PlayIcon,
  XIcon,
  LockIcon,
  ZapIcon,
  MapPinIcon,
  CalendarIcon,
  CheckIcon,
  ArrowRightIcon,
} from '../../components/Icons';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { showAlert } from '../../utils/alert';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Skills with categories and levels
interface Skill {
  id: string;
  name: string;
  category: 'core' | 'technical' | 'leadership' | 'compliance';
  level: number; // 0-4 (none, basic, intermediate, advanced, expert)
  maxLevel: number;
  xp: number;
  xpToNext: number;
  verified: boolean;
  expiresAt?: string;
  description: string;
}

// Career role
interface CareerRole {
  id: string;
  title: string;
  level: number;
  matchScore: number;
  requirements: { skill: string; met: boolean; required: boolean }[];
  readyIn: string;
  salary: { min: number; max: number };
  description: string;
}

// Training course
interface Course {
  id: string;
  title: string;
  category: string;
  duration: string;
  xpReward: number;
  progress: number;
  completed: boolean;
  locked: boolean;
  skillsAwarded: string[];
  thumbnail?: string;
}

// Achievement
interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  earnedAt?: string;
  progress?: number;
  total?: number;
}

const SKILL_CATEGORIES = {
  core: { label: 'Core Skills', color: colors.momentum },
  technical: { label: 'Technical', color: colors.info },
  leadership: { label: 'Leadership', color: colors.warning },
  compliance: { label: 'Compliance', color: colors.success },
};

const DEMO_COURSES: Course[] = [
  { id: '1', title: 'Customer Service Excellence', category: 'Core', duration: '45 min', xpReward: 150, progress: 100, completed: true, locked: false, skillsAwarded: ['Customer Service'] },
  { id: '2', title: 'Advanced Cash Handling', category: 'Technical', duration: '30 min', xpReward: 100, progress: 60, completed: false, locked: false, skillsAwarded: ['Cash Handling'] },
  { id: '3', title: 'Team Leadership Fundamentals', category: 'Leadership', duration: '1.5 hrs', xpReward: 250, progress: 0, completed: false, locked: false, skillsAwarded: ['Team Leadership'] },
  { id: '4', title: 'Inventory Management Pro', category: 'Technical', duration: '1 hr', xpReward: 200, progress: 0, completed: false, locked: false, skillsAwarded: ['Inventory Management'] },
  { id: '5', title: 'Food Hygiene Level 2', category: 'Compliance', duration: '2 hrs', xpReward: 300, progress: 0, completed: false, locked: true, skillsAwarded: ['Food Hygiene'] },
  { id: '6', title: 'Conflict Resolution Workshop', category: 'Leadership', duration: '1 hr', xpReward: 200, progress: 0, completed: false, locked: true, skillsAwarded: ['Conflict Resolution'] },
];

const DEMO_ACHIEVEMENTS: Achievement[] = [
  { id: '1', title: 'Customer Service Expert', description: 'Reached Advanced level in Customer Service', icon: <StarIcon size={20} color={colors.warning} />, earnedAt: 'Jan 5, 2026' },
  { id: '2', title: '100 Day Streak', description: 'Worked 100 days without missing a shift', icon: <TrendingUpIcon size={20} color={colors.success} />, earnedAt: 'Dec 28, 2025' },
  { id: '3', title: 'Team Player', description: 'Received 10 peer recognitions', icon: <UsersIcon size={20} color={colors.info} />, earnedAt: 'Dec 15, 2025' },
  { id: '4', title: 'Quick Learner', description: 'Complete 5 training courses', icon: <BookOpenIcon size={20} color={colors.momentum} />, progress: 2, total: 5 },
  { id: '5', title: 'Rising Star', description: 'Reach Team Lead eligibility', icon: <ZapIcon size={20} color={colors.warning} />, progress: 67, total: 100 },
];

const LEVEL_NAMES = ['None', 'Basic', 'Intermediate', 'Advanced', 'Expert'];

export const CareerPathScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const [selectedTab, setSelectedTab] = useState<'path' | 'skills' | 'training'>('path');
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [selectedRole, setSelectedRole] = useState<CareerRole | null>(null);
  const [skillModalVisible, setSkillModalVisible] = useState(false);
  const [roleModalVisible, setRoleModalVisible] = useState(false);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const currentRole = {
    title: 'Floor Associate',
    level: 2,
    since: 'March 2025',
    momentum: 85,
  };

  // Wire to real API hooks with demo fallbacks
  const { data: skillsData, loading: skillsLoading } = useMySkills();
  const { data: jobsData, loading: jobsLoading } = useJobPostings();

  // Map API skills to local Skill interface
  const skills: Skill[] = (skillsData?.skills ?? []).map((s: any) => ({
    id: s.id,
    name: s.name,
    category: s.category || 'core',
    level: s.level ?? 0,
    maxLevel: s.maxLevel ?? 4,
    xp: s.xp ?? 0,
    xpToNext: s.xpToNext ?? 1000,
    verified: s.verified ?? false,
    expiresAt: s.expiresAt,
    description: s.description ?? '',
  }));

  // Map API jobs to local CareerRole interface
  const roles: CareerRole[] = (jobsData?.jobs ?? []).map((j: any, idx: number) => ({
    id: j.id,
    title: j.title,
    level: idx + 3,
    matchScore: j.matchScore ?? 50,
    requirements: (j.requiredSkills || []).map((sk: string) => ({ skill: sk, met: false, required: true })),
    readyIn: j.matchScore && j.matchScore >= 85 ? 'Ready now' : '~6 months',
    salary: { min: j.hourlyRateMin ?? 13, max: j.hourlyRateMax ?? 18 },
    description: j.description ?? '',
  }));

  const courses = DEMO_COURSES;
  const achievements = DEMO_ACHIEVEMENTS;

  const isLoading = skillsLoading || jobsLoading;

  // Calculate totals
  const totalXP = skills.reduce((sum, s) => sum + s.xp, 0);
  const verifiedSkills = skills.filter(s => s.verified).length;
  const completedCourses = courses.filter(c => c.completed).length;

  const getMatchColor = (score: number) => {
    if (score >= 85) return colors.success;
    if (score >= 70) return colors.warning;
    return colors.slate500;
  };

  const getLevelColor = (level: number, maxLevel: number) => {
    const ratio = level / maxLevel;
    if (ratio >= 0.75) return colors.success;
    if (ratio >= 0.5) return colors.info;
    if (ratio >= 0.25) return colors.warning;
    return colors.slate400;
  };

  const openSkillDetail = (skill: Skill) => {
    setSelectedSkill(skill);
    setSkillModalVisible(true);
  };

  const openRoleDetail = (role: CareerRole) => {
    setSelectedRole(role);
    setRoleModalVisible(true);
  };

  const startCourse = (course: Course) => {
    if (course.locked) {
      showAlert(t('screens.careerPath.courseLocked'), t('screens.careerPath.courseLockedMsg'));
      return;
    }
    showAlert(
      t('screens.careerPath.startCourse'),
      `Begin "${course.title}"?\n\nDuration: ${course.duration}\nReward: ${course.xpReward} XP`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.start'), onPress: () => showAlert(t('screens.careerPath.courseStarted'), t('screens.careerPath.courseContentDemo')) },
      ]
    );
  };

  const renderSkillsByCategory = (category: keyof typeof SKILL_CATEGORIES) => {
    const categorySkills = skills.filter(s => s.category === category);
    const categoryConfig = SKILL_CATEGORIES[category];

    return (
      <View key={category} style={styles.skillCategory}>
        <View style={styles.skillCategoryHeader}>
          <View style={[styles.skillCategoryDot, { backgroundColor: categoryConfig.color }]} />
          <Text style={styles.skillCategoryTitle}>{categoryConfig.label}</Text>
          <Text style={styles.skillCategoryCount}>{t('skills.skillsCount', { count: categorySkills.length })}</Text>
        </View>
        {categorySkills.map((skill) => (
          <TouchableOpacity
            key={skill.id}
            style={styles.skillCard}
            onPress={() => openSkillDetail(skill)}
          >
            <View style={styles.skillCardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.skillName}>{skill.name}</Text>
                <Text style={styles.skillLevel}>
                  {LEVEL_NAMES[skill.level]} • {skill.xp}/{skill.xpToNext} XP
                </Text>
              </View>
              {skill.verified && (
                <View style={styles.verifiedBadge}>
                  <CheckCircleIcon size={14} color={colors.success} />
                </View>
              )}
            </View>
            <View style={styles.skillProgress}>
              <View style={styles.skillProgressBar}>
                <View
                  style={[
                    styles.skillProgressFill,
                    {
                      width: `${(skill.xp / skill.xpToNext) * 100}%`,
                      backgroundColor: getLevelColor(skill.level, skill.maxLevel),
                    },
                  ]}
                />
              </View>
              <View style={styles.skillLevelDots}>
                {Array.from({ length: skill.maxLevel }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.skillLevelDot,
                      i < skill.level && { backgroundColor: getLevelColor(skill.level, skill.maxLevel) },
                    ]}
                  />
                ))}
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← {t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('career.careerPath')}</Text>
        <Text style={styles.subtitle}>{t('career.yourCareerPath')}</Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {[
          { key: 'path', label: t('career.careerPath') },
          { key: 'skills', label: t('navigation.skills') },
          { key: 'training', label: t('screens.careerPath.training') },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, selectedTab === tab.key && styles.tabActive]}
            onPress={() => setSelectedTab(tab.key as any)}
          >
            <Text style={[styles.tabText, selectedTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading && (
          <ActivityIndicator size="large" color={colors.momentum} style={{ marginTop: spacing.xl }} />
        )}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* Career Path Tab */}
          {selectedTab === 'path' && (
            <>
              {/* Current Role Card */}
              <View style={styles.currentRoleCard}>
                <View style={styles.roleHeader}>
                  <BriefcaseIcon size={32} color={colors.background} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.currentRoleTitle}>{currentRole.title}</Text>
                    <Text style={styles.currentRoleMeta}>
                      {t('gamification.level', { level: currentRole.level })} • {t('screens.careerPath.since', { date: currentRole.since })}
                    </Text>
                  </View>
                </View>

                <View style={styles.momentumSection}>
                  <View style={styles.momentumHeader}>
                    <TrendingUpIcon size={16} color={colors.background} />
                    <Text style={styles.momentumLabel}>{t('screens.careerPath.momentumScore')}</Text>
                    <Text style={styles.momentumValue}>{currentRole.momentum}</Text>
                  </View>
                  <View style={styles.momentumBar}>
                    <View style={[styles.momentumProgress, { width: `${currentRole.momentum}%` }]} />
                  </View>
                </View>

                {/* XP Summary */}
                <View style={styles.xpSummary}>
                  <View style={styles.xpItem}>
                    <Text style={styles.xpValue}>{totalXP.toLocaleString()}</Text>
                    <Text style={styles.xpLabel}>{t('screens.careerPath.totalXP')}</Text>
                  </View>
                  <View style={styles.xpDivider} />
                  <View style={styles.xpItem}>
                    <Text style={styles.xpValue}>{verifiedSkills}</Text>
                    <Text style={styles.xpLabel}>{t('skills.verified')}</Text>
                  </View>
                  <View style={styles.xpDivider} />
                  <View style={styles.xpItem}>
                    <Text style={styles.xpValue}>{completedCourses}</Text>
                    <Text style={styles.xpLabel}>{t('screens.careerPath.courses')}</Text>
                  </View>
                </View>
              </View>

              {/* Career Ladder */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('career.progressToNext')}</Text>

                {roles.map((role, index) => (
                  <TouchableOpacity
                    key={role.id}
                    style={styles.pathCard}
                    onPress={() => openRoleDetail(role)}
                  >
                    <View style={styles.pathConnector}>
                      <View
                        style={[
                          styles.pathDot,
                          index === 0 && styles.pathDotActive,
                        ]}
                      />
                      {index < roles.length - 1 && <View style={styles.pathLine} />}
                    </View>

                    <View style={styles.pathContent}>
                      <View style={styles.pathHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.pathTitle}>{role.title}</Text>
                          <Text style={styles.pathSalary}>
                            £{role.salary.min}-{role.salary.max}/hr
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.matchBadge,
                            { backgroundColor: getMatchColor(role.matchScore) + '20' },
                          ]}
                        >
                          <Text
                            style={[styles.matchText, { color: getMatchColor(role.matchScore) }]}
                          >
                            {role.matchScore}%
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.readyIn}>{role.readyIn}</Text>

                      <View style={styles.requirements}>
                        {role.requirements.slice(0, 3).map((req, i) => (
                          <View key={i} style={styles.reqItem}>
                            {req.met ? (
                              <CheckCircleIcon size={14} color={colors.success} />
                            ) : (
                              <View style={styles.reqCircle} />
                            )}
                            <Text style={[styles.reqText, req.met && styles.reqTextMet]}>
                              {req.skill}
                            </Text>
                          </View>
                        ))}
                        {role.requirements.length > 3 && (
                          <Text style={styles.moreReqs}>
                            {t('screens.careerPath.moreRequirements', { count: role.requirements.length - 3 })}
                          </Text>
                        )}
                      </View>

                      {index === 0 && (
                        <TouchableOpacity
                          style={styles.applyButton}
                          onPress={() => openRoleDetail(role)}
                        >
                          <Text style={styles.applyButtonText}>{t('career.viewDetails')}</Text>
                          <ChevronRightIcon size={16} color={colors.background} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Achievements */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{t('gamification.achievements')}</Text>
                  <TouchableOpacity onPress={() => showAlert(t('gamification.achievements'), t('screens.careerPath.viewAllAchievements'))}>
                    <Text style={styles.seeAllText}>{t('common.seeAll')}</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.achievementsScroll}>
                  {achievements.map((achievement) => (
                    <View
                      key={achievement.id}
                      style={[
                        styles.achievementCard,
                        !achievement.earnedAt && styles.achievementCardLocked,
                      ]}
                    >
                      <View
                        style={[
                          styles.achievementIcon,
                          !achievement.earnedAt && styles.achievementIconLocked,
                        ]}
                      >
                        {achievement.icon}
                      </View>
                      <Text style={styles.achievementTitle}>{achievement.title}</Text>
                      {achievement.earnedAt ? (
                        <Text style={styles.achievementDate}>{achievement.earnedAt}</Text>
                      ) : (
                        <View style={styles.achievementProgress}>
                          <View style={styles.achievementProgressBar}>
                            <View
                              style={[
                                styles.achievementProgressFill,
                                { width: `${((achievement.progress || 0) / (achievement.total || 100)) * 100}%` },
                              ]}
                            />
                          </View>
                          <Text style={styles.achievementProgressText}>
                            {achievement.progress}/{achievement.total}
                          </Text>
                        </View>
                      )}
                    </View>
                  ))}
                </ScrollView>
              </View>

              {/* Growth Tips */}
              <View style={styles.tipsCard}>
                <TargetIcon size={24} color={colors.momentum} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.tipsTitle}>{t('screens.careerPath.nextGoal')}</Text>
                  <Text style={styles.tipsText}>
                    {t('screens.careerPath.nextGoalText')}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.tipAction}
                  onPress={() => setSelectedTab('training')}
                >
                  <ArrowRightIcon size={20} color={colors.momentum} />
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Skills Tab */}
          {selectedTab === 'skills' && (
            <>
              {/* Skills Overview */}
              <View style={styles.skillsOverview}>
                <View style={styles.skillsOverviewItem}>
                  <Text style={styles.skillsOverviewValue}>{skills.length}</Text>
                  <Text style={styles.skillsOverviewLabel}>{t('screens.careerPath.totalSkills')}</Text>
                </View>
                <View style={styles.skillsOverviewDivider} />
                <View style={styles.skillsOverviewItem}>
                  <Text style={styles.skillsOverviewValue}>{verifiedSkills}</Text>
                  <Text style={styles.skillsOverviewLabel}>{t('skills.verified')}</Text>
                </View>
                <View style={styles.skillsOverviewDivider} />
                <View style={styles.skillsOverviewItem}>
                  <Text style={styles.skillsOverviewValue}>
                    {skills.filter(s => s.level === s.maxLevel).length}
                  </Text>
                  <Text style={styles.skillsOverviewLabel}>{t('screens.careerPath.mastered')}</Text>
                </View>
              </View>

              {/* Skills by Category */}
              {(Object.keys(SKILL_CATEGORIES) as Array<keyof typeof SKILL_CATEGORIES>).map(
                (category) => renderSkillsByCategory(category)
              )}

              <View style={{ height: 20 }} />
            </>
          )}

          {/* Training Tab */}
          {selectedTab === 'training' && (
            <>
              {/* Training Stats */}
              <View style={styles.trainingStats}>
                <View style={styles.trainingStatItem}>
                  <BookOpenIcon size={24} color={colors.momentum} />
                  <Text style={styles.trainingStatValue}>{completedCourses}/{courses.length}</Text>
                  <Text style={styles.trainingStatLabel}>{t('common.completed')}</Text>
                </View>
                <View style={styles.trainingStatDivider} />
                <View style={styles.trainingStatItem}>
                  <ClockIcon size={24} color={colors.info} />
                  <Text style={styles.trainingStatValue}>
                    {courses.filter(c => c.progress > 0 && !c.completed).length}
                  </Text>
                  <Text style={styles.trainingStatLabel}>{t('screens.careerPath.inProgress')}</Text>
                </View>
                <View style={styles.trainingStatDivider} />
                <View style={styles.trainingStatItem}>
                  <ZapIcon size={24} color={colors.success} />
                  <Text style={styles.trainingStatValue}>
                    {courses.filter(c => c.completed).reduce((sum, c) => sum + c.xpReward, 0)}
                  </Text>
                  <Text style={styles.trainingStatLabel}>{t('screens.careerPath.xpEarned')}</Text>
                </View>
              </View>

              {/* Continue Learning */}
              {courses.filter(c => c.progress > 0 && !c.completed).length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>{t('screens.careerPath.continueLearning')}</Text>
                  {courses
                    .filter(c => c.progress > 0 && !c.completed)
                    .map((course) => (
                      <TouchableOpacity
                        key={course.id}
                        style={styles.courseCard}
                        onPress={() => startCourse(course)}
                      >
                        <View style={styles.courseIcon}>
                          <PlayIcon size={20} color={colors.momentum} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.courseTitle}>{course.title}</Text>
                          <Text style={styles.courseMeta}>
                            {course.category} • {course.duration} • {course.xpReward} XP
                          </Text>
                          <View style={styles.courseProgress}>
                            <View style={styles.courseProgressBar}>
                              <View
                                style={[styles.courseProgressFill, { width: `${course.progress}%` }]}
                              />
                            </View>
                            <Text style={styles.courseProgressText}>{course.progress}%</Text>
                          </View>
                        </View>
                        <ChevronRightIcon size={20} color={colors.slate400} />
                      </TouchableOpacity>
                    ))}
                </View>
              )}

              {/* Available Courses */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('screens.careerPath.availableCourses')}</Text>
                {courses
                  .filter(c => c.progress === 0 && !c.completed)
                  .map((course) => (
                    <TouchableOpacity
                      key={course.id}
                      style={[styles.courseCard, course.locked && styles.courseCardLocked]}
                      onPress={() => startCourse(course)}
                    >
                      <View
                        style={[styles.courseIcon, course.locked && styles.courseIconLocked]}
                      >
                        {course.locked ? (
                          <LockIcon size={20} color={colors.slate400} />
                        ) : (
                          <BookOpenIcon size={20} color={colors.momentum} />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[styles.courseTitle, course.locked && styles.courseTitleLocked]}
                        >
                          {course.title}
                        </Text>
                        <Text style={styles.courseMeta}>
                          {course.category} • {course.duration} • {course.xpReward} XP
                        </Text>
                        <View style={styles.courseSkills}>
                          {course.skillsAwarded.map((skill, i) => (
                            <View key={i} style={styles.courseSkillTag}>
                              <Text style={styles.courseSkillText}>{skill}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                      {!course.locked && <ChevronRightIcon size={20} color={colors.slate400} />}
                    </TouchableOpacity>
                  ))}
              </View>

              {/* Completed Courses */}
              {courses.filter(c => c.completed).length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>{t('common.completed')}</Text>
                  {courses
                    .filter(c => c.completed)
                    .map((course) => (
                      <View key={course.id} style={styles.completedCourseCard}>
                        <View style={styles.completedIcon}>
                          <CheckCircleIcon size={20} color={colors.success} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.completedTitle}>{course.title}</Text>
                          <Text style={styles.completedMeta}>
                            {course.category} • {course.xpReward} XP earned
                          </Text>
                        </View>
                      </View>
                    ))}
                </View>
              )}
            </>
          )}

          <View style={{ height: 100 }} />
        </Animated.View>
      </ScrollView>

      {/* Skill Detail Modal */}
      <Modal
        visible={skillModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSkillModalVisible(false)}
      >
        {selectedSkill && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedSkill.name}</Text>
              <TouchableOpacity onPress={() => setSkillModalVisible(false)}>
                <XIcon size={24} color={colors.slate700} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalContent}>
                {/* Skill Level */}
                <View style={styles.skillLevelCard}>
                  <View style={styles.skillLevelHeader}>
                    <View
                      style={[
                        styles.skillLevelBadge,
                        { backgroundColor: getLevelColor(selectedSkill.level, selectedSkill.maxLevel) },
                      ]}
                    >
                      <Text style={styles.skillLevelBadgeText}>
                        {LEVEL_NAMES[selectedSkill.level]}
                      </Text>
                    </View>
                    {selectedSkill.verified && (
                      <View style={styles.skillVerifiedBadge}>
                        <CheckCircleIcon size={14} color={colors.success} />
                        <Text style={styles.skillVerifiedText}>{t('skills.verified')}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.skillXPSection}>
                    <Text style={styles.skillXPValue}>
                      {selectedSkill.xp} / {selectedSkill.xpToNext} XP
                    </Text>
                    <Text style={styles.skillXPLabel}>
                      to {LEVEL_NAMES[Math.min(selectedSkill.level + 1, selectedSkill.maxLevel)]}
                    </Text>
                  </View>

                  <View style={styles.skillFullProgressBar}>
                    <View
                      style={[
                        styles.skillFullProgressFill,
                        {
                          width: `${(selectedSkill.xp / selectedSkill.xpToNext) * 100}%`,
                          backgroundColor: getLevelColor(selectedSkill.level, selectedSkill.maxLevel),
                        },
                      ]}
                    />
                  </View>

                  <View style={styles.skillLevelIndicators}>
                    {Array.from({ length: selectedSkill.maxLevel }).map((_, i) => (
                      <View key={i} style={styles.skillLevelIndicator}>
                        <View
                          style={[
                            styles.skillLevelIndicatorDot,
                            i < selectedSkill.level && {
                              backgroundColor: getLevelColor(selectedSkill.level, selectedSkill.maxLevel),
                            },
                          ]}
                        />
                        <Text style={styles.skillLevelIndicatorText}>{LEVEL_NAMES[i + 1]}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Description */}
                <View style={styles.skillDescription}>
                  <Text style={styles.skillDescriptionLabel}>{t('screens.careerPath.aboutThisSkill')}</Text>
                  <Text style={styles.skillDescriptionText}>{selectedSkill.description}</Text>
                </View>

                {/* Expiry */}
                {selectedSkill.expiresAt && (
                  <View style={styles.skillExpiry}>
                    <CalendarIcon size={16} color={colors.warning} />
                    <Text style={styles.skillExpiryText}>
                      {t('screens.careerPath.certificationExpires', { date: selectedSkill.expiresAt })}
                    </Text>
                  </View>
                )}

                {/* Actions */}
                <View style={styles.skillActions}>
                  {!selectedSkill.verified && (
                    <TouchableOpacity
                      style={styles.skillActionButton}
                      onPress={() =>
                        showAlert(t('skills.requestVerification'), t('screens.careerPath.verificationRequestSent'))
                      }
                    >
                      <CheckIcon size={18} color={colors.background} />
                      <Text style={styles.skillActionText}>{t('skills.requestVerification')}</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.skillActionButton, styles.skillActionButtonOutline]}
                    onPress={() => {
                      setSkillModalVisible(false);
                      setSelectedTab('training');
                    }}
                  >
                    <BookOpenIcon size={18} color={colors.momentum} />
                    <Text style={[styles.skillActionText, styles.skillActionTextOutline]}>
                      {t('screens.careerPath.findTraining')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>

      {/* Role Detail Modal */}
      <Modal
        visible={roleModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setRoleModalVisible(false)}
      >
        {selectedRole && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedRole.title}</Text>
              <TouchableOpacity onPress={() => setRoleModalVisible(false)}>
                <XIcon size={24} color={colors.slate700} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalContent}>
                {/* Match Score */}
                <View
                  style={[
                    styles.roleMatchCard,
                    { backgroundColor: getMatchColor(selectedRole.matchScore) + '15' },
                  ]}
                >
                  <TargetIcon size={32} color={getMatchColor(selectedRole.matchScore)} />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.roleMatchValue,
                        { color: getMatchColor(selectedRole.matchScore) },
                      ]}
                    >
                      {t('career.matchPercent', { percent: selectedRole.matchScore })}
                    </Text>
                    <Text style={styles.roleMatchLabel}>{selectedRole.readyIn}</Text>
                  </View>
                </View>

                {/* Salary */}
                <View style={styles.roleSalaryCard}>
                  <Text style={styles.roleSalaryLabel}>{t('screens.careerPath.salaryRange')}</Text>
                  <Text style={styles.roleSalaryValue}>
                    £{selectedRole.salary.min} - £{selectedRole.salary.max}/hr
                  </Text>
                </View>

                {/* Description */}
                <View style={styles.roleDescription}>
                  <Text style={styles.roleDescriptionText}>{selectedRole.description}</Text>
                </View>

                {/* Requirements */}
                <View style={styles.roleRequirements}>
                  <Text style={styles.roleRequirementsTitle}>{t('career.requirements')}</Text>
                  {selectedRole.requirements.map((req, i) => (
                    <View key={i} style={styles.roleReqItem}>
                      {req.met ? (
                        <CheckCircleIcon size={20} color={colors.success} />
                      ) : (
                        <View style={styles.roleReqCircle} />
                      )}
                      <Text
                        style={[styles.roleReqText, req.met && styles.roleReqTextMet]}
                      >
                        {req.skill}
                      </Text>
                      {req.required && (
                        <View style={styles.roleReqRequired}>
                          <Text style={styles.roleReqRequiredText}>{t('common.required')}</Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>

                {/* Action */}
                {selectedRole.matchScore >= 80 && (
                  <TouchableOpacity
                    style={styles.roleApplyButton}
                    onPress={() =>
                      showAlert(
                        t('career.interestSubmitted'),
                        t('career.interestSubmittedMessage')
                      )
                    }
                  >
                    <Text style={styles.roleApplyText}>{t('career.expressInterest')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },

  // Header
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    ...shadows.sm,
  },
  backButton: {
    marginBottom: spacing.sm,
  },
  backButtonText: {
    ...typography.bodyBold,
    color: colors.momentum,
  },
  title: {
    ...typography.h2,
    color: colors.slate900,
  },
  subtitle: {
    ...typography.body,
    color: colors.slate600,
    marginTop: spacing.xs,
  },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate200,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.momentum,
  },
  tabText: {
    ...typography.bodyBold,
    color: colors.slate500,
    fontSize: 14,
  },
  tabTextActive: {
    color: colors.momentum,
  },

  content: {
    flex: 1,
  },

  // Current Role Card
  currentRoleCard: {
    backgroundColor: colors.momentum,
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    ...shadows.lg,
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  currentRoleTitle: {
    ...typography.h2,
    color: colors.background,
  },
  currentRoleMeta: {
    ...typography.body,
    color: colors.background,
    opacity: 0.9,
    marginTop: spacing.xs,
  },
  momentumSection: {
    marginBottom: spacing.lg,
  },
  momentumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  momentumLabel: {
    ...typography.body,
    color: colors.background,
    flex: 1,
    opacity: 0.9,
  },
  momentumValue: {
    ...typography.h2,
    color: colors.background,
    fontWeight: '800',
  },
  momentumBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  momentumProgress: {
    height: '100%',
    backgroundColor: colors.background,
    borderRadius: 3,
  },
  xpSummary: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  xpItem: {
    flex: 1,
    alignItems: 'center',
  },
  xpValue: {
    ...typography.h3,
    color: colors.background,
    fontWeight: '800',
  },
  xpLabel: {
    ...typography.caption,
    color: colors.background,
    opacity: 0.8,
    marginTop: 2,
  },
  xpDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },

  // Section
  section: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.slate900,
    marginBottom: spacing.md,
  },
  seeAllText: {
    ...typography.bodyBold,
    color: colors.momentum,
    fontSize: 14,
  },

  // Path Card
  pathCard: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  pathConnector: {
    width: 24,
    alignItems: 'center',
    marginEnd: spacing.md,
  },
  pathDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: colors.slate300,
    backgroundColor: colors.background,
  },
  pathDotActive: {
    borderColor: colors.momentum,
    backgroundColor: colors.momentum,
  },
  pathLine: {
    flex: 1,
    width: 3,
    backgroundColor: colors.slate200,
    marginVertical: spacing.xs,
  },
  pathContent: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    ...shadows.md,
  },
  pathHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  pathTitle: {
    ...typography.h3,
    color: colors.slate900,
  },
  pathSalary: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '600',
    marginTop: 2,
  },
  matchBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  matchText: {
    ...typography.bodyBold,
    fontSize: 14,
  },
  readyIn: {
    ...typography.bodyBold,
    color: colors.slate600,
    marginBottom: spacing.md,
  },
  requirements: {
    gap: spacing.sm,
  },
  reqItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  reqCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.slate300,
  },
  reqText: {
    ...typography.body,
    color: colors.slate600,
    fontSize: 14,
  },
  reqTextMet: {
    color: colors.success,
  },
  moreReqs: {
    ...typography.caption,
    color: colors.slate400,
    marginStart: 22,
    marginTop: spacing.xs,
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.momentum,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
  },
  applyButtonText: {
    ...typography.bodyBold,
    color: colors.background,
  },

  // Achievements
  achievementsScroll: {
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
    marginTop: -spacing.md,
  },
  achievementCard: {
    width: 140,
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginEnd: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  achievementCardLocked: {
    backgroundColor: colors.slate50,
  },
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  achievementIconLocked: {
    backgroundColor: colors.slate200,
  },
  achievementTitle: {
    ...typography.bodyBold,
    color: colors.slate900,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  achievementDate: {
    ...typography.caption,
    color: colors.slate500,
    fontSize: 11,
  },
  achievementProgress: {
    width: '100%',
  },
  achievementProgressBar: {
    height: 4,
    backgroundColor: colors.slate200,
    borderRadius: 2,
    overflow: 'hidden',
  },
  achievementProgressFill: {
    height: '100%',
    backgroundColor: colors.momentum,
    borderRadius: 2,
  },
  achievementProgressText: {
    ...typography.caption,
    color: colors.slate500,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
  },

  // Tips Card
  tipsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.momentum + '15',
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    borderStartWidth: 4,
    borderStartColor: colors.momentum,
  },
  tipsTitle: {
    ...typography.bodyBold,
    color: colors.momentum,
    marginBottom: spacing.xs,
  },
  tipsText: {
    ...typography.body,
    color: colors.slate700,
    lineHeight: 20,
    fontSize: 14,
  },
  tipAction: {
    padding: spacing.sm,
  },

  // Skills Overview
  skillsOverview: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    ...shadows.sm,
  },
  skillsOverviewItem: {
    flex: 1,
    alignItems: 'center',
  },
  skillsOverviewValue: {
    ...typography.h2,
    color: colors.slate900,
    fontWeight: '800',
  },
  skillsOverviewLabel: {
    ...typography.caption,
    color: colors.slate500,
    marginTop: spacing.xs,
  },
  skillsOverviewDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.slate200,
  },

  // Skill Category
  skillCategory: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  skillCategoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  skillCategoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  skillCategoryTitle: {
    ...typography.bodyBold,
    color: colors.slate900,
    flex: 1,
  },
  skillCategoryCount: {
    ...typography.caption,
    color: colors.slate500,
  },

  // Skill Card
  skillCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  skillCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  skillName: {
    ...typography.bodyBold,
    color: colors.slate900,
  },
  skillLevel: {
    ...typography.caption,
    color: colors.slate500,
    marginTop: 2,
  },
  verifiedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.success + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skillProgress: {
    gap: spacing.sm,
  },
  skillProgressBar: {
    height: 4,
    backgroundColor: colors.slate200,
    borderRadius: 2,
    overflow: 'hidden',
  },
  skillProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  skillLevelDots: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  skillLevelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.slate200,
  },

  // Training Stats
  trainingStats: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    ...shadows.sm,
  },
  trainingStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  trainingStatValue: {
    ...typography.h2,
    color: colors.slate900,
    fontWeight: '800',
    marginTop: spacing.sm,
  },
  trainingStatLabel: {
    ...typography.caption,
    color: colors.slate500,
    marginTop: spacing.xs,
  },
  trainingStatDivider: {
    width: 1,
    height: 60,
    backgroundColor: colors.slate200,
  },

  // Course Card
  courseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.background,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  courseCardLocked: {
    backgroundColor: colors.slate50,
    opacity: 0.7,
  },
  courseIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.momentum + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  courseIconLocked: {
    backgroundColor: colors.slate200,
  },
  courseTitle: {
    ...typography.bodyBold,
    color: colors.slate900,
  },
  courseTitleLocked: {
    color: colors.slate500,
  },
  courseMeta: {
    ...typography.caption,
    color: colors.slate500,
    marginTop: 2,
  },
  courseProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  courseProgressBar: {
    flex: 1,
    height: 4,
    backgroundColor: colors.slate200,
    borderRadius: 2,
    overflow: 'hidden',
  },
  courseProgressFill: {
    height: '100%',
    backgroundColor: colors.momentum,
    borderRadius: 2,
  },
  courseProgressText: {
    ...typography.caption,
    color: colors.momentum,
    fontWeight: '600',
  },
  courseSkills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  courseSkillTag: {
    backgroundColor: colors.slate100,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  courseSkillText: {
    ...typography.caption,
    color: colors.slate600,
    fontSize: 10,
  },

  // Completed Course
  completedCourseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.success + '10',
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.sm,
  },
  completedIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.success + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedTitle: {
    ...typography.bodyBold,
    color: colors.slate800,
  },
  completedMeta: {
    ...typography.caption,
    color: colors.success,
    marginTop: 2,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate200,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.slate900,
  },
  modalContent: {
    padding: spacing.lg,
  },

  // Skill Modal
  skillLevelCard: {
    backgroundColor: colors.slate50,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  skillLevelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  skillLevelBadge: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  skillLevelBadgeText: {
    ...typography.bodyBold,
    color: colors.background,
  },
  skillVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.success + '20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  skillVerifiedText: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '600',
  },
  skillXPSection: {
    marginBottom: spacing.md,
  },
  skillXPValue: {
    ...typography.h2,
    color: colors.slate900,
    fontWeight: '800',
  },
  skillXPLabel: {
    ...typography.caption,
    color: colors.slate500,
  },
  skillFullProgressBar: {
    height: 8,
    backgroundColor: colors.slate200,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  skillFullProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  skillLevelIndicators: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  skillLevelIndicator: {
    alignItems: 'center',
  },
  skillLevelIndicatorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.slate200,
    marginBottom: spacing.xs,
  },
  skillLevelIndicatorText: {
    ...typography.caption,
    color: colors.slate500,
    fontSize: 10,
  },
  skillDescription: {
    marginBottom: spacing.lg,
  },
  skillDescriptionLabel: {
    ...typography.bodyBold,
    color: colors.slate900,
    marginBottom: spacing.sm,
  },
  skillDescriptionText: {
    ...typography.body,
    color: colors.slate600,
    lineHeight: 22,
  },
  skillExpiry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warning + '15',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  skillExpiryText: {
    ...typography.body,
    color: colors.warning,
    fontSize: 14,
  },
  skillActions: {
    gap: spacing.md,
  },
  skillActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.momentum,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.xl,
  },
  skillActionButtonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.momentum,
  },
  skillActionText: {
    ...typography.bodyBold,
    color: colors.background,
  },
  skillActionTextOutline: {
    color: colors.momentum,
  },

  // Role Modal
  roleMatchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.lg,
  },
  roleMatchValue: {
    ...typography.h2,
    fontWeight: '800',
  },
  roleMatchLabel: {
    ...typography.body,
    color: colors.slate600,
    marginTop: 2,
  },
  roleSalaryCard: {
    backgroundColor: colors.slate50,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.lg,
  },
  roleSalaryLabel: {
    ...typography.caption,
    color: colors.slate500,
    marginBottom: spacing.xs,
  },
  roleSalaryValue: {
    ...typography.h2,
    color: colors.success,
    fontWeight: '800',
  },
  roleDescription: {
    marginBottom: spacing.lg,
  },
  roleDescriptionText: {
    ...typography.body,
    color: colors.slate700,
    lineHeight: 22,
  },
  roleRequirements: {
    marginBottom: spacing.lg,
  },
  roleRequirementsTitle: {
    ...typography.bodyBold,
    color: colors.slate900,
    marginBottom: spacing.md,
  },
  roleReqItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  roleReqCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.slate300,
  },
  roleReqText: {
    ...typography.body,
    color: colors.slate600,
    flex: 1,
  },
  roleReqTextMet: {
    color: colors.success,
  },
  roleReqRequired: {
    backgroundColor: colors.slate100,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  roleReqRequiredText: {
    ...typography.caption,
    color: colors.slate500,
    fontSize: 10,
  },
  roleApplyButton: {
    backgroundColor: colors.momentum,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
  },
  roleApplyText: {
    ...typography.h3,
    color: colors.background,
  },
});
