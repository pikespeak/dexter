import { useEffect, useState, useCallback } from "react";
import { View, ScrollView, RefreshControl, StyleSheet } from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { IconButton, Chip, SegmentedButtons, List, Divider, Text } from "react-native-paper";
import { useAppStore } from "../../lib/store";
import {
  getPriceSnapshot, getPrices, getMetricsSnapshot,
  getIncome, getBalance, getCashflow,
  getNews, getFilings, getFilingItems, getInsiderTrades, getCompany,
  getEstimates, getSegments,
} from "../../lib/api-client";
import type {
  PriceSnapshot, PriceBar, MetricsSnapshot,
  IncomeStatement, BalanceSheet, CashflowStatement,
  NewsArticle, Filing, FilingItem, InsiderTrade, Company,
  Estimate, Segment,
} from "../../lib/types";
import PriceChart from "../../components/PriceChart";
import MetricCard from "../../components/MetricCard";
import FinancialTable from "../../components/FinancialTable";
import NewsFeed from "../../components/NewsFeed";
import SkeletonLoader from "../../components/SkeletonLoader";
import ErrorState from "../../components/ErrorState";
import { useAppTheme, spacing } from "../../lib/theme";

type FinancialTab = "income" | "balance" | "cashflow";
type SectionKey = "price" | "company" | "chart" | "metrics" | "financials" | "news" | "filings" | "insiderTrades" | "estimates" | "segments";

export default function TickerDetailScreen() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const { t } = useTranslation();
  const theme = useAppTheme();
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
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [financialTab, setFinancialTab] = useState<FinancialTab>("income");
  const [showFilings, setShowFilings] = useState(false);
  const [showEstimates, setShowEstimates] = useState(false);
  const [showSegments, setShowSegments] = useState(false);
  const [expandedFiling, setExpandedFiling] = useState<number | null>(null);
  const [filingItems, setFilingItems] = useState<FilingItem[]>([]);
  const [sectionErrors, setSectionErrors] = useState<Partial<Record<SectionKey, string>>>({});

  const setSectionError = (key: SectionKey, msg: string) => {
    setSectionErrors((prev) => ({ ...prev, [key]: msg }));
  };
  const clearSectionError = (key: SectionKey) => {
    setSectionErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const loadData = useCallback(async () => {
    if (!ticker) return;
    setLoading(true);
    setSectionErrors({});
    const today = new Date().toISOString().slice(0, 10);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

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
      getEstimates(ticker, { limit: 5 }),
      getSegments(ticker, { period: "annual", limit: 5 }),
    ]);

    const handle = <T,>(idx: number, setter: (v: T) => void, key: SectionKey) => {
      const r = results[idx];
      if (r.status === "fulfilled") { setter((r.value as { data: T }).data); clearSectionError(key); }
      else setSectionError(key, r.reason?.message || t("common.error"));
    };

    handle<PriceSnapshot>(0, setSnapshot, "price");
    handle<Company>(1, setCompany, "company");
    handle<PriceBar[]>(2, setPrices, "chart");
    handle<MetricsSnapshot>(3, setMetrics, "metrics");
    handle<IncomeStatement[]>(4, setIncome, "financials");
    handle<BalanceSheet[]>(5, setBalance, "financials");
    handle<CashflowStatement[]>(6, setCashflow, "financials");
    handle<NewsArticle[]>(7, setNews, "news");
    handle<Filing[]>(8, setFilings, "filings");
    handle<InsiderTrade[]>(9, setInsiderTrades, "insiderTrades");
    handle<Estimate[]>(10, setEstimates, "estimates");
    handle<Segment[]>(11, setSegments, "segments");

    setLoading(false);
  }, [ticker, t]);

  useEffect(() => { loadData(); }, [loadData]);

  const retrySection = useCallback(async (key: SectionKey) => {
    clearSectionError(key);
    const today = new Date().toISOString().slice(0, 10);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    try {
      switch (key) {
        case "price": { const r = await getPriceSnapshot(ticker); setSnapshot(r.data); break; }
        case "company": { const r = await getCompany(ticker); setCompany(r.data); break; }
        case "chart": { const r = await getPrices(ticker, { start_date: thirtyDaysAgo, end_date: today }); setPrices(r.data); break; }
        case "metrics": { const r = await getMetricsSnapshot(ticker); setMetrics(r.data); break; }
        case "financials": {
          const [i, b, c] = await Promise.all([
            getIncome(ticker, { period: "annual", limit: 5 }),
            getBalance(ticker, { period: "annual", limit: 5 }),
            getCashflow(ticker, { period: "annual", limit: 5 }),
          ]);
          setIncome(i.data); setBalance(b.data); setCashflow(c.data);
          break;
        }
        case "news": { const r = await getNews(ticker, { limit: 5 }); setNews(r.data); break; }
        case "filings": { const r = await getFilings(ticker, { limit: 5 }); setFilings(r.data); break; }
        case "insiderTrades": { const r = await getInsiderTrades(ticker, { limit: 10 }); setInsiderTrades(r.data); break; }
        case "estimates": { const r = await getEstimates(ticker, { limit: 5 }); setEstimates(r.data); break; }
        case "segments": { const r = await getSegments(ticker, { period: "annual", limit: 5 }); setSegments(r.data); break; }
      }
    } catch (err: unknown) {
      setSectionError(key, (err as Error).message || t("common.error"));
    }
  }, [ticker, t]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const toggleWatchlist = useCallback(() => {
    inWatchlist ? removeFromWatchlist(ticker) : addToWatchlist(ticker);
  }, [inWatchlist, ticker, addToWatchlist, removeFromWatchlist]);

  const handleFilingTap = useCallback(async (index: number) => {
    if (expandedFiling === index) {
      setExpandedFiling(null);
      return;
    }
    setExpandedFiling(index);
    try {
      const r = await getFilingItems(ticker, { limit: 10 });
      setFilingItems(r.data);
    } catch {
      setFilingItems([]);
    }
  }, [expandedFiling, ticker]);

  const price = snapshot?.price ?? snapshot?.close;
  const changePercent = snapshot?.change_percent;
  const isPositive = (changePercent ?? 0) >= 0;

  const incomeColumns = [
    { key: "report_period", label: "PERIOD" }, { key: "revenue", label: "REVENUE" },
    { key: "net_income", label: "NET INC." }, { key: "eps_diluted", label: "EPS" },
  ];
  const balanceColumns = [
    { key: "report_period", label: "PERIOD" }, { key: "total_assets", label: "ASSETS" },
    { key: "total_liabilities", label: "LIABILITIES" }, { key: "total_equity", label: "EQUITY" },
  ];
  const cashflowColumns = [
    { key: "report_period", label: "PERIOD" }, { key: "operating_cash_flow", label: "OPERATING" },
    { key: "free_cash_flow", label: "FREE CF" }, { key: "net_cash_flow", label: "NET CF" },
  ];

  const estimateColumns = estimates.length > 0
    ? Object.keys(estimates[0]).filter((k) => k !== "ticker").map((k) => ({ key: k, label: k.replace(/_/g, " ").toUpperCase() }))
    : [];

  const segmentColumns = segments.length > 0
    ? Object.keys(segments[0]).filter((k) => k !== "ticker").map((k) => ({ key: k, label: k.replace(/_/g, " ").toUpperCase() }))
    : [];

  return (
    <>
      <Stack.Screen
        options={{
          title: ticker,
          headerRight: () => (
            <IconButton
              icon={inWatchlist ? "star" : "star-outline"}
              iconColor={inWatchlist ? theme.colors.primary : theme.colors.onSurfaceVariant}
              onPress={toggleWatchlist}
            />
          ),
        }}
      />
      <ScrollView
        style={[st.container, { backgroundColor: theme.colors.background }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        {loading ? (
          <View style={{ padding: spacing.lg, gap: spacing.md }}>
            <SkeletonLoader height={48} />
            <SkeletonLoader height={24} width={200} />
            <SkeletonLoader height={160} />
            <SkeletonLoader height={90} />
            <SkeletonLoader height={200} />
          </View>
        ) : (
          <>
            {/* Price Header */}
            {sectionErrors.price ? (
              <ErrorState compact message={sectionErrors.price} onRetry={() => retrySection("price")} />
            ) : (
              <View style={[st.priceHeader, { borderBottomColor: theme.colors.outlineVariant }]}>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4 }}>
                  {company?.name || ticker}
                </Text>
                <View style={st.priceRow}>
                  {price != null && (
                    <Text variant="displaySmall" style={{ fontWeight: "800", letterSpacing: -1 }}>${price.toFixed(2)}</Text>
                  )}
                  {changePercent != null && (
                    <Chip
                      compact
                      style={{ backgroundColor: isPositive ? theme.finance.gainBg : theme.finance.lossBg }}
                      textStyle={{ color: isPositive ? theme.finance.gain : theme.finance.loss, fontWeight: "700" }}
                    >
                      {isPositive ? "▲" : "▼"} {Math.abs(changePercent).toFixed(2)}%
                    </Chip>
                  )}
                </View>
                <Text variant="labelSmall" style={{ letterSpacing: 2, color: theme.colors.onSurfaceVariant, marginTop: spacing.sm }}>
                  {ticker} · {company?.exchange || "NYSE"}
                </Text>
              </View>
            )}

            {/* Chart */}
            <View style={st.section}>
              <SectionHeader theme={theme} label={t("ticker.price_chart")} />
              {sectionErrors.chart ? (
                <ErrorState compact message={sectionErrors.chart} onRetry={() => retrySection("chart")} />
              ) : (
                <PriceChart data={prices} />
              )}
            </View>

            {/* Metrics */}
            <View style={st.section}>
              <SectionHeader theme={theme} label={t("ticker.key_metrics")} />
              {sectionErrors.metrics ? (
                <ErrorState compact message={sectionErrors.metrics} onRetry={() => retrySection("metrics")} />
              ) : metrics ? (
                <View style={st.metricsGrid}>
                  <MetricCard label={t("ticker.market_cap")} value={metrics.market_cap} />
                  <MetricCard label={t("ticker.pe_ratio")} value={metrics.pe_ratio} />
                  <MetricCard label={t("ticker.eps")} value={metrics.eps} />
                  <MetricCard label={t("ticker.dividend_yield")} value={metrics.dividend_yield} />
                </View>
              ) : null}
            </View>

            {/* Financials */}
            <View style={st.section}>
              <SectionHeader theme={theme} label={t("ticker.financials")} />
              {sectionErrors.financials ? (
                <ErrorState compact message={sectionErrors.financials} onRetry={() => retrySection("financials")} />
              ) : (
                <>
                  <SegmentedButtons
                    value={financialTab}
                    onValueChange={(v) => setFinancialTab(v as FinancialTab)}
                    buttons={[
                      { value: "income", label: t("ticker.income").toUpperCase() },
                      { value: "balance", label: t("ticker.balance").toUpperCase() },
                      { value: "cashflow", label: t("ticker.cashflow").toUpperCase() },
                    ]}
                    style={{ marginHorizontal: spacing.lg, marginBottom: spacing.md }}
                  />
                  <FinancialTable
                    data={financialTab === "income" ? income : financialTab === "balance" ? balance : cashflow}
                    columns={financialTab === "income" ? incomeColumns : financialTab === "balance" ? balanceColumns : cashflowColumns}
                  />
                </>
              )}
            </View>

            {/* Analyst Estimates */}
            <View style={st.section}>
              <List.Accordion
                title={t("ticker.estimates").toUpperCase()}
                titleStyle={{ fontSize: 11, letterSpacing: 3, color: theme.colors.onSurfaceVariant }}
                expanded={showEstimates}
                onPress={() => setShowEstimates((v) => !v)}
                style={{ paddingHorizontal: spacing.lg }}
              >
                {sectionErrors.estimates ? (
                  <ErrorState compact message={sectionErrors.estimates} onRetry={() => retrySection("estimates")} />
                ) : estimates.length > 0 ? (
                  <FinancialTable data={estimates} columns={estimateColumns.slice(0, 4)} />
                ) : (
                  <Text variant="bodySmall" style={{ textAlign: "center", padding: spacing.md, color: theme.colors.onSurfaceVariant }}>
                    {t("ticker.no_data")}
                  </Text>
                )}
              </List.Accordion>
            </View>

            {/* Revenue Segments */}
            <View style={st.section}>
              <List.Accordion
                title={t("ticker.segments").toUpperCase()}
                titleStyle={{ fontSize: 11, letterSpacing: 3, color: theme.colors.onSurfaceVariant }}
                expanded={showSegments}
                onPress={() => setShowSegments((v) => !v)}
                style={{ paddingHorizontal: spacing.lg }}
              >
                {sectionErrors.segments ? (
                  <ErrorState compact message={sectionErrors.segments} onRetry={() => retrySection("segments")} />
                ) : segments.length > 0 ? (
                  <FinancialTable data={segments} columns={segmentColumns.slice(0, 4)} />
                ) : (
                  <Text variant="bodySmall" style={{ textAlign: "center", padding: spacing.md, color: theme.colors.onSurfaceVariant }}>
                    {t("ticker.no_data")}
                  </Text>
                )}
              </List.Accordion>
            </View>

            {/* News */}
            <View style={st.section}>
              <SectionHeader theme={theme} label={t("ticker.news")} />
              {sectionErrors.news ? (
                <ErrorState compact message={sectionErrors.news} onRetry={() => retrySection("news")} />
              ) : (
                <NewsFeed articles={news} />
              )}
            </View>

            {/* Filings */}
            <View style={st.section}>
              <List.Accordion
                title={t("ticker.filings").toUpperCase()}
                titleStyle={{ fontSize: 11, letterSpacing: 3, color: theme.colors.onSurfaceVariant }}
                expanded={showFilings}
                onPress={() => setShowFilings((v) => !v)}
                style={{ paddingHorizontal: spacing.lg }}
              >
                {sectionErrors.filings ? (
                  <ErrorState compact message={sectionErrors.filings} onRetry={() => retrySection("filings")} />
                ) : filings.map((f, i) => (
                  <View key={i}>
                    <List.Item
                      title={f.filing_type}
                      titleStyle={{ fontWeight: "600" }}
                      description={f.filing_date}
                      onPress={() => handleFilingTap(i)}
                      right={(props) => <List.Icon {...props} icon={expandedFiling === i ? "chevron-up" : "chevron-down"} />}
                    />
                    {expandedFiling === i && filingItems.length > 0 && (
                      <View style={[st.filingDetails, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant }]}>
                        {filingItems.map((item, j) => (
                          <View key={j} style={{ marginBottom: spacing.xs }}>
                            {Object.entries(item)
                              .filter(([k]) => k !== "ticker")
                              .slice(0, 3)
                              .map(([k, v]) => (
                                <Text key={k} variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, lineHeight: 18 }}>
                                  {k.replace(/_/g, " ")}: {String(v ?? "—")}
                                </Text>
                              ))}
                          </View>
                        ))}
                      </View>
                    )}
                    <Divider />
                  </View>
                ))}
              </List.Accordion>
            </View>

            {/* Insider Trades */}
            {insiderTrades.length > 0 && (
              <View style={[st.section, { paddingHorizontal: spacing.lg, marginBottom: spacing.xxxl }]}>
                <SectionHeader theme={theme} label={t("ticker.insider_trades")} inline />
                {sectionErrors.insiderTrades ? (
                  <ErrorState compact message={sectionErrors.insiderTrades} onRetry={() => retrySection("insiderTrades")} />
                ) : (
                  insiderTrades.map((trade, i) => (
                    <View key={i}>
                      <List.Item
                        title={trade.owner_name}
                        titleStyle={{ fontWeight: "600" }}
                        description={`${trade.shares?.toLocaleString()} shares @ $${trade.price_per_share?.toFixed(2)} · ${trade.trade_date}`}
                        right={() => (
                          <Text
                            variant="labelSmall"
                            style={{
                              alignSelf: "center",
                              fontWeight: "700",
                              letterSpacing: 1,
                              color: trade.transaction_type?.toLowerCase().includes("buy") ? theme.finance.gain : theme.finance.loss,
                            }}
                          >
                            {trade.transaction_type?.toUpperCase()}
                          </Text>
                        )}
                        style={{ paddingHorizontal: 0 }}
                      />
                      {i < insiderTrades.length - 1 && <Divider />}
                    </View>
                  ))
                )}
              </View>
            )}
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

function SectionHeader({ theme, label, inline }: { theme: ReturnType<typeof useAppTheme>; label: string; inline?: boolean }) {
  return (
    <View style={[st.sectionHeaderWrap, !inline && { paddingHorizontal: spacing.lg }]}>
      <View style={st.sectionLabelWrap}>
        <View style={[st.sectionDot, { backgroundColor: theme.colors.primary }]} />
        <Text variant="labelSmall" style={{ letterSpacing: 3, color: theme.colors.onSurfaceVariant }}>
          {label.toUpperCase()}
        </Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  priceHeader: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xl, borderBottomWidth: 1 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  section: { marginTop: spacing.xxl },
  sectionHeaderWrap: { flexDirection: "row", alignItems: "center", marginBottom: spacing.md },
  sectionLabelWrap: { flexDirection: "row", alignItems: "center" },
  sectionDot: { width: 3, height: 3, marginRight: spacing.sm },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: spacing.md },
  filingDetails: { borderRadius: 8, padding: spacing.md, marginHorizontal: spacing.lg, marginBottom: spacing.sm, borderWidth: 1 },
});
