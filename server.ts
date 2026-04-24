import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Nominatim Search Proxy
  app.get("/api/geo/search", async (req, res) => {
    const { q } = req.query;
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(String(q))}&limit=5&countrycodes=in`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'TotoGo-App/1.0'
        }
      });
      const data = await response.json();
      res.json(data);
    } catch (err) {
      console.error('Nominatim Search Error:', err);
      res.status(500).json({ error: 'Search failed' });
    }
  });

  // Nominatim Reverse Proxy
  app.get("/api/geo/reverse", async (req, res) => {
    const { lat, lon } = req.query;
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'TotoGo-App/1.0'
        }
      });
      const data = await response.json();
      res.json(data);
    } catch (err) {
      console.error('Nominatim Reverse Error:', err);
      res.status(500).json({ error: 'Geocoding failed' });
    }
  });

  // OSM/OSRM Route API
  app.get("/api/route", async (req, res) => {
    const { start, end } = req.query;
    if (!start || !end) {
      return res.status(400).json({ error: "Start and end coordinates are required" });
    }

    try {
      // Format: lng,lat;lng,lat
      const coordinates = `${start};${end}`;
      const url = `http://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson&alternatives=true`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch route from OSRM");
      }

      const data = await response.json();
      
      // The user wants top 5 routes but gives the top 1.
      // OSRM usually provides a few alternatives if requested.
      // We'll return all available routes but highlight the first one.
      
      if (!data.routes || data.routes.length === 0) {
        return res.status(404).json({ error: "No routes found" });
      }

      // Sort and take top 5 (OSRM usually gives 2-3 anyway)
      const top5 = data.routes.slice(0, 5);

      res.json({
        routes: top5.map((r: any) => ({
          distance: r.distance, // meters
          duration: r.duration, // seconds
          geometry: r.geometry, // GeoJSON LineString
        })),
        primary: {
          distance: top5[0].distance,
          duration: top5[0].duration,
          geometry: top5[0].geometry,
        }
      });
    } catch (error: any) {
      console.error("Routing error:", error);
      res.status(500).json({ error: "Internal server error during routing" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
