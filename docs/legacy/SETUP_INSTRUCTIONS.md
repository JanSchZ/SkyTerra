# SkyTerra Setup Instructions

## Environment Configuration

### 1. Create .env file in the root directory

Create a `.env` file in the root directory with the following variables:

```bash
# Frontend Configuration
VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_token_here

# Backend Configuration  
SECRET_KEY=your_django_secret_key_here
DEBUG=True
GOOGLE_GEMINI_API_KEY=your_gemini_api_key_here
```

### 2. Get Required API Keys

#### Mapbox Token
1. Go to [Mapbox Account](https://account.mapbox.com/access-tokens/)
2. Create a new token or use an existing one
3. Copy the token and paste it as `VITE_MAPBOX_ACCESS_TOKEN`

#### Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Copy the key and paste it as `GOOGLE_GEMINI_API_KEY`

#### Django Secret Key
Generate a secret key using:
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### 3. Install Dependencies

#### Backend
```bash
   cd services/api
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

#### Frontend
```bash
   cd apps/web
npm install
npm run dev
```

## Recent Improvements

### ✅ Fixed Issues:
1. **Gemini AI Reliability**: Added retry logic, fallback responses, and better error handling
2. **Search Results UI**: Limited height to 400px with scroll, max width 600px
3. **Always 3D Map**: Map now starts in 3D mode (45° pitch) with terrain always enabled
4. **Better Error Messages**: More user-friendly error messages for API failures

### 🎯 Key Features:
- **Google Earth-like Search**: Type "Chile" or "Santiago" to fly to locations
- **AI Property Search**: Describe what you want: "terreno con agua cerca de Santiago"
- **3D Terrain**: Always-on 3D terrain with adjustable viewing angles
- **Robust Error Handling**: Graceful fallbacks when AI service is unavailable

### 🔧 Controls:
- **Green 3D Button**: Cycles through viewing angles (0°, 45°, 60°)
- **Terrain Button**: Cycles through pitch angles (0° → 30° → 45° → 60°)
- **North Button**: Resets map orientation to north

## Troubleshooting

### AI Search Not Working
- Check that `GOOGLE_GEMINI_API_KEY` is set in `.env`
- Verify the API key is valid at [Google AI Studio](https://aistudio.google.com/app/apikey)
- Check browser console for error messages

### Map Not Loading
- Verify `VITE_MAPBOX_ACCESS_TOKEN` is set correctly
- Check that the token has the required permissions

### Search Results Covering Screen
- This has been fixed - results are now limited to 400px height with scroll

### Map Not 3D
- This has been fixed - map now starts in 3D mode automatically
- Use the green 3D button to adjust viewing angles 
