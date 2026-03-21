import { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// import { Feather } from "@expo/vector-icons";
import { MaterialIcons } from '@expo/vector-icons';
import { fetchPosts, type Post } from '@/lib/newsApi';
import CreatePost from '@/app/createpost';
import { useTheme } from '@/components/theme/ThemeContext';

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
        styles.postCard,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
    >
      <View style={styles.postHeader}>
        <Text style={[styles.postTopic, { color: theme.text }]}>
          {postTopic}
        </Text>
        <View style={styles.postMetaRow}>
          <Text style={[styles.postMetaText, { color: theme.text }]}>
            {postDate}
          </Text>
          <Text style={[styles.postMetaText, { color: theme.text }]}>
            • {formatPostTime(postTime)}
          </Text>
        </View>
      </View>

      <View style={styles.bodyContainer}>
        <Text style={[styles.bodyText, { color: theme.text }]}>{postBody}</Text>
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

      <View style={styles.actionButtons}>
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
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      {/* <View style={[styles.header, { backgroundColor: theme.background }]}>
        <Image 
          source={require('@/assets/oc/logo.jpg')} 
          style={styles.headerLogo}
          resizeMode="contain"
        />
      </View> */}

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {sortedPosts.map((post) => (
          <PostCard key={`${post.postTopic}-${post.postDate}-${post.postTime}`} {...post} />
        ))}
      </ScrollView>
      <TouchableOpacity
        style={styles.createPostButton}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerLogo: {
    width: 30,
    height: 30,
    borderRadius: 15,
    overflow: "hidden",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  headerIcons: {
    flexDirection: "row",
    gap: 15,
  },
  headerIcon: {
    padding: 5,
  },
  iconText: {
    fontSize: 20,
    color: "#fff",
  },
  profileIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#4A9EFF",
  },
  scrollView: {
    flex: 1,
  },
  postCard: {
    marginHorizontal: 15,
    marginVertical: 10,
    borderRadius: 15,
    padding: 15,
    borderLeftColor: "#0494CB",
    borderLeftWidth: 1,
    borderBottomWidth: 2,
    borderRightWidth: 1,
    shadowColor: "#0494CB",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 2,
  },
  postHeader: {
    marginBottom: 12,
  },
  postTopic: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  postMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  postMetaText: {
    fontSize: 12,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#4A9EFF",
  },
  username: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  postTime: {
    fontSize: 12,
  },
  bodyContainer: {
    marginBottom: 15,
  },
  mediaContainer: {
    borderRadius: 15,
    marginBottom: 15,
  },
  mediaImage: {
    width: "100%",
    height: 200,
    borderRadius: 10,
  },
  bodyText: {
    fontSize: 14,
    marginBottom: 10,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 20,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 5,
  },
  helpfulText: {
    fontSize: 14,
  },
  actionIcon: {
    fontSize: 20,
    color: "#fff",
  },
  createPostButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#0494CB",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0494CB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
});
