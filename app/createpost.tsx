import React, { useState } from "react";
import { Text, View, StyleSheet, TouchableOpacity, Image, TextInput, ActivityIndicator, Alert, Modal, Pressable } from "react-native";
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { createPost } from '@/lib/newsApi';
import { useTheme } from './themeContext';

interface CreatePostProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CreatePost({ visible, onClose, onSuccess }: CreatePostProps) {
  const { theme } = useTheme();
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

  const handleSubmit = async () => {
    if (!subject.trim() || !body.trim()) {
      Alert.alert("Missing Fields", "Please fill in both subject and body.");
      return;
    }

    try {
      setUploading(true);
      
      const newPost = {
        postId: `post_${Date.now()}`,
        postTopic: subject,
        postTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        postDate: new Date().toLocaleDateString('en-US'),
        postBody: body,
        postImage: image || undefined,
      };

      const result = await createPost(newPost);
      
      if (result) {
        Alert.alert("Success", "Post created successfully!", [
          { text: "OK", onPress: () => {
            setSubject("");
            setBody("");
            setImage(null);
            onSuccess?.();
            onClose();
          }}
        ]);
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
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable 
        style={styles.overlay}
        onPress={onClose}
      >
        <Pressable 
          style={[styles.modalContent, { backgroundColor: theme.card }]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={[styles.modalTitle, { color: theme.text }]}>Create Post</Text>

          <View style={styles.bodyContainer}>
            <TextInput
              style={[styles.input, styles.subjectInput, { color: theme.text, borderColor: theme.border }]}
              placeholder="Subject or Title"
              placeholderTextColor={theme.icon}
              value={subject}
              onChangeText={setSubject}
              maxLength={100}
            />

            <TextInput
              style={[styles.input, styles.bodyInput, { color: theme.text, borderColor: theme.border }]}
              placeholder="What's on your mind?"
              placeholderTextColor={theme.icon}
              value={body}
              onChangeText={setBody}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {image && (
            <View style={[styles.mediaContainer, { backgroundColor: theme.background }]}>
              <Image 
                source={{ uri: image }}
                style={styles.mediaImage}
                resizeMode="cover"
              />
              <TouchableOpacity 
                style={styles.removeImageButton}
                onPress={() => setImage(null)}
              >
                <MaterialIcons name="close" size={20} color={theme.text} />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={pickImage}
            >
              <MaterialIcons name="image" size={24} color={theme.text} />
              <Text style={[styles.actionIcon, { color: theme.text }]}>Add Image</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.submitButton, uploading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color={theme.text} />
            ) : (
              <Text style={[styles.submitButtonText, { color: theme.text }]}>Post</Text>
            )}
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 15,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    marginTop: 10,
    textAlign: 'center',
  },
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
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
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
  bodyContainer: {
    marginBottom: 15,
  },
  input: {
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
  },
  subjectInput: {
    marginBottom: 12,
    fontWeight: "600",
    fontSize: 16,
  },
  bodyInput: {
    minHeight: 100,
  },
  mediaContainer: {
    borderRadius: 15,
    marginBottom: 15,
    position: "relative",
  },
  mediaImage: {
    width: "100%",
    height: 150,
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
    marginBottom: 15,
  },
  actionButton: {
    padding: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionIcon: {
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: "#0494CB",
    paddingVertical: 12,
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
    fontSize: 16,
    fontWeight: "700",
  },
});
