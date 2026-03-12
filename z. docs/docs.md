# **Project Architecture**


> These documentation are for my understanding and revision.


  ## Table of Contents

  - [Project Overview](#project-overview)
  - [Tech Stack](#tech-stack)
  - [Backend Folder Structure](#backend-folder-structure)
  - [Frontend Folder Structure](#frontend-folder-structure)
  - [Backend Features](#backend-features)
  - [Frontend Features](#frontend-features)
  - [Notes](#notes)
  - [Future](#what-is-yet-to-come)

  ---

  ## Project Overview

  You know what it is. 

  ---

  ## Tech Stack

  | Layer | Technology |
  |---|---|
  | Backend | Node.js, Express, TS |
  | Frontend | React, Redux |
  | Database | PostgresSQL |
  | Cache | Redis Bull MQ|
  | Storage | SQL |
  | Deployment | Not yet.  |

  ---






## Backend Folder Structure

```
backend/
  ├── prisma/
  │   ├──migrations/                                                                                               
  │   └── schema.prisma
  └── src/
      ├── app.ts
      ├── server.ts
      ├── config/
      │   ├── cors.ts 
      │   ├── env.ts
      │   └── security.ts
      ├── constants/ ( mostly has the codes to return )
      │   ├── app.constants.ts
      │   ├── auth.codes.ts
      │   ├── calendar.codes.ts
      │   ├── googleCalendar.codes.ts
      │   ├── http.status.ts
      │   ├── response.messages.ts
      │   └── user.codes.ts
      ├── infra/ ( the connection establishing code )
      │   ├── redis.ts 
      │   ├── socket/
      │   │   ├── socket.events.ts
      │   │   └── socket.ts
      │   └── storage/
      │       ├── r2.client.ts
      │       ├── storage.config.ts
      │       ├── storage.service.ts
      │       └── storage.types.ts
      ├── logger/
      │   └── index.ts
      ├── middlewares/
      │   ├── error.middleware.ts 
      │   ├── notFound.middleware.ts 
      │   └── request-id.middleware.ts
      ├── modules/
      │   ├── auth/
      │   │   ├── controllers/
      │   │   │   ├── changePassword.controller.ts
      │   │   │   ├── forgotPassword.controller.ts
      │   │   │   ├── googleLogin.controller.ts
      │   │   │   ├── login.controller.ts
      │   │   │   ├── logout.controller.ts
      │   │   │   ├── me.controller.ts
      │   │   │   ├── refresh.controller.ts
      │   │   │   ├── register.controller.ts
      │   │   │   ├── resetPassword.controller.ts
      │   │   │   └── verifyEmail.controller.ts
      │   │   ├── middlewares/
      │   │   │   └── authenticate.middleware.ts
      │   │   ├── routes/
      │   │   │   └── auth.routes.ts
      │   │   ├── services/
      │   │   │   ├── email.service.ts
      │   │   │   ├── googleOAuth.service.ts
      │   │   │   └── session.service.ts
      │   │   ├── utils/
      │   │   │   ├── accessToken.ts
      │   │   │   ├── emailTokens.ts
      │   │   │   ├── refreshToken.ts
      │   │   │   ├── tokenHash.ts
      │   │   │   └── tokenTypes.ts
      │   │   └── validators/
      │   │       ├── auth.validators.ts
      │   │       └── google.validators.ts
      │   ├── calendar/
      │   │   ├── availability.controller.ts
      │   │   ├── availability.service.ts
      │   │   ├── availability.types.ts
      │   │   ├── calendar.controller.ts
      │   │   ├── calendar.routes.ts
      │   │   ├── calendar.service.ts
      │   │   └── calendar.types.ts
      │   ├── google/
      │   │   ├── googleCalendar.controller.ts
      │   │   ├── googleCalendar.routes.ts
      │   │   ├── googleCalendar.service.ts
      │   │   ├── googleCalendar.sync.service.ts
      │   │   ├── googleCalendar.types.ts
      │   │   └── googleCalendar.worker.ts
      │   ├── service-areas/
      │   │   ├── service-area.controller.ts
      │   │   ├── service-area.routes.ts
      │   │   ├── service-area.service.ts
      │   │   └── service-area.validators.ts
      │   ├── uploads/
      │   │   ├── image.queue.ts
      │   │   ├── uploads.complete.controller.ts
      │   │   ├── uploads.constants.ts
      │   │   ├── uploads.controller.ts
      │   │   ├── uploads.errors.ts
      │   │   ├── uploads.policy.ts
      │   │   ├── uploads.routes.ts
      │   │   ├── uploads.service.ts
      │   │   ├── uploads.types.ts
      │   │   └── uploads.validators.ts
      │   └── users/
      │       ├── controllers/
      │       │   ├── avatar.controller.ts
      │       │   ├── updateMyProfile.controller.ts
      │       │   └── userSettings.controller.ts
      │       ├── services/
      │       │   ├── avatarPresign.services.ts
      │       │   └── userSettings.service.ts
      │       ├── user.routes.ts
      │       └── validators/
      │           └── user.validators.ts
      ├── prisma/
      │   └── client.ts
      ├── routes/
      │   ├── dev.routes.ts
      │   └── index.ts
      ├── services/
      │   └── audit/
      │       ├── audit.service.ts
      │       ├── businessAudit.service.ts
      │       └── index.ts
      ├── types/
      │   ├── auth.ts
      │   └── express.d.ts
      ├── utils/
      │   ├── assert.ts
      │   ├── asyncHandler.ts
      │   ├── date.ts
      │   └── response.ts
      └── workers/
          └── image.worker.ts
  ```

  ---



## Frontend Folder Structure
```
  frontend/
  └── src/
      ├── App.tsx
      ├── main.tsx
      ├── index.css
      ├── app/
      │   ├── hooks.ts
      │   ├── providers.tsx
      │   ├── router.tsx
      │   └── store.ts
      ├── components/
      │   ├── auth/
      │   │   ├── SignInForm.tsx
      │   │   └── SignUpForm.tsx
      │   ├── common/
      │   │   ├── ChartTab.tsx
      │   │   ├── ComponentCard.tsx
      │   │   ├── PageBreadCrumb.tsx
      │   │   ├── PageMeta.tsx
      │   │   ├── ScrollToTop.tsx
      │   │   └── ThemeToggleButton.tsx
      │   ├── form/
      │   │   ├── Form.tsx
      │   │   ├── Label.tsx
      │   │   ├── MultiSelect.tsx
      │   │   ├── Select.tsx
      │   │   ├── date-picker.tsx
      │   │   ├── form-elements/
      │   │   │   ├── CheckboxComponents.tsx
      │   │   │   ├── DefaultInputs.tsx
      │   │   │   ├── DropZone.tsx
      │   │   │   ├── InputGroup.tsx
      │   │   │   ├── RadioButtons.tsx
      │   │   │   ├── SelectInputs.tsx
      │   │   │   ├── ServiceAreaSearch.tsx
      │   │   │   ├── TextAreaInput.tsx
      │   │   │   └── ToggleSwitch.tsx
      │   │   ├── input/
      │   │   │   ├── Checkbox.tsx
      │   │   │   ├── FileInput.tsx
      │   │   │   ├── InputField.tsx
      │   │   │   ├── Radio.tsx
      │   │   │   └── TextArea.tsx
      │   │   └── switch/
      │   │       └── Switch.tsx
      │   ├── header/
      │   │   ├── Header.tsx
      │   │   ├── NotificationDropdown.tsx
      │   │   └── UserDropdown.tsx
      │   ├── service-area/
      │   │   ├── hooks/
      │   │   │   ├── useCircleDraft.ts
      │   │   │   ├── useDrawingManager.ts
      │   │   │   └── usePolygonDraft.ts
      │   │   ├── QuickServiceCheck.tsx
      │   │   ├── ServiceAreaDraftOverlay.tsx
      │   │   ├── ServiceAreaEditor.tsx
      │   │   └── ServiceAreaToolbar.tsx
      │   ├── ui/
      │   │   ├── UploadProgressBar.tsx
      │   │   ├── alert/
      │   │   │   └── Alert.tsx
      │   │   ├── avatar/
      │   │   │   └── Avatar.tsx
      │   │   ├── badge/
      │   │   │   └── Badge.tsx
      │   │   ├── button/
      │   │   │   └── Button.tsx
      │   │   ├── dropdown/
      │   │   │   ├── Dropdown.tsx
      │   │   │   └── DropdownItem.tsx
      │   │   ├── modal/
      │   │   │   └── index.tsx
      │   │   └── table/
      │   │       └── index.tsx
      │   └── UserProfile/
      │       ├── ChangePasswordCard.tsx
      │       ├── UserAddressCard.tsx
      │       ├── UserInfoCard.tsx
      │       └── UserMetaCard.tsx
      ├── config/
      │   ├── constants.ts
      │   └── env.ts
      ├── context/
      │   ├── SidebarContext.tsx
      │   └── ThemeContext.tsx
      ├── features/
      │   ├── auth/
      │   │   ├── authApi.ts
      │   │   ├── authSelectors.ts
      │   │   ├── authSlice.ts
      │   │   ├── schemas.ts
      │   │   ├── types.ts
      │   │   ├── useAuth.ts
      │   │   ├── components/
      │   │   │   └── AuthInitializer.tsx
      │   │   ├── guards/
      │   │   │   ├── RequireAuth.tsx
      │   │   │   └── RequireGuest.tsx
      │   │   └── pages/
      │   │       ├── ForgotPasswordPage.tsx
      │   │       ├── ResetPasswordPage.tsx
      │   │       ├── SignInPage.tsx
      │   │       ├── SignUpPage.tsx
      │   │       └── VerifyEmailPage.tsx
      │   ├── availability/
      │   │   └── components/
      │   │       ├── AvailabilityEditor.tsx
      │   │       └── AvailabilitySettings.tsx
      │   ├── google/
      │   │   └── googleCalendarApi.ts
      │   ├── serviceAreas/
      │   │   ├── serviceAreaApi.ts
      │   │   ├── types.ts
      │   │   ├── components/
      │   │   │   └── ServiceAreaMap.tsx
      │   │   └── pages/
      │   │       └── ServiceAreasPage.tsx
      │   ├── uploads/
      │   │   ├── multipartUploadApi.ts
      │   │   ├── uploadsApi.ts
      │   │   └── components/
      │   │       └── UploadTester.tsx
      │   └── users/
      │       ├── availabilityApi.ts
      │       ├── calendarApi.ts
      │       ├── usersApi.ts
      │       └── userSettingsApi.ts
      ├── hooks/
      │   ├── useAvatarUpload.ts
      │   ├── useGoBack.ts
      │   ├── useModal.ts
      │   ├── useMultipartUpload.ts
      │   └── useUploadWithProgress.ts
      ├── layout/
      │   ├── AppHeader.tsx
      │   ├── AppLayout.tsx
      │   ├── AppSidebar.tsx
      │   ├── AuthLayout.tsx
      │   ├── Backdrop.tsx
      │   ├── ProtectedLayout.tsx
      │   └── SidebarWidget.tsx
      ├── lib/
      │   └── socket.ts
      ├── pages/
      │   ├── Availability.tsx
      │   ├── Calendar.tsx
      │   ├── Settings.tsx
      │   ├── UserProfiles.tsx
      │   ├── Dashboard/
      │   │   └── Home.tsx
      │   └── OtherPage/
      │       └── NotFound.tsx
      ├── routes/
      │   └── AppRoutes.tsx
      ├── services/
      │   └── axiosClient.ts
      ├── shared/
      │   └── api/
      │       └── baseQuery.ts
      ├── types/
      │   ├── api.ts
      │   └── common.ts
      └── utils/
          ├── mimeUtils.ts
          ├── multipartUpload.ts
          ├── useFilePreview.ts
          └── xhrUpload.ts
  ```



  ---


## Backend Features


  ### Auth
  This is majorily done, so I won't dumb down this more. 

  ---

  ### User

  ---

  ### Calendar - Google Calendar


  ---

  ### Service Areas


  ---

  ### Uploads


  #### Routes
  - ``` /presign ``` : called for getting a valid presign
  - ``` /complete ``` : 


  #### R2

  Files of R2:

  #### 1. `storage.service.ts`

  This is the boiler plate of the s3 aws.

  It has a function: `presignPutObject`, this is where the presignURL is generated.

  Its syntax requires:
  - `key`
  - `contentType`
  - `fileSize`

  `fileSize` is for safety just to generate a valid signedURL which shall only work for the file which it is actually claiming it is.

  This requires to know:

  - the **bucket name**
  - the **Key which we have generated**

  This creates a valid `uploadURL` using aws s3 code, with taking in:

  - the `r2 client`
  - `command` (generated using the bucket name and the key)
  - the `expiredIn` time

  ---

  #### 2. `uploads.service.ts`

  This is the file that is the main function where we call the `presignPutObject`.

  It has the function called: `presignUpload`.

  It has a lot of tasks:

  **a. enforceTheUpload policy**

  Check if the file that is being asked for presign is actually allowed to be uploaded.

  We made a small function for this that takes:

  - `input.category`
  - `input.fileSize`
  - `input.mimeType`


  **b. create the key**

  This is the only function that creates the key for me.


  **c. call the `storage.service.ts`**

  This is used for getting the `uploadURL`.




  ----

  How is file being uploaded to R2? 

  frontend sends a request to the backend with the file information, such as the file name, type, size. 

  A quick flow. 


  ```
  Frontend Upload
           ↓
Ask for presign from the backend
           ↓
Backend validates the image type (it believes the frontend, but we have to cross check also at the /complete endpoint)

(question: What if the backend is lied to and the frontend doesn't upload the file and even not calls the /complete end point? )

           ↓
Backend returns { key, uploadURL }
           ↓
Frontend Uploads to R2 storage
(the uploadURL works as a validation token for uploading object to R2 with a TTL, and key is where the upload will happen)
           ↓
Frontend receives an OK 200 from the R2 after successful upload
           ↓
frontend calls the backend on endpoint: /complete
           ↓
The backend now knows that a valid key object exists in the R2 object. 
   ```
  


  
  


  ---

  ### Prisma


  ---

  ### Audit


  ---

  ## Frontend Features

  ### <feature name>


  ---

  ### <feature name>

  <write description here>

  ---

  ### <feature name>

  <write description here>

  ---

  ### <feature name>

  <write description here>

  ---

  ### <feature name>

  <write description here>

  ---

  ### <feature name>

  <write description here>

  ---

  ## Worker - Jobs

  ### Image Worker

  This is a complete orchestration of image, how an image is getting uploaded to the R2 object , and after uploading we are getting a uploaded key, 

```
Frontend Upload
   ↓
Ask for presign from the backend
   ↓
Backend validates the image type and believes the frontend
   ↓
Backend returns { key, uploadURL }
   ↓
Frontend Uploads to R2 storage
(the uploadURL works as a validation token for uploading object to R2 with a TTL, and key is where the upload will happen)
   ↓
Frontend receives an OK 200 from the R2 after successful upload
   ↓
frontend calls the backend on endpoint: /complete
   ↓
The backend now knows that a valid key object exists in the R2 object. 
   ↓
The backend puts the key inside the imageQueue . 
   ↓
An ImageWorker that is listening to the imageQueue consumes it and performs the work. 

```
  

  ---
  ## API Reference

  ### <feature name> Endpoints

  | Method | Endpoint | Description |
  |---|---|---|
  | `GET` | `<add details>` | <write description here> |
  | `POST` | `<add details>` | <write description here> |
  | `PUT` | `<add details>` | <write description here> |
  | `DELETE` | `<add details>` | <write description here> |

  ### <feature name> Endpoints

  | Method | Endpoint | Description |
  |---|---|---|
  | `GET` | `<add details>` | <write description here> |
  | `POST` | `<add details>` | <write description here> |
  | `PUT` | `<add details>` | <write description here> |
  | `DELETE` | `<add details>` | <write description here> |

  ---

  ## Environment Variables

  ### Backend
| Variable | Description |
|---|---|
| `NODE_ENV` | Defines the environment the application is running in (development, production, test). |
| `PORT` | Port on which the backend server runs locally. |
| `DATABASE_URL` | Connection string used by Prisma to connect to the PostgreSQL database. |
| `FRONTEND_ORIGIN` | Allowed frontend origin for CORS so the frontend can make requests to the backend. |
| `ACCESS_TOKEN_SECRET` | Secret used to sign and verify JWT access tokens. |
| `REFRESH_TOKEN_SECRET` | Secret used to sign and verify JWT refresh tokens. |
| `SMTP_HOST` | SMTP server host used for sending emails (verification, password reset, etc.). |
| `SMTP_PORT` | Port used by the SMTP server. |
| `SMTP_USER` | Username used to authenticate with the SMTP server. |
| `SMTP_PASS` | Password used to authenticate with the SMTP server. |
| `SMTP_FROM` | Default email address used as the sender for outgoing emails. |
| `REDIS_HOST` | Host address of the Redis server used for caching and BullMQ queues. |
| `REDIS_PORT` | Port used to connect to the Redis server. |
| `R2_ACCOUNT_ID` | Cloudflare R2 account identifier used to access the R2 storage service. |
| `R2_ACCESS_KEY` | Access key used to authenticate with the R2 S3-compatible API. |
| `R2_SECRET_ACCESS_KEY` | Secret key used along with the access key to authenticate with R2. |
| `R2_BUCKET` | Name of the R2 bucket where uploaded files are stored. |
| `R2_PUBLIC_BASE_URL` | Public base URL used to access objects stored in the R2 bucket. |
| `TOKEN_VALUE` | Secret token used to authenticate internal ingestion requests (for example image queue ingestion endpoint). |
| `IMAGE_QUEUE_INGESTION_URL` | Endpoint used to push uploaded image keys into the image processing queue. |
| `GOOGLE_CLIENT_ID` | OAuth client ID used for Google authentication and Google Calendar integration. |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret used for Google authentication. |
| `GOOGLE_CALENDAR_REDIRECT_URI` | Redirect URI used during Google OAuth flow for Google Calendar authorization. |
| `GOOGLE_WEBHOOK_URL` | Webhook endpoint used by Google to send calendar event updates. |
| `GOOGLE_MAPS_API` | API key used for accessing Google Maps services (maps, geocoding, etc.). |


  ### Frontend

  | Variable | Description |
  |---|---|
  | `VITE_API_URL` | <write description here> |
  | `VITE_GOOGLE_CLIENT_ID` | <write description here> |
  | `VITE_NODE_ENV` | <write description here> |
  | `VITE_R2_PUBLIC_BASE_URL` | <write description here> |
  | `VITE_GOOGLE_MAPS_API_KEY` | <write description here> |

  ---

  ## Database Schema

  ### <feature name> Model

  | Field | Type | Description |
  |---|---|---|
  | `<add details>` | `<add details>` | <write description here> |
  | `<add details>` | `<add details>` | <write description here> |

  ### <feature name> Model

  | Field | Type | Description |
  |---|---|---|
  | `<add details>` | `<add details>` | <write description here> |
  | `<add details>` | `<add details>` | <write description here> |

  ---

  ## Notes

  Trying to add a little more. 

  ---

  ## What Is Yet to come?

  - Jobs
  - COULD BE MORE