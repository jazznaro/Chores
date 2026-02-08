
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Frequency, Chore, FamilyMember } from './types';
import { DEFAULT_FAMILY_MEMBERS, FREQUENCIES, Icons, getMemberColor } from './constants';
import { storageService } from './services/storageService';
import { googleSheetsService } from './services/googleSheetsService';

const WEEK_DAYS = [
  { label: 'S', value: 0 },
  { label: 'M', value: 1 },
  { label: 'T', value: 2 },
  { label: 'W', value: 3 },
  { label: 'T', value: 4 },
  { label: 'F', value: 5 },
  { label: 'S', value: 6 },
];

const App: React.FC = () => {
  const [chores, setChores] = useState<Chore[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>(DEFAULT_FAMILY_MEMBERS);
  
  // Add/Edit Form State
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState<string>('Unassigned');
  const [frequency, setFrequency] = useState<Frequency>(Frequency.DAILY);
  const [weeklyDays, setWeeklyDays] = useState<number[]>([]);
  const [dueDate, setDueDate] = useState<string>(''); // YYYY-MM-DD string for input
  const [editingChoreId, setEditingChoreId] = useState<string | null>(null);
  
  // Custom Member State
  const [isAddingMember, setIsAddingMember] = useState(false);
  
  // App State
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error' | 'success'>('idle');
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'completed'>('all');
  const [showSettings, setShowSettings] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Connection State
  const [sharingCode, setSharingCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<string>('');
  const [healthCheck, setHealthCheck] = useState<{ status: 'none' | 'checking' | 'ok' | 'fail', message: string }>({ status: 'none', message: '' });
  
  const hasLoadedRef = useRef(false);

  // Initialize App
  useEffect(() => {
    const init = async () => {
      const code = storageService.getSharingCode();
      setSharingCode(code);
      
      if (code) {
        try {
          const { chores: loadedChores, members: loadedMembers } = await storageService.loadFamilyData();
          setChores(loadedChores);
          if (loadedMembers && loadedMembers.length > 0) {
            setMembers(loadedMembers);
          }
          setLastSync(new Date());
        } catch (e) {
          console.error("Failed to load initial data", e);
        }
      }
      setIsInitialLoading(false);
      hasLoadedRef.current = true;
    };
    init();
  }, []);

  // Auto-Sync Effect
  useEffect(() => {
    if (isInitialLoading || !hasLoadedRef.current || !sharingCode) return;

    const performSync = async () => {
      setSyncStatus('syncing');
      try {
        const success = await storageService.saveFamilyData(chores, members);
        if (success) {
          setSyncStatus('success');
          setLastSync(new Date());
        } else {
          setSyncStatus('error');
        }
      } catch (e) {
        setSyncStatus('error');
      }
      setTimeout(() => setSyncStatus(prev => prev === 'syncing' ? 'idle' : prev), 3000);
    };

    const timer = setTimeout(performSync, 2000);
    return () => clearTimeout(timer);
  }, [chores, members, isInitialLoading, sharingCode]);

  // Actions
  const handleJoinList = async () => {
    const trimmed = inputCode.trim().toUpperCase();
    if (!trimmed) return;
    setConnectionStatus('Connecting...');
    setIsJoining(true);

    try {
      storageService.setSharingCode(trimmed);
      setSharingCode(trimmed);
      const { chores: loadedChores, members: loadedMembers } = await storageService.loadFamilyData();
      setChores(loadedChores);
      if (loadedMembers && loadedMembers.length > 0) {
        setMembers(loadedMembers);
      }
      setConnectionStatus('Connected!');
      setInputCode('');
      setLastSync(new Date());
      setTimeout(() => {
        setShowSettings(false);
        setConnectionStatus('');
      }, 1000);
    } catch (e) {
      setConnectionStatus('Error connecting. Check code.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleGenerateNewCode = async () => {
    setConnectionStatus('Generating...');
    const newCode = googleSheetsService.generateSharingCode();
    storageService.setSharingCode(newCode);
    setSharingCode(newCode);
    await storageService.saveFamilyData(chores, members);
    setConnectionStatus(`New code generated: ${newCode}`);
    setLastSync(new Date());
    setTimeout(() => {
      setShowSettings(false);
      setConnectionStatus('');
    }, 1500);
  };

  const handleTestConnection = async () => {
    setHealthCheck({ status: 'checking', message: 'Pinging proxy...' });
    const result = await googleSheetsService.testConnection(sharingCode);
    if (result.success) {
      setHealthCheck({ status: 'ok', message: result.message });
    } else {
      setHealthCheck({ status: 'fail', message: result.message });
    }
  };

  const handleDisconnect = () => {
    storageService.clearSharingCode();
    setSharingCode('');
    setChores([]);
    setMembers(DEFAULT_FAMILY_MEMBERS);
    setSyncStatus('idle');
    setLastSync(null);
    setShowSettings(false);
    setConnectionStatus('Disconnected.');
    window.location.reload();
  };

  const handleCopyCode = async () => {
    if (!sharingCode) return;
    try {
      await navigator.clipboard.writeText(sharingCode);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleOpenAdd = () => {
    setEditingChoreId(null);
    setTitle('');
    setAssignee('Unassigned');
    setFrequency(Frequency.DAILY);
    setWeeklyDays([]);
    setDueDate('');
    setIsAddingMember(false);
    setShowAddModal(true);
  };

  const handleOpenEdit = (chore: Chore) => {
    setEditingChoreId(chore.id);
    setTitle(chore.title);
    setAssignee(chore.assignee);
    setFrequency(chore.frequency);
    setWeeklyDays(chore.weeklyDays || []);
    
    // Convert timestamp to YYYY-MM-DD
    if (chore.dueDate) {
      const d = new Date(chore.dueDate);
      const iso = d.toISOString().split('T')[0];
      setDueDate(iso);
    } else {
      setDueDate('');
    }

    setIsAddingMember(false);
    setShowAddModal(true);
  };

  const handleSave = () => {
    if (!title.trim() || !sharingCode) return;
    
    // Handle New Member Creation
    let finalAssignee = assignee;
    if (isAddingMember) {
      const newName = assignee.trim();
      if (newName) {
        const exists = members.find(m => m.name.toLowerCase() === newName.toLowerCase());
        if (!exists) {
          const newMember: FamilyMember = {
            name: newName,
            color: getMemberColor(newName),
            avatar: `https://picsum.photos/seed/${newName}/100`
          };
          setMembers(prev => [...prev, newMember]);
          finalAssignee = newName;
        } else {
          finalAssignee = exists.name;
        }
      } else {
        finalAssignee = 'Unassigned';
      }
    }

    // Process Due Date
    let finalDueDate: number | undefined = undefined;
    if (frequency === Frequency.ONE_TIME && dueDate) {
      finalDueDate = new Date(dueDate).getTime();
    }

    // Process Weekly Days
    let finalWeeklyDays: number[] | undefined = undefined;
    if (frequency === Frequency.WEEKLY && weeklyDays.length > 0) {
      finalWeeklyDays = [...weeklyDays].sort();
    }

    const choreData: Partial<Chore> = {
      title: title.trim(),
      assignee: finalAssignee,
      frequency,
      weeklyDays: finalWeeklyDays,
      dueDate: finalDueDate,
    };

    if (editingChoreId) {
      setChores(prev => prev.map(c => c.id === editingChoreId ? { ...c, ...choreData } : c));
    } else {
      const newChore: Chore = {
        id: Math.random().toString(36).substr(2, 9),
        title: title.trim(),
        assignee: finalAssignee,
        frequency,
        completed: false,
        createdAt: Date.now(),
        lastCompletedAt: undefined,
        completionCount: 0,
        weeklyDays: finalWeeklyDays,
        dueDate: finalDueDate,
        completionHistory: []
      };
      setChores(prev => [newChore, ...prev]);
    }

    setShowAddModal(false);
    setIsAddingMember(false);
  };

  /**
   * Helper to get the start of the current week (Sunday)
   */
  const getStartOfWeek = (d = new Date()) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day; // adjust when day is sunday
    return new Date(date.setDate(diff));
  };

  /**
   * Helper to get a Date object for a specific day index of the CURRENT week
   */
  const getDateForDayIndex = (dayIndex: number) => {
    const startOfWeek = getStartOfWeek();
    const result = new Date(startOfWeek);
    result.setDate(startOfWeek.getDate() + dayIndex);
    result.setHours(0, 0, 0, 0);
    return result;
  };

  const isSameDay = (ts1: number, ts2: number) => {
    const d1 = new Date(ts1);
    const d2 = new Date(ts2);
    return d1.getDate() === d2.getDate() && 
           d1.getMonth() === d2.getMonth() && 
           d1.getFullYear() === d2.getFullYear();
  };

  const isChoreCompleted = (chore: Chore): boolean => {
    // ONE TIME
    if (chore.frequency === Frequency.ONE_TIME) {
       return chore.completed;
    }

    // ADVANCED WEEKLY (Specific Days)
    if (chore.frequency === Frequency.WEEKLY && chore.weeklyDays && chore.weeklyDays.length > 0) {
      // It's considered "completed" for the LIST VIEW if today is a scheduled day AND it is done.
      // Or if today is NOT a scheduled day, maybe we don't care?
      // Let's stick to the prompt: "Pending" vs "Completed" tab logic.
      // Simpler: If it has specific days, we always show it in lists, but maybe filter in "Pending" based on TODAY.
      const todayIndex = new Date().getDay();
      const isTodayScheduled = chore.weeklyDays.includes(todayIndex);
      
      if (!isTodayScheduled) return false; // Not due today, so effectively "done" or "not pending"
      
      const todayDate = getDateForDayIndex(todayIndex).getTime();
      return (chore.completionHistory || []).some(ts => isSameDay(ts, todayDate));
    }

    // STANDARD FREQUENCIES
    if (!chore.completed && !chore.lastCompletedAt) return false;
    // If manually marked incomplete
    if (!chore.completed) return false;

    const last = new Date(chore.lastCompletedAt!);
    const now = new Date();

    if (chore.frequency === Frequency.DAILY) {
      return isSameDay(last.getTime(), now.getTime());
    }
    
    if (chore.frequency === Frequency.WEEKLY) {
      const oneWeek = 7 * 24 * 60 * 60 * 1000;
      return (now.getTime() - chore.lastCompletedAt!) < oneWeek;
    }

    if (chore.frequency === Frequency.MONTHLY) {
      return last.getMonth() === now.getMonth() && 
             last.getFullYear() === now.getFullYear();
    }

    if (chore.frequency === Frequency.QUARTERLY) {
      const ninetyDays = 90 * 24 * 60 * 60 * 1000;
      return (now.getTime() - chore.lastCompletedAt!) < ninetyDays;
    }

    return true;
  };

  // Toggle for Standard Chores
  const toggleStandardChore = (id: string) => {
    setChores(prev => prev.map(c => {
      if (c.id !== id) return c;
      
      const currentlyDone = isChoreCompleted(c);
      const currentCount = c.completionCount || 0;
      
      if (currentlyDone) {
        return { 
          ...c, 
          completed: false, 
          lastCompletedAt: undefined,
          completionCount: Math.max(0, currentCount - 1)
        };
      } else {
        return { 
          ...c, 
          completed: true, 
          lastCompletedAt: Date.now(),
          completionCount: currentCount + 1
        };
      }
    }));
  };

  // Toggle for Advanced Weekly Chores (Specific Day)
  const toggleWeeklyDay = (choreId: string, dayIndex: number) => {
    const targetDate = getDateForDayIndex(dayIndex).getTime();
    
    setChores(prev => prev.map(c => {
      if (c.id !== choreId) return c;

      const history = c.completionHistory || [];
      const alreadyDoneIndex = history.findIndex(ts => isSameDay(ts, targetDate));
      
      let newHistory;
      if (alreadyDoneIndex >= 0) {
        // Remove it (Undo)
        newHistory = [...history];
        newHistory.splice(alreadyDoneIndex, 1);
      } else {
        // Add it (Complete)
        newHistory = [...history, Date.now()];
      }

      // Also update standard fields for compatibility/sorting
      const isDoneToday = newHistory.some(ts => isSameDay(ts, Date.now()));
      
      return {
        ...c,
        completionHistory: newHistory,
        lastCompletedAt: isDoneToday ? Date.now() : c.lastCompletedAt,
        completed: isDoneToday
      };
    }));
  };

  const removeChore = (id: string) => {
    setChores(prev => prev.filter(c => c.id !== id));
  };

  const filteredChores = useMemo(() => {
    return chores.filter(c => {
      // Always show chores that have specific weekly days to allow managing their buttons
      if (c.frequency === Frequency.WEEKLY && c.weeklyDays && c.weeklyDays.length > 0) return true;

      const completed = isChoreCompleted(c);
      if (activeTab === 'pending') return !completed;
      if (activeTab === 'completed') return completed;
      return true;
    });
  }, [chores, activeTab]);

  const closeSettings = () => {
    setShowSettings(false);
    setConfirmDisconnect(false);
  };

  if (isInitialLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-indigo-900 font-bold animate-pulse">Initializing Family Chores...</p>
      </div>
    );
  }

  // ... (Keep existing Connection Screen code roughly same, skipping for brevity as it's large and unchanged mostly)
  if (!sharingCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200 max-w-md w-full p-10 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500"></div>
          
          <div className="text-center mb-10">
            <div className="bg-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white shadow-lg shadow-indigo-100">
              <Icons.Sheet />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Welcome Home</h1>
            <p className="text-slate-500 text-sm font-medium">Connect to your family's chores list to get started.</p>
          </div>

          <div className="space-y-8">
            <div className="space-y-3">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Join Existing List</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoinList()}
                  placeholder="CODE-NAME-1234"
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:bg-white uppercase font-mono font-bold transition-all text-slate-900 placeholder:text-slate-400"
                />
                <button 
                  onClick={handleJoinList}
                  disabled={!inputCode.trim()}
                  className="px-6 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-100 active:scale-95"
                >
                  Join
                </button>
              </div>
            </div>

            <div className="relative flex items-center">
              <div className="flex-grow border-t border-slate-100"></div>
              <span className="flex-shrink-0 mx-4 text-[10px] font-black text-slate-300 uppercase tracking-widest">or</span>
              <div className="flex-grow border-t border-slate-100"></div>
            </div>

            <button 
              onClick={handleGenerateNewCode}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl text-sm font-black hover:bg-slate-800 transition-all flex items-center justify-center gap-3 shadow-xl shadow-slate-200 active:scale-95"
            >
              <Icons.Link />
              Start New Private List
            </button>
          </div>

          {connectionStatus && (
            <div className="mt-8 text-center text-xs font-bold text-indigo-600 animate-pulse">
              {connectionStatus}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8 text-slate-900 bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-20 px-4 py-4 md:px-8 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-600 rounded-lg text-white">
            <Icons.Sheet />
          </div>
          <h1 className="text-xl font-bold text-slate-900 hidden sm:block tracking-tight">Family Chores</h1>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden md:flex flex-col items-end">
            <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider ${syncStatus === 'error' ? 'text-rose-600' : 'text-slate-600'}`}>
              <span className={`h-2 w-2 rounded-full ${syncStatus === 'syncing' ? 'bg-amber-400 animate-pulse' : syncStatus === 'error' ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
              {syncStatus === 'syncing' ? 'Syncing...' : syncStatus === 'error' ? 'Sync Failed' : 'Connected'}
            </div>
            {lastSync && <span className="text-[9px] text-slate-400">Last synced {lastSync.toLocaleTimeString()}</span>}
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-full font-bold transition-all bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 shadow-md shadow-indigo-100"
            >
              <Icons.Plus />
              <span className="hidden sm:inline">Add Chore</span>
            </button>
            <button 
              onClick={() => setShowSettings(true)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-bold transition-colors border ${syncStatus === 'error' ? 'bg-rose-50 text-rose-900 border-rose-300' : 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'}`}
            >
              <span className="hidden sm:inline">Settings</span>
              <Icons.Link />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 md:py-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex bg-slate-200 p-1 rounded-xl">
              {(['all', 'pending', 'completed'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === tab ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {tab.toUpperCase()}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 font-medium">{filteredChores.length} Total</p>
          </div>

          {syncStatus === 'error' && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3 flex items-center justify-between">
              <span className="text-xs font-bold">Sync Error: Your changes may not be saved to Google Sheets.</span>
              <button 
                onClick={() => storageService.saveFamilyData(chores, members)}
                className="bg-rose-600 text-white text-[10px] px-3 py-1 rounded-lg font-black hover:bg-rose-700 active:scale-95"
              >
                Retry Sync
              </button>
            </div>
          )}

          <div className="space-y-3">
             {filteredChores.map(chore => {
                const isAdvancedWeekly = chore.frequency === Frequency.WEEKLY && chore.weeklyDays && chore.weeklyDays.length > 0;
                const isCompleted = isChoreCompleted(chore);
                
                // Due Date Display Logic
                let dueDateDisplay = null;
                if (chore.frequency === Frequency.ONE_TIME && chore.dueDate) {
                  const d = new Date(chore.dueDate);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  
                  // Clone to compare dates without time components
                  const compareDate = new Date(d);
                  compareDate.setHours(0, 0, 0, 0);
                  
                  const diffTime = compareDate.getTime() - today.getTime();
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                  
                  let text = '';
                  let color = 'text-slate-400';
                  
                  if (isCompleted) {
                     text = d.toLocaleDateString(); 
                  } else {
                      if (diffDays < 0) {
                          text = `Overdue (${Math.abs(diffDays)}d)`;
                          color = 'text-rose-600';
                      } else if (diffDays === 0) {
                          text = 'Today';
                          color = 'text-amber-600';
                      } else if (diffDays === 1) {
                          text = 'Tomorrow';
                          color = 'text-indigo-600';
                      } else {
                          text = `In ${diffDays} Days`;
                          color = 'text-indigo-500';
                      }
                  }

                  dueDateDisplay = (
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${color}`}>
                      {isCompleted ? 'Due: ' : ''}{text}
                    </span>
                  );
                }

                return (
                <div 
                  key={chore.id} 
                  className={`group bg-white rounded-2xl p-4 border transition-all hover:shadow-md hover:border-indigo-200 flex flex-col sm:flex-row sm:items-center gap-4 ${isCompleted && !isAdvancedWeekly ? 'bg-slate-50/50 border-slate-200' : 'border-slate-200 shadow-sm'}`}
                >
                  <div className="flex items-center gap-4 flex-1">
                    {/* Primary Toggle Action */}
                    {!isAdvancedWeekly ? (
                      <button 
                        onClick={() => toggleStandardChore(chore.id)}
                        className={`h-8 w-8 rounded-xl border-2 flex-shrink-0 flex items-center justify-center transition-all ${isCompleted ? 'bg-emerald-500 border-emerald-500 text-white shadow-emerald-100 shadow-lg' : 'border-slate-300 hover:border-indigo-500 active:scale-90'}`}
                      >
                        {isCompleted && <Icons.Check />}
                      </button>
                    ) : (
                      // Placeholder for advanced weekly to keep alignment, or just nothing
                      <div className="h-8 w-8 flex items-center justify-center bg-indigo-50 rounded-xl text-indigo-300">
                        <span className="text-xs font-bold">W</span>
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-bold text-slate-900 truncate transition-all ${isCompleted && !isAdvancedWeekly ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                        {chore.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <span className="flex items-center gap-1 text-[11px] font-bold text-slate-500 uppercase tracking-tight">
                          {chore.frequency}
                        </span>
                        {chore.assignee !== 'Unassigned' && (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white shadow-sm ${members.find(m => m.name === chore.assignee)?.color || 'bg-slate-500'}`}>
                            {chore.assignee}
                          </span>
                        )}
                        {dueDateDisplay}
                      </div>
                    </div>
                  </div>
                  
                  {/* Advanced Weekly Buttons */}
                  {isAdvancedWeekly && (
                    <div className="flex gap-1.5 pl-12 sm:pl-0 overflow-x-auto pb-2 sm:pb-0">
                      {WEEK_DAYS.map((day) => {
                         const isScheduled = chore.weeklyDays?.includes(day.value);
                         if (!isScheduled) return null;
                         
                         const targetDate = getDateForDayIndex(day.value);
                         const isDone = (chore.completionHistory || []).some(ts => isSameDay(ts, targetDate.getTime()));
                         const isToday = day.value === new Date().getDay();
                         
                         return (
                           <button
                             key={day.value}
                             onClick={() => toggleWeeklyDay(chore.id, day.value)}
                             className={`h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                               isDone 
                                 ? 'bg-emerald-500 text-white shadow-md shadow-emerald-100' 
                                 : isToday 
                                    ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-500 ring-offset-1' 
                                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                             }`}
                             title={isToday ? "Due Today" : ""}
                           >
                             {day.label}
                           </button>
                         );
                      })}
                    </div>
                  )}

                  <div className="flex items-center gap-1 sm:gap-2 self-end sm:self-center">
                    <button 
                      onClick={() => handleOpenEdit(chore)}
                      className="text-slate-400 hover:text-indigo-600 transition-colors opacity-0 group-hover:opacity-100 p-2 active:scale-90"
                    >
                      <Icons.Edit />
                    </button>
                    <button 
                      onClick={() => removeChore(chore.id)}
                      className="text-slate-400 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100 p-2 active:scale-90"
                    >
                      <Icons.Trash />
                    </button>
                  </div>
                </div>
              )})
            }
          </div>
        </div>
      </main>

      {/* Add/Edit Chore Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-indigo-900 text-white rounded-3xl shadow-2xl max-w-lg w-full p-8 relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setShowAddModal(false)} 
              className="absolute top-6 right-6 text-indigo-300 hover:text-white transition-colors"
            >
              ✕
            </button>
            <div className="flex items-center gap-2 mb-6">
              <h2 className="text-2xl font-bold">{editingChoreId ? 'Edit Chore' : 'New Family Chore'}</h2>
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-indigo-300 uppercase mb-2 tracking-widest">What needs to be done?</label>
                <input 
                  type="text" 
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Empty the dishwasher"
                  className="w-full bg-indigo-800 border-none rounded-2xl px-5 py-4 text-white placeholder-indigo-400 focus:ring-2 focus:ring-indigo-400 transition-all outline-none text-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-indigo-300 uppercase mb-2 tracking-widest">Whose turn?</label>
                  {!isAddingMember ? (
                    <select 
                      value={assignee}
                      onChange={(e) => {
                        if (e.target.value === 'ADD_NEW_MEMBER') {
                          setIsAddingMember(true);
                          setAssignee('');
                        } else {
                          setAssignee(e.target.value);
                        }
                      }}
                      className="w-full bg-indigo-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-400 cursor-pointer outline-none appearance-none text-white font-semibold"
                    >
                      <option value="Unassigned">Anyone</option>
                      {members.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
                      <option value="ADD_NEW_MEMBER" className="font-bold text-indigo-200">(+ Add family member)</option>
                    </select>
                  ) : (
                    <div className="relative">
                      <input 
                        type="text" 
                        autoFocus
                        value={assignee}
                        onChange={(e) => setAssignee(e.target.value)}
                        placeholder="Enter name..."
                        className="w-full bg-indigo-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-400 outline-none text-white font-semibold pr-8"
                      />
                      <button 
                        onClick={() => {
                          setIsAddingMember(false);
                          setAssignee('Unassigned');
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-indigo-400 hover:text-white px-2"
                        title="Cancel adding member"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-indigo-300 uppercase mb-2 tracking-widest">How often?</label>
                  <select 
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as Frequency)}
                    className="w-full bg-indigo-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-400 cursor-pointer outline-none appearance-none text-white font-semibold"
                  >
                    {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>

              {/* Advanced Options based on Frequency */}
              {frequency === Frequency.WEEKLY && (
                 <div>
                    <label className="block text-[10px] font-bold text-indigo-300 uppercase mb-2 tracking-widest">Which days?</label>
                    <div className="flex gap-2">
                      {WEEK_DAYS.map((day) => {
                        const isSelected = weeklyDays.includes(day.value);
                        return (
                          <button
                            key={day.value}
                            onClick={() => {
                              if (isSelected) setWeeklyDays(prev => prev.filter(d => d !== day.value));
                              else setWeeklyDays(prev => [...prev, day.value]);
                            }}
                            className={`h-10 w-10 rounded-xl text-sm font-bold transition-all ${isSelected ? 'bg-white text-indigo-900 shadow-lg scale-105' : 'bg-indigo-800 text-indigo-400 hover:bg-indigo-700'}`}
                          >
                            {day.label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-indigo-400 mt-2 font-medium">Leave empty for a standard weekly chore.</p>
                 </div>
              )}

              {frequency === Frequency.ONE_TIME && (
                 <div>
                    <label className="block text-[10px] font-bold text-indigo-300 uppercase mb-2 tracking-widest">Due Date</label>
                    <input 
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full bg-indigo-800 border-none rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-indigo-400 outline-none"
                    />
                 </div>
              )}

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={handleSave}
                  className="flex-1 bg-white text-indigo-900 font-bold py-4 rounded-2xl hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 shadow-xl active:scale-95 text-lg"
                >
                  {editingChoreId ? <Icons.Check /> : <Icons.Plus />}
                  {editingChoreId ? 'Save Changes' : (isAddingMember ? 'Add Member & Create' : 'Create Chore')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sharing Settings Modal - (Unchanged) */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Cloud Sync</h2>
                <p className="text-slate-600 text-sm mt-1 font-medium">Remote data store status.</p>
              </div>
              <button onClick={closeSettings} className="text-slate-500 hover:text-slate-800 bg-slate-100 h-8 w-8 rounded-full flex items-center justify-center transition-colors font-bold">✕</button>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6 text-center">
                  <p className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-2">Secret Sharing Code</p>
                  <div 
                    onClick={handleCopyCode}
                    className="text-2xl font-black text-indigo-900 select-all tracking-wider font-mono cursor-pointer hover:text-indigo-700 transition-colors"
                    title="Click to copy"
                  >
                    {sharingCode}
                  </div>
                  <button 
                    onClick={handleCopyCode}
                    className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                      copyFeedback 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200 active:scale-95'
                    }`}
                  >
                    {copyFeedback ? <Icons.Check /> : <Icons.Copy />}
                    {copyFeedback ? 'Copied!' : 'Copy to Clipboard'}
                  </button>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                   <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Sync Diagnostic</h3>
                   <div className="space-y-2">
                     <div className="flex justify-between items-center text-xs font-medium">
                       <span className="text-slate-500">Service Status:</span>
                       <span className={`font-bold ${syncStatus === 'error' ? 'text-rose-600' : 'text-emerald-600'}`}>
                         {syncStatus.toUpperCase()}
                       </span>
                     </div>
                     <div className="flex justify-between items-center text-xs font-medium">
                       <span className="text-slate-500">Last Successful Sync:</span>
                       <span className="text-slate-800">{lastSync ? lastSync.toLocaleTimeString() : 'Never'}</span>
                     </div>
                     
                     <div className="pt-2">
                        <button 
                          onClick={handleTestConnection}
                          disabled={healthCheck.status === 'checking'}
                          className="w-full py-2 bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-200 disabled:opacity-50 transition-all"
                        >
                          {healthCheck.status === 'checking' ? 'Testing...' : 'Test Cloud Connection'}
                        </button>
                        {healthCheck.message && (
                          <p className={`mt-2 text-[10px] font-bold p-2 rounded-lg ${healthCheck.status === 'ok' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                            {healthCheck.message}
                          </p>
                        )}
                     </div>
                   </div>
                </div>
                
                <div className="pt-4 border-t border-slate-100">
                  {!confirmDisconnect ? (
                    <button 
                      onClick={() => setConfirmDisconnect(true)}
                      className="w-full py-3 text-rose-600 font-black text-xs uppercase tracking-widest hover:bg-rose-50 rounded-xl transition-colors border border-transparent hover:border-rose-100"
                    >
                      Disconnect and Clear Session
                    </button>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <p className="text-center text-xs font-bold text-slate-500 mb-1">Are you sure? This action cannot be undone.</p>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setConfirmDisconnect(false)}
                          className="flex-1 py-3 text-slate-500 font-bold text-xs rounded-xl hover:bg-slate-100 transition-colors"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={handleDisconnect}
                          className="flex-1 py-3 bg-rose-600 text-white font-bold text-xs rounded-xl hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200"
                        >
                          Confirm Disconnect
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="pt-2">
                <button 
                  onClick={closeSettings}
                  className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-slate-800 transition-all"
                >
                  Return to Chores
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
