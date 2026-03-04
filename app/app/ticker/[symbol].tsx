import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, RefreshControl, StyleSheet } from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { useTranslation } from "react-i18next";
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
import { colors, fonts, spacing, radius } from "../../lib/theme";

type FinancialTab = "income" | "balance" | "cashflow";

type SectionKey = "price" | "company" | "chart" | "metrics" | "financials" | "news" | "filings" | "insiderTrades" | "estimates" | "segments";

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
      getPriceSnapshot(ticker),         // 0
      getCompany(ticker),               // 1
      getPrices(ticker, { start_date: thirtyDaysAgo, end_date: today }), // 2
      getMetricsSnapshot(ticker),       // 3
      getIncome(ticker, { period: "annual", limit: 5 }),    // 4
      getBalance(ticker, { period: "annual", limit: 5 }),   // 5
      getCashflow(ticker, { period: "annual", limit: 5 }),  // 6
      getNews(ticker, { limit: 5 }),    // 7
      getFilings(ticker, { limit: 5 }), // 8
      getInsiderTrades(ticker, { limit: 10 }), // 9
      getEstimates(ticker, { limit: 5 }),      // 10
      getSegments(ticker, { period: "annual", limit: 5 }),  // 11
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
            <Pressable onPress={toggleWatchlist} style={{ paddingRight: 8 }}>
              <Text style={{ fontSize: 20, color: inWatchlist ? colors.accent : colors.textMuted }}>
                {inWatchlist ? "★" : "☆"}
              </Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView
        style={st.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
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
              <View style={st.priceHeader}>
                <Text style={st.companyName}>{company?.name || ticker}</Text>
                <View style={st.priceRow}>
                  {price != null && (
                    <Text style={st.price}>${price.toFixed(2)}</Text>
                  )}
                  {changePercent != null && (
                    <View style={[st.changeBadge, isPositive ? st.changeBadgeGain : st.changeBadgeLoss]}>
                      <Text style={[st.changeText, { color: isPositive ? colors.gain : colors.loss }]}>
                        {isPositive ? "▲" : "▼"} {Math.abs(changePercent).toFixed(2)}%
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={st.tickerLabel}>{ticker} · {company?.exchange || "NYSE"}</Text>
              </View>
            )}

            {/* Chart */}
            <View style={st.section}>
              <SectionHeader label={t("ticker.price_chart")} />
              {sectionErrors.chart ? (
                <ErrorState compact message={sectionErrors.chart} onRetry={() => retrySection("chart")} />
              ) : (
                <PriceChart data={prices} />
              )}
            </View>

            {/* Metrics */}
            <View style={st.section}>
              <SectionHeader label={t("ticker.key_metrics")} />
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
              <SectionHeader label={t("ticker.financials")} />
              {sectionErrors.financials ? (
                <ErrorState compact message={sectionErrors.financials} onRetry={() => retrySection("financials")} />
              ) : (
                <>
                  <View style={st.tabRow}>
                    {(["income", "balance", "cashflow"] as const).map((tab) => (
                      <Pressable
                        key={tab}
                        onPress={() => setFinancialTab(tab)}
                        style={[st.tabBtn, financialTab === tab && st.tabBtnActive]}
                      >
                        <Text style={[st.tabText, financialTab === tab && st.tabTextActive]}>
                          {t(`ticker.${tab}`).toUpperCase()}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <FinancialTable
                    data={financialTab === "income" ? income : financialTab === "balance" ? balance : cashflow}
                    columns={financialTab === "income" ? incomeColumns : financialTab === "balance" ? balanceColumns : cashflowColumns}
                  />
                </>
              )}
            </View>

            {/* Analyst Estimates */}
            <View style={[st.section, { paddingHorizontal: spacing.lg }]}>
              <Pressable onPress={() => setShowEstimates((v) => !v)} style={st.collapseHeader}>
                <View style={st.sectionLabelWrap}>
                  <View style={st.sectionDot} />
                  <Text style={st.sectionLabel}>{t("ticker.estimates").toUpperCase()}</Text>
                </View>
                <Text style={{ color: colors.textMuted, fontFamily: fonts.mono }}>{showEstimates ? "−" : "+"}</Text>
              </Pressable>
              {showEstimates && (
                sectionErrors.estimates ? (
                  <ErrorState compact message={sectionErrors.estimates} onRetry={() => retrySection("estimates")} />
                ) : estimates.length > 0 ? (
                  <FinancialTable data={estimates} columns={estimateColumns.slice(0, 4)} />
                ) : (
                  <Text style={st.noData}>{t("ticker.no_data")}</Text>
                )
              )}
            </View>

            {/* Revenue Segments */}
            <View style={[st.section, { paddingHorizontal: spacing.lg }]}>
              <Pressable onPress={() => setShowSegments((v) => !v)} style={st.collapseHeader}>
                <View style={st.sectionLabelWrap}>
                  <View style={st.sectionDot} />
                  <Text style={st.sectionLabel}>{t("ticker.segments").toUpperCase()}</Text>
                </View>
                <Text style={{ color: colors.textMuted, fontFamily: fonts.mono }}>{showSegments ? "−" : "+"}</Text>
              </Pressable>
              {showSegments && (
                sectionErrors.segments ? (
                  <ErrorState compact message={sectionErrors.segments} onRetry={() => retrySection("segments")} />
                ) : segments.length > 0 ? (
                  <FinancialTable data={segments} columns={segmentColumns.slice(0, 4)} />
                ) : (
                  <Text style={st.noData}>{t("ticker.no_data")}</Text>
                )
              )}
            </View>

            {/* News */}
            <View style={st.section}>
              <SectionHeader label={t("ticker.news")} />
              {sectionErrors.news ? (
                <ErrorState compact message={sectionErrors.news} onRetry={() => retrySection("news")} />
              ) : (
                <NewsFeed articles={news} />
              )}
            </View>

            {/* Filings */}
            <View style={[st.section, { paddingHorizontal: spacing.lg }]}>
              <Pressable onPress={() => setShowFilings((v) => !v)} style={st.collapseHeader}>
                <View style={st.sectionLabelWrap}>
                  <View style={st.sectionDot} />
                  <Text style={st.sectionLabel}>{t("ticker.filings").toUpperCase()}</Text>
                </View>
                <Text style={{ color: colors.textMuted, fontFamily: fonts.mono }}>{showFilings ? "−" : "+"}</Text>
              </Pressable>
              {showFilings && (
                sectionErrors.filings ? (
                  <ErrorState compact message={sectionErrors.filings} onRetry={() => retrySection("filings")} />
                ) : filings.map((f, i) => (
                  <View key={i}>
                    <Pressable onPress={() => handleFilingTap(i)} style={st.filingItem}>
                      <Text style={st.filingType}>{f.filing_type}</Text>
                      <Text style={st.filingDate}>{f.filing_date}</Text>
                    </Pressable>
                    {expandedFiling === i && filingItems.length > 0 && (
                      <View style={st.filingDetails}>
                        {filingItems.map((item, j) => (
                          <View key={j} style={st.filingDetailRow}>
                            {Object.entries(item)
                              .filter(([k]) => k !== "ticker")
                              .slice(0, 3)
                              .map(([k, v]) => (
                                <Text key={k} style={st.filingDetailText}>
                                  {k.replace(/_/g, " ")}: {String(v ?? "—")}
                                </Text>
                              ))}
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                ))
              )}
            </View>

            {/* Insider Trades */}
            {insiderTrades.length > 0 && (
              <View style={[st.section, { paddingHorizontal: spacing.lg, marginBottom: spacing.xxxl }]}>
                <SectionHeader label={t("ticker.insider_trades")} inline />
                {sectionErrors.insiderTrades ? (
                  <ErrorState compact message={sectionErrors.insiderTrades} onRetry={() => retrySection("insiderTrades")} />
                ) : (
                  insiderTrades.map((trade, i) => (
                    <View key={i} style={st.tradeItem}>
                      <View style={st.tradeRow}>
                        <Text style={st.tradeName}>{trade.owner_name}</Text>
                        <Text style={[st.tradeType, {
                          color: trade.transaction_type?.toLowerCase().includes("buy") ? colors.gain : colors.loss
                        }]}>
                          {trade.transaction_type?.toUpperCase()}
                        </Text>
                      </View>
                      <Text style={st.tradeDetail}>
                        {trade.shares?.toLocaleString()} shares @ ${trade.price_per_share?.toFixed(2)}
                      </Text>
                      <Text style={st.tradeDate}>{trade.trade_date}</Text>
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

function SectionHeader({ label, inline }: { label: string; inline?: boolean }) {
  return (
    <View style={[st.sectionHeaderWrap, !inline && { paddingHorizontal: spacing.lg }]}>
      <View style={st.sectionLabelWrap}>
        <View style={st.sectionDot} />
        <Text style={st.sectionLabel}>{label.toUpperCase()}</Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  priceHeader: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.border },
  companyName: { fontSize: 14, color: colors.textSecondary, fontFamily: fonts.body, marginBottom: 4 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  price: { fontSize: 36, fontWeight: "800", color: colors.textPrimary, fontFamily: fonts.mono, letterSpacing: -1 },
  changeBadge: { borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  changeBadgeGain: { backgroundColor: colors.gainBg, borderColor: colors.gainBorder },
  changeBadgeLoss: { backgroundColor: colors.lossBg, borderColor: colors.lossBorder },
  changeText: { fontSize: 13, fontFamily: fonts.mono, fontWeight: "700", letterSpacing: 0.5 },
  tickerLabel: { fontSize: 11, fontFamily: fonts.mono, color: colors.textMuted, letterSpacing: 2, marginTop: spacing.sm },
  section: { marginTop: spacing.xxl },
  sectionHeaderWrap: { flexDirection: "row", alignItems: "center", marginBottom: spacing.md },
  sectionLabelWrap: { flexDirection: "row", alignItems: "center" },
  sectionDot: { width: 3, height: 3, backgroundColor: colors.accent, marginRight: spacing.sm },
  sectionLabel: { fontSize: 11, fontFamily: fonts.mono, color: colors.textMuted, letterSpacing: 3 },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: spacing.md },
  tabRow: { flexDirection: "row", paddingHorizontal: spacing.lg, marginBottom: spacing.md, gap: spacing.sm },
  tabBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.sm, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.glassBorder },
  tabBtnActive: { borderColor: colors.accent, backgroundColor: colors.accentSubtle },
  tabText: { fontSize: 10, fontFamily: fonts.mono, color: colors.textMuted, letterSpacing: 2 },
  tabTextActive: { color: colors.accent },
  collapseHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  filingItem: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  filingType: { fontSize: 13, fontFamily: fonts.mono, color: colors.textPrimary, fontWeight: "600" },
  filingDate: { fontSize: 12, fontFamily: fonts.mono, color: colors.textMuted },
  filingDetails: { backgroundColor: colors.bgCard, borderRadius: radius.sm, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.glassBorder },
  filingDetailRow: { marginBottom: spacing.xs },
  filingDetailText: { fontSize: 11, fontFamily: fonts.mono, color: colors.textSecondary, lineHeight: 18 },
  noData: { fontSize: 12, fontFamily: fonts.mono, color: colors.textMuted, textAlign: "center", paddingVertical: spacing.md },
  tradeItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  tradeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  tradeName: { fontSize: 13, color: colors.textPrimary, fontWeight: "600" },
  tradeType: { fontSize: 10, fontFamily: fonts.mono, fontWeight: "700", letterSpacing: 1 },
  tradeDetail: { fontSize: 12, fontFamily: fonts.mono, color: colors.textSecondary, marginTop: 2 },
  tradeDate: { fontSize: 11, fontFamily: fonts.mono, color: colors.textMuted, marginTop: 2 },
});
