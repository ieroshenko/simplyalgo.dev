import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { Settings, Palette, Keyboard } from 'lucide-react';
import { EditorTheme, useEditorTheme } from '@/hooks/useEditorTheme';

interface EditorSettingsProps {
  currentTheme: EditorTheme;
  onThemeChange: (theme: EditorTheme) => void;
  vimMode: boolean;
  onVimModeChange: (enabled: boolean) => void;
}

const EditorSettings = ({ 
  currentTheme, 
  onThemeChange, 
  vimMode, 
  onVimModeChange 
}: EditorSettingsProps) => {
  const { availableThemes } = useEditorTheme();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Palette className="w-4 h-4" />
          Editor Theme
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup value={currentTheme} onValueChange={onThemeChange}>
          {availableThemes.map((theme) => (
            <DropdownMenuRadioItem key={theme.value} value={theme.value}>
              {theme.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        
        <DropdownMenuSeparator />
        
        <div className="p-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="vim-mode" className="flex items-center gap-2 text-sm">
              <Keyboard className="w-4 h-4" />
              Vim Mode
            </Label>
            <Switch
              id="vim-mode"
              checked={vimMode}
              onCheckedChange={onVimModeChange}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Enable Vim keybindings for navigation
          </p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default EditorSettings;