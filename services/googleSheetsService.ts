
import { Chore, FamilyMember } from "../types";

/**
 * PROXY_URL: Ensure you have deployed your Apps Script as a 'Web App'
 * with access set to 'Anyone' and copied the URL here.
 * NOTE: If you update the script, you MUST create a NEW deployment 
 * or the URL might point to an old version.
 */
const PROXY_URL = "https://script.google.com/macros/s/AKfycbzDbNr9-MJl9i4tEGOp8mJr8aLa5cjYsP0PTL0f5-RbidWwQdm4y9tXJn7XG4BVnOY/exec";

export const googleSheetsService = {
  /**
   * Performs a simple GET request to verify the service is reachable.
   */
  testConnection: async (sharingCode: string): Promise<{ success: boolean; message: string }> => {
    console.log(`[GoogleSheetsService] Testing connection for code: ${sharingCode}`);
    try {
      const response = await fetch(`${PROXY_URL}?sharingCode=${encodeURIComponent(sharingCode)}&test=true`, {
        method: 'GET',
        mode: 'cors',
      });
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      const result = await response.json();
      if (result.error) return { success: false, message: result.error };
      
      const count = result.count !== undefined ? result.count : (result.data?.length || 0);
      return { success: true, message: `Connected to Sheet. Found ${count} chores.` };
    } catch (error: any) {
      console.error("[GoogleSheetsService] Connection test failed:", error);
      return { success: false, message: error.message || "Unknown network error" };
    }
  },

  /**
   * Loads chores and members from the central sheet.
   */
  loadFamilyData: async (sharingCode: string): Promise<{ chores: Chore[], members: FamilyMember[] }> => {
    console.log(`[GoogleSheetsService] Loading data for: ${sharingCode}`);
    try {
      const response = await fetch(`${PROXY_URL}?sharingCode=${encodeURIComponent(sharingCode)}`, {
        method: 'GET',
        mode: 'cors',
      });

      if (!response.ok) throw new Error(`Network response was not ok: ${response.status}`);
      const result = await response.json();
      
      if (result.error) {
        console.error("[GoogleSheetsService] Apps Script Error:", result.error);
        return { chores: [], members: [] };
      }
      
      console.log(`[GoogleSheetsService] Load success. Chores: ${result.data?.length || 0}, Members: ${result.members?.length || 0}`);
      
      // Ensure data types are correct coming from JSON
      const chores = (result.data || []).map((c: any) => ({
        ...c,
        weeklyDays: Array.isArray(c.weeklyDays) ? c.weeklyDays : [],
        completionHistory: Array.isArray(c.completionHistory) ? c.completionHistory : []
      }));

      return {
        chores: chores,
        members: result.members || []
      };
    } catch (error) {
      console.error("[GoogleSheetsService] Error loading data:", error);
      throw error;
    }
  },

  /**
   * Syncs the current chores and members to the central sheet.
   */
  saveFamilyData: async (sharingCode: string, chores: Chore[], members: FamilyMember[]): Promise<void> => {
    console.log(`[GoogleSheetsService] Syncing ${chores.length} chores and ${members.length} members for: ${sharingCode}`);
    try {
      const payload = {
        action: 'sync',
        sharingCode: sharingCode,
        chores: chores,
        members: members
      };

      await fetch(PROXY_URL, {
        method: 'POST',
        mode: 'no-cors', 
        headers: {
          'Content-Type': 'text/plain'
        },
        body: JSON.stringify(payload)
      });
      
      console.log("[GoogleSheetsService] POST request dispatched (no-cors mode).");
    } catch (error) {
      console.error("[GoogleSheetsService] Sync request failed:", error);
      throw error;
    }
  },

  generateSharingCode: (): string => {
    const adjectives = [
      'Happy', 'Bright', 'Swift', 'Brave', 'Golden', 'Clever', 'Kind', 'Magic', 'Silent', 'Noble', 'Grand', 
      'Lucky', 'Sunny', 'Calm', 'Wild', 'Cool', 'Super', 'Hyper', 'Mega', 'Ultra', 'Prime', 'Epic', 'Rare', 
      'Teal', 'Cyan', 'Pink', 'Blue', 'Red', 'Green', 'Gold', 'Silver', 'Bronze', 'Iron', 'Steel', 'Neon', 
      'Sonic', 'Rapid', 'Turbo', 'Astro', 'Cosmic', 'Lunar', 'Solar', 'Star', 'Sky', 'Aqua', 'Terra', 'Gaia', 
      'Mystic', 'Royal', 'Chief', 'Major', 'Captain', 'Mighty', 'Heavy', 'Light', 'Dark', 'Shadow', 'Storm', 
      'Cloud', 'Rain', 'Snow', 'Wind', 'Fire', 'Ice', 'Ancient', 'Modern', 'Future', 'Retro', 'Pixel', 
      'Digital', 'Cyber', 'Techno', 'Audio', 'Visual', 'Smart', 'Wise', 'Bold', 'Fresh', 'Clean', 'Sharp', 
      'Quick', 'Fast', 'Slow', 'Safe', 'Strong', 'Tough', 'Hard', 'Soft', 'Smooth', 'Rough', 'Solid', 
      'Liquid', 'Gas', 'Plasma', 'Atomic', 'Nuclear', 'Quantum', 'Eager', 'Fierce', 'Gentle', 'Jolly', 
      'Lively', 'Proud', 'Silly', 'Witty', 'Zesty', 'Alpine', 'Arctic', 'Desert', 'Urban', 'Rural', 
      'Coastal', 'Polar', 'Vivid', 'Alert', 'Keen', 'Able', 'Vast'
    ];
    const nouns = [
      'Panda', 'Eagle', 'Falcon', 'Tiger', 'Otter', 'Badger', 'Dolphin', 'Wolf', 'Lion', 'Bear', 'Fox', 
      'Shark', 'Whale', 'Hawk', 'Owl', 'Cat', 'Dog', 'Pup', 'Kit', 'Cub', 'Star', 'Moon', 'Sun', 'Planet', 
      'Comet', 'Rocket', 'Ship', 'Boat', 'Car', 'Bike', 'Jet', 'Plane', 'Train', 'Robot', 'Drone', 'Mecha', 
      'Cyborg', 'Ninja', 'Pirate', 'Knight', 'Wizard', 'Mage', 'King', 'Queen', 'Prince', 'Duke', 'Baron', 
      'Earl', 'Lord', 'Lady', 'Titan', 'Giant', 'Dragon', 'Hydra', 'Golem', 'Ghost', 'Spirit', 'Soul', 
      'Mind', 'Heart', 'Atom', 'Molecule', 'Cell', 'Tissue', 'Organ', 'System', 'Body', 'Brain', 'Nerve', 
      'Bone', 'Blood', 'Skin', 'Hair', 'Eye', 'Ear', 'Nose', 'Mouth', 'Hand', 'Foot', 'Leg', 'Arm', 'Finger', 
      'Toe', 'Tree', 'Flower', 'Grass', 'Leaf', 'Root', 'Stem', 'Seed', 'Fruit', 'Berry', 'Nut', 'River', 
      'Lake', 'Ocean', 'Sea', 'Pond', 'Stream', 'Creek', 'Spring', 'Well', 'Rain', 'Snow', 'Hail', 'Sleet', 
      'Fog', 'Mist', 'Cloud', 'Storm', 'Wind', 'Atlas', 'Beacon', 'Canvas', 'Delta', 'Echo', 'Fable', 
      'Glider', 'Haven', 'Image', 'Jewel', 'Karma', 'Legend', 'Matrix', 'Nexus', 'Orbit', 'Pulse', 'Quest', 
      'Radar', 'Signal', 'Token', 'Unit', 'Vault', 'Wave', 'Xenon', 'Yield', 'Zenith'
    ];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(1000 + Math.random() * 8999);
    return `${adj}-${noun}-${num}`.toUpperCase();
  }
};
