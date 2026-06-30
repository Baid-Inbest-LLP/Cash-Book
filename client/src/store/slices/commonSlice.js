import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { masterApi } from '../../api/master.api';
import { STORAGE_KEYS } from '../../constants';

export const fetchLookups = createAsyncThunk('common/fetchLookups', async () => {
  const { data } = await masterApi.lookups();
  return data.data;
});

const initialState = {
  lookups: null,
  theme: localStorage.getItem(STORAGE_KEYS.THEME) || 'light',
  globalLoading: false,
  sidebarCollapsed: true,
  filters: {},
};

const commonSlice = createSlice({
  name: 'common',
  initialState,
  reducers: {
    setTheme: (state, action) => {
      state.theme = action.payload;
      localStorage.setItem(STORAGE_KEYS.THEME, action.payload);
    },
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setGlobalLoading: (state, action) => {
      state.globalLoading = action.payload;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchLookups.fulfilled, (state, action) => {
      state.lookups = action.payload;
    });
  },
});

export const { setTheme, toggleSidebar, setGlobalLoading, setFilters, clearFilters } =
  commonSlice.actions;
export default commonSlice.reducer;
