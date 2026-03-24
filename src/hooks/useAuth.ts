// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import type { Profile } from '@/lib/database.types';

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  error: AuthError | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    // Timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (mounted) {
        console.warn('Auth session check timed out');
        setState(prev => {
          if (prev.loading) {
            return { ...prev, loading: false };
          }
          return prev;
        });
      }
    }, 5000);

    // Get initial session
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (!mounted) return;
        clearTimeout(timeout);

        if (error) {
          console.error('getSession error:', error);
          setState(prev => ({ ...prev, loading: false, error }));
          return;
        }

        if (session?.user) {
          // Fetch profile
          supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
            .then(({ data: profile, error: profileError }) => {
              if (!mounted) return;
              if (profileError) {
                console.error('Error fetching profile:', profileError);
              }
              setState({
                user: session.user,
                session,
                profile: profile || null,
                loading: false,
                error: null,
              });
            })
            .catch((err) => {
              if (!mounted) return;
              console.error('Profile fetch failed:', err);
              setState({
                user: session.user,
                session,
                profile: null,
                loading: false,
                error: null,
              });
            });
        } else {
          setState({ user: null, session: null, profile: null, loading: false, error: null });
        }
      })
      .catch((err) => {
        if (!mounted) return;
        clearTimeout(timeout);
        console.error('getSession failed:', err);
        setState(prev => ({ ...prev, loading: false }));
      });

    return () => {
      mounted = false;
      clearTimeout(timeout);
    };

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          if (session?.user) {
            // First, try to claim any imported profile with this email
            const userEmail = session.user.email || '';
            const userName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || '';

            if (userEmail) {
              const { data: claimResult, error: claimError } = await supabase.rpc('claim_profile_by_email', {
                p_auth_id: session.user.id,
                p_email: userEmail,
                p_name: userName,
              });

              if (claimError) {
                console.error('Error claiming profile:', claimError);
              } else if (claimResult) {
                console.log('Profile claim result:', claimResult);
              }
            }

            // Now fetch the profile
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (profileError) {
              console.error('Error fetching profile on auth change:', profileError);
            }

            setState({
              user: session.user,
              session,
              profile: profile || null,
              loading: false,
              error: null,
            });
          } else {
            setState({ user: null, session: null, profile: null, loading: false, error: null });
          }
        } catch (err) {
          console.error('Auth state change error:', err);
          setState(prev => ({ ...prev, loading: false }));
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, metadata?: { full_name?: string }) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });
    setState(prev => ({ ...prev, loading: false, error: error || null }));
    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    // Always set loading to false, onAuthStateChange will update the rest
    setState(prev => ({ ...prev, loading: false, error: error || null }));
    return { data, error };
  };

  const signInWithGoogle = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      setState(prev => ({ ...prev, loading: false, error }));
    }
    return { data, error };
  };

  const signOut = async () => {
    setState(prev => ({ ...prev, loading: true }));
    const { error } = await supabase.auth.signOut();
    if (error) {
      setState(prev => ({ ...prev, loading: false, error }));
    }
    return { error };
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!state.user) return { error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', state.user.id)
      .select()
      .single();

    if (data) {
      setState(prev => ({ ...prev, profile: data }));
    }

    return { data, error };
  };

  const deleteAccount = async () => {
    if (!state.user) return { error: new Error('Not authenticated') };

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // First, delete all user data using our RPC function
      const { error: dataError } = await supabase.rpc('delete_user_data', {
        user_id_to_delete: state.user.id
      });

      if (dataError) {
        // If RPC doesn't exist yet, delete manually
        // Delete messages
        await supabase.from('messages').delete().eq('sender_id', state.user.id);

        // Delete conversations for user's matches
        const { data: userMatches } = await supabase
          .from('matches')
          .select('id')
          .or(`user_id.eq.${state.user.id},matched_user_id.eq.${state.user.id}`);

        if (userMatches && userMatches.length > 0) {
          await supabase
            .from('conversations')
            .delete()
            .in('match_id', userMatches.map(m => m.id));
        }

        // Delete matches
        await supabase
          .from('matches')
          .delete()
          .or(`user_id.eq.${state.user.id},matched_user_id.eq.${state.user.id}`);

        // Delete swipes
        await supabase
          .from('swipes')
          .delete()
          .or(`user_id.eq.${state.user.id},swiped_user_id.eq.${state.user.id}`);

        // Delete cohort memberships
        await supabase
          .from('cohort_members')
          .delete()
          .eq('profile_id', state.user.id);

        // Delete XP log
        await supabase
          .from('xp_log')
          .delete()
          .eq('user_id', state.user.id);

        // Delete profile
        await supabase
          .from('profiles')
          .delete()
          .eq('id', state.user.id);
      }

      // Sign out the user (this effectively deletes the session)
      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        setState(prev => ({ ...prev, loading: false, error: signOutError }));
        return { error: signOutError };
      }

      setState({ user: null, session: null, profile: null, loading: false, error: null });
      return { error: null };
    } catch (err) {
      const error = err as Error;
      setState(prev => ({ ...prev, loading: false, error: error as any }));
      return { error };
    }
  };

  const changePassword = async (newPassword: string) => {
    if (!state.user) return { error: new Error('Not authenticated') };

    setState(prev => ({ ...prev, loading: true, error: null }));

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    setState(prev => ({ ...prev, loading: false, error }));
    return { error };
  };

  const resetPassword = async (email: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?reset=true`,
    });

    setState(prev => ({ ...prev, loading: false, error }));
    return { error };
  };

  return {
    ...state,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    updateProfile,
    deleteAccount,
    changePassword,
    resetPassword,
  };
}
