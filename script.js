// Function to handle Enter key press
function handleKeyPress(event) {
    if (event.key === 'Enter') {
        getWeather();
    }
}

async function getWeather() {
    const city = document.getElementById('cityInput').value.trim();
    const weatherDiv = document.getElementById('weather');
    const forecastDiv = document.getElementById('forecast');
    const button = document.querySelector('button');
    
    // Safety check: Ensure elements exist
    if (!weatherDiv || !forecastDiv) {
        console.error('Weather or forecast div not found in HTML.');
        return;
    }
    
    if (!city) {
        weatherDiv.innerHTML = '<span class="error">Please enter a city name.</span>';
        forecastDiv.innerHTML = '';
        return;
    }
    
    weatherDiv.innerHTML = '<div class="loading"></div> Fetching weather...';
    forecastDiv.innerHTML = '';
    button.disabled = true;
    
    const apiKey = '';  
    
    try {
        // Fetch current weather
        const currentUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;
        const currentResponse = await fetch(currentUrl);
        const currentData = await currentResponse.json();
        
        if (currentData.cod === 200) {
            const temp = currentData.main.temp;
            const description = currentData.weather[0].description;
            const icon = getWeatherIcon(description);
            weatherDiv.innerHTML = `${icon} Weather in ${currentData.name}: ${description}, Temp: ${temp}°C`;
            
            // Fetch 3-day forecast
            const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=metric`;
            const forecastResponse = await fetch(forecastUrl);
            const forecastData = await forecastResponse.json();
            
            if (forecastData.cod === '200') {
                let forecastHtml = '<h3>3-Day Forecast</h3>';
                const dailyForecasts = {};
                forecastData.list.forEach(item => {
                    const date = new Date(item.dt * 1000).toDateString();
                    if (!dailyForecasts[date]) {
                        dailyForecasts[date] = {
                            temp: item.main.temp,
                            description: item.weather[0].description,
                            icon: getWeatherIcon(item.weather[0].description)
                        };
                    }
                });
                
                Object.keys(dailyForecasts).slice(0, 3).forEach(date => {
                    const day = dailyForecasts[date];
                    forecastHtml += `<div class="forecast-day">${day.icon} ${date}: ${day.description}, ${day.temp}°C</div>`;
                });
                forecastDiv.innerHTML = forecastHtml;
            } else {
                forecastDiv.innerHTML = '<span class="error">Forecast unavailable.</span>';
            }
        } else {
            weatherDiv.innerHTML = `<span class="error">Error: ${currentData.message}</span>`;
            forecastDiv.innerHTML = '';
        }
    } catch (error) {
        weatherDiv.innerHTML = '<span class="error">Error fetching weather data.</span>';
        forecastDiv.innerHTML = '';
    }
    
    button.disabled = false;
}

// Helper function for icons
function getWeatherIcon(description) {
    const lowerDesc = description.toLowerCase();
    if (lowerDesc.includes('clear') || lowerDesc.includes('sun')) return '☀️';
    if (lowerDesc.includes('cloud')) return '☁️';
    if (lowerDesc.includes('rain')) return '🌧️';
    if (lowerDesc.includes('snow')) return '❄️';
    if (lowerDesc.includes('thunder')) return '⛈️';
    return '🌤️';
}