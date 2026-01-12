# Traffic Social Media Manager

A mobile-first web application for managing social media photo submissions and tracking store performance metrics.

## Features

- **Photo Upload**: Capture photos via camera or choose from gallery
- **Photo Download**: Browse and download submitted photos with filters
- **Reporting**: View store performance metrics from Google Sheets CSV
- **District Overview** (DM only): Compare all stores' performance rankings
- **Role-based Access**: Store users see only their store's data; DMs see everything

## Tech Stack

- **Frontend**: React + Vite + TypeScript
- **Backend**: Firebase (Auth, Firestore, Storage)
- **Deployment**: GitHub Pages with GitHub Actions
- **Data Source**: Google Sheets CSV for live metrics

## Setup Instructions

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable **Authentication** with Email/Password provider
4. Enable **Cloud Firestore** database
5. Enable **Storage**

### 2. Get Firebase Configuration

1. In Firebase Console, go to Project Settings > General
2. Scroll to "Your apps" and click the web icon `</>`
3. Register your app and copy the configuration values

### 3. Set Up Environment Variables

Create a `.env` file in the project root (copy from `.env.example`):

```bash
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 4. Deploy Firestore Security Rules

In the Firebase Console > Firestore > Rules, paste the contents of `firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAuthenticated() {
      return request.auth != null;
    }

    function getUserProfile() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }

    function isDM() {
      return isAuthenticated() && getUserProfile().role == 'dm';
    }

    function isStoreUser(storeName) {
      return isAuthenticated() && getUserProfile().storeName == storeName;
    }

    match /users/{userId} {
      allow read: if isAuthenticated() &&
        (request.auth.uid == userId || isDM());
      allow write: if false;
    }

    match /submissions/{submissionId} {
      allow read: if isAuthenticated() &&
        (isDM() || isStoreUser(resource.data.storeName));
      allow create: if isAuthenticated() &&
        (isDM() || isStoreUser(request.resource.data.storeName));
      allow update: if isAuthenticated() &&
        (isDM() || isStoreUser(resource.data.storeName));
      allow delete: if isDM();
    }
  }
}
```

### 5. Deploy Storage Security Rules

In Firebase Console > Storage > Rules, paste the contents of `storage.rules`:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /submissions/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
        && request.resource.contentType.matches('image/.*')
        && request.resource.size < 10 * 1024 * 1024;
    }
  }
}
```

### 6. Add Users to Firebase

#### Add DM User

1. In Firebase Console > Authentication, click "Add user"
2. Enter email and password for the DM account
3. Copy the generated UID
4. Go to Firestore > users collection
5. Click "Add document"
6. Set Document ID = the UID from step 3
7. Add fields:
   - `role`: "dm" (string)
   - `storeName`: "" (string, can be empty for DM)
   - `email`: "dm@email.com" (string)

#### Add Store Users

Create users for each store with **storeName matching exactly** from the CSV:

| Store Name |
|------------|
| Chisholm Trail |
| Weatherford |
| Clifford |
| Cleburne |
| Stephenville |
| Granbury |
| Golden Triangle |
| Rufe Snow |
| 28th Street |

For each store user:
1. Create auth user (Authentication > Add user)
2. Create Firestore document in `users` collection:
   - Document ID: user's UID
   - `role`: "store"
   - `storeName`: exact store name from CSV (e.g., "Chisholm Trail")
   - `email`: user's email

### 7. GitHub Repository Secrets

For GitHub Actions deployment, add these secrets in your repo (Settings > Secrets > Actions):

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

### 8. Enable GitHub Pages

1. Go to repository Settings > Pages
2. Source: "GitHub Actions"

## Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Changing the CSV URL Monthly

Edit `src/config.ts` and update the `CSV_URL` constant:

```typescript
export const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/YOUR_NEW_URL/pub?output=csv';
```

The CSV must have these headers:
- `Store Name` - Store identifier
- `Count` - Total submissions
- `Traffic` - Customer traffic count
- `Per 100` - (ignored, computed by app)

The row where `Store Name` equals "Total" is excluded from store listings.

## Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── Button.tsx
│   ├── DataTable.tsx
│   ├── KpiCard.tsx
│   ├── Layout.tsx
│   ├── Loading.tsx
│   ├── PhotoGrid.tsx
│   └── ProtectedRoute.tsx
├── contexts/         # React contexts
│   └── AuthContext.tsx
├── pages/            # Page components
│   ├── DistrictOverview.tsx
│   ├── DownloadPhotos.tsx
│   ├── Home.tsx
│   ├── Login.tsx
│   ├── Reporting.tsx
│   ├── StoreDetail.tsx
│   └── UploadPhoto.tsx
├── services/         # API and data services
│   ├── firebase.ts
│   ├── sheetsService.ts
│   ├── submissionsService.ts
│   └── userService.ts
├── types/            # TypeScript type definitions
│   └── index.ts
├── config.ts         # App configuration (CSV URL)
├── App.tsx           # Main app with routing
└── main.tsx          # Entry point
```

## Security Notes

- Store users can only access their own store's data
- DM users have full read access to all stores
- User documents can only be modified via Firebase Console (admin only)
- Images are restricted to 10MB and must be image type
- Authentication is required for all operations

## Deployment

The app automatically deploys to GitHub Pages when you push to the `main` branch.

**Live URL**: `https://[your-username].github.io/traffic-socialmedia/`

## License

Private - All rights reserved
