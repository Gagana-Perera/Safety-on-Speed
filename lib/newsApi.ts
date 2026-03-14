import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseKey =
  process.env.EXPO_PUBLIC_SUPABASE_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  '';
const supabase = createClient(supabaseUrl, supabaseKey);

// TypeScript interfaces
export interface Post {
  id: string;
  username: string;
  postTime: string;
  postDate: string;
  body: string;
  media?: string;
  likes: number;
  bookmarks: number;
  created_at?: string;
}

// Seed initial data (run once to populate database)
export const seedPosts = async () => {
  const dummyPosts = [
    { id: "1", postTime: "11.23", postDate: "9-2-2026", body: "post body", media: "default-img.png", likes: 0},
    { id: "2", postTime: "18.56", postDate: "9-2-2026", body: "post body", likes: 0},
    { id: "3", postTime: "05.34", postDate: "9-2-2026", body: "post body", media: "default-img.png", likes: 0},
    { id: "4", postTime: "00.23", postDate: "9-2-2026", body: "post body", media: "default-img.png", likes: 0},
    { id: "5", postTime: "18.56", postDate: "8-2-2026", body: "lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec vel sapien eget nunc efficitur varius. Sed at ligula a enim efficitur commodo. Nulla facilisi. Donec ac odio a nisl convallis tincidunt. Proin in felis sed nisi efficitur bibendum. Curabitur ut ligula a enim efficitur commodo. Nulla facilisi. Donec ac odio a nisl convallis tincidunt. Proin in felis sed nisi efficitur bibendum.✌️", likes: 0},
    { id: "6", postTime: "05.34", postDate: "8-2-2026", body: "post body", likes: 0},
  ];

  const { data, error } = await supabase
    .from('posts')
    .insert(dummyPosts);

  if (error) {
    console.error('Error seeding posts:', error);
    return { success: false, error };
  }

  return { success: true, data };
};

// Fetch all posts
export const fetchPosts = async (): Promise<Post[]> => {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching posts:', error);
    return [];
  }

  return data || [];
};

// Create a new post
export const createPost = async (post: Omit<Post, 'id' | 'created_at'>): Promise<Post | null> => {
  const { data, error } = await supabase
    .from('posts')
    .insert([post])
    .select()
    .single();

  if (error) {
    console.error('Error creating post:', error);
    return null;
  }

  return data;
};

// Toggle like on a post
export const toggleLike = async (postId: string, currentLikes: number): Promise<boolean> => {
  const { error } = await supabase
    .from('posts')
    .update({ likes: currentLikes + 1 })
    .eq('id', postId);

  if (error) {
    console.error('Error toggling like:', error);
    return false;
  }

  return true;
};

// Toggle bookmark on a post
export const toggleBookmark = async (postId: string, currentBookmarks: number): Promise<boolean> => {
  const { error } = await supabase
    .from('posts')
    .update({ bookmarks: currentBookmarks + 1 })
    .eq('id', postId);

  if (error) {
    console.error('Error toggling bookmark:', error);
    return false;
  }

  return true;
};

// Delete a post
export const deletePost = async (postId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId);

  if (error) {
    console.error('Error deleting post:', error);
    return false;
  }

  return true;
};