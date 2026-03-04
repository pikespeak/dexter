import { View } from "react-native";
import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Searchbar } from "react-native-paper";
import { searchTickers } from "../lib/api-client";
import type { SearchResult } from "../lib/types";
import SearchResults from "./SearchResults";
import { spacing } from "../lib/theme";

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
      <Searchbar
        placeholder={t("search.placeholder")}
        value={query}
        onChangeText={handleChangeText}
        onSubmitEditing={handleSubmit}
        icon="currency-usd"
        loading={searching}
        style={{ marginHorizontal: spacing.lg, marginTop: spacing.md }}
        inputStyle={{ letterSpacing: 1 }}
        autoCapitalize="characters"
        autoCorrect={false}
      />
      <SearchResults
        results={results}
        loading={searching}
        visible={showResults && query.trim().length > 0}
        onSelect={handleSelect}
      />
    </View>
  );
}
