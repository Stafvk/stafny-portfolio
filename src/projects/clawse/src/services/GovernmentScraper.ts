import axios from 'axios';
import * as cheerio from 'cheerio';
import { ComplianceRule } from '../types/ComplianceRule';
import { FirestoreService } from './FirestoreService';
import { AIRuleGenerator } from './AIRuleGenerator';
import crypto from 'crypto';

interface ScrapingTarget {
  name: string;
  baseUrl: string;
  level: 'federal' | 'state' | 'local';
  authority: string;
  selectors: {
    ruleLinks: string;
    title: string;
    content: string;
    description?: string;
  };
  rateLimit: number; // milliseconds between requests
}

interface RawScrapedRule {
  title: string;
  content: string;
  description?: string;
  sourceUrl: string;
  authority: string;
  level: 'federal' | 'state' | 'local';
  scrapedAt: string;
}

export class GovernmentScraper {
  private firestoreService: FirestoreService;
  private aiGenerator: AIRuleGenerator;
  
  // Government websites to scrape
  private scrapingTargets: ScrapingTarget[] = [
    {
      name: 'SBA.gov Business Guide',
      baseUrl: 'https://www.sba.gov',
      level: 'federal',
      authority: 'Small Business Administration',
      selectors: {
        ruleLinks: 'a[href*="/business-guide/"]',
        title: 'h1, .page-title',
        content: '.content, .main-content, article'
      },
      rateLimit: 2000
    },
    {
      name: 'IRS Business Tax Requirements',
      baseUrl: 'https://www.irs.gov',
      level: 'federal', 
      authority: 'Internal Revenue Service',
      selectors: {
        ruleLinks: 'a[href*="/businesses/"]',
        title: 'h1, .page-title',
        content: '.content, .field-items'
      },
      rateLimit: 3000
    },
    {
      name: 'DOL Employment Laws',
      baseUrl: 'https://www.dol.gov',
      level: 'federal',
      authority: 'Department of Labor', 
      selectors: {
        ruleLinks: 'a[href*="/compliance/"]',
        title: 'h1, .page-title',
        content: '.content, .main-content'
      },
      rateLimit: 2500
    }
  ];

  constructor(openaiApiKey: string) {
    this.firestoreService = new FirestoreService();
    this.aiGenerator = new AIRuleGenerator(openaiApiKey);
  }

  /**
   * Main method to scrape all government websites and store rules
   */
  async scrapeAndStoreRules(maxRulesPerSite: number = 50): Promise<void> {
    console.log('🕷️ Starting government website scraping...');
    
    for (const target of this.scrapingTargets) {
      try {
        console.log(`\n📡 Scraping ${target.name}...`);
        
        // Step 1: Discover rule URLs
        const ruleUrls = await this.discoverRuleUrls(target, maxRulesPerSite);
        console.log(`🔍 Found ${ruleUrls.length} potential rule URLs`);
        
        // Step 2: Scrape individual rules
        const rawRules = await this.scrapeRules(target, ruleUrls);
        console.log(`📄 Scraped ${rawRules.length} raw rules`);
        
        // Step 3: Process with AI and check for duplicates
        const processedRules = await this.processAndDeduplicateRules(rawRules);
        console.log(`✨ Processed ${processedRules.length} new unique rules`);
        
        // Step 4: Store in Firebase
        if (processedRules.length > 0) {
          await this.firestoreService.storeRules(processedRules);
          console.log(`✅ Stored ${processedRules.length} rules from ${target.name}`);
        }
        
      } catch (error) {
        console.error(`❌ Error scraping ${target.name}:`, error);
        continue; // Continue with next target
      }
    }
    
    console.log('🎉 Government scraping completed!');
  }

  /**
   * Discover URLs that contain compliance rules
   */
  private async discoverRuleUrls(target: ScrapingTarget, maxUrls: number): Promise<string[]> {
    const urls: Set<string> = new Set();
    
    try {
      // Start with main pages
      const startingPages = [
        `${target.baseUrl}/business-guide/`,
        `${target.baseUrl}/businesses/`,
        `${target.baseUrl}/compliance/`,
        `${target.baseUrl}/regulations/`
      ];
      
      for (const startPage of startingPages) {
        try {
          const response = await axios.get(startPage, {
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; ComplianceBot/1.0; +https://complianceai.com/bot)'
            }
          });
          
          const $ = cheerio.load(response.data);
          
          // Find links that match our selectors
          $(target.selectors.ruleLinks).each((_, element) => {
            const href = $(element).attr('href');
            if (href) {
              const fullUrl = href.startsWith('http') ? href : `${target.baseUrl}${href}`;
              urls.add(fullUrl);
            }
          });
          
          // Also look for general business/compliance links
          $('a').each((_, element) => {
            const href = $(element).attr('href');
            const text = $(element).text().toLowerCase();
            
            if (href && this.isRelevantLink(text, href)) {
              const fullUrl = href.startsWith('http') ? href : `${target.baseUrl}${href}`;
              urls.add(fullUrl);
            }
          });
          
        } catch (error) {
          console.log(`⚠️ Could not access ${startPage}: ${error.message}`);
        }
        
        // Rate limiting
        await this.sleep(target.rateLimit);
        
        if (urls.size >= maxUrls) break;
      }
      
    } catch (error) {
      console.error(`Error discovering URLs for ${target.name}:`, error);
    }
    
    return Array.from(urls).slice(0, maxUrls);
  }

  /**
   * Check if a link is relevant for compliance rules
   */
  private isRelevantLink(text: string, href: string): boolean {
    const relevantKeywords = [
      'business', 'compliance', 'regulation', 'requirement', 'license', 'permit',
      'tax', 'employment', 'labor', 'safety', 'environmental', 'registration',
      'filing', 'report', 'form', 'application', 'startup', 'small business'
    ];
    
    const relevantPaths = [
      '/business', '/compliance', '/regulation', '/requirement', '/license',
      '/permit', '/tax', '/employment', '/labor', '/safety', '/filing'
    ];
    
    return relevantKeywords.some(keyword => text.includes(keyword)) ||
           relevantPaths.some(path => href.includes(path));
  }

  /**
   * Scrape individual rule pages
   */
  private async scrapeRules(target: ScrapingTarget, urls: string[]): Promise<RawScrapedRule[]> {
    const rules: RawScrapedRule[] = [];
    
    for (const url of urls) {
      try {
        console.log(`📄 Scraping: ${url}`);
        
        const response = await axios.get(url, {
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; ComplianceBot/1.0; +https://complianceai.com/bot)'
          }
        });
        
        const $ = cheerio.load(response.data);
        
        // Extract title
        const title = $(target.selectors.title).first().text().trim();
        if (!title) continue;
        
        // Extract main content
        const content = $(target.selectors.content).first().text().trim();
        if (!content || content.length < 100) continue; // Skip if too short
        
        // Extract description if selector provided
        const description = target.selectors.description ? 
          $(target.selectors.description).first().text().trim() : '';
        
        // Only include if it looks like a compliance rule
        if (this.isComplianceContent(title, content)) {
          rules.push({
            title,
            content,
            description,
            sourceUrl: url,
            authority: target.authority,
            level: target.level,
            scrapedAt: new Date().toISOString()
          });
        }
        
      } catch (error) {
        console.log(`⚠️ Error scraping ${url}: ${error.message}`);
      }
      
      // Rate limiting
      await this.sleep(target.rateLimit);
    }
    
    return rules;
  }

  /**
   * Check if content appears to be about compliance
   */
  private isComplianceContent(title: string, content: string): boolean {
    const complianceIndicators = [
      'must', 'required', 'shall', 'obligation', 'compliance', 'regulation',
      'license', 'permit', 'registration', 'filing', 'deadline', 'penalty',
      'violation', 'requirement', 'mandatory', 'law', 'statute', 'rule'
    ];
    
    const text = (title + ' ' + content).toLowerCase();
    const indicatorCount = complianceIndicators.filter(indicator => 
      text.includes(indicator)
    ).length;
    
    return indicatorCount >= 3; // Must have at least 3 compliance indicators
  }

  /**
   * Process raw rules with AI and check for duplicates using existing system
   */
  private async processAndDeduplicateRules(rawRules: RawScrapedRule[]): Promise<ComplianceRule[]> {
    const newRules: ComplianceRule[] = [];
    
    for (const rawRule of rawRules) {
      try {
        // Generate canonical ID using existing method
        const canonicalId = this.generateCanonicalId(rawRule);
        
        // Check if rule already exists
        const existingRule = await this.checkForExistingRule(canonicalId);
        
        if (existingRule) {
          console.log(`⚠️ Duplicate found: ${rawRule.title} (skipping)`);
          continue;
        }
        
        // Process with AI to structure the rule
        const structuredRule = await this.aiGenerator.processScrapedRule(rawRule);
        
        if (structuredRule) {
          newRules.push(structuredRule);
          console.log(`✨ Processed: ${rawRule.title}`);
        }
        
      } catch (error) {
        console.error(`❌ Error processing rule "${rawRule.title}":`, error);
      }
    }
    
    return newRules;
  }

  /**
   * Generate canonical ID for deduplication (matches existing system)
   */
  private generateCanonicalId(rawRule: RawScrapedRule): string {
    const hashInput = [
      rawRule.title.toLowerCase().trim(),
      rawRule.authority.toLowerCase(),
      rawRule.level,
      rawRule.sourceUrl
    ].join('|');
    
    return crypto.createHash('md5').update(hashInput).digest('hex');
  }

  /**
   * Check if rule already exists in deduplication index
   */
  private async checkForExistingRule(canonicalId: string): Promise<boolean> {
    try {
      const dedupeDoc = await this.firestoreService.db
        .collection('rule_deduplication')
        .doc(canonicalId)
        .get();
      
      return dedupeDoc.exists;
    } catch (error) {
      console.error('Error checking for existing rule:', error);
      return false;
    }
  }

  /**
   * Utility method for rate limiting
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
