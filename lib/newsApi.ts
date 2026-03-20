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
  postpostId?: string;
  postTopic: string;
  postTime: string;
  postDate: string;
  postBody: string;
  // media?: string;
  likes?: number;
  created_at?: string;
}

// Seed initial data (run once to populate database)
export const seedPosts = async () => {
  // const dummyPosts = [
  //   { postId: "1", postTopic: "Safety Tip", postTime: "11.23", postDate: "9-2-2026", postBody: "Always stay aware of your surroundings", media: "default-img.png", likes: 0, bookmarks: 0},
  //   { postId: "2", postTopic: "Emergency", postTime: "18.56", postDate: "9-2-2026", postBody: "Report emergency incidents immediately", likes: 0, bookmarks: 0},
  //   { postId: "3", postTopic: "Safety Update", postTime: "05.34", postDate: "9-2-2026", postBody: "New safety features available", media: "default-img.png", likes: 0, bookmarks: 0},
  // ];

  const { data, error } = await supabase
    .from('posts')
    .insert('*');

  console.log(data);   // check actual data
  console.log(error);  // check for errors

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

    console.log(data);   // check actual data
    console.log(error);  // check for errors

  if (error) {
    console.error('Error fetching posts:', error);
    return [];
  }

  return data || [];
};

// Create a new post
export const createPost = async (post: Omit<Post, 'postpostId' | 'created_at'>): Promise<Post | null> => {
  const { data, error } = await supabase
    .from('posts')
    .insert([post])
    .select()
    .single();

  if (error) {
    console.error('Error creating post:', error);
    return null;
  }

  return data as Post;
};

// // Toggle like on a post
// export const toggleLike = async (postpostId: string, currentLikes: number): Promise<boolean> => {
//   const { error } = await supabase
//     .from('posts')
//     .update({ likes: currentLikes + 1 })
//     .eq('id', postId);

//   if (error) {
//     console.error('Error toggling like:', error);
//     return false;
//   }

//   return true;
// };

// Delete a post
// export const deletePost = async (postpostId: string): Promise<boolean> => {
//   const { error } = await supabase
//     .from('posts')
//     .delete()
//     .eq('id', postId);

//   if (error) {
//     console.error('Error deleting post:', error);
//     return false;
//   }

//   return true;
// };