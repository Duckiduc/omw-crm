import { useState, type KeyboardEvent } from "react";
import { Input } from "./Input";
import { Button } from "./Button";
import { X, Plus } from "lucide-react";

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
}

export function TagInput({
  tags,
  onChange,
  placeholder = "Add tags...",
  suggestions = [],
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredSuggestions = suggestions.filter(
    (suggestion) =>
      !tags.includes(suggestion) &&
      suggestion.toLowerCase().includes(inputValue.toLowerCase())
  );

  const addTag = (tagText: string) => {
    const newTag = tagText.trim();
    if (newTag && !tags.includes(newTag)) {
      onChange([...tags, newTag]);
    }
    setInputValue("");
    setShowSuggestions(false);
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-2 p-2 border rounded-md min-h-[40px] focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent">
        {tags.map((tag, index) => (
          <span
            key={index}
            className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-sm"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="hover:bg-primary/20 rounded-full p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <Input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(e.target.value.length > 0);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(inputValue.length > 0)}
          placeholder={tags.length === 0 ? placeholder : ""}
          className="border-none shadow-none focus-visible:ring-0 flex-1 min-w-[120px]"
        />
        {inputValue && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => addTag(inputValue)}
            className="p-1 h-6 w-6"
          >
            <Plus className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-32 overflow-y-auto">
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => addTag(suggestion)}
              className="w-full px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground text-sm"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
