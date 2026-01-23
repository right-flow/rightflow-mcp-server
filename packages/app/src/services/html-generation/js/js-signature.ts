/**
 * Signature Pad JavaScript
 * Canvas-based signature capture with touch support
 */

/**
 * Generates JavaScript for signature pad functionality
 */
export function generateSignatureJs(): string {
  return `
  // ========================================
  // Signature Pad Functionality
  // ========================================

  // Initialize all signature pads
  const signaturePads = [];
  const signatureCanvases = form.querySelectorAll('.signature-canvas');

  signatureCanvases.forEach(function(canvas) {
    const ctx = canvas.getContext('2d');
    const container = canvas.closest('.signature-pad-container');
    const fieldId = container.dataset.fieldId;
    const hiddenInput = document.getElementById(fieldId);

    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    let hasSignature = false;
    let isInitialized = false;

    // Set canvas size to match display size
    function resizeCanvas() {
      const rect = canvas.getBoundingClientRect();

      // Skip if canvas is not visible (width/height = 0)
      if (rect.width === 0 || rect.height === 0) {
        return false;
      }

      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      // Reset transform and apply scale
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      isInitialized = true;
      return true;
    }

    // Ensure canvas is initialized before drawing
    function ensureInitialized() {
      if (!isInitialized) {
        resizeCanvas();
      }
    }

    // Get position from event (mouse or touch)
    function getPosition(e) {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    }

    // Start drawing
    function startDrawing(e) {
      // Ensure canvas is initialized on first interaction
      ensureInitialized();

      e.preventDefault();
      isDrawing = true;
      const pos = getPosition(e);
      lastX = pos.x;
      lastY = pos.y;
      canvas.classList.add('signing');
    }

    // Draw line
    function draw(e) {
      if (!isDrawing) return;
      e.preventDefault();

      const pos = getPosition(e);
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();

      lastX = pos.x;
      lastY = pos.y;
      hasSignature = true;
      canvas.classList.add('has-signature');
    }

    // Stop drawing and save signature
    function stopDrawing() {
      if (isDrawing) {
        isDrawing = false;
        canvas.classList.remove('signing');
        saveSignature();
      }
    }

    // Save signature as base64 PNG
    function saveSignature() {
      if (hasSignature) {
        const dataUrl = canvas.toDataURL('image/png');
        hiddenInput.value = dataUrl;
        // Remove validation error if present
        container.classList.remove('invalid');
        const validation = document.getElementById(fieldId + '_validation');
        if (validation) validation.textContent = '';
      }
    }

    // Clear signature
    function clearSignature() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      hasSignature = false;
      hiddenInput.value = '';
      canvas.classList.remove('has-signature');
      resizeCanvas(); // Reset canvas state
    }

    // Event listeners for mouse
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);

    // Event listeners for touch
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);
    canvas.addEventListener('touchcancel', stopDrawing);

    // Clear button
    const clearBtn = container.querySelector('.signature-clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', clearSignature);
    }

    // Initialize canvas
    resizeCanvas();

    // Handle window resize
    window.addEventListener('resize', function() {
      // Save current signature
      const currentData = hiddenInput.value;
      resizeCanvas();
      // Restore signature if exists
      if (currentData) {
        const img = new Image();
        img.onload = function() {
          ctx.drawImage(img, 0, 0, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1));
        };
        img.src = currentData;
      }
    });

    // Store reference
    signaturePads.push({
      canvas: canvas,
      fieldId: fieldId,
      clear: clearSignature,
      resize: resizeCanvas,
      hasSignature: function() { return hasSignature; }
    });

    // Try initial resize (may fail if canvas not visible yet)
    setTimeout(resizeCanvas, 100);
  });

  // Expose signature pads for external access
  window.formSignaturePads = signaturePads;
`;
}
