export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WaveData {
  id: string;
  userId: string;
  timestamp: Date;
  data: any;
  metadata?: Record<string, any>;
}