import dotenv from 'dotenv';
import axios from 'axios';
import { AIRuleGenerator } from '../services/AIRuleGenerator';
import { FirestoreService } from '../services/FirestoreService';
import { ComplianceRule } from '../types/ComplianceRule';
import crypto from 'crypto';

dotenv.config();

interface RawComplianceRule {
  title: string;
  content: string;
  authority: string;
  level: 'federal' | 'state' | 'local';
  source: {
    source_id: string;
    source_type: 'api' | 'website' | 'pdf' | 'manual' | 'ai_generated';
    source_name: string;
    source_url: string;
    external_id?: string;
    reliability_score: number;
    last_updated: string;
    verification_status: 'verified' | 'pending' | 'outdated';
    content_hash: string;
  };
}

class FederalDataCollector {
  private aiGenerator: AIRuleGenerator;
  private firestoreService: FirestoreService;
  private regulationsApiKey: string;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required');
    }
    
    this.aiGenerator = new AIRuleGenerator(process.env.OPENAI_API_KEY);
    this.firestoreService = new FirestoreService();
    this.regulationsApiKey = process.env.REGULATIONS_API_KEY || '';
  }

  async collectAllFederalData(): Promise<ComplianceRule[]> {
    console.log('🚀 Starting federal data collection...');
    const allRules: ComplianceRule[] = [];

    try {
      // Phase 1: Collect from Regulations.gov
      if (this.regulationsApiKey) {
        console.log('📋 Collecting from Regulations.gov...');
        const regulationsData = await this.collectRegulationsGovData();
        const processedRegulations = await this.processRawRules(regulationsData);
        allRules.push(...processedRegulations);
      } else {
        console.log('⚠️  No Regulations.gov API key found, skipping...');
      }

      // Phase 2: Collect from SBA API (no key required)
      console.log('🏢 Collecting from SBA API...');
      const sbaData = await this.collectSBAData();
      const processedSBA = await this.processRawRules(sbaData);
      allRules.push(...processedSBA);

      // Phase 3: Generate AI-based federal rules as fallback/supplement
      console.log('🤖 Generating AI-based federal rules...');
      const aiRules = await this.aiGenerator.generateFederalRules(10);
      allRules.push(...aiRules);

      console.log(`✅ Total rules collected: ${allRules.length}`);
      return allRules;

    } catch (error) {
      console.error('❌ Error in federal data collection:', error);
      throw error;
    }
  }

  private async collectRegulationsGovData(): Promise<RawComplianceRule[]> {
    const businessTerms = [
      'small business registration',
      'business tax requirements',
      'employment compliance',
      'workplace safety',
      'business licensing'
    ];

    const rawRules: RawComplianceRule[] = [];

    for (const term of businessTerms) {
      try {
        console.log(`🔍 Searching for: ${term}`);
        
        const response = await axios.get('https://api.regulations.gov/v4/documents', {
          params: {
            'filter[searchTerm]': term,
            'filter[documentType]': 'Rule',
            'page[size]': 5, // Limit for testing
            'sort': '-postedDate'
          },
          headers: {
            'X-Api-Key': this.regulationsApiKey
          }
        });

        const documents = response.data.data || [];
        
        for (const doc of documents) {
          const rawRule: RawComplianceRule = {
            title: doc.attributes.title || 'Untitled Rule',
            content: doc.attributes.summary || doc.attributes.title || '',
            authority: doc.attributes.agencyId || 'Federal Agency',
            level: 'federal',
            source: {
              source_id: 'regulations_gov',
              source_type: 'api',
              source_name: 'Regulations.gov',
              source_url: `https://www.regulations.gov/document/${doc.id}`,
              external_id: doc.id,
              reliability_score: 10,
              last_updated: new Date().toISOString(),
              verification_status: 'verified',
              content_hash: crypto.createHash('md5').update(doc.attributes.summary || doc.attributes.title || '').digest('hex')
            }
          };

          rawRules.push(rawRule);
        }

        // Respect rate limits
        await this.delay(200);

      } catch (error) {
        console.error(`❌ Error searching for "${term}":`, error);
        continue; // Continue with other terms
      }
    }

    return rawRules;
  }

  private async collectSBAData(): Promise<RawComplianceRule[]> {
    const rawRules: RawComplianceRule[] = [];

    try {
      // SBA API endpoint for business resources
      const response = await axios.get('https://api.sba.gov/v1/resources', {
        params: {
          category: 'compliance',
          limit: 10
        }
      });

      const resources = response.data.resources || [];

      for (const resource of resources) {
        const rawRule: RawComplianceRule = {
          title: resource.title || 'SBA Business Requirement',
          content: resource.description || resource.summary || '',
          authority: 'Small Business Administration',
          level: 'federal',
          source: {
            source_id: 'sba_api',
            source_type: 'api',
            source_name: 'SBA API',
            source_url: resource.url || 'https://sba.gov',
            external_id: resource.id?.toString(),
            reliability_score: 9,
            last_updated: new Date().toISOString(),
            verification_status: 'verified',
            content_hash: crypto.createHash('md5').update(resource.description || resource.summary || '').digest('hex')
          }
        };

        rawRules.push(rawRule);
      }

    } catch (error) {
      console.error('❌ Error collecting SBA data:', error);
      // Return empty array instead of throwing to continue with other sources
    }

    return rawRules;
  }

  private async processRawRules(rawRules: RawComplianceRule[]): Promise<ComplianceRule[]> {
    if (rawRules.length === 0) return [];

    console.log(`🔄 Processing ${rawRules.length} raw rules with AI...`);
    
    // Convert raw rules to a format the AI can process
    const prompt = this.createProcessingPrompt(rawRules);
    
    try {
      // Use the AI generator to structure the raw data
      const processedRules = await this.aiGenerator.generateFederalRules(rawRules.length);
      
      // Enhance with source information from raw rules
      return processedRules.map((rule, index) => {
        const rawRule = rawRules[index];
        if (rawRule) {
          return {
            ...rule,
            sources: [rawRule.source],
            title: rawRule.title || rule.title,
            authority: rawRule.authority || rule.authority
          };
        }
        return rule;
      });

    } catch (error) {
      console.error('❌ Error processing raw rules:', error);
      return [];
    }
  }

  private createProcessingPrompt(rawRules: RawComplianceRule[]): string {
    return `
Process these federal compliance requirements into structured format:

${rawRules.map((rule, i) => `
${i + 1}. Title: ${rule.title}
   Authority: ${rule.authority}
   Content: ${rule.content}
   Source: ${rule.source.source_name}
`).join('\n')}

Convert each into proper compliance rule format with steps, costs, and applicability criteria.
`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async storeRules(rules: ComplianceRule[]): Promise<void> {
    console.log(`💾 Storing ${rules.length} rules in Firestore...`);

    try {
      await this.firestoreService.storeRules(rules);
      console.log(`✅ Successfully stored all ${rules.length} rules`);
    } catch (error) {
      console.error(`❌ Error storing rules:`, error);
      throw error;
    }
  }
}

// Main execution
async function main() {
  try {
    const collector = new FederalDataCollector();
    
    // Collect all federal data
    const rules = await collector.collectAllFederalData();
    
    if (rules.length > 0) {
      // Store in Firestore
      await collector.storeRules(rules);
      
      console.log(`🎉 Successfully collected and stored ${rules.length} federal compliance rules!`);
    } else {
      console.log('⚠️  No rules collected');
    }
    
  } catch (error) {
    console.error('❌ Fatal error in data collection:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { FederalDataCollector };
