import React, { useState, useRef, useEffect, useCallback } from "react";
import { useCheckServiceAreaMutation } from "../../features/serviceAreas/serviceAreaApi";

interface QuickServiceCheckProps {
    isLoaded: boolean;
    onLocationFocus?: (lat: number, lng: number) => void;
}

interface Prediction {
    description: string;
    place_id: string;
}

export const QuickServiceCheck: React.FC<QuickServiceCheckProps> = ({ isLoaded, onLocationFocus }) => {
    const [inputValue, setInputValue] = useState("");
    const [predictions, setPredictions] = useState<Prediction[]>([]);
    const [showPredictions, setShowPredictions] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    // RTK Mutation
    const [checkService, { data: result, isLoading: isChecking, reset: resetCheck }] = useCheckServiceAreaMutation();

    // Services refs
    const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
    const placesService = useRef<google.maps.places.PlacesService | null>(null);
    const sessionToken = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isLoaded && !autocompleteService.current) {
            autocompleteService.current = new google.maps.places.AutocompleteService();
            placesService.current = new google.maps.places.PlacesService(document.createElement("div"));
            sessionToken.current = new google.maps.places.AutocompleteSessionToken();
        }
    }, [isLoaded]);

    const fetchPredictions = useCallback((input: string) => {
        if (!input || !autocompleteService.current) {
            setPredictions([]);
            return;
        }

        setIsSearching(true);
        autocompleteService.current.getPlacePredictions(
            {
                input,
                sessionToken: sessionToken.current!,
            },
            (results, status) => {
                setIsSearching(false);
                if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                    setPredictions(results.map(r => ({
                        description: r.description,
                        place_id: r.place_id
                    })));
                    setShowPredictions(true);
                } else {
                    setPredictions([]);
                }
            }
        );
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setInputValue(value);
        resetCheck(); // Clear previous result badge

        if (debounceTimer.current) clearTimeout(debounceTimer.current);

        if (value.length > 2) {
            debounceTimer.current = setTimeout(() => {
                fetchPredictions(value);
            }, 300);
        } else {
            setPredictions([]);
            setShowPredictions(false);
        }
    };

    const handleSelect = async (prediction: Prediction) => {
        setInputValue(prediction.description);
        setShowPredictions(false);

        if (!placesService.current) return;

        placesService.current.getDetails(
            {
                placeId: prediction.place_id,
                fields: ["geometry"],
                sessionToken: sessionToken.current!,
            },
            async (place, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
                    const lat = place.geometry.location.lat();
                    const lng = place.geometry.location.lng();

                    // Focus map
                    onLocationFocus?.(lat, lng);

                    // Check backend
                    await checkService({ latitude: lat, longitude: lng });

                    // New session token
                    sessionToken.current = new google.maps.places.AutocompleteSessionToken();
                }
            }
        );
    };

    // Outside click helper
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowPredictions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const isUnderService = result?.data?.isUnderService;

    return (
        <div ref={containerRef} className="relative w-full max-w-2xl mx-auto">
            <div className="flex flex-col gap-2">
                <div className="relative flex items-center group">
                    <div className="absolute left-4 z-10 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>

                    <input
                        type="text"
                        value={inputValue}
                        onChange={handleInputChange}
                        onFocus={() => inputValue.length > 2 && setShowPredictions(true)}
                        placeholder="Quick Check: Is your location under our service area?"
                        className="w-full pl-12 pr-12 py-3 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-xl shadow-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all dark:text-white placeholder-gray-400 font-medium"
                    />

                    {isChecking || isSearching ? (
                        <div className="absolute right-4">
                            <div className="w-5 h-5 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                        </div>
                    ) : result && (
                        <div className="absolute right-4 flex items-center gap-2">
                            {isUnderService ? (
                                <span className="flex items-center gap-1.5 px-3 py-1 bg-green-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-md animate-in fade-in zoom-in duration-300">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                    </svg>
                                    Under Service
                                </span>
                            ) : (
                                <span className="flex items-center gap-1.5 px-3 py-1 bg-red-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-md animate-in fade-in zoom-in duration-300">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    Outside Service
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Dropdown */}
                {showPredictions && predictions.length > 0 && (
                    <ul className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden z-[100] animate-in fade-in slide-in-from-top-1 duration-200">
                        {predictions.map((p) => (
                            <li
                                key={p.place_id}
                                onClick={() => handleSelect(p)}
                                className="px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer flex items-center gap-3 transition-colors group"
                            >
                                <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                                    <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    </svg>
                                </div>
                                <span className="text-sm text-gray-700 dark:text-gray-300 font-medium truncate">
                                    {p.description}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};
