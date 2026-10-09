const express = require("express");
const { getUsersFromThirdPartAPi } = require("../controllers/test-api")

const router = express.Router();

router.get("/test-api", getUsersFromThirdPartAPi)

module.exports = router