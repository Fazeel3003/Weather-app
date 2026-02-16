async function getWeather() {
    const city = document.getElementById('cityInput').value.trim();  // Trim whitespace
    const weatherDiv = document.getElementById('weather');
    const button = document.querySelector('button');
    
    // 1. Input Validation: Check if city is empty.
    if (!city) {
        weatherDiv.innerHTML = '<span class="error">Please enter a city name.</span>';
        return;
    }
    
    // 2. Loading State: Show spinner and disable button.
    weatherDiv.innerHTML = '<div class="loading"></div> Fetching weather...';
    button.disabled = true;  // Prevent multiple clicks
    
    const apiKey = '71d6002cfa815d4e2fafddb2be4abb6e';
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.cod === 200) {  // Success
            const temp = data.main.temp;
            const description = data.weather[0].description;
            const icon = getWeatherIcon(description);  // 3. Add weather icon
            weatherDiv.innerHTML = `${icon} Weather in ${data.name}: ${description}, Temp: ${temp}°C`;
        } else {  // Error (e.g., invalid city)
            weatherDiv.innerHTML = `<span class="error">Error: ${data.message}</span>`;
        }
    } catch (error) {
        weatherDiv.innerHTML = '<span class="error">Error fetching weather data. Check your connection or API key.</span>';
    }
    
    // Reset loading state
    button.disabled = false;
}

// 4. Helper Function for Weather Icons (using emojis for simplicity)
function getWeatherIcon(description) {
    const lowerDesc = description.toLowerCase();
    if (lowerDesc.includes('clear') || lowerDesc.includes('sun')) return '☀️';
    if (lowerDesc.includes('cloud')) return '☁️';
    if (lowerDesc.includes('rain')) return '🌧️';
    if (lowerDesc.includes('snow')) return '❄️';
    if (lowerDesc.includes('thunder')) return '⛈️';
    return '🌤️';  
}