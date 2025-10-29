const { createDefaultAdmin } = require("./migrate");

// Run the default admin creation
if (require.main === module) {
  createDefaultAdmin()
    .then(() => {
      console.log("🎉 Default admin creation completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Default admin creation failed:", error);
      process.exit(1);
    });
}

module.exports = { createDefaultAdmin };
