import Feed from "@/components/Feed";
import BottomNav from "@/components/BottomNav";

export default function FeedPage() {
  return (
    <main style={{ height: "100dvh", overflow: "hidden" }}>
      <Feed />
      <BottomNav />
    </main>
  );
}
