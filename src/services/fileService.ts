import type { FileService } from './types';
import { MockFileService } from './mockService';
import { SupabaseFileService } from './supabaseService';

const useMock = import.meta.env.VITE_USE_MOCK_API !== 'false';

export const fileService: FileService = useMock 
  ? new MockFileService() 
  : new SupabaseFileService();

export const isMockMode = useMock;
