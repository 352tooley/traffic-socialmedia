# ✅ Multi-District Migration Checklist

Complete these steps **in order**. Check off each item as you finish.

---

## 📋 STEP 1: Backup Everything

- [ ] Open your Google Sheet
- [ ] File → Make a copy
- [ ] Name it "Traffic SM Backup - Jan 14 2026"
- [ ] Keep the backup tab open

---

## 📊 STEP 2: Update Google Sheets Structure

### Tab 1: Traffic Data

- [ ] Open "Traffic Data" tab
- [ ] Right-click on Column A header → "Insert 1 column left"
- [ ] In cell A1, type: `District`
- [ ] Select all existing data rows (A2 downward)
- [ ] In column A for existing rows, fill with: `West`
- [ ] (Optional) Add South/North stores at bottom with their districts

**Expected structure:**
```
| District | Store Name      | Traffic | Count | Submissions Per 100 |
|----------|-----------------|---------|-------|---------------------|
| West     | Chisholm Trail  | 100     | 5     | 5.00               |
| West     | Weatherford     | 80      | 3     | 3.75               |
```

---

### Tab 2: Roster

- [ ] Open "Roster" tab
- [ ] Right-click on Column A header → "Insert 1 column left"
- [ ] In cell A1, type: `District`
- [ ] Select all existing data rows
- [ ] In column A for existing rows, fill with: `West`
- [ ] (Optional) Add South/North Mobile Experts at bottom

**Expected structure:**
```
| District | Store Name      | Mobile Expert Name |
|----------|-----------------|-------------------|
| West     | Chisholm Trail  | John Smith         |
| West     | Chisholm Trail  | Jane Doe           |
```

---

### Tab 3: Passwords

- [ ] Open "Passwords" tab
- [ ] Right-click on Column A header → "Insert 1 column left"
- [ ] In cell A1, type: `District`
- [ ] Select all existing data rows
- [ ] In column A for existing rows, fill with: `West`
- [ ] (Optional) Add South/North stores at bottom

**Expected structure:**
```
| District | Store Name      | Password  |
|----------|-----------------|-----------|
| West     | Chisholm Trail  | password  |
| West     | Weatherford     | password  |
```

---

### Tab 4: Uploads

- [ ] Open "Uploads" tab (where photos are logged)
- [ ] Right-click on Column A header → "Insert 1 column left"
- [ ] In cell A1, type: `District`
- [ ] Select all existing data rows
- [ ] In column A for existing rows, fill with: `West`

**Expected structure:**
```
| District | Timestamp           | Store Name | Mobile Expert | ... |
|----------|---------------------|------------|---------------|-----|
| West     | 1/14/2026 10:30:00  | Chisholm   | John         | ... |
```

✅ **CHECKPOINT:** All 4 tabs now have "District" as Column A

---

## ⚙️ STEP 3: Update Google Apps Script

- [ ] Open your Google Sheet
- [ ] Extensions → Apps Script
- [ ] **Select ALL existing code** (Ctrl+A)
- [ ] **Delete it**
- [ ] Open file: `google-apps-script-UPDATED.js` (created above)
- [ ] **Copy ALL the code** from that file
- [ ] **Paste** into Apps Script editor
- [ ] Find line: `const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID';`
- [ ] Replace with your actual Spreadsheet ID (from URL)
- [ ] Find line: `const DRIVE_FOLDER_ID = 'YOUR_DRIVE_FOLDER_ID';`
- [ ] Replace with your actual Drive Folder ID
- [ ] Click **Save** (disk icon)
- [ ] Click **Deploy** → New deployment
- [ ] Type: Web app
- [ ] Execute as: Me
- [ ] Who has access: Anyone
- [ ] Click **Deploy**
- [ ] **Copy the new Web App URL**
- [ ] Paste it in `src/config.ts` → `APPS_SCRIPT_URL`

✅ **CHECKPOINT:** Apps Script deployed with district support

---

## 🎨 STEP 4: Update Frontend Config

### Tell me your store names:

**What stores are in your SOUTH district?**
(Example: Store A, Store B, Store C)

**What stores are in your NORTH district?**
(Example: Store X, Store Y, Store Z)

Once you provide these, I'll update `src/config.ts` for you automatically.

---

## 🧪 STEP 5: Test Everything

- [ ] Open your app
- [ ] Try logging in as Mobile Expert
- [ ] Select **West** district
- [ ] Select one of your existing stores
- [ ] Select your name
- [ ] **Upload a test photo**
- [ ] Check Google Sheet "Uploads" tab
- [ ] Verify new row has "West" in Column A

✅ **CHECKPOINT:** West district works!

---

## 🚀 STEP 6: Add South & North Data

(Once you provide store lists)

- [ ] I'll update config.ts with your stores
- [ ] Add South stores to Google Sheets (all 4 tabs)
- [ ] Add North stores to Google Sheets (all 4 tabs)
- [ ] Test login with South district
- [ ] Test login with North district

---

## 📝 STEP 7: n8n Workflow Update (If Applicable)

**Does your n8n workflow write to Google Sheets?**

If YES, you need to update it to include district:

- [ ] Open n8n workflow
- [ ] Find nodes that write to Google Sheets
- [ ] Add `district` field as FIRST column
- [ ] Set value to appropriate district ('West', 'South', or 'North')
- [ ] Save and activate workflow

---

## ✅ Migration Complete!

Once all checkboxes are checked:
- ✅ All 4 tabs have District column
- ✅ Apps Script updated and deployed
- ✅ Frontend config has all store lists
- ✅ West district tested and working
- ✅ South/North data added (when ready)
- ✅ n8n updated (if applicable)

**You now have multi-district support!** 🎉
