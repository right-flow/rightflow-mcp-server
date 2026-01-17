import {
  Type,
  CheckSquare,
  Circle,
  ChevronDown,
  PenTool,
  FileText,
  MousePointer2,
  Plus
} from 'lucide-react';
import { ToolMode } from '@/types/fields';
import { useTranslation, useDirection } from '@/i18n';
import { motion } from 'framer-motion';

interface ToolsBarProps {
  activeTool: ToolMode;
  onToolChange: (tool: ToolMode) => void;
}

export const ToolsBar = ({ activeTool, onToolChange }: ToolsBarProps) => {
  const t = useTranslation();
  const direction = useDirection();
  const isRTL = direction === 'rtl';

  const tools = [
    { id: 'select', icon: MousePointer2, label: t.selectTool },
    { id: 'text-field', icon: Type, label: t.textFieldTool },
    { id: 'checkbox-field', icon: CheckSquare, label: t.checkboxFieldTool },
    { id: 'radio-field', icon: Circle, label: t.radioFieldTool },
    { id: 'dropdown-field', icon: ChevronDown, label: t.dropdownFieldTool },
    { id: 'signature-field', icon: PenTool, label: t.signatureFieldTool },
    { id: 'static-text-field', icon: FileText, label: t.staticTextFieldTool },
  ] as const;

  return (
    <motion.div
      initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`fixed ${isRTL ? 'right-6' : 'left-6'} top-1/2 -translate-y-1/2 z-40 flex flex-col gap-2 glass p-2 rounded-2xl shadow-2xl border-white/10`}
      dir={direction}
    >
      <div className="p-2 mb-1 flex items-center justify-center border-b border-border/50">
        <Plus className="w-4 h-4 text-primary" />
      </div>

      {tools.map((tool) => {
        const isActive = activeTool === tool.id;
        return (
          <button
            key={tool.id}
            onClick={() => onToolChange(tool.id as ToolMode)}
            className={`
              w-12 h-12 flex items-center justify-center rounded-xl transition-all relative group
              ${isActive
                ? 'bg-primary text-white shadow-lg shadow-primary/30'
                : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'}
            `}
            title={tool.label}
          >
            <tool.icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />

            {/* Tooltip (pseudo) */}
            <div className={`
              absolute ${isRTL ? 'right-full mr-4' : 'left-full ml-4'} px-3 py-1.5 bg-foreground text-background text-xs font-bold rounded-lg 
              opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50
            `}>
              {tool.label}
            </div>

            {isActive && (
              <motion.div
                layoutId="activeTool"
                className={`absolute ${isRTL ? '-right-1' : '-left-1'} w-1 h-6 bg-white rounded-full`}
              />
            )}
          </button>
        );
      })}
    </motion.div>
  );
};
