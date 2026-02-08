
/**
 * GOOGLE APPS SCRIPT - CHORE TRACKER PROXY (v3.0 - ADVANCED FEATURES)
 * 
 * - Supports 'Sheet1' for Chores with extended columns
 * - Supports 'Members' sheet
 * - Syncs both datasets in one request
 */

const SHEET_NAME = 'Sheet1';
const MEMBERS_SHEET_NAME = 'Members';
// Added WeeklyDays, DueDate, CompletionHistory
const HEADERS = ['ID', 'Title', 'Assignee', 'Frequency', 'Completed', 'CreatedAt', 'SharingCode', 'LastCompletedAt', 'CompletionCount', 'WeeklyDays', 'DueDate', 'CompletionHistory'];
const MEMBER_HEADERS = ['Name', 'SharingCode', 'Color', 'Avatar'];

function doGet(e) {
  try {
    const sharingCode = e.parameter.sharingCode;
    const isTest = e.parameter.test === 'true';

    if (!sharingCode) {
      return createJsonResponse({ error: 'Missing sharingCode' });
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // --- Load Chores ---
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow(HEADERS);
    }

    if (isTest) {
      const allData = sheet.getDataRange().getValues();
      const count = allData.length <= 1 ? 0 : allData.slice(1).filter(r => String(r[6]).toUpperCase() === sharingCode.toUpperCase()).length;
      return createJsonResponse({ status: 'ok', message: 'Service is alive', count: count });
    }

    const data = sheet.getDataRange().getValues();
    let chores = [];
    if (data.length > 1) {
      chores = data.slice(1)
        .filter(row => String(row[6]).toUpperCase() === sharingCode.toUpperCase())
        .map(row => {
          // Parse WeeklyDays (e.g., "1,3,5")
          let weeklyDays = [];
          if (row[9] !== '' && row[9] !== undefined) {
             weeklyDays = String(row[9]).split(',').map(Number);
          }

          // Parse CompletionHistory (JSON string)
          let completionHistory = [];
          if (row[11] && row[11] !== '') {
            try {
              completionHistory = JSON.parse(row[11]);
            } catch (e) {
              completionHistory = [];
            }
          }

          return {
            id: String(row[0]),
            title: String(row[1]),
            assignee: String(row[2]),
            frequency: String(row[3]),
            completed: row[4] === true || String(row[4]).toUpperCase() === 'TRUE',
            createdAt: Number(row[5]),
            lastCompletedAt: row[7] ? Number(row[7]) : undefined,
            completionCount: row[8] ? Number(row[8]) : 0,
            weeklyDays: weeklyDays,
            dueDate: row[10] ? Number(row[10]) : undefined,
            completionHistory: completionHistory
          };
        });
    }

    // --- Load Members ---
    let memberSheet = ss.getSheetByName(MEMBERS_SHEET_NAME);
    let members = [];
    if (memberSheet) {
      const memberData = memberSheet.getDataRange().getValues();
      if (memberData.length > 1) {
        members = memberData.slice(1)
          .filter(row => String(row[1]).toUpperCase() === sharingCode.toUpperCase())
          .map(row => ({
            name: String(row[0]),
            color: String(row[2]),
            avatar: String(row[3])
          }));
      }
    }

    return createJsonResponse({ data: chores, members: members });
  } catch (err) {
    return createJsonResponse({ error: 'Proxy GET Error: ' + err.toString() });
  }
}

function doPost(e) {
  try {
    let payload;
    
    if (e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else if (e.parameter.data) {
      payload = JSON.parse(e.parameter.data);
    } else {
      return createJsonResponse({ error: 'No data payload received' });
    }

    const action = payload.action;
    const sharingCode = payload.sharingCode;
    const chores = payload.chores;
    const members = payload.members;

    if (action === 'sync' && sharingCode) {
      syncChores(sharingCode, chores || []);
      if (members) {
        syncMembers(sharingCode, members);
      }
      return createJsonResponse({ success: true, count: (chores || []).length });
    }

    return createJsonResponse({ error: 'Invalid sync request payload' });
  } catch (err) {
    return createJsonResponse({ error: 'Proxy POST Error: ' + err.toString() });
  }
}

function syncChores(sharingCode, newChores) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
  }

  const allValues = sheet.getDataRange().getValues();
  
  // Filter existing rows that belong to OTHER families
  const otherFamiliesRows = allValues.slice(1).filter(row => {
    if (!row || row.length < 7) return false;
    const rowCode = String(row[6]).toUpperCase();
    return rowCode && rowCode !== sharingCode.toUpperCase();
  });

  // Format new chores as rows
  const newRows = newChores.map(c => [
    c.id,
    c.title,
    c.assignee,
    c.frequency,
    c.completed,
    c.createdAt,
    sharingCode.toUpperCase(),
    c.lastCompletedAt || '',
    c.completionCount || 0,
    (c.weeklyDays || []).join(','),
    c.dueDate || '',
    JSON.stringify(c.completionHistory || [])
  ]);

  const finalData = [HEADERS, ...otherFamiliesRows, ...newRows];
  const normalizedData = normalizeData(finalData, HEADERS.length);

  sheet.clearContents();
  if (normalizedData.length > 0) {
    sheet.getRange(1, 1, normalizedData.length, HEADERS.length).setValues(normalizedData);
  } else {
    sheet.appendRow(HEADERS);
  }
}

function syncMembers(sharingCode, newMembers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(MEMBERS_SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(MEMBERS_SHEET_NAME);
    sheet.appendRow(MEMBER_HEADERS);
  }

  const allValues = sheet.getDataRange().getValues();
  
  // Filter others
  const otherMembersRows = allValues.slice(1).filter(row => {
    if (!row || row.length < 2) return false;
    const rowCode = String(row[1]).toUpperCase();
    return rowCode && rowCode !== sharingCode.toUpperCase();
  });

  // Add mine
  const newRows = newMembers.map(m => [
    m.name,
    sharingCode.toUpperCase(),
    m.color,
    m.avatar || ''
  ]);

  const finalData = [MEMBER_HEADERS, ...otherMembersRows, ...newRows];
  const normalizedData = normalizeData(finalData, MEMBER_HEADERS.length);

  sheet.clearContents();
  if (normalizedData.length > 0) {
    sheet.getRange(1, 1, normalizedData.length, MEMBER_HEADERS.length).setValues(normalizedData);
  } else {
    sheet.appendRow(MEMBER_HEADERS);
  }
}

function normalizeData(data, length) {
  return data.map(row => {
    if (row.length === length) return row;
    const newRow = new Array(length).fill('');
    row.forEach((cell, i) => {
      if (i < length) newRow[i] = cell;
    });
    return newRow;
  });
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
