import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { subscriptionsApi } from '../services/api';

interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: string;
  features: string[];
}

/**
 * Paywall Screen - Subscription plan selection
 * Shown when free users try to access Pro/Premium features.
 * Integrates with RevenueCat for Apple IAP / Google Play Billing.
 */
export function PaywallScreen() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>('pro');

  useEffect(() => {
    subscriptionsApi.getPlans().then((result) => {
      setPlans(result.plans);
    });
  }, []);

  const handleSubscribe = async () => {
    // TODO: Integrate with RevenueCat
    // import Purchases from 'react-native-purchases';
    // const { customerInfo } = await Purchases.purchasePackage(selectedPackage);
    console.log('Subscribe to:', selectedPlan);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Upgrade dein Erlebnis</Text>
        <Text style={styles.subtitle}>
          Erhalte Zugang zu allen KI-Vorhersagen und Value Bets
        </Text>
      </View>

      {plans.filter(p => p.id !== 'free').map((plan) => (
        <TouchableOpacity
          key={plan.id}
          style={[
            styles.planCard,
            selectedPlan === plan.id && styles.planCardSelected,
          ]}
          onPress={() => setSelectedPlan(plan.id)}
        >
          {plan.id === 'premium' && (
            <View style={styles.popularBadge}>
              <Text style={styles.popularText}>Beliebt</Text>
            </View>
          )}

          <View style={styles.planHeader}>
            <Text style={styles.planName}>{plan.name}</Text>
            <View style={styles.priceContainer}>
              <Text style={styles.price}>{plan.price.toFixed(2)}{plan.currency === 'EUR' ? '€' : '$'}</Text>
              <Text style={styles.interval}>/Monat</Text>
            </View>
          </View>

          <View style={styles.featuresList}>
            {plan.features.map((feature, index) => (
              <View key={index} style={styles.featureRow}>
                <Text style={styles.checkmark}>✓</Text>
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        </TouchableOpacity>
      ))}

      <TouchableOpacity style={styles.subscribeButton} onPress={handleSubscribe}>
        <Text style={styles.subscribeText}>
          Jetzt abonnieren
        </Text>
      </TouchableOpacity>

      <Text style={styles.terms}>
        Abonnement verlängert sich automatisch. Jederzeit kündbar.
        Es gelten unsere AGB und Datenschutzrichtlinie.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f23' },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 24, alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: '#ffffff', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#8888aa', marginTop: 8, textAlign: 'center' },
  planCard: {
    marginHorizontal: 20, marginBottom: 12, borderRadius: 12, padding: 20,
    backgroundColor: '#1a1a2e', borderWidth: 2, borderColor: '#2a2a4e',
  },
  planCardSelected: { borderColor: '#4444ff' },
  popularBadge: {
    position: 'absolute', top: -10, right: 16,
    backgroundColor: '#f59e0b', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8,
  },
  popularText: { fontSize: 12, fontWeight: '700', color: '#000000' },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  planName: { fontSize: 20, fontWeight: '700', color: '#ffffff' },
  priceContainer: { flexDirection: 'row', alignItems: 'baseline' },
  price: { fontSize: 28, fontWeight: '700', color: '#4444ff' },
  interval: { fontSize: 14, color: '#8888aa', marginLeft: 2 },
  featuresList: { gap: 8 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkmark: { color: '#22c55e', fontSize: 16, fontWeight: '700' },
  featureText: { color: '#ccccdd', fontSize: 14 },
  subscribeButton: {
    marginHorizontal: 20, marginTop: 16, marginBottom: 12,
    backgroundColor: '#4444ff', borderRadius: 12, padding: 16, alignItems: 'center',
  },
  subscribeText: { fontSize: 18, fontWeight: '700', color: '#ffffff' },
  terms: {
    textAlign: 'center', color: '#555577', fontSize: 11,
    paddingHorizontal: 40, marginBottom: 40, lineHeight: 16,
  },
});
