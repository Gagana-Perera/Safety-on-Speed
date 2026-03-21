import React, { useState } from "react";
import { Text, View, TouchableOpacity, Image, TextInput, ActivityIndicator, Alert, Modal, Pressable } from "react-native";
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { createPost, type CreatePostInput } from '@/lib/newsApi';
import { useTheme } from '@/components/theme/ThemeContext';
import { useRouter } from "expo-router";
import { globalStyles } from "@/app/global";

interface CreatePostProps {
  visible?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
}

export default function CreatePost({ visible, onClose, onSuccess }: CreatePostProps) {
  const { theme } = useTheme();
  const router = useRouter();
  const [subject, setSubject] = useState<string>("");
  const [body, setBody] = useState<string>("");
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);

  const modalVisible = typeof visible === "boolean" ? visible : true;
  const closeModal = () => {
    if (onClose) {
      onClose();
      return;
    }
    if (router.canGoBack()) {
      router.back();
    }
  };

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
      
      const newPost: CreatePostInput = {
        postTopic: subject.trim(),
        postTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        postDate: new Date().toLocaleDateString('en-US'),
        postBody: body.trim(),
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
            closeModal();
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
      visible={modalVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={closeModal}
    >
      <Pressable 
        style={globalStyles.modalOverlay}
        onPress={closeModal}
      >
        <Pressable 
          style={[globalStyles.modalContent, { backgroundColor: theme.card }]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={[globalStyles.modalTitle, { color: theme.text }]}>Create Post</Text>

          <View style={globalStyles.bodyContainer}>
            <TextInput
              style={[globalStyles.inputBase, globalStyles.inputSubject, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
              placeholder="Subject or Title"
              placeholderTextColor={theme.icon}
              value={subject}
              onChangeText={setSubject}
              maxLength={100}
            />

            <TextInput
              style={[globalStyles.inputBase, globalStyles.inputBody, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
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
            <View style={[globalStyles.mediaContainer, { backgroundColor: theme.background }]}>
              <Image 
                source={{ uri: image }}
                style={globalStyles.mediaImage}
                resizeMode="cover"
              />
              <TouchableOpacity 
                style={globalStyles.removeImageButton}
                onPress={() => setImage(null)}
              >
                <MaterialIcons name="close" size={20} color={theme.text} />
              </TouchableOpacity>
            </View>
          )}

          <View style={globalStyles.createPostActionButtons}>
            <TouchableOpacity 
              style={globalStyles.actionButtonInline}
              onPress={pickImage}
            >
              <MaterialIcons name="image" size={24} color={theme.text} />
              <Text style={[globalStyles.actionLabel, { color: theme.text }]}>Add Image</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[globalStyles.submitButton, uploading && globalStyles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color={theme.text} />
            ) : (
              <Text style={globalStyles.submitButtonText}>Post</Text>
            )}
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
