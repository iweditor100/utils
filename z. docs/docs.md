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
> currently in the frontend we have 2 types of hooks to upload, they will end up in one method only, the first hook is; useAvatarUpload.js, and useUploadWithProgress, we can endup with only: useUpload hook. 

>flow of useAvatarUpload: get presign -> upload directly to r2 using fetch -> /complete.

>flow of useUploadWithProgress: presign -> upload to r2 (xhr) -> /complete. 



  #### Routes
  - ``` /presign ``` : called for getting a valid presign
  - ``` /complete ``` : called after a succesfull upload to the R2 object. 
  


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




   ### Downloads

   there are two architecture for downloading something: 
   1. download raw,
   2. download zip(worker comes in play)


   #### Download Raw: 
   ```
   User hits download.

   Frontend(phase 1 of 2): 
   useDownloadFile is a custom hook that exists, this gives us options like: download, progress, the status, and cancel option. 

      download: this is a callback function which takes in the fileId and the fileName, and fetches the download Url for us , bcs we gave it the fileId , using getDownloadUrl it finds the url for us, getDownloadUrl is an api query to call the backend. 

      getDownloadURL: it is a query api call, takes in only the fileId and hits the url: /uploads/:fileId/url. GET

   
   Backend: (/GET)
   getdownloadUrlController: 
      this safely parses the params first, bcs there we are passing the fileId,

   we get the fileId from the params and then we get the userId from the request headers. 

   const res = await getDownloadUrl(fileId, userId); //we can also not pass the userId , this is upto us, the backend currently requires the userId being present there and fileId is obvious. 

   getDownloadUrl this is a service: 
   this does this: it finds the upload(in the upload table in the db if upload for that fileId is present or not);
   this also checks if that key is present or not, here is the strucutre of the upload: 
   { 
      id, 
      ownerId, 
      key, 
      mimeType, 
      size, 
      category, 
      createdAt
   }
   on this layer only we can see many things like if we have to downloadUrl to this user or not, bcs he isn't the owner of this file / key, 
   once the upload is found, we get its downlaod url by the presignGetObject function inside the storage.service: 

   presignGetObject(key) : this takes in key, 

   presignGetObject(key) {
      aws-s3-r2 boiler plate. 
      
      downloadUrl = (r2 boiler plate + custom expiresIr);
      return downloadUrl;
   }




   Frontend (phase 2 of 2) : 
   still inside the download function (this is the callback function)
   const res = await getDownloadUrl(fileId);
   const url = res.data.url;
   we have the url with us, this is the download url

   looks something like this: 
   https://iwcrm.d66f7fe1c45c6c0147798dfdefa40dc5.r2.cloudflarestorage.com/testing/17178d02-2935-4cf0-8613-485b95978d4f/a9d090bf-feea-4a14-8d93-b14f40f05af1/testing/original.CR2?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=a3f6dccd79b0b7384920f20ec62f7acc%2F20260324%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20260324T123151Z&X-Amz-Expires=900&X-Amz-Signature=db47ab428d08858aed3b11758bea621b2d8134c4f082fd3906c00acbb30d5571&X-Amz-SignedHeaders=host&x-id=GetObject



   the above is the url, we which can be hit raw also, meaning we can just hit it and still the download will being. 
   and the download begins. directly inside the browser. 
   
   ```



#### Download Zip: 

```
   Frontend: 
   1. user selects images , as keys from the frontend. 
   2. we hit the download as zip. 

   hook used: useZipDownload. 
   when we hit the button: download as zip, we are calling the function: triggerZip, which the hook useZipDownload

   triggerZip is also a callback function. 
   it takes in the fileKeys and creates zip job. 
   we have two types of phase, one is quueering and other is polling. 
   here we are having the res: 
   const res = await createZipJob({ fileKeys });

   the createZipJob is an api endpoint hitting: 
   /downloads/zip, POST req, data: body, 


   Backend: 

   download.routes.ts: 
   POST: /zip: 
   createZipController: this controller expects the fileKeys in the req.body in an array format, 

   it creates a job for all the keys: 
   const job = await createDownloadJob({ userId, fileKeys });

   this controller doesn't validate anything just puts the keys inside the createDownloadJob.


   createDownloadJob: this is a service: 
   in the db it creates a downloadjob named table row: 
   const job = await prisma.downloadJob.create({ data: {user Id, fileIds, status: "QUEUED", }})

   downloadJob: {
      id, 
      userId, //of the requestor 
      status, //the status of the download

      fileIds, //list of all the files that will reside in the zip

      zipKey, they key which will reside in the r2 object storage
      progress,
      error,
      createdAt,
      expiresAt,
   }

   and the createDownloadJob also does this: adds the inside the zipQueue, what does it add? 
   {
      jobId, userId, fileKeys
   }

   the service of the zipdownload returns the job that was created inside the db. 


   WORKER: 
   what is a worker? 
   what is the worker doing? 
   what is the need of a queue? 
   










```



```
   socket io 
   what is the need of socket io? 
   -> big picture, there to push real time progres updates to the browser, while a zip file is being built in the background ( by a BullMQ worker )

   
```


flow: 

from low level to high level: 
storage.service.ts: 


How is the download working? 

  ### Prisma


  ---

  ### Audit


  ---

  ## Frontend Features

  ### Drawing Tool / Annotation Tool. 
  This is an mvp which gives the liberty to user to draw on the images, 
  It takes a jpg and gives the user a feature to draw on them, (used for drone shots, telling what area a land covers) and more



  #### Backend. 
  - routes : /POST: saveAnnotation and /GET: annotation.   
  - schema : Zod schema , what a valid annotations' data would look like.   
  - controller: HTTP layer
  - service: Business logic, authorization, rules. 
  - repository: prisma queries. 
  - error: custom errors. 
  - types: TS types. 

  ##### Schema: 
  This is not normal z validation, we are using a discriminated union, This is the key concept here, what is this doing? 
  The discriminated union is like switch case to use the correct type of validation for the different type which we have used, we have different type of incoming annotations: 
  1. rect: x, y, width, height, strokeWidth
  2. pin: x, y, label
  3. freedraw: points[path, refW, refH, left, top], strokeWidth, 
  4. circle: x, y, radius(rx, ry)(should be non-negative)
  5. line: x1, y1, x2, y2
  6. text: x, y, text, fontSize
  7. polygon: points[], strokeWidth

  all of them have: color

  saveAnnotationSchema = uploadId, and data(should be max 500 characters), 
  uploadIdParamSchema = uploadId,


  ##### Routes. 
  POST: /annotations/
  -> The uploadId and the data are attached in the req.body, below i s the data. 
  ```
   data: {
      objects: [
         {
            zIndex: 0,
            visible: true,
            id: '040a448e-f0b1-4b6a-900c-c5418fee6edd',
               type: 'polygon',
               points: [Array],
               color: '#ffffff',
               strokeWidth: 17
            },
            {
               zIndex: 1,
               visible: true,
               id: '75c77185-1bea-4b13-ab96-c06efb307d56',
               type: 'pin',
               x: 0.40880760642271347,
               y: 0.5929100435832112,
               color: '#ef4444',
               size: 22.198307214177
            },
            {
               zIndex: 2,
               visible: true,
               id: '1a852072-2d21-49a4-b308-8b8207622779',
               type: 'polygon',
               points: [Array],
               color: '#ffffff',
               strokeWidth: 12
            },
            {
               zIndex: 3,
               visible: true,
               id: '3d5b199a-858b-4d50-a4b4-c502cc5daa97',
               type: 'pin',
               x: 0.8568481848184818,
               y: 0.40924092409240925,
               color: '#ef4444',
               size: 20
            },
            {
               zIndex: 4,
               visible: true,
               id: 'bcd52284-a972-47e6-8f20-924eaa801656',
               type: 'freedraw',
               path: [Array],
               refW: 1212,
               refH: 909,
               left: 0.8481848184818482,
               top: 0.7448798530666962,
               color: '#3b82f6',
               strokeWidth: 20
            }
         ]
      }
      uploadId: "06d681e4-4c51-4197-857d-ca7b0f29b8ef"


   ```
  

  saveAnnotationController: 
  it takes in the uploadId and the data, and then calls the service , const annotation = await saveAnnotation(uploadId, userId, data);
  logged is implemented there. 

  saveAnnotation service: 
  1. check if the objects in inside the data are less than the allowed max objects . 
  2. check if the upload is valid. 
  3. check is the person creating the annotation is the owner of the upload. 
  4. check if the upload is allowed type on which the annotation can be made. 
  5. then upsertAnnotation, why upsert? -> you know it. 



  GET: /annotations/:uploadId


  

  #### Frontend. 
  This is a big one. 

  ##### API: saveAnnotation and getAnnotation

  ##### Hook: useAnnotationState. 
  This is the hook that uses the api endpoints, validates the types. 

  1. calls the api to get the annotation first, if ther is no upload id then skip this. 
  this will return data, the response the json which is getting returned from the backend. 

  2. check if the canvas is dirty or not. 
  3. has a function to save the annotations. 
  4. rawAnnotationData = if there is already uploaded annotation then its data, 
  5. savedData = the data that is currently on the canvas, if that isn't an array then we will make it null. 


  ##### Canvas
  ##### Hook used: useFabricCanvas.ts
  this is a wrapper we created around the library fabric js, which we are using to create the canvas. 
  features it gives: 
  1. tools, 
  2. undo/redo
  3. layers
  4. save/load
  5. download

  The constants: 
  const PIN_PATH_DATA = "M 9,0 C 4.029,0 0,4.029 0,9 C 0,15.75 9,24 9,24 C 9,24 18,15.75 18,9 C 18,4.029 13.971,0 9,0 Z M 12,9 A 3,3 0 1,0 6,9 A 3,3 0 1,0 12,9 Z";  // this is the svg path for the pin shape, 

  fabric Js can render svg paths directly via: new Path(...);

  tag() ----> The meta data system. 
  function tag(fabricObj, type, color, visible) 
  Fabric Objects: they are just canvas shapes, they have no concept of : this is an annotation rect with id X. So Tag() monkey-patch custom properties directly onto the Fabric Object: 

  fabricObj.annotationId = id; 
  fabricObj.annotationType = type; 
  fabricObj.annotationColor = color; 

  This helps us find the object with the annotation ID later. 


  paintCanvas() -> the Renderer

  function paint(canvas, data)

  This takes a plain JS data object(AnnotationData) and rebuilds the entire canvas from scratch. 

  1. canvas.clear() -> wipe everything. 
  2. Sort by Z index (so layers are in the right stacking order)
  3. Loop through each saved object, create the matching Fabric Shape, call tag() and canvas.add()
  




  
  





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



  

   ## TODO / QUESTIONS:
   ``` what if the presign url is exposed? the upload and the download. ```
   
   ``` disposable emails ```

   ``` LOGGER ```

   ``` archive deletes from the r2 ```

   ``` check for transaction  ```

   ``` LOGO WATERMARK on the image```

   ``` pin maker and selecting region```


   ``` when i logout of one window in the other window I am still able to access the system```

   ``` in the v2: give a feature of editing the website inspired from pixieset and the wix website editor. ``` 


   ``` give a section of the contact form ```



   ``` XML Sitemap of the application, on the custom domain.  ```

   ``` rate limiting ```



   ``` Rbac:```
   ``` later when the team increases from 1 single user to multiple users.  ```

   ``` Skeletons ```

`
   
   ``` Admin ```
   ``` 
      Admin: Keep the admin frontend and backend different. 
      PostHOG.com: for event tracking. 
   ```


   ``` common app error: message, name, code ```