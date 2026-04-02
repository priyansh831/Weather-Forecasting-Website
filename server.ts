import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import mongoose from 'mongoose';
import cors from 'cors';
import axios from 'axios';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI;
if (MONGO_URI) {
  mongoose.connect(MONGO_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));
} else {
  console.warn('MONGO_URI not found in environment variables. Favorites feature will not persist.');
}

// Favorite City Schema
const favoriteSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now }
});
const Favorite = mongoose.model('Favorite', favoriteSchema);

// Mock data for Mathura
const MOCK_WEATHER = {
  name: "Mathura",
  main: {
    temp: 28,
    feels_like: 30,
    humidity: 45,
    pressure: 1012
  },
  weather: [
    {
      main: "Clear",
      description: "clear sky",
      icon: "01d"
    }
  ],
  wind: {
    speed: 3.5
  },
  sys: {
    country: "IN"
  }
};

// API Routes
app.get('/api/weather', async (req, res) => {
  const { city, lat, lon, demo } = req.query;
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (demo === 'true') {
    return res.json({ ...MOCK_WEATHER, isDemo: true });
  }

  if (!apiKey) {
    return res.status(500).json({ error: 'OpenWeather API key is missing' });
  }

  try {
    let url = '';
    if (city) {
      url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${apiKey}`;
    } else if (lat && lon) {
      url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
    } else {
      return res.status(400).json({ error: 'City or coordinates required' });
    }

    const response = await axios.get(url);
    res.json({ ...response.data, isDemo: false });
  } catch (error: any) {
    if (error.response?.status === 401) {
      console.warn('OpenWeather API returned 401. Falling back to mock data.');
      return res.json({ ...MOCK_WEATHER, isDemo: true });
    }
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.post('/api/ai-insights', async (req, res) => {
  const { weatherData } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Gemini API key is missing' });
  }

  try {
    const genAI = new GoogleGenAI({ apiKey });
    const model = 'gemini-3-flash-preview';
    
    const prompt = `Given the following weather data for ${weatherData.name}:
    Temperature: ${weatherData.main.temp}°C
    Condition: ${weatherData.weather[0].description}
    Humidity: ${weatherData.main.humidity}%
    Wind Speed: ${weatherData.wind.speed} m/s
    
    Provide a 1-sentence witty remark about this weather and a specific clothing recommendation.
    Format your response as a JSON object with keys "remark" and "recommendation".`;

    const result = await genAI.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = result.text;
    res.json(JSON.parse(text || '{}'));
  } catch (error: any) {
    console.error('Gemini Error:', error);
    res.status(500).json({ error: 'Failed to generate AI insights' });
  }
});

// Favorites CRUD
app.get('/api/favorites', async (req, res) => {
  try {
    const favorites = await Favorite.find().sort({ createdAt: -1 });
    res.json(favorites);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

app.post('/api/favorites', async (req, res) => {
  try {
    const { name } = req.body;
    const favorite = new Favorite({ name });
    await favorite.save();
    res.json(favorite);
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'City already in favorites' });
    }
    res.status(500).json({ error: 'Failed to add favorite' });
  }
});

app.delete('/api/favorites/:id', async (req, res) => {
  try {
    await Favorite.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete favorite' });
  }
});

// Vite Integration
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
