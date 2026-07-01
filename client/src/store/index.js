import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import commonReducer from './slices/commonSlice';
import companiesReducer from './slices/companiesSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    common: commonReducer,
    companies: companiesReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
});
