# 🚀 Multi-District Migration Guide

## Overview
This guide explains how to migrate your Google Sheets from a single district to support 3 districts (West, South, North) with **CONSOLIDATED** tabs.

**Result:** Same 4 tabs, but each now supports all 3 districts with a "District" column.

---

## 📋 Step 1: Backup Your Current Sheets

**CRITICAL:** Make a backup copy of your entire Google Sheet before making ANY changes!

1. Open your Google Sheet
2. File → Make a copy
3. Name it "Traffic SM Backup - [DATE]"
4. Keep this backup safe

---

## 📊 Step 2: Update "Traffic Data" Tab

### Current Structure:
```
| Store Name      | Traffic | Count | Submissions Per 100 |
|-----------------|---------|-------|---------------------|
| Chisholm Trail  | 100     | 5     | 5.00               |
```

### New Structure (Add "District" as FIRST column):
```
| District | Store Name      | Traffic | Count | Submissions Per 100 |
|----------|-----------------|---------|-------|---------------------|
| West     | Chisholm Trail  | 100     | 5     | 5.00               |
| West     | Weatherford     | 80      | 3     | 3.75               |
| South    | [Store Name]    | 0       | 0     | 0.00               |
| North    | [Store Name]    | 0       | 0     | 0.00               |
```

### Migration Steps:
1. **Insert Column A**: Right-click column A (Store Name) → "Insert 1 column left"
2. **Add Header**: In A1, type: `District`
3. **Fill West Data**: For all existing stores, enter `West` in column A
4. **Add South Stores**: Add rows for South district stores with District = `South`
5. **Add North Stores**: Add rows for North district stores with District = `North`
6. **Label Current Tab**: Rename tab from "Traffic Data" to "Traffic Data" (keep same name, just updated structure)

---

## 👥 Step 3: Update "Roster" Tab

### Current Structure:
```
| Store Name      | Mobile Expert Name |
|-----------------|--------------------|
| Chisholm Trail  | John Smith         |
| Chisholm Trail  | Jane Doe           |
```

### New Structure (Add "District" as FIRST column):
```
| District | Store Name      | Mobile Expert Name |
|----------|-----------------|-------------------|
| West     | Chisholm Trail  | John Smith         |
| West     | Chisholm Trail  | Jane Doe           |
| South    | [Store Name]    | [ME Name]          |
| North    | [Store Name]    | [ME Name]          |
```

### Migration Steps:
1. **Insert Column A**: Right-click column A → "Insert 1 column left"
2. **Add Header**: In A1, type: `District`
3. **Fill West Data**: For all existing MEs, enter `West` in column A
4. **Add South MEs**: Add rows for South district Mobile Experts
5. **Add North MEs**: Add rows for North district Mobile Experts

---

## 🔐 Step 4: Update "Passwords" Tab

### Current Structure:
```
| Store Name      | Password  |
|-----------------|-----------|
| Chisholm Trail  | password  |
```

### New Structure (Add "District" as FIRST column):
```
| District | Store Name      | Password  |
|----------|-----------------|-----------|
| West     | Chisholm Trail  | password  |
| West     | Weatherford     | password  |
| South    | [Store Name]    | password  |
| North    | [Store Name]    | password  |
```

### Migration Steps:
1. **Insert Column A**: Right-click column A → "Insert 1 column left"
2. **Add Header**: In A1, type: `District`
3. **Fill West Data**: For all existing stores, enter `West` in column A
4. **Add South Stores**: Add password rows for South stores
5. **Add North Stores**: Add password rows for North stores

---

## 📸 Step 5: Update "Uploads" Tab (Google Apps Script Tab)

### Current Structure:
```
| Timestamp           | Store Name | Mobile Expert | File URL | ... |
|---------------------|------------|---------------|----------|-----|
| 1/14/2026 10:30:00  | Chisholm   | John         | https:// | ... |
```

### New Structure (Add "District" as FIRST column):
```
| District | Timestamp           | Store Name | Mobile Expert | File URL | ... |
|----------|---------------------|------------|---------------|----------|-----|
| West     | 1/14/2026 10:30:00  | Chisholm   | John         | https:// | ... |
```

### Migration Steps:
1. **Insert Column A**: Right-click column A → "Insert 1 column left"
2. **Add Header**: In A1, type: `District`
3. **Fill Existing Data**: For all existing uploads, enter `West` in column A
4. **Update Apps Script** (see Step 6)

---

## ⚙️ Step 6: Update Google Apps Script

Your Google Apps Script needs to be updated to include the "District" column when writing new rows.

### Key Changes Needed:

1. **Add District Parameter** to all write operations
2. **Include District Column** in all appendRow calls
3. **Filter by District** when reading data

### Example Changes:

**BEFORE:**
```javascript
sheet.appendRow([
  timestamp,
  storeName,
  mobileExpertName,
  photoUrl,
  // ...
]);
```

**AFTER:**
```javascript
sheet.appendRow([
  district,  // NEW: Add district as FIRST column
  timestamp,
  storeName,
  mobileExpertName,
  photoUrl,
  // ...
]);
```

### Functions to Update:
- `uploadPhoto()` - Add district parameter and column
- `uploadTeamPhoto()` - Add district parameter and column
- `uploadDMPhoto()` - Add district parameter and column
- `addRoster()` - Add district parameter and column
- `removeRoster()` - Filter by district
- `getRoster()` - Filter by district
- `updatePassword()` - Filter by district
- `getPhotos()` - Filter by district (optional)

---

## 🎯 Step 7: Update Frontend Store Lists

In `src/config.ts`, update the district store lists:

```typescript
export const DISTRICT_STORES: Record<District, string[]> = {
  West: [
    'Chisholm Trail',
    'Weatherford',
    'Clifford',
    'Cleburne',
    'Stephenville',
    'Granbury',
    'Golden Triangle',
    'Rufe Snow',
    '28th Street',
  ],
  South: [
    // ADD YOUR SOUTH DISTRICT STORES HERE
    'Store 1',
    'Store 2',
    // ...
  ],
  North: [
    // ADD YOUR NORTH DISTRICT STORES HERE
    'Store 1',
    'Store 2',
    // ...
  ],
};
```

---

## ✅ Step 8: Verification Checklist

After migration, verify everything works:

### Traffic Data Tab:
- [ ] District column exists as first column
- [ ] All West stores have "West" in District column
- [ ] South stores added with "South" district
- [ ] North stores added with "North" district
- [ ] CSV publish URL still works

### Roster Tab:
- [ ] District column exists as first column
- [ ] All existing MEs labeled as "West"
- [ ] South/North MEs added
- [ ] CSV publish URL still works

### Passwords Tab:
- [ ] District column exists as first column
- [ ] All existing stores labeled as "West"
- [ ] South/North stores added
- [ ] CSV publish URL still works

### Uploads Tab:
- [ ] District column exists as first column
- [ ] Existing uploads labeled as "West"
- [ ] Apps Script updated to include district

### Frontend:
- [ ] Login shows district dropdown
- [ ] Can select West/South/North district
- [ ] Store dropdown filters by selected district
- [ ] Data loads correctly for each district
- [ ] Photo uploads work
- [ ] Reporting filters by district

---

## 🔄 Step 9: Data Flow After Migration

### Login Flow:
1. User selects **District** (West/South/North)
2. User selects **Store** (filtered by district)
3. User selects **Role** (ME/RSM/DM)
4. Frontend stores district in session

### Upload Flow:
1. ME uploads photo
2. Frontend sends: `{ district, storeName, meName, photoData }`
3. Apps Script writes: `[district, timestamp, store, ME, url, ...]`
4. Data saved with district tag

### Reporting Flow:
1. User logged in with district
2. Frontend filters all data by `session.district`
3. Only shows data for their district
4. DMs can switch between districts (future enhancement)

---

## 🚨 Common Issues & Fixes

### Issue: "Missing District Column"
**Fix:** Make sure District is the FIRST column (Column A) in all tabs

### Issue: "CSV not loading"
**Fix:** Check that published CSV URLs are still valid. Re-publish if needed:
1. File → Share → Publish to web
2. Select specific tab
3. Choose "CSV" format
4. Confirm gid= matches in config.ts

### Issue: "Stores not showing in dropdown"
**Fix:** Update `DISTRICT_STORES` in `src/config.ts` with correct store lists

### Issue: "Apps Script errors"
**Fix:** Make sure all Apps Script functions include district parameter

---

## 📝 Migration Summary

**What Changed:**
- ✅ Added "District" column to all 4 tabs (as first column)
- ✅ Labeled existing data as "West"
- ✅ Added rows for South and North districts
- ✅ Updated Apps Script to handle district
- ✅ Updated frontend to filter by district

**What Stayed the Same:**
- ✅ Still 4 tabs total (consolidation achieved!)
- ✅ Same CSV publish URLs (just updated structure)
- ✅ Same Apps Script URL
- ✅ Same user roles and permissions
- ✅ Same photo upload flow

**Result:**
- 🎯 3 districts supported
- 📊 4 tabs total (not 12!)
- 🔄 Easy to add more districts in future
- ✨ Clean, scalable architecture

---

## 🆘 Need Help?

If you encounter issues:
1. Check the backup you made in Step 1
2. Verify all column headers match exactly (case-sensitive)
3. Ensure District is always the FIRST column (Column A)
4. Test with one district at a time
5. Check browser console for error messages

---

## 🎉 You're Done!

Once migration is complete, you'll have:
- **3 districts** (West, South, North)
- **4 tabs** (Traffic Data, Roster, Passwords, Uploads)
- **District filtering** on all pages
- **Scalable structure** for future growth

**Each district operates independently with shared infrastructure!**
