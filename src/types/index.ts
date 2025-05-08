export interface LostFoundItem {
  id: string;
  title: string;
  description: string;
  location: string;
  finder_name: string;
  finder_email: string;
  finder_phone: string;
  image_url?: string;
  status: 'found' | 'claimed' | 'pending';
  created_at: string;
  claimed_by?: string;
  claimed_at?: string;
  category: 'electronics' | 'documents' | 'accessories' | 'others';
}

export interface StatusHistory {
  id: string;
  item_id: string;
  old_status: string;
  new_status: string;
  changed_by: string;
  changed_at: string;
  notes: string;
}

export type Category = 'electronics' | 'documents' | 'accessories' | 'others';