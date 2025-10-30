import db from "../config/database";

interface SystemSettingRow {
  setting_value: string;
}

interface UserCountRow {
  total: string;
}

/**
 * Get a system setting value
 * @param settingKey - The setting key to retrieve
 * @param defaultValue - Default value if setting doesn't exist
 * @returns The setting value
 */
export const getSystemSetting = async (
  settingKey: string,
  defaultValue: string | null = null
): Promise<string | null> => {
  try {
    const result = await db.query<SystemSettingRow>(
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
 * @returns True if registration is enabled
 */
export const isRegistrationEnabled = async (): Promise<boolean> => {
  const value = await getSystemSetting("registration_enabled", "true");
  return value === "true";
};

/**
 * Get maximum allowed users (0 = unlimited)
 * @returns Maximum number of users
 */
export const getMaxUsers = async (): Promise<number> => {
  const value = await getSystemSetting("max_users", "0");
  return parseInt(value || "0", 10) || 0;
};

/**
 * Check if user limit is reached
 * @returns True if user limit is reached
 */
export const isUserLimitReached = async (): Promise<boolean> => {
  const maxUsers = await getMaxUsers();
  if (maxUsers === 0) return false; // Unlimited

  const result = await db.query<UserCountRow>(
    "SELECT COUNT(*) as total FROM users"
  );
  const currentUsers = parseInt(result.rows[0].total, 10);

  return currentUsers >= maxUsers;
};
