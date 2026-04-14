// @ts-nocheck
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfiles, useAllProfiles } from "@/hooks/useProfiles";
import { useCohorts, useIcebreakers } from "@/hooks/useCohorts";
import { useMatches } from "@/hooks/useMatches";
import { useNotifications } from "@/hooks/useNotifications";
import ProfileForm from "@/components/ProfileForm";
import Onboarding from "@/components/Onboarding";
import { supabase } from "@/lib/supabase";

import { S } from "@/components/networking/styles";
import { DEFAULT_ICEBREAKERS } from "@/components/networking/constants";
import { convertProfileToLegacy, calcCompat } from "@/components/networking/utils";
import {
  MapView, ProfileCard, MatchAnimation, ChatView,
  MatchesList, MyProfile, AdminPanel,
  Header, CohortPicker, BottomNav, UndoButton,
} from "@/components/networking";
import { Search, Target, Map as MapIcon, User, Shield, Settings, CheckCircle, Lock } from "lucide-react";

export default function Networking() {
  const navigate = useNavigate();
  const { user, profile: authProfile, loading: authLoading, signOut, updateProfile, deleteAccount, changePassword } = useAuth();
  const currentUserId = user?.id;
  const { cohorts, userCohorts, createCohort, updateCohort, deleteCohort, fetchAllCohorts, addMemberToCohort, removeMemberFromCohort } = useCohorts(currentUserId);
  const { icebreakers, getRandomIcebreaker } = useIcebreakers();
  const ICEBREAKERS = icebreakers.length > 0 ? icebreakers : DEFAULT_ICEBREAKERS;

  const [tab, setTab] = useState("swipe");
  const [localMatches, setLocalMatches] = useState([]);
  const [showMatch, setShowMatch] = useState(null);
  const [currentProfileIndex, setCurrentProfileIndex] = useState(0);
  const [chatMatch, setChatMatch] = useState(null);
  const [privacySettings, setPrivacySettings] = useState({ showLocation: true, showPhone: true });
  const [selectedCohortId, setSelectedCohortId] = useState(null);
  const [showCohortPicker, setShowCohortPicker] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [allLoadedProfiles, setAllLoadedProfiles] = useState([]);
  const [allCohorts, setAllCohorts] = useState([]);

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    offers: [],
    seeks: [],
    country: "",
  });

  const { profiles: dbProfiles, loading: profilesLoading, recordSwipe, getCompatibility, undoLastSwipe, canUndo, refetch: refetchCohortProfiles } = useProfiles({
    currentUserId, cohortId: selectedCohortId || undefined, excludeSwiped: false,
  });
  const { matches: dbMatches, startConversation, deleteMatch, createManualMatch, markAsRead } = useMatches(currentUserId);

  // All profiles for admin view
  const { profiles: allSystemDbProfiles, refetch: refetchAllProfiles } = useAllProfiles();
  const allSystemProfiles = useMemo(() => allSystemDbProfiles.map(convertProfileToLegacy).filter(Boolean), [allSystemDbProfiles]);
  const { permission, requestPermission, showNotification, updateBadge, playSound } = useNotifications();
  const activeChatRef = useRef<string | null>(null);

  const me = useMemo(() => authProfile ? convertProfileToLegacy(authProfile) : null, [authProfile]);
  const cohortProfiles = useMemo(() => dbProfiles.map(convertProfileToLegacy).filter(Boolean), [dbProfiles]);
  // Admin view: all cohort members (including swiped + current user)
  const [adminCohortProfiles, setAdminCohortProfiles] = useState([]);
  const [adminCohortStats, setAdminCohortStats] = useState({ totalMatches: 0, totalMessages: 0 });
  const [adminCohortId, setAdminCohortId] = useState(null);
  const activeAdminCohortId = adminCohortId || selectedCohortId;

  const fetchAdminCohortProfiles = useCallback(async (cohortId) => {
    if (!cohortId) return;
    const { data: memberIds } = await supabase
      .from('cohort_members')
      .select('profile_id')
      .eq('cohort_id', cohortId);
    if (memberIds && memberIds.length > 0) {
      const ids = memberIds.map(m => m.profile_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', ids);
      setAdminCohortProfiles((profiles || []).map(convertProfileToLegacy).filter(Boolean));

      // Fetch cohort-wide matches (both users in cohort)
      const { data: allMatches } = await supabase
        .from('matches')
        .select('id, user_id, matched_user_id')
        .or(ids.map(id => `user_id.eq.${id}`).join(','));
      const cohortMatches = (allMatches || []).filter(m => ids.includes(m.user_id) && ids.includes(m.matched_user_id));

      // Fetch total messages from cohort members
      const { count: messageCount } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .in('sender_id', ids);

      setAdminCohortStats({ totalMatches: cohortMatches.length, totalMessages: messageCount || 0 });
    } else {
      setAdminCohortProfiles([]);
      setAdminCohortStats({ totalMatches: 0, totalMessages: 0 });
    }
  }, []);
  useEffect(() => { fetchAdminCohortProfiles(activeAdminCohortId); }, [activeAdminCohortId, fetchAdminCohortProfiles]);

  // Profiles for map - includes cohort + matched profiles
  const mapProfiles = useMemo(() => {
    const profileMap = new Map();
    cohortProfiles.forEach(p => { if (p?.id) profileMap.set(p.id, p); });
    dbMatches.forEach(m => {
      if (m.matchedProfile) {
        const lp = convertProfileToLegacy(m.matchedProfile);
        if (lp?.id && !profileMap.has(lp.id)) profileMap.set(lp.id, lp);
      }
    });
    if (me?.id) profileMap.set(me.id, me);
    return Array.from(profileMap.values());
  }, [cohortProfiles, dbMatches, me]);

  // Fetch all cohorts for admin
  useEffect(() => {
    if (me?.isAdmin && fetchAllCohorts) {
      fetchAllCohorts().then(setAllCohorts);
    }
  }, [me?.isAdmin]);

  // Request notification permission on load
  useEffect(() => {
    if (currentUserId && permission === 'default') {
      // Delay the request slightly to not overwhelm the user on first load
      const timer = setTimeout(() => {
        requestPermission();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [currentUserId, permission, requestPermission]);

  // Update active chat ref
  useEffect(() => {
    if (tab === "chat" && chatMatch?.conversationId) {
      activeChatRef.current = chatMatch.conversationId;
    } else {
      activeChatRef.current = null;
    }
  }, [tab, chatMatch?.conversationId]);

  // Calculate total unread count and update badge
  const totalUnread = useMemo(() => {
    return dbMatches.reduce((sum, m) => sum + (m.unreadCount || 0), 0);
  }, [dbMatches]);

  useEffect(() => {
    updateBadge(totalUnread);
  }, [totalUnread, updateBadge]);

  // Subscribe to new messages for notifications
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel('notification-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const message = payload.new as any;

          // Don't notify for own messages
          if (message.sender_id === currentUserId) return;

          // Don't notify if viewing this conversation
          if (activeChatRef.current === message.conversation_id) return;

          // Get sender info from allLoadedProfiles
          const sender = allLoadedProfiles.find(p => p.id === message.sender_id);
          const senderName = sender?.name || 'Alguien';

          // Show notification
          showNotification({
            title: `Nuevo mensaje de ${senderName}`,
            body: message.content.length > 50
              ? message.content.substring(0, 50) + '...'
              : message.content,
            tag: `message-${message.conversation_id}`,
          });

          // Play sound
          playSound();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe().then(() => {
        supabase.removeChannel(channel);
      });
    };
  }, [currentUserId, allLoadedProfiles, showNotification, playSound]);

  useEffect(() => {
    if (cohortProfiles.length > 0) {
      setAllLoadedProfiles(prev => {
        const existing = new Map(prev.map(p => [p.id, p]));
        let changed = false;
        cohortProfiles.forEach(p => {
          if (!existing.has(p.id)) {
            existing.set(p.id, p);
            changed = true;
          }
        });
        return changed ? Array.from(existing.values()) : prev;
      });
    }
  }, [cohortProfiles]);

  // Sync matched profiles and local matches together to avoid race conditions
  useEffect(() => {
    if (dbMatches.length > 0) {
      // First, add all matched profiles to allLoadedProfiles
      const matchedProfiles = dbMatches
        .filter(m => m.matchedProfile)
        .map(m => convertProfileToLegacy(m.matchedProfile))
        .filter(Boolean);

      if (matchedProfiles.length > 0) {
        setAllLoadedProfiles(prev => {
          const existing = new Map(prev.map(p => [p.id, p]));
          let changed = false;
          matchedProfiles.forEach(p => {
            if (p && !existing.has(p.id)) {
              existing.set(p.id, p);
              changed = true;
            }
          });
          return changed ? Array.from(existing.values()) : prev;
        });
      }

      // Then update localMatches
      setLocalMatches(dbMatches.map(m => ({
        id: m.user_id === currentUserId ? m.matched_user_id : m.user_id,
        type: m.match_type || "organic",
        icebreaker: m.icebreaker || ICEBREAKERS[0],
        hasConversation: m.has_conversation || !!m.conversation,
        matchId: m.id,
        conversationId: m.conversation?.id || null,
        unreadCount: m.unreadCount || 0,
        lastMessage: m.lastMessage || null,
        lastMessageAt: m.lastMessageAt || m.created_at,
      })));
    } else {
      setLocalMatches([]);
    }
  }, [dbMatches, currentUserId, ICEBREAKERS]);

  useEffect(() => {
    if (authProfile) setPrivacySettings({ showLocation: authProfile.show_location ?? true, showPhone: authProfile.show_phone ?? true });
  }, [authProfile]);

  useEffect(() => {
    if (authProfile && !authProfile.has_logged_in) setShowOnboarding(true);
  }, [authProfile]);

  const cohortInitializedRef = useRef(false);
  useEffect(() => {
    if (cohorts.length > 0 && !cohortInitializedRef.current) {
      cohortInitializedRef.current = true;
      setSelectedCohortId(userCohorts[0] || cohorts[0]?.id || null);
    }
  }, [cohorts, userCohorts]);

  const selectedCohort = cohorts.find(c => c.id === selectedCohortId);

  // Get unique filter options from profiles
  const COUNTRY_LIST = [
    "El Salvador", "Guatemala", "Honduras", "Costa Rica", "Nicaragua",
    "Peru", "Mexico", "Venezuela", "Colombia", "Republica Dominicana",
  ];

  const filterOptions = useMemo(() => {
    const allOffers = new Set();
    const allSeeks = new Set();

    cohortProfiles.forEach(p => {
      (p.offers || []).forEach(o => allOffers.add(o));
      (p.seeks || []).forEach(s => allSeeks.add(s));
    });

    return {
      offers: Array.from(allOffers).sort(),
      seeks: Array.from(allSeeks).sort(),
    };
  }, [cohortProfiles]);

  // Filter and sort profiles
  const sorted = useMemo(() => {
    let filtered = cohortProfiles.filter(p => p.id !== currentUserId);

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(p =>
        p.name?.toLowerCase().includes(term) ||
        p.role?.toLowerCase().includes(term) ||
        p.org?.toLowerCase().includes(term) ||
        p.pitch?.toLowerCase().includes(term)
      );
    }

    // Apply offers filter
    if (filters.offers.length > 0) {
      filtered = filtered.filter(p =>
        (p.offers || []).some(o => filters.offers.includes(o))
      );
    }

    // Apply seeks filter
    if (filters.seeks.length > 0) {
      filtered = filtered.filter(p =>
        (p.seeks || []).some(s => filters.seeks.includes(s))
      );
    }

    // Apply country filter
    if (filters.country) {
      filtered = filtered.filter(p => p.country === filters.country);
    }

    // Sort by compatibility
    return filtered.sort((a, b) => (me ? calcCompat(me, b) - calcCompat(me, a) : 0));
  }, [cohortProfiles, currentUserId, me, searchTerm, filters]);

  // Check if any filters are active
  const hasActiveFilters = searchTerm.trim() || filters.offers.length > 0 || filters.seeks.length > 0 || filters.country;

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchTerm("");
    setFilters({ offers: [], seeks: [], country: "" });
  }, []);

  // Circular index - wraps around when reaching the end
  const current = sorted.length > 0 ? sorted[currentProfileIndex % sorted.length] : null;

  // Check if current profile already has a match
  const currentHasMatch = current ? localMatches.some(m => m.id === current.id) : false;

  // Reset index when cohort changes
  useEffect(() => { setCurrentProfileIndex(0); }, [selectedCohortId]);

  // Move to next profile (circular)
  const nextProfile = () => {
    if (sorted.length > 0) {
      setCurrentProfileIndex(prev => (prev + 1) % sorted.length);
    }
  };

  const swipe = async (dir) => {
    if (!current || !currentUserId) return;

    // If already has match and swiping right, go to chat instead
    if (dir === 'right' && currentHasMatch) {
      const existingMatch = localMatches.find(m => m.id === current.id);
      if (existingMatch) {
        openChat(existingMatch);
        return;
      }
    }

    // Record swipe and check for match
    const result = await recordSwipe(current.id, dir);

    if (result.isMatch && !currentHasMatch) {
      // Use icebreaker from match result, fallback to getting a new one
      const ice = result.icebreaker || await getRandomIcebreaker();
      setLocalMatches(p => [...p, { id: current.id, type: "organic", icebreaker: ice, hasConversation: false, matchId: result.matchId }]);
      setShowMatch({ profile: current, icebreaker: ice });
    }

    // Always move to next profile
    nextProfile();
  };

  const openChat = async (m) => {
    let conversationId = m.conversationId;
    const isNew = !m.hasConversation && !conversationId;
    if (m.matchId && !conversationId) {
      const conv = await startConversation(m.matchId);
      conversationId = conv?.id;
    }
    setChatMatch({ ...m, conversationId });
    setTab("chat");
    setLocalMatches(p => p.map(x => x.id === m.id ? { ...x, hasConversation: true, conversationId } : x));

    // Mark messages as read when opening chat
    if (conversationId && markAsRead) {
      markAsRead(conversationId);
    }
  };

  const manualMatch = async (profile) => {
    if (!createManualMatch) return;
    // Prevent self-match
    if (profile.id === currentUserId) {
      console.error('Cannot match with yourself');
      return;
    }
    const ice = await getRandomIcebreaker();
    const result = await createManualMatch(profile.id, ice);
    if (!result.error && result.matchId) {
      if (!localMatches.find(m => m.id === profile.id)) {
        setLocalMatches(p => [...p, { id: profile.id, type: "cupido", icebreaker: ice, hasConversation: false, matchId: result.matchId }]);
      }
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      // Delete messages
      await supabase.from('messages').delete().eq('sender_id', userId);

      // Delete conversations for user's matches
      const { data: userMatches } = await supabase
        .from('matches')
        .select('id')
        .or(`user_id.eq.${userId},matched_user_id.eq.${userId}`);

      if (userMatches && userMatches.length > 0) {
        await supabase.from('conversations').delete().in('match_id', userMatches.map(m => m.id));
      }

      // Delete matches
      await supabase.from('matches').delete().or(`user_id.eq.${userId},matched_user_id.eq.${userId}`);

      // Delete swipes
      await supabase.from('swipes').delete().or(`user_id.eq.${userId},swiped_user_id.eq.${userId}`);

      // Delete cohort memberships
      await supabase.from('cohort_members').delete().eq('profile_id', userId);

      // Delete XP log
      await supabase.from('xp_log').delete().eq('user_id', userId);

      // Delete profile
      await supabase.from('profiles').delete().eq('id', userId);

      // Refresh profiles
      if (refetchAllProfiles) refetchAllProfiles();
      if (refetchCohortProfiles) refetchCohortProfiles();
      fetchAdminCohortProfiles(activeAdminCohortId);

      return { error: null };
    } catch (err) {
      return { error: err };
    }
  };

  const handlePrivacyChange = async (s) => {
    setPrivacySettings(s);
    await updateProfile({ show_location: s.showLocation, show_phone: s.showPhone });
  };

  const handleSaveProfile = async (updates) => {
    const completing = showOnboarding || !authProfile?.has_logged_in;
    await updateProfile(updates);
    setShowEditProfile(false);
    setShowOnboarding(false);
  };

  const handleLogout = async () => { await signOut(); navigate("/auth"); };

  const handleUnmatch = async (matchId) => {
    if (deleteMatch) {
      const result = await deleteMatch(matchId);
      if (!result.error) {
        setLocalMatches(prev => prev.filter(m => m.matchId !== matchId));
      }
    }
  };

  const handleUndoSwipe = async () => {
    if (undoLastSwipe) {
      const result = await undoLastSwipe();
      if (result.success) {
        // Go back to previous profile
        setCurrentProfileIndex(prev => prev > 0 ? prev - 1 : sorted.length - 1);
      }
    }
  };

  // Import users from CSV (admin only) - uses RPC function to bypass RLS
  const handleImportUsers = async (users) => {
    try {
      let importedCount = 0;
      let errors: string[] = [];

      for (const user of users) {
        const email = (user.email || "").trim();
        if (!email) continue;

        // Parse expertise if provided (comma or semicolon separated)
        let expertiseArray: string[] | null = null;
        const expertiseRaw = user.expertise || user["tu expertise"] || "";
        if (expertiseRaw) {
          expertiseArray = expertiseRaw.split(/[,;]/).map((e: string) => e.trim()).filter(Boolean);
          if (expertiseArray.length === 0) expertiseArray = null;
        }

        // Call RPC function that bypasses RLS
        const { data, error } = await supabase.rpc("admin_import_user", {
          p_email: email,
          p_name: user.nombre || "",
          p_password: user.password || null,
          p_country: user.pais || user.country || null,
          p_city: user.ciudad || user.city || null,
          p_role: user.rol || user.role || user["tipo de organizacion"] || null,
          p_work_type: user.work_type || user["tipo de trabajo"] || null,
          p_expertise: expertiseArray,
          p_whatsapp: user.whatsapp || null,
          p_linkedin: user.linkedin || null,
        });

        if (error) {
          console.error("RPC error for", email, error);
          errors.push(`${email}: ${error.message}`);
          continue;
        }

        if (data && data.success) {
          importedCount++;
          console.log(`Imported ${email}:`, data.action);

          // Add to cohort if selected
          if (selectedCohortId && data.id) {
            await supabase.rpc("admin_add_to_cohort", {
              p_profile_id: data.id,
              p_cohort_id: selectedCohortId,
            });
          }
        } else {
          console.error("Import failed for", email, data?.error);
          errors.push(`${email}: ${data?.error || "Unknown error"}`);
        }
      }

      if (errors.length > 0) {
        console.error("Import errors:", errors);
      }

      return { error: null, count: importedCount };
    } catch (err) {
      console.error("Import error:", err);
      return { error: err instanceof Error ? err : new Error("Import failed"), count: 0 };
    }
  };

  // Only show Admin tab for admins
  const baseTabs = [
    { id: "swipe", label: "Explorar", icon: <Search size={18} /> },
    { id: "matches", label: "Conexiones", icon: <Target size={18} />, badge: localMatches.length || undefined },
    { id: "map", label: "Mapa", icon: <MapIcon size={18} /> },
    { id: "profile", label: "Perfil", icon: <User size={18} /> },
  ];
  const tabs = me?.isAdmin ? [...baseTabs, { id: "admin", label: "Admin", icon: <Shield size={18} /> }] : baseTabs;

  if (showOnboarding && authProfile) return <Onboarding profile={authProfile} onComplete={handleSaveProfile} />;

  if (authLoading || (profilesLoading && cohortProfiles.length === 0)) {
    return (
      <div style={{ minHeight: "100vh", background: S.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 48, height: 48, border: `4px solid ${S.blue}20`, borderTopColor: S.blue, borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 24, fontWeight: 700, color: S.blue, margin: 0 }}>Negoworking</h1>
          <p style={{ color: S.textSec, fontSize: 13, marginTop: 8 }}>Cargando perfiles...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: S.bg, fontFamily: "'DM Sans', sans-serif", color: S.text }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>
      <style>{`* { box-sizing: border-box; margin: 0; } ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: ${S.border}; border-radius: 4px; } input::placeholder { color: ${S.textTer}; }`}</style>

      {/* Hide main header when in chat mode */}
      {tab !== "chat" && (
        <Header me={me} selectedCohort={selectedCohort} onToggleCohortPicker={() => setShowCohortPicker(!showCohortPicker)} onLogout={handleLogout} />
      )}
      {showCohortPicker && tab !== "chat" && <CohortPicker cohorts={cohorts} selectedCohortId={selectedCohortId} onSelect={setSelectedCohortId} onClose={() => setShowCohortPicker(false)} />}

      <div style={{
        maxWidth: tab === "chat" ? "100%" : 440,
        margin: "0 auto",
        padding: tab === "chat" ? "0" : "14px 14px 100px",
        minHeight: tab === "chat" ? undefined : "calc(100vh - 130px)",
        height: tab === "chat" ? "100dvh" : undefined,
        display: tab === "chat" ? "flex" : undefined,
        flexDirection: tab === "chat" ? "column" : undefined,
      }}>
        {tab === "swipe" && (
          <div>
            {/* Search Bar */}
            <div style={{ marginBottom: "12px" }}>
              <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                <div style={{ flex: 1, position: "relative" }}>
                  <input
                    type="text"
                    placeholder="Buscar por nombre, rol u organizacion..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentProfileIndex(0); }}
                    style={{
                      width: "100%",
                      padding: "10px 12px 10px 36px",
                      borderRadius: "12px",
                      border: `1px solid ${S.border}`,
                      background: S.card,
                      fontSize: "14px",
                      fontFamily: "'DM Sans', sans-serif",
                      color: S.text,
                      outline: "none",
                    }}
                  />
                  <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: S.textTer, display: "flex", alignItems: "center" }}><Search size={16} /></span>
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "12px",
                    border: `1px solid ${hasActiveFilters ? S.blue : S.border}`,
                    background: hasActiveFilters ? S.blueBg : S.card,
                    color: hasActiveFilters ? S.blue : S.textSec,
                    fontSize: "14px",
                    cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <Settings size={16} /> Filtros {hasActiveFilters && `(${filters.offers.length + filters.seeks.length + (filters.country ? 1 : 0)})`}
                </button>
              </div>

              {/* Filter Panel */}
              {showFilters && (
                <div style={{
                  background: S.card,
                  border: `1px solid ${S.border}`,
                  borderRadius: "12px",
                  padding: "16px",
                  marginBottom: "12px",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <span style={{ fontSize: "14px", fontWeight: 700, color: S.text, fontFamily: "'DM Sans', sans-serif" }}>Filtros</span>
                    {hasActiveFilters && (
                      <button onClick={clearFilters} style={{ padding: "4px 10px", borderRadius: "8px", border: "none", background: S.redBg, color: S.red, fontSize: "12px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
                        Limpiar todo
                      </button>
                    )}
                  </div>

                  {/* Country Filter */}
                  <div style={{ marginBottom: "12px" }}>
                    <label style={{ fontSize: "12px", color: S.textSec, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", display: "block", marginBottom: "6px" }}>Pais</label>
                    <select
                      value={filters.country}
                      onChange={(e) => { setFilters(f => ({ ...f, country: e.target.value })); setCurrentProfileIndex(0); }}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        border: `1px solid ${S.border}`,
                        background: S.card,
                        fontSize: "13px",
                        fontFamily: "'DM Sans', sans-serif",
                        color: S.text,
                      }}
                    >
                      <option value="">Todos los paises</option>
                      {COUNTRY_LIST.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  {/* Offers Filter */}
                  <div style={{ marginBottom: "12px" }}>
                    <label style={{ fontSize: "12px", color: S.textSec, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", display: "block", marginBottom: "6px" }}>Ofrece</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {filterOptions.offers.map(o => (
                        <button
                          key={o}
                          onClick={() => {
                            setFilters(f => ({
                              ...f,
                              offers: f.offers.includes(o) ? f.offers.filter(x => x !== o) : [...f.offers, o]
                            }));
                            setCurrentProfileIndex(0);
                          }}
                          style={{
                            padding: "5px 10px",
                            borderRadius: "8px",
                            border: `1px solid ${filters.offers.includes(o) ? S.blue : S.border}`,
                            background: filters.offers.includes(o) ? S.blueBg : S.card,
                            color: filters.offers.includes(o) ? S.blue : S.textSec,
                            fontSize: "12px",
                            cursor: "pointer",
                            fontFamily: "'DM Sans', sans-serif",
                            fontWeight: 500,
                          }}
                        >
                          {o}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Seeks Filter */}
                  <div>
                    <label style={{ fontSize: "12px", color: S.textSec, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", display: "block", marginBottom: "6px" }}>Busca</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {filterOptions.seeks.map(s => (
                        <button
                          key={s}
                          onClick={() => {
                            setFilters(f => ({
                              ...f,
                              seeks: f.seeks.includes(s) ? f.seeks.filter(x => x !== s) : [...f.seeks, s]
                            }));
                            setCurrentProfileIndex(0);
                          }}
                          style={{
                            padding: "5px 10px",
                            borderRadius: "8px",
                            border: `1px solid ${filters.seeks.includes(s) ? S.green : S.border}`,
                            background: filters.seeks.includes(s) ? S.greenBg : S.card,
                            color: filters.seeks.includes(s) ? S.green : S.textSec,
                            fontSize: "12px",
                            cursor: "pointer",
                            fontFamily: "'DM Sans', sans-serif",
                            fontWeight: 500,
                          }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Results count */}
              {hasActiveFilters && (
                <div style={{ fontSize: "12px", color: S.textSec, fontFamily: "'DM Sans', sans-serif", marginBottom: "8px", textAlign: "center" }}>
                  {sorted.length} perfil{sorted.length !== 1 ? 'es' : ''} encontrado{sorted.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
              <UndoButton canUndo={canUndo} onUndo={handleUndoSwipe} />
              {sorted.length > 0 && (
                <span style={{ fontSize: "12px", color: S.textSec, fontFamily: "'DM Sans', sans-serif" }}>
                  {(currentProfileIndex % sorted.length) + 1} / {sorted.length}
                </span>
              )}
            </div>
            {current ? (
              <>
                {currentHasMatch && (
                  <div style={{
                    background: S.greenBg,
                    color: S.green,
                    padding: "8px 16px",
                    borderRadius: "8px",
                    textAlign: "center",
                    marginBottom: "12px",
                    fontSize: "13px",
                    fontWeight: 600,
                    fontFamily: "'DM Sans', sans-serif"
                  }}>
                    <CheckCircle size={14} style={{ display: "inline-block", verticalAlign: "middle", marginRight: 4 }} /> Ya tienes conexión con esta persona
                  </div>
                )}
                <ProfileCard profile={current} currentUser={me} onLeft={() => swipe("left")} onRight={() => swipe("right")} getCompatibility={getCompatibility} hasMatch={currentHasMatch}/>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <div style={{ fontSize: 56, marginBottom: 12 }}>{cohortProfiles.length > 0 ? "✅" : "👥"}</div>
                <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: 20, color: S.text }}>
                  {cohortProfiles.length > 0 ? "Ya revisaste todos los perfiles" : "No hay perfiles"}
                </h3>
                <p style={{ fontSize: 14, color: S.textSec }}>
                  {cohortProfiles.length > 0 ? "Revisa tus conexiones o usa los filtros para explorar de nuevo" : "No hay miembros en esta cohorte aun"}
                </p>
              </div>
            )}
          </div>
        )}
        {tab === "map" && (
          <MapView
            profiles={mapProfiles}
            privacySettings={privacySettings}
            currentUserId={currentUserId}
            currentUser={me}
            matches={localMatches}
            onConnect={manualMatch}
            onOpenChat={openChat}
            getCompatibility={getCompatibility}
          />
        )}
        {tab === "matches" && <MatchesList matches={localMatches} allProfiles={allLoadedProfiles} onOpenChat={openChat} onUnmatch={handleUnmatch}/>}
        {tab === "chat" && chatMatch && (
          <ChatView
            profile={allLoadedProfiles.find(p => p.id === chatMatch.id)}
            icebreaker={chatMatch.icebreaker}
            onBack={() => setTab("matches")}
            conversationId={chatMatch.conversationId}
            currentUserId={currentUserId}
            allMatches={localMatches}
            allProfiles={allLoadedProfiles}
            onSwitchChat={openChat}
          />
        )}
        {tab === "profile" && !showEditProfile && <MyProfile profile={me} privacySettings={privacySettings} onPrivacyChange={handlePrivacyChange} matches={localMatches} onEdit={() => setShowEditProfile(true)}/>}
        {tab === "profile" && showEditProfile && (
          <ProfileForm
            profile={authProfile}
            onSave={handleSaveProfile}
            onCancel={() => setShowEditProfile(false)}
            onDeleteAccount={deleteAccount ? async () => {
              const result = await deleteAccount();
              if (!result.error) navigate("/auth");
              return result;
            } : undefined}
            onChangePassword={changePassword}
          />
        )}
        {tab === "admin" && me?.isAdmin && (
          <AdminPanel
            allProfiles={adminCohortProfiles}
            matches={localMatches}
            cohortStats={adminCohortStats}
            onManualMatch={manualMatch}
            cohortName={selectedCohort?.name}
            currentUserId={currentUserId}
            cohorts={allCohorts}
            onCreateCohort={createCohort ? async (data) => {
              const result = await createCohort(data);
              if (!result.error && fetchAllCohorts) {
                const updated = await fetchAllCohorts();
                setAllCohorts(updated);
              }
              return result;
            } : undefined}
            onUpdateCohort={updateCohort ? async (id, data) => {
              const result = await updateCohort(id, data);
              if (!result.error && fetchAllCohorts) {
                const updated = await fetchAllCohorts();
                setAllCohorts(updated);
              }
              return result;
            } : undefined}
            onDeleteCohort={deleteCohort ? async (id) => {
              const result = await deleteCohort(id);
              if (!result.error && fetchAllCohorts) {
                const updated = await fetchAllCohorts();
                setAllCohorts(updated);
              }
              return result;
            } : undefined}
            onImportUsers={handleImportUsers}
            allSystemProfiles={allSystemProfiles}
            onAddMemberToCohort={addMemberToCohort}
            onRemoveMemberFromCohort={removeMemberFromCohort}
            selectedCohortId={activeAdminCohortId}
            onRefreshProfiles={() => { refetchAllProfiles(); refetchCohortProfiles(); fetchAdminCohortProfiles(activeAdminCohortId); }}
            onDeleteUser={handleDeleteUser}
            onChangeCohortFilter={(cohortId) => { setAdminCohortId(cohortId); setSelectedCohortId(cohortId); }}
          />
        )}
        {tab === "admin" && !me?.isAdmin && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ marginBottom: 12, display: "flex", justifyContent: "center" }}><Lock size={56} /></div>
            <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: 20, color: S.text }}>Acceso restringido</h3>
            <p style={{ fontSize: 14, color: S.textSec }}>No tienes permisos para acceder a esta seccion</p>
          </div>
        )}
      </div>

      {tab !== "chat" && !showEditProfile && <BottomNav tabs={tabs} activeTab={tab} onTabChange={(id) => { setTab(id); setShowEditProfile(false); }} />}
      {showMatch && <MatchAnimation profile={showMatch.profile} icebreaker={showMatch.icebreaker} onClose={() => setShowMatch(null)} onSendMessage={() => {
        const match = localMatches.find(m => m.id === showMatch.profile.id);
        if (match) openChat(match);
        setShowMatch(null);
      }}/>}
    </div>
  );
}
