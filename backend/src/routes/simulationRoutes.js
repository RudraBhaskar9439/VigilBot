// routes/simulationRoutes.js
import express from 'express';

const router = express.Router();

// Shared simulation stats object used by backend + test script
export const simulationStats = {
  running: false,
  total: 0,
  humans: 0,
  goodBots: 0,
  suspicious: 0,
  badBots: 0,
  correctDetections: 0,
  falsePositives: 0,
  falseNegatives: 0,
  accuracy: 0,
  progress: 0,
  lastUser: null,
  finished: false
};

// ✅ GET endpoint for frontend dashboard to poll simulation progress
router.get('/stats', (req, res) => {
  res.json(simulationStats);
});

// ✅ POST endpoint to reset stats if needed
router.post('/reset', (req, res) => {
  for (const key in simulationStats) {
    if (typeof simulationStats[key] === 'number') {
      simulationStats[key] = 0;
    } else if (key === 'running' || key === 'finished') {
      simulationStats[key] = false;
    } else if (key === 'lastUser') {
      simulationStats[key] = null;
    }
  }
  res.json({ message: 'Simulation stats reset successfully' });
});

export default router;
