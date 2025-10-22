import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, Users, DollarSign, MapPin, Calendar, Factory } from 'lucide-react';
import type { BusinessProfileFormData } from '../../types';

const businessProfileSchema = z.object({
  business_name: z.string().min(1, 'Business name is required'),
  business_type: z.enum(['LLC', 'Corporation', 'Partnership', 'Sole Proprietorship', 'Non-profit']),
  headquarters_state: z.string().min(2, 'State is required'),
  employee_count: z.number().min(0, 'Employee count must be 0 or greater'),
  annual_revenue: z.number().min(0, 'Annual revenue must be 0 or greater'),
  primary_industry: z.string().min(1, 'Primary industry is required'),
  naics_code: z.string().optional(),
  formation_date: z.string().optional(),
  has_employees: z.boolean().optional(),
  has_international_operations: z.boolean().optional(),
  handles_personal_data: z.boolean().optional(),
  industry_specific_licenses: z.array(z.string()).optional(),
});

interface BusinessProfileFormProps {
  initialData?: Partial<BusinessProfileFormData>;
  onSubmit: (data: BusinessProfileFormData) => void;
  isLoading?: boolean;
}

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

const BUSINESS_TYPES = [
  'LLC',
  'Corporation', 
  'Partnership',
  'Sole Proprietorship',
  'Non-profit'
] as const;

const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Finance',
  'Retail',
  'Manufacturing',
  'Construction',
  'Real Estate',
  'Professional Services',
  'Food & Beverage',
  'Transportation',
  'Education',
  'Entertainment',
  'Agriculture',
  'Energy',
  'Other'
];

export const BusinessProfileForm: React.FC<BusinessProfileFormProps> = ({
  initialData,
  onSubmit,
  isLoading = false,
}) => {
  const {
    register,
    handleSubmit,
    // watch,
    formState: { errors },
  } = useForm<BusinessProfileFormData>({
    resolver: zodResolver(businessProfileSchema),
    defaultValues: {
      business_name: '',
      business_type: 'LLC',
      headquarters_state: '',
      employee_count: 0,
      annual_revenue: 0,
      primary_industry: '',
      naics_code: '',
      formation_date: '',
      has_employees: false,
      has_international_operations: false,
      handles_personal_data: false,
      industry_specific_licenses: [],
      ...initialData,
    },
  });

  // const hasEmployees = watch('has_employees');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Basic Information */}
      <div className="card">
        <div className="flex items-center space-x-2 mb-6">
          <Building2 className="w-5 h-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="form-label">
              Business Name *
            </label>
            <input
              type="text"
              {...register('business_name')}
              className="form-input"
              placeholder="Enter your business name"
            />
            {errors.business_name && (
              <p className="mt-1 text-sm text-red-600">{errors.business_name.message}</p>
            )}
          </div>

          <div>
            <label className="form-label">
              Business Type *
            </label>
            <select {...register('business_type')} className="form-input">
              {BUSINESS_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            {errors.business_type && (
              <p className="mt-1 text-sm text-red-600">{errors.business_type.message}</p>
            )}
          </div>

          <div>
            <label className="form-label">
              <MapPin className="w-4 h-4 inline mr-1" />
              Headquarters State *
            </label>
            <select {...register('headquarters_state')} className="form-input">
              <option value="">Select a state</option>
              {US_STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
            {errors.headquarters_state && (
              <p className="mt-1 text-sm text-red-600">{errors.headquarters_state.message}</p>
            )}
          </div>

          <div>
            <label className="form-label">
              <Calendar className="w-4 h-4 inline mr-1" />
              Formation Date
            </label>
            <input
              type="date"
              {...register('formation_date')}
              className="form-input"
            />
          </div>
        </div>
      </div>

      {/* Business Details */}
      <div className="card">
        <div className="flex items-center space-x-2 mb-6">
          <Factory className="w-5 h-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-900">Business Details</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="form-label">
              Primary Industry *
            </label>
            <select {...register('primary_industry')} className="form-input">
              <option value="">Select an industry</option>
              {INDUSTRIES.map((industry) => (
                <option key={industry} value={industry}>
                  {industry}
                </option>
              ))}
            </select>
            {errors.primary_industry && (
              <p className="mt-1 text-sm text-red-600">{errors.primary_industry.message}</p>
            )}
          </div>

          <div>
            <label className="form-label">
              NAICS Code
            </label>
            <input
              type="text"
              {...register('naics_code')}
              className="form-input"
              placeholder="e.g., 541511"
            />
            <p className="mt-1 text-xs text-gray-500">
              Optional: North American Industry Classification System code
            </p>
          </div>

          <div>
            <label className="form-label">
              <Users className="w-4 h-4 inline mr-1" />
              Employee Count *
            </label>
            <input
              type="number"
              {...register('employee_count', { valueAsNumber: true })}
              className="form-input"
              min="0"
              placeholder="0"
            />
            {errors.employee_count && (
              <p className="mt-1 text-sm text-red-600">{errors.employee_count.message}</p>
            )}
          </div>

          <div>
            <label className="form-label">
              <DollarSign className="w-4 h-4 inline mr-1" />
              Annual Revenue *
            </label>
            <input
              type="number"
              {...register('annual_revenue', { valueAsNumber: true })}
              className="form-input"
              min="0"
              placeholder="0"
            />
            {errors.annual_revenue && (
              <p className="mt-1 text-sm text-red-600">{errors.annual_revenue.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Additional Information */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Additional Information</h3>

        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              {...register('has_employees')}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label className="ml-2 text-sm text-gray-700">
              This business has employees
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              {...register('has_international_operations')}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label className="ml-2 text-sm text-gray-700">
              This business has international operations
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              {...register('handles_personal_data')}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label className="ml-2 text-sm text-gray-700">
              This business handles personal data (PII)
            </label>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading}
          className="btn btn-primary px-8 py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Saving...' : 'Save Business Profile'}
        </button>
      </div>
    </form>
  );
};
