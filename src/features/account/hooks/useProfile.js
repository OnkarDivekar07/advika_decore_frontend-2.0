// src/features/account/hooks/useProfile.js
//
// Loads and edits the signed-in user's profile (name/email/phone/joined
// date — see GET/PATCH /api/user/profile). Kept separate from
// AuthContext's cached `user` (which only ever has {id, phone} — see
// authUtils.js) because the profile page needs the fuller record, and
// there's no reason to bloat every page's session storage with fields
// only this page uses.
import { useCallback, useEffect, useState } from 'react';
import * as userService from '@/services/userService';
import { handleError } from '@/utils/errorHandler';

export function useProfile({ autoLoad = true } = {}) {
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState('idle'); // 'idle'|'loading'|'ready'|'error'
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const data = await userService.getProfile();
      setProfile(data);
      setStatus('ready');
      return data;
    } catch (error) {
      setStatus('error');
      handleError(error, "Couldn't load your profile.");
      return null;
    }
  }, []);

  useEffect(() => {
    if (autoLoad) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoad]);

  const updateName = useCallback(async (name) => {
    setIsSaving(true);
    try {
      const updated = await userService.updateProfile({ name });
      setProfile(updated);
      return updated;
    } catch (error) {
      handleError(error, "Couldn't update your name. Please try again.");
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Called after usePhoneChange's verify step succeeds — merges the
  // updated phone straight into local state instead of a redundant
  // re-fetch, since the backend already returns the full updated profile.
  const applyProfile = useCallback((updated) => {
    setProfile(updated);
  }, []);

  return { profile, status, load, updateName, applyProfile, isSaving };
}
