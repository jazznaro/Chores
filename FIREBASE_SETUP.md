
# Firebase Manual Setup Guide

To move from Google Sheets to Firebase, you need to create a project in the Google Cloud Console. This process is free and requires no credit card for the "Spark" plan.

## Step 1: Create the Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **"Create a project"** (or "Add project").
3. Name it `family-chores-app` (or similar).
4. Disable Google Analytics (it simplifies setup as you won't need to accept extra cookie policies).
5. Click **Create Project**.

## Step 2: Enable Authentication (Anonymous)
This allows users to "log in" invisibly so we can secure the database, without requiring them to create a username/password.

1. In the left sidebar, click **Build** -> **Authentication**.
2. Click **Get Started**.
3. Select the **Sign-in method** tab.
4. Click **Anonymous**.
5. Toggle the **Enable** switch to ON.
6. Click **Save**.

## Step 3: Enable Firestore (The Database)
1. In the left sidebar, click **Build** -> **Firestore Database**.
2. Click **Create Database**.
3. Choose a **Location** (e.g., `nam5 (us-central)` or whatever is closest to you).
4. **Important:** When asked about security rules, choose **Start in production mode**.
5. Click **Create**.

## Step 4: Set Security Rules
We need to tell Firebase that anyone with a "Sharing Code" can read/write to that specific family group, but not others.

1. Inside the Firestore panel, click the **Rules** tab.
2. Delete the code currently there.
3. Paste the following code:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // A user can read/write a family group ONLY if they know the document ID (the Sharing Code)
    // and they are authenticated (even anonymously).
    match /families/{familyId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

4. Click **Publish**.

## Step 5: Get Your App Configuration
Now we need the keys to connect your React app to this project.

1. Click the **Gear Icon** (Project Settings) next to "Project Overview" in the top left.
2. Scroll down to the "Your apps" section.
3. Click the **</> (Web)** icon.
4. Give the app a nickname (e.g., "Web App").
5. Uncheck "Also set up Firebase Hosting" (we don't need this yet).
6. Click **Register app**.
7. You will see a code block labeled `const firebaseConfig = { ... }`. 
8. **Copy the content inside that object** (apiKey, authDomain, projectId, etc.).

---

## Next Steps
Once you have the `firebaseConfig` values, share them with me (or paste them into the chat), and I will:
1. Update `index.html` to include the Firebase SDK.
2. Create `services/firebaseService.ts` to replace the Google Sheets service.
3. Update `App.tsx` to use the new database.
