import React, { useState } from "react";
import { Text, View, ScrollView, StyleSheet, TouchableOpacity, Image, TextInput, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { createPost } from '@/lib/newsApi';
import { router } from 'expo-router';

export default function CreatePost() {
  const [subject, setSubject] = useState<string>("");
  const [body, setBody] = useState<string>("");
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert("Permission Required", "You need to grant camera roll permissions to upload images.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const removeImage = () => {
    setImage(null);
  };

  const handleSubmit = async () => {
    if (!subject.trim() || !body.trim()) {
      Alert.alert("Missing Fields", "Please fill in both subject and body.");
      return;
    }

    try {
      setUploading(true);
      
      const newPost = {
        username: "CurrentUser", // Replace with actual user data
        postTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        postDate: new Date().toLocaleDateString('en-US'),
        body: `${subject}\n\n${body}`,
        media: image || undefined,
        likes: 0,
        bookmarks: 0,
      };

      const result = await createPost(newPost);
      
      if (result) {
        Alert.alert("Success", "Post created successfully!", [
          { text: "OK", onPress: () => router.back() }
        ]);
        setSubject("");
        setBody("");
        setImage(null);
      } else {
        Alert.alert("Error", "Failed to create post. Please try again.");
      }
    } catch (error) {
      console.error("Error creating post:", error);
      Alert.alert("Error", "An unexpected error occurred.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Post</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.postCard}>
          <View style={styles.postHeader}>
            <View style={styles.userInfo}>
              <View style={styles.avatar} />
              <View>
                <Text style={styles.username}>CurrentUser</Text>
                <Text style={styles.postTime}>Now</Text>
              </View>
            </View>
          </View>

          <View style={styles.bodyContainer}>
            <TextInput
              style={[styles.input, styles.subjectInput]}
              placeholder="Subject or Title"
              placeholderTextColor="#c8c8c9"
              value={subject}
              onChangeText={setSubject}
              maxLength={100}
            />

            <TextInput
              style={[styles.input, styles.bodyInput]}
              placeholder="What's on your mind?"
              placeholderTextColor="#c8c8c9"
              value={body}
              onChangeText={setBody}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>

          {image && (
            <View style={styles.mediaContainer}>
              <Image 
                source={{ uri: image }}
                style={styles.mediaImage}
                resizeMode="cover"
              />
              <TouchableOpacity 
                style={styles.removeImageButton}
                onPress={removeImage}
              >
                <MaterialIcons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={pickImage}
            >
              <MaterialIcons name="image" size={24} color="#fff" />
              <Text style={styles.actionIcon}>Add Image</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.submitButton, uploading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Post</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#002747",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#002747",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
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
  bodyContainer: {
    marginBottom: 15,
  },
  input: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 10,
    padding: 12,
    color: "#fff",
    fontSize: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  subjectInput: {
    marginBottom: 12,
    fontWeight: "600",
    fontSize: 16,
  },
  bodyInput: {
    minHeight: 120,
  },
  mediaContainer: {
    borderRadius: 15,
    marginBottom: 15,
    backgroundColor: "#002747",
    position: "relative",
  },
  mediaImage: {
    width: "100%",
    height: 200,
    borderRadius: 10,
  },
  removeImageButton: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 15,
    padding: 5,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 20,
  },
  actionButton: {
    padding: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionIcon: {
    fontSize: 16,
    color: "#fff",
  },
  submitButton: {
    backgroundColor: "#0494CB",
    marginHorizontal: 15,
    marginVertical: 10,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0494CB",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonDisabled: {
    backgroundColor: "#5E85AF",
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
});
