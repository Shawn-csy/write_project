/// <reference types="@testing-library/jest-dom" />

// apps/public/tsconfig.json 的 include 涵蓋 **/*.tsx，測試檔會進入
// npm run build:public 的型別檢查。jest-dom 的 matcher（toBeInTheDocument、
// toBeDisabled 等）需要明確引用型別才會生效 —— vitest 4.1 起 Assertion 型別
// 收斂，不再隱式套用。
