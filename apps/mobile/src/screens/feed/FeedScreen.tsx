import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, Dimensions, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  HeartIcon, MessageCircleIcon, ShareIcon, PlusIcon, BellIcon, StarIcon,
  AwardIcon, TrendingUpIcon, ImageIcon, VideoIcon, CalendarIcon, UserIcon
} from '../../components/Icons';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { showAlert } from '../../utils/alert';
import { useFeed } from '../../hooks/useData';
import { api } from '../../services/api';

const { width: screenWidth } = Dimensions.get('window');

interface PostMedia {
  type: 'image' | 'video';
  url: string;
  thumbnail?: string;
}

interface Post {
  id: string;
  author: { name: string; role: string; initials: string; avatar?: string };
  content: string;
  type: 'recognition' | 'achievement' | 'announcement' | 'milestone' | 'update';
  media?: PostMedia[];
  likes: number;
  comments: number;
  timeAgo: string;
  liked: boolean;
  mentioned?: string[];
  badge?: { name: string; color: string };
}

export const FeedScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const { data: feedData, loading, error, refetch } = useFeed();
  const [localLikes, setLocalLikes] = useState<Record<string, boolean>>({});
  const [localLikeCounts, setLocalLikeCounts] = useState<Record<string, number>>({});

  const posts: Post[] = (feedData?.posts || []).map((p: any) => {
    const initials = (p.author?.name || '')
      .split(' ')
      .map((w: string) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    const isLiked = localLikes[p.id] !== undefined ? localLikes[p.id] : !!p.liked;
    const likeCount = localLikeCounts[p.id] !== undefined ? localLikeCounts[p.id] : (p.likes || 0);

    // Compute timeAgo from createdAt if not provided
    let timeAgo = p.timeAgo;
    if (!timeAgo && p.createdAt) {
      const diffMs = Date.now() - new Date(p.createdAt).getTime();
      const diffH = Math.floor(diffMs / 3600000);
      if (diffH < 1) timeAgo = 'Just now';
      else if (diffH < 24) timeAgo = `${diffH}h ago`;
      else timeAgo = `${Math.floor(diffH / 24)}d ago`;
    }

    return {
      id: p.id,
      author: {
        name: p.author?.name || 'Unknown',
        role: p.author?.role || '',
        initials,
        avatar: p.author?.avatar || undefined,
      },
      content: p.content || '',
      type: p.type || 'update',
      media: p.media,
      likes: likeCount,
      comments: p.comments || 0,
      timeAgo: timeAgo || '',
      liked: isLiked,
      mentioned: p.mentioned,
      badge: p.badge,
    };
  });

  const handleLike = useCallback(async (postId: string) => {
    const currentPost = posts.find(p => p.id === postId);
    if (!currentPost) return;

    const wasLiked = currentPost.liked;
    // Optimistic update
    setLocalLikes(prev => ({ ...prev, [postId]: !wasLiked }));
    setLocalLikeCounts(prev => ({
      ...prev,
      [postId]: currentPost.likes + (wasLiked ? -1 : 1),
    }));

    try {
      if (wasLiked) {
        await api.unlikeFeedPost(postId);
      } else {
        await api.likeFeedPost(postId);
      }
    } catch (_e) {
      // Revert on failure
      setLocalLikes(prev => ({ ...prev, [postId]: wasLiked }));
      setLocalLikeCounts(prev => ({ ...prev, [postId]: currentPost.likes }));
    }
  }, [posts]);

  const handleComment = useCallback(async (postId: string) => {
    showAlert(t('feed.comment'), t('feed.commentsCount', { count: posts.find(p => p.id === postId)?.comments || 0 }));
  }, [posts, t]);

  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'recognition':
        return { color: colors.warning, label: t('feed.recognition'), icon: <StarIcon size={14} color={colors.warning} /> };
      case 'achievement':
        return { color: colors.success, label: t('feed.achievement'), icon: <AwardIcon size={14} color={colors.success} /> };
      case 'announcement':
        return { color: colors.info, label: t('feed.announcement'), icon: <BellIcon size={14} color={colors.info} /> };
      case 'milestone':
        return { color: colors.momentum, label: t('feed.milestone'), icon: <TrendingUpIcon size={14} color={colors.momentum} /> };
      default:
        return { color: colors.slate500, label: t('feed.update'), icon: <CalendarIcon size={14} color={colors.slate500} /> };
    }
  };

  const renderMedia = (media: PostMedia[]) => {
    if (!media || media.length === 0) return null;

    if (media.length === 1) {
      const item = media[0];
      return (
        <TouchableOpacity style={styles.singleMedia} onPress={() => showAlert('Media', 'Full media viewer available in the live app.')}>
          <Image
            source={{ uri: item.type === 'video' ? item.thumbnail : item.url }}
            style={styles.singleMediaImage}
            resizeMode="cover"
          />
          {item.type === 'video' && (
            <View style={styles.videoOverlay}>
              <View style={styles.playButton}>
                <VideoIcon size={32} color={colors.background} />
              </View>
            </View>
          )}
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.mediaGrid}>
        {media.slice(0, 4).map((item, index) => (
          <TouchableOpacity key={index} style={styles.gridItem}>
            <Image
              source={{ uri: item.type === 'video' ? item.thumbnail : item.url }}
              style={styles.gridImage}
              resizeMode="cover"
            />
            {item.type === 'video' && (
              <View style={styles.videoOverlay}>
                <VideoIcon size={20} color={colors.background} />
              </View>
            )}
            {index === 3 && media.length > 4 && (
              <View style={styles.moreOverlay}>
                <Text style={styles.moreText}>+{media.length - 4}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>{t('feed.title')}</Text>
            <Text style={styles.subtitle}>{t('feed.teamUpdates')}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={() => navigation.navigate('Notifications')}
        >
          <BellIcon size={24} color={colors.slate700} />
          <View style={styles.notificationBadge}>
            <Text style={styles.notificationCount}>3</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Create Post Card */}
      <TouchableOpacity
        style={styles.createPostCard}
        onPress={() => navigation.navigate('CreatePost')}
      >
        <View style={styles.createPostAvatar}>
          <UserIcon size={20} color={colors.background} />
        </View>
        <View style={styles.createPostInput}>
          <Text style={styles.createPostPlaceholder}>{t('feed.shareUpdate')}</Text>
        </View>
        <View style={styles.createPostActions}>
          <TouchableOpacity
            style={styles.createPostAction}
            onPress={() => navigation.navigate('CreatePost', { type: 'image' })}
          >
            <ImageIcon size={20} color={colors.success} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.createPostAction}
            onPress={() => navigation.navigate('CreatePost', { type: 'recognition' })}
          >
            <StarIcon size={20} color={colors.warning} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {/* Posts */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.momentum} />
            <Text style={styles.loadingText}>{t('common.loading', 'Loading...')}</Text>
          </View>
        )}

        {!loading && posts.length === 0 && (
          <View style={styles.emptyContainer}>
            <MessageCircleIcon size={48} color={colors.slate300} />
            <Text style={styles.emptyTitle}>{t('feed.noPosts', 'No posts yet')}</Text>
            <Text style={styles.emptySubtitle}>{t('feed.beFirst', 'Be the first to share an update with your team!')}</Text>
          </View>
        )}

        {posts.map((post) => {
          const typeConfig = getTypeConfig(post.type);

          return (
            <View key={post.id} style={styles.postCard}>
              {/* Post Header */}
              <View style={styles.postHeader}>
                <View style={styles.authorAvatar}>
                  {post.author.avatar ? (
                    <Image source={{ uri: post.author.avatar }} style={styles.avatarImage} />
                  ) : (
                    <Text style={styles.authorInitials}>{post.author.initials}</Text>
                  )}
                </View>
                <View style={styles.authorInfo}>
                  <Text style={styles.authorName}>{post.author.name}</Text>
                  <View style={styles.authorMeta}>
                    <Text style={styles.authorRole}>{post.author.role}</Text>
                    <Text style={styles.metaDot}>•</Text>
                    <Text style={styles.timeAgo}>{post.timeAgo}</Text>
                  </View>
                </View>
                <View style={[styles.typeBadge, { backgroundColor: typeConfig.color + '15' }]}>
                  {typeConfig.icon}
                </View>
              </View>

              {/* Badge if achievement/milestone */}
              {post.badge && (
                <View style={[styles.badgeBanner, { backgroundColor: post.badge.color + '15' }]}>
                  <AwardIcon size={20} color={post.badge.color} />
                  <Text style={[styles.badgeText, { color: post.badge.color }]}>
                    {post.badge.name}
                  </Text>
                </View>
              )}

              {/* Post Content */}
              <Text style={styles.postContent}>
                {post.content}
                {post.mentioned && post.mentioned.length > 0 && (
                  <Text style={styles.mention}> @{post.mentioned.join(' @')}</Text>
                )}
              </Text>

              {/* Media */}
              {renderMedia(post.media || [])}

              {/* Engagement Stats */}
              <View style={styles.engagementStats}>
                <View style={styles.likesInfo}>
                  <View style={styles.likeAvatars}>
                    <HeartIcon size={14} color={colors.error} />
                  </View>
                  <Text style={styles.engagementText}>{post.likes} likes</Text>
                </View>
                <Text style={styles.engagementText}>{post.comments} comments</Text>
              </View>

              {/* Post Actions */}
              <View style={styles.postActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleLike(post.id)}
                >
                  <HeartIcon
                    size={22}
                    color={post.liked ? colors.error : colors.slate500}
                  />
                  <Text style={[styles.actionText, post.liked && { color: colors.error }]}>
                    {t('feed.like')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleComment(post.id)}
                >
                  <MessageCircleIcon size={22} color={colors.slate500} />
                  <Text style={styles.actionText}>{t('feed.comment')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => showAlert(t('feed.share'), t('feed.shareMessage'), [
                    { text: t('common.cancel'), style: 'cancel' },
                    { text: t('feed.share'), onPress: () => showAlert(t('common.success'), t('feed.shared')) }
                  ])}
                >
                  <ShareIcon size={22} color={colors.slate500} />
                  <Text style={styles.actionText}>{t('feed.share')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {/* End of feed */}
        <View style={styles.feedEnd}>
          <Text style={styles.feedEndText}>{t('feed.allCaughtUp')}</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    ...shadows.sm
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: { fontSize: 20, color: colors.slate700 },
  title: { ...typography.h2, color: colors.slate900 },
  subtitle: { ...typography.caption, color: colors.slate600, marginTop: 2 },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 18,
    height: 18,
    backgroundColor: colors.error,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background
  },
  notificationCount: { ...typography.caption, color: colors.background, fontSize: 10, fontWeight: '700' },

  // Create Post Card
  createPostCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.background,
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.md
  },
  createPostAvatar: {
    width: 44,
    height: 44,
    backgroundColor: colors.momentum,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center'
  },
  createPostInput: {
    flex: 1,
    backgroundColor: colors.slate50,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.slate200
  },
  createPostPlaceholder: { ...typography.body, color: colors.slate400 },
  createPostActions: { flexDirection: 'row', gap: spacing.sm },
  createPostAction: {
    width: 40,
    height: 40,
    backgroundColor: colors.slate50,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center'
  },

  content: { flex: 1 },

  // Post Card
  postCard: {
    backgroundColor: colors.background,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.md
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.md
  },
  authorAvatar: {
    width: 48,
    height: 48,
    backgroundColor: colors.momentum,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  avatarImage: { width: '100%', height: '100%' },
  authorInitials: { ...typography.bodyBold, color: colors.background, fontSize: 16 },
  authorInfo: { flex: 1 },
  authorName: { ...typography.bodyBold, color: colors.slate900, fontSize: 15 },
  authorMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 },
  authorRole: { ...typography.caption, color: colors.slate600 },
  metaDot: { ...typography.caption, color: colors.slate400 },
  timeAgo: { ...typography.caption, color: colors.slate500 },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm
  },
  typeText: { ...typography.caption, fontWeight: '700', fontSize: 11 },

  // Badge Banner
  badgeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md
  },
  badgeText: { ...typography.bodyBold, fontSize: 14 },

  // Post Content
  postContent: {
    ...typography.body,
    color: colors.slate800,
    lineHeight: 24,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md
  },
  mention: { color: colors.momentum, fontWeight: '600' },

  // Media
  singleMedia: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: borderRadius.md,
    overflow: 'hidden'
  },
  singleMediaImage: {
    width: '100%',
    height: 200,
    backgroundColor: colors.slate200
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  playButton: {
    width: 64,
    height: 64,
    backgroundColor: colors.momentum,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center'
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: 4,
    borderRadius: borderRadius.md,
    overflow: 'hidden'
  },
  gridItem: {
    width: (screenWidth - spacing.lg * 2 - spacing.md * 2 - 4) / 2,
    height: 120,
    position: 'relative'
  },
  gridImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.slate200
  },
  moreOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  moreText: { ...typography.h2, color: colors.background },

  // Engagement Stats
  engagementStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100
  },
  likesInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  likeAvatars: { flexDirection: 'row' },
  engagementText: { ...typography.caption, color: colors.slate600 },

  // Post Actions
  postActions: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm
  },
  actionText: { ...typography.bodyBold, color: colors.slate500, fontSize: 13 },

  // Feed End
  feedEnd: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginBottom: spacing.xl
  },
  feedEndText: { ...typography.body, color: colors.slate400 },

  // Loading & Empty states
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 3,
  },
  loadingText: {
    ...typography.body,
    color: colors.slate500,
    marginTop: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 3,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.slate700,
    marginTop: spacing.lg,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.slate500,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
