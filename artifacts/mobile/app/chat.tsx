import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useUser } from '@/contexts/UserContext';

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Array<{ id: string; from: 'user' | 'bot'; text: string }>>([]);
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList>(null);
  const { userId } = useUser();

  const send = async () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    const id = `u_${Date.now()}`;
    setMessages((m) => [...m, { id, from: 'user', text: userMsg }]);
    setInput('');
    setLoading(true);

    try {
      const base = process.env['EXPO_PUBLIC_API_BASE_URL'] ?? '';
      const url = base ? `${base}/api/chat` : `/api/chat`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userId}` },
        body: JSON.stringify({ message: userMsg }),
      });

      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(txt || 'Chat request failed');
      }

      const data = await resp.json();
      setMessages((m) => [...m, { id: `b_${Date.now()}`, from: 'bot', text: data.reply ?? '' }]);
      listRef.current?.scrollToEnd({ animated: true } as any);
    } catch (err: any) {
      setMessages((m) => [...m, { id: `e_${Date.now()}`, from: 'bot', text: 'Error sending message.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.container, { backgroundColor: colors.background }]}> 
      <FlatList
        ref={listRef as any}
        data={messages}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12 }}
        renderItem={({ item }) => (
          <View style={[styles.msgRow, item.from === 'user' ? styles.msgUser : styles.msgBot, { backgroundColor: item.from === 'user' ? colors.primary : colors.card }]}> 
            <Text style={{ color: item.from === 'user' ? '#fff' : colors.foreground }}>{item.text}</Text>
          </View>
        )}
      />

      <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, 12), borderTopColor: colors.border, backgroundColor: colors.background }]}> 
        <TextInput style={[styles.input, { color: colors.foreground }]} value={input} onChangeText={setInput} placeholder="Ask Swasthai..." placeholderTextColor={colors.mutedForeground} multiline />
        <TouchableOpacity style={[styles.sendBtn, { backgroundColor: colors.primary }]} onPress={send} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Feather name="send" size={18} color="#fff" />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  msgRow: { padding: 12, borderRadius: 12, marginBottom: 8, maxWidth: '85%' },
  msgUser: { alignSelf: 'flex-end' },
  msgBot: { alignSelf: 'flex-start' },
  inputRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end', padding: 12, borderTopWidth: 1 },
  input: { flex: 1, minHeight: 40, maxHeight: 120, fontSize: 15, fontFamily: 'Inter_400Regular' },
  sendBtn: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
});
