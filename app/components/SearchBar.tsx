import { View, TextInput, Pressable, Text } from "react-native";
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
    <View className="flex-row items-center bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-2 mx-4 mt-2">
      <Text className="text-gray-400 mr-2">🔍</Text>
      <TextInput
        className="flex-1 text-base text-gray-900 dark:text-white"
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
          <Text className="text-blue-500 font-semibold">Go</Text>
        </Pressable>
      )}
    </View>
  );
}
