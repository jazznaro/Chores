
import { Chore, FamilyMember } from "../types";
import { googleSheetsService } from "./googleSheetsService";

const STORAGE_KEY = "family_chores_local_cache";
const MEMBERS_KEY = "family_members_local_cache";
const SHARING_CODE_KEY = "family_chores_sharing_code";

export const storageService = {
  getSharingCode: () => localStorage.getItem(SHARING_CODE_KEY) || '',
  
  setSharingCode: (code: string) => {
    localStorage.setItem(SHARING_CODE_KEY, code);
  },

  clearSharingCode: () => {
    localStorage.removeItem(SHARING_CODE_KEY);
    localStorage.removeItem(MEMBERS_KEY);
  },

  loadFamilyData: async (): Promise<{ chores: Chore[], members: FamilyMember[] }> => {
    const sharingCode = storageService.getSharingCode();
    
    // Try cloud first
    if (sharingCode) {
      try {
        const remoteData = await googleSheetsService.loadFamilyData(sharingCode);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(remoteData.chores));
        localStorage.setItem(MEMBERS_KEY, JSON.stringify(remoteData.members));
        return remoteData;
      } catch (error) {
        console.error("Cloud load failed, using local cache", error);
      }
    }
    
    // Fallback to local
    const choresData = localStorage.getItem(STORAGE_KEY);
    const membersData = localStorage.getItem(MEMBERS_KEY);
    
    return {
      chores: choresData ? JSON.parse(choresData) : [],
      members: membersData ? JSON.parse(membersData) : []
    };
  },

  saveFamilyData: async (chores: Chore[], members: FamilyMember[]): Promise<boolean> => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chores));
    localStorage.setItem(MEMBERS_KEY, JSON.stringify(members));
    
    const sharingCode = storageService.getSharingCode();
    if (sharingCode) {
      try {
        await googleSheetsService.saveFamilyData(sharingCode, chores, members);
        return true;
      } catch (error) {
        console.error("Cloud sync failed", error);
        return false;
      }
    }
    return false;
  }
};
