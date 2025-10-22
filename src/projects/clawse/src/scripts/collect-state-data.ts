import dotenv from 'dotenv';
import { AIRuleGenerator } from '../services/AIRuleGenerator';
import { FirestoreService } from '../services/FirestoreService';
import { ComplianceRule } from '../types/ComplianceRule';

dotenv.config();

class StateDataCollector {
  private aiGenerator: AIRuleGenerator;
  private firestoreService: FirestoreService;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required');
    }
    
    this.aiGenerator = new AIRuleGenerator(process.env.OPENAI_API_KEY);
    this.firestoreService = new FirestoreService();
  }

  async collectStateData(state: string, count: number = 10): Promise<ComplianceRule[]> {
    console.log(`🏛️ Starting ${state} state data collection...`);
    const allRules: ComplianceRule[] = [];

    try {
      // Generate state-specific rules with AI
      console.log(`🤖 Generating ${count} ${state} state compliance rules...`);
      const stateRules = await this.aiGenerator.generateStateRules(state, count);
      allRules.push(...stateRules);

      // Generate industry-specific rules for common industries in the state
      const commonIndustries = this.getCommonIndustries(state);
      
      for (const industry of commonIndustries) {
        console.log(`🏭 Generating ${industry.name} industry rules for ${state}...`);
        const industryRules = await this.aiGenerator.generateIndustrySpecificRules(
          industry.name, 
          industry.naics, 
          3 // 3 rules per industry
        );
        
        // Update rules to be state-specific
        const stateSpecificRules = industryRules.map(rule => ({
          ...rule,
          level: 'state' as const,
          jurisdiction: state,
          applicability_criteria: {
            ...rule.applicability_criteria,
            states: [state]
          }
        }));
        
        allRules.push(...stateSpecificRules);
      }

      console.log(`✅ Total ${state} rules collected: ${allRules.length}`);
      return allRules;

    } catch (error) {
      console.error(`❌ Error in ${state} data collection:`, error);
      throw error;
    }
  }

  private getCommonIndustries(state: string): Array<{name: string, naics: string}> {
    const commonIndustries = [
      { name: 'Restaurant', naics: '722513' },
      { name: 'Retail Store', naics: '448140' },
      { name: 'Professional Services', naics: '541611' },
      { name: 'Construction', naics: '236220' }
    ];

    // Add state-specific industries
    const stateSpecific: {[key: string]: Array<{name: string, naics: string}>} = {
      'California': [
        { name: 'Technology Services', naics: '541511' },
        { name: 'Entertainment', naics: '711110' },
        { name: 'Agriculture', naics: '111998' }
      ],
      'Texas': [
        { name: 'Oil and Gas', naics: '211111' },
        { name: 'Manufacturing', naics: '311111' },
        { name: 'Transportation', naics: '484110' }
      ],
      'New York': [
        { name: 'Financial Services', naics: '522110' },
        { name: 'Real Estate', naics: '531210' },
        { name: 'Media', naics: '515120' }
      ],
      'Florida': [
        { name: 'Tourism', naics: '721110' },
        { name: 'Healthcare', naics: '621111' },
        { name: 'International Trade', naics: '488510' }
      ]
    };

    return [...commonIndustries, ...(stateSpecific[state] || [])];
  }

  async storeRules(rules: ComplianceRule[]): Promise<void> {
    console.log(`💾 Storing ${rules.length} state rules in Firestore...`);
    
    try {
      await this.firestoreService.storeRules(rules);
      console.log(`✅ Successfully stored all ${rules.length} state rules`);
    } catch (error) {
      console.error(`❌ Error storing state rules:`, error);
      throw error;
    }
  }
}

// Main execution
async function main() {
  try {
    const args = process.argv.slice(2);
    const stateArg = args.find(arg => arg.startsWith('--state='));
    const countArg = args.find(arg => arg.startsWith('--count='));
    
    const state = stateArg ? stateArg.split('=')[1] : 'California';
    const count = countArg ? parseInt(countArg.split('=')[1]) : 10;

    console.log(`🎯 Collecting data for: ${state}`);
    console.log(`📊 Target rule count: ${count}`);

    const collector = new StateDataCollector();
    
    // Collect state-specific data
    const rules = await collector.collectStateData(state, count);
    
    if (rules.length > 0) {
      // Store in Firestore
      await collector.storeRules(rules);
      
      console.log(`🎉 Successfully collected and stored ${rules.length} ${state} compliance rules!`);
      
      // Show summary
      const summary = {
        state,
        totalRules: rules.length,
        byLevel: rules.reduce((acc, rule) => {
          acc[rule.level] = (acc[rule.level] || 0) + 1;
          return acc;
        }, {} as {[key: string]: number}),
        byPriority: rules.reduce((acc, rule) => {
          acc[rule.priority] = (acc[rule.priority] || 0) + 1;
          return acc;
        }, {} as {[key: string]: number})
      };
      
      console.log('\n📋 COLLECTION SUMMARY:');
      console.log('======================');
      console.log(`State: ${summary.state}`);
      console.log(`Total Rules: ${summary.totalRules}`);
      console.log(`By Level:`, summary.byLevel);
      console.log(`By Priority:`, summary.byPriority);
      
    } else {
      console.log('⚠️  No rules collected');
    }
    
  } catch (error) {
    console.error('❌ Fatal error in state data collection:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { StateDataCollector };
