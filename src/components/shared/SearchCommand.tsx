// Task 92.2: Global search command palette (Cmd+K / Ctrl+K)
// Debounced input, results grouped by category

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useGlobalSearch, type SearchResult } from '@/hooks/useGlobalSearch';
import { useAuth } from '@/hooks/useAuth';
import { Search, BookOpen, FileText, Megaphone, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DEBOUNCE_MS = 300;

const categoryConfig: Record<SearchResult['type'], { label: string; icon: typeof BookOpen }> = {
  course: { label: 'Courses', icon: BookOpen },
  assignment: { label: 'Assignments', icon: FileText },
  announcement: { label: 'Announcements', icon: Megaphone },
};

const SearchCommand = () => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const { role } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: results, isLoading } = useGlobalSearch(debouncedQuery, role);

  // Debounce input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(input), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [input]);

  // Keyboard shortcut: Cmd+K / Ctrl+K
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setOpen((prev) => !prev);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Focus input when dialog opens; reset state on close via onOpenChange
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setInput('');
      setDebouncedQuery('');
    }
  };

  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    navigate(result.url);
  };

  // Group results by type
  const grouped: Record<string, SearchResult[]> = {};
  for (const r of results ?? []) {
    const list = grouped[r.type] ?? [];
    list.push(r);
    grouped[r.type] = list;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Search</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Search className="h-4 w-4 text-gray-400 shrink-0" />
          <Input
            ref={inputRef}
            placeholder="Search courses, assignments, announcements..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="border-0 shadow-none focus-visible:ring-0 p-0 h-auto text-sm"
          />
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {debouncedQuery.length >= 2 && !isLoading && Object.keys(grouped).length === 0 && (
            <p className="text-sm text-gray-500 text-center py-6">No results found</p>
          )}

          {Object.entries(grouped).map(([type, items]) => {
            const config = categoryConfig[type as SearchResult['type']];
            if (!config || !items) return null;
            const Icon = config.icon;
            return (
              <div key={type} className="mb-2">
                <p className="text-[10px] font-black tracking-widest uppercase text-gray-400 px-2 py-1">
                  {config.label}
                </p>
                {items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm hover:bg-slate-50 transition-colors"
                  >
                    <Icon className="h-4 w-4 text-gray-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{item.title}</p>
                      {item.description && (
                        <p className="text-xs text-gray-500 truncate">{item.description}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            );
          })}

          {!debouncedQuery && (
            <p className="text-sm text-gray-400 text-center py-6">
              Type to search... <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-xs">⌘K</kbd>
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SearchCommand;
