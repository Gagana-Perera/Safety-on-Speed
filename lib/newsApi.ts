import {
  isSupabaseConfigured,
  supabase,
  warnMissingSupabaseConfig,
} from "@/lib/superbase";

const newsClient = supabase as any;

// TypeScript interfaces
export interface Post {
  postId: string;
  postTopic: string;
  postTime: string;
  postDate: string;
  postBody: string;
  postImage?: string;
  likes?: number;
  created_at?: string;
}

export type CreatePostInput = {
  postTopic: string;
  postTime: string;
  postDate: string;
  postBody: string;
  postImage?: string;
};

function ensureNewsApiConfigured() {
  if (isSupabaseConfigured) {
    return true;
  }

  warnMissingSupabaseConfig("lib/newsApi.ts");
  return false;
}

// Seed initial data (run once to populate database)
export const seedPosts = async () => {
  if (!ensureNewsApiConfigured()) {
    return {
      success: false,
      error: new Error("Supabase is not configured."),
    };
  }

  // const dummyPosts = [
  //   { postId: "1", postTopic: "Safety Tip", postTime: "11.23", postDate: "9-2-2026", postBody: "Always stay aware of your surroundings", media: "default-img.png", likes: 0, bookmarks: 0},
  //   { postId: "2", postTopic: "Emergency", postTime: "18.56", postDate: "9-2-2026", postBody: "Report emergency incidents immediately", likes: 0, bookmarks: 0},
  //   { postId: "3", postTopic: "Safety Update", postTime: "05.34", postDate: "9-2-2026", postBody: "New safety features available", media: "default-img.png", likes: 0, bookmarks: 0},
  // ];

  const { data, error } = await newsClient
    .from("posts")
    .insert("*");

  console.log(data); // check actual data
  console.log(error); // check for errors

  if (error) {
    console.error("Error seeding posts:", error);
    return { success: false, error };
  }

  return { success: true, data };
};

// Fetch all posts
export const fetchPosts = async (): Promise<Post[]> => {
  if (!ensureNewsApiConfigured()) {
    return [];
  }

  const { data, error } = await newsClient
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });

  console.log(data); // check actual data
  console.log(error); // check for errors

  if (error) {
    console.error("Error fetching posts:", error);
    return [];
  }

  return (data || []) as Post[];
};

// Create a new post
export const createPost = async (post: CreatePostInput): Promise<Post | null> => {
  if (!ensureNewsApiConfigured()) {
    return null;
  }

  const { data, error } = await newsClient
    .from("posts")
    .insert([post])
    .select()
    .single();

  if (error) {
    console.error("Error creating post:", error);
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
