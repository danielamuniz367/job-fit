import type { Metadata } from "next";
import { getTodaysFocus } from "@/lib/jobs";
import DailyFocus from "./components/DailyFocus";

export const metadata: Metadata = {
  title: "Today | JobFit",
};

// Personalized, live data (and stamps today's picks) — never prerender.
export const dynamic = "force-dynamic";

const HomePage = async () => {
  const focus = await getTodaysFocus();
  return <DailyFocus focus={focus} />;
};

export default HomePage;
