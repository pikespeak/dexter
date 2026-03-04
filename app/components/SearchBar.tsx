import { View, TextInput, Pressable, Text, StyleSheet } from "react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface Props {
  onSearch: (query: string) => void;
}

export default function SearchBar({ onSearch }: Props) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");

  const handleSubmit = () => {
    const trimmed = query.trim();
    if (trimmed) {
      onSearch(trimmed.toUpperCase());
      setQuery("");
    }
  };

  return (
    <View style={s.container}>
      <Text style={s.icon}>🔍</Text>
      <TextInput
        style={s.input}
        placeholder={t("search.placeholder")}
        placeholderTextColor="#9ca3af"
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={handleSubmit}
        autoCapitalize="characters"
        autoCorrect={false}
        returnKeyType="search"
      />
      {query.length > 0 && (
        <Pressable onPress={handleSubmit}>
          <Text style={s.goText}>Go</Text>
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center", backgroundColor: "#f3f4f6", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8, marginHorizontal: 16, marginTop: 8 },
  icon: { color: "#9ca3af", marginRight: 8 },
  input: { flex: 1, fontSize: 16, color: "#111827" },
  goText: { color: "#2563eb", fontWeight: "600" },
});
