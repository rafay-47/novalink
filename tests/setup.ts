import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Mock environment variables for testing environment
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";
