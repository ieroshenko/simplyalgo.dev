import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";

interface VoiceSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const VOICE_OPTIONS = [
  { value: "alloy", label: "Alloy", description: "Neutral and balanced" },
  { value: "ash", label: "Ash", description: "Clear and articulate" },
  { value: "ballad", label: "Ballad", description: "Smooth and warm" },
  { value: "coral", label: "Coral", description: "Friendly and upbeat" },
  { value: "echo", label: "Echo", description: "Calm and measured" },
  { value: "sage", label: "Sage", description: "Professional and confident" },
  { value: "shimmer", label: "Shimmer", description: "Energetic and engaging" },
  { value: "verse", label: "Verse", description: "Natural and conversational" },
];

const VoiceSelector = ({ value, onChange, disabled }: VoiceSelectorProps) => {
  const selectedVoice = VOICE_OPTIONS.find((v) => v.value === value);

  return (
    <div className="space-y-3">
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a voice" />
        </SelectTrigger>
        <SelectContent>
          {VOICE_OPTIONS.map((voice) => (
            <SelectItem key={voice.value} value={voice.value}>
              <div className="flex flex-col">
                <span className="font-medium">{voice.label}</span>
                <span className="text-xs text-muted-foreground">
                  {voice.description}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedVoice && (
        <Card className="p-3 bg-muted/50">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">{selectedVoice.label}:</span>{" "}
            {selectedVoice.description}
          </p>
          {disabled && (
            <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-1">
              Voice cannot be changed after interview starts
            </p>
          )}
        </Card>
      )}
    </div>
  );
};

export default VoiceSelector;
