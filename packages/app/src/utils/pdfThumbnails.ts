import { pdfjs } from 'react-pdf';

/**
 * Generates thumbnail images for all pages of a PDF
 * @param file The PDF file to generate thumbnails for
 * @param thumbnailWidth The width of the thumbnails in pixels (default: 120)
 * @returns Array of data URLs for thumbnail images
 */
export const generateThumbnails = async (
  file: File,
  thumbnailWidth: number = 120,
): Promise<string[]> => {
  try {
    // Load the PDF document
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    const thumbnails: string[] = [];

    // Generate thumbnail for each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1 });

      // Calculate scale to fit thumbnail width
      const scale = thumbnailWidth / viewport.width;
      const scaledViewport = page.getViewport({ scale });

      // Create canvas for rendering
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { willReadFrequently: true });

      if (!context) {
        console.error(`Failed to get canvas context for page ${pageNum}`);
        thumbnails.push(''); // Push empty string as placeholder
        continue;
      }

      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;

      // Render PDF page to canvas
      await page.render({
        canvasContext: context,
        viewport: scaledViewport,
      }).promise;

      // Convert canvas to data URL
      const thumbnailUrl = canvas.toDataURL('image/png');
      thumbnails.push(thumbnailUrl);

      // Clean up
      page.cleanup();
    }

    return thumbnails;
  } catch (error) {
    console.error('Error generating thumbnails:', error);
    throw error;
  }
};
