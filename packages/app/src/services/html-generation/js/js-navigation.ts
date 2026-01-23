/**
 * Form Navigation JavaScript
 * Multi-page form navigation, tab management, station-based field control
 */

/**
 * Generates JavaScript for form navigation and station management
 */
export function generateNavigationJs(
  formId: string,
  rtl: boolean,
  totalFormPages: number,
  includeWelcome: boolean,
  userRole: 'client' | 'agent',
): string {
  const totalTabs = includeWelcome ? totalFormPages + 1 : totalFormPages;

  return `
(function() {
  'use strict';

  const form = document.getElementById('${formId}');
  if (!form) return;

  // Current user role for station-based field access
  const currentUserRole = '${userRole}';

  // Multi-page navigation state
  const includeWelcome = ${includeWelcome};
  const totalFormPages = ${totalFormPages};
  const totalTabs = ${totalTabs};
  let currentTabIndex = 1; // 1-based index for tabs
  const completedTabs = new Set();

  // ========================================
  // Toast Notification Helper
  // ========================================
  function showToast(message, isSuccess) {
    // Remove existing toast
    const existingToast = document.querySelector('.validation-toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = 'validation-toast' + (isSuccess ? ' success' : '');
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(function() {
      toast.remove();
    }, 4000);
  }

  // ========================================
  // Station-Based Field Management
  // ========================================
  function initializeStationFields() {
    const allFields = form.querySelectorAll('[data-station]');
    allFields.forEach(function(fieldContainer) {
      const station = fieldContainer.getAttribute('data-station');
      if (station && station !== currentUserRole) {
        fieldContainer.classList.add('station-disabled');
        // Disable all inputs in this field
        const inputs = fieldContainer.querySelectorAll('input, select, textarea');
        inputs.forEach(function(input) {
          input.disabled = true;
          input.setAttribute('data-station-disabled', 'true');
        });
        // Disable signature canvas
        const canvas = fieldContainer.querySelector('.signature-canvas');
        if (canvas) {
          canvas.style.pointerEvents = 'none';
          canvas.setAttribute('data-station-disabled', 'true');
        }
      }
    });
  }

  // Initialize station fields
  initializeStationFields();

  // Page ID mapping: tab index -> page ID
  function getPageId(tabIndex) {
    if (includeWelcome && tabIndex === 1) {
      return 'welcome';
    }
    return includeWelcome ? tabIndex - 1 : tabIndex;
  }

  // Get navigation elements
  const pages = form.querySelectorAll('.form-page');
  const tabs = document.querySelectorAll('.page-tab');
  const connectors = document.querySelectorAll('.tab-connector');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const submitBtn = document.getElementById('submit-btn');
  const progressText = document.getElementById('page-progress-text');

  // Initialize page display
  function showTab(tabIndex) {
    if (tabIndex < 1 || tabIndex > totalTabs) return;

    const pageId = getPageId(tabIndex);

    // Hide all pages
    pages.forEach(function(page) {
      page.classList.remove('active');
    });

    // Show current page
    const activePage = document.getElementById('page-' + pageId);
    if (activePage) {
      activePage.classList.add('active');

      // Initialize signature canvases on this page
      setTimeout(function() {
        const pageCanvases = activePage.querySelectorAll('.signature-canvas');
        pageCanvases.forEach(function(canvas) {
          // Find the signature pad object and reinitialize
          const padObj = window.formSignaturePads.find(function(p) {
            return p.canvas === canvas;
          });
          if (padObj && padObj.resize) {
            padObj.resize();
          }
        });
      }, 50); // Small delay to ensure DOM is rendered
    }

    // Update tabs
    tabs.forEach(function(tab, index) {
      tab.classList.remove('active');
      if (index + 1 === tabIndex) {
        tab.classList.add('active');
      }
    });

    // Update navigation buttons
    if (prevBtn) {
      prevBtn.disabled = tabIndex === 1;
    }
    if (nextBtn) {
      nextBtn.style.display = tabIndex === totalTabs ? 'none' : 'flex';
    }
    if (submitBtn) {
      submitBtn.style.display = tabIndex === totalTabs ? 'flex' : 'none';
    }

    // Update progress text
    if (progressText) {
      progressText.innerHTML = '${rtl ? 'עמוד' : 'Page'} <strong>' + tabIndex + '</strong> ${rtl ? 'מתוך' : 'of'} <strong>' + totalTabs + '</strong>';
    }

    currentTabIndex = tabIndex;
  }

  // Mark tab as completed
  function markTabCompleted(tabIndex) {
    completedTabs.add(tabIndex);
    const tab = tabs[tabIndex - 1];
    if (tab && tabIndex !== currentTabIndex) {
      tab.classList.add('completed');
    }
    // Update connector
    if (tabIndex < totalTabs && connectors[tabIndex - 1]) {
      connectors[tabIndex - 1].classList.add('completed');
    }
  }

  // Check if current page is welcome page (no validation needed)
  function isWelcomePage() {
    return includeWelcome && currentTabIndex === 1;
  }

  // Validate current page fields
  function validateCurrentPage(showMessage) {
    // Welcome page has no required fields
    if (isWelcomePage()) return true;

    const pageId = getPageId(currentTabIndex);
    const activePage = document.getElementById('page-' + pageId);
    if (!activePage) return true;

    // Get required fields that are not disabled by station
    const requiredFields = activePage.querySelectorAll('[required]:not([data-station-disabled])');
    let isValid = true;
    let firstInvalid = null;
    let invalidCount = 0;

    requiredFields.forEach(function(field) {
      const validation = document.getElementById(field.id + '_validation');
      const fieldContainer = field.closest('.form-group');
      const value = field.type === 'checkbox' ? field.checked : field.value;

      if (!value || (typeof value === 'string' && value.trim() === '')) {
        isValid = false;
        invalidCount++;
        field.style.borderColor = '#e53935';
        if (fieldContainer) {
          fieldContainer.classList.add('field-invalid');
        }
        if (validation) {
          validation.textContent = '${rtl ? 'שדה חובה' : 'Required field'}';
        }
        if (!firstInvalid) {
          firstInvalid = field;
        }
      } else {
        field.style.borderColor = '';
        if (fieldContainer) {
          fieldContainer.classList.remove('field-invalid');
        }
        if (validation) {
          validation.textContent = '';
        }
      }
    });

    // Show toast and scroll to first invalid field
    if (!isValid && showMessage !== false) {
      const message = ${rtl}
        ? 'יש למלא ' + invalidCount + ' שדות חובה'
        : 'Please fill in ' + invalidCount + ' required field(s)';
      showToast(message, false);

      if (firstInvalid) {
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(function() {
          firstInvalid.focus();
        }, 300);
      }
    }

    return isValid;
  }

  // Navigation handlers
  function goToTab(tabIndex) {
    if (tabIndex < 1 || tabIndex > totalTabs) return;

    // Mark current tab as completed if moving forward
    if (tabIndex > currentTabIndex) {
      markTabCompleted(currentTabIndex);
    }

    showTab(tabIndex);
    // Scroll to top of form
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function nextTab() {
    if (currentTabIndex < totalTabs) {
      if (validateCurrentPage()) {
        markTabCompleted(currentTabIndex);
        goToTab(currentTabIndex + 1);
      }
    }
  }

  function prevTab() {
    if (currentTabIndex > 1) {
      goToTab(currentTabIndex - 1);
    }
  }

  // Tab click handlers
  tabs.forEach(function(tab, index) {
    tab.addEventListener('click', function() {
      const targetTab = index + 1;
      // Allow going back freely, but validate when going forward
      if (targetTab <= currentTabIndex || completedTabs.has(targetTab - 1)) {
        goToTab(targetTab);
      } else if (targetTab === currentTabIndex + 1) {
        nextTab();
      }
    });
  });

  // Button click handlers
  if (prevBtn) {
    prevBtn.addEventListener('click', prevTab);
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', nextTab);
  }

  // Form submission handler
  form.addEventListener('submit', function(e) {
    e.preventDefault();

    // Validate all form pages (skip welcome page)
    let allValid = true;
    const startTab = includeWelcome ? 2 : 1;

    for (let tabIdx = startTab; tabIdx <= totalTabs; tabIdx++) {
      const pageId = getPageId(tabIdx);
      const page = document.getElementById('page-' + pageId);
      if (!page) continue;

      const requiredFields = page.querySelectorAll('[required]');
      requiredFields.forEach(function(field) {
        const value = field.type === 'checkbox' ? field.checked : field.value;
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          allValid = false;
          if (tabIdx !== currentTabIndex) {
            goToTab(tabIdx);
          }
        }
      });
      if (!allValid) break;
    }

    if (!validateCurrentPage()) {
      allValid = false;
    }

    if (allValid) {
      // Collect form data
      const formData = new FormData(form);
      const data = {};
      formData.forEach(function(value, key) {
        if (data[key]) {
          if (Array.isArray(data[key])) {
            data[key].push(value);
          } else {
            data[key] = [data[key], value];
          }
        } else {
          data[key] = value;
        }
      });

      console.log('Form data:', data);
      alert('${rtl ? 'הטופס נשלח בהצלחה!' : 'Form submitted successfully!'}');
    }
  });

  // Clear validation on input
  form.querySelectorAll('input, select, textarea').forEach(function(field) {
    field.addEventListener('input', function() {
      this.style.borderColor = '';
      const validation = document.getElementById(this.id + '_validation');
      if (validation) {
        validation.textContent = '';
      }
    });
  });

  // Keyboard navigation
  document.addEventListener('keydown', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.key === 'ArrowRight') {
      ${rtl ? 'prevTab()' : 'nextTab()'};
    } else if (e.key === 'ArrowLeft') {
      ${rtl ? 'nextTab()' : 'prevTab()'};
    }
  });

  // Expose functions for other modules
  window.formNavigation = {
    showTab: showTab,
    nextTab: nextTab,
    prevTab: prevTab,
    validateCurrentPage: validateCurrentPage,
    goToTab: goToTab
  };

  // Additional modules will be inserted here (signature, date picker, validation)
  // PLACEHOLDER_FOR_ADDITIONAL_MODULES

})(); // End of main IIFE
`;
}
