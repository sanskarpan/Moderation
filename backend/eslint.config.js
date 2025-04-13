// backend/eslint.config.js
import globals from "globals";
import js from "@eslint/js"; // Recommended ruleset

// Optional: If you installed Airbnb base and its dependencies
// import eslintPluginImport from "eslint-plugin-import";
// import { config as airbnbBaseConfig } from "eslint-config-airbnb-base"; // May need adjustment based on actual export

export default [
    // 1. Apply recommended rules globally
    js.configs.recommended,

    // 2. Configure JS files for Node.js/CommonJS environment
    {
        files: ["**/*.js"], // Target JS files
        languageOptions: {
            ecmaVersion: "latest", // Or specific year like 2022
            sourceType: "commonjs", // Specify module type
            globals: {
                ...globals.node, // Add Node.js built-in globals
                ...globals.commonjs, // Add CommonJS globals (require, module, exports)
                // Add Jest globals if needed for test files (or configure separately below)
                // ...globals.jest,
            },
        },
        // Define rules specific to JS files or override recommended ones
        rules: {
            'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            'consistent-return': 'warn',
            // Add other rules here
        },
    },

    // 3. Optional: Configure test files separately (e.g., Jest globals)
    {
        files: ["src/__tests__/**/*.js", "**/*.test.js", "**/*.spec.js"],
        languageOptions: {
            globals: {
                ...globals.jest,
            },
        },
        // Rules specific to tests (e.g., allowing describe/it)
        // Often Jest plugins handle this automatically if used.
    },

    // 4. Optional: Airbnb Base Integration (Example - might need adjustments)
    // {
    //     // Inherit from Airbnb base config (exact structure depends on the export)
    //     // This part can be tricky with flat config conversion
    //     ...airbnbBaseConfig, // Or specific configuration objects from it
    //     plugins: {
    //         import: eslintPluginImport,
    //     },
    //     rules: {
    //         // Override Airbnb rules if needed
    //         'import/prefer-default-export': 'off',
    //         'no-underscore-dangle': 'off',
    //         // Add your own overrides here
    //     },
    // },

    // 5. Ignore patterns
    {
        ignores: [
            "node_modules/",
            "dist/",
            "coverage/",
            "prisma/generated/",
            "*.log",
        ],
    },
];