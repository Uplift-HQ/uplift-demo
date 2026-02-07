import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StarIcon, CheckCircleIcon, UserIcon, CameraIcon } from '../../components/Icons';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { showAlert } from '../../utils/alert';

type PostType = 'recognition' | 'achievement' | 'announcement' | 'update';

export const CreatePostScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const [postType, setPostType] = useState<PostType>('recognition');
  const [content, setContent] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);

  const teammates = [
    { id: '1', name: 'Sarah Johnson', role: 'Floor Associate' },
    { id: '2', name: 'Mike Chen', role: 'Warehouse Lead' },
    { id: '3', name: 'Jessica Martinez', role: 'Customer Service' },
    { id: '4', name: 'David Kim', role: 'Team Lead' },
  ];

  const handlePost = () => {
    if (!content.trim()) {
      showAlert('Required', 'Please write something to share');
      return;
    }

    if (postType === 'recognition' && !selectedPerson) {
      showAlert('Required', 'Please select a teammate to recognize');
      return;
    }

    showAlert(
      'Posted!',
      'Your post has been shared with the team.',
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancelButton}>{t('common.cancel')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('feed.createPost')}</Text>
        <TouchableOpacity onPress={handlePost}>
          <Text style={styles.postButton}>{t('feed.post')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Post Type Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('screens.createPost.post_type')}</Text>
          <View style={styles.typeGrid}>
            {[
              { id: 'recognition', label: 'Recognition', icon: <StarIcon size={20} color={colors.warning} /> },
              { id: 'achievement', label: 'Achievement', icon: <CheckCircleIcon size={20} color={colors.success} /> },
              { id: 'announcement', label: 'Announcement', icon: <UserIcon size={20} color={colors.info} /> },
              { id: 'update', label: 'Update', icon: <CameraIcon size={20} color={colors.momentum} /> },
            ].map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.typeOption,
                  postType === type.id && styles.typeOptionSelected
                ]}
                onPress={() => setPostType(type.id as PostType)}
              >
                {type.icon}
                <Text style={[
                  styles.typeLabel,
                  postType === type.id && styles.typeLabelSelected
                ]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recognition - Select Person */}
        {postType === 'recognition' && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('screens.createPost.who_are_you_recognizing')}</Text>
            {teammates.map((person) => (
              <TouchableOpacity
                key={person.id}
                style={[
                  styles.personOption,
                  selectedPerson === person.id && styles.personOptionSelected
                ]}
                onPress={() => setSelectedPerson(person.id)}
              >
                <View style={styles.personAvatar}>
                  <Text style={styles.personInitials}>
                    {person.name.split(' ').map(n => n[0]).join('')}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.personName}>{person.name}</Text>
                  <Text style={styles.personRole}>{person.role}</Text>
                </View>
                {selectedPerson === person.id && (
                  <CheckCircleIcon size={24} color={colors.success} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Content */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            {postType === 'recognition' ? 'What did they do great?' : 'What would you like to share?'}
          </Text>
          <TextInput
            style={styles.textArea}
            placeholder={
              postType === 'recognition' 
                ? "e.g., 'Sarah went above and beyond helping a customer today...'"
                : "Share your thoughts with the team..."
            }
            placeholderTextColor={colors.slate400}
            multiline
            numberOfLines={6}
            value={content}
            onChangeText={setContent}
          />
          <Text style={styles.charCount}>{content.length}/500</Text>
        </View>

        {/* Tips */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>{t('screens.createPost.tips_for_great_posts')}</Text>
          <Text style={styles.tipsText}>• Be specific about what happened</Text>
          <Text style={styles.tipsText}>• Mention the impact it had</Text>
          <Text style={styles.tipsText}>• Tag relevant teammates</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: 60, paddingBottom: spacing.md, backgroundColor: colors.background, ...shadows.sm },
  cancelButton: { ...typography.body, color: colors.slate600 },
  title: { ...typography.h3, color: colors.slate900 },
  postButton: { ...typography.bodyBold, color: colors.momentum },
  
  content: { flex: 1 },
  
  section: { padding: spacing.lg },
  sectionLabel: { ...typography.bodyBold, color: colors.slate900, marginBottom: spacing.md },
  
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  typeOption: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.background, paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderRadius: borderRadius.md, borderWidth: 2, borderColor: 'transparent' },
  typeOptionSelected: { borderColor: colors.momentum, backgroundColor: colors.momentum + '10' },
  typeLabel: { ...typography.bodyBold, color: colors.slate700, fontSize: 14 },
  typeLabelSelected: { color: colors.momentum },
  
  personOption: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.background, padding: spacing.md, borderRadius: borderRadius.lg, marginBottom: spacing.sm, borderWidth: 2, borderColor: 'transparent' },
  personOptionSelected: { borderColor: colors.success, backgroundColor: colors.success + '10' },
  personAvatar: { width: 44, height: 44, backgroundColor: colors.momentum, borderRadius: borderRadius.full, alignItems: 'center', justifyContent: 'center' },
  personInitials: { ...typography.bodyBold, color: colors.background, fontSize: 14 },
  personName: { ...typography.bodyBold, color: colors.slate900 },
  personRole: { ...typography.caption, color: colors.slate600 },
  
  textArea: { backgroundColor: colors.background, padding: spacing.md, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.slate200, ...typography.body, color: colors.slate900, minHeight: 150, textAlignVertical: 'top' },
  charCount: { ...typography.caption, color: colors.slate500, textAlign: 'right', marginTop: spacing.xs },
  
  tipsCard: { backgroundColor: colors.info + '15', margin: spacing.lg, padding: spacing.lg, borderRadius: borderRadius.lg },
  tipsTitle: { ...typography.bodyBold, color: colors.info, marginBottom: spacing.sm },
  tipsText: { ...typography.body, color: colors.slate700, marginBottom: spacing.xs },
});
