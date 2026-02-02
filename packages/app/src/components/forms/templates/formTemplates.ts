/**
 * Form Templates
 * Pre-built form templates for common use cases
 */

import { FormDefinition, FormField } from '../FormBuilder';

export interface FormTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  definition: FormDefinition;
}

const contactFormFields: FormField[] = [
  {
    id: 'field_contact_1',
    type: 'text',
    label: 'Full Name',
    name: 'full_name',
    placeholder: 'Enter your full name',
    required: true,
    width: 'full',
  },
  {
    id: 'field_contact_2',
    type: 'email',
    label: 'Email Address',
    name: 'email',
    placeholder: 'your.email@example.com',
    required: true,
    width: 'half',
  },
  {
    id: 'field_contact_3',
    type: 'phone',
    label: 'Phone Number',
    name: 'phone',
    placeholder: '+1 (555) 123-4567',
    required: false,
    width: 'half',
  },
  {
    id: 'field_contact_4',
    type: 'dropdown',
    label: 'Subject',
    name: 'subject',
    placeholder: 'Select a subject',
    required: true,
    width: 'full',
    options: [
      { value: 'general', label: 'General Inquiry' },
      { value: 'support', label: 'Technical Support' },
      { value: 'sales', label: 'Sales Question' },
      { value: 'feedback', label: 'Feedback' },
    ],
  },
  {
    id: 'field_contact_5',
    type: 'textarea',
    label: 'Message',
    name: 'message',
    placeholder: 'Type your message here...',
    required: true,
    width: 'full',
    validation: {
      minLength: 10,
      maxLength: 1000,
    },
  },
];

const registrationFormFields: FormField[] = [
  {
    id: 'field_reg_1',
    type: 'heading',
    label: 'Personal Information',
    name: 'personal_info_heading',
  },
  {
    id: 'field_reg_2',
    type: 'text',
    label: 'First Name',
    name: 'first_name',
    placeholder: 'John',
    required: true,
    width: 'half',
  },
  {
    id: 'field_reg_3',
    type: 'text',
    label: 'Last Name',
    name: 'last_name',
    placeholder: 'Doe',
    required: true,
    width: 'half',
  },
  {
    id: 'field_reg_4',
    type: 'email',
    label: 'Email Address',
    name: 'email',
    placeholder: 'john.doe@example.com',
    required: true,
    width: 'full',
  },
  {
    id: 'field_reg_5',
    type: 'password',
    label: 'Password',
    name: 'password',
    placeholder: 'Create a strong password',
    required: true,
    width: 'half',
    validation: {
      minLength: 8,
      pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$',
      customMessage: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
    },
  },
  {
    id: 'field_reg_6',
    type: 'password',
    label: 'Confirm Password',
    name: 'confirm_password',
    placeholder: 'Re-enter your password',
    required: true,
    width: 'half',
  },
  {
    id: 'field_reg_7',
    type: 'divider',
    label: '',
    name: 'divider_1',
  },
  {
    id: 'field_reg_8',
    type: 'heading',
    label: 'Additional Details',
    name: 'additional_heading',
  },
  {
    id: 'field_reg_9',
    type: 'date',
    label: 'Date of Birth',
    name: 'date_of_birth',
    required: false,
    width: 'half',
    validation: {
      max: new Date().toISOString().split('T')[0],
    },
  },
  {
    id: 'field_reg_10',
    type: 'dropdown',
    label: 'Country',
    name: 'country',
    required: false,
    width: 'half',
    options: [
      { value: 'us', label: 'United States' },
      { value: 'uk', label: 'United Kingdom' },
      { value: 'ca', label: 'Canada' },
      { value: 'au', label: 'Australia' },
      { value: 'other', label: 'Other' },
    ],
  },
  {
    id: 'field_reg_11',
    type: 'checkbox',
    label: 'I agree to the Terms of Service and Privacy Policy',
    name: 'terms_agreement',
    required: true,
  },
  {
    id: 'field_reg_12',
    type: 'checkbox',
    label: 'Send me promotional emails and updates',
    name: 'marketing_emails',
    required: false,
  },
];

const feedbackFormFields: FormField[] = [
  {
    id: 'field_feedback_1',
    type: 'text',
    label: 'Name',
    name: 'name',
    placeholder: 'Your name (optional)',
    required: false,
    width: 'full',
  },
  {
    id: 'field_feedback_2',
    type: 'email',
    label: 'Email',
    name: 'email',
    placeholder: 'your.email@example.com (optional)',
    required: false,
    width: 'full',
  },
  {
    id: 'field_feedback_3',
    type: 'radio',
    label: 'How would you rate your experience?',
    name: 'rating',
    required: true,
    options: [
      { value: '5', label: '⭐⭐⭐⭐⭐ Excellent' },
      { value: '4', label: '⭐⭐⭐⭐ Good' },
      { value: '3', label: '⭐⭐⭐ Average' },
      { value: '2', label: '⭐⭐ Poor' },
      { value: '1', label: '⭐ Very Poor' },
    ],
  },
  {
    id: 'field_feedback_4',
    type: 'checkbox',
    label: 'What did you like? (Select all that apply)',
    name: 'liked_features',
    required: false,
    options: [
      { value: 'ease_of_use', label: 'Easy to use' },
      { value: 'design', label: 'Great design' },
      { value: 'features', label: 'Useful features' },
      { value: 'performance', label: 'Fast performance' },
      { value: 'support', label: 'Good support' },
    ],
  },
  {
    id: 'field_feedback_5',
    type: 'textarea',
    label: 'Additional Comments',
    name: 'comments',
    placeholder: 'Tell us more about your experience...',
    required: false,
    helpText: 'Your feedback helps us improve our service',
  },
];

const jobApplicationFields: FormField[] = [
  {
    id: 'field_job_1',
    type: 'heading',
    label: 'Position Details',
    name: 'position_heading',
  },
  {
    id: 'field_job_2',
    type: 'dropdown',
    label: 'Position Applied For',
    name: 'position',
    required: true,
    options: [
      { value: 'software_engineer', label: 'Software Engineer' },
      { value: 'product_manager', label: 'Product Manager' },
      { value: 'designer', label: 'UI/UX Designer' },
      { value: 'data_analyst', label: 'Data Analyst' },
      { value: 'marketing', label: 'Marketing Specialist' },
    ],
  },
  {
    id: 'field_job_3',
    type: 'radio',
    label: 'Employment Type',
    name: 'employment_type',
    required: true,
    options: [
      { value: 'full_time', label: 'Full Time' },
      { value: 'part_time', label: 'Part Time' },
      { value: 'contract', label: 'Contract' },
      { value: 'internship', label: 'Internship' },
    ],
  },
  {
    id: 'field_job_4',
    type: 'divider',
    label: '',
    name: 'divider_job_1',
  },
  {
    id: 'field_job_5',
    type: 'heading',
    label: 'Personal Information',
    name: 'personal_heading',
  },
  {
    id: 'field_job_6',
    type: 'text',
    label: 'Full Name',
    name: 'full_name',
    required: true,
    width: 'full',
  },
  {
    id: 'field_job_7',
    type: 'email',
    label: 'Email Address',
    name: 'email',
    required: true,
    width: 'half',
  },
  {
    id: 'field_job_8',
    type: 'phone',
    label: 'Phone Number',
    name: 'phone',
    required: true,
    width: 'half',
  },
  {
    id: 'field_job_9',
    type: 'text',
    label: 'LinkedIn Profile',
    name: 'linkedin',
    placeholder: 'https://linkedin.com/in/yourprofile',
    required: false,
    width: 'full',
  },
  {
    id: 'field_job_10',
    type: 'divider',
    label: '',
    name: 'divider_job_2',
  },
  {
    id: 'field_job_11',
    type: 'heading',
    label: 'Experience & Documents',
    name: 'experience_heading',
  },
  {
    id: 'field_job_12',
    type: 'number',
    label: 'Years of Experience',
    name: 'years_experience',
    required: true,
    width: 'half',
    validation: {
      min: 0,
      max: 50,
    },
  },
  {
    id: 'field_job_13',
    type: 'text',
    label: 'Current Company',
    name: 'current_company',
    required: false,
    width: 'half',
  },
  {
    id: 'field_job_14',
    type: 'file',
    label: 'Resume/CV',
    name: 'resume',
    required: true,
    helpText: 'PDF or Word document (Max 5MB)',
    validation: {
      pattern: '.pdf,.doc,.docx',
    },
  },
  {
    id: 'field_job_15',
    type: 'file',
    label: 'Cover Letter',
    name: 'cover_letter',
    required: false,
    helpText: 'PDF or Word document (Max 5MB)',
    validation: {
      pattern: '.pdf,.doc,.docx',
    },
  },
  {
    id: 'field_job_16',
    type: 'textarea',
    label: 'Why do you want to work with us?',
    name: 'motivation',
    required: true,
    validation: {
      minLength: 50,
      maxLength: 500,
    },
  },
];

const eventRegistrationFields: FormField[] = [
  {
    id: 'field_event_1',
    type: 'heading',
    label: 'Event Registration',
    name: 'event_heading',
  },
  {
    id: 'field_event_2',
    type: 'text',
    label: 'Full Name',
    name: 'full_name',
    required: true,
    width: 'full',
  },
  {
    id: 'field_event_3',
    type: 'email',
    label: 'Email Address',
    name: 'email',
    required: true,
    width: 'half',
  },
  {
    id: 'field_event_4',
    type: 'phone',
    label: 'Phone Number',
    name: 'phone',
    required: true,
    width: 'half',
  },
  {
    id: 'field_event_5',
    type: 'text',
    label: 'Organization',
    name: 'organization',
    required: false,
    width: 'full',
  },
  {
    id: 'field_event_6',
    type: 'dropdown',
    label: 'Number of Attendees',
    name: 'attendees',
    required: true,
    width: 'half',
    options: [
      { value: '1', label: '1 Person' },
      { value: '2', label: '2 People' },
      { value: '3', label: '3 People' },
      { value: '4', label: '4 People' },
      { value: '5+', label: '5+ People' },
    ],
  },
  {
    id: 'field_event_7',
    type: 'radio',
    label: 'Dietary Requirements',
    name: 'dietary',
    required: false,
    options: [
      { value: 'none', label: 'No restrictions' },
      { value: 'vegetarian', label: 'Vegetarian' },
      { value: 'vegan', label: 'Vegan' },
      { value: 'halal', label: 'Halal' },
      { value: 'kosher', label: 'Kosher' },
      { value: 'other', label: 'Other (specify below)' },
    ],
  },
  {
    id: 'field_event_8',
    type: 'textarea',
    label: 'Special Requirements',
    name: 'special_requirements',
    placeholder: 'Any allergies, accessibility needs, or other requirements',
    required: false,
  },
  {
    id: 'field_event_9',
    type: 'checkbox',
    label: 'I would like to receive updates about future events',
    name: 'future_events',
    required: false,
  },
];

export const formTemplates: FormTemplate[] = [
  {
    id: 'contact_form',
    name: 'Contact Form',
    description: 'Simple contact form for customer inquiries',
    category: 'General',
    definition: {
      name: 'Contact Us',
      description: 'Get in touch with our team',
      fields: contactFormFields,
      submitButtonText: 'Send Message',
      successMessage: 'Thank you for contacting us! We will respond within 24 hours.',
    },
  },
  {
    id: 'registration_form',
    name: 'Registration Form',
    description: 'User registration form with validation',
    category: 'Authentication',
    definition: {
      name: 'Create Account',
      description: 'Join our platform today',
      fields: registrationFormFields,
      submitButtonText: 'Create Account',
      successMessage: 'Your account has been created successfully! Check your email for verification.',
    },
  },
  {
    id: 'feedback_form',
    name: 'Feedback Form',
    description: 'Collect user feedback and ratings',
    category: 'Survey',
    definition: {
      name: 'We Value Your Feedback',
      description: 'Help us improve by sharing your thoughts',
      fields: feedbackFormFields,
      submitButtonText: 'Submit Feedback',
      successMessage: 'Thank you for your feedback! Your input is valuable to us.',
    },
  },
  {
    id: 'job_application',
    name: 'Job Application',
    description: 'Complete job application with file uploads',
    category: 'HR',
    definition: {
      name: 'Job Application',
      description: 'Apply for a position at our company',
      fields: jobApplicationFields,
      submitButtonText: 'Submit Application',
      successMessage: 'Your application has been received. We will contact you within 5-7 business days.',
    },
  },
  {
    id: 'event_registration',
    name: 'Event Registration',
    description: 'Register for events and conferences',
    category: 'Events',
    definition: {
      name: 'Event Registration',
      description: 'Register for our upcoming event',
      fields: eventRegistrationFields,
      submitButtonText: 'Register Now',
      successMessage: 'You are registered! A confirmation email has been sent with event details.',
    },
  },
];

// Helper function to get template by ID
export function getFormTemplate(id: string): FormTemplate | undefined {
  return formTemplates.find(template => template.id === id);
}

// Helper function to get templates by category
export function getFormTemplatesByCategory(category: string): FormTemplate[] {
  return formTemplates.filter(template => template.category === category);
}

// Get all unique categories
export function getFormCategories(): string[] {
  const categories = new Set(formTemplates.map(template => template.category));
  return Array.from(categories);
}