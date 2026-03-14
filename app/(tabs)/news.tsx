{/*
import React, { useState } from "react";
import { Text, View, ScrollView, StyleSheet, TouchableOpacity, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { dummyposts } from '@/lib/newsApi';

// this part controls the post card

const PostCard = ({ username, postTime, body, media, id, avatar }: any) => {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  return (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <View style={styles.userInfo}>
          <View style={styles.avatar} />
          <View>
            <Text style={styles.username}>{username}</Text>
            <Text style={styles.postTime}>{postTime}</Text>
          </View>
        </View>
//        <TouchableOpacity>
//          <Text style={styles.menuDots}>⋯</Text>
//        </TouchableOpacity>
      </View>

      <View style={styles.bodyContainer}>
        <Text style={styles.bodyText}>{body}</Text>
      </View>

      {media && (
        <View style={styles.mediaContainer}>
          <Image 
            source={media} 
            style={styles.mediaImage}
            resizeMode="cover"
            onError={(e) => console.log('Image load error:', e.nativeEvent.error)}
            onLoad={() => console.log('Image loaded successfully')}
          />
        </View>
      )}

      <View style={styles.actionButtons}>

        // this icon is to show whether the post was bookmarked or not

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => setIsBookmarked(!isBookmarked)}
        >
          <MaterialIcons 
            color="#fff" 
            name={isBookmarked ? "bookmark" : "bookmark-border"} 
            size={23} 
          />
        </TouchableOpacity>

        // this icon is to comment on the post

        <TouchableOpacity style={styles.actionButton}>
          <Feather color="#fff" name="message-circle" size={20} />
        </TouchableOpacity>

        // this icon is to show that the post was helpful
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => setIsLiked(!isLiked)}
        >
          <MaterialIcons 
            color="#fff" 
            name={isLiked ? "thumb-up" : "thumb-up-off-alt"} 
            size={24}
          />
        </TouchableOpacity>

      </View>
    </View>
  );
};

// this part helps to arrange posts from latest to oldest

export default function News() {
  const sortedPosts = [...posts].sort((a, b) => {
    const timeA = parseFloat(a.postTime.replace('.', ''));
    const timeB = parseFloat(b.postTime.replace('.', ''));
    return timeB - timeA;
  });

// this section controls the the background

  return (
    <SafeAreaView style={styles.container}>

      <View style={styles.header}>
        <Image 
          source={require('@/assets/oc/logo.jpg')} 
          style={styles.headerLogo}
          resizeMode="contain"
        />
        <View style={styles.headerIcons}>

          // this icon is to check the bookmarked posts

          <TouchableOpacity style={styles.headerIcon}>
            <Feather color="#fff" name="bookmark" size={20} />
          </TouchableOpacity>

        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {sortedPosts.map((post) => (
          <PostCard key={post.id} {...post} />
        ))}
      </ScrollView>

      <TouchableOpacity 
        style={styles.heatMapButton}
        onPress={() => router.push('/(tabs)/ui')}
      >
        <MaterialIcons name="map" size={30} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#002747",
    // backgroundColor: "#ffffff",
    // the above line is for testing, please ignore it
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#002747",
  },
  headerLogo: {
    width: 30,
    height: 30,
    borderRadius: 15,
    overflow: "hidden",
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
    backgroundColor: "#0493cb83", 
    marginHorizontal: 15,
    marginVertical: 10,
    borderRadius: 15,
    padding: 15,
    borderColor: "#5E85AF",
    borderLeftColor: "#0494CB",
    borderLeftWidth: 1,
    borderBottomWidth: 2,
    borderRightWidth: 1,

    // here i tried to add a shadow (don't mind it)
    shadowColor: "#0494CB",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 2,

  },
  postHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
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
    color: "#c8c8c9",
    fontSize: 12,
  },
  // menuDots: {
  //   color: "#fff",
  //   fontSize: 24,
  //   fontWeight: "bold",
  // },
  bodyContainer: {
    marginBottom: 15,
  },
  mediaContainer: {
    borderRadius: 15,
    marginBottom: 15,
    backgroundColor: "#002747",
  },
  mediaImage: {
    width: "100%",
    height: 200,
    borderRadius: 10,
  },
  bodyText: {
    color: "#fff",
    fontSize: 14,
    marginBottom: 10,
  },
  // mediaText: {
  //   color: "#666",
  //   fontSize: 12,
  // },
  actionButtons: {
    flexDirection: "row",
    gap: 20,
  },
  actionButton: {
    padding: 5,
  },
  actionIcon: {
    fontSize: 20,
    color: "#fff",
  },
  createPostButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0494CB',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0494CB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
});
*/}

import React from "react";
import { Text, View, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function News() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <Text style={styles.text}>News Feed</Text>
      </View>

      <TouchableOpacity 
        style={styles.heatMapButton}
        onPress={() => router.push('/(tabs)/heatmap')}
      >
        <MaterialIcons name="map" size={30} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#002747",
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 18,
  },
  heatMapButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0494CB',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0494CB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
});

