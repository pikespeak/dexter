import { View, TextInput, Pressable, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { searchTickers } from "../lib/api-client";
import type { SearchResult } from "../lib/types";
import SearchResults from "./SearchResults";
import { colors, fonts, spacing, radius } from "../lib/theme";

interface Props {
  onSearch: (query: string) => void;
}

export default function SearchBar({ onSearch }: Props) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSubmit = () => {
    const trimmed = query.trim();
    if (trimmed) {
      setShowResults(false);
      onSearch(trimmed.toUpperCase());
      setQuery("");
    }
  };

  const handleSelect = useCallback((ticker: string) => {
    setShowResults(false);
    setQuery("");
    onSearch(ticker);
  }, [onSearch]);

  const handleChangeText = useCallback((text: string) => {
    setQuery(text);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (text.trim().length < 1) {
      setShowResults(false);
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      setShowResults(true);
      try {
        const res = await searchTickers(text.trim());
        setResults(res.data);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <View>
      <View style={s.container}>
        <Text style={s.prefix}>$</Text>
        <TextInput
          style={s.input}
          placeholder={t("search.placeholder")}
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={handleChangeText}
          onSubmitEditing={handleSubmit}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="search"
        />
        {searching ? (
          <ActivityIndicator size="small" color={colors.accent} style={{ marginRight: spacing.sm }} />
        ) : query.length > 0 ? (
          <Pressable onPress={handleSubmit} style={s.goBtn}>
            <Text style={s.goText}>→</Text>
          </Pressable>
        ) : null}
      </View>
      <SearchResults
        results={results}
        loading={searching}
        visible={showResults && query.trim().length > 0}
        onSelect={handleSelect}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center", backgroundColor: colors.bgInput, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: radius.sm, paddingHorizontal: 16, marginHorizontal: spacing.lg, marginTop: spacing.md },
  prefix: { fontFamily: fonts.mono, color: colors.accent, fontSize: 16, marginRight: spacing.sm },
  input: { flex: 1, fontSize: 15, color: colors.textPrimary, fontFamily: fonts.mono, paddingVertical: 14, letterSpacing: 1 },
  goBtn: { backgroundColor: colors.accent, borderRadius: radius.sm, width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  goText: { color: colors.textInverse, fontSize: 16, fontWeight: "700" },
});
