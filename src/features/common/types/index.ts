export type UserRole = 'rider' | 'driver' | 'both' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  avatar_url?: string;
  role: UserRole;
  is_active: boolean;
  referral_code?: string;
  created_at: string;
  updated_at: string;
}

export interface DriverProfile {
  id: string; // Internal PK
  user_id: string; // FK to users
  driver_license_number?: string;
  vehicle_number: string;
  vehicle_model: string;
  vehicle_color: string;
  is_verified: boolean;
  verification_status: 'pending' | 'approved' | 'rejected';
  total_rides: number;
  average_rating: number;
  online_status: boolean;
  is_busy: boolean;
  location?: any; // PostGIS POINT
  last_location_update?: string;
}

export type RideStatus = 
  | 'requested' 
  | 'accepted' 
  | 'arrived' 
  | 'started' 
  | 'completed' 
  | 'cancelled_by_rider' 
  | 'cancelled_by_driver';

export interface Ride {
  id: string;
  rider_id: string;
  driver_id?: string;
  driver?: {
    id: string;
    full_name: string;
    phone: string;
    driver_profile?: DriverProfile;
  };
  pickup_geometry: any;
  pickup_address: string;
  dropoff_geometry: any;
  dropoff_address: string;
  distance_km?: number;
  fare: number;
  status: RideStatus;
  payment_method: 'cash' | 'wallet';
  payment_status: 'pending' | 'completed';
  requested_at: string;
  accepted_at?: string;
  started_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  rider_rating?: number;
  driver_rating?: number;
  rider_comment?: string;
  driver_comment?: string;
  start_otp?: string;
  completion_otp?: string;
  start_otp_verified?: boolean;
  completion_otp_verified?: boolean;
}

export interface DriverDocument {
  id: string;
  driver_id: string;
  document_type: string;
  file_url: string;
  verification_status: 'pending' | 'verified' | 'rejected';
  created_at: string;
}

export interface UserWallet {
  user_id: string;
  balance: number; // in paise
  updated_at: string;
}

export interface UserGoCoin {
  user_id: string;
  balance: number;
  last_updated: string;
}

export interface UserStreak {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_ride_date?: string;
  reward_earned_at?: string;
}
