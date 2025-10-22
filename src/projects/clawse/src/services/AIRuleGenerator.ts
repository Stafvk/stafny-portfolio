import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { ComplianceRule } from '../types/ComplianceRule';
import crypto from 'crypto';

export class AIRuleGenerator {
  private openai: OpenAI;
  
  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }
  
  async generateFederalRules(count: number = 10): Promise<ComplianceRule[]> {
    const prompt = this.createFederalRulesPrompt(count);
    
    try {
      console.log(`🤖 Generating ${count} federal compliance rules with OpenAI...`);
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-5-nano",
        messages: [{ role: "user", content: prompt }],
        max_completion_tokens: 50000
      });
      
      const content = response.choices[0]?.message?.content;

      if (!content) throw new Error('No content received from OpenAI');
      
      const rules = this.parseAIResponse(content);
      console.log(`✅ Successfully generated ${rules.length} compliance rules`);
      
      return rules;
      
    } catch (error) {
      console.error('❌ Error generating rules with AI:', error);
      throw error;
    }
  }
  
  async generateStateRules(state: string, count: number = 5): Promise<ComplianceRule[]> {
    const prompt = this.createStateRulesPrompt(state, count);
    
    try {
      console.log(`🤖 Generating ${count} ${state} state compliance rules...`);
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-5-nano",
        messages: [{ role: "user", content: prompt }],
        max_completion_tokens: 50000
      });
      
      const content = response.choices[0]?.message?.content;

      if (!content) throw new Error('No content received from OpenAI');
      
      const rules = this.parseAIResponse(content);
      console.log(`✅ Successfully generated ${rules.length} ${state} state rules`);
      
      return rules;
      
    } catch (error) {
      console.error(`❌ Error generating ${state} state rules:`, error);
      throw error;
    }
  }
  
  private createFederalRulesPrompt(count: number): string {
    return `Generate ${count} US federal business compliance rules as JSON array.

Return only JSON array:
[
  {
    "title": "EIN Registration",
    "description": "Get EIN from IRS",
    "authority": "IRS",
    "level": "federal",
    "priority": "high",
    "applicability_criteria": {
      "business_types": ["LLC", "Corp"],
      "employee_count": {"min": 1, "max": 999999},
      "annual_revenue": {"min": 0, "max": 999999999},
      "industries": ["ALL"],
      "states": ["ALL"],
      "special_conditions": []
    },
    "compliance_steps": [
      {
        "step_number": 1,
        "step_description": "File Form SS-4",
        "deadline": "30 days",
        "required_forms": [{"form_name": "SS-4", "form_url": "irs.gov"}],
        "estimated_cost": 0,
        "estimated_time": "30 minutes"
      }
    ],
    "estimated_cost": {"filing_fees": 0, "penalty_range": {"min": 50, "max": 500}},
    "tags": ["tax", "federal"]
  }
]`;
  }
  
  private createStateRulesPrompt(state: string, count: number): string {
    return `Generate ${count} ${state} state business compliance rules as JSON array.

Return only JSON array:
[
  {
    "title": "Business Registration",
    "description": "Register business with ${state}",
    "authority": "${state} Secretary of State",
    "level": "state",
    "priority": "high",
    "applicability_criteria": {
      "business_types": ["LLC", "Corp"],
      "employee_count": {"min": 0, "max": 999999},
      "annual_revenue": {"min": 0, "max": 999999999},
      "industries": ["ALL"],
      "states": ["${state}"],
      "special_conditions": []
    },
    "compliance_steps": [
      {
        "step_number": 1,
        "step_description": "File registration form",
        "deadline": "30 days",
        "required_forms": [{"form_name": "Registration", "form_url": "${state.toLowerCase()}.gov"}],
        "estimated_cost": 100,
        "estimated_time": "1 hour"
      }
    ],
    "estimated_cost": {"filing_fees": 100, "penalty_range": {"min": 50, "max": 1000}},
    "tags": ["registration", "state"]
  }
]`;
  }
  
  private parseAIResponse(content: string): ComplianceRule[] {
    try {
      // Multiple cleaning strategies to handle various AI response formats
      let cleanContent = content;

      // Strategy 1: Remove markdown code blocks
      cleanContent = cleanContent
        .replace(/```json\n?/gi, '')
        .replace(/```\n?/g, '')
        .replace(/```/g, '')
        .trim();

      // Strategy 2: Remove numbered list formatting
      cleanContent = cleanContent.replace(/^\d+\.\s*/gm, '');

      // Strategy 3: Extract complete JSON from mixed content
      // Look for the main JSON array or object, not fragments
      const arrayMatch = cleanContent.match(/(\[[\s\S]*\])/);
      const objectMatch = cleanContent.match(/(\{[\s\S]*\})/);

      if (arrayMatch && arrayMatch[1]) {
        try {
          JSON.parse(arrayMatch[1].trim());
          cleanContent = arrayMatch[1].trim();
        } catch (e) {
          // If array parsing fails, continue with other strategies
        }
      } else if (objectMatch && objectMatch[1]) {
        try {
          JSON.parse(objectMatch[1].trim());
          cleanContent = objectMatch[1].trim();
        } catch (e) {
          // If object parsing fails, continue with other strategies
        }
      }

      // Strategy 4: Handle truncated JSON by finding the largest valid JSON
      if (!cleanContent.startsWith('[') && !cleanContent.startsWith('{')) {
        const startIndex = Math.max(cleanContent.indexOf('['), cleanContent.indexOf('{'));
        if (startIndex >= 0) {
          cleanContent = cleanContent.substring(startIndex);
        }
      }

      // Strategy 5: Try to fix common JSON issues
      cleanContent = cleanContent
        .replace(/,\s*}/g, '}')  // Remove trailing commas
        .replace(/,\s*]/g, ']')  // Remove trailing commas in arrays
        .trim();

      let rawRules;
      try {
        rawRules = JSON.parse(cleanContent);
      } catch (parseError) {
        // Last resort: try to extract individual JSON objects
        const objectMatches = cleanContent.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
        if (objectMatches && objectMatches.length > 0) {
          rawRules = objectMatches.map(match => {
            try {
              return JSON.parse(match);
            } catch (e) {
              return null;
            }
          }).filter(rule => rule !== null);
        } else {
          throw parseError;
        }
      }

      let rulesArray: any[];

      if (Array.isArray(rawRules)) {
        rulesArray = rawRules;
      } else if (typeof rawRules === 'object' && rawRules !== null) {
        // Handle case where AI returns an object with numbered keys
        rulesArray = Object.values(rawRules);
      } else {
        throw new Error('AI response is neither an array nor an object with rules');
      }

      // Filter out any invalid rules and log what we're filtering
      const validRules = rulesArray.filter(rule => {
        if (!rule || typeof rule !== 'object') {
          console.log('❌ Filtered out non-object rule:', rule);
          return false;
        }

        // Check for essential fields (title OR name, and some content)
        const hasTitle = rule.title || rule.name || rule.complianceRuleId;
        const hasContent = rule.description || rule.requirement || rule.requirements ||
                          (rule.compliance_steps && rule.compliance_steps.length > 0);

        if (!hasTitle || !hasContent) {
          console.log('❌ Filtered out rule missing essential fields:', {
            hasTitle: !!hasTitle,
            hasContent: !!hasContent,
            rule: JSON.stringify(rule).substring(0, 200)
          });
          return false;
        }

        return true;
      });

      console.log(`✅ Validated ${validRules.length} out of ${rulesArray.length} rules`);

      if (validRules.length === 0) {
        console.log('❌ No valid rules found after filtering');
        console.log('Raw rules array:', rulesArray.map(r => ({
          title: r?.title,
          name: r?.name,
          description: r?.description?.substring(0, 100)
        })));
        throw new Error('No valid rules found in AI response');
      }

      rulesArray = validRules;

      return rulesArray.map(rule => this.enhanceRule(rule));

    } catch (error) {
      console.error('❌ Error parsing AI response:', error);
      console.log('Raw content (first 1000 chars):', content.substring(0, 1000));

      // Fallback: return empty array instead of throwing
      console.log('⚠️  Returning empty array as fallback');
      return [];
    }
  }
  
  private enhanceRule(rawRule: any): ComplianceRule {
    const now = new Date().toISOString();
    const id = uuidv4();

    // Ensure required fields exist with defaults
    const title = rawRule.title || rawRule.name || 'Untitled Rule';
    const authority = rawRule.authority || 'Unknown Authority';
    const level = rawRule.level || 'federal';

    // Generate canonical ID for deduplication
    const canonicalContent = `${title}|${authority}|${level}`;
    const canonical_id = crypto.createHash('md5').update(canonicalContent).digest('hex');

    // Generate search keywords
    const search_keywords = this.generateSearchKeywords({ ...rawRule, title, authority });
    
    return {
      ...rawRule,
      title,
      authority,
      level,
      id,
      canonical_id,
      jurisdiction: this.determineJurisdiction(level, authority),
      status: 'active',
      sources: [{
        source_id: 'ai_generated',
        source_type: 'ai_generated',
        source_name: 'OpenAI GPT-5-nano',
        source_url: 'https://openai.com',
        reliability_score: 7, // AI-generated gets medium reliability
        last_updated: now,
        verification_status: 'pending',
        content_hash: crypto.createHash('md5').update(JSON.stringify(rawRule)).digest('hex')
      }],
      version: 1,
      created_at: now,
      updated_at: now,
      last_verified: now,
      search_keywords
    };
  }
  
  private determineJurisdiction(level: string, authority: string): string {
    if (level === 'federal') return 'US';
    if (authority.includes('California')) return 'CA';
    if (authority.includes('Texas')) return 'TX';
    if (authority.includes('New York')) return 'NY';
    if (authority.includes('Florida')) return 'FL';
    return 'US'; // Default fallback
  }
  
  private generateSearchKeywords(rule: any): string[] {
    const keywords = new Set<string>();

    // Add title words (with null check)
    if (rule.title && typeof rule.title === 'string') {
      rule.title.toLowerCase().split(' ').forEach((word: string) => {
        if (word.length > 3) keywords.add(word);
      });
    }

    // Add authority (with null check)
    if (rule.authority && typeof rule.authority === 'string') {
      keywords.add(rule.authority.toLowerCase());
    }
    
    // Add tags
    if (rule.tags) {
      rule.tags.forEach((tag: string) => keywords.add(tag.toLowerCase()));
    }
    
    // Add business types
    if (rule.applicability_criteria?.business_types) {
      rule.applicability_criteria.business_types.forEach((type: string) => {
        keywords.add(type.toLowerCase());
      });
    }
    
    return Array.from(keywords);
  }

  async generateIndustrySpecificRules(industry: string, naicsCode: string, count: number = 5): Promise<ComplianceRule[]> {
    const prompt = this.createIndustryRulesPrompt(industry, naicsCode, count);

    try {
      console.log(`🤖 Generating ${count} ${industry} industry-specific rules...`);

      const response = await this.openai.chat.completions.create({
        model: "gpt-5-nano",
        messages: [{ role: "user", content: prompt }],
        max_completion_tokens: 50000
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error('No content received from OpenAI');

      const rules = this.parseAIResponse(content);
      console.log(`✅ Successfully generated ${rules.length} ${industry} industry rules`);

      return rules;

    } catch (error) {
      console.error(`❌ Error generating ${industry} industry rules:`, error);
      throw error;
    }
  }

  private createIndustryRulesPrompt(industry: string, naicsCode: string, count: number): string {
    return `
Generate ${count} realistic compliance requirements specific to the ${industry} industry (NAICS: ${naicsCode}).

Focus on industry-specific regulations like:
- Health and safety requirements
- Licensing and permits
- Environmental regulations
- Consumer protection
- Industry-specific reporting

Use the same JSON structure but with:
- "industries": ["${naicsCode}"]
- Industry-specific authorities and requirements
- Realistic costs and deadlines for ${industry} businesses

Generate ${count} different ${industry} industry compliance rules.
`;
  }

  /**
   * Process scraped rule content with AI to create structured ComplianceRule
   */
  async processScrapedRule(rawRule: any): Promise<ComplianceRule | null> {
    try {
      const prompt = `
You are a compliance expert. Convert this scraped government rule into a structured compliance requirement.

**Scraped Content:**
Title: ${rawRule.title}
Authority: ${rawRule.authority}
Level: ${rawRule.level}
Source URL: ${rawRule.sourceUrl}
Content: ${rawRule.content.substring(0, 2000)}...

**Instructions:**
1. Extract the core compliance requirement
2. Determine what types of businesses this applies to
3. Identify specific steps businesses must take
4. Estimate costs and timeframes
5. Determine priority level (critical, high, medium, low)

**Return a JSON object with this exact structure:**
{
  "title": "Clear, concise title of the requirement",
  "description": "Brief description of what businesses must do",
  "authority": "${rawRule.authority}",
  "level": "${rawRule.level}",
  "priority": "critical|high|medium|low",
  "applicability_criteria": {
    "business_types": ["LLC", "Corporation", "Partnership", "Sole Proprietorship"],
    "states": ["ALL"],
    "industries": ["ALL"],
    "employee_count": {"min": 0, "max": 999999},
    "annual_revenue": {"min": 0, "max": 999999999},
    "special_conditions": []
  },
  "compliance_steps": [
    {
      "step_number": 1,
      "step_description": "Specific action to take",
      "deadline": "When this must be completed",
      "required_forms": [{"form_name": "Form Name", "form_url": "URL if available"}],
      "estimated_cost": 0,
      "estimated_time": "Time estimate"
    }
  ],
  "estimated_cost": {
    "filing_fees": 0,
    "penalty_range": {"min": 0, "max": 1000}
  },
  "tags": ["relevant", "keywords"]
}

Only return the JSON object, no other text.`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-5-nano",
        messages: [{ role: "user", content: prompt }],
        max_completion_tokens: 50000,
        temperature: 0.3
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (!content) return null;

      // Parse AI response
      const aiRule = JSON.parse(content);

      // Enhance with metadata using existing method
      const enhancedRule = this.enhanceRule({
        ...aiRule,
        sources: [{
          source_id: 'scraped_' + Date.now(),
          source_type: 'government_website',
          source_name: rawRule.authority,
          source_url: rawRule.sourceUrl,
          reliability_score: 9, // High reliability for government sources
          last_updated: rawRule.scrapedAt,
          verification_status: 'verified',
          content_hash: crypto.createHash('md5').update(rawRule.content).digest('hex')
        }]
      });

      return enhancedRule;

    } catch (error) {
      console.error('Error processing scraped rule with AI:', error);
      return null;
    }
  }
}
