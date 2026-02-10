// ============================================================
// CHAT SCREEN
// Teams-like channel messaging interface
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import {
  ChevronLeftIcon,
  HashIcon,
  SearchIcon,
  SendIcon,
  PlusIcon,
  ImageIcon,
  FileTextIcon,
  SmileIcon,
  AtSignIcon,
  PinIcon,
  BellIcon,
  MoreVerticalIcon,
  UsersIcon,
  LockIcon,
  StarIcon,
} from '../components/Icons';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { useAuthStore } from '../store/authStore';
import { showAlert } from '../utils/alert';

type ViewMode = 'channels' | 'chat';

export const ChatScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [viewMode, setViewMode] = useState<ViewMode>('channels');
  const [selectedChannel, setSelectedChannel] = useState<any>(null);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [channels, setChannels] = useState<any[]>([]);
  const [directMessages, setDirectMessages] = useState<any[]>([]);
  const [channelMessages, setChannelMessages] = useState<any[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Fetch channels from API
  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    const fetchChannels = async () => {
      try {
        if (mounted) setLoadingChannels(true);
        const response = await api.publicRequest<any>('/chat/channels');
        if (mounted) {
          if (response?.channels) {
            setChannels(response.channels);
          }
          if (response?.directMessages) {
            setDirectMessages(response.directMessages);
          }
        }
      } catch (e) {
        if (__DEV__) console.error('[ChatScreen] Failed to fetch channels:', e);
        // Non-blocking error - user sees empty state
        console.warn('[ChatScreen] Failed to load channels');
      } finally {
        if (mounted) setLoadingChannels(false);
      }
    };
    fetchChannels();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, []);

  // Fetch messages when channel is selected
  useEffect(() => {
    if (!selectedChannel) return;
    let mounted = true;
    const controller = new AbortController();

    const fetchMessages = async () => {
      try {
        if (mounted) setLoadingMessages(true);
        const response = await api.publicRequest<any>(`/chat/channels/${selectedChannel.id}/messages`);
        if (mounted) {
          if (response?.messages) {
            setChannelMessages(response.messages);
          }
        }
      } catch (e) {
        if (__DEV__) console.error('[ChatScreen] Failed to fetch messages:', e);
        if (mounted) {
          setChannelMessages([]);
          // Non-blocking error - user sees empty state
        }
      } finally {
        if (mounted) setLoadingMessages(false);
      }
    };
    fetchMessages();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [selectedChannel?.id]);

  const handleChannelPress = (channel: any) => {
    setSelectedChannel(channel);
    setViewMode('chat');
  };

  const handleBack = () => {
    if (viewMode === 'chat') {
      setViewMode('channels');
      setSelectedChannel(null);
    } else {
      navigation.goBack();
    }
  };

  const handleSendMessage = () => {
    if (messageText.trim()) {
      // In production, this would send to backend
      setMessageText('');
    }
  };

  // Render channel list view
  const renderChannelList = () => (
    <ScrollView style={styles.channelList} showsVerticalScrollIndicator={false}>
      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <SearchIcon size={18} color={colors.slate400} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search channels and messages..."
            placeholderTextColor={colors.slate400}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Loading indicator */}
      {loadingChannels && (
        <ActivityIndicator size="small" color={colors.momentum} style={{ marginVertical: spacing.md }} />
      )}

      {/* Pinned Channels */}
      <View style={styles.channelSection}>
        <View style={styles.sectionHeader}>
          <PinIcon size={14} color={colors.slate500} />
          <Text style={styles.sectionTitle}>Pinned</Text>
        </View>
        {channels.filter(c => c.pinned).map(channel => (
          <TouchableOpacity
            key={channel.id}
            style={styles.channelItem}
            onPress={() => handleChannelPress(channel)}
          >
            <View style={styles.channelIcon}>
              {channel.type === 'private' ? (
                <LockIcon size={16} color={colors.slate500} />
              ) : (
                <HashIcon size={16} color={colors.slate500} />
              )}
            </View>
            <View style={styles.channelInfo}>
              <Text style={[styles.channelName, channel.unread > 0 && styles.channelNameUnread]}>
                {channel.name}
              </Text>
              <Text style={styles.channelDescription} numberOfLines={1}>
                {channel.description}
              </Text>
            </View>
            {channel.unread > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{channel.unread}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* All Channels */}
      <View style={styles.channelSection}>
        <View style={styles.sectionHeader}>
          <HashIcon size={14} color={colors.slate500} />
          <Text style={styles.sectionTitle}>Channels</Text>
          <TouchableOpacity style={styles.addButton} onPress={() => showAlert("Chat", "Full messaging available in the live app.")}>
            <PlusIcon size={16} color={colors.momentum} />
          </TouchableOpacity>
        </View>
        {channels.filter(c => !c.pinned).map(channel => (
          <TouchableOpacity
            key={channel.id}
            style={styles.channelItem}
            onPress={() => handleChannelPress(channel)}
          >
            <View style={styles.channelIcon}>
              {channel.type === 'private' ? (
                <LockIcon size={16} color={colors.slate500} />
              ) : (
                <HashIcon size={16} color={colors.slate500} />
              )}
            </View>
            <View style={styles.channelInfo}>
              <Text style={[styles.channelName, channel.unread > 0 && styles.channelNameUnread]}>
                {channel.name}
              </Text>
            </View>
            {channel.unread > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{channel.unread}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Direct Messages */}
      <View style={styles.channelSection}>
        <View style={styles.sectionHeader}>
          <UsersIcon size={14} color={colors.slate500} />
          <Text style={styles.sectionTitle}>{t('screens.chat.direct_messages')}</Text>
          <TouchableOpacity style={styles.addButton} onPress={() => showAlert("Chat", "Full messaging available in the live app.")}>
            <PlusIcon size={16} color={colors.momentum} />
          </TouchableOpacity>
        </View>
        {directMessages.map(dm => (
          <TouchableOpacity
            key={dm.id}
            style={styles.dmItem}
            onPress={() => {
              // Would navigate to DM conversation
            }}
          >
            <View style={styles.dmAvatar}>
              <Text style={styles.dmAvatarText}>{dm.avatar}</Text>
              {dm.online && <View style={styles.onlineIndicator} />}
            </View>
            <View style={styles.dmInfo}>
              <Text style={[styles.dmName, dm.unread > 0 && styles.dmNameUnread]}>
                {dm.name}
              </Text>
              <Text style={styles.dmLastMessage} numberOfLines={1}>
                {dm.lastMessage}
              </Text>
            </View>
            {dm.unread > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{dm.unread}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );

  // Render chat view
  const renderChatView = () => (
    <KeyboardAvoidingView
      style={styles.chatContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      {/* Channel Header */}
      <View style={styles.chatHeader}>
        <View style={styles.chatHeaderLeft}>
          <HashIcon size={20} color={colors.slate600} />
          <View>
            <Text style={styles.chatTitle}>{selectedChannel?.name}</Text>
            <Text style={styles.chatSubtitle}>{selectedChannel?.description}</Text>
          </View>
        </View>
        <View style={styles.chatHeaderActions}>
          <TouchableOpacity style={styles.headerAction} onPress={() => showAlert("Chat", "Full messaging available in the live app.")}>
            <UsersIcon size={20} color={colors.slate600} />
            <Text style={styles.memberCount}>24</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerAction} onPress={() => showAlert("Chat", "Full messaging available in the live app.")}>
            <BellIcon size={20} color={colors.slate600} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerAction} onPress={() => showAlert("Chat", "Full messaging available in the live app.")}>
            <PinIcon size={20} color={colors.slate600} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      <ScrollView style={styles.messagesContainer} showsVerticalScrollIndicator={false}>
        {loadingMessages && (
          <ActivityIndicator size="small" color={colors.momentum} style={{ marginVertical: spacing.md }} />
        )}
        {channelMessages.map((msg) => (
          <View key={msg.id} style={[styles.messageItem, msg.isSystem && styles.systemMessage]}>
            <View style={[styles.messageAvatar, msg.isSystem && styles.systemAvatar]}>
              <Text style={styles.messageAvatarText}>{msg.user.avatar}</Text>
            </View>
            <View style={styles.messageContent}>
              <View style={styles.messageHeader}>
                <Text style={styles.messageSender}>{msg.user.name}</Text>
                {msg.user.role !== 'Team Member' && (
                  <View style={[styles.roleBadge, msg.user.role === 'Manager' && styles.managerBadge]}>
                    <Text style={styles.roleText}>{msg.user.role}</Text>
                  </View>
                )}
                <Text style={styles.messageTime}>{msg.time}</Text>
              </View>
              <Text style={styles.messageText}>{msg.message}</Text>
              {msg.attachment && (
                <View style={styles.attachment}>
                  <FileTextIcon size={16} color={colors.momentum} />
                  <Text style={styles.attachmentName}>{msg.attachment.name}</Text>
                </View>
              )}
              {msg.reactions.length > 0 && (
                <View style={styles.reactions}>
                  {msg.reactions.map((reaction: { emoji: string; count: number }, idx: number) => (
                    <TouchableOpacity key={idx} style={styles.reactionBadge} onPress={() => showAlert("Chat", "Full messaging available in the live app.")}>
                      <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
                      <Text style={styles.reactionCount}>{reaction.count}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity style={styles.addReaction} onPress={() => showAlert("Chat", "Full messaging available in the live app.")}>
                    <SmileIcon size={14} color={colors.slate400} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        ))}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Message Input */}
      <View style={styles.inputContainer}>
        <View style={styles.inputRow}>
          <TouchableOpacity style={styles.inputAction} onPress={() => showAlert("Chat", "Full messaging available in the live app.")}>
            <PlusIcon size={22} color={colors.slate500} />
          </TouchableOpacity>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.messageInput}
              placeholder={`Message #${selectedChannel?.name}`}
              placeholderTextColor={colors.slate400}
              value={messageText}
              onChangeText={setMessageText}
              multiline
            />
            <View style={styles.inputActions}>
              <TouchableOpacity style={styles.inputIconButton} onPress={() => showAlert("Chat", "Full messaging available in the live app.")}>
                <AtSignIcon size={18} color={colors.slate400} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.inputIconButton} onPress={() => showAlert("Chat", "Full messaging available in the live app.")}>
                <SmileIcon size={18} color={colors.slate400} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.inputIconButton} onPress={() => showAlert("Chat", "Full messaging available in the live app.")}>
                <ImageIcon size={18} color={colors.slate400} />
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.sendButton, messageText.trim() && styles.sendButtonActive]}
            onPress={handleSendMessage}
            disabled={!messageText.trim()}
          >
            <SendIcon size={20} color={messageText.trim() ? colors.white : colors.slate400} />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ChevronLeftIcon size={24} color={colors.slate900} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {viewMode === 'channels' ? 'Messages' : `#${selectedChannel?.name}`}
        </Text>
        <TouchableOpacity style={styles.headerAction} onPress={() => showAlert("Chat", "Full messaging available in the live app.")}>
          <MoreVerticalIcon size={22} color={colors.slate600} />
        </TouchableOpacity>
      </View>

      {viewMode === 'channels' ? renderChannelList() : renderChatView()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate200,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.slate900,
    flex: 1,
    textAlign: 'center',
  },
  headerAction: {
    padding: spacing.xs,
  },

  // Search
  searchContainer: {
    padding: spacing.md,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.slate100,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.slate900,
  },

  // Channel List
  channelList: {
    flex: 1,
  },
  channelSection: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.caption,
    color: colors.slate500,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  addButton: {
    padding: spacing.xs,
  },

  // Channel Item
  channelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  channelIcon: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelInfo: {
    flex: 1,
  },
  channelName: {
    ...typography.body,
    color: colors.slate700,
  },
  channelNameUnread: {
    fontWeight: '700',
    color: colors.slate900,
  },
  channelDescription: {
    ...typography.caption,
    color: colors.slate500,
    marginTop: 2,
  },
  unreadBadge: {
    backgroundColor: colors.momentum,
    borderRadius: borderRadius.full,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  unreadText: {
    ...typography.small,
    color: colors.white,
    fontWeight: '700',
  },

  // Direct Messages
  dmItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  dmAvatar: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.slate200,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dmAvatarText: {
    ...typography.bodyBold,
    color: colors.slate600,
    fontSize: 13,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.background,
  },
  dmInfo: {
    flex: 1,
  },
  dmName: {
    ...typography.body,
    color: colors.slate700,
  },
  dmNameUnread: {
    fontWeight: '700',
    color: colors.slate900,
  },
  dmLastMessage: {
    ...typography.caption,
    color: colors.slate500,
    marginTop: 2,
  },

  // Chat View
  chatContainer: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate200,
    backgroundColor: colors.slate50,
  },
  chatHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  chatTitle: {
    ...typography.bodyBold,
    color: colors.slate900,
  },
  chatSubtitle: {
    ...typography.caption,
    color: colors.slate500,
  },
  chatHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  memberCount: {
    ...typography.small,
    color: colors.slate600,
    marginStart: 2,
  },

  // Messages
  messagesContainer: {
    flex: 1,
    padding: spacing.md,
  },
  messageItem: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  systemMessage: {
    backgroundColor: colors.momentumLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginHorizontal: -spacing.md,
  },
  messageAvatar: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.slate200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  systemAvatar: {
    backgroundColor: colors.momentum,
  },
  messageAvatarText: {
    ...typography.bodyBold,
    color: colors.slate600,
    fontSize: 12,
  },
  messageContent: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
    flexWrap: 'wrap',
  },
  messageSender: {
    ...typography.bodyBold,
    color: colors.slate900,
    fontSize: 14,
  },
  roleBadge: {
    backgroundColor: colors.slate100,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  managerBadge: {
    backgroundColor: colors.momentum + '20',
  },
  roleText: {
    ...typography.small,
    color: colors.slate600,
    fontWeight: '600',
  },
  messageTime: {
    ...typography.caption,
    color: colors.slate400,
  },
  messageText: {
    ...typography.body,
    color: colors.slate800,
    lineHeight: 22,
  },
  attachment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.slate100,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  attachmentName: {
    ...typography.caption,
    color: colors.momentum,
    fontWeight: '600',
  },
  reactions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    flexWrap: 'wrap',
  },
  reactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.slate100,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    ...typography.small,
    color: colors.slate600,
    fontWeight: '600',
  },
  addReaction: {
    padding: spacing.xs,
  },

  // Input
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.slate200,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    paddingBottom: spacing.lg,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  inputAction: {
    padding: spacing.sm,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: colors.slate100,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  messageInput: {
    ...typography.body,
    color: colors.slate900,
    maxHeight: 100,
    minHeight: 24,
  },
  inputActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  inputIconButton: {
    padding: spacing.xs,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.slate200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonActive: {
    backgroundColor: colors.momentum,
  },
});

export default ChatScreen;
