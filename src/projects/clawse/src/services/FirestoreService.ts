import { getFirestore, FieldValue } from '../config/firebase';
import { ComplianceRule, BusinessProfile } from '../types/ComplianceRule';
import admin from 'firebase-admin';

export class FirestoreService {
  private db: admin.firestore.Firestore;
  
  constructor() {
    this.db = getFirestore();
  }
  
  // ==================== COMPLIANCE RULES ====================
  
  async storeRules(rules: ComplianceRule[]): Promise<void> {
    console.log(`💾 Storing ${rules.length} rules in Firestore...`);
    
    const batchSize = 500; // Firestore batch limit
    
    for (let i = 0; i < rules.length; i += batchSize) {
      const batch = rules.slice(i, i + batchSize);
      const firestoreBatch = this.db.batch();
      
      for (const rule of batch) {
        const ruleRef = this.db.collection('compliance_rules').doc(rule.id);
        firestoreBatch.set(ruleRef, {
          ...rule,
          created_at: FieldValue.serverTimestamp(),
          updated_at: FieldValue.serverTimestamp()
        });
        
        // Update deduplication index
        const dedupeRef = this.db.collection('rule_deduplication').doc(rule.canonical_id);
        firestoreBatch.set(dedupeRef, {
          canonical_id: rule.canonical_id,
          source_rules: FieldValue.arrayUnion({
            rule_id: rule.id,
            source_id: rule.sources[0]?.source_id || 'unknown',
            source_url: rule.sources[0]?.source_url || '',
            confidence_score: 1.0,
            last_seen: new Date().toISOString()
          }),
          master_rule_id: rule.id,
          updated_at: FieldValue.serverTimestamp()
        }, { merge: true });
      }
      
      await firestoreBatch.commit();
      console.log(`✅ Stored batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(rules.length/batchSize)}`);
    }
    
    console.log(`✅ Successfully stored ${rules.length} rules in Firestore`);
  }
  
  async getRules(limit: number = 10): Promise<ComplianceRule[]> {
    const snapshot = await this.db
      .collection('compliance_rules')
      .where('status', '==', 'active')
      .orderBy('priority')
      .orderBy('created_at', 'desc')
      .limit(limit)
      .get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ComplianceRule));
  }
  
  async getRuleById(ruleId: string): Promise<ComplianceRule | null> {
    const doc = await this.db.collection('compliance_rules').doc(ruleId).get();
    
    if (!doc.exists) {
      return null;
    }
    
    return {
      id: doc.id,
      ...doc.data()
    } as ComplianceRule;
  }
  
  async searchRules(businessType: string, state: string, limit: number = 20): Promise<ComplianceRule[]> {
    // Split into multiple queries to avoid multiple array-contains filters
    const businessTypeQuery = this.db
      .collection('compliance_rules')
      .where('applicability_criteria.business_types', 'array-contains', businessType)
      .where('status', '==', 'active')
      .limit(limit * 2); // Get more to filter by state later

    const snapshot = await businessTypeQuery.get();
    const allRules = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ComplianceRule));

    // Filter by state in memory
    const filteredRules = allRules.filter(rule =>
      rule.applicability_criteria?.states?.includes(state) ||
      rule.applicability_criteria?.states?.includes('ALL')
    );

    // Sort by priority and limit
    return this.sortRulesByPriority(filteredRules).slice(0, limit);
  }
  
  async getMatchingRules(businessProfile: BusinessProfile): Promise<ComplianceRule[]> {
    const matchingRules: ComplianceRule[] = [];

    // Primary query - business type only (avoid multiple array-contains)
    const primaryQuery = this.db.collection('compliance_rules')
      .where('applicability_criteria.business_types', 'array-contains', businessProfile.business_type)
      .where('status', '==', 'active')
      .limit(200); // Get more to filter by state later

    const primaryResults = await primaryQuery.get();
    
    // Filter by state, employee count and revenue (client-side filtering due to Firestore limitations)
    const filteredResults = primaryResults.docs.filter(doc => {
      const rule = doc.data() as ComplianceRule;
      const criteria = rule.applicability_criteria;

      // State check (added to avoid multiple array-contains in query)
      const stateMatch = criteria.states?.includes(businessProfile.headquarters_state) ||
                        criteria.states?.includes('ALL');

      // Employee count check
      const employeeMatch = criteria.employee_count.min <= businessProfile.employee_count &&
                           criteria.employee_count.max >= businessProfile.employee_count;

      // Revenue check
      const revenueMatch = criteria.annual_revenue.min <= businessProfile.annual_revenue &&
                          criteria.annual_revenue.max >= businessProfile.annual_revenue;

      // Industry check
      const industryMatch = criteria.industries.length === 0 ||
                           criteria.industries.includes('ALL') ||
                           criteria.industries.includes(businessProfile.primary_industry) ||
                           businessProfile.secondary_industries.some(ind => criteria.industries.includes(ind));

      // Special conditions check
      const specialConditionsMatch = this.checkSpecialConditions(criteria.special_conditions, businessProfile);

      return stateMatch && employeeMatch && revenueMatch && industryMatch && specialConditionsMatch;
    });
    
    // Convert to ComplianceRule objects
    filteredResults.forEach(doc => {
      matchingRules.push({
        id: doc.id,
        ...doc.data()
      } as ComplianceRule);
    });
    
    // Secondary query for industry-specific rules
    if (businessProfile.primary_industry && businessProfile.primary_industry !== 'ALL') {
      const industryQuery = this.db.collection('compliance_rules')
        .where('applicability_criteria.industries', 'array-contains', businessProfile.primary_industry)
        .where('status', '==', 'active')
        .limit(50);
      
      const industryResults = await industryQuery.get();
      
      // Add industry-specific rules (avoiding duplicates)
      industryResults.docs.forEach(doc => {
        const ruleId = doc.id;
        if (!matchingRules.find(rule => rule.id === ruleId)) {
          matchingRules.push({
            id: ruleId,
            ...doc.data()
          } as ComplianceRule);
        }
      });
    }
    
    // Sort by priority
    return this.sortRulesByPriority(matchingRules);
  }
  
  private checkSpecialConditions(conditions: string[], profile: BusinessProfile): boolean {
    if (!conditions || conditions.length === 0) return true;

    const profileConditions: string[] = [];
    if (profile.has_employees) profileConditions.push('has_employees');
    if (profile.handles_personal_data) profileConditions.push('handles_personal_data');
    if (profile.has_physical_location) profileConditions.push('has_physical_location');
    if (profile.sells_online) profileConditions.push('sells_online');
    if (profile.interstate_commerce) profileConditions.push('interstate_commerce');
    if (profile.processes_payments) profileConditions.push('processes_payments');
    
    return conditions.some(condition => profileConditions.includes(condition));
  }
  
  private sortRulesByPriority(rules: ComplianceRule[]): ComplianceRule[] {
    const priorityOrder = { 'critical': 1, 'high': 2, 'medium': 3, 'low': 4 };
    
    return rules.sort((a, b) => {
      const aPriority = priorityOrder[a.priority] || 5;
      const bPriority = priorityOrder[b.priority] || 5;
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      // Secondary sort by level (federal first)
      const levelOrder = { 'federal': 1, 'state': 2, 'local': 3 };
      const aLevel = levelOrder[a.level] || 4;
      const bLevel = levelOrder[b.level] || 4;
      
      return aLevel - bLevel;
    });
  }
  
  // ==================== BUSINESS PROFILES ====================
  
  async storeBusinessProfile(profile: BusinessProfile): Promise<void> {
    const profileRef = this.db.collection('business_profiles').doc(profile.session_id);
    await profileRef.set({
      ...profile,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp()
    });
    
    console.log(`✅ Stored business profile: ${profile.business_name}`);
  }
  
  async getBusinessProfile(sessionId: string): Promise<BusinessProfile | null> {
    const doc = await this.db.collection('business_profiles').doc(sessionId).get();
    
    if (!doc.exists) {
      return null;
    }
    
    return doc.data() as BusinessProfile;
  }
  
  // ==================== UTILITY METHODS ====================
  
  async clearTestData(): Promise<void> {
    console.log('🧹 Clearing test data...');
    
    // Clear compliance rules
    const rulesSnapshot = await this.db.collection('compliance_rules').get();
    const rulesBatch = this.db.batch();
    rulesSnapshot.docs.forEach(doc => {
      rulesBatch.delete(doc.ref);
    });
    await rulesBatch.commit();
    
    // Clear deduplication index
    const dedupeSnapshot = await this.db.collection('rule_deduplication').get();
    const dedupeBatch = this.db.batch();
    dedupeSnapshot.docs.forEach(doc => {
      dedupeBatch.delete(doc.ref);
    });
    await dedupeBatch.commit();
    
    // Clear business profiles
    const profilesSnapshot = await this.db.collection('business_profiles').get();
    const profilesBatch = this.db.batch();
    profilesSnapshot.docs.forEach(doc => {
      profilesBatch.delete(doc.ref);
    });
    await profilesBatch.commit();
    
    console.log('✅ Test data cleared successfully');
  }
  
  async getCollectionStats(): Promise<{[key: string]: number}> {
    const stats: {[key: string]: number} = {};
    
    const collections = ['compliance_rules', 'business_profiles', 'rule_deduplication'];
    
    for (const collection of collections) {
      const snapshot = await this.db.collection(collection).get();
      stats[collection] = snapshot.size;
    }
    
    return stats;
  }
}
