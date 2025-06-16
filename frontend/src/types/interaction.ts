import { Grant } from './grant'; // Assuming Grant type is defined in grant.ts

export type InteractionStatus = 'saved' | 'applied' | 'ignored';

export interface UserInteraction {
  id: string; // The interaction's own ID
  user_id: string;
  grant_id: string;
  action: InteractionStatus; // 'saved', 'applied', 'ignored'
  notes?: string;
  timestamp: string; // Date as string
}

// Type for the API response of GET /api/users/interactions
export interface UserInteractionsResponse {
  message: string;
  interactions: UserInteraction[];
  // The backend currently also returns a 'grants' array.
  // The frontend might want to map interactions to their full grant details.
  // For now, let's include it as the backend provides it.
  grants?: Grant[];
}

