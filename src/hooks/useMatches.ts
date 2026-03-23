// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Match, Conversation, Message, MessageInsert, Profile } from '@/lib/database.types';

interface MatchWithProfile extends Match {
  matchedProfile: Profile | null;
  conversation: Conversation | null;
}

export function useMatches(userId?: string) {
  const [matches, setMatches] = useState<MatchWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMatches = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get matches where user is either user_id or matched_user_id
      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select('*')
        .or(`user_id.eq.${userId},matched_user_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (matchesError) throw matchesError;

      if (!matchesData || matchesData.length === 0) {
        setMatches([]);
        setLoading(false);
        return;
      }

      // Get profiles for matched users
      const otherUserIds = matchesData.map(m =>
        m.user_id === userId ? m.matched_user_id : m.user_id
      );

      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', otherUserIds);

      // Get conversations for matches
      const { data: conversations } = await supabase
        .from('conversations')
        .select('*')
        .in('match_id', matchesData.map(m => m.id));

      // Combine data
      const matchesWithProfiles: MatchWithProfile[] = matchesData.map(match => {
        const otherUserId = match.user_id === userId ? match.matched_user_id : match.user_id;
        return {
          ...match,
          matchedProfile: profiles?.find(p => p.id === otherUserId) || null,
          conversation: conversations?.find(c => c.match_id === match.id) || null,
        };
      });

      setMatches(matchesWithProfiles);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch matches'));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

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
    setMatches(prev =>
      prev.map(m =>
        m.id === matchId ? { ...m, conversation: data } : m
      )
    );

    return data;
  };

  // Delete a match (unmatch)
  const deleteMatch = async (matchId: string): Promise<{ error: Error | null }> => {
    try {
      // First, get the match to find associated conversation
      const matchToDelete = matches.find(m => m.id === matchId);

      if (matchToDelete?.conversation) {
        // Delete messages in the conversation
        await supabase
          .from('messages')
          .delete()
          .eq('conversation_id', matchToDelete.conversation.id);

        // Delete the conversation
        await supabase
          .from('conversations')
          .delete()
          .eq('id', matchToDelete.conversation.id);
      }

      // Delete the match
      const { error } = await supabase
        .from('matches')
        .delete()
        .eq('id', matchId);

      if (error) {
        throw new Error(error.message);
      }

      // Update local state
      setMatches(prev => prev.filter(m => m.id !== matchId));

      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Failed to delete match') };
    }
  };

  // Create a manual match (admin/leaderboard contact)
  const createManualMatch = async (matchedUserId: string, icebreaker?: string): Promise<{ matchId?: string; error?: Error }> => {
    if (!userId) return { error: new Error('Not authenticated') };

    // Check if match already exists
    const { data: existing } = await supabase
      .from('matches')
      .select('id')
      .or(`and(user_id.eq.${userId},matched_user_id.eq.${matchedUserId}),and(user_id.eq.${matchedUserId},matched_user_id.eq.${userId})`)
      .maybeSingle();

    if (existing) {
      return { matchId: existing.id };
    }

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

    if (error) {
      return { error: new Error(error.message) };
    }

    await fetchMatches();
    return { matchId: match?.id };
  };

  return {
    matches,
    loading,
    error,
    startConversation,
    deleteMatch,
    createManualMatch,
    refetch: fetchMatches,
  };
}

// Hook for conversation messages
export function useConversation(conversationId?: string, userId?: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!conversationId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      setError(new Error(error.message));
    } else {
      setMessages(data || []);
    }
    setLoading(false);
  }, [conversationId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Subscribe to new messages
  useEffect(() => {
    if (!conversationId) return;

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
          const newMessage = payload.new as Message;
          // Avoid duplicates (from optimistic updates or multiple subscriptions)
          setMessages(prev => {
            const exists = prev.some(m => m.id === newMessage.id);
            if (exists) return prev;
            // Also remove any temp messages that match the content
            const withoutTemp = prev.filter(m => !m.id.startsWith('temp-') || m.content !== newMessage.content);
            return [...withoutTemp, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // Send a message
  const sendMessage = async (content: string): Promise<Message | null> => {
    if (!conversationId || !userId) {
      console.error('Cannot send message: missing conversationId or userId', { conversationId, userId });
      return null;
    }

    const messageData: MessageInsert = {
      conversation_id: conversationId,
      sender_id: userId,
      content,
      message_type: 'user',
    };

    // Optimistically add the message to local state
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
      .insert(messageData)
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
      return null;
    }

    // Replace optimistic message with real one
    setMessages(prev => prev.map(m => m.id === optimisticMessage.id ? data : m));

    return data;
  };

  return {
    messages,
    loading,
    error,
    sendMessage,
    refetch: fetchMessages,
  };
}
