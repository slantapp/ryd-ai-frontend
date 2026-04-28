# RYD Learning — Developer Handover Documentation

This document is a practical guide for a new developer joining this codebase. It focuses on **where things live**, **how the app is wired**, and **which files to edit** to implement common product changes.

---

## Quick start (local dev)

- **Install**: `npm install`
- **Run**: `npm run dev`
- **Build**: `npm run build`
- **Lint**: `npm run lint`

### Environment variables

The app expects Vite environment variables:

- **`VITE_API_URL`**: API base URL used by Axios (`src/lib/axios.ts`)
- **`VITE_DEEPGRAM_API_KEY`**: used for instructor TTS/avatar (`src/components/courses/CourseDetails.tsx`, `src/components/courses/exercise/AvatarContainer.tsx`, `src/components/settings/InstructorContent.tsx`)

Create your own `.env` locally. **Do not commit secrets**.

---

## Architecture overview

### Entry points

- **`src/main.tsx`**: React mount + `BrowserRouter`
- **`src/App.tsx`**: global providers (`@tanstack/react-query`) + `ToastContainer` + router switch (`src/routes/index.tsx`)

### Routing (public vs private)

Routes are defined in:

- **`src/routes/routes.tsx`**: `PUBLIC_ROUTES` and `PRIVATE_ROUTES`
- **`src/utils/routePaths.ts`**: `PUBLIC_PATHS` and `PRIVATE_PATHS` constants

Public/private switching happens in:

- **`src/routes/index.tsx`**: if `useAuthStore(state => state.isLoggedIn)`:
  - wraps private routes in `AuthGuard` + `DashboardLayout`
  - otherwise renders public routes inside `AuthLayout`

### Layouts

- **`src/layout/AuthLayout/index.tsx`**: shell for public auth pages
- **`src/layout/dashboardLayout/index.tsx`**: shell for private app pages (TopNav + SideNav + gated content)
  - also hosts the **Subscription Gate** modal flow
- **`src/layout/dashboardLayout/TopNav.tsx`**, **`src/layout/dashboardLayout/SideNav.tsx`**: navigation UI

### API client (Axios)

- **`src/lib/axios.ts`**
  - `baseURL` from `import.meta.env.VITE_API_URL`
  - request interceptor attaches `Authorization: Bearer <token>` from `useAuthStore.getState().accessToken`

### Auth protection

- **`src/lib/AuthGuard.ts`**
  - subscribes to React Query cache
  - logs out on 401-like errors (session expiry) and shows a toast

---

## State management (Zustand) and persistence

State lives in Zustand stores under `src/stores/`.

### Auth (`useAuthStore`)

- **File**: `src/stores/authStore.ts`
- **Persist key**: `ryd-ai-platform-auth` (localStorage)
- **What it stores**:
  - `user` (sanitized; password/token omitted)
  - `accessToken`, `expiresAt`, `isLoggedIn`
- **Login endpoints**:
  - `login(email, password)` → POST `/parent/auth/login/ai`
  - `register(payload)` → POST `/parent/auth/register/ai`
  - `loginFromParentCode(decoded)` → POST `/auth/login/parent`

**If the API login payload shape changes**, update parsing in:
- `extractSession(...)` inside `src/stores/authStore.ts`

### Courses + Wishlist + Progress (`useCoursesStore`)

- **File**: `src/stores/coursesStore.ts`
- **Persisted per user**:
  - storage key is scoped as `ryd-learning-courses:<userId>` (falls back to unscoped legacy key if present)
- **What it stores**:
  - `wishlist: Set<string>`
  - `courseProgress[slug]`: course status/progress and lesson position (lessonIndex/questionIndex/etc.)

**Important behavior**
- Logout does **not** delete persisted progress; it only resets in-memory state to avoid leaking previous user data:
  - `logout()` in `src/stores/authStore.ts` calls `useCoursesStore.getState().reset()`.

### Instructor selection (`useInstructorStore`)

- **File**: `src/stores/instructorStore.ts`
- **Persist key**: `ryd-learning-instructor`

### User profile (avatar) (`useUserProfileStore`)

- **File**: `src/stores/userProfileStore.ts`
- **Persist key**: `ryd-learning-user-profile`

### Subscription session (NOT Zustand)

- **File**: `src/utils/subscriptionSession.ts`
- **Storage**: `sessionStorage`
- **Key**: `ryd-ai-subscription-v3`

This is intentionally session-scoped (clears when the browser/tab session ends).

---

## Feature map: “What do I edit to change X?”

### 1) Add / remove pages (routes)

- **Edit paths**: `src/utils/routePaths.ts`
- **Add the route**: `src/routes/routes.tsx`
- **Add the page component**:
  - public pages → `src/pages/auth/**`
  - private pages → `src/pages/app/**`

### 2) Navigation items (SideNav)

- **Nav config**: `src/utils/constants.ts` (`navItems`)
- **SideNav UI**: `src/layout/dashboardLayout/SideNav.tsx`

### 3) Authentication flow

- **Sign in page**: `src/pages/auth/sign-in/index.tsx`
- **Sign up page**: `src/pages/auth/sign-up/index.tsx`
- **Auth redirect (SSO/code)**: `src/pages/auth/AuthRedirect.tsx`
- **Login code parsing**: `src/utils/loginCode.ts`
- **Auth store + API calls**: `src/stores/authStore.ts`
- **Password reset session helper**: `src/utils/passwordResetSession.ts`

### 4) Subscription gate (who sees subscription and when)

- **Gate decision** (show modal or not):
  - `src/layout/dashboardLayout/index.tsx`
  - Gate is shown when: user cannot access AI (`user.canAccessAi !== true`) **and** no session subscription exists.
- **Gate modal flow**: `src/components/subscription/SubscriptionGateFlow.tsx`
- **Plans UI + checkout simulation**: `src/components/settings/SubscriptionContent.tsx`
- **Session storage record**: `src/utils/subscriptionSession.ts`

To change the pricing cards, edit `PLAN_META` in:
- `src/components/settings/SubscriptionContent.tsx`

### 5) Courses browsing (categories, listing, wishlist)

- **Courses page**: `src/pages/app/courses/index.tsx`
- **Course card UI**: `src/components/shared/CourseCard.tsx`
- **Category cards**: `src/components/courses/CourseCategoryFolder.tsx`
- **Category metadata**: `src/data/courseCategories.ts`

Wishlist is handled by:
- `useCoursesStore` in `src/stores/coursesStore.ts`
- Wishlist page: `src/pages/app/wishlist/index.tsx`

### 6) Course runner (lessons, questions, code tests, progress)

- **Main runner**: `src/components/courses/CourseDetails.tsx`
  - restores lesson position from `useCoursesStore.courseProgress[slug]`
  - updates status/progress in the store as the learner moves through lessons
- **Exercise subcomponents**: `src/components/courses/exercise/**`

**Where the curriculum content comes from**
- `src/data/curriculumData.ts` (large in-repo curriculum structure)

To add/modify lessons/questions, edit:
- `src/data/curriculumData.ts`

### 7) Instructor / avatar experience

- **Instructor selection UI**: `src/components/settings/InstructorContent.tsx`
- **Instructor persistence**: `src/stores/instructorStore.ts`
- **Avatar container used in exercises**: `src/components/courses/exercise/AvatarContainer.tsx`
- **Course runner avatar config**: `src/components/courses/CourseDetails.tsx`

### 8) Settings page

- **Settings route page**: `src/pages/app/settings/index.tsx`
- Feature panels under:
  - `src/components/settings/*`

### 9) Support page

- `src/pages/app/support/index.tsx`

---

## Common changes (step-by-step)

### Change the API base URL

1. Update your local `.env`:
   - `VITE_API_URL=...`
2. Confirm Axios reads it in `src/lib/axios.ts`.

### Add a new private page “Reports”

1. Add a constant to `PRIVATE_PATHS` in `src/utils/routePaths.ts`
2. Create `src/pages/app/reports/index.tsx`
3. Add the route to `PRIVATE_ROUTES` in `src/routes/routes.tsx`
4. Add nav entry in `src/utils/constants.ts`

### Add a new course or update a lesson

1. Find the course entry in `src/data/curriculumData.ts` (by `slug`)
2. Update modules/lessons/questions
3. If you need the course to show in a different category:
   - update category mapping in `src/data/courseCategories.ts` (or helper functions used by it)

### Change how progress is computed

- **Progress computation + completion status** is in:
  - `src/components/courses/CourseDetails.tsx`
  - look for the effect that calculates progress from lesson index and sets status `not-started/ongoing/completed`.

### Make progress survive logout (same device)

Already implemented:
- progress persists in `localStorage` per user (`ryd-learning-courses:<userId>`)
- logout only resets in-memory state (does not delete stored progress)

---

## Storage keys reference

- **Auth**: `localStorage["ryd-ai-platform-auth"]`
- **Courses (scoped)**: `localStorage["ryd-learning-courses:<userId>"]`
- **Instructor**: `localStorage["ryd-learning-instructor"]`
- **User profile**: `localStorage["ryd-learning-user-profile"]`
- **Subscription (session)**: `sessionStorage["ryd-ai-subscription-v3"]`

---

## Notes / gotchas

- **Analytics nav item** currently points to `PRIVATE_PATHS.ANALYTICS` which is defined as `"analytics"` (relative), not `"/analytics"`. If you implement analytics, confirm the intended route format.
- **AuthRedirect** uses `validateLoginCode(...)` (`src/utils/loginCode.ts`) and expects `?code=...` in the URL.
- **Secrets**: ensure `.env` files are not committed with real keys. Use `.env.example` in the future.

