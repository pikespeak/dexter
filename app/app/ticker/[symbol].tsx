import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, RefreshControl } from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../../lib/store";
import {
  getPriceSnapshot,
  getPrices,
  getMetricsSnapshot,
  getIncome,
  getBalance,
  getCashflow,
  getNews,
  getFilings,
  getInsiderTrades,
  getCompany,
} from "../../lib/api-client";
import type {
  PriceSnapshot,
  PriceBar,
  MetricsSnapshot,
  IncomeStatement,
  BalanceSheet,
  CashflowStatement,
  NewsArticle,
  Filing,
  InsiderTrade,
  Company,
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
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)
      .toISOString()
      .slice(0, 10);

    const results = await Promise.allSettled([
      getPriceSnapshot(ticker),
      getCompany(ticker),
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
    if (results[9].status === "fulfilled")
      setInsiderTrades(results[9].value.data);

    setLoading(false);
  }, [ticker]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const toggleWatchlist = useCallback(() => {
    if (inWatchlist) {
      removeFromWatchlist(ticker);
    } else {
      addToWatchlist(ticker);
    }
  }, [inWatchlist, ticker, addToWatchlist, removeFromWatchlist]);

  const price = snapshot?.price ?? snapshot?.close;
  const changePercent = snapshot?.change_percent;

  const incomeColumns = [
    { key: "report_period", label: "Period" },
    { key: "revenue", label: "Revenue" },
    { key: "net_income", label: "Net Income" },
    { key: "eps_diluted", label: "EPS" },
  ];

  const balanceColumns = [
    { key: "report_period", label: "Period" },
    { key: "total_assets", label: "Assets" },
    { key: "total_liabilities", label: "Liabilities" },
    { key: "total_equity", label: "Equity" },
  ];

  const cashflowColumns = [
    { key: "report_period", label: "Period" },
    { key: "operating_cash_flow", label: "Operating" },
    { key: "free_cash_flow", label: "Free CF" },
    { key: "net_cash_flow", label: "Net CF" },
  ];

  return (
    <>
      <Stack.Screen
        options={{
          title: ticker,
          headerRight: () => (
            <Pressable onPress={toggleWatchlist} className="pr-2">
              <Text className="text-2xl">{inWatchlist ? "★" : "☆"}</Text>
            </Pressable>
          ),
        }}
      />

      <ScrollView
        className="flex-1 bg-gray-50 dark:bg-gray-950"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View className="p-4 gap-3">
            <SkeletonLoader height={40} />
            <SkeletonLoader height={20} width={200} />
            <SkeletonLoader height={150} />
            <SkeletonLoader height={80} />
            <SkeletonLoader height={200} />
          </View>
        ) : (
          <>
            {/* Header */}
            <View className="px-4 pt-4 pb-2">
              <Text className="text-sm text-gray-500 dark:text-gray-400">
                {company?.name || ticker}
              </Text>
              {price !== undefined && price !== null && (
                <View className="flex-row items-baseline mt-1">
                  <Text className="text-3xl font-bold text-gray-900 dark:text-white">
                    ${price.toFixed(2)}
                  </Text>
                  {changePercent !== undefined && changePercent !== null && (
                    <Text
                      className={`text-lg font-semibold ml-2 ${
                        changePercent >= 0 ? "text-green-500" : "text-red-500"
                      }`}
                    >
                      {changePercent >= 0 ? "+" : ""}
                      {changePercent.toFixed(2)}%
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* Price Chart */}
            <View className="mt-4">
              <Text className="text-lg font-semibold text-gray-900 dark:text-white px-4 mb-2">
                {t("ticker.price_chart")}
              </Text>
              <PriceChart data={prices} />
            </View>

            {/* Key Metrics */}
            {metrics && (
              <View className="mt-6 px-3">
                <Text className="text-lg font-semibold text-gray-900 dark:text-white px-1 mb-2">
                  {t("ticker.key_metrics")}
                </Text>
                <View className="flex-row flex-wrap">
                  <MetricCard
                    label={t("ticker.market_cap")}
                    value={metrics.market_cap}
                  />
                  <MetricCard
                    label={t("ticker.pe_ratio")}
                    value={metrics.pe_ratio}
                  />
                  <MetricCard label={t("ticker.eps")} value={metrics.eps} />
                  <MetricCard
                    label={t("ticker.dividend_yield")}
                    value={metrics.dividend_yield}
                  />
                </View>
              </View>
            )}

            {/* Financials */}
            <View className="mt-6">
              <Text className="text-lg font-semibold text-gray-900 dark:text-white px-4 mb-2">
                {t("ticker.financials")}
              </Text>
              <View className="flex-row px-4 mb-3">
                {(["income", "balance", "cashflow"] as const).map((tab) => (
                  <Pressable
                    key={tab}
                    onPress={() => setFinancialTab(tab)}
                    className={`px-4 py-2 mr-2 rounded-full ${
                      financialTab === tab
                        ? "bg-blue-500"
                        : "bg-gray-200 dark:bg-gray-800"
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        financialTab === tab
                          ? "text-white"
                          : "text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {t(`ticker.${tab}`)}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <FinancialTable
                data={
                  financialTab === "income"
                    ? income
                    : financialTab === "balance"
                      ? balance
                      : cashflow
                }
                columns={
                  financialTab === "income"
                    ? incomeColumns
                    : financialTab === "balance"
                      ? balanceColumns
                      : cashflowColumns
                }
              />
            </View>

            {/* News */}
            <View className="mt-6">
              <Text className="text-lg font-semibold text-gray-900 dark:text-white px-4 mb-2">
                {t("ticker.news")}
              </Text>
              <NewsFeed articles={news} />
            </View>

            {/* Filings (collapsible) */}
            <View className="mt-6 px-4">
              <Pressable
                onPress={() => setShowFilings((s) => !s)}
                className="flex-row justify-between items-center"
              >
                <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t("ticker.filings")}
                </Text>
                <Text className="text-gray-400">
                  {showFilings ? "▲" : "▼"}
                </Text>
              </Pressable>
              {showFilings &&
                filings.map((filing, i) => (
                  <View
                    key={i}
                    className="py-2 border-b border-gray-100 dark:border-gray-800"
                  >
                    <Text className="text-sm font-semibold text-gray-900 dark:text-white">
                      {filing.filing_type}
                    </Text>
                    <Text className="text-xs text-gray-400">
                      {filing.filing_date}
                    </Text>
                  </View>
                ))}
            </View>

            {/* Insider Trades */}
            {insiderTrades.length > 0 && (
              <View className="mt-6 px-4 mb-8">
                <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {t("ticker.insider_trades")}
                </Text>
                {insiderTrades.map((trade, i) => (
                  <View
                    key={i}
                    className="py-2 border-b border-gray-100 dark:border-gray-800"
                  >
                    <Text className="text-sm font-semibold text-gray-900 dark:text-white">
                      {trade.owner_name}
                    </Text>
                    <Text className="text-xs text-gray-500">
                      {trade.transaction_type} · {trade.shares?.toLocaleString()}{" "}
                      shares · ${trade.price_per_share?.toFixed(2)}
                    </Text>
                    <Text className="text-xs text-gray-400">
                      {trade.trade_date}
                    </Text>
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
