# Snow Precipitation Tracker

A web application to visualize snow precipitation data (historical and forecast) using MET Norway's APIs.

## Features

- **Interactive Map**: Click to select any location, or use the search bar
- **Place Search**: Search for locations using OpenStreetMap Nominatim
- **Historical Data**: View past precipitation data from Norwegian weather stations
- **Forecast Data**: See up to 9 days of precipitation forecast
- **Time Series Chart**: Visualize snow accumulation and hourly precipitation over time
- **Heatmap View**: Analyze precipitation patterns by day of week and hour

## Prerequisites

1. **Node.js** (v18 or higher)
2. **Frost API Credentials**: Register at [frost.met.no](https://frost.met.no/auth/requestCredentials.html) to get API credentials for historical data

## Setup

### 1. Clone and install dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure environment

Create a `.env` file in the `backend` directory:

```bash
cd backend
cp .env.example .env
```

Edit `.env` and add your Frost API client ID:

```
FROST_CLIENT_ID=your_client_id_here
PORT=3001
```

### 3. Run the application

In two separate terminals:

```bash
# Terminal 1: Start the backend
cd backend
npm run dev

# Terminal 2: Start the frontend
cd frontend
npm run dev
```

The application will be available at `http://localhost:5173`

## Data Sources

- **Historical Data**: [Frost API](https://frost.met.no/) - Provides historical weather observations from Norwegian weather stations
- **Forecast Data**: [Locationforecast API](https://api.met.no/) - Provides weather forecasts up to 9 days ahead
- **Geocoding**: [OpenStreetMap Nominatim](https://nominatim.openstreetmap.org/) - Place name search

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Charts**: Recharts (time series), D3.js-style heatmap
- **Map**: Leaflet with react-leaflet
- **Backend**: Node.js, Express, TypeScript
- **HTTP Client**: Axios

## Notes

- The Frost API provides data from weather stations, not arbitrary coordinates. The app automatically finds the nearest station to your selected location.
- Historical data availability depends on the weather station coverage in your area of interest.
- The Locationforecast API works for any location worldwide but is optimized for Nordic countries.

## Attribution

Weather data provided by [MET Norway](https://www.met.no/) under the [Norwegian Licence for Open Government Data (NLOD)](https://data.norge.no/nlod/en/).

