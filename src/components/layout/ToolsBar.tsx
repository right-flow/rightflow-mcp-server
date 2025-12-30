import { Type, CheckSquare, Circle, ChevronDown, PenTool, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToolMode } from '@/types/fields';
import { useTranslation, useDirection } from '@/i18n';

interface ToolsBarProps {
  activeTool: ToolMode;
  onToolChange: (tool: ToolMode) => void;
}

export const ToolsBar = ({ activeTool, onToolChange }: ToolsBarProps) => {
  const t = useTranslation();
  const direction = useDirection();
  const isFieldToolActive = activeTool !== 'select';

  return (
    <div
      className="w-full h-16 bg-gradient-to-b from-secondary to-background border-b border-border
                 flex items-center justify-center px-4 gap-3"
      dir={direction}
    >
      <Button
        variant={activeTool === 'text-field' ? 'default' : 'outline'}
        size="default"
        onClick={() => onToolChange('text-field')}
        title={t.textFieldTool}
        className="gap-2"
      >
        <Type className="w-5 h-5" />
        {t.textFieldTool}
      </Button>

      <Button
        variant={activeTool === 'checkbox-field' ? 'default' : 'outline'}
        size="default"
        onClick={() => onToolChange('checkbox-field')}
        title={t.checkboxFieldTool}
        className="gap-2"
      >
        <CheckSquare className="w-5 h-5" />
        {t.checkboxFieldTool}
      </Button>

      <Button
        variant={activeTool === 'radio-field' ? 'default' : 'outline'}
        size="default"
        onClick={() => onToolChange('radio-field')}
        title={t.radioFieldTool}
        className="gap-2"
      >
        <Circle className="w-5 h-5" />
        {t.radioFieldTool}
      </Button>

      <Button
        variant={activeTool === 'dropdown-field' ? 'default' : 'outline'}
        size="default"
        onClick={() => onToolChange('dropdown-field')}
        title={t.dropdownFieldTool}
        className="gap-2"
      >
        <ChevronDown className="w-5 h-5" />
        {t.dropdownFieldTool}
      </Button>

      <Button
        variant={activeTool === 'signature-field' ? 'default' : 'outline'}
        size="default"
        onClick={() => onToolChange('signature-field')}
        title={t.signatureFieldTool}
        className="gap-2"
      >
        <PenTool className="w-5 h-5" />
        {t.signatureFieldTool}
      </Button>

      {/* Release button - only visible when a field tool is active */}
      {isFieldToolActive && (
        <Button
          variant="destructive"
          size="icon"
          onClick={() => onToolChange('select')}
          title={t.selectTool}
          className="h-10 w-10"
        >
          <X className="w-5 h-5" />
        </Button>
      )}

      <Button
        variant="ghost"
        size="default"
        onClick={() => onToolChange('select')}
        disabled={activeTool === 'select'}
        title={t.selectTool}
        className={direction === 'rtl' ? 'mr-auto' : 'ml-auto'}
      >
        {t.selectTool}
      </Button>
    </div>
  );
};
