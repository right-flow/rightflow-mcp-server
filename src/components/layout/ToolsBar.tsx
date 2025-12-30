import { Type, CheckSquare, Circle, ChevronDown, PenTool, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToolMode } from '@/types/fields';

interface ToolsBarProps {
  activeTool: ToolMode;
  onToolChange: (tool: ToolMode) => void;
}

export const ToolsBar = ({ activeTool, onToolChange }: ToolsBarProps) => {
  const isFieldToolActive = activeTool !== 'select';

  return (
    <div className="w-full h-16 bg-gradient-to-b from-secondary to-background border-b border-border flex items-center justify-center px-4 gap-3" dir="rtl">
      <div className="text-sm font-medium text-muted-foreground ml-4">
        כלי יצירת שדות:
      </div>

      <Button
        variant={activeTool === 'text-field' ? 'default' : 'outline'}
        size="default"
        onClick={() => onToolChange('text-field')}
        title="הוסף שדה טקסט - גרור על ה-PDF ליצירת שדה"
        className="gap-2"
      >
        <Type className="w-5 h-5" />
        שדה טקסט
      </Button>

      <Button
        variant={activeTool === 'checkbox-field' ? 'default' : 'outline'}
        size="default"
        onClick={() => onToolChange('checkbox-field')}
        title="הוסף תיבת סימון - לחץ על ה-PDF למיקום השדה"
        className="gap-2"
      >
        <CheckSquare className="w-5 h-5" />
        תיבת סימון
      </Button>

      <Button
        variant={activeTool === 'radio-field' ? 'default' : 'outline'}
        size="default"
        onClick={() => onToolChange('radio-field')}
        title="הוסף כפתור רדיו - לחץ על ה-PDF למיקום השדה"
        className="gap-2"
      >
        <Circle className="w-5 h-5" />
        כפתור רדיו
      </Button>

      <Button
        variant={activeTool === 'dropdown-field' ? 'default' : 'outline'}
        size="default"
        onClick={() => onToolChange('dropdown-field')}
        title="הוסף רשימה נפתחת - גרור על ה-PDF ליצירת שדה"
        className="gap-2"
      >
        <ChevronDown className="w-5 h-5" />
        רשימה נפתחת
      </Button>

      <Button
        variant={activeTool === 'signature-field' ? 'default' : 'outline'}
        size="default"
        onClick={() => onToolChange('signature-field')}
        title="הוסף שדה חתימה - גרור על ה-PDF ליצירת שדה"
        className="gap-2"
      >
        <PenTool className="w-5 h-5" />
        שדה חתימה
      </Button>

      {/* Release button - only visible when a field tool is active */}
      {isFieldToolActive && (
        <Button
          variant="destructive"
          size="icon"
          onClick={() => onToolChange('select')}
          title="שחרר מצב יצירת שדה (Esc)"
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
        title="מצב בחירה - בחר ועדכן שדות קיימים"
        className="mr-auto"
      >
        מצב בחירה
      </Button>
    </div>
  );
};
