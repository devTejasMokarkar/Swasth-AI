import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { EmptyState } from '@/components/EmptyState';
import {
  useGetFiles,
  useUploadFile,
  useDeleteFile,
  getGetFilesQueryKey,
  type HealthFile,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';

type FileTab = 'report' | 'prescription';

function FileCard({
  file,
  onDelete,
}: {
  file: HealthFile;
  onDelete: () => void;
}) {
  const colors = useColors();

  return (
    <View style={[styles.fileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.fileIcon, { backgroundColor: colors.primaryMuted }]}>
        <Feather name="file-text" size={20} color={colors.primary} />
      </View>
      <View style={styles.fileInfo}>
        <Text style={[styles.fileName, { color: colors.foreground }]} numberOfLines={1}>
          {file.title || file.filename}
        </Text>
        <Text style={[styles.fileDate, { color: colors.mutedForeground }]}>
          {new Date(file.uploadedAt).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
          })}
        </Text>
        {file.ocrSummary ? (
          <Text style={[styles.fileSummary, { color: colors.mutedForeground }]} numberOfLines={2}>
            {file.ocrSummary}
          </Text>
        ) : null}
      </View>
      <TouchableOpacity
        onPress={onDelete}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        activeOpacity={0.7}
      >
        <Feather name="trash-2" size={16} color={colors.mutedForeground} />
      </TouchableOpacity>
    </View>
  );
}

export default function FilesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : 0;

  const [activeTab, setActiveTab] = useState<FileTab>('report');
  const [uploading, setUploading] = useState(false);

  const { data, isLoading, error, refetch } = useGetFiles({ type: activeTab });
  const uploadMutation = useUploadFile();
  const deleteMutation = useDeleteFile();

  const files = data?.files ?? [];

  const handleUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0]!;
      setUploading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: 'base64',
      });

      await uploadMutation.mutateAsync({
        data: {
          fileType: activeTab,
          filename: asset.name,
          title: asset.name.replace(/\.[^.]+$/, ''),
          base64Data: base64,
          mimeType: asset.mimeType ?? 'application/octet-stream',
        },
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: getGetFilesQueryKey() });
    } catch (err) {
      Alert.alert('Upload Failed', 'Could not upload the file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (file: HealthFile) => {
    Alert.alert(
      'Delete File',
      `Remove "${file.title || file.filename}" from your health files?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteMutation.mutateAsync({ id: file.id });
            queryClient.invalidateQueries({ queryKey: getGetFilesQueryKey() });
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 16, backgroundColor: colors.background, borderBottomColor: colors.border },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>Health Files</Text>
        <TouchableOpacity
          style={[styles.uploadBtn, { backgroundColor: colors.primary }]}
          onPress={handleUpload}
          disabled={uploading}
          activeOpacity={0.8}
        >
          {uploading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Feather name="upload" size={14} color="#fff" />
              <Text style={styles.uploadBtnText}>Upload</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Tab switcher */}
      <View style={[styles.tabs, { backgroundColor: colors.muted, borderBottomColor: colors.border }]}>
        {(['report', 'prescription'] as FileTab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              activeTab === tab && [styles.tabActive, { borderBottomColor: colors.primary }],
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === tab ? colors.primary : colors.mutedForeground },
              ]}
            >
              {tab === 'report' ? 'Lab Reports' : 'Prescriptions'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <EmptyState
            icon="alert-circle"
            title="Couldn't load files"
            description="Check your connection and try again."
            actionLabel="Retry"
            onAction={() => refetch()}
          />
        </View>
      ) : files.length === 0 ? (
        <View style={styles.center}>
          <EmptyState
            icon="file-text"
            title={activeTab === 'report' ? 'No lab reports yet' : 'No prescriptions yet'}
            description={`Upload a PDF or image of your ${activeTab === 'report' ? 'lab report' : 'prescription'} to keep it safe.`}
            actionLabel="Upload File"
            onAction={handleUpload}
          />
        </View>
      ) : (
        <FlatList
          data={files}
          renderItem={({ item }) => (
            <FileCard file={item} onDelete={() => handleDelete(item)} />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPad + 100 }]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 28, fontFamily: 'Inter_700Bold' },
  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10,
  },
  uploadBtnText: { color: '#fff', fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  tabs: {
    flexDirection: 'row', paddingHorizontal: 16, borderBottomWidth: 1,
  },
  tab: {
    paddingVertical: 12, paddingHorizontal: 8, marginRight: 16,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: {},
  tabText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  list: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  fileCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 10,
  },
  fileIcon: {
    width: 44, height: 44, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  fileInfo: { flex: 1, gap: 3 },
  fileName: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  fileDate: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  fileSummary: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 18, marginTop: 2 },
});
