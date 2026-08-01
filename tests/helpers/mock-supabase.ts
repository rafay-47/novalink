import { vi } from "vitest";

export function createMockSupabaseClient(options: {
  user?: { id: string; email: string } | null;
  queryResults?: Record<string, any>;
}) {
  const mockUser = options.user !== undefined ? options.user : { id: "user-123", email: "admin@novalink.pk" };

  const chain = (tableName: string) => {
    const builder: any = {
      select: vi.fn().mockImplementation(() => builder),
      insert: vi.fn().mockImplementation((data: any) => {
        builder._insertedData = data;
        return builder;
      }),
      update: vi.fn().mockImplementation((data: any) => {
        builder._updatedData = data;
        return builder;
      }),
      delete: vi.fn().mockImplementation(() => builder),
      eq: vi.fn().mockImplementation((field: string, val: any) => {
        builder._filter = { field, val };
        return builder;
      }),
      or: vi.fn().mockImplementation(() => builder),
      order: vi.fn().mockImplementation(() => builder),
      range: vi.fn().mockImplementation(() => builder),
      single: vi.fn().mockImplementation(async () => {
        const result = options.queryResults?.[tableName];
        if (result && result.single) {
          return result.single;
        }
        if (builder._insertedData) {
          return { data: { id: `${tableName}-id-1`, ...builder._insertedData }, error: null };
        }
        if (builder._updatedData) {
          return { data: { id: builder._filter?.val || `${tableName}-id-1`, ...builder._updatedData }, error: null };
        }
        return { data: { id: `${tableName}-id-1` }, error: null };
      }),
    };

    // Make builder awaitable / thenable for calls that don't call .single()
    builder.then = (resolve: any) => {
      const customRes = options.queryResults?.[tableName];
      if (customRes) {
        return resolve(customRes);
      }
      return resolve({
        data: builder._insertedData ? [{ id: `${tableName}-id-1`, ...builder._insertedData }] : [],
        count: builder._insertedData ? 1 : 0,
        error: null,
      });
    };

    return builder;
  };

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: mockUser },
        error: null,
      }),
    },
    from: vi.fn().mockImplementation((table: string) => chain(table)),
  };
}
