const express = require('express');
const router = express.Router();
const TeamSetup = require('../models/TeamSetup');
const authenticate = require('../middleware/authenticate'); // میدل‌ور احراز هویت و تشخیص نقش

// دریافت ترکیب‌ها بر اساس matchId
router.get('/matches/:matchId/setup', authenticate, async (req, res) => {
  try {
    const setups = await TeamSetup.find({ matchId: req.params.matchId });

    const filteredSetups = setups.map(setup => {
      const data = {
        id: setup._id,
        matchId: setup.matchId,
        teamId: setup.teamId,
        lineupImage: setup.lineupImage,
        startingPlayers: setup.startingPlayers,
        substitutes: setup.substitutes
      };

      // شرط امنیت: اطلاعات تاکتیک فقط اگر کاربر نقش ADMIN داشته باشد اضافه می‌شود
      if (req.user && req.user.role === 'ADMIN') {
        data.tactics = setup.tactics;
      }

      return data;
    });

    res.json(filteredSetups);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;