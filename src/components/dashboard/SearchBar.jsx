import React, { useState, useEffect } from 'react';
import { Search, Loader2, FileText } from 'lucide-react';
import { Input } from '../ui/input';
import { searchScripts } from '../../lib/db';
import { useDebounce } from '../../hooks/useDebounce'; // Assuming useDebounce exists or I'll implement inline debounce

export default function SearchBar({ onSelectResult }) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    
    const debouncedQuery = useDebounce(query, 300);

    useEffect(() => {
        if (debouncedQuery.trim()) {
            performSearch(debouncedQuery);
        } else {
            setResults([]);
        }
    }, [debouncedQuery]);

    const performSearch = async (q) => {
        setLoading(true);
        try {
            const data = await searchScripts(q);
            setResults(data);
            setOpen(true);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative w-full max-w-sm">
            <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="搜尋劇本..."
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    className="pl-8"
                    onFocus={() => query && setOpen(true)}
                    onBlur={() => setTimeout(() => setOpen(false), 200)} // Delay to allow click
                />
                {loading && <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
            </div>

            {open && results.length > 0 && (
                <div className="absolute top-full mt-1 w-full bg-popover border rounded-md shadow-md z-50 max-h-[300px] overflow-y-auto">
                    {results.map(script => (
                        <div 
                            key={script.id}
                            className="flex items-center gap-2 p-2 hover:bg-muted cursor-pointer text-sm"
                            onClick={() => {
                                onSelectResult(script);
                                setOpen(false);
                            }}
                        >
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <div className="flex-1 truncate">
                                <div className="font-medium">{script.title}</div>
                                <div className="text-xs text-muted-foreground truncate opacity-70">
                                    {script.content?.substring(0, 50)}...
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
