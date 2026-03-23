// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Profile, Swipe, SwipeInsert } from '@/lib/database.types';

interface SwipeRecord {
  id: string;
  swipedUserId: string;
  direction: 'left' | 'right';
}

interface UseProfilesOptions {
  currentUserId?: string;
  cohortId?: string;
  excludeSwiped?: boolean;
}

export function useProfiles(options: UseProfilesOptions = {}) {
  const { currentUserId, cohortId, excludeSwiped = true } = options;
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [swipedIds, setSwipedIds] = useState<Set<string>>(new Set());
  const [lastSwipe, setLastSwipe] = useState<SwipeRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch swiped user IDs
  const fetchSwipedIds = useCallback(async () => {
    if (!currentUserId) return;

    const { data } = await supabase
      .from('swipes')
      .select('swiped_user_id')
      .eq('user_id', currentUserId);

    if (data) {
      setSwipedIds(new Set(data.map(s => s.swiped_user_id)));
    }
  }, [currentUserId]);

  // Fetch profiles
  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase.from('profiles').select('*');

      // Filter by cohort if specified
      if (cohortId) {
        const { data: memberIds } = await supabase
          .from('cohort_members')
          .select('profile_id')
          .eq('cohort_id', cohortId);

        if (memberIds && memberIds.length > 0) {
          query = query.in('id', memberIds.map(m => m.profile_id));
        }
      }

      // Exclude current user
      if (currentUserId) {
        query = query.neq('id', currentUserId);
      }

      const { data, error } = await query;

      if (error) throw error;

      let filteredData = data || [];

      // Exclude already swiped profiles
      if (excludeSwiped && swipedIds.size > 0) {
        filteredData = filteredData.filter(p => !swipedIds.has(p.id));
      }

      setProfiles(filteredData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch profiles'));
    } finally {
      setLoading(false);
    }
  }, [currentUserId, cohortId, excludeSwiped, swipedIds]);

  // Initial fetch
  useEffect(() => {
    if (currentUserId) {
      fetchSwipedIds();
    }
  }, [currentUserId, fetchSwipedIds]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  // Record a swipe
  const recordSwipe = async (swipedUserId: string, direction: 'left' | 'right'): Promise<{ isMatch: boolean; matchId?: string }> => {
    if (!currentUserId) return { isMatch: false };

    // Insert swipe
    const swipeData: SwipeInsert = {
      user_id: currentUserId,
      swiped_user_id: swipedUserId,
      direction,
    };

    const { data: insertedSwipe, error: swipeError } = await supabase
      .from('swipes')
      .insert(swipeData)
      .select()
      .single();

    if (swipeError) {
      console.error('Error recording swipe:', swipeError);
      return { isMatch: false };
    }

    // Track last swipe for undo functionality
    if (insertedSwipe) {
      setLastSwipe({
        id: insertedSwipe.id,
        swipedUserId,
        direction,
      });
    }

    // Update local state
    setSwipedIds(prev => new Set([...prev, swipedUserId]));
    setProfiles(prev => prev.filter(p => p.id !== swipedUserId));

    // Check for mutual match (if right swipe)
    if (direction === 'right') {
      const { data: mutualSwipe } = await supabase
        .from('swipes')
        .select('*')
        .eq('user_id', swipedUserId)
        .eq('swiped_user_id', currentUserId)
        .eq('direction', 'right')
        .single();

      if (mutualSwipe) {
        // Get random icebreaker
        const { data: icebreaker } = await supabase.rpc('get_random_icebreaker');

        // Create match
        const { data: match, error: matchError } = await supabase
          .from('matches')
          .insert({
            user_id: currentUserId,
            matched_user_id: swipedUserId,
            match_type: 'organic',
            icebreaker: icebreaker || null,
          })
          .select()
          .single();

        if (matchError) {
          console.error('Error creating match:', matchError);
          return { isMatch: false };
        }

        return { isMatch: true, matchId: match?.id };
      }
    }

    return { isMatch: false };
  };

  // Calculate compatibility using database function
  const getCompatibility = async (userA: string, userB: string): Promise<number> => {
    const { data, error } = await supabase.rpc('calculate_compatibility', {
      user_a: userA,
      user_b: userB,
    });

    if (error) {
      console.error('Error calculating compatibility:', error);
      return 0;
    }

    return data || 0;
  };

  // Undo the last swipe
  const undoLastSwipe = async (): Promise<{ success: boolean; undoneProfile?: Profile }> => {
    if (!lastSwipe || !currentUserId) return { success: false };

    try {
      // Delete the swipe from database
      const { error: deleteError } = await supabase
        .from('swipes')
        .delete()
        .eq('id', lastSwipe.id);

      if (deleteError) {
        console.error('Error undoing swipe:', deleteError);
        return { success: false };
      }

      // Fetch the profile that was swiped
      const { data: undoneProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', lastSwipe.swipedUserId)
        .single();

      if (profileError) {
        console.error('Error fetching undone profile:', profileError);
        return { success: false };
      }

      // Update local state
      setSwipedIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(lastSwipe.swipedUserId);
        return newSet;
      });

      // Add the profile back to the list (at the beginning)
      if (undoneProfile) {
        setProfiles(prev => [undoneProfile, ...prev]);
      }

      // Clear last swipe
      setLastSwipe(null);

      return { success: true, undoneProfile };
    } catch (err) {
      console.error('Error in undoLastSwipe:', err);
      return { success: false };
    }
  };

  return {
    profiles,
    loading,
    error,
    recordSwipe,
    getCompatibility,
    undoLastSwipe,
    canUndo: !!lastSwipe,
    refetch: fetchProfiles,
  };
}

// Hook to get a single profile
export function useProfile(profileId?: string) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!profileId) {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();

      if (error) {
        setError(new Error(error.message));
      } else {
        setProfile(data);
      }
      setLoading(false);
    };

    fetchProfile();
  }, [profileId]);

  return { profile, loading, error };
}
