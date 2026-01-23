import { useState } from 'react';
import {
  Type,
  CheckSquare,
  Circle,
  ChevronDown,
  PenTool,
  FileText,
  MousePointer2,
  Plus,
  Camera,
  MapPin,
  QrCode,
  Barcode,
  ChevronRight,
  ChevronLeft,
  X,
} from 'lucide-react';
import { ToolMode } from '@/types/fields';
import { useTranslation, useDirection } from '@/i18n';
import { motion, AnimatePresence } from 'framer-motion';

interface ToolsBarProps {
  activeTool: ToolMode;
  onToolChange: (tool: ToolMode) => void;
}

export const ToolsBar = ({ activeTool, onToolChange }: ToolsBarProps) => {
  const t = useTranslation();
  const direction = useDirection();
  const isRTL = direction === 'rtl';
  const [isExpanded, setIsExpanded] = useState(false);

  const tools = [
    { id: 'select', icon: MousePointer2, label: t.selectTool, category: 'basic' },
    { id: 'text-field', icon: Type, label: t.textFieldTool, category: 'basic' },
    { id: 'checkbox-field', icon: CheckSquare, label: t.checkboxFieldTool, category: 'basic' },
    { id: 'radio-field', icon: Circle, label: t.radioFieldTool, category: 'basic' },
    { id: 'dropdown-field', icon: ChevronDown, label: t.dropdownFieldTool, category: 'basic' },
    { id: 'signature-field', icon: PenTool, label: t.signatureFieldTool, category: 'basic' },
    { id: 'static-text-field', icon: FileText, label: t.staticTextFieldTool, category: 'basic' },
    { id: 'camera-field', icon: Camera, label: t.cameraFieldTool, category: 'mobile' },
    { id: 'gps-location-field', icon: MapPin, label: t.gpsLocationFieldTool, category: 'mobile' },
    { id: 'qr-scan-field', icon: QrCode, label: t.qrScanFieldTool, category: 'mobile' },
    { id: 'barcode-scan-field', icon: Barcode, label: t.barcodeScanFieldTool, category: 'mobile' },
  ] as const;

  const basicTools = tools.filter(t => t.category === 'basic');
  const mobileTools = tools.filter(t => t.category === 'mobile');

  const ToggleIcon = isRTL ? (isExpanded ? ChevronRight : ChevronLeft) : (isExpanded ? ChevronLeft : ChevronRight);

  return (
    <>
      {/* Compact Toggle Button */}
      {!isExpanded && (
        <motion.button
          initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => setIsExpanded(true)}
          className={`fixed ${isRTL ? 'right-6' : 'left-6'} top-1/2 -translate-y-1/2 z-40 w-14 h-14 glass rounded-2xl shadow-2xl border-white/10 flex items-center justify-center hover:scale-105 transition-transform group`}
        >
          <Plus className="w-6 h-6 text-primary group-hover:rotate-90 transition-transform" />
        </motion.button>
      )}

      {/* Expanded Sidebar */}
      <AnimatePresence>
        {isExpanded && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsExpanded(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30"
            />

            {/* Sidebar Panel */}
            <motion.div
              initial={{ x: isRTL ? 300 : -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: isRTL ? 300 : -300, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={`fixed ${isRTL ? 'right-0' : 'left-0'} top-0 h-full w-80 glass backdrop-blur-2xl border-r border-border/10 shadow-2xl z-40 overflow-y-auto`}
              dir={direction}
            >
              {/* Header */}
              <div className="sticky top-0 glass backdrop-blur-xl border-b border-border/10 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                    <Plus className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">{isRTL ? 'כלי עריכה' : 'Editor Tools'}</h3>
                    <p className="text-xs text-muted-foreground">{isRTL ? 'בחר כלי להוספה' : 'Select a tool to add'}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="w-8 h-8 rounded-lg hover:bg-muted/50 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Basic Tools Section */}
              <div className="p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  {isRTL ? 'כלים בסיסיים' : 'Basic Tools'}
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {basicTools.map((tool) => {
                    const isActive = activeTool === tool.id;
                    return (
                      <button
                        key={tool.id}
                        onClick={() => {
                          onToolChange(tool.id as ToolMode);
                          setIsExpanded(false);
                        }}
                        className={`
                          p-4 rounded-xl transition-all relative group
                          ${isActive
                            ? 'bg-primary text-white shadow-lg shadow-primary/30'
                            : 'bg-muted/30 hover:bg-primary/10 hover:border-primary/20 border border-transparent'}
                        `}
                      >
                        <tool.icon className={`w-6 h-6 mx-auto mb-2 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                        <p className="text-xs font-bold text-center">{tool.label}</p>
                        {isActive && (
                          <motion.div
                            layoutId="activeToolSidebar"
                            className="absolute inset-0 border-2 border-white rounded-xl"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mobile Tools Section */}
              <div className="p-4 pt-0">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                  <Camera className="w-3.5 h-3.5" />
                  {isRTL ? 'כלים מתקדמים' : 'Mobile Tools'}
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {mobileTools.map((tool) => {
                    const isActive = activeTool === tool.id;
                    return (
                      <button
                        key={tool.id}
                        onClick={() => {
                          onToolChange(tool.id as ToolMode);
                          setIsExpanded(false);
                        }}
                        className={`
                          p-4 rounded-xl transition-all relative group
                          ${isActive
                            ? 'bg-primary text-white shadow-lg shadow-primary/30'
                            : 'bg-muted/30 hover:bg-primary/10 hover:border-primary/20 border border-transparent'}
                        `}
                      >
                        <tool.icon className={`w-6 h-6 mx-auto mb-2 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                        <p className="text-xs font-bold text-center">{tool.label}</p>
                        {isActive && (
                          <motion.div
                            layoutId="activeToolSidebar"
                            className="absolute inset-0 border-2 border-white rounded-xl"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
