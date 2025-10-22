import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { BusinessProfileForm } from '../components/BusinessProfile/BusinessProfileForm';
import type { BusinessProfileFormData, BusinessProfile as BusinessProfileType } from '../types';
// import { businessProfileApi } from '../services/api';

export const BusinessProfile: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState<BusinessProfileType | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Generate or get session ID
  const getSessionId = () => {
    let sessionId = localStorage.getItem('business_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('business_session_id', sessionId);
    }
    return sessionId;
  };

  // Load existing profile
  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true);
      try {
        const sessionId = getSessionId();
        // const existingProfile = await businessProfileApi.get(sessionId);
        // if (existingProfile) {
        //   setProfile(existingProfile);
        // }
        console.log('Loading profile for session:', sessionId);
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleSubmit = async (data: BusinessProfileFormData) => {
    setIsSaving(true);
    setMessage(null);

    try {
      const sessionId = getSessionId();
      
      // Simulate API call
      console.log('Saving profile data:', data);

      // Create mock saved profile
      const savedProfile: BusinessProfileType = {
        ...data,
        session_id: sessionId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setProfile(savedProfile);
      setMessage({ type: 'success', text: 'Business profile saved successfully!' });
      
      // Auto-redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/', { 
          state: { message: 'Profile saved! You can now view your compliance recommendations.' }
        });
      }, 2000);
      
    } catch (error: any) {
      console.error('Error saving profile:', error);
      setMessage({ 
        type: 'error', 
        text: error.message || 'Failed to save business profile. Please try again.' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAnalyzeCompliance = () => {
    if (profile) {
      navigate('/rules', { 
        state: { businessProfile: profile, autoAnalyze: true }
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading business profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Building2 className="w-8 h-8 mr-3 text-primary-600" />
            Business Profile
          </h1>
          <p className="mt-2 text-gray-600">
            {profile 
              ? 'Update your business information to get the most accurate compliance recommendations.'
              : 'Create your business profile to receive personalized compliance recommendations.'
            }
          </p>
        </div>
        
        {profile && (
          <button
            onClick={handleAnalyzeCompliance}
            className="btn btn-primary"
          >
            Analyze Compliance
          </button>
        )}
      </div>

      {/* Success/Error Message */}
      {message && (
        <div className={`rounded-lg p-4 ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center">
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            )}
            <p className={`text-sm font-medium ${
              message.type === 'success' ? 'text-green-800' : 'text-red-800'
            }`}>
              {message.text}
            </p>
          </div>
        </div>
      )}

      {/* Current Profile Summary */}
      {profile && (
        <div className="card bg-primary-50 border-primary-200">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-primary-900 mb-2">
                Current Profile: {profile.business_name}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium text-primary-800">Type:</span>
                  <p className="text-primary-700">{profile.business_type}</p>
                </div>
                <div>
                  <span className="font-medium text-primary-800">State:</span>
                  <p className="text-primary-700">{profile.headquarters_state}</p>
                </div>
                <div>
                  <span className="font-medium text-primary-800">Employees:</span>
                  <p className="text-primary-700">{profile.employee_count}</p>
                </div>
                <div>
                  <span className="font-medium text-primary-800">Industry:</span>
                  <p className="text-primary-700">{profile.primary_industry}</p>
                </div>
              </div>
            </div>
            <div className="text-xs text-primary-600">
              Last updated: {new Date(profile.updated_at || profile.created_at || '').toLocaleDateString()}
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <BusinessProfileForm
        initialData={profile ? {
          business_name: profile.business_name,
          business_type: profile.business_type,
          headquarters_state: profile.headquarters_state,
          employee_count: profile.employee_count,
          annual_revenue: profile.annual_revenue,
          primary_industry: profile.primary_industry,
          naics_code: profile.naics_code,
          formation_date: profile.formation_date,
          has_employees: profile.has_employees,
          has_international_operations: profile.has_international_operations,
          handles_personal_data: profile.handles_personal_data,
          industry_specific_licenses: profile.industry_specific_licenses,
        } : undefined}
        onSubmit={handleSubmit}
        isLoading={isSaving}
      />

      {/* Help Text */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-3">
          Why do we need this information?
        </h3>
        <div className="space-y-2 text-sm text-gray-600">
          <p>
            • <strong>Business Type & State:</strong> Different business structures and states have unique compliance requirements
          </p>
          <p>
            • <strong>Employee Count:</strong> Many regulations apply based on the number of employees (e.g., 15+ for ADA, 50+ for FMLA)
          </p>
          <p>
            • <strong>Revenue & Industry:</strong> Helps identify industry-specific regulations and thresholds
          </p>
          <p>
            • <strong>Additional Information:</strong> Determines applicability of data privacy, international trade, and employment laws
          </p>
        </div>
        <p className="mt-4 text-xs text-gray-500">
          Your information is stored securely and used only to provide personalized compliance recommendations.
        </p>
      </div>
    </div>
  );
};
