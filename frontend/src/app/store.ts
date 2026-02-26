import { configureStore } from '@reduxjs/toolkit'
import authReducer from "../features/auth/authSlice";
import { authApi } from '../features/auth/authApi'
import { usersApi } from '../features/users/usersApi'
import { uploadsApi } from '../features/uploads/uploadsApi'
import { setAxiosStateGetter } from '../services/axiosClient'
import { calendarApi } from '../features/users/calendarApi';
import { googleCalendarApi } from '../features/google/googleCalendarApi';
import { serviceAreaApi } from '../features/serviceAreas/serviceAreaApi';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        [authApi.reducerPath]: authApi.reducer,
        [usersApi.reducerPath]: usersApi.reducer,
        [uploadsApi.reducerPath]: uploadsApi.reducer,
        [calendarApi.reducerPath]: calendarApi.reducer,
        [googleCalendarApi.reducerPath]: googleCalendarApi.reducer,
        [serviceAreaApi.reducerPath]: serviceAreaApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(authApi.middleware, usersApi.middleware, uploadsApi.middleware, calendarApi.middleware, googleCalendarApi.middleware, serviceAreaApi.middleware),
    devTools: import.meta.env.VITE_NODE_ENV !== "production",
});

// Set axios state getter for request interceptor
setAxiosStateGetter(() => store.getState());

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;