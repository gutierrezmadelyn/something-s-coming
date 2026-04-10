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

  // Initial fetch - FIXED: Wait for swipedIds before fetching profiles
  // This prevents the race condition where profiles are fetched before we know which ones to exclude
  const [swipedIdsLoaded, setSwipedIdsLoaded] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (currentUserId) {
        await fetchSwipedIds();
        setSwipedIdsLoaded(true);
      }
    };
    init();
  }, [currentUserId, fetchSwipedIds]);

  useEffect(() => {
    // Only fetch profiles after swipedIds have been loaded
    if (swipedIdsLoaded || !excludeSwiped) {
      fetchProfiles();
    }
  }, [fetchProfiles, swipedIdsLoaded, excludeSwiped]);

  // Record a swipe with proper error rollback
  const recordSwipe = async (swipedUserId: string, direction: 'left' | 'right'): Promise<{ isMatch: boolean; matchId?: string; icebreaker?: string }> => {
    if (!currentUserId) return { isMatch: false };

    // Prevent self-swipe
    if (currentUserId === swipedUserId) {
      console.error('Cannot swipe on yourself');
      return { isMatch: false };
    }

    // Store the profile before removing (for potential rollback)
    const swipedProfile = profiles.find(p => p.id === swipedUserId);

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
      // Handle duplicate swipe gracefully (unique constraint violation)
      if (swipeError.code === '23505') {
        console.warn('Swipe already exists, skipping duplicate');
        // Still update local state to reflect the swipe
        setSwipedIds(prev => new Set([...prev, swipedUserId]));
        setProfiles(prev => prev.filter(p => p.id !== swipedUserId));
      } else {
        console.error('Error recording swipe:', swipeError);
      }
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

    // Update local state AFTER successful DB operation
    setSwipedIds(prev => new Set([...prev, swipedUserId]));
    setProfiles(prev => prev.filter(p => p.id !== swipedUserId));

    // Check for match (if right swipe)
    if (direction === 'right') {
      // Use RPC function to create match
      const { data: result, error: matchError } = await supabase.rpc('check_and_create_match', {
        p_user_id: currentUserId,
        p_swiped_user_id: swipedUserId,
      });

      if (matchError) {
        console.error('Error checking/creating match:', matchError);
        // Note: Swipe was successful, just match creation failed
        // Don't rollback the swipe since it's recorded in DB
        return { isMatch: false };
      }

      if (result?.is_match) {
        return {
          isMatch: true,
          matchId: result.match_id,
          icebreaker: result.icebreaker
        };
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

// Hook to get ALL profiles (admin only)
export function useAllProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAllProfiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProfiles(data || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch all profiles'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllProfiles();
  }, [fetchAllProfiles]);

  return { profiles, loading, error, refetch: fetchAllProfiles };
}
