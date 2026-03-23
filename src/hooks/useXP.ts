import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// XP action types matching the database function
export type XPAction =
  | 'profile_complete'
  | 'swipe'
  | 'match'
  | 'conversation_started';

// XP values for reference (actual values are in the database function)
export const XP_VALUES = {
  profile_complete: 50,
  swipe: 2,
  match: 15,
  conversation_started: 30,
};

export function useXP(userId?: string) {
  const awardXP = useCallback(async (action: XPAction): Promise<boolean> => {
    if (!userId) {
      console.warn('Cannot award XP: no user ID');
      return false;
    }

    try {
      const { error } = await supabase.rpc('award_xp', {
        p_user_id: userId,
        p_action: action,
      });

      if (error) {
        console.error('Error awarding XP:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error awarding XP:', err);
      return false;
    }
  }, [userId]);

  return {
    awardXP,
    XP_VALUES,
  };
}
