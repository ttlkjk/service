import { useState, useEffect } from 'react';
import { getHospitals } from '../supabase';

function HospitalSearch({ onSelect }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [hasTyped, setHasTyped] = useState(false);

    useEffect(() => {
        const searchHospitals = async () => {
            if (query.length < 2) {
                setResults([]);
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                const data = await getHospitals(query);
                setResults(data);
            } catch (error) {
                console.error("Error searching hospitals", error);
            } finally {
                setIsLoading(false);
            }
        };

        const timeoutId = setTimeout(searchHospitals, 300);
        return () => clearTimeout(timeoutId);
    }, [query]);

    const handleChange = (e) => {
        setQuery(e.target.value);
        if (!hasTyped) setHasTyped(true);
    };

    return (
        <div style={{ position: 'relative', width: '100%' }}>
            <input
                type="text"
                placeholder="Search Hospital Name (min 2 chars)..."
                value={query}
                onChange={handleChange}
                onFocus={() => setIsSearching(true)}
                onBlur={() => setTimeout(() => setIsSearching(false), 200)}
                autoComplete="off"
            />
            {isSearching && (
                <div className="search-dropdown-container" style={{ position: 'absolute', top: '100%', left: 0, width: '100%', zIndex: 1000 }}>
                    {isLoading && <div className="search-loading">Searching...</div>}
                    {!isLoading && query.length >= 2 && results.length === 0 && hasTyped && (
                        <div className="search-no-results">No hospitals found.</div>
                    )}
                    {results.length > 0 && (
                        <ul className="search-results">
                            {results.map((hospital) => (
                                <li
                                    key={hospital.id}
                                    className="search-result-item"
                                    onMouseDown={(e) => {
                                        e.preventDefault(); // Prevents input from losing focus immediately
                                        onSelect(hospital);
                                        setQuery(hospital.name);
                                        setIsSearching(false);
                                        setResults([]);
                                    }}
                                >
                                    <strong>{hospital.name}</strong>
                                    <small>{hospital.location || 'No location info'}</small>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}

export default HospitalSearch;
