const db = require("../config/database");

/**
 * Get a system setting value
 * @param {string} settingKey - The setting key to retrieve
 * @param {string} defaultValue - Default value if setting doesn't exist
 * @returns {Promise<string>} The setting value
 */
const getSystemSetting = async (settingKey, defaultValue = null) => {
  try {
    const result = await db.query(
      "SELECT setting_value FROM system_settings WHERE setting_key = $1",
      [settingKey]
    );

    if (result.rows.length === 0) {
      return defaultValue;
    }

    return result.rows[0].setting_value;
  } catch (error) {
    console.error(`Error getting system setting ${settingKey}:`, error);
    return defaultValue;
  }
};

/**
 * Check if user registration is enabled
 * @returns {Promise<boolean>} True if registration is enabled
 */
const isRegistrationEnabled = async () => {
  const value = await getSystemSetting("registration_enabled", "true");
  return value === "true";
};

/**
 * Get maximum allowed users (0 = unlimited)
 * @returns {Promise<number>} Maximum number of users
 */
const getMaxUsers = async () => {
  const value = await getSystemSetting("max_users", "0");
  return parseInt(value) || 0;
};

/**
 * Check if user limit is reached
 * @returns {Promise<boolean>} True if user limit is reached
 */
const isUserLimitReached = async () => {
  const maxUsers = await getMaxUsers();
  if (maxUsers === 0) return false; // Unlimited

  const result = await db.query("SELECT COUNT(*) as total FROM users");
  const currentUsers = parseInt(result.rows[0].total);

  return currentUsers >= maxUsers;
};

module.exports = {
  getSystemSetting,
  isRegistrationEnabled,
  getMaxUsers,
  isUserLimitReached,
};
