# 🌤️ Weather API Web App

A modern, responsive weather application with advanced search functionality, live weather map visualization, and comprehensive weather data display.

## ✨ Features

### 🔍 **Smart Search System**
- **Intelligent Autocomplete** - Real-time city search with duplicate filtering
- **Minimum 3-character search** - Reduces unnecessary API calls
- **Backspace Prevention** - No searches when deleting characters
- **Duplicate City Filtering** - Smart handling of administrative duplicates (e.g., Pune IN/ID/TL → Pune IN only)
- **Debounced Search** - 400ms delay for optimal performance
- **Visual Feedback** - Loading states and search indicators

### 🗺️ **Live Weather Map**
- **Animated Canvas Visualization** - Real-time weather data display
- **Global City Coverage** - 8+ major cities with live weather
- **Interactive Elements** - Pulsing city markers and animated connections
- **Weather-based Colors** - Dynamic color coding for different conditions
- **Live Status Indicator** - Real-time data updates

### 📊 **Comprehensive Weather Data**
- **Current Weather** - Temperature, feels-like, humidity, wind speed
- **5-Day Forecast** - Daily weather predictions with icons
- **Air Quality Index** - PM2.5, PM10, O₃, NO₂ measurements
- **Additional Metrics** - Pressure, visibility, sunrise/sunset times
- **Dynamic Backgrounds** - CSS-based weather themes

### 🚀 **Performance & UX**
- **Advanced Caching** - Memory + localStorage with 24-hour TTL
- **Request Cancellation** - AbortController for pending searches
- **Responsive Design** - Mobile-friendly interface
- **Smooth Animations** - CSS transitions and canvas animations
- **Error Handling** - Graceful fallbacks and user feedback

## 🛠️ Technology Stack

### **Frontend**
- **HTML5** - Semantic markup structure
- **CSS3** - Modern styling with animations
- **JavaScript (ES6+)** - Core application logic


### **APIs & Libraries**
- **OpenWeatherMap API** - Weather data and geocoding
- **Axios** - HTTP client with advanced features
- **LocalStorage API** - Client-side caching

### **Architecture**
- **Modular Functions** - Clean, maintainable code structure
- **Async/Await** - Modern asynchronous programming
- **Event-Driven** - Responsive user interactions
- **State Management** - Centralized search and cache state

## 📦 Installation & Setup

### **Prerequisites**
- Modern web browser (Chrome, Firefox, Safari, Edge)
- OpenWeatherMap API key

### **Quick Start**
1. **Clone/Download** the project files
2. **Replace API Key** in `script.js`:
   ```javascript
   const API_KEY = 'your_api_key_here';
   ```
3. **Open `index.html`** in your web browser

### **API Setup**
1. Sign up at [OpenWeatherMap](https://openweathermap.org/api)
2. Get your free API key
3. Replace the existing key in `script.js`

## 🎯 Key Features Explained

### **Smart Duplicate Filtering**
The application intelligently handles duplicate cities returned by the API:
- **Exact Duplicates** - Same name + country → Keep first
- **Administrative Duplicates** - Same city, different admin codes → Keep primary
- **Example**: Pune IN, Pune ID, Pune TL → Shows only Pune IN

### **Search Optimization**
- **3-Character Minimum** - Prevents premature searches
- **Backspace Detection** - No API calls when deleting
- **Debouncing** - 400ms delay reduces server load
- **Request Cancellation** - Aborts previous pending searches

### **Caching Strategy**
- **Memory Cache** - Fast access during session
- **LocalStorage** - Persists across browser sessions
- **24-hour TTL** - Ensures data freshness
- **Popular Cities** - Pre-cached major cities

## 📁 Project Structure

```
Weather-app/
├── index.html          # Main application page
├── style.css           # Styling and animations
├── script.js           # Core application logic
└── README.md           # This documentation
```

## 🔧 Configuration

### **API Settings**
```javascript
const API_KEY = 'your_openweathermap_api_key';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const AUTOCOMPLETE_LIMIT = 50; // Max search results
const SEARCH_DEBOUNCE = 400; // Search delay in ms
```

### **Search Behavior**
- **Minimum characters**: 3
- **Search on backspace**: Disabled
- **Duplicate filtering**: Enabled
- **Cache duration**: 24 hours

## 🎨 Customization

### **Adding New Cities to Map**
Edit the `cities` array in `animateWeatherMap()` function:
```javascript
const cities = [
    { name: 'Your City', x: 0.5, y: 0.5, temp: 20, weather: 'sunny' }
];
```

### **Modifying Search Behavior**
Adjust constants at the top of `script.js`:
```javascript
const SEARCH_DEBOUNCE = 300; // Faster search
const AUTOCOMPLETE_LIMIT = 30; // Fewer results
```

### **Styling Changes**
Modify CSS classes in `style.css`:
- `.weather-card` - Main weather display
- `.autocomplete-items` - Search dropdown
- `.weather-map-section` - Map container

## 🐛 Troubleshooting

### **Common Issues**

**API Key Not Working**
- Verify your OpenWeatherMap API key is valid
- Check if you've exceeded rate limits
- Ensure key is properly copied without spaces

**Search Not Working**
- Check browser console for errors
- Verify internet connection
- Ensure minimum 3 characters are typed

**Map Not Displaying**
- Check if canvas element exists in HTML
- Verify browser supports Canvas API
- Check for JavaScript errors in console

**Cache Issues**
- Clear browser localStorage
- Refresh the page
- Check cache expiration settings

### **Debug Mode**
Enable console logging by checking browser developer tools:
- Search queries: `🔍 Searching cities for "..."`
- Cache hits: `✅ Using cached search results`
- API responses: `✅ Found X cities`

## 🚀 Performance Optimizations

### **Implemented**
- ✅ Request debouncing
- ✅ Search result caching
- ✅ Request cancellation
- ✅ Duplicate filtering
- ✅ Lazy loading
- ✅ Memory cleanup

## 📱 Browser Compatibility

### **Supported Browsers**
- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 12+
- ✅ Edge 79+

### **Required Features**
- ES6+ JavaScript support
- Canvas API support
- LocalStorage support
- Fetch API or Axios polyfill

## 🤝 Contributing

### **Development Guidelines**
1. Follow existing code style
2. Add comments for complex logic
3. Test search functionality thoroughly
4. Verify responsive design
5. Check browser compatibility

### **Code Structure**
- Use async/await for API calls
- Implement proper error handling
- Add loading states for user feedback
- Follow DRY principles
- Maintain clean function separation



