// Core supplier types shared across the application

export interface Supplier {
  id: string;
  name: string;
  capabilities: string[];
  location: string;
  rating: number;
  priceRange: {
    min: number;
    max: number;
    currency: string;
  };
  leadTime: string;
  certifications: string[];
}

export interface SearchCriteria {
  category: string;
  location?: string;
  specifications: string[];
  totalFound: number;
  searchEnhanced: boolean;
  searchResults?: string;
  fallbackReason?: string;
  error?: string;
}

export interface SupplierSearchResult {
  suppliers: Supplier[];
  searchCriteria: SearchCriteria;
}

export interface ProjectRequirements {
  category: string;
  specifications: string[];
  budget: {
    min: number;
    max: number;
    currency: string;
  };
  timeline: string;
  location?: string;
  quantity: number;
}

export interface EvaluationScore {
  supplierId: string;
  score: number;
  criteria: string[];
}

export interface Recommendation {
  supplierId: string;
  rank: number;
  reasoning: string;
}

export interface SupplierEvaluation {
  scores: EvaluationScore[];
  recommendations: Recommendation[];
}

export interface SupplierProfile {
  id: string;
  name: string;
  capabilities: string[];
  location: string;
  rating: number;
  priceRange: {
    min: number;
    max: number;
    currency: string;
  };
  leadTime: string;
  certifications: string[];
  riskAssessment?: {
    financialStability: number;
    qualityConsistency: number;
    deliveryReliability: number;
    communicationScore: number;
  };
  performanceHistory?: Array<{
    date: string;
    score: number;
    project: string;
  }>;
}

export interface ProfileManagerResult {
  success: boolean;
  profile?: SupplierProfile;
  message?: string;
}

export interface RecommendationParams {
  suppliers: Supplier[];
  projectRequirements: ProjectRequirements;
  evaluationScores: EvaluationScore[];
  topN?: number;
  recommendationStrategy?: 'balanced' | 'cost-focused' | 'quality-focused' | 'location-focused';
}

export interface RecommendationResult {
  recommendations: Recommendation[];
  summary?: string;
  totalEvaluated: number;
  strategy: string;
}
