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
    
    const apiKey = '';  
    
    try {
        // Step 1: Get coordinates from city name
        const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${apiKey}`;
        const geoResponse = await fetch(geoUrl);
        const geoData = await geoResponse.json();
        
        if (!geoData || geoData.length === 0) {
            weatherDiv.innerHTML = '<span class="error">City not found. Please try again.</span>';
            button.disabled = false;
            return;
        }
        
        const { lat, lon, name, country } = geoData[0];
        
        // Fetch all data in parallel for better performance
        const [currentWeatherData, forecastData, airQualityData] = await Promise.all([
            fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`).then(r => r.json()),
            fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`).then(r => r.json()),
            fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`).then(r => r.json())
        ]);
        
        // Display Current Weather
        displayCurrentWeather(currentWeatherData, name, country, weatherDiv);
        
        // Display Air Quality Data (NEW!)
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
        
        container.innerHTML = `
            <div class="weather-card">
                <div class="weather-header">
                    <span class="weather-icon">${icon}</span>
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