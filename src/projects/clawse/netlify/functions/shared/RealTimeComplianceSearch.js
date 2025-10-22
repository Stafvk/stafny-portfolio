const axios = require('axios');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

/**
 * Real-Time Compliance Search Pipeline
 * Integrates SBA, Regulations.gov, and IRS APIs with intelligent caching
 */
class RealTimeComplianceSearch {
  constructor(openaiApiKey, firestoreService, regulationsApiKey) {
    this.openaiApiKey = openaiApiKey;
    this.firestoreService = firestoreService;
    this.regulationsApiKey = regulationsApiKey;
    
    // In-memory cache for search results (6 hour TTL)
    this.searchCache = new Map();
    this.processingQueue = new Map();
    this.popularTerms = new Map();
    
    // API rate limits
    this.rateLimits = {
      regulations: { calls: 0, resetTime: Date.now() + 3600000 }, // 1000/hour
      sba: { calls: 0, resetTime: Date.now() + 3600000 }, // No limit but be respectful
      irs: { calls: 0, resetTime: Date.now() + 3600000 } // Web scraping limit
    };

    console.log('🚀 Real-Time Compliance Search initialized');
  }

  /**
   * Main search method - returns cached results immediately or searches APIs
   */
  async search(query, businessCategory = null, businessProfile = null, progressCallback = null) {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(query, businessCategory);

    console.log(`🔍 Real-time search for: "${query}" (category: ${businessCategory || 'general'})`);

    // Progress tracking
    const updateProgress = (step, percentage, message) => {
      if (progressCallback) {
        progressCallback({ step, percentage, message, timestamp: Date.now() });
      }
    };

    try {
      updateProgress('initializing', 5, 'Starting compliance search...');

      // 1. Check cache first (immediate response)
      const cached = this.getCachedResult(cacheKey);
      if (cached) {
        console.log('🎯 Cache hit - returning cached results');
        updateProgress('complete', 100, 'Retrieved from cache');
        return {
          ...cached,
          source: 'cache',
          responseTime: `${Date.now() - startTime}ms`,
          cached: true
        };
      }

      updateProgress('cache_check', 10, 'Cache miss - searching government databases...');

      // 2. Check if already processing this query
      if (this.processingQueue.has(cacheKey)) {
        console.log('⏳ Query already processing, waiting for result...');
        updateProgress('waiting', 15, 'Another search in progress, waiting...');
        return await this.processingQueue.get(cacheKey);
      }

      // 3. Start new real-time search
      const searchPromise = this.performRealTimeSearch(query, businessCategory, businessProfile, cacheKey, startTime, updateProgress);
      this.processingQueue.set(cacheKey, searchPromise);

      try {
        const result = await searchPromise;
        this.setCachedResult(cacheKey, result);
        updateProgress('complete', 100, 'Compliance search completed successfully');
        return result;
      } finally {
        this.processingQueue.delete(cacheKey);
      }

    } catch (error) {
      console.error('❌ Real-time search failed:', error);
      updateProgress('error', 0, `Search failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Perform the actual real-time search across all APIs
   */
  async performRealTimeSearch(query, businessCategory, businessProfile, cacheKey, startTime, updateProgress) {
    console.log('🔄 Starting real-time API search...');

    // Skip database search - everything is real-time now
    console.log('📊 Skipping database search - using real-time only');
    const dbResults = [];

    // Phase 2: Parallel API searches with timeout
    updateProgress('api_search', 30, 'Searching government APIs...');

    const apiSearchPromises = [
      this.searchRegulationsAPI(query, updateProgress).catch(err => ({ source: 'regulations', error: err.message, results: [] })),
      this.searchSBAAPI(query, businessCategory, updateProgress).catch(err => ({ source: 'sba', error: err.message, results: [] })),
      this.searchIRSAPI(query, businessCategory, updateProgress).catch(err => ({ source: 'irs', error: err.message, results: [] }))
    ];

    // Wait for all APIs with 8-second timeout
    const apiResults = await Promise.allSettled(
      apiSearchPromises.map(p => this.withTimeout(p, 8000))
    );

    // Phase 3: Process API results
    updateProgress('processing_apis', 60, 'Processing API responses...');
    const allRawResults = [...dbResults];
    const apiStats = { regulations: 0, sba: 0, irs: 0, errors: [] };

    apiResults.forEach((result, index) => {
      const sources = ['regulations', 'sba', 'irs'];
      const source = sources[index];

      if (result.status === 'fulfilled' && result.value.results) {
        allRawResults.push(...result.value.results);
        apiStats[source] = result.value.results.length;
        console.log(`✅ ${source.toUpperCase()}: ${result.value.results.length} results`);
      } else {
        const error = result.status === 'rejected' ? result.reason : result.value.error;
        apiStats.errors.push(`${source}: ${error}`);
        console.warn(`⚠️ ${source.toUpperCase()} failed: ${error}`);
      }
    });

    // Phase 4: AI processing and deduplication
    updateProgress('ai_processing', 75, `Processing ${allRawResults.length} rules with AI...`);
    const processedResults = await this.processAndDeduplicateResults(allRawResults, query, updateProgress);

    // Phase 5: Skip database storage (real-time only)
    updateProgress('finalizing', 95, 'Finalizing compliance analysis...');
    console.log('🚫 Database storage skipped - real-time only mode');
    // No database storage in real-time mode

    const responseTime = Date.now() - startTime;
    console.log(`✅ Real-time search completed in ${responseTime}ms`);

    return {
      results: processedResults.rules,
      source: 'hybrid',
      responseTime: `${responseTime}ms`,
      cached: false,
      stats: {
        fromDatabase: dbResults.length,
        fromAPIs: allRawResults.length - dbResults.length,
        totalProcessed: processedResults.rules.length,
        newRulesFound: processedResults.newRules.length,
        apiStats,
        processingTime: responseTime
      }
    };
  }

  /**
   * Enhanced database search with business activity matching
   */
  async searchDatabase(query, businessProfile) {
    try {
      // 🚫 DATABASE SEARCH COMPLETELY DISABLED - REAL-TIME ONLY
      console.log('🚫 Database search skipped - using real-time APIs only');
      return [];

      // DISABLED CODE BELOW:
      /*
      if (!businessProfile) {
        // Generic search without business profile
        const snapshot = await this.firestoreService.db
          .collection('compliance_rules')
          .where('status', '==', 'active')
          .limit(50)
          .get();

        const allRules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Enhanced keyword matching
        const queryWords = this.extractSearchKeywords(query);
        return this.filterRulesByRelevance(allRules, queryWords);
      }

      // Enhanced business profile matching with activity analysis
      const profileRules = await this.firestoreService.getMatchingRules(businessProfile);
      */

      // Additional filtering based on business description and query
      if (businessProfile.industry_description) {
        const businessKeywords = this.extractBusinessKeywords(businessProfile.industry_description);
        const queryKeywords = this.extractSearchKeywords(query);

        // Score rules based on relevance to actual business activities
        const scoredRules = profileRules.map(rule => ({
          ...rule,
          relevanceScore: this.calculateRelevanceScore(rule, businessKeywords, queryKeywords)
        }));

        // Filter out low-relevance rules and sort by score
        return scoredRules
          .filter(rule => rule.relevanceScore > 0.6) // Much stricter relevance threshold
          .sort((a, b) => b.relevanceScore - a.relevanceScore)
          .slice(0, 30); // Limit results to most relevant
      }

      return profileRules;
    } catch (error) {
      console.error('Database search failed:', error);
      return [];
    }
  }

  /**
   * Extract meaningful keywords from search query
   */
  extractSearchKeywords(query) {
    const text = query.toLowerCase();
    const words = text.split(/\s+/);

    // Remove stop words and short words
    const stopWords = new Set(['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'a', 'an']);

    return words
      .filter(word => word.length > 2 && !stopWords.has(word))
      .map(word => word.replace(/[^\w]/g, ''));
  }

  /**
   * Extract business activity keywords from description
   */
  extractBusinessKeywords(description) {
    const text = description.toLowerCase();

    const keywords = {
      services: [],
      technology: [],
      industry: [],
      activities: []
    };

    // Service-related keywords
    const servicePatterns = [
      'design', 'development', 'consulting', 'support', 'maintenance',
      'training', 'implementation', 'integration', 'customization',
      'optimization', 'management', 'analysis', 'strategy', 'solutions'
    ];

    // Technology keywords
    const techPatterns = [
      'software', 'website', 'mobile', 'app', 'application', 'platform',
      'database', 'cloud', 'api', 'digital', 'online', 'web', 'internet'
    ];

    // Industry keywords
    const industryPatterns = [
      'healthcare', 'finance', 'retail', 'manufacturing', 'construction',
      'education', 'nonprofit', 'government', 'startup', 'enterprise',
      'restaurant', 'food', 'medical', 'legal', 'accounting'
    ];

    // Extract matching keywords
    servicePatterns.forEach(pattern => {
      if (text.includes(pattern)) keywords.services.push(pattern);
    });

    techPatterns.forEach(pattern => {
      if (text.includes(pattern)) keywords.technology.push(pattern);
    });

    industryPatterns.forEach(pattern => {
      if (text.includes(pattern)) keywords.industry.push(pattern);
    });

    // Extract activity phrases
    const activityPatterns = [
      /we (provide|offer|deliver|create|build|develop|design|manage|help)/g,
      /specializ(e|ing) in ([\w\s]+)/g,
      /(custom|affordable|user-friendly|tailored) ([\w\s]+)/g
    ];

    activityPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          keywords.activities.push(match.replace(/we |specializ(e|ing) in /g, '').trim());
        });
      }
    });

    return keywords;
  }

  /**
   * Calculate relevance score for a rule based on business keywords
   */
  calculateRelevanceScore(rule, businessKeywords, queryKeywords) {
    let score = 0;
    const ruleText = `${rule.title} ${rule.description}`.toLowerCase();

    // Check for business service matches
    businessKeywords.services.forEach(keyword => {
      if (ruleText.includes(keyword)) score += 0.3;
    });

    // Check for technology matches
    businessKeywords.technology.forEach(keyword => {
      if (ruleText.includes(keyword)) score += 0.4;
    });

    // Check for industry matches
    businessKeywords.industry.forEach(keyword => {
      if (ruleText.includes(keyword)) score += 0.5;
    });

    // Check for activity matches
    businessKeywords.activities.forEach(activity => {
      if (ruleText.includes(activity)) score += 0.6;
    });

    // Check for query keyword matches
    queryKeywords.forEach(keyword => {
      if (ruleText.includes(keyword)) score += 0.2;
    });

    // ENHANCED IRRELEVANT RULE PENALTIES
    const irrelevantCategories = {
      healthcare: ['hospital', 'medicare', 'medicaid', 'medical', 'patient', 'clinical', 'health care', 'nursing', 'dialysis', 'renal'],
      manufacturing: ['manufacturing', 'factory', 'production line', 'assembly', 'furnace', 'washer', 'appliance'],
      aviation: ['aircraft', 'airplane', 'helicopter', 'aviation', 'airworthiness', 'flight'],
      marine: ['marine', 'ocean', 'offshore', 'maritime', 'vessel', 'ship'],
      agriculture: ['farming', 'agricultural', 'crop', 'livestock', 'pesticide'],
      energy: ['nuclear', 'power plant', 'energy production', 'utility', 'electricity generation'],
      specialized: ['endangered species', 'wildlife', 'environmental protection', 'toxic substances', 'hazardous waste'],
      consumer_products: ['toy', 'children', 'infant', 'baby', 'consumer product safety']
    };

    // Apply penalties based on business type
    const businessType = this.inferBusinessTypeFromKeywords(businessKeywords);

    Object.entries(irrelevantCategories).forEach(([category, keywords]) => {
      // Only apply penalties if the business is clearly NOT in that category
      if (!this.isBusinessInCategory(businessType, category)) {
        keywords.forEach(keyword => {
          if (ruleText.includes(keyword)) {
            score -= 0.9; // Heavy penalty for irrelevant categories
          }
        });
      }
    });

    // Additional penalties for obviously unrelated rules
    const highPenaltyKeywords = [
      'premerger notification', 'merger', 'acquisition',
      'cybersecurity labeling', 'copyright circumvention',
      'supplemental nutrition', 'food assistance',
      'clearing agency', 'derivatives',
      'patent fees', 'trademark fees'
    ];

    highPenaltyKeywords.forEach(keyword => {
      if (ruleText.includes(keyword)) score -= 1.0;
    });

    return Math.max(0, Math.min(1, score)); // Clamp between 0 and 1
  }

  /**
   * Infer business type from keywords
   */
  inferBusinessTypeFromKeywords(businessKeywords) {
    if (businessKeywords.industry.some(ind => ['transportation', 'logistics', 'delivery'].includes(ind))) {
      return 'transportation';
    }
    if (businessKeywords.technology.length > 0) {
      return 'technology';
    }
    if (businessKeywords.industry.some(ind => ['healthcare', 'medical'].includes(ind))) {
      return 'healthcare';
    }
    if (businessKeywords.services.some(svc => ['consulting', 'professional'].includes(svc))) {
      return 'professional_services';
    }
    return 'general_business';
  }

  /**
   * Check if business is in a specific category
   */
  isBusinessInCategory(businessType, category) {
    const categoryMap = {
      healthcare: ['healthcare'],
      manufacturing: ['manufacturing'],
      aviation: ['aviation', 'transportation'], // Transportation might include aviation
      marine: ['marine', 'transportation'], // Transportation might include marine
      agriculture: ['agriculture'],
      energy: ['energy'],
      specialized: [], // No business types match specialized environmental rules
      consumer_products: ['manufacturing', 'retail']
    };

    return categoryMap[category]?.includes(businessType) || false;
  }

  /**
   * Filter rules by relevance to query keywords
   */
  filterRulesByRelevance(rules, queryKeywords) {
    return rules.filter(rule => {
      const ruleText = `${rule.title} ${rule.description}`.toLowerCase();

      // Must match at least one query keyword
      const hasMatch = queryKeywords.some(keyword => ruleText.includes(keyword));

      // Exclude obviously irrelevant rules
      const irrelevantKeywords = ['hospital', 'medicare', 'medical', 'patient', 'clinical'];
      const hasIrrelevant = irrelevantKeywords.some(keyword => ruleText.includes(keyword));

      return hasMatch && !hasIrrelevant;
    });
  }

  /**
   * Generate cache key for search results
   */
  generateCacheKey(query, businessCategory) {
    const key = `${query.toLowerCase().trim()}:${businessCategory || 'general'}`;
    return crypto.createHash('md5').update(key).digest('hex');
  }

  /**
   * Get cached search result if valid
   */
  getCachedResult(cacheKey) {
    const cached = this.searchCache.get(cacheKey);
    if (!cached) return null;

    // Check if cache is expired (6 hours)
    const cacheAge = Date.now() - cached.cachedAt;
    const maxAge = 6 * 60 * 60 * 1000; // 6 hours

    if (cacheAge > maxAge) {
      this.searchCache.delete(cacheKey);
      return null;
    }

    // Update hit count for popularity tracking
    cached.hitCount = (cached.hitCount || 0) + 1;
    return cached;
  }

  /**
   * Cache search result
   */
  setCachedResult(cacheKey, result) {
    const cached = {
      ...result,
      cachedAt: Date.now(),
      hitCount: 1
    };
    
    this.searchCache.set(cacheKey, cached);
    
    // Limit cache size (keep most recent 1000 entries)
    if (this.searchCache.size > 1000) {
      const oldestKey = this.searchCache.keys().next().value;
      this.searchCache.delete(oldestKey);
    }
  }

  /**
   * Timeout wrapper for API calls
   */
  withTimeout(promise, timeoutMs) {
    return Promise.race([
      promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  }

  /**
   * Enhanced Regulations.gov API search with business activity targeting
   */
  async searchRegulationsAPI(query, updateProgress = null) {
    if (!this.regulationsApiKey) {
      console.warn('⚠️ No Regulations.gov API key available');
      return { source: 'regulations', results: [] };
    }

    try {
      console.log('📡 Searching Regulations.gov API...');
      if (updateProgress) updateProgress('regulations_api', 35, 'Searching Regulations.gov...');

      // Extract key terms for more targeted search
      const searchTerms = this.extractSearchKeywords(query);
      const enhancedQuery = this.buildTargetedQuery(searchTerms);

      console.log(`📡 Enhanced query: "${enhancedQuery}"`);

      const response = await axios.get('https://api.regulations.gov/v4/documents', {
        params: {
          'filter[searchTerm]': enhancedQuery,
          'filter[documentType]': 'Rule',
          'page[size]': 25,
          'sort': '-postedDate'
        },
        headers: {
          'X-Api-Key': this.regulationsApiKey
        },
        timeout: 8000
      });

      const documents = response.data.data || [];
      const results = documents.map(doc => ({
        id: uuidv4(),
        title: doc.attributes.title || 'Untitled Rule',
        description: doc.attributes.summary || doc.attributes.title || '',
        content: doc.attributes.summary || '',
        authority: doc.attributes.agencyId || 'Federal Agency',
        level: 'federal',
        sourceUrl: `https://www.regulations.gov/document/${doc.id}`,
        source: 'regulations.gov',
        documentId: doc.id,
        postedDate: doc.attributes.postedDate,
        searchTerm: query,
        scrapedAt: new Date().toISOString(),
        isNewRule: true
      }));

      console.log(`✅ Regulations.gov: Found ${results.length} results`);
      return { source: 'regulations', results };

    } catch (error) {
      console.error('❌ Regulations.gov API error:', error.message);
      throw error;
    }
  }

  /**
   * Enhanced SBA API and website search
   */
  async searchSBAAPI(query, businessCategory, updateProgress = null) {
    try {
      console.log('🏢 Searching SBA resources...');
      if (updateProgress) updateProgress('sba_api', 45, 'Searching SBA resources...');

      // Extract business-relevant terms for SBA search
      const searchTerms = this.extractSearchKeywords(query);
      const businessKeywords = searchTerms.filter(term =>
        ['business', 'startup', 'small', 'licensing', 'registration', 'compliance', 'requirements'].includes(term)
      );

      const results = [];

      // Try SBA API first (if available)
      try {
        const apiResponse = await axios.get('https://api.sba.gov/v1/content/search', {
          params: {
            q: query,
            category: businessCategory || 'business-guide',
            limit: 15
          },
          timeout: 6000
        });

        if (apiResponse.data && apiResponse.data.results) {
          apiResponse.data.results.forEach(item => {
            results.push({
              id: uuidv4(),
              title: item.title || 'SBA Business Requirement',
              description: item.summary || item.description || '',
              content: item.summary || item.description || '',
              authority: 'Small Business Administration',
              level: 'federal',
              sourceUrl: item.url || 'https://sba.gov',
              source: 'sba.gov',
              searchTerm: query,
              scrapedAt: new Date().toISOString(),
              isNewRule: true
            });
          });
        }
      } catch (apiError) {
        console.warn('⚠️ SBA API not available, using fallback data');

        // Fallback: Generate relevant SBA rules based on query
        const sbaRules = this.generateSBAFallbackRules(query, businessCategory);
        results.push(...sbaRules);
      }

      console.log(`✅ SBA: Found ${results.length} results`);
      return { source: 'sba', results };

    } catch (error) {
      console.error('❌ SBA search error:', error.message);
      throw error;
    }
  }

  /**
   * Enhanced IRS resources search with business focus
   */
  async searchIRSAPI(query, businessCategory, updateProgress = null) {
    try {
      console.log('🏛️ Searching IRS resources...');
      if (updateProgress) updateProgress('irs_api', 55, 'Searching IRS resources...');

      // Focus on tax-related and business formation terms
      const searchTerms = this.extractSearchKeywords(query);
      const taxKeywords = searchTerms.filter(term =>
        ['tax', 'ein', 'payroll', 'business', 'income', 'deduction', 'filing'].includes(term)
      );

      const results = [];
      const irsUrls = [
        'https://www.irs.gov/businesses/small-businesses-self-employed',
        'https://www.irs.gov/forms-pubs/forms-and-publications-pdf'
      ];

      // Since IRS doesn't have a public API, we'll generate relevant rules
      // based on common tax requirements
      const irsRules = this.generateIRSRules(query, businessCategory);
      results.push(...irsRules);

      console.log(`✅ IRS: Found ${results.length} results`);
      return { source: 'irs', results };

    } catch (error) {
      console.error('❌ IRS search error:', error.message);
      throw error;
    }
  }

  /**
   * Generate SBA fallback rules when API is unavailable
   */
  generateSBAFallbackRules(query, businessCategory) {
    const sbaRules = [];
    const queryLower = query.toLowerCase();

    // Common SBA requirements based on query
    if (queryLower.includes('license') || queryLower.includes('permit')) {
      sbaRules.push({
        id: uuidv4(),
        title: 'Business License Requirements',
        description: 'Most businesses need licenses and permits to operate legally.',
        content: 'Check with your state and local government for specific licensing requirements for your business type.',
        authority: 'Small Business Administration',
        level: 'federal',
        sourceUrl: 'https://www.sba.gov/business-guide/launch-your-business/apply-licenses-permits',
        source: 'sba.gov',
        searchTerm: query,
        scrapedAt: new Date().toISOString(),
        isNewRule: true
      });
    }

    if (queryLower.includes('tax') || queryLower.includes('ein')) {
      sbaRules.push({
        id: uuidv4(),
        title: 'Federal Tax ID (EIN) Requirement',
        description: 'Most businesses need an Employer Identification Number (EIN) from the IRS.',
        content: 'Apply for an EIN if you have employees, operate as a partnership or corporation, or file certain tax returns.',
        authority: 'Small Business Administration',
        level: 'federal',
        sourceUrl: 'https://www.sba.gov/business-guide/launch-your-business/get-federal-tax-id-ein',
        source: 'sba.gov',
        searchTerm: query,
        scrapedAt: new Date().toISOString(),
        isNewRule: true
      });
    }

    if (queryLower.includes('employee') || queryLower.includes('hiring')) {
      sbaRules.push({
        id: uuidv4(),
        title: 'Employee Rights and Responsibilities',
        description: 'Understand your obligations when hiring employees.',
        content: 'Learn about wage and hour laws, workplace safety, and anti-discrimination requirements.',
        authority: 'Small Business Administration',
        level: 'federal',
        sourceUrl: 'https://www.sba.gov/business-guide/manage-your-business/hire-retain-employees',
        source: 'sba.gov',
        searchTerm: query,
        scrapedAt: new Date().toISOString(),
        isNewRule: true
      });
    }

    return sbaRules;
  }

  /**
   * Generate IRS rules based on query
   */
  generateIRSRules(query, businessCategory) {
    const irsRules = [];
    const queryLower = query.toLowerCase();

    if (queryLower.includes('tax') || queryLower.includes('filing')) {
      irsRules.push({
        id: uuidv4(),
        title: 'Business Tax Filing Requirements',
        description: 'All businesses must file annual tax returns and pay applicable taxes.',
        content: 'File Form 1120 for corporations, Form 1065 for partnerships, or Schedule C for sole proprietorships.',
        authority: 'Internal Revenue Service',
        level: 'federal',
        sourceUrl: 'https://www.irs.gov/businesses/small-businesses-self-employed/business-taxes',
        source: 'irs.gov',
        searchTerm: query,
        scrapedAt: new Date().toISOString(),
        isNewRule: true
      });
    }

    if (queryLower.includes('payroll') || queryLower.includes('employee')) {
      irsRules.push({
        id: uuidv4(),
        title: 'Payroll Tax Obligations',
        description: 'Employers must withhold and pay payroll taxes for employees.',
        content: 'Withhold federal income tax, Social Security, and Medicare taxes. File Form 941 quarterly.',
        authority: 'Internal Revenue Service',
        level: 'federal',
        sourceUrl: 'https://www.irs.gov/businesses/small-businesses-self-employed/employment-taxes',
        source: 'irs.gov',
        searchTerm: query,
        scrapedAt: new Date().toISOString(),
        isNewRule: true
      });
    }

    return irsRules;
  }

  /**
   * Process and deduplicate search results with AI
   */
  async processAndDeduplicateResults(allRawResults, query, updateProgress = null) {
    console.log(`🤖 Processing ${allRawResults.length} raw results...`);

    // Separate existing rules from new API results
    const existingRules = allRawResults.filter(rule => !rule.isNewRule);
    const newRawRules = allRawResults.filter(rule => rule.isNewRule);

    console.log(`📊 ${existingRules.length} existing rules, ${newRawRules.length} new rules to process`);

    if (newRawRules.length === 0) {
      return {
        rules: existingRules,
        newRules: []
      };
    }

    // Deduplicate new rules
    if (updateProgress) updateProgress('deduplicating', 78, 'Removing duplicate rules...');
    const deduplicatedRules = await this.deduplicateRules(newRawRules);
    console.log(`✨ Deduplicated to ${deduplicatedRules.length} unique new rules`);

    // Process new rules with AI in batches
    if (updateProgress) updateProgress('ai_categorizing', 82, 'Categorizing rules with AI...');
    const processedNewRules = await this.batchProcessWithAI(deduplicatedRules, query, updateProgress);

    return {
      rules: [...existingRules, ...processedNewRules],
      newRules: processedNewRules
    };
  }

  /**
   * Deduplicate rules based on title and content similarity
   */
  async deduplicateRules(rawRules) {
    const uniqueRules = [];
    const seenHashes = new Set();

    for (const rule of rawRules) {
      // Create hash based on title and content
      const contentHash = crypto.createHash('md5')
        .update(`${rule.title}:${rule.authority}`)
        .digest('hex');

      if (!seenHashes.has(contentHash)) {
        seenHashes.add(contentHash);
        uniqueRules.push(rule);
      }
    }

    return uniqueRules;
  }

  /**
   * Process rules with AI in batches for efficiency
   */
  async batchProcessWithAI(rawRules, query, updateProgress = null) {
    if (!this.openaiApiKey || rawRules.length === 0) {
      console.log('⚠️ No OpenAI key or no rules to process, using basic processing');
      return rawRules.map(rule => this.basicRuleProcessing(rule));
    }

    const processedRules = [];
    const batchSize = 10; // Process 10 rules at a time
    const totalBatches = Math.ceil(rawRules.length / batchSize);

    for (let i = 0; i < rawRules.length; i += batchSize) {
      const batch = rawRules.slice(i, i + batchSize);
      const batchNumber = Math.floor(i/batchSize) + 1;
      console.log(`🤖 Processing batch ${batchNumber}/${totalBatches}`);

      if (updateProgress) {
        const progressPercent = 82 + Math.floor((batchNumber / totalBatches) * 6); // 82-88%
        updateProgress('ai_batch_processing', progressPercent, `Processing batch ${batchNumber}/${totalBatches} with AI...`);
      }

      try {
        const batchResults = await this.processBatchWithAI(batch, query);
        processedRules.push(...batchResults);
      } catch (error) {
        console.error('❌ AI batch processing failed, using basic processing:', error.message);
        // Fallback to basic processing
        const basicResults = batch.map(rule => this.basicRuleProcessing(rule));
        processedRules.push(...basicResults);
      }

      // Rate limiting between batches
      if (i + batchSize < rawRules.length) {
        await this.sleep(1000);
      }
    }

    return processedRules;
  }

  /**
   * Process a batch of rules with AI
   */
  async processBatchWithAI(rawRules, query) {
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: this.openaiApiKey });

    const businessContext = this.inferBusinessContext(query);

    const prompt = `
You are a compliance expert specializing in business regulations. Analyze these ${rawRules.length} rules for a business with this context:

BUSINESS CONTEXT: ${businessContext}
SEARCH QUERY: "${query}"

CRITICAL FILTERING - EXCLUDE ALL rules for:
- Healthcare: hospitals, Medicare/Medicaid, medical facilities, nursing, dialysis, patient care, clinical
- Manufacturing: factories, appliances, furnaces, washers, production equipment, assembly lines
- Aviation: aircraft, helicopters, airworthiness, flight operations (unless business specifically does air transport)
- Marine: offshore wind, marine mammals, maritime, vessels, ships
- Environmental: endangered species, wildlife protection, toxic substances, hazardous waste
- Consumer Products: toys, children's products, infant safety, nursing pillows
- Financial: mergers, acquisitions, derivatives, clearing agencies, premerger notifications
- Specialized: patent/trademark fees, cybersecurity labeling, copyright circumvention
- Food Programs: supplemental nutrition, food assistance, SNAP benefits
- Energy: nuclear, power plants, utility regulations, energy production

FOR TRANSPORTATION BUSINESS - ONLY INCLUDE rules about:
- Commercial vehicle safety and maintenance standards
- DOT regulations and commercial driver licensing
- Transportation business permits and licensing
- Vehicle inspection and safety requirements
- Employment law for drivers and transportation workers
- Business formation, tax obligations, and insurance
- Passenger safety (if passenger transport)
- Freight/cargo regulations (if freight transport)

RELEVANCE THRESHOLD: Only include rules with relevance_score > 0.8

Rules to process:
${rawRules.map((rule, index) => `
${index + 1}. Title: ${rule.title}
   Authority: ${rule.authority}
   Content: ${rule.content || rule.description}
   Source: ${rule.source}
`).join('\n')}

For RELEVANT rules only, return a JSON object with this structure:
{
  "description": "Clear description of what businesses must do",
  "priority": "critical|high|medium|low",
  "industries": ["Technology", "Software Development", "Digital Services"] (match business context),
  "industry_groups": ["tech", "digital_services", "professional_services"],
  "business_types": ["LLC", "Corporation", "Partnership", "Sole Proprietorship"],
  "states": ["specific states or ALL for federal"],
  "employee_count": {"min": 0, "max": 999999},
  "annual_revenue": {"min": 0, "max": 999999999},
  "special_conditions": ["has_employees", "handles_personal_data", "sells_online"],
  "compliance_steps": [
    {
      "step_number": 1,
      "step_description": "Specific action to take",
      "deadline": "When this must be completed",
      "estimated_cost": 0,
      "estimated_time": "Time estimate"
    }
  ],
  "estimated_cost": {"filing_fees": 0, "penalty_range": {"min": 0, "max": 1000}},
  "relevance_score": 0.0-1.0
}

ONLY include rules with relevance_score > 0.8. Return as JSON array, no other text.`;

    // Using gpt-5-nano for fast, cost-effective compliance rule processing
    const response = await openai.chat.completions.create({
      model: "gpt-5-nano",
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 50000
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('No content received from OpenAI');
    }

    let aiResults;
    try {
      aiResults = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('Invalid JSON response from AI');
    }

    // Combine AI results with original rule data
    return rawRules.map((rawRule, index) => {
      const aiResult = aiResults[index] || {};
      return this.createStructuredRule(rawRule, aiResult);
    });
  }

  /**
   * Basic rule processing without AI
   */
  basicRuleProcessing(rawRule) {
    const basicCategorization = {
      description: rawRule.description || `${rawRule.authority} compliance requirement`,
      priority: 'medium',
      industries: ['ALL'],
      industry_groups: [],
      business_types: ['LLC', 'Corporation', 'Partnership', 'Sole Proprietorship'],
      states: rawRule.level === 'federal' ? ['ALL'] : ['ALL'],
      employee_count: { min: 0, max: 999999 },
      annual_revenue: { min: 0, max: 999999999 },
      special_conditions: [],
      compliance_steps: [{
        step_number: 1,
        step_description: 'Review requirement and take appropriate action',
        deadline: 'As required',
        estimated_cost: 0,
        estimated_time: '1-2 hours'
      }],
      estimated_cost: { filing_fees: 0, penalty_range: { min: 0, max: 1000 } }
    };

    return this.createStructuredRule(rawRule, basicCategorization);
  }

  /**
   * Create a structured compliance rule from raw data and AI categorization
   */
  createStructuredRule(rawRule, categorization) {
    return {
      id: rawRule.id || uuidv4(),
      title: rawRule.title,
      description: categorization.description || rawRule.description,
      authority: rawRule.authority,
      level: rawRule.level,
      priority: categorization.priority || 'medium',
      applicability_criteria: {
        business_types: categorization.business_types || ['LLC', 'Corporation', 'Partnership', 'Sole Proprietorship'],
        states: categorization.states || ['ALL'],
        industries: categorization.industries || ['ALL'],
        industry_groups: categorization.industry_groups || [],
        employee_count: categorization.employee_count || { min: 0, max: 999999 },
        annual_revenue: categorization.annual_revenue || { min: 0, max: 999999999 },
        special_conditions: categorization.special_conditions || []
      },
      compliance_steps: categorization.compliance_steps || [{
        step_number: 1,
        step_description: 'Review requirement and take appropriate action',
        deadline: 'As required',
        estimated_cost: 0,
        estimated_time: '1-2 hours'
      }],
      estimated_cost: categorization.estimated_cost || { filing_fees: 0, penalty_range: { min: 0, max: 1000 } },
      tags: ['real-time-search', rawRule.source, rawRule.level, rawRule.authority.toLowerCase().replace(/\s+/g, '-')],
      canonical_id: this.generateCanonicalId(rawRule),
      jurisdiction: 'US',
      status: 'active',
      sources: [{
        source_id: `realtime_${Date.now()}`,
        source_type: 'api',
        source_name: rawRule.source,
        source_url: rawRule.sourceUrl,
        reliability_score: rawRule.source === 'regulations.gov' ? 10 : 8,
        last_updated: rawRule.scrapedAt,
        verification_status: 'verified',
        content_hash: crypto.createHash('md5').update(rawRule.content || rawRule.description).digest('hex')
      }],
      version: 1,
      last_verified: rawRule.scrapedAt,
      search_keywords: this.generateSearchKeywords(rawRule),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
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
   * Infer business context from search query
   */
  inferBusinessContext(query) {
    const text = query.toLowerCase();
    const contexts = [];

    // Technology/Digital
    if (text.includes('software') || text.includes('website') || text.includes('digital') ||
        text.includes('online') || text.includes('app') || text.includes('technology')) {
      contexts.push('Technology/Digital Services company');
    }

    // Professional Services
    if (text.includes('consulting') || text.includes('services') || text.includes('solutions')) {
      contexts.push('Professional Services provider');
    }

    // Small Business
    if (text.includes('small') || text.includes('startup') || text.includes('llc') || text.includes('sole proprietorship')) {
      contexts.push('Small Business');
    }

    // Online/Ecommerce
    if (text.includes('online') || text.includes('ecommerce') || text.includes('marketplace')) {
      contexts.push('Online/E-commerce business');
    }

    // Default context
    if (contexts.length === 0) {
      contexts.push('General business');
    }

    return contexts.join(', ');
  }

  /**
   * Build targeted query from search terms
   */
  buildTargetedQuery(searchTerms) {
    // Prioritize business-relevant terms
    const businessTerms = searchTerms.filter(term =>
      ['business', 'company', 'startup', 'llc', 'corporation', 'compliance', 'licensing', 'registration'].includes(term)
    );

    const techTerms = searchTerms.filter(term =>
      ['software', 'website', 'digital', 'online', 'technology', 'app', 'development'].includes(term)
    );

    // Build query with most relevant terms first
    const queryParts = [...businessTerms, ...techTerms, ...searchTerms.slice(0, 3)];
    return [...new Set(queryParts)].slice(0, 5).join(' ');
  }

  /**
   * Get relevant agencies based on search terms
   */
  getRelevantAgencies(searchTerms) {
    const agencies = [];

    // Technology/Digital business agencies
    if (searchTerms.some(term => ['software', 'digital', 'online', 'website', 'technology'].includes(term))) {
      agencies.push('FTC', 'FCC'); // Federal Trade Commission, Federal Communications Commission
    }

    // General business agencies
    agencies.push('SBA', 'IRS', 'DOL'); // Small Business Administration, Internal Revenue Service, Department of Labor

    return agencies.length > 0 ? agencies.join(',') : undefined;
  }

  /**
   * Generate search keywords from rule content
   */
  generateSearchKeywords(rawRule) {
    const text = `${rawRule.title} ${rawRule.content || rawRule.description}`.toLowerCase();
    const words = text.match(/\b\w+\b/g) || [];

    const stopWords = new Set(['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);

    const keywords = words
      .filter(word => word.length > 3 && !stopWords.has(word))
      .slice(0, 15);

    return [...new Set(keywords)];
  }

  /**
   * Store new rules in background (DISABLED - real-time only)
   */
  storeNewRulesInBackground(newRules) {
    if (newRules.length === 0) return;

    console.log(`🚫 Rule storage disabled - ${newRules.length} rules processed in real-time only`);
    // Storage is disabled - everything is real-time now
  }

  /**
   * Pre-warm cache with popular business categories
   */
  async preWarmCache() {
    const popularQueries = [
      'restaurant licensing',
      'healthcare compliance',
      'construction permits',
      'retail business requirements',
      'technology startup compliance',
      'manufacturing safety',
      'financial services regulations',
      'food service permits',
      'business tax requirements',
      'employee hiring requirements'
    ];

    console.log('🔥 Pre-warming cache with popular queries...');

    for (const query of popularQueries) {
      try {
        await this.search(query);
        console.log(`✅ Pre-warmed: ${query}`);
        await this.sleep(2000); // Rate limiting
      } catch (error) {
        console.warn(`⚠️ Pre-warm failed for "${query}":`, error.message);
      }
    }

    console.log('🎉 Cache pre-warming completed');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const stats = {
      totalCached: this.searchCache.size,
      popularTerms: Array.from(this.popularTerms.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10),
      processingQueue: this.processingQueue.size,
      cacheHitRate: 0
    };

    // Calculate cache hit rate
    const totalHits = Array.from(this.searchCache.values())
      .reduce((sum, cached) => sum + (cached.hitCount || 0), 0);
    const totalRequests = totalHits + this.processingQueue.size;

    if (totalRequests > 0) {
      stats.cacheHitRate = Math.round((totalHits / totalRequests) * 100);
    }

    return stats;
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = { RealTimeComplianceSearch };
