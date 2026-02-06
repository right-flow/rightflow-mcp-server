/**
 * Form Templates Data
 * Pre-defined form templates for quick start onboarding
 * Date: 2026-02-06
 */

export interface FormField {
  id: string;
  type: 'text' | 'email' | 'phone' | 'textarea' | 'rating' | 'multiple-choice' | 'checkbox' | 'date' | 'number';
  label: string;
  required: boolean;
  options?: string[]; // For multiple-choice, checkbox fields
  placeholder?: string;
  description?: string;
}

export interface FormTemplate {
  id: string;
  name: string;
  nameHe: string; // Hebrew name
  description: string;
  descriptionHe: string; // Hebrew description
  icon: string; // Emoji icon
  category: 'business' | 'survey' | 'event' | 'feedback';
  fields: FormField[];
}

/**
 * Contact Form Template
 * For collecting contact information from website visitors
 */
const contactFormTemplate: FormTemplate = {
  id: 'contact',
  name: 'Contact Form',
  nameHe: 'טופס יצירת קשר',
  description: 'Collect contact information from visitors',
  descriptionHe: 'איסוף פרטי יצירת קשר ממבקרים',
  icon: '📝',
  category: 'business',
  fields: [
    {
      id: 'name',
      type: 'text',
      label: 'שם מלא',
      required: true,
      placeholder: 'הזן שם מלא',
    },
    {
      id: 'email',
      type: 'email',
      label: 'כתובת אימייל',
      required: true,
      placeholder: 'example@email.com',
    },
    {
      id: 'phone',
      type: 'phone',
      label: 'מספר טלפון',
      required: true,
      placeholder: '050-1234567',
    },
    {
      id: 'message',
      type: 'textarea',
      label: 'הודעה',
      required: false,
      placeholder: 'ספר לנו איך נוכל לעזור...',
      description: 'אופציונלי - שתף אותנו בפרטים נוספים',
    },
  ],
};

/**
 * Survey Template
 * For gathering feedback and opinions from users
 */
const surveyTemplate: FormTemplate = {
  id: 'survey',
  name: 'Survey',
  nameHe: 'סקר משוב',
  description: 'Gather feedback and ratings',
  descriptionHe: 'איסוף משוב ודירוגים',
  icon: '📊',
  category: 'survey',
  fields: [
    {
      id: 'name',
      type: 'text',
      label: 'שם (אופציונלי)',
      required: false,
      placeholder: 'השם שלך',
    },
    {
      id: 'satisfaction',
      type: 'rating',
      label: 'דרג את שביעות הרצון שלך',
      required: true,
      description: '1 = לא מרוצה, 5 = מרוצה מאוד',
    },
    {
      id: 'frequency',
      type: 'multiple-choice',
      label: 'באיזו תדירות אתה משתמש בשירות?',
      required: true,
      options: ['יומי', 'שבועי', 'חודשי', 'לעיתים רחוקות'],
    },
    {
      id: 'recommendation',
      type: 'multiple-choice',
      label: 'האם תמליץ עלינו לאחרים?',
      required: true,
      options: ['בהחלט כן', 'כנראה שכן', 'לא בטוח', 'כנראה שלא', 'בהחלט לא'],
    },
    {
      id: 'comments',
      type: 'textarea',
      label: 'הערות נוספות',
      required: false,
      placeholder: 'שתף אותנו במחשבות שלך...',
    },
  ],
};

/**
 * Registration Form Template
 * For event sign-ups and registrations
 */
const registrationTemplate: FormTemplate = {
  id: 'registration',
  name: 'Registration Form',
  nameHe: 'טופס הרשמה',
  description: 'Event sign-ups and registrations',
  descriptionHe: 'הרשמה לאירועים וכנסים',
  icon: '📋',
  category: 'event',
  fields: [
    {
      id: 'fullName',
      type: 'text',
      label: 'שם מלא',
      required: true,
      placeholder: 'שם פרטי + משפחה',
    },
    {
      id: 'email',
      type: 'email',
      label: 'אימייל',
      required: true,
      placeholder: 'your@email.com',
    },
    {
      id: 'phone',
      type: 'phone',
      label: 'טלפון',
      required: true,
      placeholder: '050-1234567',
    },
    {
      id: 'company',
      type: 'text',
      label: 'שם חברה/ארגון',
      required: false,
      placeholder: 'שם המקום בו אתה עובד',
    },
    {
      id: 'attendees',
      type: 'number',
      label: 'מספר משתתפים',
      required: true,
      placeholder: '1',
      description: 'כמה אנשים ישתתפו?',
    },
    {
      id: 'dietaryRestrictions',
      type: 'multiple-choice',
      label: 'מגבלות תזונתיות',
      required: false,
      options: ['אין', 'צמחוני', 'טבעוני', 'כשר', 'ללא גלוטן', 'אחר'],
    },
    {
      id: 'specialRequests',
      type: 'textarea',
      label: 'בקשות מיוחדות',
      required: false,
      placeholder: 'יש לך בקשות או הערות?',
    },
  ],
};

/**
 * Feedback Form Template
 * For customer reviews and feedback collection
 */
const feedbackTemplate: FormTemplate = {
  id: 'feedback',
  name: 'Feedback Form',
  nameHe: 'טופס משוב',
  description: 'Customer reviews and feedback',
  descriptionHe: 'איסוף ביקורות ומשוב מלקוחות',
  icon: '💬',
  category: 'feedback',
  fields: [
    {
      id: 'customerName',
      type: 'text',
      label: 'שם הלקוח',
      required: false,
      placeholder: 'השם שלך (אופציונלי)',
    },
    {
      id: 'overallRating',
      type: 'rating',
      label: 'דירוג כללי',
      required: true,
      description: 'דרג את החוויה הכללית שלך',
    },
    {
      id: 'productQuality',
      type: 'rating',
      label: 'איכות המוצר/שירות',
      required: true,
      description: 'עד כמה אתה מרוצה מהאיכות?',
    },
    {
      id: 'customerService',
      type: 'rating',
      label: 'שירות לקוחות',
      required: true,
      description: 'דרג את שירות הלקוחות',
    },
    {
      id: 'whatDidYouLike',
      type: 'textarea',
      label: 'מה אהבת במיוחד?',
      required: false,
      placeholder: 'ספר לנו מה עבד טוב...',
    },
    {
      id: 'whatCanImprove',
      type: 'textarea',
      label: 'איפה אפשר להשתפר?',
      required: false,
      placeholder: 'הצעות לשיפור...',
    },
    {
      id: 'wouldRecommend',
      type: 'checkbox',
      label: 'אני ממליץ על העסק הזה לאחרים',
      required: false,
    },
  ],
};

/**
 * All available form templates
 */
export const formTemplates: Record<string, FormTemplate> = {
  contact: contactFormTemplate,
  survey: surveyTemplate,
  registration: registrationTemplate,
  feedback: feedbackTemplate,
};

/**
 * Get all templates as an array
 */
export function getAllTemplates(): FormTemplate[] {
  return Object.values(formTemplates);
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): FormTemplate | undefined {
  return formTemplates[id];
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: FormTemplate['category']): FormTemplate[] {
  return Object.values(formTemplates).filter(template => template.category === category);
}
