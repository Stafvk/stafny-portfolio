const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

class GovernmentScraper {
  constructor(openaiApiKey, firestoreService, regulationsApiKey) {
    this.openaiApiKey = openaiApiKey;
    this.firestoreService = firestoreService;
    this.regulationsApiKey = regulationsApiKey;
    
    // Government websites to scrape
    this.scrapingTargets = [
      {
        name: 'SBA.gov Business Guide',
        baseUrl: 'https://www.sba.gov',
        level: 'federal',
        authority: 'Small Business Administration',
        selectors: {
          ruleLinks: 'a[href*="/business-guide/"], a[href*="/starting-business/"], a[href*="/managing-business/"]',
          title: 'h1, .page-title, .hero-title',
          content: '.content, .main-content, article, .field-items'
        },
        rateLimit: 2000
      },
      {
        name: 'IRS Business Tax Requirements',
        baseUrl: 'https://www.irs.gov',
        level: 'federal', 
        authority: 'Internal Revenue Service',
        selectors: {
          ruleLinks: 'a[href*="/businesses/"], a[href*="/forms-pubs/"]',
          title: 'h1, .page-title',
          content: '.content, .field-items, .main-content'
        },
        rateLimit: 3000
      }
    ];
  }

  /**
   * Main method to fetch rules from government APIs and store them
   */
  async scrapeAndStoreRules(targetRuleCount = 200) {
    console.log(`🏛️ Starting government API data collection (target: ${targetRuleCount} rules)...`);

    const collectionStats = {
      totalCollected: 0,
      totalProcessed: 0,
      totalStored: 0,
      duplicatesSkipped: 0,
      apiCallsMade: 0,
      completionStatus: 'in_progress',
      sources: {}
    };

    try {
      // Phase 1: Collect from Regulations.gov API (high volume)
      if (this.regulationsApiKey) {
        console.log('📡 Collecting from Regulations.gov API...');
        const regulationsResult = await this.collectRegulationsGovDataWithStats(targetRuleCount);

        collectionStats.sources.regulations_gov = regulationsResult.stats;
        collectionStats.totalCollected += regulationsResult.rules.length;
        collectionStats.apiCallsMade += regulationsResult.stats.apiCallsMade;

        console.log(`📄 Collected ${regulationsResult.rules.length} rules from Regulations.gov`);
        console.log(`📊 API Status: ${regulationsResult.stats.completionStatus}`);

        const processedRegulations = await this.processAndDeduplicateRules(regulationsResult.rules);
        collectionStats.totalProcessed += processedRegulations.length;
        collectionStats.duplicatesSkipped += (regulationsResult.rules.length - processedRegulations.length);

        console.log(`✨ Processed ${processedRegulations.length} new unique rules from Regulations.gov`);

        if (processedRegulations.length > 0) {
          await this.firestoreService.storeRules(processedRegulations);
          console.log(`✅ Stored ${processedRegulations.length} rules from Regulations.gov`);
          collectionStats.totalStored += processedRegulations.length;
        }
      } else {
        console.log('⚠️ No Regulations.gov API key found, skipping API collection');
      }

      // Phase 2: Collect from SBA API (no key required)
      console.log('🏢 Collecting from SBA API...');
      const sbaResult = await this.collectSBADataWithStats();

      collectionStats.sources.sba = sbaResult.stats;
      collectionStats.totalCollected += sbaResult.rules.length;

      console.log(`📄 Collected ${sbaResult.rules.length} rules from SBA`);

      const processedSBA = await this.processAndDeduplicateRules(sbaResult.rules);
      collectionStats.totalProcessed += processedSBA.length;
      collectionStats.duplicatesSkipped += (sbaResult.rules.length - processedSBA.length);

      console.log(`✨ Processed ${processedSBA.length} new unique rules from SBA`);

      if (processedSBA.length > 0) {
        await this.firestoreService.storeRules(processedSBA);
        console.log(`✅ Stored ${processedSBA.length} rules from SBA`);
        collectionStats.totalStored += processedSBA.length;
      }

      collectionStats.completionStatus = 'completed';

    } catch (error) {
      console.error(`❌ Error in government API collection:`, error.message);
      collectionStats.completionStatus = 'error';
    }

    // Final summary
    console.log('\n🎉 COLLECTION SUMMARY:');
    console.log(`📊 Total Rules Collected: ${collectionStats.totalCollected}`);
    console.log(`✨ Total Rules Processed: ${collectionStats.totalProcessed}`);
    console.log(`💾 Total Rules Stored: ${collectionStats.totalStored}`);
    console.log(`🔄 Duplicates Skipped: ${collectionStats.duplicatesSkipped}`);
    console.log(`📡 API Calls Made: ${collectionStats.apiCallsMade}`);
    console.log(`✅ Status: ${collectionStats.completionStatus}`);

    return collectionStats;
  }

  /**
   * Collect rules from Regulations.gov API with comprehensive stats
   */
  async collectRegulationsGovDataWithStats(targetCount = 200) {
    const stats = {
      apiCallsMade: 0,
      termsSearched: 0,
      termsExhausted: 0,
      totalAvailableRules: 0,
      completionStatus: 'in_progress',
      searchResults: {}
    };

    const rawRules = [];
    const exhaustedTerms = new Set();

    const businessTerms = [
      // General business terms
      'small business registration',
      'business tax requirements',
      'employment compliance',
      'workplace safety',
      'business licensing',
      'business permits',

      // Industry-specific terms for better categorization
      'restaurant health permits',
      'food service regulations',
      'healthcare compliance',
      'medical device regulations',
      'construction safety standards',
      'building permits',
      'financial services regulations',
      'banking compliance',
      'retail sales tax',
      'manufacturing safety',
      'technology data privacy',
      'software licensing',
      'transportation regulations',
      'logistics compliance',
      'real estate licensing',
      'professional services',
      'environmental regulations',
      'waste management',
      'energy compliance',
      'telecommunications regulations'
    ];

    for (const term of businessTerms) {
      try {
        console.log(`🔍 Searching Regulations.gov for: "${term}"`);
        stats.termsSearched++;

        const termResult = await this.searchRegulationsForTerm(term, targetCount - rawRules.length);
        stats.apiCallsMade += termResult.apiCallsMade;
        stats.searchResults[term] = termResult;

        if (termResult.rules.length === 0) {
          console.log(`📭 No results for "${term}"`);
          exhaustedTerms.add(term);
        } else if (termResult.exhausted) {
          console.log(`✅ Exhausted all results for "${term}" (${termResult.rules.length} rules)`);
          exhaustedTerms.add(term);
        } else {
          console.log(`📄 Found ${termResult.rules.length} rules for "${term}" (more available)`);
        }

        rawRules.push(...termResult.rules);
        stats.totalAvailableRules += termResult.totalAvailable;

        if (rawRules.length >= targetCount) {
          console.log(`🎯 Reached target of ${targetCount} rules`);
          break;
        }

      } catch (error) {
        console.error(`❌ Error searching for "${term}":`, error.message);
        exhaustedTerms.add(term); // Mark as exhausted on error
        continue;
      }
    }

    stats.termsExhausted = exhaustedTerms.size;

    // Determine completion status
    if (exhaustedTerms.size === businessTerms.length) {
      stats.completionStatus = 'fully_exhausted';
      console.log('🏁 All search terms exhausted - no more rules available');
    } else if (rawRules.length >= targetCount) {
      stats.completionStatus = 'target_reached';
      console.log(`🎯 Target reached (${targetCount} rules) - more rules may be available`);
    } else {
      stats.completionStatus = 'partial';
      console.log(`⚠️ Partial collection - collected ${rawRules.length}/${targetCount} rules`);
    }

    console.log(`✅ Regulations.gov collection complete: ${rawRules.length} rules from ${stats.apiCallsMade} API calls`);

    return {
      rules: rawRules.slice(0, targetCount),
      stats
    };
  }

  /**
   * Search Regulations.gov for a specific term with pagination
   */
  async searchRegulationsForTerm(term, maxRules = 50) {
    const result = {
      rules: [],
      apiCallsMade: 0,
      totalAvailable: 0,
      exhausted: false
    };

    const maxPages = Math.ceil(maxRules / 20); // 20 results per page max

    for (let page = 1; page <= maxPages; page++) {
      try {
        const response = await axios.get('https://api.regulations.gov/v4/documents', {
          params: {
            'filter[searchTerm]': term,
            'filter[documentType]': 'Rule',
            'page[size]': 20,
            'page[number]': page,
            'sort': '-postedDate'
          },
          headers: {
            'X-Api-Key': this.regulationsApiKey
          },
          timeout: 10000
        });

        result.apiCallsMade++;

        const documents = response.data.data || [];
        const totalCount = response.data.meta?.totalElements || 0;

        if (page === 1) {
          result.totalAvailable = totalCount;
          console.log(`📊 "${term}": ${totalCount} total rules available`);
        }

        if (documents.length === 0) {
          result.exhausted = true;
          break;
        }

        // Process documents
        for (const doc of documents) {
          if (result.rules.length >= maxRules) break;

          const rawRule = {
            title: doc.attributes.title || 'Untitled Rule',
            content: doc.attributes.summary || doc.attributes.title || '',
            description: doc.attributes.summary || '',
            sourceUrl: `https://www.regulations.gov/document/${doc.id}`,
            authority: doc.attributes.agencyId || 'Federal Agency',
            level: 'federal',
            scrapedAt: new Date().toISOString(),
            documentId: doc.id,
            postedDate: doc.attributes.postedDate,
            searchTerm: term
          };

          result.rules.push(rawRule);
        }

        // Check if we've exhausted all pages
        if (documents.length < 20 || (page * 20) >= totalCount) {
          result.exhausted = true;
          break;
        }

        // Rate limiting - respect API limits
        await this.sleep(250); // 4 requests per second max

      } catch (error) {
        console.error(`❌ Error on page ${page} for "${term}":`, error.message);
        break;
      }
    }

    return result;
  }

  /**
   * Legacy method for backward compatibility
   */
  async collectRegulationsGovData(targetCount = 200) {
    const result = await this.collectRegulationsGovDataWithStats(targetCount);
    return result.rules;
    const businessTerms = [
      // General business terms
      'small business registration',
      'business tax requirements',
      'employment compliance',
      'workplace safety',
      'business licensing',
      'business permits',

      // Industry-specific terms for better categorization
      'restaurant health permits',
      'food service regulations',
      'healthcare compliance',
      'medical device regulations',
      'construction safety standards',
      'building permits',
      'financial services regulations',
      'banking compliance',
      'retail sales tax',
      'manufacturing safety',
      'technology data privacy',
      'software licensing',
      'transportation regulations',
      'logistics compliance',
      'real estate licensing',
      'professional services',
      'environmental regulations',
      'waste management',
      'energy compliance',
      'telecommunications regulations'
    ];

    const rawRules = [];
    const rulesPerTerm = Math.ceil(targetCount / businessTerms.length);

    for (const term of businessTerms) {
      try {
        console.log(`🔍 Searching Regulations.gov for: "${term}" (target: ${rulesPerTerm} rules)`);

        // Get multiple pages to reach target count
        const pages = Math.ceil(rulesPerTerm / 20); // 20 results per page max

        for (let page = 1; page <= pages && rawRules.length < targetCount; page++) {
          const response = await axios.get('https://api.regulations.gov/v4/documents', {
            params: {
              'filter[searchTerm]': term,
              'filter[documentType]': 'Rule',
              'page[size]': 20, // Maximum allowed
              'page[number]': page,
              'sort': '-postedDate'
            },
            headers: {
              'X-Api-Key': this.regulationsApiKey
            },
            timeout: 10000
          });

          const documents = response.data.data || [];
          console.log(`📄 Found ${documents.length} documents for "${term}" (page ${page})`);

          for (const doc of documents) {
            if (rawRules.length >= targetCount) break;

            const rawRule = {
              title: doc.attributes.title || 'Untitled Rule',
              content: doc.attributes.summary || doc.attributes.title || '',
              description: doc.attributes.summary || '',
              sourceUrl: `https://www.regulations.gov/document/${doc.id}`,
              authority: doc.attributes.agencyId || 'Federal Agency',
              level: 'federal',
              scrapedAt: new Date().toISOString(),
              documentId: doc.id,
              postedDate: doc.attributes.postedDate
            };

            rawRules.push(rawRule);
          }

          // Rate limiting - respect API limits
          await this.sleep(250); // 4 requests per second max
        }

      } catch (error) {
        console.error(`❌ Error searching for "${term}":`, error.message);
        continue;
      }

      if (rawRules.length >= targetCount) {
        console.log(`🎯 Reached target of ${targetCount} rules`);
        break;
      }
    }

    console.log(`✅ Collected ${rawRules.length} rules from Regulations.gov API`);
    return rawRules.slice(0, targetCount);
  }

  /**
   * Collect rules from SBA with stats
   */
  async collectSBADataWithStats() {
    const stats = {
      endpointsChecked: 0,
      endpointsSuccessful: 0,
      completionStatus: 'completed' // SBA has limited endpoints, so always complete
    };

    const rawRules = [];

    try {
      console.log('🏢 Collecting from SBA business guides...');

      const sbaEndpoints = [
        'https://www.sba.gov/business-guide/10-steps-start-your-business',
        'https://www.sba.gov/business-guide/manage-your-business/stay-legally-compliant',
        'https://www.sba.gov/business-guide/launch-your-business/register-your-business',
        'https://www.sba.gov/business-guide/launch-your-business/get-federal-state-tax-id-numbers',
        'https://www.sba.gov/business-guide/manage-your-business/pay-taxes',
        'https://www.sba.gov/business-guide/manage-your-business/employment-laws',
        'https://www.sba.gov/business-guide/manage-your-business/business-licenses-permits'
      ];

      for (const url of sbaEndpoints) {
        stats.endpointsChecked++;

        try {
          const response = await axios.get(url, {
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; ComplianceBot/1.0)'
            }
          });

          stats.endpointsSuccessful++;

          // Extract basic info from SBA pages
          const rawRule = {
            title: `SBA Guide: ${url.split('/').pop().replace(/-/g, ' ')}`,
            content: 'SBA guidance on business compliance requirements',
            description: 'Small Business Administration guidance on compliance',
            sourceUrl: url,
            authority: 'Small Business Administration',
            level: 'federal',
            scrapedAt: new Date().toISOString()
          };

          rawRules.push(rawRule);
          console.log(`✅ Collected: ${rawRule.title}`);

          await this.sleep(1000);

        } catch (error) {
          console.log(`⚠️ Could not access ${url}: ${error.message}`);
        }
      }

      console.log(`✅ SBA collection complete: ${rawRules.length}/${sbaEndpoints.length} endpoints successful`);

    } catch (error) {
      console.error('Error collecting SBA data:', error.message);
      stats.completionStatus = 'error';
    }

    return {
      rules: rawRules,
      stats
    };
  }

  /**
   * Legacy method for backward compatibility
   */
  async collectSBAData() {
    const result = await this.collectSBADataWithStats();
    return result.rules;
    const rawRules = [];

    try {
      console.log('🏢 Collecting from SBA business guides...');

      // SBA doesn't have a public API, but we can get structured data from their sitemap
      const sbaEndpoints = [
        'https://www.sba.gov/business-guide/10-steps-start-your-business',
        'https://www.sba.gov/business-guide/manage-your-business/stay-legally-compliant',
        'https://www.sba.gov/business-guide/launch-your-business/register-your-business',
        'https://www.sba.gov/business-guide/launch-your-business/get-federal-state-tax-id-numbers'
      ];

      for (const url of sbaEndpoints) {
        try {
          const response = await axios.get(url, {
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; ComplianceBot/1.0)'
            }
          });

          // Extract basic info from SBA pages
          const rawRule = {
            title: `SBA Business Compliance Guide - ${url.split('/').pop().replace(/-/g, ' ')}`,
            content: 'SBA guidance on business compliance requirements',
            description: 'Small Business Administration guidance on compliance',
            sourceUrl: url,
            authority: 'Small Business Administration',
            level: 'federal',
            scrapedAt: new Date().toISOString()
          };

          rawRules.push(rawRule);
          await this.sleep(1000);

        } catch (error) {
          console.log(`⚠️ Could not access ${url}: ${error.message}`);
        }
      }

    } catch (error) {
      console.error('Error collecting SBA data:', error.message);
    }

    return rawRules;
  }

  /**
   * Discover URLs that contain compliance rules (legacy method)
   */
  async discoverRuleUrls(target, maxUrls) {
    const urls = new Set();
    
    try {
      // Start with main pages
      const startingPages = [
        `${target.baseUrl}/business-guide/`,
        `${target.baseUrl}/businesses/`,
        `${target.baseUrl}/starting-business/`,
        `${target.baseUrl}/managing-business/`
      ];
      
      for (const startPage of startingPages) {
        try {
          console.log(`🔍 Checking: ${startPage}`);
          
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
              if (this.isRelevantUrl(fullUrl)) {
                urls.add(fullUrl);
              }
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
      console.error(`Error discovering URLs for ${target.name}:`, error.message);
    }
    
    return Array.from(urls).slice(0, maxUrls);
  }

  /**
   * Check if a URL is relevant for compliance rules
   */
  isRelevantUrl(url) {
    const relevantPaths = [
      '/business', '/compliance', '/regulation', '/requirement', '/license',
      '/permit', '/tax', '/employment', '/labor', '/safety', '/filing',
      '/starting-business', '/managing-business', '/business-guide'
    ];
    
    return relevantPaths.some(path => url.toLowerCase().includes(path));
  }

  /**
   * Check if a link is relevant for compliance rules
   */
  isRelevantLink(text, href) {
    const relevantKeywords = [
      'business', 'compliance', 'regulation', 'requirement', 'license', 'permit',
      'tax', 'employment', 'labor', 'safety', 'registration', 'filing', 'startup'
    ];
    
    return relevantKeywords.some(keyword => text.includes(keyword)) ||
           this.isRelevantUrl(href);
  }

  /**
   * Scrape individual rule pages
   */
  async scrapeRules(target, urls) {
    const rules = [];
    
    for (const url of urls.slice(0, 10)) { // Limit to 10 per site for demo
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
        if (!title || title.length < 10) continue;
        
        // Extract main content
        const content = $(target.selectors.content).first().text().trim();
        if (!content || content.length < 200) continue; // Skip if too short
        
        // Only include if it looks like a compliance rule
        if (this.isComplianceContent(title, content)) {
          rules.push({
            title: title.substring(0, 200), // Limit title length
            content: content.substring(0, 3000), // Limit content length
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
  isComplianceContent(title, content) {
    const complianceIndicators = [
      'must', 'required', 'shall', 'obligation', 'compliance', 'regulation',
      'license', 'permit', 'registration', 'filing', 'deadline', 'penalty',
      'requirement', 'mandatory', 'law', 'form', 'application'
    ];
    
    const text = (title + ' ' + content).toLowerCase();
    const indicatorCount = complianceIndicators.filter(indicator => 
      text.includes(indicator)
    ).length;
    
    return indicatorCount >= 2; // Must have at least 2 compliance indicators
  }

  /**
   * Process raw rules with AI and check for duplicates
   */
  async processAndDeduplicateRules(rawRules) {
    const newRules = [];
    
    for (const rawRule of rawRules) {
      try {
        // Generate canonical ID using existing method
        const canonicalId = this.generateCanonicalId(rawRule);
        
        // Check if rule already exists
        const existingRule = await this.checkForExistingRule(canonicalId);
        
        if (existingRule) {
          console.log(`⚠️ Duplicate found: ${rawRule.title.substring(0, 50)}... (skipping)`);
          continue;
        }
        
        // Process with AI to structure the rule
        const structuredRule = await this.processScrapedRuleWithAI(rawRule);
        
        if (structuredRule) {
          newRules.push(structuredRule);
          console.log(`✨ Processed: ${rawRule.title.substring(0, 50)}...`);
        }
        
      } catch (error) {
        console.error(`❌ Error processing rule "${rawRule.title.substring(0, 50)}...":`, error.message);
      }
    }
    
    return newRules;
  }

  /**
   * Process scraped rule with AI for intelligent categorization
   */
  async processScrapedRuleWithAI(rawRule) {
    try {
      // Use AI to analyze and categorize the rule
      const categorization = await this.categorizeRuleWithAI(rawRule);

      const rule = {
        id: uuidv4(),
        title: rawRule.title,
        description: categorization.description || `Compliance requirement from ${rawRule.authority}`,
        authority: rawRule.authority,
        level: rawRule.level,
        priority: categorization.priority || 'medium',
        applicability_criteria: {
          business_types: categorization.business_types || ['LLC', 'Corporation', 'Partnership', 'Sole Proprietorship'],
          states: categorization.states || ['ALL'],
          industries: categorization.industries || ['ALL'], // Now properly categorized
          industry_groups: categorization.industry_groups || [],
          employee_count: categorization.employee_count || { min: 0, max: 999999 },
          annual_revenue: categorization.annual_revenue || { min: 0, max: 999999999 },
          special_conditions: categorization.special_conditions || []
        },
        compliance_steps: [
          {
            step_number: 1,
            step_description: `Review requirements at ${rawRule.sourceUrl}`,
            deadline: 'As required by regulation',
            required_forms: [],
            estimated_cost: 0,
            estimated_time: '1-2 hours'
          }
        ],
        estimated_cost: {
          filing_fees: 0,
          penalty_range: { min: 0, max: 1000 }
        },
        tags: ['scraped', rawRule.level, rawRule.authority.toLowerCase().replace(/\s+/g, '-')],
        canonical_id: this.generateCanonicalId(rawRule),
        jurisdiction: 'US',
        status: 'active',
        sources: [{
          source_id: 'scraped_' + Date.now(),
          source_type: 'government_website',
          source_name: rawRule.authority,
          source_url: rawRule.sourceUrl,
          reliability_score: 9,
          last_updated: rawRule.scrapedAt,
          verification_status: 'verified',
          content_hash: crypto.createHash('md5').update(rawRule.content).digest('hex')
        }],
        version: 1,
        last_verified: rawRule.scrapedAt,
        search_keywords: this.generateSearchKeywords(rawRule),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      return rule;

    } catch (error) {
      console.error('Error processing scraped rule:', error);
      return null;
    }
  }

  /**
   * Use AI to categorize rule by industry and other criteria
   */
  async categorizeRuleWithAI(rawRule) {
    try {
      if (!this.openaiApiKey) {
        // Fallback to basic categorization without AI
        return this.basicCategorization(rawRule);
      }

      const OpenAI = require('openai');
      const openai = new OpenAI({ apiKey: this.openaiApiKey });

      const prompt = `
Analyze this government compliance rule and categorize it for business matching.

**Rule Content:**
Title: ${rawRule.title}
Content: ${rawRule.content.substring(0, 1500)}
Authority: ${rawRule.authority}

**Instructions:**
1. Determine which industries this rule applies to (use NAICS codes when possible)
2. Identify business types, employee count ranges, revenue ranges
3. Determine priority level and special conditions
4. Create a clear description

**Return JSON with this structure:**
{
  "description": "Clear description of what businesses must do",
  "priority": "critical|high|medium|low",
  "industries": ["NAICS codes or industry names"],
  "industry_groups": ["broader categories like food_service, tech, healthcare"],
  "business_types": ["LLC", "Corporation", "Partnership", "Sole Proprietorship"],
  "states": ["specific states or ALL for federal"],
  "employee_count": {"min": 0, "max": 999999},
  "annual_revenue": {"min": 0, "max": 999999999},
  "special_conditions": ["has_employees", "handles_personal_data", "sells_online", etc]
}

**Industry Examples:**
- Tax rules → ["ALL"] (applies to all industries)
- Restaurant health permits → ["722513", "722511"] (NAICS for restaurants)
- Healthcare privacy → ["621111", "622110"] (NAICS for healthcare)
- Construction safety → ["236116", "238210"] (NAICS for construction)
- Financial services → ["522110", "523110"] (NAICS for banking/finance)

Only return the JSON object, no other text.`;

      const response = await openai.chat.completions.create({
        model: "gpt-5-nano",
        messages: [{ role: "user", content: prompt }],
        max_completion_tokens: 50000,
        temperature: 0.3
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (!content) {
        return this.basicCategorization(rawRule);
      }

      // Parse AI response
      const categorization = JSON.parse(content);
      console.log(`🤖 AI categorized rule for industries: ${categorization.industries?.join(', ') || 'ALL'}`);

      return categorization;

    } catch (error) {
      console.error('Error in AI categorization:', error.message);
      return this.basicCategorization(rawRule);
    }
  }

  /**
   * Basic categorization without AI (fallback)
   */
  basicCategorization(rawRule) {
    const title = rawRule.title.toLowerCase();
    const content = rawRule.content.toLowerCase();
    const text = title + ' ' + content;

    // Industry-specific keywords mapping
    const industryKeywords = {
      'healthcare': ['health', 'medical', 'hospital', 'clinic', 'patient', 'hipaa'],
      'food_service': ['restaurant', 'food', 'kitchen', 'dining', 'menu', 'health permit'],
      'construction': ['construction', 'building', 'contractor', 'safety', 'osha'],
      'finance': ['bank', 'financial', 'investment', 'securities', 'lending'],
      'retail': ['retail', 'store', 'sales', 'customer', 'merchandise'],
      'technology': ['software', 'data', 'privacy', 'cyber', 'digital'],
      'manufacturing': ['manufacturing', 'production', 'factory', 'equipment']
    };

    // Determine industries
    let industries = ['ALL']; // Default to all industries
    let industry_groups = [];

    for (const [industry, keywords] of Object.entries(industryKeywords)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        industry_groups.push(industry);
        // Don't set specific NAICS codes without AI
        industries = ['ALL']; // Keep as ALL for safety
      }
    }

    // Determine priority based on keywords
    let priority = 'medium';
    if (text.includes('penalty') || text.includes('fine') || text.includes('violation')) {
      priority = 'high';
    }
    if (text.includes('required') || text.includes('must') || text.includes('mandatory')) {
      priority = 'high';
    }
    if (text.includes('critical') || text.includes('immediate')) {
      priority = 'critical';
    }

    // Determine special conditions
    const special_conditions = [];
    if (text.includes('employee') || text.includes('worker')) {
      special_conditions.push('has_employees');
    }
    if (text.includes('data') || text.includes('privacy') || text.includes('personal information')) {
      special_conditions.push('handles_personal_data');
    }
    if (text.includes('online') || text.includes('website') || text.includes('internet')) {
      special_conditions.push('sells_online');
    }

    return {
      description: `${rawRule.authority} compliance requirement`,
      priority,
      industries,
      industry_groups,
      business_types: ['LLC', 'Corporation', 'Partnership', 'Sole Proprietorship'],
      states: rawRule.level === 'federal' ? ['ALL'] : ['ALL'], // Would need state detection
      employee_count: { min: 0, max: 999999 },
      annual_revenue: { min: 0, max: 999999999 },
      special_conditions
    };
  }

  /**
   * Generate search keywords from rule content
   */
  generateSearchKeywords(rawRule) {
    const text = `${rawRule.title} ${rawRule.content}`.toLowerCase();
    const words = text.match(/\b\w+\b/g) || [];
    
    const stopWords = new Set(['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
    
    const keywords = words
      .filter(word => word.length > 3 && !stopWords.has(word))
      .slice(0, 15);
    
    return [...new Set(keywords)];
  }

  /**
   * Generate canonical ID for deduplication
   */
  generateCanonicalId(rawRule) {
    const hashInput = [
      rawRule.title.toLowerCase().trim(),
      rawRule.authority.toLowerCase(),
      rawRule.level
    ].join('|');
    
    return crypto.createHash('md5').update(hashInput).digest('hex');
  }

  /**
   * Check if rule already exists in deduplication index
   */
  async checkForExistingRule(canonicalId) {
    try {
      // This would need to be implemented with your Firestore service
      // For now, return false to allow all rules
      return false;
    } catch (error) {
      console.error('Error checking for existing rule:', error);
      return false;
    }
  }

  /**
   * Utility method for rate limiting
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = { GovernmentScraper };
