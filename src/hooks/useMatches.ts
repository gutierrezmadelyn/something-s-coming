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

  return {
    matches,
    loading,
    error,
    startConversation,
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
          setMessages(prev => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // Send a message
  const sendMessage = async (content: string): Promise<Message | null> => {
    if (!conversationId || !userId) return null;

    const messageData: MessageInsert = {
      conversation_id: conversationId,
      sender_id: userId,
      content,
      message_type: 'user',
    };

    const { data, error } = await supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      return null;
    }

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
