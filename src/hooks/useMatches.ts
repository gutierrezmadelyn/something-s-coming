// @ts-nocheck
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { Match, Conversation, Message, MessageInsert, Profile } from '@/lib/database.types';

// Debounce utility
function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): T {
  let timeoutId: NodeJS.Timeout;
  return ((...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T;
}

interface LastMessage {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
}

interface ChatListItem {
  matchId: string;
  matchType: string | null;
  icebreaker: string | null;
  matchCreatedAt: string;
  hasConversation: boolean;
  // Other user
  otherUserId: string;
  otherUserName: string;
  otherUserRole: string | null;
  otherUserCity: string | null;
  otherUserAvatarInitials: string | null;
  otherUserAvatarColor: string | null;
  otherUserPhotoUrl: string | null;
  otherUserLinkedin: string | null;
  otherUserWhatsapp: string | null;
  otherUserShowLocation: boolean;
  otherUserShowPhone: boolean;
  // Conversation
  conversationId: string | null;
  lastMessageAt: string | null;
  // Last message
  lastMessage: LastMessage | null;
  // Unread
  unreadCount: number;
}

// Legacy interface for backwards compatibility
interface MatchWithProfile extends Match {
  matchedProfile: Profile | null;
  conversation: Conversation | null;
  unreadCount: number;
  lastMessage: LastMessage | null;
  lastMessageAt: string | null;
}

export function useMatches(userId?: string) {
  const [chatList, setChatList] = useState<ChatListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const fetchInProgressRef = useRef(false);

  // Fetch chat list using optimized RPC
  const fetchChatList = useCallback(async () => {
    if (!userId || fetchInProgressRef.current) {
      setLoading(false);
      return;
    }

    fetchInProgressRef.current = true;
    setLoading(true);
    setError(null);

    try {
      // Try optimized RPC first
      const { data, error: rpcError } = await supabase.rpc('get_chat_list', {
        p_user_id: userId
      });

      if (rpcError) {
        // Fallback to legacy method if RPC doesn't exist
        if (rpcError.message.includes('function') || rpcError.code === '42883') {
          console.warn('get_chat_list RPC not available, using fallback');
          await fetchChatListFallback();
          return;
        }
        throw rpcError;
      }

      const items: ChatListItem[] = (data || []).map((row: any) => ({
        matchId: row.match_id,
        matchType: row.match_type,
        icebreaker: row.icebreaker,
        matchCreatedAt: row.match_created_at,
        hasConversation: row.has_conversation,
        otherUserId: row.other_user_id,
        otherUserName: row.other_user_name,
        otherUserRole: row.other_user_role,
        otherUserCity: row.other_user_city,
        otherUserAvatarInitials: row.other_user_avatar_initials,
        otherUserAvatarColor: row.other_user_avatar_color,
        otherUserPhotoUrl: row.other_user_photo_url,
        otherUserLinkedin: row.other_user_linkedin,
        otherUserWhatsapp: row.other_user_whatsapp,
        otherUserShowLocation: row.other_user_show_location ?? true,
        otherUserShowPhone: row.other_user_show_phone ?? true,
        conversationId: row.conversation_id,
        lastMessageAt: row.last_message_created_at || row.last_message_at,
        lastMessage: row.last_message_id ? {
          id: row.last_message_id,
          content: row.last_message_content,
          sender_id: row.last_message_sender_id,
          created_at: row.last_message_created_at,
        } : null,
        unreadCount: row.unread_count || 0,
      }));

      setChatList(items);
    } catch (err) {
      console.error('Error fetching chat list:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch chat list'));
    } finally {
      setLoading(false);
      fetchInProgressRef.current = false;
    }
  }, [userId]);

  // Fallback method (legacy N+1 approach)
  const fetchChatListFallback = async () => {
    if (!userId) return;

    try {
      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select('*')
        .or(`user_id.eq.${userId},matched_user_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (matchesError) throw matchesError;
      if (!matchesData?.length) {
        setChatList([]);
        return;
      }

      const otherUserIds = matchesData.map(m =>
        m.user_id === userId ? m.matched_user_id : m.user_id
      ).filter(Boolean);

      const [profilesRes, convsRes] = await Promise.all([
        supabase.from('profiles').select('*').in('id', otherUserIds),
        supabase.from('conversations').select('*').in('match_id', matchesData.map(m => m.id))
      ]);

      const profiles = profilesRes.data || [];
      const conversations = convsRes.data || [];

      // Batch fetch last messages and unread counts
      const convIds = conversations.map(c => c.id);
      const lastMessagesMap: Record<string, any> = {};
      const unreadCountsMap: Record<string, number> = {};

      if (convIds.length > 0) {
        // Get last messages in bulk
        const { data: lastMsgs } = await supabase
          .from('messages')
          .select('*')
          .in('conversation_id', convIds)
          .order('created_at', { ascending: false });

        // Group by conversation and take first (latest)
        const seen = new Set<string>();
        (lastMsgs || []).forEach(msg => {
          if (!seen.has(msg.conversation_id)) {
            lastMessagesMap[msg.conversation_id] = msg;
            seen.add(msg.conversation_id);
          }
        });

        // Get unread counts
        await Promise.all(convIds.map(async (convId) => {
          const { data } = await supabase.rpc('get_unread_count', {
            p_conversation_id: convId,
            p_user_id: userId
          });
          unreadCountsMap[convId] = data || 0;
        }));
      }

      const items: ChatListItem[] = matchesData.map(match => {
        const otherUserId = match.user_id === userId ? match.matched_user_id : match.user_id;
        const profile = profiles.find(p => p.id === otherUserId);
        const conv = conversations.find(c => c.match_id === match.id);
        const lastMsg = conv ? lastMessagesMap[conv.id] : null;

        return {
          matchId: match.id,
          matchType: match.match_type,
          icebreaker: match.icebreaker,
          matchCreatedAt: match.created_at,
          hasConversation: match.has_conversation || !!conv,
          otherUserId: otherUserId,
          otherUserName: profile?.name || '',
          otherUserRole: profile?.role,
          otherUserCity: profile?.city,
          otherUserAvatarInitials: profile?.avatar_initials,
          otherUserAvatarColor: profile?.avatar_color,
          otherUserPhotoUrl: profile?.photo_url,
          otherUserLinkedin: profile?.linkedin,
          otherUserWhatsapp: profile?.whatsapp,
          otherUserShowLocation: profile?.show_location ?? true,
          otherUserShowPhone: profile?.show_phone ?? true,
          conversationId: conv?.id || null,
          lastMessageAt: lastMsg?.created_at || conv?.last_message_at,
          lastMessage: lastMsg ? {
            id: lastMsg.id,
            content: lastMsg.content,
            sender_id: lastMsg.sender_id,
            created_at: lastMsg.created_at,
          } : null,
          unreadCount: conv ? (unreadCountsMap[conv.id] || 0) : 0,
        };
      });

      // Sort
      items.sort((a, b) => {
        if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount;
        const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : new Date(a.matchCreatedAt).getTime();
        const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : new Date(b.matchCreatedAt).getTime();
        return timeB - timeA;
      });

      setChatList(items);
    } finally {
      setLoading(false);
      fetchInProgressRef.current = false;
    }
  };

  useEffect(() => {
    fetchChatList();
  }, [fetchChatList]);

  // Debounced refetch for realtime updates
  const debouncedRefetch = useMemo(
    () => debounce(fetchChatList, 500),
    [fetchChatList]
  );

  // Local state update for new messages (optimistic)
  const handleNewMessage = useCallback((message: any) => {
    setChatList(prev => {
      const idx = prev.findIndex(item => item.conversationId === message.conversation_id);
      if (idx === -1) return prev;

      const updated = [...prev];
      const item = { ...updated[idx] };

      item.lastMessage = {
        id: message.id,
        content: message.content,
        sender_id: message.sender_id,
        created_at: message.created_at,
      };
      item.lastMessageAt = message.created_at;

      // Increment unread if not from current user
      if (message.sender_id !== userId) {
        item.unreadCount += 1;
      }

      updated[idx] = item;

      // Re-sort
      updated.sort((a, b) => {
        if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount;
        const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : new Date(a.matchCreatedAt).getTime();
        const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : new Date(b.matchCreatedAt).getTime();
        return timeB - timeA;
      });

      return updated;
    });
  }, [userId]);

  // Subscribe to messages and read receipts
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('chat-list-updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          // Update local state immediately
          handleNewMessage(payload.new);
          // Debounced full refetch to sync
          debouncedRefetch();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'read_receipts' },
        () => debouncedRefetch()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches' },
        () => debouncedRefetch()
      )
      .subscribe();

    return () => {
      channel.unsubscribe().then(() => supabase.removeChannel(channel));
    };
  }, [userId, handleNewMessage, debouncedRefetch]);

  // Convert to legacy format for backwards compatibility
  const matches: MatchWithProfile[] = useMemo(() => {
    return chatList.map(item => ({
      id: item.matchId,
      user_id: userId || '',
      matched_user_id: item.otherUserId,
      match_type: item.matchType,
      icebreaker: item.icebreaker,
      has_conversation: item.hasConversation,
      created_at: item.matchCreatedAt,
      matchedProfile: {
        id: item.otherUserId,
        name: item.otherUserName,
        role: item.otherUserRole,
        city: item.otherUserCity,
        avatar_initials: item.otherUserAvatarInitials,
        avatar_color: item.otherUserAvatarColor,
        photo_url: item.otherUserPhotoUrl,
        linkedin: item.otherUserLinkedin,
        whatsapp: item.otherUserWhatsapp,
        show_location: item.otherUserShowLocation,
        show_phone: item.otherUserShowPhone,
      } as Profile,
      conversation: item.conversationId ? {
        id: item.conversationId,
        match_id: item.matchId,
        last_message_at: item.lastMessageAt,
      } as Conversation : null,
      unreadCount: item.unreadCount,
      lastMessage: item.lastMessage,
      lastMessageAt: item.lastMessageAt,
    }));
  }, [chatList, userId]);

  // Start a conversation for a match
  const startConversation = async (matchId: string): Promise<Conversation | null> => {
    const { data: existing } = await supabase
      .from('conversations')
      .select('*')
      .eq('match_id', matchId)
      .single();

    if (existing) return existing;

    const { data, error } = await supabase
      .from('conversations')
      .insert({ match_id: matchId })
      .select()
      .single();

    if (error) {
      console.error('Error starting conversation:', error);
      return null;
    }

    // Update local state
    setChatList(prev =>
      prev.map(item =>
        item.matchId === matchId
          ? { ...item, conversationId: data.id, hasConversation: true }
          : item
      )
    );

    return data;
  };

  // Delete a match
  const deleteMatch = async (matchId: string): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase.rpc('delete_match_and_swipes', {
        p_match_id: matchId,
      });

      if (error) throw new Error(error.message);

      // Update local state immediately
      setChatList(prev => prev.filter(item => item.matchId !== matchId));

      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Failed to delete match') };
    }
  };

  // Create a manual match
  const createManualMatch = async (matchedUserId: string, icebreaker?: string): Promise<{ matchId?: string; error?: Error }> => {
    if (!userId) return { error: new Error('Not authenticated') };
    if (userId === matchedUserId) return { error: new Error('Cannot match with yourself') };

    const { data: existing } = await supabase
      .from('matches')
      .select('id')
      .or(`and(user_id.eq.${userId},matched_user_id.eq.${matchedUserId}),and(user_id.eq.${matchedUserId},matched_user_id.eq.${userId})`)
      .maybeSingle();

    if (existing) return { matchId: existing.id };

    const { data: match, error } = await supabase
      .from('matches')
      .insert({
        user_id: userId,
        matched_user_id: matchedUserId,
        match_type: 'cupido',
        icebreaker: icebreaker || null,
      })
      .select()
      .single();

    if (error) return { error: new Error(error.message) };

    await fetchChatList();
    return { matchId: match?.id };
  };

  // Mark messages as read
  const markAsRead = async (conversationId: string): Promise<void> => {
    if (!userId || !conversationId) return;

    try {
      await supabase.rpc('mark_messages_as_read', {
        p_conversation_id: conversationId,
        p_user_id: userId
      });

      // Update local state immediately
      setChatList(prev =>
        prev.map(item =>
          item.conversationId === conversationId
            ? { ...item, unreadCount: 0 }
            : item
        )
      );
    } catch (err) {
      console.warn('Could not mark messages as read:', err);
    }
  };

  // Get total unread count
  const getTotalUnread = useCallback((): number => {
    return chatList.reduce((sum, item) => sum + item.unreadCount, 0);
  }, [chatList]);

  return {
    matches,
    loading,
    error,
    startConversation,
    deleteMatch,
    createManualMatch,
    markAsRead,
    getTotalUnread,
    refetch: fetchChatList,
  };
}

// Hook for conversation messages with pagination
export function useConversation(conversationId?: string, userId?: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [otherUserLastRead, setOtherUserLastRead] = useState<string | null>(null);

  const MESSAGES_PER_PAGE = 30;

  // Fetch messages with pagination
  const fetchMessages = useCallback(async (beforeId?: string) => {
    if (!conversationId) {
      setLoading(false);
      return;
    }

    const isLoadingMore = !!beforeId;
    if (isLoadingMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      // Try paginated RPC first
      const { data, error: rpcError } = await supabase.rpc('get_messages_paginated', {
        p_conversation_id: conversationId,
        p_limit: MESSAGES_PER_PAGE,
        p_before_id: beforeId || null
      });

      if (rpcError) {
        // Fallback to regular query
        if (rpcError.message.includes('function') || rpcError.code === '42883') {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: false })
            .limit(MESSAGES_PER_PAGE);

          if (fallbackError) throw fallbackError;

          const sorted = (fallbackData || []).reverse();
          setMessages(sorted);
          setHasMore(fallbackData?.length === MESSAGES_PER_PAGE);
        } else {
          throw rpcError;
        }
      } else {
        // RPC returns in DESC order, we need ASC for display
        const sorted = (data || []).reverse();

        if (isLoadingMore) {
          // Prepend older messages
          setMessages(prev => [...sorted, ...prev]);
        } else {
          setMessages(sorted);
        }

        setHasMore(data?.length === MESSAGES_PER_PAGE);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch messages'));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [conversationId]);

  // Load more messages (for infinite scroll)
  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || messages.length === 0) return;
    const oldestMessage = messages[0];
    if (oldestMessage) {
      await fetchMessages(oldestMessage.id);
    }
  }, [fetchMessages, hasMore, loadingMore, messages]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Fetch other user's read receipt
  const fetchOtherUserReadStatus = useCallback(async () => {
    if (!conversationId || !userId) return;

    try {
      const { data } = await supabase
        .from('read_receipts')
        .select('last_read_message_id, last_read_at')
        .eq('conversation_id', conversationId)
        .neq('user_id', userId)
        .single();

      if (data?.last_read_message_id) {
        setOtherUserLastRead(data.last_read_message_id);
      }
    } catch (err) {
      // No read receipt yet
    }
  }, [conversationId, userId]);

  useEffect(() => {
    fetchOtherUserReadStatus();
  }, [fetchOtherUserReadStatus]);

  // Subscribe to read receipt changes
  useEffect(() => {
    if (!conversationId || !userId) return;

    const channel = supabase
      .channel(`read-receipts:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'read_receipts',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const record = payload.new as any;
          if (record && record.user_id !== userId && record.last_read_message_id) {
            setOtherUserLastRead(record.last_read_message_id);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe().then(() => supabase.removeChannel(channel));
    };
  }, [conversationId, userId]);

  // Subscribe to new messages
  useEffect(() => {
    if (!conversationId) return;

    let isSubscribed = true;
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (!isSubscribed) return;
          const newMessage = payload.new as Message;
          setMessages(prev => {
            if (prev.some(m => m.id === newMessage.id)) return prev;
            const withoutTemp = prev.filter(m => !m.id.startsWith('temp-') || m.content !== newMessage.content);
            return [...withoutTemp, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      isSubscribed = false;
      channel.unsubscribe().then(() => supabase.removeChannel(channel));
    };
  }, [conversationId]);

  // Send a message
  const sendMessage = async (content: string): Promise<Message | null> => {
    if (!conversationId || !userId) {
      console.error('Cannot send message: missing conversationId or userId');
      return null;
    }

    // Optimistic update
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId,
      sender_id: userId,
      content,
      message_type: 'user',
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMessage]);

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: userId,
        content,
        message_type: 'user',
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
      return null;
    }

    setMessages(prev => prev.map(m => m.id === optimisticMessage.id ? data : m));
    return data;
  };

  // Check if a message has been read
  const isMessageRead = useCallback((messageId: string): boolean => {
    if (!otherUserLastRead || !messages.length) return false;
    const messageIndex = messages.findIndex(m => m.id === messageId);
    const lastReadIndex = messages.findIndex(m => m.id === otherUserLastRead);
    return lastReadIndex >= messageIndex;
  }, [messages, otherUserLastRead]);

  return {
    messages,
    loading,
    loadingMore,
    hasMore,
    error,
    sendMessage,
    loadMore,
    refetch: fetchMessages,
    otherUserLastRead,
    isMessageRead,
  };
}
