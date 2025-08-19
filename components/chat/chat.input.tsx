import { FC, useRef } from "react";
import {
  PromptInput,
  PromptInputButton,
  PromptInputModelSelect,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { GlobeIcon, PlusIcon, FileTextIcon, XIcon, Loader2Icon } from "lucide-react";
import { ChatStatus } from "ai";
import { UploadedFile } from "@/hooks/useFileUpload";

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  model: string;
  setModel: (value: string) => void;
  webSearch: boolean;
  setWebSearch: (value: boolean) => void;
  handleSubmit: (e: React.FormEvent) => void;
  status: ChatStatus;
  models: { name: string; value: string }[];
  // File upload props
  attachedFiles: UploadedFile[];
  isUploading: boolean;
  uploadFiles: (files: File[]) => Promise<void>;
  removeFile: (fileId: string) => Promise<void>;
}

const ChatInput: FC<ChatInputProps> = ({
  input,
  setInput,
  model,
  setModel,
  webSearch,
  setWebSearch,
  handleSubmit,
  status,
  models,
  attachedFiles,
  isUploading,
  uploadFiles,
  removeFile,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      uploadFiles(files);
    }
    // Reset the input so the same file can be selected again
    e.target.value = '';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-3">
      {/* File Upload List */}
      {attachedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachedFiles.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-2 bg-[#1f1e1d]/80 border border-white/10 rounded-lg px-3 py-2 text-sm"
            >
              <FileTextIcon size={16} className="text-blue-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="truncate font-medium text-white">
                  {file.name}
                </div>
                <div className="text-xs text-gray-400">
                  {formatFileSize(file.size)}
                </div>
              </div>
              {file.uploading ? (
                <Loader2Icon size={14} className="animate-spin text-blue-400 flex-shrink-0" />
              ) : (
                <button
                  onClick={() => removeFile(file.id)}
                  className="text-gray-400 hover:text-red-400 transition-colors flex-shrink-0"
                  title="Remove file"
                >
                  <XIcon size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Chat Input */}
      <PromptInput onSubmit={handleSubmit} className="mt-1 border-white/10 p-1">
        <PromptInputTextarea
          onChange={(e) => setInput(e.target.value)}
          value={input}
          placeholder={attachedFiles.length > 0 ? "Ask about your uploaded files..." : "Type your message..."}
        />
        <PromptInputToolbar>
          <PromptInputTools>
            <PromptInputButton
              className="border-white/10 !rounded-lg border"
              onClick={handleFileSelect}
              disabled={isUploading}
              title="Upload PDF files"
            >
              {isUploading ? (
                <Loader2Icon size={16} className="animate-spin" />
              ) : (
                <PlusIcon size={16} />
              )}
            </PromptInputButton>
            <PromptInputButton
              variant={webSearch ? "default" : "ghost"}
              onClick={() => setWebSearch(!webSearch)}
            >
              <GlobeIcon size={16} />
              <span>Search</span>
            </PromptInputButton>
          </PromptInputTools>
          <div className="flex items-center gap-2">
            <PromptInputModelSelect
              onValueChange={(value) => {
                setModel(value);
              }}
              value={model}
            >
              <PromptInputModelSelectTrigger>
                <PromptInputModelSelectValue />
              </PromptInputModelSelectTrigger>
              <PromptInputModelSelectContent>
                {models.map((model) => (
                  <PromptInputModelSelectItem
                    key={model.value}
                    value={model.value}
                  >
                    {model.name}
                  </PromptInputModelSelectItem>
                ))}
              </PromptInputModelSelectContent>
            </PromptInputModelSelect>
            <PromptInputSubmit
              className="bg-tertiary text-white"
              disabled={!input}
              status={status}
            />
          </div>
        </PromptInputToolbar>
        
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
      </PromptInput>
    </div>
  );
};

export default ChatInput;