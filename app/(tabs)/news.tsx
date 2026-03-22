import { useEffect, useState } from "react";
import { globalStyles } from "@/app/global";
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/components/theme/ThemeContext";
import CreatePost from "@/app/createpost";
import { fetchPosts, type Post } from "@/lib/newsApi";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";

// this part controls the post card

const PostCard = ({ postTopic, postDate, postTime, postBody, media }: any) => {
  const { theme } = useTheme();
  // const [isLiked, setIsLiked] = useState(false);

  const formatPostTime = (value: string) => {
    if (!value) return "";

    const normalized = value.trim().replace(".", ":");
    const twelveHour = normalized.match(
      /^(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])?$/,
    );
    if (twelveHour) {
      const [, hour, minute, meridiem] = twelveHour;
      return `${hour.padStart(2, "0")}:${minute}${meridiem ? ` ${meridiem.toUpperCase()}` : ""}`;
    }

    return normalized;
  };

  return (
    <View
      style={[
        globalStyles.card,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
    >
      <View style={globalStyles.cardHeader}>
        <Text style={[globalStyles.cardTitle, { color: theme.text }]}>
          {postTopic}
        </Text>
        <View style={globalStyles.metaRow}>
          <Text style={[globalStyles.metaText, { color: theme.text }]}>
            {postDate}
          </Text>
          <Text style={[globalStyles.metaText, { color: theme.text }]}>
            • {formatPostTime(postTime)}
          </Text>
        </View>
      </View>

      <View style={globalStyles.bodyContainer}>
        <Text style={[globalStyles.bodyText, { color: theme.text }]}>{postBody}</Text>
      </View>

      {/* {media && (
        <View style={styles.mediaContainer}>
          <Image 
            source={media} 
            style={styles.mediaImage}
            resizeMode="cover"
            onError={(e) => console.log('Image load error:', e.nativeEvent.error)}
            onLoad={() => console.log('Image loaded successfully')}
          />
        </View>
      )} */}

      <View style={globalStyles.actionButtonsRow}>
        {/* this icon is to show that the post was helpful */}

        {/* <TouchableOpacity 
          style={styles.actionButton}
        >
          <MaterialIcons 
            color={theme.text} 
            name="thumb-up-off-alt" 
            size={20}
          />
        </TouchableOpacity> */}
      </View>
    </View>
  );
};

// this part helps to arrange posts from latest to oldest

export default function News() {
  const { theme } = useTheme();
  const [posts, setPosts] = useState<Post[]>([]);
  const [createPostVisible, setCreatePostVisible] = useState(false);

  useEffect(() => {
    fetchPosts()
      .then((data) => setPosts(data))
      .catch((error) => console.error("Error fetching posts:", error));
  }, []);

  const sortedPosts = [...posts].sort((a, b) => {
    const timeA = parseFloat(a.postTime.replace(".", ""));
    const timeB = parseFloat(b.postTime.replace(".", ""));
    return timeB - timeA;
  });

  // this section controls the the background

  return (
    <SafeAreaView
      style={[globalStyles.screenContainer, { backgroundColor: theme.background }]}
    >
      {/* <View style={[styles.header, { backgroundColor: theme.background }]}>
        <Image 
          source={require('@/assets/oc/logo.jpg')} 
          style={styles.headerLogo}
          resizeMode="contain"
        />
      </View> */}

      <ScrollView
        style={globalStyles.screenScrollView}
        showsVerticalScrollIndicator={false}
      >
        {sortedPosts.map((post) => (
          <PostCard key={`${post.postTopic}-${post.postDate}-${post.postTime}`} {...post} />
        ))}
      </ScrollView>
      <TouchableOpacity
        style={globalStyles.floatingActionButton}
        onPress={() => setCreatePostVisible(true)}
      >
        <MaterialIcons name="add-comment" size={30} color="#fff" />
      </TouchableOpacity>

      <CreatePost 
        visible={createPostVisible} 
        onClose={() => setCreatePostVisible(false)}
        onSuccess={() => {
          // Refresh posts after successful creation
          fetchPosts()
            .then((data) => setPosts(data))
            .catch((error) => console.error('Error fetching posts:', error));
        }}
      />
    </SafeAreaView>
  );
}

