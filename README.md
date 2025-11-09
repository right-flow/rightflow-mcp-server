# RightFlow

**Hebrew PDF Form Filler Studio** - A web application for creating fillable PDF forms with proper Hebrew and RTL (Right-to-Left) text support.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5-purple)](https://vitejs.dev/)

## Overview

RightFlow addresses the critical gap in existing PDF tools that fail to handle Hebrew text correctly. Most PDF libraries reverse Hebrew text or misalign RTL content. This application provides a comprehensive solution for Israeli businesses, government agencies, and legal firms requiring proper RTL document processing.

## Features

### Core Functionality
- **PDF Upload & Display**: Load and render PDF documents in the browser
- **Visual Field Placement**: Click-and-drag interface for adding form fields
- **Hebrew Font Embedding**: Automatic embedding of Noto Sans Hebrew font with proper character mapping
- **Multiple Field Types**:
  - Text fields with RTL support
  - Checkboxes (checkmark or X style)
  - Radio button groups (vertical/horizontal orientation)
  - Dropdown menus with Hebrew options
- **Field Management**: Edit, delete, duplicate, and reorder fields
- **Settings System**: Customizable defaults for field appearance and behavior
- **Template Storage**: Save and load form templates in browser LocalStorage
- **PDF Generation**: Export fillable PDFs with embedded AcroForm fields

### Hebrew Text Handling
- **Full Font Embedding**: Uses `subset: false` to prevent character mapping issues
- **RTL Direction**: Proper right-to-left text flow
- **Mixed Content**: Handles Hebrew/English/Numbers in the same document
- **Browser Compatibility**: Tested in Chrome, Firefox, and Safari
- **Mobile Support**: Works with iOS and Android Hebrew keyboards

## Installation

### Prerequisites
- Node.js 18+ and npm
- Modern web browser (Chrome, Firefox, or Safari)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/Hagalgal/RightFlow.git
cd RightFlow

# Install dependencies
npm install

# Start development server
npm run dev

# Open browser to http://localhost:5173
```

### Build for Production

```bash
# Create production build
npm run build

# Preview production build locally
npm run preview
```

## Usage

### Creating a Fillable PDF Form

1. **Upload PDF**: Click "העלה PDF" to select your original PDF document
2. **Select Tool**: Choose field type from toolbar (text, checkbox, radio, dropdown)
3. **Place Fields**: Click on PDF to place fields at desired locations
4. **Configure Fields**: Use the sidebar to edit field properties:
   - Name (must be unique)
   - Label (display text)
   - Required status
   - Default value
   - Type-specific options (radio orientation, dropdown choices, etc.)
5. **Adjust Settings**: Click settings icon to customize default field behavior
6. **Generate PDF**: Click "צור PDF" to download fillable form

### Field Types

#### Text Field
- Single-line text input
- Hebrew font embedded automatically
- RTL direction by default
- Configurable font size

#### Checkbox
- Two style options: checkmark (✓) or X (✗)
- Configurable in settings
- Optional default checked state

#### Radio Button Group
- Multiple mutually exclusive options
- Vertical or horizontal layout
- Configurable spacing between buttons
- Grouped by shared `radioGroup` name

#### Dropdown
- Multiple choice selection
- Hebrew text support
- Customizable option list
- Optional default selection

## Technical Architecture

### Technology Stack
- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite 5
- **PDF Library**: pdf-lib v1.17.1
- **Font Kit**: @pdf-lib/fontkit v1.1.1
- **State Management**: Zustand
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Icons**: Lucide React
- **PDF Rendering**: PDF.js (Mozilla)

### Project Structure

```
RightFlow/
├── src/
│   ├── components/          # React components
│   │   ├── ui/             # shadcn/ui components
│   │   ├── PDFViewer.tsx   # PDF display and interaction
│   │   ├── Sidebar.tsx     # Field editing panel
│   │   └── Toolbar.tsx     # Tool selection
│   ├── store/              # Zustand state management
│   │   └── useFormStore.ts # Application state
│   ├── types/              # TypeScript definitions
│   │   ├── fields.ts       # Field type definitions
│   │   └── settings.ts     # Settings types
│   ├── utils/              # Utility functions
│   │   ├── pdfGeneration.ts # PDF creation logic
│   │   ├── inputSanitization.ts # Input validation
│   │   └── coordinateConversion.ts # Canvas ↔ PDF coordinates
│   └── App.tsx             # Main application component
├── public/
│   └── fonts/
│       └── NotoSansHebrew-Regular.ttf # Hebrew font file
├── vercel.json             # Vercel deployment config
└── package.json
```

### Hebrew Text Implementation

**Critical Design Decision**: Hebrew text requires full font embedding (`subset: false`) to prevent character mapping bugs that cause text reversal.

```typescript
// Font embedding in pdfGeneration.ts
const fontBytes = await fetch('/fonts/NotoSansHebrew-Regular.ttf');
const hebrewFont = await pdfDoc.embedFont(fontBytes, {
  subset: false  // CRITICAL for Hebrew
});
```

**Text Direction**: The application handles RTL text direction using:
- PDF field `direction: 'rtl'` property
- Noto Sans Hebrew font with proper Unicode BiDi support
- Browser-native Hebrew keyboard support

### Coordinate System

The application converts between two coordinate systems:

- **Canvas Coordinates**: Pixels from top-left (0,0 at top-left)
- **PDF Coordinates**: Points from bottom-left (0,0 at bottom-left)

Conversion utilities in [coordinateConversion.ts](src/utils/coordinateConversion.ts) handle transformations accounting for viewport scaling and device pixel ratio.

## Deployment

### Vercel (Recommended)

This application is optimized for Vercel deployment with automatic CDN distribution.

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

**Configuration**: The `vercel.json` file includes:
- Aggressive font caching (31536000s = 1 year)
- Automatic region selection (fra1 - Frankfurt for Israel proximity)
- Zero-config static hosting

**Cost**: Free for up to 10 users (100GB bandwidth included)

### Self-Hosting

```bash
# Build production bundle
npm run build

# Serve dist/ directory with any static hosting
# Examples: nginx, Apache, AWS S3, Netlify, etc.
```

**Requirements**:
- Static file hosting with HTTPS
- Font file caching for performance
- Modern browser support (ES2020+)

## Browser Compatibility

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 90+ | ✅ Fully Supported |
| Firefox | 88+ | ✅ Fully Supported |
| Safari | 14+ | ✅ Fully Supported |
| Edge | 90+ | ✅ Fully Supported |
| Mobile Safari | iOS 14+ | ✅ Supported |
| Chrome Android | 90+ | ✅ Supported |

## Development

### Running Tests

```bash
# Lint code
npm run lint

# Type check
npx tsc --noEmit

# Phase 0 validation tests (Hebrew font compatibility)
cd Phase0-Testing
npm test
```

### Code Quality Standards

- **File Size**: Maximum 500 lines per file
- **Function Length**: Under 50 lines with single responsibility
- **Line Length**: Maximum 100 characters
- **TypeScript**: Strict mode enabled
- **ESLint**: Standard React + TypeScript rules

### Development Workflow

1. Create feature branch from `main`
2. Implement changes following KISS and YAGNI principles
3. Test Hebrew text rendering manually in generated PDFs
4. Run linter: `npm run lint`
5. Create pull request with comprehensive description
6. Merge after review

## Performance

### Targets
- Support 10+ concurrent users
- Handle 50+ page PDFs without freezing
- Hebrew text rendering < 100ms per field
- Zero cold start delays (client-side processing)
- Fast global CDN delivery

### Optimization Strategies
- Client-side PDF processing (no backend latency)
- Aggressive font caching (1 year TTL)
- Lazy PDF page rendering
- LocalStorage for template persistence
- Vercel Edge Network CDN

## Security

### Input Sanitization

All Hebrew input is sanitized to prevent XSS attacks via Unicode control characters:

- Removes dangerous BiDi overrides: `\u202A-\u202E`
- Removes isolates: `\u2066-\u2069`
- Validates field names against injection patterns
- Enforces unique field naming

See [inputSanitization.ts](src/utils/inputSanitization.ts) for implementation.

### File Safety

- Hebrew filenames sanitized to ASCII for cross-platform compatibility
- No server-side file storage (client-side only)
- No external API calls except font loading

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Follow code quality standards (see Development section)
4. Test Hebrew text rendering in actual PDFs
5. Commit changes: `git commit -m 'Add feature'`
6. Push to branch: `git push origin feature/your-feature`
7. Open pull request with detailed description

## License

MIT License - See [LICENSE](LICENSE) file for details.

## Target Market

- Israeli businesses requiring Hebrew form processing
- Government agencies with RTL document requirements
- Legal firms handling Hebrew contracts
- Educational institutions with Hebrew forms
- Any organization needing proper RTL PDF support

## Acknowledgments

- **pdf-lib**: Core PDF manipulation library
- **Noto Sans Hebrew**: Google Fonts Hebrew typeface
- **Mozilla PDF.js**: PDF rendering engine
- **Radix UI**: Accessible component primitives
- **Vercel**: Hosting and CDN infrastructure

## Support

For issues, questions, or feature requests, please open an issue on [GitHub](https://github.com/Hagalgal/RightFlow/issues).

---

**Built with ❤️ for proper Hebrew text handling in PDFs**
