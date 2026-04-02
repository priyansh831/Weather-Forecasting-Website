import React, { useState, useEffect } from 'react';
import { 
  Search, 
  MapPin, 
  Wind, 
  Droplets, 
  Thermometer, 
  Cloud, 
  Sun, 
  CloudRain, 
  CloudLightning, 
  Snowflake,
  Loader2,
  Calendar,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import axios from 'axios';
import { cn } from './lib/utils';

interface WeatherData {
  name: string;
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
    pressure: number;
  };
  weather: Array<{
    main: string;
    description: string;
    icon: string;
  }>;
  wind: {
    speed: number;
  };
  sys: {
    country: string;
  };
  isDemo?: boolean;
}

interface AIInsights {
  remark: string;
  recommendation: string;
}

interface ForecastData {
  list: Array<{
    dt: number;
    main: {
      temp_max: number;
      temp_min: number;
    };
    weather: Array<{
      main: string;
      icon: string;
    }>;
  }>;
}

export default function App() {
  const [city, setCity] = useState('');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    getUserLocation();
    
    // Check for missing keys
    const checkKeys = async () => {
      try {
        const response = await axios.get('/api/weather?city=London');
        // If we got data but it's Mathura when we asked for London, it means fallback kicked in
        if (response.data.name === 'Mathura' && !demoMode) {
          setError('Demo Mode Fallback: Your OpenWeather API key might be invalid or expired. Showing mock data for Mathura.');
        }
      } catch (err: any) {
        if (err.response?.status === 500 && err.response?.data?.error?.includes('API key is missing')) {
          setError('API keys are missing. Please configure OPENWEATHER_API_KEY and GEMINI_API_KEY in the Secrets panel.');
        }
      }
    };
    checkKeys();
  }, []);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchWeather(undefined, position.coords.latitude, position.coords.longitude);
        },
        () => {
          fetchWeather('London'); // Default city
        }
      );
    } else {
      fetchWeather('London');
    }
  };

  const fetchWeather = async (cityName?: string, lat?: number, lon?: number) => {
    setLoading(true);
    setError(null);
    try {
      const params: any = cityName ? { city: cityName } : { lat, lon };
      if (demoMode) params.demo = 'true';
      
      const response = await axios.get('/api/weather', { params });
      setWeather(response.data);
      fetchAIInsights(response.data);
      fetchForecast(cityName, lat, lon);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch weather data');
    } finally {
      setLoading(false);
    }
  };

  const fetchForecast = async (cityName?: string, lat?: number, lon?: number) => {
    try {
      const params: any = cityName ? { city: cityName } : { lat, lon };
      if (demoMode) params.demo = 'true';
      const response = await axios.get('/api/forecast', { params });
      setForecast(response.data);
    } catch (err) {
      console.error('Failed to fetch forecast', err);
    }
  };

  const fetchAIInsights = async (weatherData: WeatherData) => {
    setAiLoading(true);
    try {
      const response = await axios.post('/api/ai-insights', { weatherData });
      setInsights(response.data);
    } catch (err) {
      console.error('AI Insights failed', err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (city.trim()) {
      fetchWeather(city);
      setCity('');
    }
  };

  const getWeatherIcon = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'clear': return <Sun className="w-16 h-16 text-yellow-400" />;
      case 'clouds': return <Cloud className="w-16 h-16 text-slate-400" />;
      case 'rain': return <CloudRain className="w-16 h-16 text-blue-400" />;
      case 'thunderstorm': return <CloudLightning className="w-16 h-16 text-purple-400" />;
      case 'snow': return <Snowflake className="w-16 h-16 text-blue-200" />;
      default: return <Cloud className="w-16 h-16 text-slate-400" />;
    }
  };

  const getDynamicBackground = () => {
    if (!weather) return 'from-[#030014] to-[#030014]';
    const condition = weather.weather[0].main.toLowerCase();
    
    if (condition === 'clear' || condition === 'sunny') {
      return 'from-[#f59e0b]/20 via-[#3b82f6]/10 to-[#030014]';
    }
    if (condition === 'rain' || condition === 'thunderstorm' || condition === 'drizzle') {
      return 'from-[#1e293b]/40 via-[#0f172a]/30 to-[#030014]';
    }
    if (condition === 'clouds') {
      return 'from-[#334155]/30 via-[#1e293b]/20 to-[#030014]';
    }
    return 'from-[#030014] to-[#030014]';
  };

  return (
    <div className={cn(
      "min-h-screen transition-all duration-1000 bg-gradient-to-br",
      getDynamicBackground()
    )}>
      <div className="max-w-6xl mx-auto px-4 py-12 md:py-20">
      {/* Header */}
      <header className="flex flex-col lg:flex-row justify-between items-center mb-20 gap-10">
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-center lg:text-left"
        >
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-4 heading-gradient">
            SkyCast AI
          </h1>
          <div className="flex items-center justify-center lg:justify-start gap-3 text-slate-400 font-medium">
            <span className="px-3 py-1 bg-white/5 rounded-full border border-white/10 text-xs">
              {format(currentTime, 'EEEE, MMMM do')}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500/50" />
            <span className="text-cyan-400 font-mono tracking-widest">
              {format(currentTime, 'HH:mm:ss')}
            </span>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-xl"
        >
          <div className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.08] rounded-2xl px-5 py-3 self-stretch sm:self-auto backdrop-blur-xl">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Demo</span>
            <button
              onClick={() => setDemoMode(!demoMode)}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-500 focus:outline-none",
                demoMode ? "bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.5)]" : "bg-slate-800"
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300",
                  demoMode ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </div>
          
          <form onSubmit={handleSearch} className="relative flex-1 w-full group">
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              disabled={demoMode}
              placeholder={demoMode ? "Search disabled in Demo Mode" : "Explore a city..."}
              className={cn(
                "glass-input w-full",
                demoMode && "opacity-40 cursor-not-allowed"
              )}
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
            <button 
              type="submit"
              disabled={demoMode}
              className="absolute right-2 top-1/2 -translate-y-1/2 btn-primary py-1.5 px-4 text-sm disabled:opacity-0 disabled:pointer-events-none"
            >
              Search
            </button>
          </form>
        </motion.div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Main Weather Display */}
        <div className="lg:col-span-8 space-y-10">
          {loading ? (
            <div className="glass-card h-[500px] flex items-center justify-center">
              <div className="relative">
                <Loader2 className="w-16 h-16 text-cyan-500 animate-spin" />
                <div className="absolute inset-0 blur-2xl bg-cyan-500/20 animate-pulse" />
              </div>
            </div>
          ) : error ? (
            <div className="glass-card h-[500px] flex flex-col items-center justify-center text-center">
              <div className="p-4 rounded-full bg-red-500/10 mb-6">
                <Cloud className="w-12 h-12 text-red-400" />
              </div>
              <p className="text-red-400 font-medium text-lg max-w-md mb-8">{error}</p>
              <button 
                onClick={getUserLocation} 
                className="btn-primary"
              >
                Reset & Auto-Detect
              </button>
            </div>
          ) : weather && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="glass-card relative group"
            >
              {/* Decorative background glow */}
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-cyan-500/10 blur-[100px] rounded-full group-hover:bg-cyan-500/20 transition-all duration-700" />
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-12">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-xl bg-cyan-500/10">
                        <MapPin className="w-6 h-6 text-cyan-400" />
                      </div>
                      <h2 className="text-4xl font-bold text-gradient">{weather.name}, {weather.sys.country}</h2>
                      {weather.isDemo && (
                        <span className="px-3 py-1 bg-yellow-500/10 text-yellow-500 text-[10px] font-bold uppercase tracking-widest rounded-full border border-yellow-500/20 backdrop-blur-sm">
                          Demo Mode
                        </span>
                      )}
                    </div>
                    <p className="text-slate-400 text-lg font-medium capitalize pl-11">{weather.weather[0].description}</p>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-between gap-16 mb-16">
                  <div className="flex items-center gap-10">
                    <div className="relative">
                      {getWeatherIcon(weather.weather[0].main)}
                      <div className="absolute inset-0 blur-3xl bg-cyan-500/20 -z-10" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-8xl md:text-9xl font-bold tracking-tighter text-gradient leading-none">
                        {Math.round(weather.main.temp)}°
                      </span>
                      <span className="text-slate-500 font-medium ml-2 uppercase tracking-widest text-sm">Celsius</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6 w-full md:w-auto">
                    {[
                      { icon: Thermometer, label: 'Feels Like', value: `${Math.round(weather.main.feels_like)}°C`, color: 'blue' },
                      { icon: Droplets, label: 'Humidity', value: `${weather.main.humidity}%`, color: 'cyan' },
                      { icon: Wind, label: 'Wind Speed', value: `${weather.wind.speed} m/s`, color: 'emerald' },
                      { icon: Cloud, label: 'Pressure', value: `${weather.main.pressure} hPa`, color: 'orange' }
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] transition-colors">
                        <div className={cn("p-3 rounded-xl", `bg-${item.color}-500/10`)}>
                          <item.icon className={cn("w-5 h-5", `text-${item.color}-400`)} />
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{item.label}</p>
                          <p className="font-bold text-slate-200">{item.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI Insights Section */}
                <div className="relative p-8 rounded-[2rem] bg-gradient-to-br from-cyan-500/[0.08] to-purple-600/[0.08] border border-white/[0.08] overflow-hidden mb-10">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Cloud className="w-24 h-24 text-white" />
                  </div>
                  
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">Gemini Intelligence</h3>
                  </div>
                  
                  {aiLoading ? (
                    <div className="flex items-center gap-4 text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin text-cyan-500" />
                      <p className="font-medium italic">Synthesizing atmospheric data...</p>
                    </div>
                  ) : insights ? (
                    <div className="space-y-6">
                      <p className="text-xl md:text-2xl font-medium leading-relaxed text-slate-200 italic font-display">
                        "{insights.remark}"
                      </p>
                      <div className="flex items-center gap-4 text-sm text-slate-300 bg-white/[0.03] p-4 rounded-2xl border border-white/[0.05]">
                        <div className="px-3 py-1 rounded-lg bg-purple-500/20 text-purple-400 font-bold text-[10px] uppercase tracking-widest">
                          Wear
                        </div>
                        <span className="font-medium">{insights.recommendation}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-500 italic">Insights currently unavailable.</p>
                  )}
                </div>

                {/* 5-Day Forecast Chart */}
                {forecast && (
                  <div className="mt-10 pt-10 border-t border-white/[0.05]">
                    <div className="flex items-center gap-3 mb-8">
                      <div className="p-2 rounded-xl bg-emerald-500/10">
                        <Calendar className="w-5 h-5 text-emerald-400" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-200">5-Day Forecast</h3>
                    </div>
                    
                    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                      {forecast.list.map((day, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="flex-shrink-0 w-32 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] transition-all text-center"
                        >
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                            {format(new Date(day.dt * 1000), 'EEE')}
                          </p>
                          <div className="flex justify-center mb-3">
                            <img 
                              src={`https://openweathermap.org/img/wn/${day.weather[0].icon}.png`} 
                              alt={day.weather[0].main}
                              className="w-10 h-10"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-lg font-bold text-slate-200">
                              {Math.round(day.main.temp_max)}°
                            </span>
                            <span className="text-xs text-slate-500 font-medium">
                              {Math.round(day.main.temp_min)}°
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>

        {/* Sidebar: Global Weather */}
        <div className="lg:col-span-4 space-y-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card"
          >
            <h4 className="text-lg font-bold mb-4 font-display">Global Weather</h4>
            <div className="space-y-4">
              {[
                { city: 'New York', temp: 12, condition: 'Cloudy' },
                { city: 'Tokyo', temp: 18, condition: 'Clear' },
                { city: 'Paris', temp: 15, condition: 'Rain' }
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                  <span className="font-medium text-slate-300">{item.city}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-200">{item.temp}°</span>
                    <ChevronRight className="w-4 h-4 text-slate-600" />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </main>

      <footer className="mt-32 text-center">
        <div className="w-20 h-1 bg-gradient-to-r from-transparent via-slate-800 to-transparent mx-auto mb-8" />
        <p className="text-slate-500 text-sm font-medium tracking-widest uppercase">
          © 2026 SkyCast AI Intelligence • All Rights Reserved.
        </p>
      </footer>
    </div>
  </div>
  );
}
