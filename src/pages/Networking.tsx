// @ts-nocheck
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfiles, useAllProfiles } from "@/hooks/useProfiles";
import { useCohorts, useIcebreakers } from "@/hooks/useCohorts";
import { useXP } from "@/hooks/useXP";
import { useMatches } from "@/hooks/useMatches";
import ProfileForm from "@/components/ProfileForm";
import Onboarding from "@/components/Onboarding";
import { supabase } from "@/lib/supabase";

import { S } from "@/components/networking/styles";
import { DEFAULT_ICEBREAKERS } from "@/components/networking/constants";
import { convertProfileToLegacy, calcCompat } from "@/components/networking/utils";
import {
  MapView, ProfileCard, MatchAnimation, ChatView,
  MatchesList, Leaderboard, MyProfile, AdminPanel,
  Header, CohortPicker, BottomNav, UndoButton,
} from "@/components/networking";

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
  const [swiped, setSwiped] = useState(new Set());
  const [chatMatch, setChatMatch] = useState(null);
  const [privacySettings, setPrivacySettings] = useState({ showLocation: true, showPhone: true });
  const [selectedCohortId, setSelectedCohortId] = useState(null);
  const [showCohortPicker, setShowCohortPicker] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [allLoadedProfiles, setAllLoadedProfiles] = useState([]);
  const [allCohorts, setAllCohorts] = useState([]);

  const { profiles: dbProfiles, loading: profilesLoading, recordSwipe, getCompatibility, undoLastSwipe, canUndo } = useProfiles({
    currentUserId, cohortId: selectedCohortId || undefined, excludeSwiped: false,
  });
  const { matches: dbMatches, startConversation, deleteMatch, createManualMatch } = useMatches(currentUserId);

  // All profiles for admin view
  const { profiles: allSystemDbProfiles, refetch: refetchAllProfiles } = useAllProfiles();
  const allSystemProfiles = useMemo(() => allSystemDbProfiles.map(convertProfileToLegacy).filter(Boolean), [allSystemDbProfiles]);
  const { awardXP } = useXP(currentUserId);

  const me = useMemo(() => authProfile ? convertProfileToLegacy(authProfile) : null, [authProfile]);
  const cohortProfiles = useMemo(() => dbProfiles.map(convertProfileToLegacy).filter(Boolean), [dbProfiles]);

  // Fetch all cohorts for admin
  useEffect(() => {
    if (me?.isAdmin && fetchAllCohorts) {
      fetchAllCohorts().then(setAllCohorts);
    }
  }, [me?.isAdmin]);

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

  useEffect(() => {
    if (cohorts.length > 0 && !selectedCohortId) {
      setSelectedCohortId(userCohorts[0] || cohorts[0]?.id || null);
    }
  }, [cohorts, userCohorts, selectedCohortId]);

  const selectedCohort = cohorts.find(c => c.id === selectedCohortId);
  const sorted = cohortProfiles.filter(p => p.id !== currentUserId && !swiped.has(p.id)).sort((a, b) => (me ? calcCompat(me, b) - calcCompat(me, a) : 0));
  const current = sorted[0];

  useEffect(() => { setSwiped(new Set()); }, [selectedCohortId]);

  const swipe = async (dir) => {
    if (!current || !currentUserId) return;
    setSwiped(p => new Set([...p, current.id]));
    const result = await recordSwipe(current.id, dir);
    awardXP('swipe');
    if (result.isMatch) {
      awardXP('match');
      // Use icebreaker from match result, fallback to getting a new one
      const ice = result.icebreaker || await getRandomIcebreaker();
      setLocalMatches(p => [...p, { id: current.id, type: "organic", icebreaker: ice, hasConversation: false, matchId: result.matchId }]);
      setShowMatch({ profile: current, icebreaker: ice });
    }
  };

  const openChat = async (m) => {
    let conversationId = m.conversationId;
    const isNew = !m.hasConversation && !conversationId;
    if (m.matchId && !conversationId) {
      const conv = await startConversation(m.matchId);
      conversationId = conv?.id;
      if (isNew && conversationId) awardXP('conversation_started');
    }
    setChatMatch({ ...m, conversationId });
    setTab("chat");
    setLocalMatches(p => p.map(x => x.id === m.id ? { ...x, hasConversation: true, conversationId } : x));
  };

  const manualMatch = async (profile) => {
    if (!createManualMatch) return;
    const ice = await getRandomIcebreaker();
    const result = await createManualMatch(profile.id, ice);
    if (!result.error && result.matchId) {
      if (!localMatches.find(m => m.id === profile.id)) {
        setLocalMatches(p => [...p, { id: profile.id, type: "cupido", icebreaker: ice, hasConversation: false, matchId: result.matchId }]);
      }
    }
  };

  const contactFromLeaderboard = async (profile) => {
    const existing = localMatches.find(m => m.id === profile.id);
    if (existing) { openChat(existing); return; }
    if (!createManualMatch) return;
    const ice = await getRandomIcebreaker();
    const result = await createManualMatch(profile.id, ice);
    if (!result.error && result.matchId) {
      const newMatch = { id: profile.id, type: "cupido", icebreaker: ice, hasConversation: false, matchId: result.matchId };
      setLocalMatches(p => [...p, newMatch]);
      openChat(newMatch);
    }
  };

  const handlePrivacyChange = async (s) => {
    setPrivacySettings(s);
    await updateProfile({ show_location: s.showLocation, show_phone: s.showPhone });
  };

  const handleSaveProfile = async (updates) => {
    const completing = showOnboarding || !authProfile?.has_logged_in;
    await updateProfile(updates);
    if (completing) awardXP('profile_complete');
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
      if (result.success && result.undoneProfile) {
        setSwiped(prev => {
          const newSet = new Set(prev);
          newSet.delete(result.undoneProfile.id);
          return newSet;
        });
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
    { id: "swipe", label: "Explorar", icon: "🔍" },
    { id: "leaderboard", label: "Ranking", icon: "🏆" },
    { id: "matches", label: "Conexiones", icon: "🎯", badge: localMatches.length || undefined },
    { id: "map", label: "Mapa", icon: "🗺️" },
    { id: "profile", label: "Perfil", icon: "👤" },
  ];
  const tabs = me?.isAdmin ? [...baseTabs, { id: "admin", label: "Admin", icon: "🛡️" }] : baseTabs;

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

      <Header me={me} selectedCohort={selectedCohort} onToggleCohortPicker={() => setShowCohortPicker(!showCohortPicker)} onLogout={handleLogout} />
      {showCohortPicker && <CohortPicker cohorts={cohorts} selectedCohortId={selectedCohortId} onSelect={setSelectedCohortId} onClose={() => setShowCohortPicker(false)} />}

      <div style={{ maxWidth: 440, margin: "0 auto", padding: "14px 14px 100px", minHeight: "calc(100vh - 130px)" }}>
        {tab === "swipe" && (
          <div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <UndoButton canUndo={canUndo} onUndo={handleUndoSwipe} />
            </div>
            {current ? (
              <ProfileCard profile={current} currentUser={me} onLeft={() => swipe("left")} onRight={() => swipe("right")} getCompatibility={getCompatibility}/>
            ) : (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
                <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: 20, color: S.text }}>Exploraste todos!</h3>
                <p style={{ fontSize: 14, color: S.textSec }}>Revisa tus conexiones y conecta</p>
              </div>
            )}
          </div>
        )}
        {tab === "map" && <MapView profiles={[...cohortProfiles, ...(me ? [me] : [])]} privacySettings={privacySettings} currentUserId={currentUserId}/>}
        {tab === "leaderboard" && <Leaderboard profiles={cohortProfiles} matches={localMatches} currentUserId={currentUserId} onContact={contactFromLeaderboard} cohortId={selectedCohortId}/>}
        {tab === "matches" && <MatchesList matches={localMatches} allProfiles={allLoadedProfiles} onOpenChat={openChat} onUnmatch={handleUnmatch}/>}
        {tab === "chat" && chatMatch && <ChatView profile={allLoadedProfiles.find(p => p.id === chatMatch.id)} icebreaker={chatMatch.icebreaker} onBack={() => setTab("matches")} conversationId={chatMatch.conversationId} currentUserId={currentUserId}/>}
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
            allProfiles={cohortProfiles}
            matches={localMatches}
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
            selectedCohortId={selectedCohortId}
            onRefreshProfiles={refetchAllProfiles}
          />
        )}
        {tab === "admin" && !me?.isAdmin && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>🔒</div>
            <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: 20, color: S.text }}>Acceso restringido</h3>
            <p style={{ fontSize: 14, color: S.textSec }}>No tienes permisos para acceder a esta seccion</p>
          </div>
        )}
      </div>

      {tab !== "chat" && !showEditProfile && <BottomNav tabs={tabs} activeTab={tab} onTabChange={(id) => { setTab(id); setShowEditProfile(false); }} />}
      {showMatch && <MatchAnimation profile={showMatch.profile} icebreaker={showMatch.icebreaker} onClose={() => setShowMatch(null)}/>}
    </div>
  );
}
