// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Cohort, CohortMember } from '@/lib/database.types';

interface CohortWithMembers extends Cohort {
  memberCount: number;
}

export function useCohorts(userId?: string) {
  const [cohorts, setCohorts] = useState<CohortWithMembers[]>([]);
  const [userCohorts, setUserCohorts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCohorts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Get all active cohorts
      const { data: cohortsData, error: cohortsError } = await supabase
        .from('cohorts')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (cohortsError) throw cohortsError;

      // Get member counts for each cohort
      const { data: memberCounts } = await supabase
        .from('cohort_members')
        .select('cohort_id');

      // Count members per cohort
      const counts: Record<string, number> = {};
      memberCounts?.forEach(m => {
        counts[m.cohort_id] = (counts[m.cohort_id] || 0) + 1;
      });

      const cohortsWithMembers: CohortWithMembers[] = (cohortsData || []).map(c => ({
        ...c,
        memberCount: counts[c.id] || 0,
      }));

      setCohorts(cohortsWithMembers);

      // Get user's cohorts if userId provided
      if (userId) {
        const { data: userMemberships } = await supabase
          .from('cohort_members')
          .select('cohort_id')
          .eq('profile_id', userId);

        setUserCohorts(userMemberships?.map(m => m.cohort_id) || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch cohorts'));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchCohorts();
  }, [fetchCohorts]);

  // Join a cohort
  const joinCohort = async (cohortId: string): Promise<boolean> => {
    if (!userId) return false;

    const { error } = await supabase
      .from('cohort_members')
      .insert({ cohort_id: cohortId, profile_id: userId });

    if (error) {
      console.error('Error joining cohort:', error);
      return false;
    }

    setUserCohorts(prev => [...prev, cohortId]);
    setCohorts(prev =>
      prev.map(c =>
        c.id === cohortId ? { ...c, memberCount: c.memberCount + 1 } : c
      )
    );

    return true;
  };

  // Leave a cohort
  const leaveCohort = async (cohortId: string): Promise<boolean> => {
    if (!userId) return false;

    const { error } = await supabase
      .from('cohort_members')
      .delete()
      .eq('cohort_id', cohortId)
      .eq('profile_id', userId);

    if (error) {
      console.error('Error leaving cohort:', error);
      return false;
    }

    setUserCohorts(prev => prev.filter(id => id !== cohortId));
    setCohorts(prev =>
      prev.map(c =>
        c.id === cohortId ? { ...c, memberCount: Math.max(0, c.memberCount - 1) } : c
      )
    );

    return true;
  };

  // Create a new cohort (admin only)
  const createCohort = async (cohortData: {
    name: string;
    short_name?: string;
    description?: string;
    color?: string;
    icon?: string;
  }): Promise<{ data: Cohort | null; error: Error | null }> => {
    const { data, error } = await supabase
      .from('cohorts')
      .insert({
        ...cohortData,
        id: crypto.randomUUID(),
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    // Add to local state
    setCohorts(prev => [{
      ...data,
      memberCount: 0,
    }, ...prev]);

    return { data, error: null };
  };

  // Update a cohort (admin only)
  const updateCohort = async (
    cohortId: string,
    updates: Partial<{
      name: string;
      short_name: string;
      description: string;
      color: string;
      icon: string;
      is_active: boolean;
    }>
  ): Promise<{ data: Cohort | null; error: Error | null }> => {
    const { data, error } = await supabase
      .from('cohorts')
      .update(updates)
      .eq('id', cohortId)
      .select()
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    // Update local state
    setCohorts(prev =>
      prev.map(c =>
        c.id === cohortId ? { ...c, ...data } : c
      )
    );

    return { data, error: null };
  };

  // Delete a cohort (admin only)
  const deleteCohort = async (cohortId: string): Promise<{ error: Error | null }> => {
    // First delete all memberships
    await supabase
      .from('cohort_members')
      .delete()
      .eq('cohort_id', cohortId);

    // Then delete the cohort
    const { error } = await supabase
      .from('cohorts')
      .delete()
      .eq('id', cohortId);

    if (error) {
      return { error: new Error(error.message) };
    }

    // Remove from local state
    setCohorts(prev => prev.filter(c => c.id !== cohortId));

    return { error: null };
  };

  // Fetch all cohorts (including inactive) for admin
  const fetchAllCohorts = async (): Promise<CohortWithMembers[]> => {
    const { data: cohortsData, error: cohortsError } = await supabase
      .from('cohorts')
      .select('*')
      .order('created_at', { ascending: false });

    if (cohortsError) {
      console.error('Error fetching all cohorts:', cohortsError);
      return [];
    }

    // Get member counts for each cohort
    const { data: memberCounts } = await supabase
      .from('cohort_members')
      .select('cohort_id');

    // Count members per cohort
    const counts: Record<string, number> = {};
    memberCounts?.forEach(m => {
      counts[m.cohort_id] = (counts[m.cohort_id] || 0) + 1;
    });

    return (cohortsData || []).map(c => ({
      ...c,
      memberCount: counts[c.id] || 0,
    }));
  };

  return {
    cohorts,
    userCohorts,
    loading,
    error,
    joinCohort,
    leaveCohort,
    createCohort,
    updateCohort,
    deleteCohort,
    fetchAllCohorts,
    refetch: fetchCohorts,
  };
}

// Hook for leaderboard
interface LeaderboardEntry {
  user_id: string;
  name: string;
  avatar_initials: string | null;
  avatar_color: string | null;
  photo_url: string | null;
  xp: number;
  league: string;
  rank: number;
}

export function useLeaderboard(cohortId?: string) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.rpc('get_leaderboard', {
        p_cohort_id: cohortId || null,
      });

      if (error) throw error;

      setLeaderboard(data || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch leaderboard'));
    } finally {
      setLoading(false);
    }
  }, [cohortId]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return {
    leaderboard,
    loading,
    error,
    refetch: fetchLeaderboard,
  };
}

// Hook for icebreakers
export function useIcebreakers() {
  const [icebreakers, setIcebreakers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIcebreakers = async () => {
      const { data } = await supabase
        .from('icebreakers')
        .select('question')
        .eq('is_active', true);

      setIcebreakers(data?.map(i => i.question) || []);
      setLoading(false);
    };

    fetchIcebreakers();
  }, []);

  const getRandomIcebreaker = useCallback(async (): Promise<string> => {
    const { data } = await supabase.rpc('get_random_icebreaker');
    return data || 'Hola! Encantado de conectar contigo.';
  }, []);

  return {
    icebreakers,
    loading,
    getRandomIcebreaker,
  };
}
