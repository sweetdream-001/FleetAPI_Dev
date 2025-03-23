import express from 'express';
import { generateJWSToken } from '../services/jwsGenerator.js';
import { signCommand } from '../services/signCommand.js';
import sessionCache from '../utils/sessionCache.js';
import checkToken from '../middleware/checkTokenMiddleware.js';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();

router.get('/', (req, res) => {
  res.send('Telemetry route');
});

router.post('/configure', async (req, res) => {

    const { vin } = req.body;
    const accessToken = req.accessToken;
    try {
    // 1. Generate JWS token
    const jwsToken = await generateJWSToken(
      vin,
      process.env.DOMAIN, // e.g., "your-domain.com"
      ['vehicle_speed', 'battery_level']
    );
    // 2. Prepare request body
    const body = {
      token: jwsToken,
      vins: [vin]
    };

    //3.send request to tesla's api
    const options = {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
      }
  };
   
  const response = await fetch(`${process.env.BASE_URL}/api/1/vehicles/fleet_telemetry_config_jws`, options);
  const data = await response.json();

  // return response.json();
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Configuration failed' });
  }
});

router.post('/sendsigncommand', checkToken, async (req, res) => {
  const { vin } = req.body;
  const accessToken = req.accessToken;

  try {
    // 1. Try to get a cached signed command
    let jwsToken = sessionCache.getSession(vin);
    if (!jwsToken) {
      jwsToken = await signCommand(vin, 'actuate_trunk');
      sessionCache.setSession(vin, jwsToken, 900);
    }

    // 2. Build request
    const body = {
      token: jwsToken,
      which_trunk: "front"
    };

    const response = await fetch(`${process.env.BASE_URL}/api/1/vehicles/${vin}/signed_command/actuate_trunk`, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      }
    });

    const result = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        status: 'error',
        command: 'actuate_trunk',
        vin,
        error: result.error || result.message || 'Unknown Tesla error'
      });
    }

    // 3. Success
    res.json({
      status: 'success',
      command: 'actuate_trunk',
      vin,
      details: result
    });

  } catch (error) {
    console.error('Command error:', error.message);
    res.status(500).json({
      status: 'error',
      command: 'actuate_trunk',
      vin,
      error: error.message || 'Server error'
    });
  }
});

export default router;