async function getWeather() {
    const city = document.getElementById('cityInput').value;  // Get city from input
    const apiKey = '71d6002cfa815d4e2fafddb2be4abb6e';  // Replace with your OpenWeatherMap API key
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.cod === 200) {  // Success
            document.getElementById('weather').innerHTML = 
                `Weather in ${data.name}: ${data.weather[0].description}, Temp: ${data.main.temp}°C`;
        } else {  // Error (e.g., invalid city)
            document.getElementById('weather').innerHTML = `Error: ${data.message}`;
        }
    } catch (error) {
        document.getElementById('weather').innerHTML = 'Error fetching weather data.';
    }
}