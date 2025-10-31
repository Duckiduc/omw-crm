import dotenv from "dotenv";
import db from "../config/database";
import { User } from "../types";

dotenv.config();

export const promoteUserToAdmin = async (): Promise<void> => {
  try {
    const email = process.argv[2];

    if (!email) {
      console.log("Usage: ts-node promote-admin.ts <user-email>");
      process.exit(1);
    }

    console.log(`🔍 Looking for user: ${email}`);

    const result = await db.query<
      Pick<User, "id" | "email" | "firstName" | "lastName" | "role">
    >(
      "UPDATE users SET role = $1 WHERE email = $2 RETURNING id, email, firstname, lastname, role",
      ["admin", email]
    );

    if (result.rows.length === 0) {
      console.log(`❌ User with email ${email} not found`);
      process.exit(1);
    }

    const userRow = result.rows[0] as any;
    const user = {
      id: userRow.id,
      email: userRow.email,
      firstName: userRow.firstname,
      lastName: userRow.lastname,
      role: userRow.role,
    };
    console.log(`✅ User promoted to admin:`);
    console.log(`   Name: ${user.firstName} ${user.lastName}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error promoting user:", error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  promoteUserToAdmin();
}
