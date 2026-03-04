import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, RefreshControl, StyleSheet } from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../../lib/store";
import {
  getPriceSnapshot, getPrices, getMetricsSnapshot,
  getIncome, getBalance, getCashflow,
  getNews, getFilings, getInsiderTrades, getCompany,
} from "../../lib/api-client";
import type {
  PriceSnapshot, PriceBar, MetricsSnapshot,
  IncomeStatement, BalanceSheet, CashflowStatement,
  NewsArticle, Filing, InsiderTrade, Company,
} from "../../lib/types";
import PriceChart from "../../components/PriceChart";
import MetricCard from "../../components/MetricCard";
import FinancialTable from "../../components/FinancialTable";
import NewsFeed from "../../components/NewsFeed";
import SkeletonLoader from "../../components/SkeletonLoader";

type FinancialTab = "income" | "balance" | "cashflow";

export default function TickerDetailScreen() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const { t } = useTranslation();
  const ticker = symbol?.toUpperCase() || "";

  const isInWatchlist = useAppStore((s) => s.isInWatchlist);
  const addToWatchlist = useAppStore((s) => s.addToWatchlist);
  const removeFromWatchlist = useAppStore((s) => s.removeFromWatchlist);
  const inWatchlist = isInWatchlist(ticker);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [snapshot, setSnapshot] = useState<PriceSnapshot | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [prices, setPrices] = useState<PriceBar[]>([]);
  const [metrics, setMetrics] = useState<MetricsSnapshot | null>(null);
  const [income, setIncome] = useState<IncomeStatement[]>([]);
  const [balance, setBalance] = useState<BalanceSheet[]>([]);
  const [cashflow, setCashflow] = useState<CashflowStatement[]>([]);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [filings, setFilings] = useState<Filing[]>([]);
  const [insiderTrades, setInsiderTrades] = useState<InsiderTrade[]>([]);
  const [financialTab, setFinancialTab] = useState<FinancialTab>("income");
  const [showFilings, setShowFilings] = useState(false);

  const loadData = useCallback(async () => {
    if (!ticker) return;
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

    const results = await Promise.allSettled([
      getPriceSnapshot(ticker), getCompany(ticker),
      getPrices(ticker, { start_date: thirtyDaysAgo, end_date: today }),
      getMetricsSnapshot(ticker),
      getIncome(ticker, { period: "annual", limit: 5 }),
      getBalance(ticker, { period: "annual", limit: 5 }),
      getCashflow(ticker, { period: "annual", limit: 5 }),
      getNews(ticker, { limit: 5 }),
      getFilings(ticker, { limit: 5 }),
      getInsiderTrades(ticker, { limit: 10 }),
    ]);

    if (results[0].status === "fulfilled") setSnapshot(results[0].value.data);
    if (results[1].status === "fulfilled") setCompany(results[1].value.data);
    if (results[2].status === "fulfilled") setPrices(results[2].value.data);
    if (results[3].status === "fulfilled") setMetrics(results[3].value.data);
    if (results[4].status === "fulfilled") setIncome(results[4].value.data);
    if (results[5].status === "fulfilled") setBalance(results[5].value.data);
    if (results[6].status === "fulfilled") setCashflow(results[6].value.data);
    if (results[7].status === "fulfilled") setNews(results[7].value.data);
    if (results[8].status === "fulfilled") setFilings(results[8].value.data);
    if (results[9].status === "fulfilled") setInsiderTrades(results[9].value.data);
    setLoading(false);
  }, [ticker]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const toggleWatchlist = useCallback(() => {
    inWatchlist ? removeFromWatchlist(ticker) : addToWatchlist(ticker);
  }, [inWatchlist, ticker, addToWatchlist, removeFromWatchlist]);

  const price = snapshot?.price ?? snapshot?.close;
  const changePercent = snapshot?.change_percent;

  const incomeColumns = [
    { key: "report_period", label: "Period" }, { key: "revenue", label: "Revenue" },
    { key: "net_income", label: "Net Income" }, { key: "eps_diluted", label: "EPS" },
  ];
  const balanceColumns = [
    { key: "report_period", label: "Period" }, { key: "total_assets", label: "Assets" },
    { key: "total_liabilities", label: "Liabilities" }, { key: "total_equity", label: "Equity" },
  ];
  const cashflowColumns = [
    { key: "report_period", label: "Period" }, { key: "operating_cash_flow", label: "Operating" },
    { key: "free_cash_flow", label: "Free CF" }, { key: "net_cash_flow", label: "Net CF" },
  ];

  return (
    <>
      <Stack.Screen
        options={{
          title: ticker,
          headerRight: () => (
            <Pressable onPress={toggleWatchlist} style={{ paddingRight: 8 }}>
              <Text style={{ fontSize: 24 }}>{inWatchlist ? "★" : "☆"}</Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView style={st.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {loading ? (
          <View style={{ padding: 16, gap: 12 }}>
            <SkeletonLoader height={40} />
            <SkeletonLoader height={20} width={200} />
            <SkeletonLoader height={150} />
            <SkeletonLoader height={80} />
            <SkeletonLoader height={200} />
          </View>
        ) : (
          <>
            {/* Header */}
            <View style={st.tickerHeader}>
              <Text style={st.companyName}>{company?.name || ticker}</Text>
              {price != null && (
                <View style={{ flexDirection: "row", alignItems: "baseline", marginTop: 4 }}>
                  <Text style={st.price}>${price.toFixed(2)}</Text>
                  {changePercent != null && (
                    <Text style={[st.change, { color: changePercent >= 0 ? "#22c55e" : "#ef4444" }]}>
                      {changePercent >= 0 ? "+" : ""}{changePercent.toFixed(2)}%
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* Chart */}
            <View style={{ marginTop: 16 }}>
              <Text style={st.sectionTitle}>{t("ticker.price_chart")}</Text>
              <PriceChart data={prices} />
            </View>

            {/* Metrics */}
            {metrics && (
              <View style={{ marginTop: 24, paddingHorizontal: 12 }}>
                <Text style={[st.sectionTitle, { paddingHorizontal: 4 }]}>{t("ticker.key_metrics")}</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                  <MetricCard label={t("ticker.market_cap")} value={metrics.market_cap} />
                  <MetricCard label={t("ticker.pe_ratio")} value={metrics.pe_ratio} />
                  <MetricCard label={t("ticker.eps")} value={metrics.eps} />
                  <MetricCard label={t("ticker.dividend_yield")} value={metrics.dividend_yield} />
                </View>
              </View>
            )}

            {/* Financials */}
            <View style={{ marginTop: 24 }}>
              <Text style={st.sectionTitle}>{t("ticker.financials")}</Text>
              <View style={{ flexDirection: "row", paddingHorizontal: 16, marginBottom: 12 }}>
                {(["income", "balance", "cashflow"] as const).map((tab) => (
                  <Pressable
                    key={tab}
                    onPress={() => setFinancialTab(tab)}
                    style={[st.tabBtn, financialTab === tab && st.tabBtnActive]}
                  >
                    <Text style={[st.tabText, financialTab === tab && st.tabTextActive]}>
                      {t(`ticker.${tab}`)}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <FinancialTable
                data={financialTab === "income" ? income : financialTab === "balance" ? balance : cashflow}
                columns={financialTab === "income" ? incomeColumns : financialTab === "balance" ? balanceColumns : cashflowColumns}
              />
            </View>

            {/* News */}
            <View style={{ marginTop: 24 }}>
              <Text style={st.sectionTitle}>{t("ticker.news")}</Text>
              <NewsFeed articles={news} />
            </View>

            {/* Filings */}
            <View style={{ marginTop: 24, paddingHorizontal: 16 }}>
              <Pressable onPress={() => setShowFilings((v) => !v)} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={st.sectionTitleInline}>{t("ticker.filings")}</Text>
                <Text style={{ color: "#9ca3af" }}>{showFilings ? "▲" : "▼"}</Text>
              </Pressable>
              {showFilings && filings.map((f, i) => (
                <View key={i} style={st.listItem}>
                  <Text style={st.listItemTitle}>{f.filing_type}</Text>
                  <Text style={st.listItemSub}>{f.filing_date}</Text>
                </View>
              ))}
            </View>

            {/* Insider Trades */}
            {insiderTrades.length > 0 && (
              <View style={{ marginTop: 24, paddingHorizontal: 16, marginBottom: 32 }}>
                <Text style={st.sectionTitleInline}>{t("ticker.insider_trades")}</Text>
                {insiderTrades.map((trade, i) => (
                  <View key={i} style={st.listItem}>
                    <Text style={st.listItemTitle}>{trade.owner_name}</Text>
                    <Text style={st.listItemSub}>
                      {trade.transaction_type} · {trade.shares?.toLocaleString()} shares · ${trade.price_per_share?.toFixed(2)}
                    </Text>
                    <Text style={{ fontSize: 12, color: "#9ca3af" }}>{trade.trade_date}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  tickerHeader: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  companyName: { fontSize: 14, color: "#6b7280" },
  price: { fontSize: 32, fontWeight: "bold", color: "#111827" },
  change: { fontSize: 18, fontWeight: "600", marginLeft: 8 },
  sectionTitle: { fontSize: 18, fontWeight: "600", color: "#111827", paddingHorizontal: 16, marginBottom: 8 },
  sectionTitleInline: { fontSize: 18, fontWeight: "600", color: "#111827" },
  tabBtn: { paddingHorizontal: 16, paddingVertical: 8, marginRight: 8, borderRadius: 20, backgroundColor: "#e5e7eb" },
  tabBtnActive: { backgroundColor: "#2563eb" },
  tabText: { fontSize: 14, fontWeight: "500", color: "#374151" },
  tabTextActive: { color: "#fff" },
  listItem: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  listItemTitle: { fontSize: 14, fontWeight: "600", color: "#111827" },
  listItemSub: { fontSize: 12, color: "#6b7280" },
});
