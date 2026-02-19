// Constants
const MAX_RECENT_SEARCHES = 5;
const API_KEY = '9ff74386fc4529d7a1d8cf6f4a3e5062';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const AUTOCOMPLETE_LIMIT = 50; // Increased to get more results
const SEARCH_DEBOUNCE = 400; // ms

// Enhanced City Cache Management with Axios
let cityCache = new Map();
let popularCitiesCache = [];
let searchController = null; // For canceling pending requests
let currentSearchRequest = null;

// Axios instance with professional configuration
const weatherAPI = axios.create({
    baseURL: 'https://api.openweathermap.org/geo/1.0',
    timeout: 5000,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Professional search state management
const searchState = {
    isSearching: false,
    currentQuery: '',
    searchHistory: new Set(),
    lastSearchTime: 0,
    searchCount: 0
};

// Initialize popular cities cache (optimized with Axios)
async function initializePopularCities() {
    const cached = localStorage.getItem('popularCitiesCache');
    const cacheTime = localStorage.getItem('popularCitiesCacheTime');
    
    if (cached && cacheTime && (Date.now() - parseInt(cacheTime)) < CACHE_DURATION) {
        popularCitiesCache = JSON.parse(cached);
        console.log('✅ Loaded popular cities from cache');
        return;
    }
    
    await fetchPopularCitiesWithAxios();
}

// Enhanced popular cities fetch with Axios
async function fetchPopularCitiesWithAxios() {
    const majorCities = [
        'London,GB', 'Paris,FR', 'Berlin,DE', 'Madrid,ES', 'Rome,IT',
        'New York,US', 'Los Angeles,US', 'Chicago,US', 'Houston,US', 'Phoenix,US',
        'Toronto,CA', 'Montreal,CA', 'Vancouver,CA', 'Tokyo,JP', 'Beijing,CN',
        'Mumbai,IN', 'Delhi,IN', 'Bangalore,IN', 'Sydney,AU', 'Melbourne,AU'
    ];
    
    try {
        console.log('🔄 Fetching popular cities with Axios...');
        
        // Use axios.all for parallel requests
        const requests = majorCities.map(city => 
            weatherAPI.get('/direct', {
                params: {
                    q: city,
                    limit: 1,
                    appid: API_KEY
                }
            })
        );
        
        const responses = await axios.all(requests);
        
        popularCitiesCache = responses
            .filter(response => response.data && response.data.length > 0)
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

// Enhanced city coordinates with Axios and better caching
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
        
        const response = await weatherAPI.get('/direct', {
            params: {
                q: cityQuery,
                limit: 1,
                appid: API_KEY
            }
        });
        
        if (response.data && response.data.length > 0) {
            const result = {
                name: response.data[0].name,
                country: response.data[0].country,
                lat: response.data[0].lat,
                lon: response.data[0].lon
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

// Professional city search with Axios and advanced features
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
        const response = await weatherAPI.get('/direct', {
            params: {
                q: query,
                limit: AUTOCOMPLETE_LIMIT,
                appid: API_KEY
            },
            signal: searchController.signal
        });
        
        const results = response.data
            .map(city => ({
                name: city.name,
                country: city.country,
                state: city.state,
                fullName: city.state ? `${city.name}, ${city.state}` : city.name
            }))
            .slice(0, AUTOCOMPLETE_LIMIT); // Show all cities up to our limit
        
        // Cache the search results
        cityCache.set(cacheKey, {
            data: results,
            timestamp: Date.now()
        });
        
        // Update search statistics
        searchState.searchCount++;
        searchState.lastSearchTime = Date.now();
        searchState.searchHistory.add(query);
        
        searchState.isSearching = false;
        
        return results;
        
    } catch (error) {
        if (axios.isCancel(error)) {
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
let autocompleteVisible = false;

// Professional Autocomplete with Enhanced UI and Axios
function autocomplete(inp) {
    let currentFocus = -1;
    let searchTimeout;
    let isSearching = false;
    
    // Add visual feedback for search state
    const addSearchingClass = () => {
        inp.classList.add('searching');
        isSearching = true;
    };
    
    const removeSearchingClass = () => {
        inp.classList.remove('searching');
        isSearching = false;
    };
    
    inp.addEventListener("input", async function(e) {
        const val = this.value.trim();
        closeAllLists();
        
        if (val.length < 2) {
            removeSearchingClass();
            return false;
        }
        
        // Add searching visual feedback
        addSearchingClass();
        
        // Enhanced debounce with visual feedback
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
    inp.addEventListener("keydown", function(e) {
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
        
        // Add city results with better visual hierarchy
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
            item.addEventListener("click", function(e) {
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
            item.addEventListener("mouseenter", function() {
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
    inp.addEventListener("blur", function() {
        setTimeout(() => {
            closeAllLists();
            removeSearchingClass();
        }, 200);
    });
    
    // Focus handling
    inp.addEventListener("focus", function() {
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
    
    // Add weather-specific class for animations
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

// Enhanced Live Weather Map with Real API Data
function initializeWeatherMap() {
    const canvas = document.getElementById('weatherCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const mapLoading = document.querySelector('.map-loading');
    
    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = 400;
    
    // Start with loading state
    if (mapLoading) {
        mapLoading.style.display = 'block';
        mapLoading.textContent = 'Loading live weather data...';
    }
    
    // Fetch real weather data and start animation
    fetchLiveWeatherData().then(cities => {
        if (mapLoading) {
            mapLoading.style.display = 'none';
        }
        animateWeatherMap(ctx, canvas, cities);
        
        // Update weather data every 5 minutes
        setInterval(async () => {
            console.log('🔄 Updating live weather map data...');
            const updatedCities = await fetchLiveWeatherData();
            updateMapData(ctx, canvas, updatedCities);
        }, 300000); // 5 minutes
    }).catch(error => {
        console.error('Error loading weather map:', error);
        if (mapLoading) {
            mapLoading.textContent = 'Error loading weather data. Showing demo...';
        }
        // Fallback to demo data
        animateWeatherMap(ctx, canvas, getDemoCities());
    });
}

// Fetch real weather data from OpenWeatherMap API
async function fetchLiveWeatherData() {
    const cityCoordinates = [
        { name: 'New York', lat: 40.7128, lon: -74.0060, x: 0.25, y: 0.4 },
        { name: 'London', lat: 51.5074, lon: -0.1278, x: 0.48, y: 0.3 },
        { name: 'Tokyo', lat: 35.6762, lon: 139.6503, x: 0.85, y: 0.35 },
        { name: 'Sydney', lat: -33.8688, lon: 151.2093, x: 0.9, y: 0.75 },
        { name: 'Dubai', lat: 25.2048, lon: 55.2708, x: 0.6, y: 0.45 },
        { name: 'Singapore', lat: 1.3521, lon: 103.8198, x: 0.75, y: 0.65 },
        { name: 'Mumbai', lat: 19.0760, lon: 72.8777, x: 0.68, y: 0.5 },
        { name: 'São Paulo', lat: -23.5505, lon: -46.6333, x: 0.35, y: 0.7 },
        { name: 'Paris', lat: 48.8566, lon: 2.3522, x: 0.49, y: 0.32 },
        { name: 'Moscow', lat: 55.7558, lon: 37.6173, x: 0.58, y: 0.25 },
        { name: 'Beijing', lat: 39.9042, lon: 116.4074, x: 0.82, y: 0.38 },
        { name: 'Cairo', lat: 30.0444, lon: 31.2357, x: 0.55, y: 0.48 },
        { name: 'Toronto', lat: 43.6532, lon: -79.3832, x: 0.23, y: 0.38 },
        { name: 'Mexico City', lat: 19.4326, lon: -99.1332, x: 0.18, y: 0.5 },
        { name: 'Berlin', lat: 52.5200, lon: 13.4050, x: 0.51, y: 0.29 },
        { name: 'Rome', lat: 41.9028, lon: 12.4964, x: 0.52, y: 0.4 },
        { name: 'Madrid', lat: 40.4168, lon: -3.7038, x: 0.47, y: 0.37 },
        { name: 'Bangkok', lat: 13.7563, lon: 100.5018, x: 0.78, y: 0.55 },
        { name: 'Seoul', lat: 37.5665, lon: 126.9780, x: 0.84, y: 0.37 },
        { name: 'Jakarta', lat: -6.2088, lon: 106.8456, x: 0.77, y: 0.62 }
    ];
    
    const weatherPromises = cityCoordinates.map(async (city) => {
        try {
            const response = await fetch(
                `https://api.openweathermap.org/data/2.5/weather?lat=${city.lat}&lon=${city.lon}&appid=${API_KEY}&units=metric`
            );
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            return {
                name: city.name,
                x: city.x,
                y: city.y,
                temp: Math.round(data.main.temp),
                weather: mapWeatherCondition(data.weather[0].main, data.weather[0].description),
                country: data.sys.country,
                humidity: data.main.humidity,
                windSpeed: data.wind.speed,
                description: data.weather[0].description,
                lastUpdated: new Date().toLocaleTimeString()
            };
        } catch (error) {
            console.error(`Error fetching weather for ${city.name}:`, error);
            // Return demo data as fallback
            return {
                name: city.name,
                x: city.x,
                y: city.y,
                temp: Math.round(Math.random() * 30 + 10),
                weather: 'cloudy',
                country: 'N/A',
                humidity: 50,
                windSpeed: 5,
                description: 'Data unavailable',
                lastUpdated: new Date().toLocaleTimeString()
            };
        }
    });
    
    const cities = await Promise.all(weatherPromises);
    console.log(`✅ Loaded live weather data for ${cities.length} cities`);
    return cities;
}

// Map OpenWeatherMap conditions to our weather types
function mapWeatherCondition(main, description) {
    const lowerDesc = description.toLowerCase();
    
    if (main === 'Clear' || lowerDesc.includes('clear') || lowerDesc.includes('sunny')) {
        return 'sunny';
    } else if (main === 'Rain' || lowerDesc.includes('rain') || lowerDesc.includes('drizzle')) {
        return 'rainy';
    } else if (main === 'Clouds' || lowerDesc.includes('cloud')) {
        return 'cloudy';
    } else if (main === 'Thunderstorm' || lowerDesc.includes('thunder') || lowerDesc.includes('storm')) {
        return 'stormy';
    } else if (main === 'Snow' || lowerDesc.includes('snow')) {
        return 'snowy';
    } else if (main === 'Mist' || main === 'Fog' || lowerDesc.includes('mist') || lowerDesc.includes('fog')) {
        return 'foggy';
    }
    
    return 'cloudy'; // Default
}

// Fallback demo cities
function getDemoCities() {
    return [
        { name: 'New York', x: 0.25, y: 0.4, temp: 22, weather: 'sunny', country: 'US' },
        { name: 'London', x: 0.48, y: 0.3, temp: 15, weather: 'cloudy', country: 'UK' },
        { name: 'Tokyo', x: 0.85, y: 0.35, temp: 18, weather: 'rainy', country: 'JP' },
        { name: 'Sydney', x: 0.9, y: 0.75, temp: 25, weather: 'sunny', country: 'AU' },
        { name: 'Dubai', x: 0.6, y: 0.45, temp: 35, weather: 'sunny', country: 'AE' }
    ];
}

// Global variable to store current cities data
let currentMapCities = [];

// Enhanced Weather Map Animation with Real API Data
function animateWeatherMap(ctx, canvas, cities) {
    currentMapCities = cities; // Store for updates
    
    let time = 0;
    let particles = [];
    
    // Create weather particles based on current conditions
    function createParticles() {
        particles = [];
        const rainyCities = cities.filter(city => city.weather === 'rainy' || city.weather === 'stormy').length;
        const snowyCities = cities.filter(city => city.weather === 'snowy').length;
        const particleCount = Math.min(50, rainyCities * 10 + snowyCities * 8 + 20);
        
        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: Math.random() * 0.5 + 0.1,
                size: Math.random() * 2 + 1,
                opacity: Math.random() * 0.5 + 0.2
            });
        }
    }
    
    createParticles();
    
    function draw() {
        // Clear canvas with gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#0f0f23');
        gradient.addColorStop(1, '#1a1a2e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw subtle grid pattern
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        for (let i = 0; i < canvas.width; i += 40) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, canvas.height);
            ctx.stroke();
        }
        for (let i = 0; i < canvas.height; i += 40) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(canvas.width, i);
            ctx.stroke();
        }
        
        // Draw animated particles (rain/snow effect)
        particles.forEach(particle => {
            ctx.fillStyle = `rgba(255, 255, 255, ${particle.opacity})`;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
            
            // Update particle position
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            // Reset particle if it goes off screen
            if (particle.y > canvas.height) {
                particle.y = -10;
                particle.x = Math.random() * canvas.width;
            }
            if (particle.x < 0) particle.x = canvas.width;
            if (particle.x > canvas.width) particle.x = 0;
        });
        
        // Draw enhanced connections between cities
        ctx.strokeStyle = 'rgba(102, 126, 234, 0.2)';
        ctx.lineWidth = 1;
        cities.forEach((city1, i) => {
            cities.forEach((city2, j) => {
                if (i < j && Math.random() > 0.6) {
                    const x1 = city1.x * canvas.width;
                    const y1 = city1.y * canvas.height;
                    const x2 = city2.x * canvas.width;
                    const y2 = city2.y * canvas.height;
                    
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    
                    // Create animated curved connection
                    const cpx = (x1 + x2) / 2 + Math.sin(time * 0.001 + i) * 30;
                    const cpy = (y1 + y2) / 2 + Math.cos(time * 0.001 + j) * 20;
                    ctx.quadraticCurveTo(cpx, cpy, x2, y2);
                    
                    // Animated dash effect
                    ctx.setLineDash([3, 6]);
                    ctx.lineDashOffset = -time * 0.03;
                    ctx.stroke();
                    ctx.setLineDash([]);
                }
            });
        });
        
        // Draw cities with enhanced effects
        cities.forEach((city, index) => {
            const x = city.x * canvas.width;
            const y = city.y * canvas.height;
            
            // Enhanced pulsing effect
            const pulseSize = 12 + Math.sin(time * 0.002 + index) * 4;
            
            // Weather-based colors with gradients
            let color = '#FFD700'; // Default sunny
            if (city.weather === 'rainy') color = '#4A90E2';
            if (city.weather === 'cloudy') color = '#95A5A6';
            if (city.weather === 'stormy') color = '#E74C3C';
            if (city.weather === 'snowy') color = '#87CEEB';
            if (city.weather === 'foggy') color = '#BDC3C7';
            
            // Draw outer glow with gradient
            const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, pulseSize * 3);
            glowGradient.addColorStop(0, color + '60');
            glowGradient.addColorStop(0.5, color + '30');
            glowGradient.addColorStop(1, 'transparent');
            ctx.fillStyle = glowGradient;
            ctx.fillRect(x - pulseSize * 3, y - pulseSize * 3, pulseSize * 6, pulseSize * 6);
            
            // Draw city circle with gradient
            const cityGradient = ctx.createRadialGradient(x, y, 0, x, y, pulseSize);
            cityGradient.addColorStop(0, color);
            cityGradient.addColorStop(1, color + 'CC');
            
            ctx.beginPath();
            ctx.arc(x, y, pulseSize, 0, Math.PI * 2);
            ctx.fillStyle = cityGradient;
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Draw inner ring
            ctx.beginPath();
            ctx.arc(x, y, pulseSize * 0.6, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 1;
            ctx.stroke();
            
            // Draw city name with shadow
            ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 1;
            ctx.fillStyle = 'white';
            ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(city.name, x, y - pulseSize - 8);
            ctx.shadowBlur = 0;
            
            // Draw country code
            ctx.font = '9px Arial';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.fillText(city.country, x, y - pulseSize - 20);
            
            // Draw temperature
            ctx.font = 'bold 10px Arial';
            ctx.fillStyle = 'white';
            ctx.fillText(`${city.temp}°C`, x, y + pulseSize + 12);
            
            // Draw weather icon
            const icons = { 
                sunny: '☀️', 
                rainy: '🌧️', 
                cloudy: '☁️', 
                stormy: '⛈️',
                snowy: '❄️',
                foggy: '🌫️'
            };
            ctx.font = '14px Arial';
            ctx.fillText(icons[city.weather] || '🌤️', x, y + 4);
        });
        
        // Draw enhanced title with gradient
        const titleGradient = ctx.createLinearGradient(20, 0, 300, 0);
        titleGradient.addColorStop(0, '#667eea');
        titleGradient.addColorStop(1, '#764ba2');
        ctx.fillStyle = titleGradient;
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'left';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 4;
        ctx.fillText('🌍 Live Global Weather Network', 20, 35);
        ctx.shadowBlur = 0;
        
        // Draw subtitle
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '12px Arial';
        ctx.fillText('Real-time weather data from OpenWeatherMap API', 20, 52);
        
        // Draw enhanced live indicator
        const liveX = canvas.width - 120;
        const liveY = 35;
        
        // Pulsing live dot
        const livePulse = 6 + Math.sin(time * 0.005) * 2;
        const liveGradient = ctx.createRadialGradient(liveX, liveY, 0, liveX, liveY, livePulse);
        liveGradient.addColorStop(0, '#2ECC71');
        liveGradient.addColorStop(1, '#27AE60');
        
        ctx.beginPath();
        ctx.arc(liveX, liveY, livePulse, 0, Math.PI * 2);
        ctx.fillStyle = liveGradient;
        ctx.fill();
        
        // Live text
        ctx.fillStyle = '#2ECC71';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('● LIVE', liveX + 12, liveY + 4);
        
        // Draw statistics
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '10px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(`${cities.length} Cities Tracked`, canvas.width - 20, canvas.height - 20);
        ctx.fillText('Updated Every 5min', canvas.width - 20, canvas.height - 8);
        
        // Draw last update time
        if (cities.length > 0 && cities[0].lastUpdated) {
            ctx.fillText(`Last: ${cities[0].lastUpdated}`, canvas.width - 20, canvas.height - 32);
        }
        
        time += 16;
        
        requestAnimationFrame(draw);
    }
    
    draw();
}

// Update map with new data
function updateMapData(ctx, canvas, newCities) {
    currentMapCities = newCities;
    console.log('🔄 Weather map updated with live data');
    // The animation loop will automatically use the new data
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    displayRecentSearches();
    
    // Initialize popular cities cache
    initializePopularCities();
    
    // Initialize enhanced weather map after a short delay
    setTimeout(() => {
        initializeWeatherMap();
    }, 1000);
});