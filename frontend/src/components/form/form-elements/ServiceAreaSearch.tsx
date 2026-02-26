import React, { useState, useEffect, useRef, useCallback } from "react";
import { useCheckServiceAreaMutation } from "../../../features/serviceAreas/serviceAreaApi";

interface ServiceAreaSearchProps {
    isLoaded: boolean;
    onLocationSelect?: (lat: number, lng: number) => void;
}

interface Prediction {
    description: string;
    place_id: string;
}

export const ServiceAreaSearch: React.FC<ServiceAreaSearchProps> = ({ isLoaded, onLocationSelect }) => {
    // Refs for Google Services to avoid recreation in StrictMode
    const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
    const placesService = useRef<google.maps.places.PlacesService | null>(null);
    const sessionToken = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

    // UI State
    const [inputValue, setInputValue] = useState("");
    const [predictions, setPredictions] = useState<Prediction[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const [checkServiceArea, { data, isLoading: isChecking, reset }] = useCheckServiceAreaMutation();

    // Initialize services
    useEffect(() => {
        if (isLoaded && !autocompleteService.current) {
            autocompleteService.current = new google.maps.places.AutocompleteService();
            // PlacesService requires an HTML element, but we only use it programmatically
            const dummyDiv = document.createElement("div");
            placesService.current = new google.maps.places.PlacesService(dummyDiv);
            sessionToken.current = new google.maps.places.AutocompleteSessionToken();
        }
    }, [isLoaded]);

    // Handle outside clicks
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
                inputRef.current && !inputRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Debounced prediction fetching
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (!inputValue.trim() || !autocompleteService.current || !isLoaded) {
                setPredictions([]);
                return;
            }

            autocompleteService.current.getPlacePredictions(
                {
                    input: inputValue,
                    sessionToken: sessionToken.current || undefined,
                },
                (results, status) => {
                    if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                        setPredictions(results.map(r => ({
                            description: r.description,
                            place_id: r.place_id,
                        })));
                        setShowDropdown(true);
                        setSelectedIndex(-1);
                    } else {
                        setPredictions([]);
                    }
                }
            );
        }, 300);

        return () => clearTimeout(timer);
    }, [inputValue, isLoaded]);

    const handleSelect = useCallback(async (prediction: Prediction) => {
        setInputValue(prediction.description);
        setShowDropdown(false);
        setPredictions([]);
        reset(); // Clear previous check result

        if (!placesService.current) return;

        placesService.current.getDetails(
            {
                placeId: prediction.place_id,
                fields: ["geometry.location"],
                sessionToken: sessionToken.current || undefined,
            },
            async (place, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
                    const lat = place.geometry.location.lat();
                    const lng = place.geometry.location.lng();

                    if (onLocationSelect) {
                        onLocationSelect(lat, lng);
                    } else {
                        await checkServiceArea({ longitude: lng, latitude: lat });
                    }

                    // Refresh session token for next search
                    sessionToken.current = new google.maps.places.AutocompleteSessionToken();
                }
            }
        );
    }, [checkServiceArea, reset]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!showDropdown) return;

        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                setSelectedIndex(prev => (prev < predictions.length - 1 ? prev + 1 : prev));
                break;
            case "ArrowUp":
                e.preventDefault();
                setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
                break;
            case "Enter":
                e.preventDefault();
                if (selectedIndex >= 0) {
                    handleSelect(predictions[selectedIndex]);
                }
                break;
            case "Escape":
                setShowDropdown(false);
                break;
        }
    };

    return (
        <div className="relative w-full mb-6">
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => predictions.length > 0 && setShowDropdown(true)}
                    placeholder="Search location to check service availability..."
                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                />

                {isChecking && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                    </div>
                )}
            </div>

            {/* Dropdown Predictions */}
            {showDropdown && predictions.length > 0 && (
                <div
                    ref={dropdownRef}
                    className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
                >
                    <ul className="max-h-60 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
                        {predictions.map((p, index) => (
                            <li
                                key={p.place_id}
                                onClick={() => handleSelect(p)}
                                className={`px-4 py-3 cursor-pointer text-sm transition-colors ${index === selectedIndex
                                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                                    : "hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300"
                                    }`}
                            >
                                <div className="flex items-center">
                                    <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <span className="truncate">{p.description}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* No Results Fallback */}
            {showDropdown && inputValue && predictions.length === 0 && (
                <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    No matching locations found
                </div>
            )}

            {/* Status Feedback */}
            {data && !isChecking && (
                <div className="mt-3 transition-all duration-300 animate-in zoom-in-95">
                    <div
                        className={`px-4 py-3 rounded-lg flex items-center shadow-sm ${data.data.isUnderService
                            ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-900/30"
                            : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-900/30"
                            }`}
                    >
                        <span className="mr-2 text-lg">
                            {data.data.isUnderService ? "✅" : "❌"}
                        </span>
                        <span className="font-medium">
                            {data.data.isUnderService
                                ? "This location is within our service area"
                                : "This location is outside our service area"}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};
