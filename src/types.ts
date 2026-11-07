export interface Pin {
  id: number;
  owner_id: number;
  title: string;
  description: string;
  image_url: string;
  width: number;
  height: number;
  created_at: string;
}

export interface PinPage {
  items: Pin[];
  next_cursor: number | null;
}
