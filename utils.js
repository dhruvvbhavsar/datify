const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Hashing a password
const hashPassword = async (plainPassword) => {
  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);
    return hashedPassword;
  } catch (error) {
    throw new Error("Error hashing password");
  }
};

// Comparing a password
const comparePassword = async (
  userEnteredPassword,
  hashedPasswordFromDatabase
) => {
  try {
    const passwordMatch = await bcrypt.compare(
      userEnteredPassword,
      hashedPasswordFromDatabase
    );
    return passwordMatch;
  } catch (error) {
    throw new Error("Error comparing passwords");
  }
};

const generateToken = async (email, username, expiresIn = "7d") => {
  const secretKey = process.env.DATIFY_SECRET;

  const payload = {
    email: email,
    username: username,
  };

  const token = jwt.sign(payload, secretKey, { expiresIn });

  return token;
};

const verifyAndCheckExpiration = async (token) => {
  const secretKey = process.env.DATIFY_SECRET;

  // Check if a secret key is provided
  if (!secretKey) {
    console.error("No secret key provided for JWT verification.");
    return { valid: false, error: "No secret key provided" };
  }

  try {
    const decoded = jwt.verify(token, secretKey);

    // Check if decoded token contains an expiration time
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      return { valid: false, error: "Token expired" };
    }

    return { valid: true, payload: decoded };
  } catch (error) {
    console.error("Error during token verification:", error);
    return { valid: false, error: "Invalid token" };
  }
};

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  verifyAndCheckExpiration,
};
