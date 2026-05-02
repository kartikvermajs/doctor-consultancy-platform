

const express = require("express");
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { authenticate, requireRole } = require("../middleware/auth");
const { handleChatMessage } = require("../controllers/chatController");

const router = express.Router();

router.post(
  "/",
  authenticate,
  requireRole(["patient", "doctor"]),
  [
    body("message")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("message is required"),
  ],
  validate,
  handleChatMessage
);

module.exports = router;
