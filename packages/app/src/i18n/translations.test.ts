import { describe, it, expect } from 'vitest';
import { getTranslations, t, Translations } from './translations';

describe('translations', () => {
  describe('getTranslations', () => {
    it('should return Hebrew translations for "he" language', () => {
      const translations = getTranslations('he');
      expect(translations).toBeDefined();
      expect(translations.appTitle).toBe('RightFlow PDF to HTML Convertor');
      expect(translations.uploadPdf).toBe('העלה PDF');
    });

    it('should return English translations for "en" language', () => {
      const translations = getTranslations('en');
      expect(translations).toBeDefined();
      expect(translations.appTitle).toBe('RightFlow PDF to HTML Convertor');
      expect(translations.uploadPdf).toBe('Upload PDF');
    });

    it('should have consistent app title across languages', () => {
      const heTranslations = getTranslations('he');
      const enTranslations = getTranslations('en');
      expect(heTranslations.appTitle).toBe(enTranslations.appTitle);
    });
  });

  describe('t function', () => {
    it('should return Hebrew translation for a key', () => {
      const result = t('he', 'uploadPdf');
      expect(result).toBe('העלה PDF');
    });

    it('should return English translation for a key', () => {
      const result = t('en', 'uploadPdf');
      expect(result).toBe('Upload PDF');
    });

    it('should return different translations for same key in different languages', () => {
      const heResult = t('he', 'settings');
      const enResult = t('en', 'settings');
      expect(heResult).toBe('הגדרות');
      expect(enResult).toBe('Settings');
      expect(heResult).not.toBe(enResult);
    });
  });

  describe('translation completeness', () => {
    it('should have all keys defined for Hebrew', () => {
      const translations = getTranslations('he');
      const keys = Object.keys(translations) as (keyof Translations)[];

      keys.forEach(key => {
        expect(translations[key]).toBeDefined();
        expect(translations[key].length).toBeGreaterThan(0);
      });
    });

    it('should have all keys defined for English', () => {
      const translations = getTranslations('en');
      const keys = Object.keys(translations) as (keyof Translations)[];

      keys.forEach(key => {
        expect(translations[key]).toBeDefined();
        expect(translations[key].length).toBeGreaterThan(0);
      });
    });

    it('should have same keys in both languages', () => {
      const heTranslations = getTranslations('he');
      const enTranslations = getTranslations('en');

      const heKeys = Object.keys(heTranslations).sort();
      const enKeys = Object.keys(enTranslations).sort();

      expect(heKeys).toEqual(enKeys);
    });
  });

  describe('specific translations', () => {
    describe('Header translations', () => {
      it('should have app title', () => {
        expect(t('he', 'appTitle')).toBe('RightFlow PDF to HTML Convertor');
        expect(t('en', 'appTitle')).toBe('RightFlow PDF to HTML Convertor');
      });

      it('should have powered by text', () => {
        expect(t('he', 'poweredBy')).toBe('Powered by RightFlow');
        expect(t('en', 'poweredBy')).toBe('Powered by RightFlow');
      });
    });

    describe('Toolbar translations', () => {
      it('should have file operation translations', () => {
        expect(t('he', 'uploadPdf')).toBe('העלה PDF');
        expect(t('en', 'uploadPdf')).toBe('Upload PDF');

        expect(t('he', 'savePdf')).toBe('שמור PDF');
        expect(t('en', 'savePdf')).toBe('Save PDF');

        expect(t('he', 'settings')).toBe('הגדרות');
        expect(t('en', 'settings')).toBe('Settings');
      });

      it('should have field operation translations', () => {
        expect(t('he', 'saveFields')).toBe('שמור שדות');
        expect(t('en', 'saveFields')).toBe('Save Fields');

        expect(t('he', 'loadFields')).toBe('טען שדות');
        expect(t('en', 'loadFields')).toBe('Load Fields');

        expect(t('he', 'exportHtml')).toBe('ייצא HTML');
        expect(t('en', 'exportHtml')).toBe('Export HTML');
      });

      it('should have navigation translations', () => {
        expect(t('he', 'page')).toBe('עמוד');
        expect(t('en', 'page')).toBe('Page');

        expect(t('he', 'of')).toBe('מתוך');
        expect(t('en', 'of')).toBe('of');
      });

      it('should have zoom translations', () => {
        expect(t('he', 'zoomIn')).toBe('הגדל');
        expect(t('en', 'zoomIn')).toBe('Zoom In');

        expect(t('he', 'zoomOut')).toBe('הקטן');
        expect(t('en', 'zoomOut')).toBe('Zoom Out');
      });
    });

    describe('Tools bar translations', () => {
      it('should have field tool translations', () => {
        expect(t('he', 'textFieldTool')).toBe('שדה טקסט');
        expect(t('en', 'textFieldTool')).toBe('Text Field');

        expect(t('he', 'checkboxFieldTool')).toBe('תיבת סימון');
        expect(t('en', 'checkboxFieldTool')).toBe('Checkbox');

        expect(t('he', 'radioFieldTool')).toBe('כפתורי בחירה');
        expect(t('en', 'radioFieldTool')).toBe('Radio Buttons');

        expect(t('he', 'dropdownFieldTool')).toBe('רשימה נפתחת');
        expect(t('en', 'dropdownFieldTool')).toBe('Dropdown');

        expect(t('he', 'signatureFieldTool')).toBe('חתימה');
        expect(t('en', 'signatureFieldTool')).toBe('Signature');
      });

      it('should have select tool translation', () => {
        expect(t('he', 'selectTool')).toBe('בחירה');
        expect(t('en', 'selectTool')).toBe('Select');
      });
    });

    describe('Language selector translations', () => {
      it('should have language names', () => {
        expect(t('he', 'hebrew')).toBe('עברית');
        expect(t('en', 'hebrew')).toBe('עברית');

        expect(t('he', 'english')).toBe('English');
        expect(t('en', 'english')).toBe('English');
      });
    });

    describe('Theme translations', () => {
      it('should have dark mode translation', () => {
        expect(t('he', 'darkMode')).toBe('מצב כהה');
        expect(t('en', 'darkMode')).toBe('Dark Mode');
      });

      it('should have light mode translation', () => {
        expect(t('he', 'lightMode')).toBe('מצב בהיר');
        expect(t('en', 'lightMode')).toBe('Light Mode');
      });
    });

    describe('Common action translations', () => {
      it('should have common action translations', () => {
        expect(t('he', 'save')).toBe('שמור');
        expect(t('en', 'save')).toBe('Save');

        expect(t('he', 'cancel')).toBe('ביטול');
        expect(t('en', 'cancel')).toBe('Cancel');

        expect(t('he', 'delete')).toBe('מחק');
        expect(t('en', 'delete')).toBe('Delete');

        expect(t('he', 'confirm')).toBe('אישור');
        expect(t('en', 'confirm')).toBe('Confirm');

        expect(t('he', 'close')).toBe('סגור');
        expect(t('en', 'close')).toBe('Close');
      });
    });

    describe('Billing translations', () => {
      describe('Billing navigation', () => {
        it('should have billing title', () => {
          expect(t('en', 'billing.title')).toBe('Billing & Subscription');
          expect(t('he', 'billing.title')).toBe('חיוב ומנוי');
        });

        it('should have navigation labels', () => {
          expect(t('en', 'billing.nav.subscription')).toBe('Subscription');
          expect(t('he', 'billing.nav.subscription')).toBe('מנוי');

          expect(t('en', 'billing.nav.usage')).toBe('Usage');
          expect(t('he', 'billing.nav.usage')).toBe('שימוש');

          expect(t('en', 'billing.nav.history')).toBe('History');
          expect(t('he', 'billing.nav.history')).toBe('היסטוריה');
        });
      });

      describe('Subscription card', () => {
        it('should have subscription card labels', () => {
          expect(t('en', 'billing.card.noSubscription')).toBe('No subscription found');
          expect(t('he', 'billing.card.noSubscription')).toBe('לא נמצא מנוי');

          expect(t('en', 'billing.card.billingCycle')).toBe('Current billing cycle');
          expect(t('he', 'billing.card.billingCycle')).toBe('מחזור חיוב נוכחי');

          expect(t('en', 'billing.card.yearly')).toBe('Yearly');
          expect(t('he', 'billing.card.yearly')).toBe('שנתי');

          expect(t('en', 'billing.card.monthly')).toBe('Monthly');
          expect(t('he', 'billing.card.monthly')).toBe('חודשי');
        });

        it('should have plan limits labels', () => {
          expect(t('en', 'billing.card.forms')).toBe('Forms');
          expect(t('he', 'billing.card.forms')).toBe('טפסים');

          expect(t('en', 'billing.card.submissions')).toBe('Submissions');
          expect(t('he', 'billing.card.submissions')).toBe('הגשות');

          expect(t('en', 'billing.card.storage')).toBe('Storage');
          expect(t('he', 'billing.card.storage')).toBe('אחסון');

          expect(t('en', 'billing.card.teamMembers')).toBe('Team Members');
          expect(t('he', 'billing.card.teamMembers')).toBe('חברי צוות');
        });

        it('should have action buttons', () => {
          expect(t('en', 'billing.card.upgradePlan')).toBe('Upgrade Plan');
          expect(t('he', 'billing.card.upgradePlan')).toBe('שדרג תוכנית');

          expect(t('en', 'billing.card.downgradePlan')).toBe('Downgrade Plan');
          expect(t('he', 'billing.card.downgradePlan')).toBe('שנמך תוכנית');

          expect(t('en', 'billing.card.cancelSubscription')).toBe('Cancel Subscription');
          expect(t('he', 'billing.card.cancelSubscription')).toBe('בטל מנוי');
        });
      });

      describe('Status badge', () => {
        it('should have status labels', () => {
          expect(t('en', 'billing.status.active')).toBe('Active');
          expect(t('he', 'billing.status.active')).toBe('פעיל');

          expect(t('en', 'billing.status.gracePeriod')).toBe('Grace Period');
          expect(t('he', 'billing.status.gracePeriod')).toBe('תקופת חסד');

          expect(t('en', 'billing.status.suspended')).toBe('Suspended');
          expect(t('he', 'billing.status.suspended')).toBe('מושעה');

          expect(t('en', 'billing.status.cancelled')).toBe('Cancelled');
          expect(t('he', 'billing.status.cancelled')).toBe('בוטל');
        });
      });

      describe('Pricing toggle', () => {
        it('should have pricing toggle labels', () => {
          expect(t('en', 'billing.toggle.monthly')).toBe('Monthly');
          expect(t('he', 'billing.toggle.monthly')).toBe('חודשי');

          expect(t('en', 'billing.toggle.yearly')).toBe('Yearly');
          expect(t('he', 'billing.toggle.yearly')).toBe('שנתי');
        });
      });

      describe('Cancel subscription modal', () => {
        it('should have cancel modal labels', () => {
          expect(t('en', 'billing.cancel.title')).toBe('Cancel Subscription');
          expect(t('he', 'billing.cancel.title')).toBe('ביטול מנוי');

          expect(t('en', 'billing.cancel.confirmQuestion')).toBe('Are you sure you want to cancel your subscription?');
          expect(t('he', 'billing.cancel.confirmQuestion')).toBe('האם אתה בטוח שברצונך לבטל את המנוי?');

          expect(t('en', 'billing.cancel.keepSubscription')).toBe('Keep Subscription');
          expect(t('he', 'billing.cancel.keepSubscription')).toBe('שמור מנוי');

          expect(t('en', 'billing.cancel.cancelling')).toBe('Cancelling...');
          expect(t('he', 'billing.cancel.cancelling')).toBe('מבטל...');
        });

        it('should have what you lose labels', () => {
          expect(t('en', 'billing.cancel.loseForms')).toBe('Access to all forms and submissions');
          expect(t('he', 'billing.cancel.loseForms')).toBe('גישה לכל הטפסים וההגשות');

          expect(t('en', 'billing.cancel.loseTeam')).toBe('Team member access');
          expect(t('he', 'billing.cancel.loseTeam')).toBe('גישת חברי צוות');

          expect(t('en', 'billing.cancel.loseSupport')).toBe('Premium support');
          expect(t('he', 'billing.cancel.loseSupport')).toBe('תמיכה פרימיום');
        });
      });

      describe('Plan comparison modal', () => {
        it('should have plan comparison labels', () => {
          expect(t('en', 'billing.comparison.title')).toBe('Choose Your Plan');
          expect(t('he', 'billing.comparison.title')).toBe('בחר את התוכנית שלך');

          expect(t('en', 'billing.comparison.customPlanTitle')).toBe('Need a Custom Plan?');
          expect(t('he', 'billing.comparison.customPlanTitle')).toBe('צריך תוכנית מותאמת אישית?');

          expect(t('en', 'billing.comparison.contactSales')).toBe('Contact Sales');
          expect(t('he', 'billing.comparison.contactSales')).toBe('צור קשר עם מכירות');
        });
      });

      describe('Usage dashboard', () => {
        it('should have usage dashboard labels', () => {
          expect(t('en', 'billing.usage.title')).toBe('Usage Dashboard');
          expect(t('he', 'billing.usage.title')).toBe('לוח בקרת שימוש');

          expect(t('en', 'billing.usage.refresh')).toBe('Refresh');
          expect(t('he', 'billing.usage.refresh')).toBe('רענן');

          expect(t('en', 'billing.usage.totalForms')).toBe('Total Forms');
          expect(t('he', 'billing.usage.totalForms')).toBe('סה"כ טפסים');
        });
      });

      describe('Quota status', () => {
        it('should have quota status labels', () => {
          expect(t('en', 'billing.quota.title')).toBe('Quota Status');
          expect(t('he', 'billing.quota.title')).toBe('מצב מכסות');

          expect(t('en', 'billing.quota.critical')).toBe('Critical');
          expect(t('he', 'billing.quota.critical')).toBe('קריטי');

          expect(t('en', 'billing.quota.warning')).toBe('Warning');
          expect(t('he', 'billing.quota.warning')).toBe('אזהרה');

          expect(t('en', 'billing.quota.healthy')).toBe('Healthy');
          expect(t('he', 'billing.quota.healthy')).toBe('תקין');
        });
      });

      describe('Invoice table', () => {
        it('should have invoice table labels', () => {
          expect(t('en', 'billing.invoice.title')).toBe('Invoice History');
          expect(t('he', 'billing.invoice.title')).toBe('היסטוריית חשבוניות');

          expect(t('en', 'billing.invoice.invoiceNumber')).toBe('Invoice #');
          expect(t('he', 'billing.invoice.invoiceNumber')).toBe("מס' חשבונית");

          expect(t('en', 'billing.invoice.download')).toBe('Download');
          expect(t('he', 'billing.invoice.download')).toBe('הורד');
        });

        it('should have invoice status labels', () => {
          expect(t('en', 'billing.invoice.statusPaid')).toBe('Paid');
          expect(t('he', 'billing.invoice.statusPaid')).toBe('שולם');

          expect(t('en', 'billing.invoice.statusPending')).toBe('Pending');
          expect(t('he', 'billing.invoice.statusPending')).toBe('ממתין');

          expect(t('en', 'billing.invoice.statusFailed')).toBe('Failed');
          expect(t('he', 'billing.invoice.statusFailed')).toBe('נכשל');

          expect(t('en', 'billing.invoice.statusRefunded')).toBe('Refunded');
          expect(t('he', 'billing.invoice.statusRefunded')).toBe('הוחזר');
        });
      });

      describe('Payment methods', () => {
        it('should have payment method labels', () => {
          expect(t('en', 'billing.payment.title')).toBe('Payment Methods');
          expect(t('he', 'billing.payment.title')).toBe('אמצעי תשלום');

          expect(t('en', 'billing.payment.addPaymentMethod')).toBe('Add Payment Method');
          expect(t('he', 'billing.payment.addPaymentMethod')).toBe('הוסף אמצעי תשלום');

          expect(t('en', 'billing.payment.default')).toBe('Default');
          expect(t('he', 'billing.payment.default')).toBe('ברירת מחדל');

          expect(t('en', 'billing.payment.setDefault')).toBe('Set Default');
          expect(t('he', 'billing.payment.setDefault')).toBe('הגדר כברירת מחדל');

          expect(t('en', 'billing.payment.remove')).toBe('Remove');
          expect(t('he', 'billing.payment.remove')).toBe('הסר');
        });

        it('should have payment type labels', () => {
          expect(t('en', 'billing.payment.paypal')).toBe('PayPal');
          expect(t('he', 'billing.payment.paypal')).toBe('PayPal');

          expect(t('en', 'billing.payment.bankTransfer')).toBe('Bank Transfer');
          expect(t('he', 'billing.payment.bankTransfer')).toBe('העברה בנקאית');
        });
      });

      describe('Arabic translations', () => {
        it('should have billing title in Arabic', () => {
          expect(t('ar', 'billing.title')).toBe('الفواتير والاشتراك');
        });

        it('should have navigation in Arabic', () => {
          expect(t('ar', 'billing.nav.subscription')).toBe('الاشتراك');
          expect(t('ar', 'billing.nav.usage')).toBe('الاستخدام');
          expect(t('ar', 'billing.nav.history')).toBe('السجل');
        });

        it('should have status in Arabic', () => {
          expect(t('ar', 'billing.status.active')).toBe('نشط');
          expect(t('ar', 'billing.status.cancelled')).toBe('ملغى');
        });

        it('should have invoice labels in Arabic', () => {
          expect(t('ar', 'billing.invoice.title')).toBe('سجل الفواتير');
          expect(t('ar', 'billing.invoice.download')).toBe('تحميل');
        });
      });

      describe('Billing translation completeness', () => {
        it('should have all billing keys in all languages', () => {
          const billingKeys = [
            'billing.title',
            'billing.nav.subscription',
            'billing.nav.usage',
            'billing.nav.history',
            'billing.card.noSubscription',
            'billing.card.billingCycle',
            'billing.card.upgradePlan',
            'billing.status.active',
            'billing.status.cancelled',
            'billing.toggle.monthly',
            'billing.toggle.yearly',
            'billing.cancel.title',
            'billing.cancel.keepSubscription',
            'billing.comparison.title',
            'billing.usage.title',
            'billing.quota.title',
            'billing.invoice.title',
            'billing.payment.title',
          ] as const;

          const languages = ['en', 'he', 'ar'] as const;

          languages.forEach(lang => {
            billingKeys.forEach(key => {
              const value = t(lang, key);
              expect(value).toBeDefined();
              expect(value.length).toBeGreaterThan(0);
            });
          });
        });
      });
    });
  });
});
