// Constants
const MAX_RECENT_SEARCHES = 5;
const API_KEY = '9ff74386fc4529d7a1d8cf6f4a3e5062';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const AUTOCOMPLETE_LIMIT = 50; // Increased to get more results but limited by API
const SEARCH_DEBOUNCE = 400; // ms

// Enhanced City Cache Management 
let cityCache = new Map();
let popularCitiesCache = [];
let searchController = null; // For canceling pending requests

const GEO_BASE_URL = 'https://api.openweathermap.org/geo/1.0';

async function fetchGeocodingResults(query, limit, signal) {
    const url = `${GEO_BASE_URL}/direct?q=${encodeURIComponent(query)}&limit=${limit}&appid=${API_KEY}`;
    const response = await fetch(url, { signal });

    let payload;
    try {
        payload = await response.json();
    } catch (error) {
        throw new Error('Invalid geocoding response format.');
    }

    if (!response.ok) {
        const apiMessage = payload && payload.message ? payload.message : `HTTP ${response.status}`;
        throw new Error(apiMessage);
    }

    if (!Array.isArray(payload)) {
        if (payload && payload.message) {
            throw new Error(payload.message);
        }
        return [];
    }

       return payload;
}

// search state management
const searchState = {
    isSearching: false,
    currentQuery: '',
    searchHistory: new Set(),
    lastSearchTime: 0,
    searchCount: 0
};

// Initialize popular cities cache 
async function initializePopularCities() {
    const cached = localStorage.getItem('popularCitiesCache');
    const cacheTime = localStorage.getItem('popularCitiesCacheTime');

    if (cached && cacheTime && (Date.now() - parseInt(cacheTime)) < CACHE_DURATION) {
        popularCitiesCache = JSON.parse(cached);
        console.log('✅ Loaded popular cities from cache');
        return;
    }

    await fetchPopularCities();
}

// Enhanced popular cities fetch 
async function fetchPopularCities() {
    const majorCities = [
        'London,GB', 'Paris,FR', 'Berlin,DE', 'Madrid,ES', 'Rome,IT',
        'New York,US', 'Los Angeles,US', 'Chicago,US', 'Houston,US', 'Phoenix,US',
        'Toronto,CA', 'Montreal,CA', 'Vancouver,CA', 'Tokyo,JP', 'Beijing,CN',
        'Mumbai,IN', 'Delhi,IN', 'Bangalore,IN', 'Sydney,AU', 'Melbourne,AU'
    ];

    try {
        console.log('🔄 Fetching popular cities ...');

        // Use Promise.all for parallel requests
        const requests = majorCities.map(city =>
           fetch(`${GEO_BASE_URL}/direct?q=${encodeURIComponent(city)}&limit=1&appid=${API_KEY}`)
                .then(response => response.json())
        );

        const responses = await Promise.all(requests);

        popularCitiesCache = responses
            .filter(response => response && response.length > 0)
            .map(response => response.data[0].name)
            .sort();

        // Cache the results
        localStorage.setItem('popularCitiesCache', JSON.stringify(popularCitiesCache));
        localStorage.setItem('popularCitiesCacheTime', Date.now().toString());

        console.log(`✅ Fetched ${popularCitiesCache.length} popular cities`);

    } catch (error) {
        console.error('❌ Error fetching popular cities:', error.message);
        // Fallback to basic list
        popularCitiesCache = ['London', 'Paris', 'New York', 'Tokyo', 'Sydney'];
    }
}

// Enhanced city coordinates with fetch and better caching
async function getCityCoordinates(cityQuery) {
    const cacheKey = cityQuery.toLowerCase();

    // Check memory cache first
    if (cityCache.has(cacheKey)) {
        const cached = cityCache.get(cacheKey);
        if (Date.now() - cached.timestamp < CACHE_DURATION) {
            console.log(`✅ Using cached coordinates for ${cityQuery}`);
            return cached.data;
        }
    }

    try {
        console.log(`🔍 Fetching coordinates for ${cityQuery}...`);

        const response = await fetch(
            `${GEO_BASE_URL}/direct?q=${encodeURIComponent(cityQuery)}&limit=1&appid=${API_KEY}`
        );
        const data = await fetchGeocodingResults(cityQuery, 1);

        if (data && data.length > 0) {
            const result = {
                name: data[0].name,
                country: data[0].country,
                lat: data[0].lat,
                lon: data[0].lon
            };

            // Cache the result
            cityCache.set(cacheKey, {
                data: result,
                timestamp: Date.now()
            });

            console.log(`✅ Cached coordinates for ${cityQuery}`);
            return result;
        }

        return null;

    } catch (error) {
        console.error(`❌ Geocoding error for ${cityQuery}:`, error.message);
        return null;
    }
}

// city search with Axios with fetch and advanced features
async function searchCities(query) {
    if (!query || query.length < 2) return [];

    // Update search state
    searchState.currentQuery = query;
    searchState.isSearching = true;

    // Check cache first
    const cacheKey = `search_${query.toLowerCase()}`;
    if (cityCache.has(cacheKey)) {
        const cached = cityCache.get(cacheKey);
        if (Date.now() - cached.timestamp < CACHE_DURATION) {
            console.log(`✅ Using cached search results for "${query}"`);
            searchState.isSearching = false;
            return cached.data; // Return all cached cities as-is
        }
    }

    // Cancel previous request if still pending
    if (searchController) {
        searchController.abort();
        console.log('⏹️ Canceled previous search request');
    }

    // Create new AbortController for this request
    searchController = new AbortController();

    try {
        console.log(`🔍 Searching cities for "${query}"...`);

       
        const citiesData = await fetchGeocodingResults(query, AUTOCOMPLETE_LIMIT, searchController.signal);

        const results = citiesData
            .map(city => ({
                name: city.name,
                country: city.country,
                state: city.state,
                fullName: city.state ? `${city.name}, ${city.state}` : city.name,
                // Create a unique key for duplicate detection
                uniqueKey: `${city.name.toLowerCase()}_${city.country}`
            }))
            // Enhanced duplicate filtering
            .filter((city, index, self) => {
                // First, check exact duplicates (same name + same country)
                const exactDuplicates = self.filter(c =>
                    c.name.toLowerCase() === city.name.toLowerCase() &&
                    c.country === city.country
                );

                // If multiple entries with same name and country, keep the first one
                if (exactDuplicates.length > 1) {
                    const firstIndex = self.findIndex(c =>
                        c.name.toLowerCase() === city.name.toLowerCase() &&
                        c.country === city.country
                    );
                    return index === firstIndex;
                }

                // If city name is same and countries are similar (like IN, ID, TL for Pune), 
                // treat as duplicates and keep the one with IN (primary country)
                const sameNameCities = self.filter(c =>
                    c.name.toLowerCase() === city.name.toLowerCase()
                );

                if (sameNameCities.length > 1) {
                    // For Pune, prefer IN (India) over other administrative codes
                    if (city.name.toLowerCase() === 'pune') {
                        const hasIN = sameNameCities.some(c => c.country === 'IN');
                        if (hasIN) {
                            return city.country === 'IN'; // Only keep Pune, IN
                        }
                    }

                    // For other cities, prefer the first occurrence
                    const firstSameNameIndex = self.findIndex(c =>
                        c.name.toLowerCase() === city.name.toLowerCase()
                    );
                    return index === firstSameNameIndex;
                }

                return true; // Unique city, keep it
            })
            .slice(0, AUTOCOMPLETE_LIMIT); // Show all cities up to our limit

        console.log(`🔍 API returned ${citiesData.length} cities for "${query}"`);
        console.log(`🔍 Processed ${results.length} cities for display`);

        // Cache the search results
        cityCache.set(cacheKey, {
            data: results,
            timestamp: Date.now()
        });

        // Update search statistics
        searchState.searchCount++;
        searchState.lastSearchTime = Date.now();
        searchState.searchHistory.add(query);

        console.log(`✅ Found ${results.length} cities for "${query}"`);
        searchState.isSearching = false;

        return results;

    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('⏹️ Search request was canceled');
        } else {
            console.error(`❌ City search error for "${query}":`, error.message);
        }
        searchState.isSearching = false;
        return [];
    } finally {
        searchController = null;
    }
}

// Autocomplete Variables
let currentFocus = -1;

//  Autocomplete with Enhanced UI 
function autocomplete(inp) {
    let currentFocus = -1;
    let searchTimeout;
    let isSearching = false;
    let previousLength = 0; // Track previous input length

    // Add visual feedback for search state
    const addSearchingClass = () => {
        inp.classList.add('searching');
        isSearching = true;
    };

    const removeSearchingClass = () => {
        inp.classList.remove('searching');
        isSearching = false;
    };

    inp.addEventListener("input", async function (e) {
        const val = this.value.trim();
        const currentLength = val.length;

        closeAllLists();

        if (val.length < 3) {
            removeSearchingClass();
            previousLength = currentLength;
            return false;
        }

        // Only search if characters were added (not backspace)
        if (currentLength < previousLength) {
            removeSearchingClass();
            previousLength = currentLength;
            return false;
        }

        previousLength = currentLength;

        // Add searching visual feedback
        addSearchingClass();

        
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(async () => {
            try {
                const cities = await searchCities(val);
                removeSearchingClass();

                if (cities.length > 0) {
                    displayEnhancedAutocompleteResults(cities, inp, val);
                } else {
                    displayNoResults(inp, val);
                }
            } catch (error) {
                removeSearchingClass();
                displaySearchError(inp, error.message);
            }
        }, SEARCH_DEBOUNCE);
    });

    // Enhanced keyboard navigation
    inp.addEventListener("keydown", function (e) {
        let x = document.getElementById(this.id + "autocomplete-list");
        if (x) {
            // Get only the actual city items, not header or other elements
            x = x.getElementsByClassName("autocomplete-item");
        }

        if (e.keyCode == 40) { // Down arrow
            e.preventDefault();
            // Prevent input text selection during navigation
            this.setSelectionRange(this.value.length, this.value.length);
            currentFocus++;
            addActive(x);
        } else if (e.keyCode == 38) { // Up arrow
            e.preventDefault();
            // Prevent input text selection during navigation
            this.setSelectionRange(this.value.length, this.value.length);
            currentFocus--;
            addActive(x);
        } else if (e.keyCode == 13) { // Enter
            e.preventDefault();
            if (currentFocus > -1 && x && x[currentFocus]) {
                x[currentFocus].click();
            } else {
                // Trigger search if no item selected
                getWeather();
            }
        } else if (e.keyCode == 27) { // Escape
            e.preventDefault();
            closeAllLists();
            removeSearchingClass();
        }
    });

    function displayEnhancedAutocompleteResults(cities, inp, query) {
        closeAllLists();

        const autocompleteList = document.createElement("DIV");
        autocompleteList.setAttribute("id", inp.id + "autocomplete-list");
        autocompleteList.setAttribute("class", "autocomplete-items enhanced");

        // Add header with search info
        const header = document.createElement("DIV");
        header.className = "autocomplete-header";
        header.innerHTML = `
            <span class="search-info">🔍 Found ${cities.length} cities</span>
            <span class="search-tip">↑↓ Navigate • Enter Select</span>
        `;
        autocompleteList.appendChild(header);

        // Add city results 
        cities.forEach((city, index) => {
            const item = document.createElement("DIV");
            item.className = "autocomplete-item";

            // Enhanced highlighting with better visual feedback
            const highlightedName = city.name.replace(
                new RegExp(`(${query})`, "gi"),
                match => `<strong class="highlight">${match}</strong>`
            );

            const displayName = city.state ? `${city.name}, ${city.state}` : city.name;

            item.innerHTML = `
                <div class="city-info">
                    <span class="city-name">${highlightedName}</span>
                    <span class="city-country">${city.country}</span>
                </div>
            `;
            item.innerHTML += `<input type='hidden' value='${city.name}'>`;

            // Enhanced click handling with visual feedback
            item.addEventListener("click", function (e) {
                e.preventDefault();
                inp.value = this.getElementsByTagName("input")[0].value;
                closeAllLists();
                removeSearchingClass();
                // Add selection feedback
                inp.classList.add('selected');
                setTimeout(() => inp.classList.remove('selected'), 300);
                // Trigger weather search immediately
                getWeather();
            });

            // Enhanced hover effects with smooth transitions
            item.addEventListener("mouseenter", function () {
                // Get current autocomplete items to remove active class
                const currentItems = document.getElementsByClassName("autocomplete-item");
                removeActive(currentItems);
                this.classList.add("autocomplete-active");
                currentFocus = index;
            });

            autocompleteList.appendChild(item);
        });

        inp.parentNode.appendChild(autocompleteList);

        // Add smooth entrance animation
        setTimeout(() => {
            autocompleteList.style.opacity = '1';
            autocompleteList.style.transform = 'translateY(0)';
        }, 10);
    }

    function displayNoResults(inp, query) {
        closeAllLists();


        const autocompleteList = document.createElement("DIV");
        autocompleteList.setAttribute("id", inp.id + "autocomplete-list");
        autocompleteList.setAttribute("class", "autocomplete-items enhanced");

        const noResults = document.createElement("DIV");
        noResults.className = "autocomplete-no-results";
        noResults.innerHTML = `
            <div class="no-results-icon">🔍</div>
            <div class="no-results-text">No cities found for "${query}"</div>
            <div class="no-results-tip">Try different spelling or add country code</div>
        `;

        autocompleteList.appendChild(noResults);
        inp.parentNode.appendChild(autocompleteList);
    }

    function displaySearchError(inp, errorMessage) {
        closeAllLists();

        const autocompleteList = document.createElement("DIV");
        autocompleteList.setAttribute("id", inp.id + "autocomplete-list");
        autocompleteList.setAttribute("class", "autocomplete-items enhanced");

        const errorItem = document.createElement("DIV");
        errorItem.className = "autocomplete-error";
        errorItem.innerHTML = `
            <div class="error-icon">⚠️</div>
            <div class="error-text">Search temporarily unavailable</div>
            <div class="error-tip">Please try again in a moment</div>
        `;

        autocompleteList.appendChild(errorItem);
        inp.parentNode.appendChild(autocompleteList);
    }

    function addActive(x) {
        if (!x) return false;
        removeActive(x);
        if (currentFocus >= x.length) currentFocus = 0;
        if (currentFocus < 0) currentFocus = (x.length - 1);
        x[currentFocus].classList.add("autocomplete-active");

        // Smooth scroll into view
        x[currentFocus].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    function removeActive(x) {
        for (var i = 0; i < x.length; i++) {
            x[i].classList.remove("autocomplete-active");
        }
    }

    function closeAllLists(elmnt) {
        var x = document.getElementsByClassName("autocomplete-items");
        for (var i = 0; i < x.length; i++) {
            if (elmnt != x[i] && elmnt != inp) {
                x[i].parentNode.removeChild(x[i]);
            }
        }
    }

    // Close on outside click with better handling
    document.addEventListener("click", function (e) {
        if (e.target !== inp) {
            closeAllLists(e.target);
            removeSearchingClass();
        }
    });

    // Close on blur with delay for better UX
    inp.addEventListener("blur", function () {
        setTimeout(() => {
            closeAllLists();
            removeSearchingClass();
        }, 200);
    });

    // Focus handling
    inp.addEventListener("focus", function () {
        if (this.value.trim().length >= 2 && !isSearching) {
            // Re-trigger search if there's content
            this.dispatchEvent(new Event('input'));
        }
    });
}

// Call Autocomplete Function
autocomplete(document.getElementById("cityInput"));

function getRecentSearches() {
    const searches = localStorage.getItem('recentWeatherSearches');
    return searches ? JSON.parse(searches) : [];
}

function saveRecentSearch(city) {
    let recentSearches = getRecentSearches();

    // Remove if already exists
    recentSearches = recentSearches.filter(search => search.toLowerCase() !== city.toLowerCase());

    // Add to beginning
    recentSearches.unshift(city);

    // Keep only the most recent searches
    recentSearches = recentSearches.slice(0, MAX_RECENT_SEARCHES);

    localStorage.setItem('recentWeatherSearches', JSON.stringify(recentSearches));
    displayRecentSearches();
}

function displayRecentSearches() {
    const recentSearchesDiv = document.getElementById('recentSearches');
    const recentSearches = getRecentSearches();

    if (recentSearches.length === 0) {
        recentSearchesDiv.innerHTML = '';
        return;
    }

    let html = '<div class="recent-searches-container"><h4>🕐 Recent Searches</h4><div class="recent-searches-list">';

    recentSearches.forEach(city => {
        html += `<button class="recent-search-item" onclick="selectRecentSearch('${city}')">${city}</button>`;
    });

    html += '</div></div>';
    recentSearchesDiv.innerHTML = html;
}

function selectRecentSearch(city) {
    document.getElementById('cityInput').value = city;
    getWeather();
}

// Function to handle Enter key press
function handleKeyPress(event) {
    if (event.key === 'Enter') {
        getWeather();
    }
}

async function getWeather() {
    const city = document.getElementById('cityInput').value.trim();
    const weatherDiv = document.getElementById('weather');
    const aqDiv = document.getElementById('airQuality');
    const forecastDiv = document.getElementById('forecast');
    const metricsDiv = document.getElementById('additionalMetrics');
    const button = document.querySelector('button');

    // Safety checks
    if (!weatherDiv || !forecastDiv || !aqDiv) {
        console.error('Required div elements not found in HTML.');
        return;
    }

    if (!city) {
        weatherDiv.innerHTML = '<span class="error">Please enter a city name.</span>';
        forecastDiv.innerHTML = '';
        aqDiv.innerHTML = '';
        metricsDiv.innerHTML = '';
        return;
    }

    // Show loading state
    weatherDiv.innerHTML = '<div class="loading"></div> Fetching weather data...';
    forecastDiv.innerHTML = '';
    aqDiv.innerHTML = '';
    metricsDiv.innerHTML = '';
    button.disabled = true;

    try {
        // Use cached coordinates or fetch new ones
        const locationData = await getCityCoordinates(city);

        if (!locationData) {
            weatherDiv.innerHTML = '<span class="error">City not found. Please try again.</span>';
            button.disabled = false;
            return;
        }

        const { lat, lon, name, country } = locationData;

        // Fetch all data in parallel for better performance
        const [currentWeatherData, forecastData, airQualityData] = await Promise.all([
            fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`).then(r => r.json()),
            fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`).then(r => r.json()),
            fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`).then(r => r.json())
        ]);

        // Display Current Weather
        displayCurrentWeather(currentWeatherData, name, country, weatherDiv);

        // Save to recent searches
        saveRecentSearch(city);

        // Display Air Quality Data 
        displayAirQuality(airQualityData, aqDiv);

        // Display Forecast
        displayForecast(forecastData, forecastDiv);

        // Display Additional Metrics
        displayAdditionalMetrics(currentWeatherData, metricsDiv);

    } catch (error) {
        console.error('Error:', error);
        weatherDiv.innerHTML = '<span class="error">Error fetching data. Please check your API key and try again.</span>';
    }

    button.disabled = false;
}

function displayCurrentWeather(data, cityName, country, container) {
    if (data.cod === 200) {
        const temp = Math.round(data.main.temp);
        const feelsLike = Math.round(data.main.feels_like);
        const description = data.weather[0].description;
        const humidity = data.main.humidity;
        const windSpeed = data.wind.speed;
        const icon = getWeatherIcon(description);

        //  Dynamic Weather Background Animation
        setWeatherBackground(description, data.weather[0].main);

        container.innerHTML = `
            <div class="weather-card">
                <div class="weather-header">
                    <span class="weather-icon animated-icon">${icon}</span>
                    <div class="weather-info">
                        <h2>${cityName}, ${country}</h2>
                        <p class="description">${description.charAt(0).toUpperCase() + description.slice(1)}</p>
                    </div>
                </div>
                <div class="weather-details">
                    <div class="detail-item">
                        <span class="label">Temperature:</span>
                        <span class="value">${temp}°C</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Feels Like:</span>
                        <span class="value">${feelsLike}°C</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Humidity:</span>
                        <span class="value">${humidity}%</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Wind Speed:</span>
                        <span class="value">${windSpeed} m/s</span>
                    </div>
                </div>
            </div>
        `;
    } else {
        container.innerHTML = `<span class="error">Error: ${data.message}</span>`;
    }
}

function displayAirQuality(data, container) {
    if (!data.list || data.list.length === 0) {
        container.innerHTML = '<span class="error">Air quality data unavailable.</span>';
        return;
    }

    const aq = data.list[0].main.aqi;
    const components = data.list[0].components;

    // AQI Scale: 1 (Good), 2 (Fair), 3 (Moderate), 4 (Poor), 5 (Very Poor)
    const aqiLabels = ['', 'Good', 'Fair', 'Moderate', 'Poor', 'Very Poor'];
    const aqiColors = ['', '#2ecc71', '#f1c40f', '#e67e22', '#e74c3c', '#8b0000'];
    const aqiLevel = aqiLabels[aq] || 'Unknown';
    const aqiColor = aqiColors[aq] || '#95a5a6';

    container.innerHTML = `
        <div class="air-quality-card" style="border-left: 5px solid ${aqiColor}">
            <h3>🌫️ Air Quality Index</h3>
            <div class="aqi-status" style="background-color: ${aqiColor}20; border-left: 5px solid ${aqiColor}; padding: 15px; border-radius: 5px; margin: 10px 0;">
                <p class="aqi-level" style="color: ${aqiColor}; font-weight: bold; font-size: 18px;">${aqiLevel}</p>
            </div>
            <div class="pollutants">
                <div class="pollutant-item">
                    <span class="pollutant-name">PM2.5:</span>
                    <span class="pollutant-value">${(components.pm2_5 || 0).toFixed(2)} µg/m³</span>
                </div>
                <div class="pollutant-item">
                    <span class="pollutant-name">PM10:</span>
                    <span class="pollutant-value">${(components.pm10 || 0).toFixed(2)} µg/m³</span>
                </div>
                <div class="pollutant-item">
                    <span class="pollutant-name">O₃:</span>
                    <span class="pollutant-value">${(components.o3 || 0).toFixed(2)} µg/m³</span>
                </div>
                <div class="pollutant-item">
                    <span class="pollutant-name">NO₂:</span>
                    <span class="pollutant-value">${(components.no2 || 0).toFixed(2)} µg/m³</span>
                </div>
            </div>
        </div>
    `;
}

function displayForecast(data, container) {
    if (!data.list) {
        container.innerHTML = '<span class="error">Forecast unavailable.</span>';
        return;
    }

    let forecastHtml = '<h3>📅 5-Day Forecast</h3><div class="forecast-grid">';
    const dailyForecasts = {};

    data.list.forEach(item => {
        const date = new Date(item.dt * 1000).toDateString();
        if (!dailyForecasts[date]) {
            dailyForecasts[date] = {
                temp: Math.round(item.main.temp),
                tempMax: Math.round(item.main.temp_max),
                tempMin: Math.round(item.main.temp_min),
                description: item.weather[0].description,
                icon: getWeatherIcon(item.weather[0].description),
                humidity: item.main.humidity
            };
        }
    });

    Object.keys(dailyForecasts).slice(0, 5).forEach(date => {
        const day = dailyForecasts[date];
        forecastHtml += `
            <div class="forecast-day">
                <div class="forecast-icon">${day.icon}</div>
                <p class="forecast-date">${new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                <p class="forecast-desc">${day.description.substring(0, 10)}...</p>
                <p class="forecast-temp">H: ${day.tempMax}° L: ${day.tempMin}°</p>
            </div>
        `;
    });

    forecastHtml += '</div>';
    container.innerHTML = forecastHtml;
}

function displayAdditionalMetrics(data, container) {
    if (data.cod === 200) {
        const pressure = data.main.pressure;
        const visibility = (data.visibility / 1000).toFixed(1);
        const sunrise = new Date(data.sys.sunrise * 1000).toLocaleTimeString();
        const sunset = new Date(data.sys.sunset * 1000).toLocaleTimeString();

        container.innerHTML = `
            <div class="metrics-card">
                <h3>📊 Additional Metrics</h3>
                <div class="metrics-grid">
                    <div class="metric">
                        <span class="metric-label">Pressure:</span>
                        <span class="metric-value">${pressure} hPa</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Visibility:</span>
                        <span class="metric-value">${visibility} km</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Sunrise:</span>
                        <span class="metric-value">${sunrise}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Sunset:</span>
                        <span class="metric-value">${sunset}</span>
                    </div>
                </div>
            </div>
        `;
    }
}

// Helper function for weather icons
function getWeatherIcon(description) {
    const lowerDesc = description.toLowerCase();
    if (lowerDesc.includes('clear') || lowerDesc.includes('sunny')) return '☀️';
    if (lowerDesc.includes('cloud')) return '☁️';
    if (lowerDesc.includes('rain') || lowerDesc.includes('drizzle')) return '🌧️';
    if (lowerDesc.includes('snow')) return '❄️';
    if (lowerDesc.includes('thunder') || lowerDesc.includes('storm')) return '⛈️';
    if (lowerDesc.includes('mist') || lowerDesc.includes('fog')) return '🌫️';
    return '🌤️';
}

//  Dynamic Weather Background Animation
function setWeatherBackground(description, mainWeather) {
    const body = document.body;
    const lowerDesc = description.toLowerCase();

    // Remove all existing weather classes
    body.className = body.className.replace(/weather-\w+/g, '').trim();

    // Add weather-specific class for background changes only
    if (lowerDesc.includes('clear') || lowerDesc.includes('sunny')) {
        body.classList.add('weather-sunny');
    } else if (lowerDesc.includes('rain') || lowerDesc.includes('drizzle')) {
        body.classList.add('weather-rainy');
    } else if (lowerDesc.includes('snow')) {
        body.classList.add('weather-snowy');
    } else if (lowerDesc.includes('thunder') || lowerDesc.includes('storm')) {
        body.classList.add('weather-stormy');
    } else if (lowerDesc.includes('cloud')) {
        body.classList.add('weather-cloudy');
    } else if (lowerDesc.includes('mist') || lowerDesc.includes('fog')) {
        body.classList.add('weather-foggy');
    } else {
        body.classList.add('weather-default');
    }
}

// Initialize weather map after page load
// function initializeWeatherMap() {
//     const canvas = document.getElementById('weatherCanvas');
//     if (!canvas) return;

//     const ctx = canvas.getContext('2d');
//     const mapLoading = document.querySelector('.map-loading');

//     // Hide loading text
//     if (mapLoading) {
//         mapLoading.style.display = 'none';
//     }

//     // Set canvas size
//     canvas.width = canvas.offsetWidth;
//     canvas.height = 400;

//     // Start animation
//     animateWeatherMap(ctx, canvas);
// }

// Animate weather map with effects
// function animateWeatherMap(ctx, canvas) {
//     const cities = [
//         { name: 'New York', x: 0.25, y: 0.4, temp: 22, weather: 'sunny' },
//         { name: 'London', x: 0.48, y: 0.3, temp: 15, weather: 'cloudy' },
//         { name: 'Tokyo', x: 0.85, y: 0.35, temp: 18, weather: 'rainy' },
//         { name: 'Sydney', x: 0.9, y: 0.75, temp: 25, weather: 'sunny' },
//         { name: 'Dubai', x: 0.6, y: 0.45, temp: 35, weather: 'sunny' },
//         { name: 'Singapore', x: 0.75, y: 0.65, temp: 28, weather: 'stormy' },
//         { name: 'Mumbai', x: 0.68, y: 0.5, temp: 30, weather: 'cloudy' },
//         { name: 'São Paulo', x: 0.35, y: 0.7, temp: 20, weather: 'rainy' }
//     ];

//     let time = 0;

//     function draw() {
//         // Clear canvas
//         ctx.fillStyle = '#1a1a2e';
//         ctx.fillRect(0, 0, canvas.width, canvas.height);

//         // Draw grid pattern
//         ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
//         ctx.lineWidth = 1;
//         for (let i = 0; i < canvas.width; i += 50) {
//             ctx.beginPath();
//             ctx.moveTo(i, 0);
//             ctx.lineTo(i, canvas.height);
//             ctx.stroke();
//         }
//         for (let i = 0; i < canvas.height; i += 50) {
//             ctx.beginPath();
//             ctx.moveTo(0, i);
//             ctx.lineTo(canvas.width, i);
//             ctx.stroke();
//         }

//         // Draw animated connections between cities
//         ctx.strokeStyle = 'rgba(102, 126, 234, 0.3)';
//         ctx.lineWidth = 2;
//         cities.forEach((city1, i) => {
//             cities.forEach((city2, j) => {
//                 if (i < j && Math.random() > 0.7) {
//                     const x1 = city1.x * canvas.width;
//                     const y1 = city1.y * canvas.height;
//                     const x2 = city2.x * canvas.width;
//                     const y2 = city2.y * canvas.height;

//                     ctx.beginPath();
//                     ctx.moveTo(x1, y1);

//                     // Create curved connection
//                     const cpx = (x1 + x2) / 2 + Math.sin(time * 0.001 + i) * 50;
//                     const cpy = (y1 + y2) / 2 + Math.cos(time * 0.001 + j) * 30;
//                     ctx.quadraticCurveTo(cpx, cpy, x2, y2);

//                     // Animated dash
//                     ctx.setLineDash([5, 10]);
//                     ctx.lineDashOffset = -time * 0.05;
//                     ctx.stroke();
//                     ctx.setLineDash([]);
//                 }
//             });
//         });

//         // Draw cities with weather effects
//         cities.forEach((city, index) => {
//             const x = city.x * canvas.width;
//             const y = city.y * canvas.height;

//             // Pulsing effect
//             const pulseSize = 15 + Math.sin(time * 0.003 + index) * 5;

//             // Weather-based colors
//             let color = '#FFD700'; // Default sunny
//             if (city.weather === 'rainy') color = '#4A90E2';
//             if (city.weather === 'cloudy') color = '#95A5A6';
//             if (city.weather === 'stormy') color = '#E74C3C';

//             // Draw outer glow
//             const gradient = ctx.createRadialGradient(x, y, 0, x, y, pulseSize * 2);
//             gradient.addColorStop(0, color + '40');
//             gradient.addColorStop(1, 'transparent');
//             ctx.fillStyle = gradient;
//             ctx.fillRect(x - pulseSize * 2, y - pulseSize * 2, pulseSize * 4, pulseSize * 4);

//             // Draw city circle
//             ctx.beginPath();
//             ctx.arc(x, y, pulseSize, 0, Math.PI * 2);
//             ctx.fillStyle = color;
//             ctx.fill();
//             ctx.strokeStyle = 'white';
//             ctx.lineWidth = 2;
//             ctx.stroke();

//             // Draw city name
//             ctx.fillStyle = 'white';
//             ctx.font = 'bold 12px Arial';
//             ctx.textAlign = 'center';
//             ctx.fillText(city.name, x, y - pulseSize - 10);

//             // Draw temperature
//             ctx.font = '10px Arial';
//             ctx.fillText(`${city.temp}°C`, x, y + pulseSize + 15);

//             // Draw weather icon
//             const icons = { sunny: '☀️', rainy: '🌧️', cloudy: '☁️', stormy: '⛈️' };
//             ctx.font = '16px Arial';
//             ctx.fillText(icons[city.weather] || '🌤️', x, y + 5);
//         });

//         // Draw title
//         ctx.fillStyle = 'white';
//         ctx.font = 'bold 16px Arial';
//         ctx.textAlign = 'left';
//         ctx.fillText('Global Weather Intelligence Network', 20, 30);

//         // Draw live indicator
//         const liveX = canvas.width - 100;
//         const liveY = 30;
//         ctx.beginPath();
//         ctx.arc(liveX, liveY, 5, 0, Math.PI * 2);
//         ctx.fillStyle = '#2ECC71';
//         ctx.fill();
//         ctx.fillStyle = 'white';
//         ctx.font = '12px Arial';
//         ctx.textAlign = 'left';
//         ctx.fillText('LIVE', liveX + 10, liveY + 4);

//         time += 16;

//         requestAnimationFrame(draw);
//     }

//     draw();
// }

// Initialize map when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    displayRecentSearches();

    // Initialize popular cities cache
    initializePopularCities();

    // // Initialize weather map after a short delay
    // setTimeout(() => {
    //     initializeWeatherMap();
    // }, 1000);
});