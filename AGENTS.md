<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

## Page and Layout file conventions

All `page.tsx` and `layout.tsx` files in `app/` must follow these rules:

- Always export a `metadata` const of type `Metadata`
- Always use **named `const` functions** (never `function` declarations or anonymous exports)
- Function names must end with **`Page`** for pages and **`Layout`** for layouts
- `page.tsx` functions are **`async`**; `layout.tsx` functions are synchronous
- Use the global `PageProps<'paramName'>` and `LayoutProps<'paramName'>` types for props

**`page.tsx` template:**

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "",
};

const MyPage = async ({ params, searchParams }: PageProps<"/my/route">) => {
  return <div />;
};

export default MyPage;
```

**`layout.tsx` template:**

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "",
};

const MyLayout = ({ children }: LayoutProps<"/my/route">) => {
  return <div>{children}</div>;
};

export default MyLayout;
```

<!-- END:nextjs-agent-rules -->
