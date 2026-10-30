/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  testPathIgnorePatterns: ["/node_modules/", "/.next/"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        // Type-checking is done by tsc, not during tests
        diagnostics: false,
        tsconfig: { jsx: "react-jsx", esModuleInterop: true },
      },
    ],
  },
};
